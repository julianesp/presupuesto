from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import reconocimiento as svc
from app.schemas.reconocimiento import (
    ReconocimientoCreate,
    ReconocimientoUpdate,
    ReconocimientoResponse,
)

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
async def listar(estado: str | None = None, db: AsyncSession = Depends(get_db)):
    items = await svc.get_reconocimientos(db, estado=estado)
    return [_to_response(r) for r in items]


@router.get("/{numero}", response_model=ReconocimientoResponse)
async def obtener(numero: int, db: AsyncSession = Depends(get_db)):
    r = await svc.get_reconocimiento(db, numero)
    if not r:
        raise HTTPException(404, "Reconocimiento no encontrado")
    return _to_response(r)


@router.post("", response_model=ReconocimientoResponse, status_code=201)
async def registrar(data: ReconocimientoCreate, db: AsyncSession = Depends(get_db)):
    try:
        r = await svc.registrar(db, data)
        await db.commit()
        await db.refresh(r)
        return _to_response(r)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}", response_model=ReconocimientoResponse)
async def editar(numero: int, data: ReconocimientoUpdate, db: AsyncSession = Depends(get_db)):
    try:
        r = await svc.editar(db, numero, data)
        await db.commit()
        await db.refresh(r)
        return _to_response(r)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}/anular", status_code=200)
async def anular(numero: int, db: AsyncSession = Depends(get_db)):
    try:
        await svc.anular(db, numero)
        await db.commit()
        return {"message": f"Reconocimiento {numero} anulado"}
    except ValueError as e:
        raise HTTPException(400, str(e))
