from datetime import date

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.recaudo import Recaudo
from app.services import rubros_ingresos as rubros_svc
from app.services import config as config_svc


async def registrar(
    db: AsyncSession,
    tenant_id: str,
    codigo_rubro: str,
    valor: float,
    concepto: str,
    no_comprobante: str,
    cuenta_bancaria_id: int = 0,
) -> Recaudo:
    if valor <= 0:
        raise ValueError("El valor del recaudo debe ser mayor a cero")

    rubro = await rubros_svc.get_rubro(db, tenant_id, codigo_rubro)
    if rubro is None:
        raise ValueError(f"Rubro de ingreso {codigo_rubro} no encontrado")

    numero = await config_svc.get_consecutivo(db, tenant_id, "recaudo")

    nuevo = Recaudo(
        tenant_id=tenant_id,
        numero=numero,
        fecha=date.today().isoformat(),
        codigo_rubro=codigo_rubro,
        valor=valor,
        concepto=concepto,
        no_comprobante=no_comprobante,
        estado="ACTIVO",
        cuenta_bancaria_id=cuenta_bancaria_id,
    )
    db.add(nuevo)
    await db.flush()
    return nuevo


async def get_recaudos(
    db: AsyncSession, tenant_id: str, estado: str | None = None
) -> list[Recaudo]:
    stmt = select(Recaudo).where(Recaudo.tenant_id == tenant_id).order_by(Recaudo.numero.desc())
    if estado is not None:
        stmt = stmt.where(Recaudo.estado == estado)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_recaudo(db: AsyncSession, tenant_id: str, numero: int) -> Recaudo | None:
    stmt = select(Recaudo).where(Recaudo.tenant_id == tenant_id, Recaudo.numero == numero)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def anular(db: AsyncSession, tenant_id: str, numero: int) -> Recaudo:
    recaudo = await get_recaudo(db, tenant_id, numero)
    if recaudo is None:
        raise ValueError(f"Recaudo {numero} no encontrado")
    recaudo.estado = "ANULADO"
    await db.flush()
    return recaudo


async def editar(
    db: AsyncSession,
    tenant_id: str,
    numero: int,
    nuevo_valor: float | None = None,
    concepto: str | None = None,
    no_comprobante: str | None = None,
    cuenta_bancaria_id: int | None = None,
) -> Recaudo:
    recaudo = await get_recaudo(db, tenant_id, numero)
    if recaudo is None:
        raise ValueError(f"Recaudo {numero} no encontrado")
    if recaudo.estado == "ANULADO":
        raise ValueError(f"No se puede editar el recaudo {numero}: esta ANULADO")

    if nuevo_valor is not None:
        if nuevo_valor <= 0:
            raise ValueError("El valor del recaudo debe ser mayor a cero")
        recaudo.valor = nuevo_valor
    if concepto is not None:
        recaudo.concepto = concepto
    if no_comprobante is not None:
        recaudo.no_comprobante = no_comprobante
    if cuenta_bancaria_id is not None:
        recaudo.cuenta_bancaria_id = cuenta_bancaria_id

    await db.flush()
    return recaudo


async def get_recaudos_por_rubro(
    db: AsyncSession, tenant_id: str, codigo_rubro: str
) -> list[Recaudo]:
    stmt = (
        select(Recaudo)
        .where(and_(Recaudo.tenant_id == tenant_id, Recaudo.codigo_rubro == codigo_rubro, Recaudo.estado != "ANULADO"))
        .order_by(Recaudo.numero.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
