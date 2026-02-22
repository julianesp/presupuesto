from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import recaudo as svc
from app.schemas.recaudo import RecaudoCreate, RecaudoUpdate, RecaudoResponse
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/recaudos", tags=["Recaudos"])


def _build_response(r) -> RecaudoResponse:
    return RecaudoResponse(
        numero=r.numero, fecha=r.fecha,
        codigo_rubro=r.codigo_rubro,
        cuenta=r.rubro.cuenta if r.rubro else None,
        valor=r.valor, concepto=r.concepto,
        no_comprobante=r.no_comprobante,
        estado=r.estado,
        cuenta_bancaria_id=r.cuenta_bancaria_id,
    )


@router.get("", response_model=list[RecaudoResponse])
async def listar(estado: str | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    recaudos = await svc.get_recaudos(db, user.tenant_id, estado=estado)
    return [_build_response(r) for r in recaudos]


@router.get("/{numero}", response_model=RecaudoResponse)
async def obtener(numero: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    r = await svc.get_recaudo(db, user.tenant_id, numero)
    if not r:
        raise HTTPException(404, "Recaudo no encontrado")
    return _build_response(r)


@router.post("", response_model=RecaudoResponse, status_code=201)
async def registrar(data: RecaudoCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        r = await svc.registrar(
            db, user.tenant_id,
            data.codigo_rubro, data.valor, data.concepto,
            data.no_comprobante, data.cuenta_bancaria_id,
        )
        return _build_response(r)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}", response_model=RecaudoResponse)
async def editar(numero: int, data: RecaudoUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        r = await svc.editar(
            db, user.tenant_id, numero,
            nuevo_valor=data.valor,
            concepto=data.concepto,
            no_comprobante=data.no_comprobante,
            cuenta_bancaria_id=data.cuenta_bancaria_id,
        )
        return _build_response(r)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}/anular")
async def anular(numero: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        await svc.anular(db, user.tenant_id, numero)
        return {"message": f"Recaudo {numero} anulado"}
    except ValueError as e:
        raise HTTPException(400, str(e))
