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


# ---------------------------------------------------------------------------
# Saldo de un RP = valor - SUM(obligaciones activas vinculadas)
# ---------------------------------------------------------------------------

async def saldo_rp(db: AsyncSession, numero_rp: int) -> Decimal:
    rp = await get_rp(db, numero_rp)
    if rp is None:
        raise ValueError(f"RP {numero_rp} no encontrado")

    stmt = select(func.sum(Obligacion.valor)).where(
        and_(Obligacion.rp_numero == numero_rp, Obligacion.estado != "ANULADA")
    )
    result = await db.execute(stmt)
    total_obligaciones = result.scalar() or Decimal(0)
    return Decimal(str(rp.valor)) - Decimal(str(total_obligaciones))


# ---------------------------------------------------------------------------
# Registrar nuevo RP
# ---------------------------------------------------------------------------

async def registrar(
    db: AsyncSession,
    cdp_numero: int,
    nit_tercero: str,
    valor: float,
    objeto: str,
) -> RP:
    # Validar CDP
    cdp = await cdp_svc.get_cdp(db, cdp_numero)
    if cdp is None:
        raise ValueError(f"CDP {cdp_numero} no encontrado")
    if cdp.estado == "ANULADO":
        raise ValueError(f"El CDP {cdp_numero} esta anulado")

    # Validar tercero
    stmt = select(Tercero).where(Tercero.nit == nit_tercero)
    result = await db.execute(stmt)
    tercero = result.scalar_one_or_none()
    if tercero is None:
        raise ValueError(f"Tercero con NIT {nit_tercero} no encontrado")

    # Validar valor
    if valor <= 0:
        raise ValueError("El valor del RP debe ser mayor a cero")

    saldo = await cdp_svc.saldo_cdp(db, cdp_numero)
    if Decimal(str(valor)) > saldo:
        raise ValueError(
            f"El valor ({valor:,.2f}) supera el saldo del CDP ({saldo:,.2f})"
        )

    numero = await config_svc.siguiente_consecutivo(db, "RP")

    nuevo_rp = RP(
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

    # Actualizar estado del CDP (puede pasar a AGOTADO)
    await cdp_svc.actualizar_estado(db, cdp_numero)

    return nuevo_rp


# ---------------------------------------------------------------------------
# Consultar RPs
# ---------------------------------------------------------------------------

async def get_rps(db: AsyncSession, estado: str | None = None) -> list[RP]:
    stmt = select(RP).order_by(RP.numero.desc())
    if estado is not None:
        stmt = stmt.where(RP.estado == estado)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_rp(db: AsyncSession, numero: int) -> RP | None:
    stmt = select(RP).where(RP.numero == numero)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_rps_por_rubro(db: AsyncSession, codigo_rubro: str) -> list[RP]:
    stmt = (
        select(RP)
        .where(and_(RP.codigo_rubro == codigo_rubro, RP.estado != "ANULADO"))
        .order_by(RP.numero.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Anular RP
# ---------------------------------------------------------------------------

async def anular(db: AsyncSession, numero: int) -> RP:
    rp = await get_rp(db, numero)
    if rp is None:
        raise ValueError(f"RP {numero} no encontrado")

    # Verificar que no tenga obligaciones activas
    stmt = select(func.count()).select_from(Obligacion).where(
        and_(Obligacion.rp_numero == numero, Obligacion.estado != "ANULADA")
    )
    result = await db.execute(stmt)
    obligaciones_activas = result.scalar() or 0

    if obligaciones_activas > 0:
        raise ValueError(
            f"No se puede anular el RP {numero}: tiene {obligaciones_activas} "
            f"obligacion(es) activa(s)"
        )

    rp.estado = "ANULADO"
    await db.flush()

    # Reactivar CDP si corresponde
    await cdp_svc.actualizar_estado(db, rp.cdp_numero)

    return rp


# ---------------------------------------------------------------------------
# Actualizar estado segun saldo
# ---------------------------------------------------------------------------

async def actualizar_estado(db: AsyncSession, numero: int) -> RP:
    rp = await get_rp(db, numero)
    if rp is None:
        raise ValueError(f"RP {numero} no encontrado")

    if rp.estado == "ANULADO":
        return rp

    saldo = await saldo_rp(db, numero)

    if saldo <= 0 and rp.estado != "AGOTADO":
        rp.estado = "AGOTADO"
        await db.flush()
    elif saldo > 0 and rp.estado == "AGOTADO":
        rp.estado = "ACTIVO"
        await db.flush()

    return rp


# ---------------------------------------------------------------------------
# Editar RP
# ---------------------------------------------------------------------------

async def editar(
    db: AsyncSession,
    numero: int,
    nuevo_valor: float | None = None,
    objeto: str | None = None,
    fuente_sifse: int | None = None,
    item_sifse: int | None = None,
) -> RP:
    rp = await get_rp(db, numero)
    if rp is None:
        raise ValueError(f"RP {numero} no encontrado")

    if nuevo_valor is not None:
        if nuevo_valor <= 0:
            raise ValueError("El valor del RP debe ser mayor a cero")

        # Valor ya comprometido en obligaciones activas
        stmt = select(func.sum(Obligacion.valor)).where(
            and_(Obligacion.rp_numero == numero, Obligacion.estado != "ANULADA")
        )
        result = await db.execute(stmt)
        usado_en_obligaciones = Decimal(str(result.scalar() or 0))

        if Decimal(str(nuevo_valor)) < usado_en_obligaciones:
            raise ValueError(
                f"El nuevo valor ({nuevo_valor:,.2f}) es menor que lo comprometido "
                f"en obligaciones ({usado_en_obligaciones:,.2f})"
            )

        # Verificar disponibilidad en el CDP
        diferencia = Decimal(str(nuevo_valor)) - Decimal(str(rp.valor))
        if diferencia > 0:
            saldo = await cdp_svc.saldo_cdp(db, rp.cdp_numero)
            if diferencia > saldo:
                raise ValueError(
                    f"El incremento ({diferencia:,.2f}) supera el saldo del "
                    f"CDP ({saldo:,.2f})"
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
        await actualizar_estado(db, numero)
        # Tambien actualizar el estado del CDP padre
        await cdp_svc.actualizar_estado(db, rp.cdp_numero)

    return rp
