"""
Servicio de Pagos (Pago).
Logica de negocio para registro, consulta, anulacion y edicion de pagos.
Incluye validacion PAC (Plan Anual de Caja).
"""

from datetime import date
from sqlalchemy import select, func, and_, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pago import Pago
from app.models.obligacion import Obligacion
from app.services import obligacion as obl_svc
from app.services import config as config_svc
from app.services import pac as pac_svc


async def registrar(
    db: AsyncSession,
    tenant_id: str,
    obligacion_numero: int,
    valor: float,
    concepto: str,
    medio_pago: str,
    no_comprobante: str,
    cuenta_bancaria_id: int = 0,
) -> Pago:
    obl = await obl_svc.get_obligacion(db, tenant_id, obligacion_numero)
    if obl is None:
        raise ValueError(f"Obligacion {obligacion_numero} no encontrada")
    if obl.estado == "ANULADA":
        raise ValueError(f"Obligacion {obligacion_numero} esta ANULADA, no se puede pagar")

    if valor <= 0:
        raise ValueError("El valor debe ser mayor a cero")

    saldo = await obl_svc.saldo_obligacion(db, tenant_id, obligacion_numero)
    if valor > saldo:
        raise ValueError(f"El valor ({valor:,.2f}) supera el saldo disponible de la obligacion ({saldo:,.2f})")

    mes_actual_cfg = await config_svc.get_config(db, tenant_id, "mes_actual")
    mes_actual = int(mes_actual_cfg)

    ok, msg = await pac_svc.validar_pago_pac(db, tenant_id, obl.codigo_rubro, mes_actual, valor)
    if not ok:
        raise ValueError(msg)

    numero = await config_svc.get_next_consecutivo(db, tenant_id, tipo="pago")

    nuevo = Pago(
        tenant_id=tenant_id,
        numero=numero,
        obligacion_numero=obligacion_numero,
        valor=valor,
        concepto=concepto,
        medio_pago=medio_pago,
        no_comprobante=no_comprobante,
        cuenta_bancaria_id=cuenta_bancaria_id,
        codigo_rubro=obl.codigo_rubro,
        nit_tercero=obl.nit_tercero,
        fuente_sifse=obl.fuente_sifse,
        item_sifse=obl.item_sifse,
        fecha=date.today().isoformat(),
        estado="PAGADO",
    )
    db.add(nuevo)

    await db.flush()
    await obl_svc.actualizar_estado(db, tenant_id, obligacion_numero)

    return nuevo


async def get_pagos(db: AsyncSession, tenant_id: str, estado: str | None = None) -> list[Pago]:
    stmt = select(Pago).where(Pago.tenant_id == tenant_id)
    if estado:
        stmt = stmt.where(Pago.estado == estado)
    stmt = stmt.order_by(Pago.numero.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_pago(db: AsyncSession, tenant_id: str, numero: int) -> Pago | None:
    stmt = select(Pago).where(Pago.tenant_id == tenant_id, Pago.numero == numero)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def anular(db: AsyncSession, tenant_id: str, numero: int) -> Pago:
    pago = await get_pago(db, tenant_id, numero)
    if pago is None:
        raise ValueError(f"Pago {numero} no encontrado")
    pago.estado = "ANULADO"
    await obl_svc.actualizar_estado(db, tenant_id, pago.obligacion_numero)
    await db.flush()
    return pago


async def editar(
    db: AsyncSession,
    tenant_id: str,
    numero: int,
    nuevo_valor: float | None = None,
    concepto: str | None = None,
    medio_pago: str | None = None,
    no_comprobante: str | None = None,
    cuenta_bancaria_id: int | None = None,
    fuente_sifse: int | None = None,
    item_sifse: int | None = None,
) -> Pago:
    pago = await get_pago(db, tenant_id, numero)
    if pago is None:
        raise ValueError(f"Pago {numero} no encontrado")

    if nuevo_valor is not None:
        if nuevo_valor <= 0:
            raise ValueError("El valor debe ser mayor a cero")
        saldo = await obl_svc.saldo_obligacion(db, tenant_id, pago.obligacion_numero)
        disponible = saldo + float(pago.valor)
        if nuevo_valor > disponible:
            raise ValueError(
                f"El nuevo valor ({nuevo_valor:,.2f}) supera el saldo disponible de la obligacion ({disponible:,.2f})"
            )
        pago.valor = nuevo_valor

    if concepto is not None:
        pago.concepto = concepto
    if medio_pago is not None:
        pago.medio_pago = medio_pago
    if no_comprobante is not None:
        pago.no_comprobante = no_comprobante
    if cuenta_bancaria_id is not None:
        pago.cuenta_bancaria_id = cuenta_bancaria_id
    if fuente_sifse is not None:
        pago.fuente_sifse = fuente_sifse
    if item_sifse is not None:
        pago.item_sifse = item_sifse

    await obl_svc.actualizar_estado(db, tenant_id, pago.obligacion_numero)
    await db.flush()
    return pago


async def get_pagos_por_rubro(
    db: AsyncSession,
    tenant_id: str,
    codigo_rubro: str,
) -> list[Pago]:
    stmt = (
        select(Pago)
        .where(and_(Pago.tenant_id == tenant_id, Pago.codigo_rubro == codigo_rubro, Pago.estado != "ANULADO"))
        .order_by(Pago.numero.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_pagos_mes_rubro(
    db: AsyncSession,
    tenant_id: str,
    codigo_rubro: str,
    mes: int,
) -> float:
    stmt = (
        select(func.sum(Pago.valor))
        .where(
            and_(
                Pago.tenant_id == tenant_id,
                Pago.codigo_rubro == codigo_rubro,
                Pago.estado != "ANULADO",
                cast(func.substr(Pago.fecha, 6, 2), Integer) == mes,
            )
        )
    )
    result = await db.execute(stmt)
    return float(result.scalar() or 0.0)
