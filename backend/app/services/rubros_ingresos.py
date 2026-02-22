from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rubros import RubroIngreso
from app.models.recaudo import Recaudo


async def get_rubros(db: AsyncSession, tenant_id: str, solo_hojas: bool = False) -> list[RubroIngreso]:
    stmt = select(RubroIngreso).where(RubroIngreso.tenant_id == tenant_id)
    if solo_hojas:
        stmt = stmt.where(RubroIngreso.es_hoja == 1)
    stmt = stmt.order_by(RubroIngreso.codigo)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_rubro(db: AsyncSession, tenant_id: str, codigo: str) -> RubroIngreso | None:
    result = await db.execute(
        select(RubroIngreso).where(
            RubroIngreso.tenant_id == tenant_id,
            RubroIngreso.codigo == codigo,
        )
    )
    return result.scalar_one_or_none()


async def buscar(db: AsyncSession, tenant_id: str, filtro: str) -> list[RubroIngreso]:
    stmt = select(RubroIngreso).where(
        and_(
            RubroIngreso.tenant_id == tenant_id,
            RubroIngreso.es_hoja == 1,
            (RubroIngreso.codigo.ilike(f"%{filtro}%") | RubroIngreso.cuenta.ilike(f"%{filtro}%")),
        )
    ).order_by(RubroIngreso.codigo)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def saldo_por_recaudar(db: AsyncSession, tenant_id: str, codigo_rubro: str) -> float:
    rubro = await get_rubro(db, tenant_id, codigo_rubro)
    if not rubro:
        return 0
    stmt = select(func.coalesce(func.sum(Recaudo.valor), 0)).where(
        and_(
            Recaudo.tenant_id == tenant_id,
            Recaudo.codigo_rubro == codigo_rubro,
            Recaudo.estado != "ANULADO",
        )
    )
    result = await db.execute(stmt)
    total_recaudos = result.scalar()
    return rubro.presupuesto_definitivo - total_recaudos


async def crear(db: AsyncSession, tenant_id: str, codigo: str, cuenta: str,
                presupuesto_definitivo: float = 0, presupuesto_inicial: float = 0) -> RubroIngreso:
    existing = await get_rubro(db, tenant_id, codigo)
    if existing:
        raise ValueError(f"El rubro {codigo} ya existe")

    rubro = RubroIngreso(
        tenant_id=tenant_id,
        codigo=codigo,
        cuenta=cuenta,
        es_hoja=1,
        presupuesto_inicial=presupuesto_inicial if presupuesto_inicial > 0 else presupuesto_definitivo,
        presupuesto_definitivo=presupuesto_definitivo,
    )
    db.add(rubro)

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
                 presupuesto_definitivo: float | None = None,
                 presupuesto_inicial: float | None = None) -> RubroIngreso:
    rubro = await get_rubro(db, tenant_id, codigo)
    if not rubro:
        raise ValueError(f"Rubro {codigo} no encontrado")

    if cuenta is not None:
        rubro.cuenta = cuenta

    if presupuesto_definitivo is not None:
        rubro.presupuesto_definitivo = presupuesto_definitivo
        if rubro.adiciones == 0 and rubro.reducciones == 0:
            rubro.presupuesto_inicial = presupuesto_definitivo

    if presupuesto_inicial is not None and presupuesto_definitivo is None:
        rubro.presupuesto_inicial = presupuesto_inicial
        rubro.presupuesto_definitivo = presupuesto_inicial + rubro.adiciones - rubro.reducciones

    await db.commit()
    await db.refresh(rubro)
    return rubro


async def eliminar(db: AsyncSession, tenant_id: str, codigo: str):
    rubro = await get_rubro(db, tenant_id, codigo)
    if not rubro:
        raise ValueError(f"Rubro {codigo} no encontrado")

    stmt = select(func.count()).select_from(Recaudo).where(
        Recaudo.tenant_id == tenant_id,
        Recaudo.codigo_rubro == codigo,
    )
    result = await db.execute(stmt)
    if result.scalar() > 0:
        raise ValueError("No se puede eliminar: tiene recaudos registrados")

    stmt = select(func.count()).select_from(RubroIngreso).where(
        RubroIngreso.tenant_id == tenant_id,
        RubroIngreso.codigo.like(f"{codigo}.%"),
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
            padre.presupuesto_inicial = sum(h.presupuesto_inicial for h in hijos)
            padre.adiciones = sum(h.adiciones for h in hijos)
            padre.reducciones = sum(h.reducciones for h in hijos)
            padre.presupuesto_definitivo = sum(h.presupuesto_definitivo for h in hijos)
    await db.commit()
