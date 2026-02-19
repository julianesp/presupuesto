"""
Servicio de Pagos (Pago).
Logica de negocio para registro, consulta, anulacion y edicion de pagos.
Incluye validacion PAC (Plan Anual de Caja).
Migrado desde aplicacion Tkinter/SQLite a SQLAlchemy async.
"""

from datetime import date
from sqlalchemy import select, func, and_, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pago import Pago
from app.models.obligacion import Obligacion
from app.services import obligacion as obl_svc
from app.services import config as config_svc
from app.services import pac as pac_svc


# ---------------------------------------------------------------------------
# CRUD principal
# ---------------------------------------------------------------------------

async def registrar(
    db: AsyncSession,
    obligacion_numero: int,
    valor: float,
    concepto: str,
    medio_pago: str,
    no_comprobante: str,
    cuenta_bancaria_id: int = 0,
) -> Pago:
    """Registra un nuevo pago asociado a una obligacion."""

    # --- Validar obligacion ---
    obl = await obl_svc.get_obligacion(db, obligacion_numero)
    if obl is None:
        raise ValueError(f"Obligacion {obligacion_numero} no encontrada")
    if obl.estado == "ANULADA":
        raise ValueError(
            f"Obligacion {obligacion_numero} esta ANULADA, no se puede pagar"
        )

    # --- Validar valor ---
    if valor <= 0:
        raise ValueError("El valor debe ser mayor a cero")

    saldo = await obl_svc.saldo_obligacion(db, obligacion_numero)
    if valor > saldo:
        raise ValueError(
            f"El valor ({valor:,.2f}) supera el saldo disponible "
            f"de la obligacion ({saldo:,.2f})"
        )

    # --- Validacion PAC ---
    mes_actual_cfg = await config_svc.get_config(db, "mes_actual")
    mes_actual = int(mes_actual_cfg)

    ok, msg = await pac_svc.validar_pago_pac(
        db, obl.codigo_rubro, mes_actual, valor
    )
    if not ok:
        raise ValueError(msg)

    # --- Consecutivo ---
    numero = await config_svc.get_next_consecutivo(db, tipo="pago")

    # --- Crear pago ---
    nuevo = Pago(
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

    # --- Actualizar estado de la obligacion ---
    await db.flush()  # para que el nuevo pago se refleje en saldo_obligacion
    await obl_svc.actualizar_estado(db, obligacion_numero)

    return nuevo


async def get_pagos(db: AsyncSession) -> list[Pago]:
    """Retorna todos los pagos ordenados por numero descendente."""
    stmt = select(Pago).order_by(Pago.numero.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_pago(db: AsyncSession, numero: int) -> Pago | None:
    """Retorna un pago por su numero, o None."""
    stmt = select(Pago).where(Pago.numero == numero)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def anular(db: AsyncSession, numero: int) -> Pago:
    """Anula un pago y actualiza el estado de la obligacion asociada."""
    pago = await get_pago(db, numero)
    if pago is None:
        raise ValueError(f"Pago {numero} no encontrado")

    pago.estado = "ANULADO"

    # --- Actualizar estado de la obligacion (puede revertir de PAGADA a ACTIVO) ---
    await obl_svc.actualizar_estado(db, pago.obligacion_numero)

    await db.flush()
    return pago


async def editar(
    db: AsyncSession,
    numero: int,
    nuevo_valor: float | None = None,
    concepto: str | None = None,
    medio_pago: str | None = None,
    no_comprobante: str | None = None,
    cuenta_bancaria_id: int | None = None,
    fuente_sifse: str | None = None,
    item_sifse: str | None = None,
) -> Pago:
    """Edita campos de un pago existente."""
    pago = await get_pago(db, numero)
    if pago is None:
        raise ValueError(f"Pago {numero} no encontrado")

    if nuevo_valor is not None:
        if nuevo_valor <= 0:
            raise ValueError("El valor debe ser mayor a cero")

        # Calcular saldo disponible de la obligacion sumando el valor actual
        # de este pago (porque se va a reemplazar)
        saldo = await obl_svc.saldo_obligacion(db, pago.obligacion_numero)
        disponible = saldo + float(pago.valor)  # devolver lo que ocupa este pago

        if nuevo_valor > disponible:
            raise ValueError(
                f"El nuevo valor ({nuevo_valor:,.2f}) supera el saldo "
                f"disponible de la obligacion ({disponible:,.2f})"
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

    # --- Actualizar estado de la obligacion por si cambio el valor ---
    await obl_svc.actualizar_estado(db, pago.obligacion_numero)

    await db.flush()
    return pago


async def get_pagos_por_rubro(
    db: AsyncSession,
    codigo_rubro: str,
) -> list[Pago]:
    """Retorna pagos activos (no anulados) para un rubro especifico."""
    stmt = (
        select(Pago)
        .where(
            and_(
                Pago.codigo_rubro == codigo_rubro,
                Pago.estado != "ANULADO",
            )
        )
        .order_by(Pago.numero.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_pagos_mes_rubro(
    db: AsyncSession,
    codigo_rubro: str,
    mes: int,
) -> float:
    """
    Retorna la suma de pagos activos para un rubro en un mes especifico.
    El mes se extrae del campo fecha (formato YYYY-MM-DD almacenado como texto).
    Usa func.substr compatible con SQLite.
    """
    stmt = (
        select(func.sum(Pago.valor))
        .where(
            and_(
                Pago.codigo_rubro == codigo_rubro,
                Pago.estado != "ANULADO",
                cast(func.substr(Pago.fecha, 6, 2), Integer) == mes,
            )
        )
    )
    result = await db.execute(stmt)
    return float(result.scalar() or 0.0)
