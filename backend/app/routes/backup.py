import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import backup as svc
from app.auth.dependencies import get_current_user, require_escritura
from app.models.tenant import User

router = APIRouter(prefix="/api/backup", tags=["Backup"])


@router.get("/exportar")
async def exportar(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Genera y descarga una copia de seguridad completa en formato JSON."""
    data = await svc.exportar(db, user.tenant_id)
    content = json.dumps(data, ensure_ascii=False, indent=2, default=str)
    filename = f"backup_presupuestal_{date.today().isoformat()}.json"
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/restaurar")
async def restaurar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_escritura),
):
    """Restaura todos los datos desde un archivo de copia de seguridad JSON."""
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(400, "El archivo debe ser un JSON (.json)")

    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"Archivo JSON inválido: {e}")

    try:
        stats = await svc.restaurar(db, user.tenant_id, data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error al restaurar: {e}")

    return {
        "message": "Copia de seguridad restaurada exitosamente",
        "fecha_backup": data.get("fecha_backup"),
        "registros": stats,
    }
