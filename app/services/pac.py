from sqlalchemy import select, func, and_, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pac import PAC
from app.models.pago import Pago
from app.models.rubros import RubroGasto


# ---------------------------------------------------------------------------
# Inicializar PAC (12 meses con valor 0)
# ---------------------------------------------------------------------------

async def inicializar_pac(db: AsyncSession, codigo_rubro: str) -> list[PAC]:
    existing = await get_pac(db, codigo_rubro)
    if existing:
        return existing

    registros = []
    for mes in range(1, 13):
        pac = PAC(
            codigo_rubro=codigo_rubro,
            mes=mes,
            valor_programado=0,
        )
        db.add(pac)
        registros.append(pac)
    await db.flush()
    return registros


# ---------------------------------------------------------------------------
# Obtener los 12 registros PAC de un rubro
# ---------------------------------------------------------------------------

async def get_pac(db: AsyncSession, codigo_rubro: str) -> list[PAC]:
    stmt = (
        select(PAC)
        .where(PAC.codigo_rubro == codigo_rubro)
        .order_by(PAC.mes)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Establecer PAC completo (12 valores mensuales)
# ---------------------------------------------------------------------------

async def set_pac_completo(
    db: AsyncSession,
    codigo_rubro: str,
    valores_mensuales: list[float],
) -> list[PAC]:
    if len(valores_mensuales) != 12:
        raise ValueError("Se requieren exactamente 12 valores mensuales")

    existing = await get_pac(db, codigo_rubro)

    if not existing:
        existing = await inicializar_pac(db, codigo_rubro)

    for pac_record, valor in zip(existing, valores_mensuales):
        pac_record.valor_programado = valor

    await db.flush()
    return existing


# ---------------------------------------------------------------------------
# PAC disponible para un mes = valor_programado - pagos del mes
# ---------------------------------------------------------------------------

async def get_pac_disponible(
    db: AsyncSession, codigo_rubro: str, mes: int
) -> float:
    # Obtener valor programado para el mes
    stmt = select(PAC).where(
        and_(PAC.codigo_rubro == codigo_rubro, PAC.mes == mes)
    )
    result = await db.execute(stmt)
    pac_record = result.scalar_one_or_none()

    if pac_record is None:
        return 0

    # Sumar pagos del mes para este rubro
    mes_col = func.cast(func.substr(Pago.fecha, 6, 2), Integer)
    stmt_pagos = select(func.coalesce(func.sum(Pago.valor), 0)).where(
        and_(
            Pago.codigo_rubro == codigo_rubro,
            Pago.estado == "PAGADO",
            mes_col == mes,
        )
    )
    result_pagos = await db.execute(stmt_pagos)
    total_pagos = result_pagos.scalar()

    return pac_record.valor_programado - total_pagos


# ---------------------------------------------------------------------------
# Distribuir uniformemente la apropiacion definitiva en 12 meses
# ---------------------------------------------------------------------------

async def distribuir_uniforme(
    db: AsyncSession, codigo_rubro: str
) -> list[float]:
    stmt = select(RubroGasto).where(RubroGasto.codigo == codigo_rubro)
    result = await db.execute(stmt)
    rubro = result.scalar_one_or_none()

    if rubro is None:
        raise ValueError(f"Rubro de gasto {codigo_rubro} no encontrado")

    total = rubro.apropiacion_definitiva
    mensual = round(total / 12, 2)
    valores = [mensual] * 12
    # Ajustar ultimo mes para que la suma cuadre
    valores[11] = round(total - (mensual * 11), 2)

    await set_pac_completo(db, codigo_rubro, valores)
    return valores


# ---------------------------------------------------------------------------
# Validar si un pago cabe en el PAC del mes
# ---------------------------------------------------------------------------

async def validar_pago_pac(
    db: AsyncSession, codigo_rubro: str, mes: int, valor: float
) -> tuple[bool, str]:
    pac_records = await get_pac(db, codigo_rubro)

    # Si no hay PAC configurado, se permite el pago
    if not pac_records:
        return (True, "PAC no configurado")

    # Si todos los meses tienen valor_programado = 0, no hay PAC real
    total_programado = sum(p.valor_programado for p in pac_records)
    if total_programado == 0:
        return (True, "PAC no configurado")

    disponible = await get_pac_disponible(db, codigo_rubro, mes)

    if valor <= disponible:
        return (True, "OK")

    return (False, f"Excede PAC disponible: ${disponible:,.2f}")


# ---------------------------------------------------------------------------
# Resumen PAC de todos los rubros hoja de gastos
# ---------------------------------------------------------------------------

async def get_resumen_pac(db: AsyncSession) -> list[dict]:
    stmt = (
        select(RubroGasto)
        .where(RubroGasto.es_hoja == 1)
        .order_by(RubroGasto.codigo)
    )
    result = await db.execute(stmt)
    rubros = list(result.scalars().all())

    resumen = []
    for rubro in rubros:
        pac_records = await get_pac(db, rubro.codigo)

        meses = {}
        total_programado = 0
        for p in pac_records:
            meses[p.mes] = p.valor_programado
            total_programado += p.valor_programado

        resumen.append({
            "codigo_rubro": rubro.codigo,
            "cuenta": rubro.cuenta,
            "apropiacion_definitiva": rubro.apropiacion_definitiva,
            "total_programado": total_programado,
            "meses": meses,
        })

    return resumen
