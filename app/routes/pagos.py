from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import pago as svc
from app.schemas.pago import PagoCreate, PagoUpdate, PagoResponse

router = APIRouter(prefix="/api/pagos", tags=["Pagos"])


@router.get("", response_model=list[PagoResponse])
async def listar(estado: str | None = None, db: AsyncSession = Depends(get_db)):
    pagos = await svc.get_pagos(db, estado=estado)
    result = []
    for p in pagos:
        data = PagoResponse(
            numero=p.numero, fecha=p.fecha,
            obligacion_numero=p.obligacion_numero,
            codigo_rubro=p.codigo_rubro,
            cuenta=p.rubro.cuenta if p.rubro else None,
            nit_tercero=p.nit_tercero,
            nombre_tercero=p.tercero.nombre if p.tercero else None,
            valor=p.valor, concepto=p.concepto,
            medio_pago=p.medio_pago,
            no_comprobante=p.no_comprobante,
            cuenta_bancaria_id=p.cuenta_bancaria_id,
            estado=p.estado,
        )
        result.append(data)
    return result


@router.get("/{numero}", response_model=PagoResponse)
async def obtener(numero: int, db: AsyncSession = Depends(get_db)):
    p = await svc.get_pago(db, numero)
    if not p:
        raise HTTPException(404, "Pago no encontrado")
    return PagoResponse(
        numero=p.numero, fecha=p.fecha,
        obligacion_numero=p.obligacion_numero,
        codigo_rubro=p.codigo_rubro,
        cuenta=p.rubro.cuenta if p.rubro else None,
        nit_tercero=p.nit_tercero,
        nombre_tercero=p.tercero.nombre if p.tercero else None,
        valor=p.valor, concepto=p.concepto,
        medio_pago=p.medio_pago,
        no_comprobante=p.no_comprobante,
        cuenta_bancaria_id=p.cuenta_bancaria_id,
        estado=p.estado,
    )


@router.post("", response_model=PagoResponse, status_code=201)
async def registrar(data: PagoCreate, db: AsyncSession = Depends(get_db)):
    try:
        p = await svc.registrar(
            db, data.obligacion_numero, data.valor, data.concepto,
            data.medio_pago, data.no_comprobante, data.cuenta_bancaria_id,
        )
        return PagoResponse(
            numero=p.numero, fecha=p.fecha,
            obligacion_numero=p.obligacion_numero,
            codigo_rubro=p.codigo_rubro,
            cuenta=p.rubro.cuenta if p.rubro else None,
            nit_tercero=p.nit_tercero,
            nombre_tercero=p.tercero.nombre if p.tercero else None,
            valor=p.valor, concepto=p.concepto,
            medio_pago=p.medio_pago,
            no_comprobante=p.no_comprobante,
            cuenta_bancaria_id=p.cuenta_bancaria_id,
            estado=p.estado,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}", response_model=PagoResponse)
async def editar(numero: int, data: PagoUpdate, db: AsyncSession = Depends(get_db)):
    try:
        p = await svc.editar(db, numero, data)
        return PagoResponse(
            numero=p.numero, fecha=p.fecha,
            obligacion_numero=p.obligacion_numero,
            codigo_rubro=p.codigo_rubro,
            cuenta=p.rubro.cuenta if p.rubro else None,
            nit_tercero=p.nit_tercero,
            nombre_tercero=p.tercero.nombre if p.tercero else None,
            valor=p.valor, concepto=p.concepto,
            medio_pago=p.medio_pago,
            no_comprobante=p.no_comprobante,
            cuenta_bancaria_id=p.cuenta_bancaria_id,
            estado=p.estado,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}/anular")
async def anular(numero: int, db: AsyncSession = Depends(get_db)):
    try:
        await svc.anular(db, numero)
        return {"message": f"Pago {numero} anulado"}
    except ValueError as e:
        raise HTTPException(400, str(e))
