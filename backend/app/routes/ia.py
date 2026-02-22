"""
Endpoints de IA para el Sistema Presupuestal.
Requiere GEMINI_API_KEY configurada en .env
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.database import get_db
from app.services import ia as ia_svc

router = APIRouter(prefix="/api/ia", tags=["IA"])

MIME_PERMITIDOS = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


def _verificar_api_key():
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="El servicio de IA no está disponible. Configure GEMINI_API_KEY en el servidor.",
        )


# ─── Schemas ─────────────────────────────────────────────────────────────────

class MensajeHistorial(BaseModel):
    rol: str      # "user" | "model"
    contenido: str


class ChatRequest(BaseModel):
    mensaje: str
    historial: list[MensajeHistorial] = []


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Chat con el asistente IA. Inyecta contexto presupuestal actual del tenant."""
    _verificar_api_key()
    try:
        respuesta = await ia_svc.chat(
            db=db,
            tenant_id=str(user.tenant_id),
            mensaje=req.mensaje,
            historial=[m.model_dump() for m in req.historial],
        )
        return {"respuesta": respuesta}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar con Gemini: {str(e)}")


@router.get("/alertas")
async def alertas(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Detecta y retorna alertas presupuestales automáticas."""
    try:
        resultado = await ia_svc.generar_alertas(db=db, tenant_id=str(user.tenant_id))
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar alertas: {str(e)}")


@router.get("/resumen")
async def resumen(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Genera un resumen ejecutivo narrativo con Gemini."""
    _verificar_api_key()
    try:
        texto = await ia_svc.resumen_ejecutivo(db=db, tenant_id=str(user.tenant_id))
        return {"texto": texto}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar resumen: {str(e)}")


@router.post("/analizar-doc")
async def analizar_doc(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """
    Analiza una factura o contrato y extrae datos estructurados.
    Acepta: PDF, JPEG, PNG, WEBP. Máx 10 MB.
    """
    _verificar_api_key()

    if file.content_type not in MIME_PERMITIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido: {file.content_type}. Use PDF, JPEG o PNG.",
        )

    contenido = await file.read()
    if len(contenido) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo supera el límite de 10 MB.")

    try:
        datos = await ia_svc.analizar_documento(file_bytes=contenido, mime_type=file.content_type)
        return datos
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al analizar documento: {str(e)}")
