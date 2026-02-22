from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import pago as svc
from app.schemas.pago import PagoCreate, PagoUpdate, PagoResponse
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/pagos", tags=["Pagos"])


def _build_response(p) -> PagoResponse:
    return PagoResponse(
        numero=p.numero,
        fecha=p.fecha,
        obligacion_numero=p.obligacion_numero,
        codigo_rubro=p.codigo_rubro,
        cuenta=None,
        nit_tercero=p.nit_tercero,
        nombre_tercero=p.tercero.nombre if p.tercero else None,
        valor=p.valor,
        concepto=p.concepto,
        medio_pago=p.medio_pago,
        no_comprobante=p.no_comprobante,
        cuenta_bancaria_id=p.cuenta_bancaria_id,
        fuente_sifse=p.fuente_sifse,
        item_sifse=p.item_sifse,
        estado=p.estado,
    )


@router.get("", response_model=list[PagoResponse])
async def listar(estado: str | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    pagos = await svc.get_pagos(db, user.tenant_id, estado=estado)
    return [_build_response(p) for p in pagos]


@router.get("/{numero}", response_model=PagoResponse)
async def obtener(numero: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    p = await svc.get_pago(db, user.tenant_id, numero)
    if not p:
        raise HTTPException(404, "Pago no encontrado")
    return _build_response(p)


@router.post("", response_model=PagoResponse, status_code=201)
async def registrar(data: PagoCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        p = await svc.registrar(
            db, user.tenant_id, data.obligacion_numero, data.valor, data.concepto,
            data.medio_pago, data.no_comprobante, data.cuenta_bancaria_id,
        )
        return _build_response(p)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}", response_model=PagoResponse)
async def editar(numero: int, data: PagoUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        p = await svc.editar(
            db, user.tenant_id, numero,
            nuevo_valor=data.valor,
            concepto=data.concepto,
            medio_pago=data.medio_pago,
            no_comprobante=data.no_comprobante,
            cuenta_bancaria_id=data.cuenta_bancaria_id,
            fuente_sifse=data.fuente_sifse,
            item_sifse=data.item_sifse,
        )
        return _build_response(p)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}/anular")
async def anular(numero: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        await svc.anular(db, user.tenant_id, numero)
        return {"message": f"Pago {numero} anulado"}
    except ValueError as e:
        raise HTTPException(400, str(e))
