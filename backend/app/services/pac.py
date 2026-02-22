from sqlalchemy import select, func, and_, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pac import PAC
from app.models.pago import Pago
from app.models.rubros import RubroGasto


async def inicializar_pac(db: AsyncSession, tenant_id: str, codigo_rubro: str) -> list[PAC]:
    existing = await get_pac(db, tenant_id, codigo_rubro)
    if existing:
        return existing

    registros = []
    for mes in range(1, 13):
        pac = PAC(
            tenant_id=tenant_id,
            codigo_rubro=codigo_rubro,
            mes=mes,
            valor_programado=0,
        )
        db.add(pac)
        registros.append(pac)
    await db.flush()  # flush dentro de la transacción del llamador
    return registros


async def get_pac(db: AsyncSession, tenant_id: str, codigo_rubro: str) -> list[PAC]:
    stmt = (
        select(PAC)
        .where(PAC.tenant_id == tenant_id, PAC.codigo_rubro == codigo_rubro)
        .order_by(PAC.mes)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def set_pac_completo(
    db: AsyncSession,
    tenant_id: str,
    codigo_rubro: str,
    valores_mensuales: list[float],
) -> list[PAC]:
    if len(valores_mensuales) != 12:
        raise ValueError("Se requieren exactamente 12 valores mensuales")

    existing = await get_pac(db, tenant_id, codigo_rubro)

    if not existing:
        existing = await inicializar_pac(db, tenant_id, codigo_rubro)

    for pac_record, valor in zip(existing, valores_mensuales):
        pac_record.valor_programado = valor

    await db.commit()
    return existing


async def get_pac_disponible(
    db: AsyncSession, tenant_id: str, codigo_rubro: str, mes: int
) -> float:
    stmt = select(PAC).where(
        PAC.tenant_id == tenant_id,
        PAC.codigo_rubro == codigo_rubro,
        PAC.mes == mes,
    )
    result = await db.execute(stmt)
    pac_record = result.scalar_one_or_none()

    if pac_record is None:
        return 0

    mes_col = func.cast(func.substr(Pago.fecha, 6, 2), Integer)
    stmt_pagos = select(func.coalesce(func.sum(Pago.valor), 0)).where(
        and_(
            Pago.tenant_id == tenant_id,
            Pago.codigo_rubro == codigo_rubro,
            Pago.estado == "PAGADO",
            mes_col == mes,
        )
    )
    result_pagos = await db.execute(stmt_pagos)
    total_pagos = result_pagos.scalar()

    return pac_record.valor_programado - total_pagos


async def distribuir_uniforme(
    db: AsyncSession, tenant_id: str, codigo_rubro: str
) -> list[float]:
    stmt = select(RubroGasto).where(
        RubroGasto.tenant_id == tenant_id,
        RubroGasto.codigo == codigo_rubro,
    )
    result = await db.execute(stmt)
    rubro = result.scalar_one_or_none()

    if rubro is None:
        raise ValueError(f"Rubro de gasto {codigo_rubro} no encontrado")

    total = rubro.apropiacion_definitiva
    mensual = round(total / 12, 2)
    valores = [mensual] * 12
    valores[11] = round(total - (mensual * 11), 2)

    await set_pac_completo(db, tenant_id, codigo_rubro, valores)
    return valores


async def distribuir_uniforme_todos(db: AsyncSession, tenant_id: str) -> int:
    stmt = select(RubroGasto).where(
        RubroGasto.tenant_id == tenant_id,
        RubroGasto.es_hoja == 1,
    )
    result = await db.execute(stmt)
    rubros = list(result.scalars().all())
    for rubro in rubros:
        await distribuir_uniforme(db, tenant_id, rubro.codigo)
    return len(rubros)


async def validar_pago_pac(
    db: AsyncSession, tenant_id: str, codigo_rubro: str, mes: int, valor: float
) -> tuple[bool, str]:
    pac_records = await get_pac(db, tenant_id, codigo_rubro)

    if not pac_records:
        return (True, "PAC no configurado")

    total_programado = sum(p.valor_programado for p in pac_records)
    if total_programado == 0:
        return (True, "PAC no configurado")

    disponible = await get_pac_disponible(db, tenant_id, codigo_rubro, mes)

    if valor <= disponible:
        return (True, "OK")

    return (False, f"Excede PAC disponible: ${disponible:,.2f}")


async def get_resumen_pac(db: AsyncSession, tenant_id: str) -> list[dict]:
    stmt = (
        select(RubroGasto)
        .where(RubroGasto.tenant_id == tenant_id, RubroGasto.es_hoja == 1)
        .order_by(RubroGasto.codigo)
    )
    result = await db.execute(stmt)
    rubros = list(result.scalars().all())

    resumen = []
    for rubro in rubros:
        pac_records = await get_pac(db, tenant_id, rubro.codigo)

        meses = {}
        total_programado = 0
        for p in pac_records:
            meses[p.mes] = p.valor_programado
            total_programado += p.valor_programado

        pac_list = [{"mes": m, "valor_programado": v} for m, v in sorted(meses.items())]
        resumen.append({
            "codigo": rubro.codigo,
            "cuenta": rubro.cuenta,
            "apropiacion_definitiva": rubro.apropiacion_definitiva,
            "total_pac": total_programado,
            "pac_configurado": total_programado > 0,
            "pac": pac_list,
        })

    return resumen
