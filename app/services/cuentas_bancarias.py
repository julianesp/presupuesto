from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.cuentas_bancarias import CuentaBancaria


async def crear(db: AsyncSession, banco: str, tipo_cuenta: str,
                numero_cuenta: str, denominacion: str = "") -> CuentaBancaria:
    cuenta = CuentaBancaria(
        banco=banco, tipo_cuenta=tipo_cuenta,
        numero_cuenta=numero_cuenta, denominacion=denominacion,
        estado="ACTIVA",
    )
    db.add(cuenta)
    await db.commit()
    await db.refresh(cuenta)
    return cuenta


async def listar(db: AsyncSession, solo_activas: bool = True) -> list[CuentaBancaria]:
    stmt = select(CuentaBancaria)
    if solo_activas:
        stmt = stmt.where(CuentaBancaria.estado == "ACTIVA")
    stmt = stmt.order_by(CuentaBancaria.id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_cuenta(db: AsyncSession, id: int) -> CuentaBancaria | None:
    result = await db.execute(select(CuentaBancaria).where(CuentaBancaria.id == id))
    return result.scalar_one_or_none()


async def editar(db: AsyncSession, id: int, banco: str, tipo_cuenta: str,
                 numero_cuenta: str, denominacion: str) -> CuentaBancaria:
    cuenta = await get_cuenta(db, id)
    if not cuenta:
        raise ValueError(f"Cuenta bancaria {id} no encontrada")
    cuenta.banco = banco
    cuenta.tipo_cuenta = tipo_cuenta
    cuenta.numero_cuenta = numero_cuenta
    cuenta.denominacion = denominacion
    await db.commit()
    await db.refresh(cuenta)
    return cuenta


async def desactivar(db: AsyncSession, id: int):
    cuenta = await get_cuenta(db, id)
    if not cuenta:
        raise ValueError(f"Cuenta bancaria {id} no encontrada")
    cuenta.estado = "INACTIVA"
    await db.commit()
