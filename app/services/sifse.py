from sqlalchemy import select, and_, func, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.sifse import (
    CatalogoSifseFuente, CatalogoSifseItem,
    MapeoSifseIngreso, MapeoSifseGasto,
)
from app.models.rubros import RubroGasto, RubroIngreso
from app.models.cdp import CDP
from app.models.rp import RP
from app.models.obligacion import Obligacion
from app.models.pago import Pago
from app.models.recaudo import Recaudo


async def get_catalogo_fuentes(db: AsyncSession):
    result = await db.execute(select(CatalogoSifseFuente).order_by(CatalogoSifseFuente.codigo))
    return list(result.scalars().all())


async def get_catalogo_items(db: AsyncSession):
    result = await db.execute(select(CatalogoSifseItem).order_by(CatalogoSifseItem.codigo))
    return list(result.scalars().all())


async def get_mapeo_ingreso(db: AsyncSession, codigo_rubro: str) -> int | None:
    result = await db.execute(
        select(MapeoSifseIngreso).where(MapeoSifseIngreso.codigo_rubro == codigo_rubro)
    )
    row = result.scalar_one_or_none()
    return row.sifse_fuente if row else None


async def get_mapeo_gasto(db: AsyncSession, codigo_rubro: str) -> int | None:
    result = await db.execute(
        select(MapeoSifseGasto).where(MapeoSifseGasto.codigo_rubro == codigo_rubro)
    )
    row = result.scalar_one_or_none()
    return row.sifse_item if row else None


async def set_mapeo_ingreso(db: AsyncSession, codigo_rubro: str, sifse_fuente: int):
    result = await db.execute(
        select(MapeoSifseIngreso).where(MapeoSifseIngreso.codigo_rubro == codigo_rubro)
    )
    row = result.scalar_one_or_none()
    if row:
        row.sifse_fuente = sifse_fuente
    else:
        db.add(MapeoSifseIngreso(codigo_rubro=codigo_rubro, sifse_fuente=sifse_fuente))
    await db.commit()


async def set_mapeo_gasto(db: AsyncSession, codigo_rubro: str, sifse_item: int):
    result = await db.execute(
        select(MapeoSifseGasto).where(MapeoSifseGasto.codigo_rubro == codigo_rubro)
    )
    row = result.scalar_one_or_none()
    if row:
        row.sifse_item = sifse_item
    else:
        db.add(MapeoSifseGasto(codigo_rubro=codigo_rubro, sifse_item=sifse_item))
    await db.commit()


async def get_todos_mapeos_ingresos(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(RubroIngreso, MapeoSifseIngreso, CatalogoSifseFuente)
        .outerjoin(MapeoSifseIngreso, RubroIngreso.codigo == MapeoSifseIngreso.codigo_rubro)
        .outerjoin(CatalogoSifseFuente, MapeoSifseIngreso.sifse_fuente == CatalogoSifseFuente.codigo)
        .where(RubroIngreso.es_hoja == 1)
        .order_by(RubroIngreso.codigo)
    )
    rows = result.all()
    return [
        {
            "codigo": r[0].codigo,
            "cuenta": r[0].cuenta,
            "sifse_fuente": r[1].sifse_fuente if r[1] else None,
            "desc_sifse": r[2].descripcion if r[2] else "",
        }
        for r in rows
    ]


async def get_todos_mapeos_gastos(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(RubroGasto, MapeoSifseGasto, CatalogoSifseItem)
        .outerjoin(MapeoSifseGasto, RubroGasto.codigo == MapeoSifseGasto.codigo_rubro)
        .outerjoin(CatalogoSifseItem, MapeoSifseGasto.sifse_item == CatalogoSifseItem.codigo)
        .where(RubroGasto.es_hoja == 1)
        .order_by(RubroGasto.codigo)
    )
    rows = result.all()
    return [
        {
            "codigo": r[0].codigo,
            "cuenta": r[0].cuenta,
            "sifse_item": r[1].sifse_item if r[1] else None,
            "desc_sifse": r[2].descripcion if r[2] else "",
        }
        for r in rows
    ]


async def poblar_catalogos(db: AsyncSession):
    """Populate SIFSE catalogs with Colombian standard codes."""
    fuentes_data = [
        (1, "Venta de bienes y servicios"),
        (2, "SGP - Calidad por Gratuidad"),
        (3, "Otros ingresos corrientes"),
        (4, "Transferencias"),
        (5, "Recursos de capital"),
        (6, "Matricula - Calidad"),
        (7, "Otros recursos de balance"),
        (8, "SGP - Calidad por Matricula"),
        (9, "Reintegros"),
        (10, "Rendimientos financieros"),
        (11, "Excedentes financieros"),
        (12, "Otros recursos especiales"),
        (13, "Recursos propios"),
        (14, "Fondo de servicios educativos"),
        (15, "SGP - Prestacion de servicios"),
        (16, "Convenios"),
    ]
    items_data = [
        (7, "Adquisicion de bienes de consumo para funcionamiento"),
        (8, "Adquisicion de bienes de consumo para produccion de bienes"),
        (9, "Adquisicion de servicios para funcionamiento"),
        (10, "Adquisicion de servicios para produccion de bienes"),
        (11, "Pagos de personal - Docentes"),
        (12, "Pagos de personal - Administrativos"),
        (13, "Transferencias corrientes"),
        (14, "Transferencias de capital"),
        (15, "Gastos de comercializacion"),
        (16, "Gastos de produccion"),
        (17, "Personal - Docentes"),
        (18, "Personal - Directivos Docentes"),
        (19, "Personal - Administrativos"),
        (20, "Construccion de infraestructura propia"),
        (21, "Dotacion"),
        (22, "Mantenimiento de infraestructura"),
        (23, "Proyectos de inversion"),
        (24, "Otros gastos de inversion"),
        (25, "Arrendamientos"),
        (26, "Servicio de la deuda"),
    ]

    for codigo, desc in fuentes_data:
        existing = await db.execute(
            select(CatalogoSifseFuente).where(CatalogoSifseFuente.codigo == codigo)
        )
        if not existing.scalar_one_or_none():
            db.add(CatalogoSifseFuente(codigo=codigo, descripcion=desc))

    for codigo, desc in items_data:
        existing = await db.execute(
            select(CatalogoSifseItem).where(CatalogoSifseItem.codigo == codigo)
        )
        if not existing.scalar_one_or_none():
            db.add(CatalogoSifseItem(codigo=codigo, descripcion=desc))

    await db.commit()
