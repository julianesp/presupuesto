from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import rp as svc
from app.schemas.rp import RPCreate, RPUpdate, RPResponse

router = APIRouter(prefix="/api/rp", tags=["RP"])


@router.get("", response_model=list[RPResponse])
async def listar(estado: str | None = None, db: AsyncSession = Depends(get_db)):
    rps = await svc.get_rps(db, estado=estado)
    result = []
    for r in rps:
        data = RPResponse(
            numero=r.numero, fecha=r.fecha, cdp_numero=r.cdp_numero,
            codigo_rubro=r.codigo_rubro,
            cuenta=r.rubro.cuenta if r.rubro else None,
            nit_tercero=r.nit_tercero,
            nombre_tercero=r.tercero.nombre if r.tercero else None,
            valor=r.valor, objeto=r.objeto, estado=r.estado,
            fuente_sifse=r.fuente_sifse, item_sifse=r.item_sifse,
            saldo=await svc.saldo_rp(db, r.numero),
        )
        result.append(data)
    return result


@router.get("/{numero}", response_model=RPResponse)
async def obtener(numero: int, db: AsyncSession = Depends(get_db)):
    r = await svc.get_rp(db, numero)
    if not r:
        raise HTTPException(404, "RP no encontrado")
    return RPResponse(
        numero=r.numero, fecha=r.fecha, cdp_numero=r.cdp_numero,
        codigo_rubro=r.codigo_rubro,
        cuenta=r.rubro.cuenta if r.rubro else None,
        nit_tercero=r.nit_tercero,
        nombre_tercero=r.tercero.nombre if r.tercero else None,
        valor=r.valor, objeto=r.objeto, estado=r.estado,
        fuente_sifse=r.fuente_sifse, item_sifse=r.item_sifse,
        saldo=await svc.saldo_rp(db, r.numero),
    )


@router.post("", response_model=RPResponse, status_code=201)
async def registrar(data: RPCreate, db: AsyncSession = Depends(get_db)):
    try:
        r = await svc.registrar(db, data.cdp_numero, data.nit_tercero, data.valor, data.objeto)
        return RPResponse(
            numero=r.numero, fecha=r.fecha, cdp_numero=r.cdp_numero,
            codigo_rubro=r.codigo_rubro,
            cuenta=r.rubro.cuenta if r.rubro else None,
            nit_tercero=r.nit_tercero,
            nombre_tercero=r.tercero.nombre if r.tercero else None,
            valor=r.valor, objeto=r.objeto, estado=r.estado,
            fuente_sifse=r.fuente_sifse, item_sifse=r.item_sifse,
            saldo=r.valor,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}", response_model=RPResponse)
async def editar(numero: int, data: RPUpdate, db: AsyncSession = Depends(get_db)):
    try:
        r = await svc.editar(db, numero, data.valor, data.objeto, data.fuente_sifse, data.item_sifse)
        return RPResponse(
            numero=r.numero, fecha=r.fecha, cdp_numero=r.cdp_numero,
            codigo_rubro=r.codigo_rubro,
            cuenta=r.rubro.cuenta if r.rubro else None,
            nit_tercero=r.nit_tercero,
            nombre_tercero=r.tercero.nombre if r.tercero else None,
            valor=r.valor, objeto=r.objeto, estado=r.estado,
            fuente_sifse=r.fuente_sifse, item_sifse=r.item_sifse,
            saldo=await svc.saldo_rp(db, r.numero),
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}/anular")
async def anular(numero: int, db: AsyncSession = Depends(get_db)):
    try:
        await svc.anular(db, numero)
        return {"message": f"RP {numero} anulado"}
    except ValueError as e:
        raise HTTPException(400, str(e))
