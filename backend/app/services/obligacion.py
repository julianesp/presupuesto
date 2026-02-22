"""
Servicio de Obligaciones (Obligacion).
Logica de negocio para registro, consulta, anulacion y edicion de obligaciones.
"""

from datetime import date
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.obligacion import Obligacion
from app.models.pago import Pago
from app.models.rp import RP
from app.services import rp as rp_svc
from app.services import config as config_svc
from app.services.conceptos import guardar_concepto


async def saldo_obligacion(db: AsyncSession, tenant_id: str, numero_obl: int) -> float:
    obl = await get_obligacion(db, tenant_id, numero_obl)
    if obl is None:
        raise ValueError(f"Obligacion {numero_obl} no encontrada")
    stmt = (
        select(func.sum(Pago.valor))
        .where(and_(Pago.tenant_id == tenant_id, Pago.obligacion_numero == numero_obl, Pago.estado != "ANULADO"))
    )
    result = await db.execute(stmt)
    total_pagos = result.scalar() or 0.0
    return float(obl.valor) - float(total_pagos)


async def registrar(
    db: AsyncSession,
    tenant_id: str,
    rp_numero: int,
    valor: float,
    factura: str,
) -> Obligacion:
    rp = await rp_svc.get_rp(db, tenant_id, rp_numero)
    if rp is None:
        raise ValueError(f"RP {rp_numero} no encontrado")
    if rp.estado == "ANULADO":
        raise ValueError(f"RP {rp_numero} esta ANULADO, no se puede obligar")

    if valor <= 0:
        raise ValueError("El valor debe ser mayor a cero")

    saldo = await rp_svc.saldo_rp(db, tenant_id, rp_numero)
    if valor > saldo:
        raise ValueError(f"El valor ({valor:,.2f}) supera el saldo disponible del RP ({saldo:,.2f})")

    numero = await config_svc.get_next_consecutivo(db, tenant_id, tipo="obligacion")

    nueva = Obligacion(
        tenant_id=tenant_id,
        numero=numero,
        rp_numero=rp_numero,
        valor=valor,
        factura=factura,
        codigo_rubro=rp.codigo_rubro,
        nit_tercero=rp.nit_tercero,
        fuente_sifse=rp.fuente_sifse,
        item_sifse=rp.item_sifse,
        fecha=date.today().isoformat(),
        estado="ACTIVO",
    )
    db.add(nueva)

    await guardar_concepto(db, tenant_id, rp.codigo_rubro, factura)
    await rp_svc.actualizar_estado(db, tenant_id, rp_numero)

    await db.flush()
    return nueva


async def get_obligaciones(
    db: AsyncSession,
    tenant_id: str,
    estado: str | None = None,
) -> list[Obligacion]:
    stmt = select(Obligacion).where(Obligacion.tenant_id == tenant_id)
    if estado is not None:
        stmt = stmt.where(Obligacion.estado == estado)
    stmt = stmt.order_by(Obligacion.numero.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_obligacion(db: AsyncSession, tenant_id: str, numero: int) -> Obligacion | None:
    stmt = select(Obligacion).where(Obligacion.tenant_id == tenant_id, Obligacion.numero == numero)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def anular(db: AsyncSession, tenant_id: str, numero: int) -> Obligacion:
    obl = await get_obligacion(db, tenant_id, numero)
    if obl is None:
        raise ValueError(f"Obligacion {numero} no encontrada")
    stmt = (
        select(func.count())
        .select_from(Pago)
        .where(and_(Pago.tenant_id == tenant_id, Pago.obligacion_numero == numero, Pago.estado != "ANULADO"))
    )
    result = await db.execute(stmt)
    pagos_activos = result.scalar() or 0
    if pagos_activos > 0:
        raise ValueError(f"No se puede anular: la obligacion tiene {pagos_activos} pago(s) activo(s)")
    obl.estado = "ANULADA"
    await rp_svc.actualizar_estado(db, tenant_id, obl.rp_numero)
    await db.flush()
    return obl


async def actualizar_estado(db: AsyncSession, tenant_id: str, numero: int) -> Obligacion:
    obl = await get_obligacion(db, tenant_id, numero)
    if obl is None:
        raise ValueError(f"Obligacion {numero} no encontrada")
    if obl.estado == "ANULADA":
        return obl
    saldo = await saldo_obligacion(db, tenant_id, numero)
    if saldo <= 0:
        obl.estado = "PAGADA"
    elif obl.estado == "PAGADA":
        obl.estado = "ACTIVO"
    await db.flush()
    return obl


async def editar(
    db: AsyncSession,
    tenant_id: str,
    numero: int,
    nuevo_valor: float | None = None,
    factura: str | None = None,
    fuente_sifse: str | None = None,
    item_sifse: str | None = None,
) -> Obligacion:
    obl = await get_obligacion(db, tenant_id, numero)
    if obl is None:
        raise ValueError(f"Obligacion {numero} no encontrada")

    valor_cambio = False

    if nuevo_valor is not None:
        if nuevo_valor <= 0:
            raise ValueError("El valor debe ser mayor a cero")
        pagado = float(obl.valor) - await saldo_obligacion(db, tenant_id, numero)
        if nuevo_valor < pagado:
            raise ValueError(
                f"El nuevo valor ({nuevo_valor:,.2f}) no puede ser menor al monto ya pagado ({pagado:,.2f})"
            )
        saldo_rp = await rp_svc.saldo_rp(db, tenant_id, obl.rp_numero)
        disponible_rp = saldo_rp + float(obl.valor)
        if nuevo_valor > disponible_rp:
            raise ValueError(
                f"El nuevo valor ({nuevo_valor:,.2f}) supera el saldo disponible del RP ({disponible_rp:,.2f})"
            )
        obl.valor = nuevo_valor
        valor_cambio = True

    if factura is not None:
        obl.factura = factura
    if fuente_sifse is not None:
        obl.fuente_sifse = fuente_sifse
    if item_sifse is not None:
        obl.item_sifse = item_sifse

    if valor_cambio:
        await rp_svc.actualizar_estado(db, tenant_id, obl.rp_numero)

    await db.flush()
    return obl


async def get_obligaciones_por_rubro(
    db: AsyncSession,
    tenant_id: str,
    codigo_rubro: str,
) -> list[Obligacion]:
    stmt = (
        select(Obligacion)
        .where(and_(Obligacion.tenant_id == tenant_id, Obligacion.codigo_rubro == codigo_rubro, Obligacion.estado != "ANULADA"))
        .order_by(Obligacion.numero.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
