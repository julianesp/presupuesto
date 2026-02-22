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


async def get_mapeo_ingreso(db: AsyncSession, tenant_id: str, codigo_rubro: str) -> int | None:
    result = await db.execute(
        select(MapeoSifseIngreso).where(MapeoSifseIngreso.tenant_id == tenant_id, MapeoSifseIngreso.codigo_rubro == codigo_rubro)
    )
    row = result.scalar_one_or_none()
    return row.sifse_fuente if row else None


async def get_mapeo_gasto(db: AsyncSession, tenant_id: str, codigo_rubro: str) -> int | None:
    result = await db.execute(
        select(MapeoSifseGasto).where(MapeoSifseGasto.tenant_id == tenant_id, MapeoSifseGasto.codigo_rubro == codigo_rubro)
    )
    row = result.scalar_one_or_none()
    return row.sifse_item if row else None


async def set_mapeo_ingreso(db: AsyncSession, tenant_id: str, codigo_rubro: str, sifse_fuente: int):
    result = await db.execute(
        select(MapeoSifseIngreso).where(MapeoSifseIngreso.tenant_id == tenant_id, MapeoSifseIngreso.codigo_rubro == codigo_rubro)
    )
    row = result.scalar_one_or_none()
    if row:
        row.sifse_fuente = sifse_fuente
    else:
        db.add(MapeoSifseIngreso(codigo_rubro=codigo_rubro, sifse_fuente=sifse_fuente))
    await db.commit()


async def set_mapeo_gasto(db: AsyncSession, tenant_id: str, codigo_rubro: str, sifse_item: int):
    result = await db.execute(
        select(MapeoSifseGasto).where(MapeoSifseGasto.tenant_id == tenant_id, MapeoSifseGasto.codigo_rubro == codigo_rubro)
    )
    row = result.scalar_one_or_none()
    if row:
        row.sifse_item = sifse_item
    else:
        db.add(MapeoSifseGasto(codigo_rubro=codigo_rubro, sifse_item=sifse_item))
    await db.commit()


