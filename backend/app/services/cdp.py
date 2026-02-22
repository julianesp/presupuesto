from datetime import date
from decimal import Decimal

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cdp import CDP
from app.models.rp import RP
from app.services import rubros_gastos as rubros_svc
from app.services import config as config_svc
from app.services.conceptos import guardar_concepto


# ---------------------------------------------------------------------------
# Saldo de un CDP = valor - SUM(RPs activos vinculados)
# ---------------------------------------------------------------------------

async def saldo_cdp(db: AsyncSession, tenant_id: str, numero_cdp: int) -> Decimal:
    cdp = await get_cdp(db, tenant_id, numero_cdp)
    if cdp is None:
        raise ValueError(f"CDP {numero_cdp} no encontrado")

    stmt = select(func.sum(RP.valor)).where(
        and_(
            RP.tenant_id == tenant_id,
            RP.cdp_numero == numero_cdp,
            RP.estado != "ANULADO",
        )
    )
    result = await db.execute(stmt)
    total_rps = result.scalar() or Decimal(0)
    return Decimal(str(cdp.valor)) - Decimal(str(total_rps))


# ---------------------------------------------------------------------------
# Registrar nuevo CDP
# ---------------------------------------------------------------------------

async def registrar(
    db: AsyncSession,
    tenant_id: str,
    codigo_rubro: str,
    objeto: str,
    valor: float,
    fuente_sifse: int = 0,
    item_sifse: int = 0,
) -> CDP:
    if valor <= 0:
        raise ValueError("El valor del CDP debe ser mayor a cero")

    saldo_rubro = await rubros_svc.saldo_disponible_rubro(db, tenant_id, codigo_rubro)
    if Decimal(str(valor)) > Decimal(str(saldo_rubro)):
        raise ValueError(
            f"El valor ({valor:,.2f}) supera el saldo disponible del rubro ({saldo_rubro:,.2f})"
        )

    numero = await config_svc.siguiente_consecutivo(db, tenant_id, "CDP")

    nuevo_cdp = CDP(
        tenant_id=tenant_id,
        numero=numero,
        fecha=date.today().isoformat(),
        codigo_rubro=codigo_rubro,
        objeto=objeto,
        valor=valor,
        fuente_sifse=fuente_sifse,
        item_sifse=item_sifse,
        estado="ACTIVO",
    )
    db.add(nuevo_cdp)
    await db.flush()

    await guardar_concepto(db, tenant_id, codigo_rubro, objeto)

    return nuevo_cdp


# ---------------------------------------------------------------------------
# Consultar CDPs
# ---------------------------------------------------------------------------

async def get_cdps(db: AsyncSession, tenant_id: str, estado: str | None = None) -> list[CDP]:
    stmt = select(CDP).where(CDP.tenant_id == tenant_id).order_by(CDP.numero.desc())
    if estado is not None:
        stmt = stmt.where(CDP.estado == estado)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_cdp(db: AsyncSession, tenant_id: str, numero: int) -> CDP | None:
    stmt = select(CDP).where(CDP.tenant_id == tenant_id, CDP.numero == numero)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_cdps_por_rubro(db: AsyncSession, tenant_id: str, codigo_rubro: str) -> list[CDP]:
    stmt = (
        select(CDP)
        .where(
            and_(
                CDP.tenant_id == tenant_id,
                CDP.codigo_rubro == codigo_rubro,
                CDP.estado != "ANULADO",
            )
        )
        .order_by(CDP.numero.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Anular CDP
# ---------------------------------------------------------------------------

async def anular(db: AsyncSession, tenant_id: str, numero: int) -> CDP:
    cdp = await get_cdp(db, tenant_id, numero)
    if cdp is None:
        raise ValueError(f"CDP {numero} no encontrado")

    # Verificar que no tenga RPs activos
    stmt = select(func.count()).select_from(RP).where(
        and_(
            RP.tenant_id == tenant_id,
            RP.cdp_numero == numero,
            RP.estado != "ANULADO",
        )
    )
    result = await db.execute(stmt)
    rps_activos = result.scalar() or 0

    if rps_activos > 0:
        raise ValueError(
            f"No se puede anular el CDP {numero}: tiene {rps_activos} RP(s) activo(s)"
        )

    cdp.estado = "ANULADO"
    await db.flush()
    return cdp


# ---------------------------------------------------------------------------
# Actualizar estado segun saldo
# ---------------------------------------------------------------------------

async def actualizar_estado(db: AsyncSession, tenant_id: str, numero: int) -> CDP:
    cdp = await get_cdp(db, tenant_id, numero)
    if cdp is None:
        raise ValueError(f"CDP {numero} no encontrado")

    if cdp.estado == "ANULADO":
        return cdp

    saldo = await saldo_cdp(db, tenant_id, numero)

    if saldo <= 0 and cdp.estado != "AGOTADO":
        cdp.estado = "AGOTADO"
        await db.flush()
    elif saldo > 0 and cdp.estado == "AGOTADO":
        cdp.estado = "ACTIVO"
        await db.flush()

    return cdp


# ---------------------------------------------------------------------------
# Editar CDP
# ---------------------------------------------------------------------------

async def editar(
    db: AsyncSession,
    tenant_id: str,
    numero: int,
    nuevo_valor: float | None = None,
    objeto: str | None = None,
    fuente_sifse: int | None = None,
    item_sifse: int | None = None,
) -> CDP:
    cdp = await get_cdp(db, tenant_id, numero)
    if cdp is None:
        raise ValueError(f"CDP {numero} no encontrado")

    if nuevo_valor is not None:
        if nuevo_valor <= 0:
            raise ValueError("El valor del CDP debe ser mayor a cero")

        # Valor ya comprometido en RPs activos
        stmt = select(func.sum(RP.valor)).where(
            and_(
                RP.tenant_id == tenant_id,
                RP.cdp_numero == numero,
                RP.estado != "ANULADO",
            )
        )
        result = await db.execute(stmt)
        usado_en_rps = Decimal(str(result.scalar() or 0))

        if Decimal(str(nuevo_valor)) < usado_en_rps:
            raise ValueError(
                f"El nuevo valor ({nuevo_valor:,.2f}) es menor que lo comprometido "
                f"en RPs ({usado_en_rps:,.2f})"
            )

        # Verificar disponibilidad en el rubro (devolvemos el valor actual y
        # tomamos solo lo adicional)
        diferencia = Decimal(str(nuevo_valor)) - Decimal(str(cdp.valor))
        if diferencia > 0:
            saldo_rubro = await rubros_svc.saldo_disponible_rubro(db, tenant_id, cdp.codigo_rubro)
            if diferencia > Decimal(str(saldo_rubro)):
                raise ValueError(
                    f"El incremento ({diferencia:,.2f}) supera el saldo disponible "
                    f"del rubro ({saldo_rubro:,.2f})"
                )

        cdp.valor = nuevo_valor

    if objeto is not None:
        cdp.objeto = objeto

    if fuente_sifse is not None:
        cdp.fuente_sifse = fuente_sifse

    if item_sifse is not None:
        cdp.item_sifse = item_sifse

    await db.flush()

    if nuevo_valor is not None:
        await actualizar_estado(db, tenant_id, numero)

    return cdp
