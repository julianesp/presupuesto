from datetime import date

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.config import Config
from app.models.rubros import RubroGasto, RubroIngreso
from app.models.terceros import Tercero
from app.models.cuentas_bancarias import CuentaBancaria
from app.models.cdp import CDP
from app.models.rp import RP
from app.models.obligacion import Obligacion
from app.models.pago import Pago
from app.models.recaudo import Recaudo
from app.models.reconocimiento import Reconocimiento
from app.models.modificaciones import ModificacionPresupuestal, DetalleModificacion
from app.models.pac import PAC
from app.models.sifse import MapeoSifseIngreso, MapeoSifseGasto

BACKUP_VERSION = "1.0"


def _row_to_dict(obj, exclude: set | None = None) -> dict:
    exclude = exclude or set()
    return {
        col.name: getattr(obj, col.name)
        for col in obj.__table__.columns
        if col.name not in exclude
    }


async def _fetch_all(db: AsyncSession, model, tenant_id: str) -> list[dict]:
    result = await db.execute(select(model).where(model.tenant_id == tenant_id))
    return [_row_to_dict(r, exclude={"tenant_id"}) for r in result.scalars().all()]


# ---------------------------------------------------------------------------
# Exportar
# ---------------------------------------------------------------------------

async def exportar(db: AsyncSession, tenant_id: str) -> dict:
    """Exporta todos los datos del tenant como diccionario."""

    # Config → dict clave:valor
    result = await db.execute(select(Config).where(Config.tenant_id == tenant_id))
    config_data = {r.clave: r.valor for r in result.scalars().all()}

    # Modificaciones con sus detalles anidados
    result = await db.execute(
        select(ModificacionPresupuestal).where(
            ModificacionPresupuestal.tenant_id == tenant_id
        )
    )
    mods_data = []
    for m in result.scalars().all():
        d = _row_to_dict(m, exclude={"tenant_id"})
        result2 = await db.execute(
            select(DetalleModificacion).where(
                DetalleModificacion.tenant_id == tenant_id,
                DetalleModificacion.id_modificacion == m.id,
            )
        )
        d["detalles"] = [
            _row_to_dict(det, exclude={"tenant_id", "id_modificacion"})
            for det in result2.scalars().all()
        ]
        mods_data.append(d)

    # Mapeos SIFSE filtrados por rubros del tenant
    codigos_gastos_result = await db.execute(
        select(RubroGasto.codigo).where(RubroGasto.tenant_id == tenant_id)
    )
    codigos_gastos = {r[0] for r in codigos_gastos_result.all()}

    codigos_ingresos_result = await db.execute(
        select(RubroIngreso.codigo).where(RubroIngreso.tenant_id == tenant_id)
    )
    codigos_ingresos = {r[0] for r in codigos_ingresos_result.all()}

    mapeos_ingresos = []
    if codigos_ingresos:
        r = await db.execute(
            select(MapeoSifseIngreso).where(
                MapeoSifseIngreso.codigo_rubro.in_(codigos_ingresos)
            )
        )
        mapeos_ingresos = [_row_to_dict(row) for row in r.scalars().all()]

    mapeos_gastos = []
    if codigos_gastos:
        r = await db.execute(
            select(MapeoSifseGasto).where(
                MapeoSifseGasto.codigo_rubro.in_(codigos_gastos)
            )
        )
        mapeos_gastos = [_row_to_dict(row) for row in r.scalars().all()]

    return {
        "version": BACKUP_VERSION,
        "sistema": "Sistema Presupuestal FSE",
        "tenant_id": tenant_id,
        "fecha_backup": date.today().isoformat(),
        "datos": {
            "config": config_data,
            "rubros_gastos": await _fetch_all(db, RubroGasto, tenant_id),
            "rubros_ingresos": await _fetch_all(db, RubroIngreso, tenant_id),
            "terceros": await _fetch_all(db, Tercero, tenant_id),
            "cuentas_bancarias": await _fetch_all(db, CuentaBancaria, tenant_id),
            "cdp": await _fetch_all(db, CDP, tenant_id),
            "rp": await _fetch_all(db, RP, tenant_id),
            "obligaciones": await _fetch_all(db, Obligacion, tenant_id),
            "pagos": await _fetch_all(db, Pago, tenant_id),
            "recaudos": await _fetch_all(db, Recaudo, tenant_id),
            "reconocimientos": await _fetch_all(db, Reconocimiento, tenant_id),
            "modificaciones": mods_data,
            "pac": await _fetch_all(db, PAC, tenant_id),
            "mapeo_sifse_ingresos": mapeos_ingresos,
            "mapeo_sifse_gastos": mapeos_gastos,
        },
    }


# ---------------------------------------------------------------------------
# Restaurar
# ---------------------------------------------------------------------------

