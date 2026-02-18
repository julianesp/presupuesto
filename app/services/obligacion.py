"""
Servicio de Obligaciones (Obligacion).
Logica de negocio para registro, consulta, anulacion y edicion de obligaciones.
Migrado desde aplicacion Tkinter/SQLite a SQLAlchemy async.
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def saldo_obligacion(db: AsyncSession, numero_obl: int) -> float:
    """Retorna el saldo de una obligacion: valor - SUM(pagos activos)."""
    obl = await get_obligacion(db, numero_obl)
    if obl is None:
        raise ValueError(f"Obligacion {numero_obl} no encontrada")

    stmt = (
        select(func.sum(Pago.valor))
        .where(
            and_(
                Pago.obligacion_numero == numero_obl,
                Pago.estado != "ANULADO",
            )
        )
    )
    result = await db.execute(stmt)
    total_pagos = result.scalar() or 0.0
    return float(obl.valor) - float(total_pagos)


# ---------------------------------------------------------------------------
# CRUD principal
# ---------------------------------------------------------------------------

async def registrar(
    db: AsyncSession,
    rp_numero: int,
    valor: float,
    factura: str,
) -> Obligacion:
    """Registra una nueva obligacion asociada a un RP."""

    # --- Validar RP ---
    rp = await rp_svc.get_rp(db, rp_numero)
    if rp is None:
        raise ValueError(f"RP {rp_numero} no encontrado")
    if rp.estado == "ANULADO":
        raise ValueError(f"RP {rp_numero} esta ANULADO, no se puede obligar")

    # --- Validar valor ---
    if valor <= 0:
        raise ValueError("El valor debe ser mayor a cero")

    saldo = await rp_svc.saldo_rp(db, rp_numero)
    if valor > saldo:
        raise ValueError(
            f"El valor ({valor:,.2f}) supera el saldo disponible del RP ({saldo:,.2f})"
        )

    # --- Consecutivo ---
    numero = await config_svc.get_next_consecutivo(db, tipo="obligacion")

    # --- Crear obligacion ---
    nueva = Obligacion(
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

    # --- Guardar concepto del rubro ---
    await guardar_concepto(db, rp.codigo_rubro, factura)

    # --- Actualizar estado del RP (puede pasar a OBLIGADO / AGOTADO) ---
    await rp_svc.actualizar_estado(db, rp_numero)

    await db.flush()
    return nueva


async def get_obligaciones(
    db: AsyncSession,
    estado: str | None = None,
) -> list[Obligacion]:
    """Retorna todas las obligaciones, opcionalmente filtradas por estado."""
    stmt = select(Obligacion)
    if estado is not None:
        stmt = stmt.where(Obligacion.estado == estado)
    stmt = stmt.order_by(Obligacion.numero.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_obligacion(db: AsyncSession, numero: int) -> Obligacion | None:
    """Retorna una obligacion por su numero, o None."""
    stmt = select(Obligacion).where(Obligacion.numero == numero)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def anular(db: AsyncSession, numero: int) -> Obligacion:
    """Anula una obligacion. Valida que no tenga pagos activos."""
    obl = await get_obligacion(db, numero)
    if obl is None:
        raise ValueError(f"Obligacion {numero} no encontrada")

    # --- Verificar que no haya pagos activos ---
    stmt = (
        select(func.count())
        .select_from(Pago)
        .where(
            and_(
                Pago.obligacion_numero == numero,
                Pago.estado != "ANULADO",
            )
        )
    )
    result = await db.execute(stmt)
    pagos_activos = result.scalar() or 0
    if pagos_activos > 0:
        raise ValueError(
            f"No se puede anular: la obligacion tiene {pagos_activos} pago(s) activo(s)"
        )

    obl.estado = "ANULADA"

    # --- Reactivar RP si corresponde ---
    await rp_svc.actualizar_estado(db, obl.rp_numero)

    await db.flush()
    return obl


async def actualizar_estado(db: AsyncSession, numero: int) -> Obligacion:
    """Actualiza el estado de una obligacion segun su saldo."""
    obl = await get_obligacion(db, numero)
    if obl is None:
        raise ValueError(f"Obligacion {numero} no encontrada")

    if obl.estado == "ANULADA":
        return obl

    saldo = await saldo_obligacion(db, numero)

    if saldo <= 0:
        obl.estado = "PAGADA"
    elif obl.estado == "PAGADA":
        # Revertir a ACTIVO si se anulo un pago, por ejemplo
        obl.estado = "ACTIVO"

    await db.flush()
    return obl


async def editar(
    db: AsyncSession,
    numero: int,
    nuevo_valor: float | None = None,
    factura: str | None = None,
    fuente_sifse: str | None = None,
    item_sifse: str | None = None,
) -> Obligacion:
    """Edita campos de una obligacion existente."""
    obl = await get_obligacion(db, numero)
    if obl is None:
        raise ValueError(f"Obligacion {numero} no encontrada")

    valor_cambio = False

    if nuevo_valor is not None:
        if nuevo_valor <= 0:
            raise ValueError("El valor debe ser mayor a cero")

        # Calcular cuanto se ha pagado
        pagado = float(obl.valor) - await saldo_obligacion(db, numero)

        if nuevo_valor < pagado:
            raise ValueError(
                f"El nuevo valor ({nuevo_valor:,.2f}) no puede ser menor "
                f"al monto ya pagado ({pagado:,.2f})"
            )

        # Validar contra saldo del RP (descontando el valor actual de esta obl)
        saldo_rp = await rp_svc.saldo_rp(db, obl.rp_numero)
        disponible_rp = saldo_rp + float(obl.valor)  # devolver lo que ocupa esta obl
        if nuevo_valor > disponible_rp:
            raise ValueError(
                f"El nuevo valor ({nuevo_valor:,.2f}) supera el saldo "
                f"disponible del RP ({disponible_rp:,.2f})"
            )

        obl.valor = nuevo_valor
        valor_cambio = True

    if factura is not None:
        obl.factura = factura

    if fuente_sifse is not None:
        obl.fuente_sifse = fuente_sifse

    if item_sifse is not None:
        obl.item_sifse = item_sifse

    # --- Actualizar estado del RP si cambio el valor ---
    if valor_cambio:
        await rp_svc.actualizar_estado(db, obl.rp_numero)

    await db.flush()
    return obl


async def get_obligaciones_por_rubro(
    db: AsyncSession,
    codigo_rubro: str,
) -> list[Obligacion]:
    """Retorna obligaciones activas (no anuladas) para un rubro especifico."""
    stmt = (
        select(Obligacion)
        .where(
            and_(
                Obligacion.codigo_rubro == codigo_rubro,
                Obligacion.estado != "ANULADA",
            )
        )
        .order_by(Obligacion.numero.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
