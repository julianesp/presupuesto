from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import reconocimiento as svc
from app.schemas.reconocimiento import (
    ReconocimientoCreate,
    ReconocimientoUpdate,
    ReconocimientoResponse,
)
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/reconocimientos", tags=["Reconocimientos"])


def _to_response(r) -> ReconocimientoResponse:
    return ReconocimientoResponse(
        numero=r.numero,
        fecha=r.fecha,
        codigo_rubro=r.codigo_rubro,
        cuenta=r.rubro.cuenta if r.rubro else None,
        tercero_nit=r.tercero_nit,
        tercero_nombre=r.tercero.nombre if r.tercero else None,
        valor=r.valor,
        concepto=r.concepto,
        no_documento=r.no_documento,
        estado=r.estado,
    )


@router.get("", response_model=list[ReconocimientoResponse])
async def listar(estado: str | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    items = await svc.get_reconocimientos(db, user.tenant_id, estado=estado)
    return [_to_response(r) for r in items]


@router.get("/{numero}", response_model=ReconocimientoResponse)
async def obtener(numero: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    r = await svc.get_reconocimiento(db, user.tenant_id, numero)
    if not r:
        raise HTTPException(404, "Reconocimiento no encontrado")
    return _to_response(r)


@router.post("", response_model=ReconocimientoResponse, status_code=201)
async def registrar(data: ReconocimientoCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        r = await svc.registrar(db, user.tenant_id, data)
        await db.commit()
        await db.refresh(r)
        return _to_response(r)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}", response_model=ReconocimientoResponse)
async def editar(numero: int, data: ReconocimientoUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        r = await svc.editar(db, user.tenant_id, numero, data)
        await db.commit()
        await db.refresh(r)
        return _to_response(r)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}/anular", status_code=200)
async def anular(numero: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        await svc.anular(db, user.tenant_id, numero)
        await db.commit()
        return {"message": f"Reconocimiento {numero} anulado"}
    except ValueError as e:
        raise HTTPException(400, str(e))