async def restaurar(db: AsyncSession, tenant_id: str, data: dict) -> dict:
    """Restaura todos los datos del tenant desde un backup."""

    if data.get("version") != BACKUP_VERSION:
        raise ValueError(
            f"Versión de backup no compatible: {data.get('version')}. "
            f"Se esperaba {BACKUP_VERSION}."
        )

    datos = data.get("datos", {})
    stats: dict[str, int] = {}

    # --- Obtener códigos de rubros del backup para limpiar mapeos SIFSE ---
    codigos_gastos_bk = {r["codigo"] for r in datos.get("rubros_gastos", [])}
    codigos_ingresos_bk = {r["codigo"] for r in datos.get("rubros_ingresos", [])}

    # --- Borrar en orden inverso de dependencias ---
    if codigos_gastos_bk:
        await db.execute(
            delete(MapeoSifseGasto).where(
                MapeoSifseGasto.codigo_rubro.in_(codigos_gastos_bk)
            )
        )
    if codigos_ingresos_bk:
        await db.execute(
            delete(MapeoSifseIngreso).where(
                MapeoSifseIngreso.codigo_rubro.in_(codigos_ingresos_bk)
            )
        )

    for model in [
        PAC,
        DetalleModificacion,
        ModificacionPresupuestal,
        Reconocimiento,
        Recaudo,
        Pago,
        Obligacion,
        RP,
        CDP,
        CuentaBancaria,
        Tercero,
        RubroIngreso,
        RubroGasto,
        Config,
    ]:
        await db.execute(delete(model).where(model.tenant_id == tenant_id))

    await db.flush()

    # --- Insertar en orden de dependencias ---

    # Config
    config_dict = datos.get("config", {})
    for clave, valor in config_dict.items():
        db.add(Config(tenant_id=tenant_id, clave=clave, valor=valor))
    stats["config"] = len(config_dict)

    # Rubros
    for row in datos.get("rubros_gastos", []):
        db.add(RubroGasto(tenant_id=tenant_id, **row))
    stats["rubros_gastos"] = len(datos.get("rubros_gastos", []))

    for row in datos.get("rubros_ingresos", []):
        db.add(RubroIngreso(tenant_id=tenant_id, **row))
    stats["rubros_ingresos"] = len(datos.get("rubros_ingresos", []))

    # Terceros
    for row in datos.get("terceros", []):
        db.add(Tercero(tenant_id=tenant_id, **row))
    stats["terceros"] = len(datos.get("terceros", []))

    # Cuentas bancarias
    for row in datos.get("cuentas_bancarias", []):
        db.add(CuentaBancaria(tenant_id=tenant_id, **row))
    stats["cuentas_bancarias"] = len(datos.get("cuentas_bancarias", []))

    # CDP
    for row in datos.get("cdp", []):
        db.add(CDP(tenant_id=tenant_id, **row))
    stats["cdp"] = len(datos.get("cdp", []))

    # RP
    for row in datos.get("rp", []):
        db.add(RP(tenant_id=tenant_id, **row))
    stats["rp"] = len(datos.get("rp", []))

    # Obligaciones
    for row in datos.get("obligaciones", []):
        db.add(Obligacion(tenant_id=tenant_id, **row))
    stats["obligaciones"] = len(datos.get("obligaciones", []))

    # Pagos
    for row in datos.get("pagos", []):
        db.add(Pago(tenant_id=tenant_id, **row))
    stats["pagos"] = len(datos.get("pagos", []))

    # Recaudos
    for row in datos.get("recaudos", []):
        db.add(Recaudo(tenant_id=tenant_id, **row))
    stats["recaudos"] = len(datos.get("recaudos", []))

    # Reconocimientos
    for row in datos.get("reconocimientos", []):
        db.add(Reconocimiento(tenant_id=tenant_id, **row))
    stats["reconocimientos"] = len(datos.get("reconocimientos", []))

    # Modificaciones con detalles
    for m in datos.get("modificaciones", []):
        detalles = m.pop("detalles", [])
        mod_id = m["id"]
        db.add(ModificacionPresupuestal(tenant_id=tenant_id, **m))
        for det in detalles:
            db.add(
                DetalleModificacion(
                    tenant_id=tenant_id, id_modificacion=mod_id, **det
                )
            )
    stats["modificaciones"] = len(datos.get("modificaciones", []))

    # PAC
    for row in datos.get("pac", []):
        db.add(PAC(tenant_id=tenant_id, **row))
    stats["pac"] = len(datos.get("pac", []))

    # Mapeos SIFSE
    for row in datos.get("mapeo_sifse_ingresos", []):
        db.add(MapeoSifseIngreso(**row))
    stats["mapeo_sifse_ingresos"] = len(datos.get("mapeo_sifse_ingresos", []))

    for row in datos.get("mapeo_sifse_gastos", []):
        db.add(MapeoSifseGasto(**row))
    stats["mapeo_sifse_gastos"] = len(datos.get("mapeo_sifse_gastos", []))

    await db.commit()
    return stats
