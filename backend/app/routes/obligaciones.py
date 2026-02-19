from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import obligacion as svc
from app.schemas.obligacion import ObligacionCreate, ObligacionUpdate, ObligacionResponse

router = APIRouter(prefix="/api/obligaciones", tags=["Obligaciones"])


@router.get("", response_model=list[ObligacionResponse])
async def listar(estado: str | None = None, db: AsyncSession = Depends(get_db)):
    obligaciones = await svc.get_obligaciones(db, estado=estado)
    result = []
    for o in obligaciones:
        data = ObligacionResponse(
            numero=o.numero, fecha=o.fecha, rp_numero=o.rp_numero,
            codigo_rubro=o.codigo_rubro,
            cuenta=o.rubro.cuenta if o.rubro else None,
            nit_tercero=o.nit_tercero,
            nombre_tercero=o.tercero.nombre if o.tercero else None,
            valor=o.valor, factura=o.factura, estado=o.estado,
            fuente_sifse=o.fuente_sifse, item_sifse=o.item_sifse,
            saldo=await svc.saldo_obligacion(db, o.numero),
        )
        result.append(data)
    return result


@router.get("/{numero}", response_model=ObligacionResponse)
async def obtener(numero: int, db: AsyncSession = Depends(get_db)):
    o = await svc.get_obligacion(db, numero)
    if not o:
        raise HTTPException(404, "Obligacion no encontrada")
    return ObligacionResponse(
        numero=o.numero, fecha=o.fecha, rp_numero=o.rp_numero,
        codigo_rubro=o.codigo_rubro,
        cuenta=o.rubro.cuenta if o.rubro else None,
        nit_tercero=o.nit_tercero,
        nombre_tercero=o.tercero.nombre if o.tercero else None,
        valor=o.valor, factura=o.factura, estado=o.estado,
        fuente_sifse=o.fuente_sifse, item_sifse=o.item_sifse,
        saldo=await svc.saldo_obligacion(db, o.numero),
    )


@router.post("", response_model=ObligacionResponse, status_code=201)
async def registrar(data: ObligacionCreate, db: AsyncSession = Depends(get_db)):
    try:
        o = await svc.registrar(db, data.rp_numero, data.valor, data.factura)
        return ObligacionResponse(
            numero=o.numero, fecha=o.fecha, rp_numero=o.rp_numero,
            codigo_rubro=o.codigo_rubro,
            cuenta=o.rubro.cuenta if o.rubro else None,
            nit_tercero=o.nit_tercero,
            nombre_tercero=o.tercero.nombre if o.tercero else None,
            valor=o.valor, factura=o.factura, estado=o.estado,
            fuente_sifse=o.fuente_sifse, item_sifse=o.item_sifse,
            saldo=o.valor,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}", response_model=ObligacionResponse)
async def editar(numero: int, data: ObligacionUpdate, db: AsyncSession = Depends(get_db)):
    try:
        o = await svc.editar(db, numero, data.valor, data.factura, data.fuente_sifse, data.item_sifse)
        return ObligacionResponse(
            numero=o.numero, fecha=o.fecha, rp_numero=o.rp_numero,
            codigo_rubro=o.codigo_rubro,
            cuenta=o.rubro.cuenta if o.rubro else None,
            nit_tercero=o.nit_tercero,
            nombre_tercero=o.tercero.nombre if o.tercero else None,
            valor=o.valor, factura=o.factura, estado=o.estado,
            fuente_sifse=o.fuente_sifse, item_sifse=o.item_sifse,
            saldo=await svc.saldo_obligacion(db, o.numero),
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}/anular")
async def anular(numero: int, db: AsyncSession = Depends(get_db)):
    try:
        await svc.anular(db, numero)
        return {"message": f"Obligacion {numero} anulada"}
    except ValueError as e:
        raise HTTPException(400, str(e))