async def get_todos_mapeos_ingresos(db: AsyncSession, tenant_id: str) -> list[dict]:
    result = await db.execute(
        select(RubroIngreso, MapeoSifseIngreso, CatalogoSifseFuente)
        .outerjoin(MapeoSifseIngreso, RubroIngreso.codigo == MapeoSifseIngreso.codigo_rubro)
        .outerjoin(CatalogoSifseFuente, MapeoSifseIngreso.sifse_fuente == CatalogoSifseFuente.codigo)
        .where(RubroIngreso.tenant_id == tenant_id, RubroIngreso.es_hoja == 1)
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


async def get_todos_mapeos_gastos(db: AsyncSession, tenant_id: str) -> list[dict]:
    result = await db.execute(
        select(RubroGasto, MapeoSifseGasto, CatalogoSifseItem)
        .outerjoin(MapeoSifseGasto, RubroGasto.codigo == MapeoSifseGasto.codigo_rubro)
        .outerjoin(CatalogoSifseItem, MapeoSifseGasto.sifse_item == CatalogoSifseItem.codigo)
        .where(RubroGasto.tenant_id == tenant_id, RubroGasto.es_hoja == 1)
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
    """Populate SIFSE catalogs with official codes from MINEDUCACION prevalidador."""
    fuentes_data = [
        (1, "Ingresos Operacionales"),
        (2, "Gratuidad"),
        (3, "Otras Transferencias Recursos Públicos"),
        (4, "Cobros ciclo complementario escuelas normales"),
        (6, "Transferencias municipales de calidad SGP"),
        (28, "FOME"),
        (32, "Recursos de capital-Superávit-Gratuidad"),
        (33, "Recursos de capital-Superávit-Recursos Propios"),
        (34, "Recursos de capital-Superávit-FOME"),
        (35, "Recursos de capital-Rendimientos Financieros-Gratuidad"),
        (36, "Recursos de capital-Rendimientos Financieros-Recursos Propios"),
        (37, "Recursos de capital-Rendimientos Financieros-FOME"),
        (38, "Recursos de capital-Reintegros-Gratuidad"),
        (39, "Recursos de capital-Reintegros-Recursos Propios"),
        (40, "Recursos de capital-Reintegros-FOME"),
        (41, "Otros recursos de capital"),
        (42, "Recursos de Capital - Superavit - Trans.Calidad"),
        (43, "Recursos de Capital - Rendimientos Financieros - Trans.Calidad"),
        (44, "Recursos de Capital - Reintegros - Trans.Calidad"),
    ]
    items_data = [
        (7, "Adquisición de bienes"),
        (8, "Arrendamiento de bienes"),
        (9, "Acueducto, alcantarillado y aseo"),
        (10, "Energía"),
        (11, "Teléfono"),
        (12, "Internet"),
        (13, "Otros servicios públicos"),
        (14, "Seguros"),
        (15, "Contratación de servicios técnicos profesionales"),
        (16, "Impresos y publicaciones"),
        (17, "Horas cátedras para ciclo complementario en Escuelas Normales Superiores"),
        (18, "Otros gastos generales"),
        (19, "Construcción, ampliación y adecuación de infraestructura educativa"),
        (20, "Mantenimiento de infraestructura educativa"),
        (21, "Dotación institucional de infraestructura educativa"),
        (22, "Dotación institucional de material y medios pedagógicos para el aprendizaje"),
        (23, "Transporte escolar"),
        (24, "Sostenimiento de semovientes y proyectos pedagógicos productivos"),
        (25, "Alimentación para jornada extendida"),
        (26, "Actividades pedagógicas"),
        (27, "Acciones de mejoramiento a la gestión escolar y académica"),
        (29, "Elementos de Protección Personal (EPP)"),
        (30, "Condiciones Sanitarias"),
        (31, "Adecuación de Infraestructura (Emergencia)"),
        (63, "CONSTRUCCION GENERAL-CONSTRUCCION NUEVA INFRAESTRUCTURA EDUCATIVA"),
        (64, "CONSTRUCCION GENERAL-INTERVENTORIA. INFRAESTRUCTURA"),
        (65, "PERSONAL-ARL ESTUDIANTES"),
        (66, "PAE-MEJORAMIENTO DE INFRAESTRUCTURA REPARACION, MODIFICACION, RESTAURACION"),
        (67, "PAE-ALIMENTOS"),
        (68, "PAE-CONTRATACION DE PERSONAL PARA LA PREPARACION DE ALIMENTOS"),
        (69, "PAE-CONTRATACION TRANSPORTE DE ALIMENTOS"),
        (70, "PAE-DOTACION INSTITUCIONAL. COCINAS Y COMEDORES ESCOLARES"),
        (71, "PAE-MENAJE PARA LA PRESTACION DEL SERVICIO DE ALIMENTACION ESCOLAR"),
        (72, "PAE-INTERVENTORIA. ALIMENTACION ESCOLAR"),
        (73, "ATENCION EDUCATIVA PERSONAS CON DISCAPACIDAD-MEJORAMIENTO DE INFRAESTRUCTURA"),
        (74, "ATENCION EDUCATIVA PERSONAS CON DISCAPACIDAD-HERRAMIENTAS TECNICAS Y DIDACTICAS"),
        (75, "ATENCION EDUCATIVA CAPACIDADES EXCEPCIONALES-DOTACION INSTITUCIONAL"),
        (76, "RESIDENCIAS ESCOLARES-MEJORAMIENTO DE INFRAESTRUCTURA"),
        (77, "RESIDENCIAS ESCOLARES-ARRENDAMIENTOS"),
        (78, "RESIDENCIAS ESCOLARES-CONTRATACION DE PERSONAL PARA PREPARACION DE ALIMENTOS"),
        (79, "RESIDENCIAS ESCOLARES-DOTACION INSTITUCIONAL"),
        (80, "RESIDENCIAS ESCOLARES-ALIMENTACION"),
        (81, "RESIDENCIAS ESCOLARES-FUNCIONAMIENTO BASICO"),
        (82, "RESIDENCIAS ESCOLARES-DOTACION SERVICIO DE HOSPEDAJE"),
        (83, "SRPA-MEJORAMIENTO DE INFRAESTRUCTURA (ADECUACION DE ESPACIOS Y MOBILIARIO)"),
        (84, "SRPA-DOTACION INSTITUCIONAL - MATERIALES Y MEDIOS PEDAGOGICOS"),
        (85, "OTROS GASTOS EN EDUCACION-SERVICIOS FINANCIEROS"),
        (86, "OTROS GASTOS EN EDUCACION-SERVICIOS DE CONSULTORIA Y ASESORIA"),
        (87, "OTROS GASTOS EN EDUCACION-IMPUESTOS"),
        (88, "OTROS GASTOS EN EDUCACION-APLICACION DE PROYECTOS EDUCATIVOS TRANSVERSALES"),
        (200, "FI-DOTACION, MENAJE, SUMINISTROS-DOTACION INSTITUCIONAL"),
        (201, "FI-CONSTRUCCION GENERAL-MEJORAMIENTO DE INFRAESTRUCTURA PSE"),
        (202, "FI-GASTOS DE VIAJE E INSCRIPCION DE ESTUDIANTES PARA ACTIVIDADES PEDAGOGICAS"),
        (203, "FI-OTROS GASTOS EN EDUCACION-APLICACION DE PROYECTOS EDUCATIVOS TRANSVERSALES"),
        (204, "FI-OTROS GASTOS EN EDUCACION-DISENO E IMPLEMENTACION DE PLANES DE MEJORAMIENTO"),
        (205, "FI-TRANSPORTE ESCOLAR-CONTRATACION TRANSPORTE ESCOLAR"),
        (206, "FI-ALIMENTACION"),
        (207, "FI-DESARROLLO DE ACTIVIDADES EXTRACURRICULARES, DEPORTIVAS, CULTURALES Y CIENTIFICAS"),
        (208, "FI-IMPLEMENTACION DE ESTRATEGIAS DE EDUCACION CRESE"),
        (250, "PI-DOTACION, MENAJE, SUMINISTROS-DOTACION INSTITUCIONAL"),
        (251, "PI-CONSTRUCCION GENERAL-MEJORAMIENTO DE INFRAESTRUCTURA PSE"),
    ]

    for codigo, desc in fuentes_data:
        existing = await db.execute(
            select(CatalogoSifseFuente).where(CatalogoSifseFuente.codigo == codigo)
        )
        row = existing.scalar_one_or_none()
        if row:
            row.descripcion = desc
        else:
            db.add(CatalogoSifseFuente(codigo=codigo, descripcion=desc))

    for codigo, desc in items_data:
        existing = await db.execute(
            select(CatalogoSifseItem).where(CatalogoSifseItem.codigo == codigo)
        )
        row = existing.scalar_one_or_none()
        if row:
            row.descripcion = desc
        else:
            db.add(CatalogoSifseItem(codigo=codigo, descripcion=desc))

    await db.commit()
