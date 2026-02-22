from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.config import Config


async def get_config(db: AsyncSession, tenant_id: str, clave: str) -> str | None:
    result = await db.execute(
        select(Config).where(Config.tenant_id == tenant_id, Config.clave == clave)
    )
    row = result.scalar_one_or_none()
    return row.valor if row else None


async def set_config(db: AsyncSession, tenant_id: str, clave: str, valor: str):
    result = await db.execute(
        select(Config).where(Config.tenant_id == tenant_id, Config.clave == clave)
    )
    row = result.scalar_one_or_none()
    if row:
        row.valor = valor
    else:
        db.add(Config(tenant_id=tenant_id, clave=clave, valor=valor))
    await db.commit()


async def get_consecutivo(db: AsyncSession, tenant_id: str, tipo: str) -> int:
    clave = f"consecutivo_{tipo}"
    result = await db.execute(
        select(Config).where(Config.tenant_id == tenant_id, Config.clave == clave)
    )
    row = result.scalar_one_or_none()
    if row:
        actual = int(row.valor or "0")
        nuevo = actual + 1
        row.valor = str(nuevo)
        await db.commit()
        return nuevo
    db.add(Config(tenant_id=tenant_id, clave=clave, valor="1"))
    await db.commit()
    return 1


# Alias usado en varios servicios con nombre distinto
async def siguiente_consecutivo(db: AsyncSession, tenant_id: str, tipo: str) -> int:
    return await get_consecutivo(db, tenant_id, tipo)


# Alias usado en obligacion y pago
async def get_next_consecutivo(db: AsyncSession, tenant_id: str, tipo: str) -> int:
    return await get_consecutivo(db, tenant_id, tipo)


async def get_all_config(db: AsyncSession, tenant_id: str) -> dict:
    result = await db.execute(
        select(Config).where(Config.tenant_id == tenant_id)
    )
    rows = result.scalars().all()
    return {r.clave: r.valor for r in rows}


async def apertura_vigencia(db: AsyncSession, tenant_id: str, nuevo_anio: int) -> dict:
    """Abre nueva vigencia: actualiza el año y resetea todos los consecutivos a 0."""
    await set_config(db, tenant_id, "vigencia", str(nuevo_anio))
    await set_config(db, tenant_id, "mes_actual", "1")

    consecutivos = ["cdp", "rp", "obligacion", "pago", "recaudo", "reconocimiento", "modificacion"]
    for key in consecutivos:
        clave = f"consecutivo_{key}"
        result = await db.execute(
            select(Config).where(Config.tenant_id == tenant_id, Config.clave == clave)
        )
        row = result.scalar_one_or_none()
        if row:
            row.valor = "0"
        else:
            db.add(Config(tenant_id=tenant_id, clave=clave, valor="0"))
    await db.commit()

    return {"anio": nuevo_anio, "consecutivos_reseteados": consecutivos}


async def init_config_defaults(db: AsyncSession, tenant_id: str):
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
        result = await db.execute(
            select(Config).where(Config.tenant_id == tenant_id, Config.clave == clave)
        )
        if not result.scalar_one_or_none():
            db.add(Config(tenant_id=tenant_id, clave=clave, valor=valor))
    await db.commit()
