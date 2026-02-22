from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rubros import RubroGasto
from app.models.cdp import CDP


async def get_rubros(db: AsyncSession, tenant_id: str, solo_hojas: bool = False) -> list[RubroGasto]:
    stmt = select(RubroGasto).where(RubroGasto.tenant_id == tenant_id)
    if solo_hojas:
        stmt = stmt.where(RubroGasto.es_hoja == 1)
    stmt = stmt.order_by(RubroGasto.codigo)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_rubro(db: AsyncSession, tenant_id: str, codigo: str) -> RubroGasto | None:
    result = await db.execute(
        select(RubroGasto).where(
            RubroGasto.tenant_id == tenant_id,
            RubroGasto.codigo == codigo,
        )
    )
    return result.scalar_one_or_none()


async def buscar(db: AsyncSession, tenant_id: str, filtro: str) -> list[RubroGasto]:
    stmt = select(RubroGasto).where(
        and_(
            RubroGasto.tenant_id == tenant_id,
            RubroGasto.es_hoja == 1,
            (RubroGasto.codigo.ilike(f"%{filtro}%") | RubroGasto.cuenta.ilike(f"%{filtro}%")),
        )
    ).order_by(RubroGasto.codigo)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def saldo_disponible(db: AsyncSession, tenant_id: str, codigo_rubro: str) -> float:
    rubro = await get_rubro(db, tenant_id, codigo_rubro)
    if not rubro:
        return 0
    stmt = select(func.coalesce(func.sum(CDP.valor), 0)).where(
        and_(
            CDP.tenant_id == tenant_id,
            CDP.codigo_rubro == codigo_rubro,
            CDP.estado != "ANULADO",
        )
    )
    result = await db.execute(stmt)
    total_cdps = result.scalar()
    return rubro.apropiacion_definitiva - total_cdps


# Alias usado en cdp.py
async def saldo_disponible_rubro(db: AsyncSession, tenant_id: str, codigo_rubro: str) -> float:
    return await saldo_disponible(db, tenant_id, codigo_rubro)


async def crear(db: AsyncSession, tenant_id: str, codigo: str, cuenta: str,
                apropiacion_definitiva: float = 0, apropiacion_inicial: float = 0) -> RubroGasto:
    existing = await get_rubro(db, tenant_id, codigo)
    if existing:
        raise ValueError(f"El rubro {codigo} ya existe")

    rubro = RubroGasto(
        tenant_id=tenant_id,
        codigo=codigo,
        cuenta=cuenta,
        es_hoja=1,
        apropiacion_inicial=apropiacion_inicial if apropiacion_inicial > 0 else apropiacion_definitiva,
        apropiacion_definitiva=apropiacion_definitiva,
    )
    db.add(rubro)

    # Mark parent as non-leaf
    parts = codigo.rsplit(".", 1)
    if len(parts) > 1:
        parent_code = parts[0]
        parent = await get_rubro(db, tenant_id, parent_code)
        if parent:
            parent.es_hoja = 0

    await db.commit()
    await _recalcular_hojas(db, tenant_id)
    return rubro


async def editar(db: AsyncSession, tenant_id: str, codigo: str, cuenta: str | None = None,
                 apropiacion_definitiva: float | None = None,
                 apropiacion_inicial: float | None = None) -> RubroGasto:
    rubro = await get_rubro(db, tenant_id, codigo)
    if not rubro:
        raise ValueError(f"Rubro {codigo} no encontrado")

    if cuenta is not None:
        rubro.cuenta = cuenta

    if apropiacion_definitiva is not None:
        rubro.apropiacion_definitiva = apropiacion_definitiva
        no_mods = (rubro.adiciones == 0 and rubro.reducciones == 0
                   and rubro.creditos == 0 and rubro.contracreditos == 0)
        if no_mods:
            rubro.apropiacion_inicial = apropiacion_definitiva

    if apropiacion_inicial is not None and apropiacion_definitiva is None:
        rubro.apropiacion_inicial = apropiacion_inicial
        rubro.apropiacion_definitiva = (
            apropiacion_inicial + rubro.adiciones - rubro.reducciones
            + rubro.creditos - rubro.contracreditos
        )

    await db.commit()
    await db.refresh(rubro)
    return rubro


async def eliminar(db: AsyncSession, tenant_id: str, codigo: str):
    rubro = await get_rubro(db, tenant_id, codigo)
    if not rubro:
        raise ValueError(f"Rubro {codigo} no encontrado")

    # Check for CDPs
    stmt = select(func.count()).select_from(CDP).where(
        CDP.tenant_id == tenant_id,
        CDP.codigo_rubro == codigo,
    )
    result = await db.execute(stmt)
    if result.scalar() > 0:
        raise ValueError("No se puede eliminar: tiene CDPs registrados")

    # Check for children
    stmt = select(func.count()).select_from(RubroGasto).where(
        RubroGasto.tenant_id == tenant_id,
        RubroGasto.codigo.like(f"{codigo}.%"),
    )
    result = await db.execute(stmt)
    if result.scalar() > 0:
        raise ValueError("No se puede eliminar: tiene sub-rubros")

    await db.delete(rubro)
    await db.commit()
    await _recalcular_hojas(db, tenant_id)


async def _recalcular_hojas(db: AsyncSession, tenant_id: str):
    all_rubros = await get_rubros(db, tenant_id)
    codigos = {r.codigo for r in all_rubros}
    for rubro in all_rubros:
        has_children = any(c.startswith(rubro.codigo + ".") for c in codigos if c != rubro.codigo)
        new_val = 0 if has_children else 1
        if rubro.es_hoja != new_val:
            rubro.es_hoja = new_val
    await db.commit()


async def sincronizar_padres(db: AsyncSession, tenant_id: str):
    all_rubros = await get_rubros(db, tenant_id)
    hojas = [r for r in all_rubros if r.es_hoja == 1]
    padres = [r for r in all_rubros if r.es_hoja == 0]

    for padre in padres:
        hijos = [h for h in hojas if h.codigo.startswith(padre.codigo + ".")]
        if hijos:
            padre.apropiacion_inicial = sum(h.apropiacion_inicial for h in hijos)
            padre.adiciones = sum(h.adiciones for h in hijos)
            padre.reducciones = sum(h.reducciones for h in hijos)
            padre.creditos = sum(h.creditos for h in hijos)
            padre.contracreditos = sum(h.contracreditos for h in hijos)
            padre.apropiacion_definitiva = sum(h.apropiacion_definitiva for h in hijos)
    await db.commit()
