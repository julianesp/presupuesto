from datetime import date

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conceptos import Concepto


async def guardar_concepto(db: AsyncSession, tenant_id: str, codigo_rubro: str, concepto: str):
    if not concepto or not concepto.strip():
        return
    stmt = select(Concepto).where(
        and_(
            Concepto.tenant_id == tenant_id,
            Concepto.codigo_rubro == codigo_rubro,
            Concepto.concepto == concepto,
        )
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        existing.veces_usado += 1
        existing.ultimo_uso = date.today().isoformat()
    else:
        db.add(Concepto(
            tenant_id=tenant_id,
            codigo_rubro=codigo_rubro,
            concepto=concepto,
            veces_usado=1,
            ultimo_uso=date.today().isoformat(),
        ))
    await db.flush()


async def get_conceptos(db: AsyncSession, tenant_id: str, codigo_rubro: str) -> list[Concepto]:
    stmt = select(Concepto).where(
        Concepto.tenant_id == tenant_id,
        Concepto.codigo_rubro == codigo_rubro,
    ).order_by(Concepto.veces_usado.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())
