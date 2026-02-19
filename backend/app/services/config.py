from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.config import Config


async def get_config(db: AsyncSession, clave: str) -> str | None:
    result = await db.execute(select(Config).where(Config.clave == clave))
    row = result.scalar_one_or_none()
    return row.valor if row else None


async def set_config(db: AsyncSession, clave: str, valor: str):
    result = await db.execute(select(Config).where(Config.clave == clave))
    row = result.scalar_one_or_none()
    if row:
        row.valor = valor
    else:
        db.add(Config(clave=clave, valor=valor))
    await db.commit()


async def get_consecutivo(db: AsyncSession, tipo: str) -> int:
    clave = f"consecutivo_{tipo}"
    result = await db.execute(select(Config).where(Config.clave == clave))
    row = result.scalar_one_or_none()
    if row:
        actual = int(row.valor or "0")
        nuevo = actual + 1
        row.valor = str(nuevo)
        await db.commit()
        return nuevo
    db.add(Config(clave=clave, valor="1"))
    await db.commit()
    return 1


async def get_all_config(db: AsyncSession) -> dict:
    result = await db.execute(select(Config))
    rows = result.scalars().all()
    return {r.clave: r.valor for r in rows}


async def init_config_defaults(db: AsyncSession):
    defaults = {
        "vigencia": "2026",
        "institucion": "",
        "nit_institucion": "",
        "rector": "",
        "tesorero": "",
        "mes_actual": "1",
        "codigo_dane": "",
        "consecutivo_cdp": "0",
        "consecutivo_rp": "0",
        "consecutivo_obligacion": "0",
        "consecutivo_pago": "0",
        "consecutivo_recaudo": "0",
        "consecutivo_modificacion": "0",
    }
    for clave, valor in defaults.items():
        result = await db.execute(select(Config).where(Config.clave == clave))
        if not result.scalar_one_or_none():
            db.add(Config(clave=clave, valor=valor))
    await db.commit()
