from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import obligacion as svc
from app.schemas.obligacion import ObligacionCreate, ObligacionUpdate, ObligacionResponse
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/obligaciones", tags=["Obligaciones"])


def _build_response(o, saldo=None) -> ObligacionResponse:
    return ObligacionResponse(
        numero=o.numero, fecha=o.fecha, rp_numero=o.rp_numero,
        codigo_rubro=o.codigo_rubro,
        cuenta=None,
        nit_tercero=o.nit_tercero,
        nombre_tercero=o.tercero.nombre if o.tercero else None,
        valor=o.valor, factura=o.factura, estado=o.estado,
        fuente_sifse=o.fuente_sifse, item_sifse=o.item_sifse,
        saldo=saldo,
    )


@router.get("", response_model=list[ObligacionResponse])
async def listar(estado: str | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    obligaciones = await svc.get_obligaciones(db, user.tenant_id, estado=estado)
    result = []
    for o in obligaciones:
        saldo = await svc.saldo_obligacion(db, user.tenant_id, o.numero)
        result.append(_build_response(o, saldo))
    return result


@router.get("/{numero}", response_model=ObligacionResponse)
async def obtener(numero: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    o = await svc.get_obligacion(db, user.tenant_id, numero)
    if not o:
        raise HTTPException(404, "Obligacion no encontrada")
    saldo = await svc.saldo_obligacion(db, user.tenant_id, numero)
    return _build_response(o, saldo)


@router.post("", response_model=ObligacionResponse, status_code=201)
async def registrar(data: ObligacionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        o = await svc.registrar(db, user.tenant_id, data.rp_numero, data.valor, data.factura)
        return _build_response(o, o.valor)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}", response_model=ObligacionResponse)
async def editar(numero: int, data: ObligacionUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        o = await svc.editar(db, user.tenant_id, numero, data.valor, data.factura, data.fuente_sifse, data.item_sifse)
        saldo = await svc.saldo_obligacion(db, user.tenant_id, numero)
        return _build_response(o, saldo)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}/anular")
async def anular(numero: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        await svc.anular(db, user.tenant_id, numero)
        return {"message": f"Obligacion {numero} anulada"}
    except ValueError as e:
        raise HTTPException(400, str(e))
