from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reconocimiento import Reconocimiento
from app.services import rubros_ingresos as rubros_svc
from app.services import config as config_svc


async def get_reconocimientos(
    db: AsyncSession, tenant_id: str, estado: str | None = None
) -> list[Reconocimiento]:
    stmt = select(Reconocimiento).where(Reconocimiento.tenant_id == tenant_id).order_by(Reconocimiento.numero.desc())
    if estado is not None:
        stmt = stmt.where(Reconocimiento.estado == estado)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_reconocimiento(db: AsyncSession, tenant_id: str, numero: int) -> Reconocimiento | None:
    result = await db.execute(
        select(Reconocimiento).where(Reconocimiento.tenant_id == tenant_id, Reconocimiento.numero == numero)
    )
    return result.scalar_one_or_none()


async def registrar(
    db: AsyncSession,
    tenant_id: str,
    data,
) -> Reconocimiento:
    if data.valor <= 0:
        raise ValueError("El valor debe ser mayor a cero")

    rubro = await rubros_svc.get_rubro(db, tenant_id, data.codigo_rubro)
    if rubro is None:
        raise ValueError(f"Rubro de ingreso {data.codigo_rubro} no encontrado")

    numero = await config_svc.get_consecutivo(db, tenant_id, "reconocimiento")

    nuevo = Reconocimiento(
        tenant_id=tenant_id,
        numero=numero,
        fecha=date.today().isoformat(),
        codigo_rubro=data.codigo_rubro,
        tercero_nit=data.tercero_nit or "",
        valor=data.valor,
        concepto=data.concepto or "",
        no_documento=data.no_documento or "",
        estado="ACTIVO",
    )
    db.add(nuevo)
    await db.flush()
    return nuevo


async def editar(db: AsyncSession, tenant_id: str, numero: int, data) -> Reconocimiento:
    rec = await get_reconocimiento(db, tenant_id, numero)
    if rec is None:
        raise ValueError(f"Reconocimiento {numero} no encontrado")
    if rec.estado == "ANULADO":
        raise ValueError("No se puede editar un reconocimiento anulado")

    if data.valor is not None:
        rec.valor = data.valor
    if data.tercero_nit is not None:
        rec.tercero_nit = data.tercero_nit
    if data.concepto is not None:
        rec.concepto = data.concepto
    if data.no_documento is not None:
        rec.no_documento = data.no_documento

    await db.flush()
    return rec


async def anular(db: AsyncSession, tenant_id: str, numero: int) -> Reconocimiento:
    rec = await get_reconocimiento(db, tenant_id, numero)
    if rec is None:
        raise ValueError(f"Reconocimiento {numero} no encontrado")
    if rec.estado == "ANULADO":
        raise ValueError("El reconocimiento ya esta anulado")
    rec.estado = "ANULADO"
    await db.flush()
    return rec
