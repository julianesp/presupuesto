from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.terceros import Tercero


async def get_terceros(db: AsyncSession) -> list[Tercero]:
    result = await db.execute(select(Tercero).order_by(Tercero.nombre))
    return list(result.scalars().all())


async def get_tercero(db: AsyncSession, nit: str) -> Tercero | None:
    result = await db.execute(select(Tercero).where(Tercero.nit == nit))
    return result.scalar_one_or_none()


async def buscar(db: AsyncSession, filtro: str) -> list[Tercero]:
    stmt = select(Tercero).where(
        or_(Tercero.nit.ilike(f"%{filtro}%"), Tercero.nombre.ilike(f"%{filtro}%"))
    ).order_by(Tercero.nombre)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def guardar(db: AsyncSession, nit: str, dv: str, nombre: str,
                  direccion: str = "", telefono: str = "", email: str = "",
                  tipo: str = "Natural", banco: str = "", tipo_cuenta: str = "",
                  no_cuenta: str = "") -> Tercero:
    existing = await get_tercero(db, nit)
    if existing:
        existing.dv = dv
        existing.nombre = nombre.upper()
        existing.direccion = direccion
        existing.telefono = telefono
        existing.email = email
        existing.tipo = tipo
        existing.banco = banco
        existing.tipo_cuenta = tipo_cuenta
        existing.no_cuenta = no_cuenta
        await db.commit()
        return existing

    tercero = Tercero(
        nit=nit, dv=dv, nombre=nombre.upper(),
        direccion=direccion, telefono=telefono, email=email,
        tipo=tipo, banco=banco, tipo_cuenta=tipo_cuenta, no_cuenta=no_cuenta,
    )
    db.add(tercero)
    await db.commit()
    return tercero
