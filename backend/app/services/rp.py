from datetime import date
from decimal import Decimal

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rp import RP
from app.models.obligacion import Obligacion
from app.models.cdp import CDP
from app.models.terceros import Tercero
from app.services import cdp as cdp_svc
from app.services import config as config_svc


async def saldo_rp(db: AsyncSession, tenant_id: str, numero_rp: int) -> Decimal:
    rp = await get_rp(db, tenant_id, numero_rp)
    if rp is None:
        raise ValueError(f"RP {numero_rp} no encontrado")
    stmt = select(func.sum(Obligacion.valor)).where(
        and_(
            Obligacion.tenant_id == tenant_id,
            Obligacion.rp_numero == numero_rp,
            Obligacion.estado != "ANULADA",
        )
    )
    result = await db.execute(stmt)
    total_obligaciones = result.scalar() or Decimal(0)
    return Decimal(str(rp.valor)) - Decimal(str(total_obligaciones))


async def registrar(
    db: AsyncSession,
    tenant_id: str,
    cdp_numero: int,
    nit_tercero: str,
    valor: float,
    objeto: str,
) -> RP:
    cdp = await cdp_svc.get_cdp(db, tenant_id, cdp_numero)
    if cdp is None:
        raise ValueError(f"CDP {cdp_numero} no encontrado")
    if cdp.estado == "ANULADO":
        raise ValueError(f"El CDP {cdp_numero} esta anulado")

    stmt = select(Tercero).where(
        Tercero.tenant_id == tenant_id,
        Tercero.nit == nit_tercero,
    )
    result = await db.execute(stmt)
    tercero = result.scalar_one_or_none()
    if tercero is None:
        raise ValueError(f"Tercero con NIT {nit_tercero} no encontrado")

    if valor <= 0:
        raise ValueError("El valor del RP debe ser mayor a cero")

    saldo = await cdp_svc.saldo_cdp(db, tenant_id, cdp_numero)
    if Decimal(str(valor)) > saldo:
        raise ValueError(f"El valor ({valor:,.2f}) supera el saldo del CDP ({saldo:,.2f})")

    numero = await config_svc.siguiente_consecutivo(db, tenant_id, "RP")

    nuevo_rp = RP(
        tenant_id=tenant_id,
        numero=numero,
        fecha=date.today().isoformat(),
        cdp_numero=cdp_numero,
        codigo_rubro=cdp.codigo_rubro,
        nit_tercero=nit_tercero,
        objeto=objeto,
        valor=valor,
        fuente_sifse=cdp.fuente_sifse,
        item_sifse=getattr(cdp, "item_sifse", None),
        estado="ACTIVO",
    )
    db.add(nuevo_rp)
    await db.flush()
    await cdp_svc.actualizar_estado(db, tenant_id, cdp_numero)
    return nuevo_rp


async def get_rps(db: AsyncSession, tenant_id: str, estado: str | None = None) -> list[RP]:
    stmt = select(RP).where(RP.tenant_id == tenant_id).order_by(RP.numero.desc())
    if estado is not None:
        stmt = stmt.where(RP.estado == estado)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_rp(db: AsyncSession, tenant_id: str, numero: int) -> RP | None:
    stmt = select(RP).where(RP.tenant_id == tenant_id, RP.numero == numero)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_rps_por_rubro(db: AsyncSession, tenant_id: str, codigo_rubro: str) -> list[RP]:
    stmt = (
        select(RP)
        .where(and_(RP.tenant_id == tenant_id, RP.codigo_rubro == codigo_rubro, RP.estado != "ANULADO"))
        .order_by(RP.numero.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def anular(db: AsyncSession, tenant_id: str, numero: int) -> RP:
    rp = await get_rp(db, tenant_id, numero)
    if rp is None:
        raise ValueError(f"RP {numero} no encontrado")
    stmt = select(func.count()).select_from(Obligacion).where(
        and_(Obligacion.tenant_id == tenant_id, Obligacion.rp_numero == numero, Obligacion.estado != "ANULADA")
    )
    result = await db.execute(stmt)
    obligaciones_activas = result.scalar() or 0
    if obligaciones_activas > 0:
        raise ValueError(
            f"No se puede anular el RP {numero}: tiene {obligaciones_activas} obligacion(es) activa(s)"
        )
    rp.estado = "ANULADO"
    await db.flush()
    await cdp_svc.actualizar_estado(db, tenant_id, rp.cdp_numero)
    return rp


async def actualizar_estado(db: AsyncSession, tenant_id: str, numero: int) -> RP:
    rp = await get_rp(db, tenant_id, numero)
    if rp is None:
        raise ValueError(f"RP {numero} no encontrado")
    if rp.estado == "ANULADO":
        return rp
    saldo = await saldo_rp(db, tenant_id, numero)
    if saldo <= 0 and rp.estado != "AGOTADO":
        rp.estado = "AGOTADO"
        await db.flush()
    elif saldo > 0 and rp.estado == "AGOTADO":
        rp.estado = "ACTIVO"
        await db.flush()
    return rp


async def editar(
    db: AsyncSession,
    tenant_id: str,
    numero: int,
    nuevo_valor: float | None = None,
    objeto: str | None = None,
    fuente_sifse: int | None = None,
    item_sifse: int | None = None,
) -> RP:
    rp = await get_rp(db, tenant_id, numero)
    if rp is None:
        raise ValueError(f"RP {numero} no encontrado")

    if nuevo_valor is not None:
        if nuevo_valor <= 0:
            raise ValueError("El valor del RP debe ser mayor a cero")
        stmt = select(func.sum(Obligacion.valor)).where(
            and_(Obligacion.tenant_id == tenant_id, Obligacion.rp_numero == numero, Obligacion.estado != "ANULADA")
        )
        result = await db.execute(stmt)
        usado_en_obligaciones = Decimal(str(result.scalar() or 0))
        if Decimal(str(nuevo_valor)) < usado_en_obligaciones:
            raise ValueError(
                f"El nuevo valor ({nuevo_valor:,.2f}) es menor que lo comprometido "
                f"en obligaciones ({usado_en_obligaciones:,.2f})"
            )
        diferencia = Decimal(str(nuevo_valor)) - Decimal(str(rp.valor))
        if diferencia > 0:
            saldo = await cdp_svc.saldo_cdp(db, tenant_id, rp.cdp_numero)
            if diferencia > saldo:
                raise ValueError(
                    f"El incremento ({diferencia:,.2f}) supera el saldo del CDP ({saldo:,.2f})"
                )
        rp.valor = nuevo_valor

    if objeto is not None:
        rp.objeto = objeto
    if fuente_sifse is not None:
        rp.fuente_sifse = fuente_sifse
    if item_sifse is not None:
        rp.item_sifse = item_sifse

    await db.flush()

    if nuevo_valor is not None:
        await actualizar_estado(db, tenant_id, numero)
        await cdp_svc.actualizar_estado(db, tenant_id, rp.cdp_numero)

    return rp
