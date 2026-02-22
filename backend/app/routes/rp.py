from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import rp as svc
from app.schemas.rp import RPCreate, RPUpdate, RPResponse
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/rp", tags=["RP"])


def _build_response(r, saldo=None) -> RPResponse:
    return RPResponse(
        numero=r.numero, fecha=r.fecha, cdp_numero=r.cdp_numero,
        codigo_rubro=r.codigo_rubro,
        cuenta=None,
        nit_tercero=r.nit_tercero,
        nombre_tercero=r.tercero.nombre if r.tercero else None,
        valor=r.valor, objeto=r.objeto, estado=r.estado,
        fuente_sifse=r.fuente_sifse, item_sifse=r.item_sifse,
        saldo=saldo,
    )


@router.get("", response_model=list[RPResponse])
async def listar(estado: str | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rps = await svc.get_rps(db, user.tenant_id, estado=estado)
    result = []
    for r in rps:
        saldo = await svc.saldo_rp(db, user.tenant_id, r.numero)
        result.append(_build_response(r, saldo))
    return result


@router.get("/{numero}", response_model=RPResponse)
async def obtener(numero: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    r = await svc.get_rp(db, user.tenant_id, numero)
    if not r:
        raise HTTPException(404, "RP no encontrado")
    saldo = await svc.saldo_rp(db, user.tenant_id, numero)
    return _build_response(r, saldo)


@router.post("", response_model=RPResponse, status_code=201)
async def registrar(data: RPCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        r = await svc.registrar(db, user.tenant_id, data.cdp_numero, data.nit_tercero, data.valor, data.objeto)
        return _build_response(r, r.valor)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}", response_model=RPResponse)
async def editar(numero: int, data: RPUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        r = await svc.editar(db, user.tenant_id, numero, data.valor, data.objeto, data.fuente_sifse, data.item_sifse)
        saldo = await svc.saldo_rp(db, user.tenant_id, numero)
        return _build_response(r, saldo)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}/anular")
async def anular(numero: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        await svc.anular(db, user.tenant_id, numero)
        return {"message": f"RP {numero} anulado"}
    except ValueError as e:
        raise HTTPException(400, str(e))
