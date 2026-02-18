from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.modificaciones import ModificacionPresupuestal, DetalleModificacion
from app.models.rubros import RubroGasto, RubroIngreso
from app.services import rubros_gastos
from app.services import rubros_ingresos
from app.services import config as config_svc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _recalcular_gasto(rubro: RubroGasto) -> None:
    rubro.apropiacion_definitiva = (
        rubro.apropiacion_inicial
        + rubro.adiciones
        - rubro.reducciones
        + rubro.creditos
        - rubro.contracreditos
    )


def _recalcular_ingreso(rubro: RubroIngreso) -> None:
    rubro.presupuesto_definitivo = (
        rubro.presupuesto_inicial
        + rubro.adiciones
        - rubro.reducciones
    )


# ---------------------------------------------------------------------------
# Registrar Adicion
# ---------------------------------------------------------------------------

async def registrar_adicion(
    db: AsyncSession,
    codigo_gasto: str,
    codigo_ingreso: str,
    valor: float,
    numero_acto: str,
    descripcion: str = "",
) -> tuple[int, str]:
    if valor <= 0:
        raise ValueError("El valor de la adicion debe ser mayor a cero")

    # Validar rubros
    rubro_gasto = await rubros_gastos.get_rubro(db, codigo_gasto)
    if rubro_gasto is None:
        raise ValueError(f"Rubro de gasto {codigo_gasto} no encontrado")
    if rubro_gasto.es_hoja != 1:
        raise ValueError(f"Rubro de gasto {codigo_gasto} no es hoja")

    rubro_ingreso = await rubros_ingresos.get_rubro(db, codigo_ingreso)
    if rubro_ingreso is None:
        raise ValueError(f"Rubro de ingreso {codigo_ingreso} no encontrado")
    if rubro_ingreso.es_hoja != 1:
        raise ValueError(f"Rubro de ingreso {codigo_ingreso} no es hoja")

    # Consecutivo
    numero = await config_svc.get_consecutivo(db, "modificacion")
    fecha = date.today().isoformat()

    # Crear modificacion
    mod = ModificacionPresupuestal(
        fecha=fecha,
        tipo="ADICION",
        numero_acto=numero_acto,
        descripcion=descripcion,
        valor=valor,
        estado="ACTIVO",
    )
    db.add(mod)
    await db.flush()

    # Detalles
    detalle_gasto = DetalleModificacion(
        id_modificacion=mod.id,
        codigo_rubro=codigo_gasto,
        tipo_rubro="GASTO",
        campo_afectado="adiciones",
        valor=valor,
    )
    detalle_ingreso = DetalleModificacion(
        id_modificacion=mod.id,
        codigo_rubro=codigo_ingreso,
        tipo_rubro="INGRESO",
        campo_afectado="adiciones",
        valor=valor,
    )
    db.add(detalle_gasto)
    db.add(detalle_ingreso)

    # Actualizar rubros
    rubro_gasto.adiciones += valor
    _recalcular_gasto(rubro_gasto)

    rubro_ingreso.adiciones += valor
    _recalcular_ingreso(rubro_ingreso)

    await db.flush()
    return (numero, fecha)


# ---------------------------------------------------------------------------
# Registrar Reduccion
# ---------------------------------------------------------------------------

async def registrar_reduccion(
    db: AsyncSession,
    codigo_gasto: str,
    codigo_ingreso: str,
    valor: float,
    numero_acto: str,
    descripcion: str = "",
) -> tuple[int, str]:
    if valor <= 0:
        raise ValueError("El valor de la reduccion debe ser mayor a cero")

    # Validar rubros
    rubro_gasto = await rubros_gastos.get_rubro(db, codigo_gasto)
    if rubro_gasto is None:
        raise ValueError(f"Rubro de gasto {codigo_gasto} no encontrado")
    if rubro_gasto.es_hoja != 1:
        raise ValueError(f"Rubro de gasto {codigo_gasto} no es hoja")

    rubro_ingreso = await rubros_ingresos.get_rubro(db, codigo_ingreso)
    if rubro_ingreso is None:
        raise ValueError(f"Rubro de ingreso {codigo_ingreso} no encontrado")
    if rubro_ingreso.es_hoja != 1:
        raise ValueError(f"Rubro de ingreso {codigo_ingreso} no es hoja")

    # Validar saldo disponible en gasto
    saldo = await rubros_gastos.saldo_disponible(db, codigo_gasto)
    if valor > saldo:
        raise ValueError(
            f"El valor ({valor:,.2f}) supera el saldo disponible del rubro "
            f"de gasto ({saldo:,.2f})"
        )

    # Validar que no quede negativo en ingreso
    nuevo_def_ingreso = (
        rubro_ingreso.presupuesto_inicial
        + rubro_ingreso.adiciones
        - (rubro_ingreso.reducciones + valor)
    )
    if nuevo_def_ingreso < 0:
        raise ValueError(
            f"La reduccion dejaria el presupuesto definitivo del rubro de "
            f"ingreso {codigo_ingreso} en valor negativo ({nuevo_def_ingreso:,.2f})"
        )

    # Consecutivo
    numero = await config_svc.get_consecutivo(db, "modificacion")
    fecha = date.today().isoformat()

    # Crear modificacion
    mod = ModificacionPresupuestal(
        fecha=fecha,
        tipo="REDUCCION",
        numero_acto=numero_acto,
        descripcion=descripcion,
        valor=valor,
        estado="ACTIVO",
    )
    db.add(mod)
    await db.flush()

    # Detalles
    detalle_gasto = DetalleModificacion(
        id_modificacion=mod.id,
        codigo_rubro=codigo_gasto,
        tipo_rubro="GASTO",
        campo_afectado="reducciones",
        valor=valor,
    )
    detalle_ingreso = DetalleModificacion(
        id_modificacion=mod.id,
        codigo_rubro=codigo_ingreso,
        tipo_rubro="INGRESO",
        campo_afectado="reducciones",
        valor=valor,
    )
    db.add(detalle_gasto)
    db.add(detalle_ingreso)

    # Actualizar rubros
    rubro_gasto.reducciones += valor
    _recalcular_gasto(rubro_gasto)

    rubro_ingreso.reducciones += valor
    _recalcular_ingreso(rubro_ingreso)

    await db.flush()
    return (numero, fecha)


# ---------------------------------------------------------------------------
# Registrar Credito / Contracredito
# ---------------------------------------------------------------------------

async def registrar_credito_contracredito(
    db: AsyncSession,
    codigo_credito: str,
    codigo_contracredito: str,
    valor: float,
    numero_acto: str,
    descripcion: str = "",
) -> tuple[int, str]:
    if valor <= 0:
        raise ValueError("El valor debe ser mayor a cero")

    if codigo_credito == codigo_contracredito:
        raise ValueError(
            "El rubro credito y contracredito deben ser diferentes"
        )

    # Validar rubros
    rubro_credito = await rubros_gastos.get_rubro(db, codigo_credito)
    if rubro_credito is None:
        raise ValueError(f"Rubro de gasto {codigo_credito} no encontrado")
    if rubro_credito.es_hoja != 1:
        raise ValueError(f"Rubro de gasto {codigo_credito} no es hoja")

    rubro_contracredito = await rubros_gastos.get_rubro(db, codigo_contracredito)
    if rubro_contracredito is None:
        raise ValueError(
            f"Rubro de gasto {codigo_contracredito} no encontrado"
        )
    if rubro_contracredito.es_hoja != 1:
        raise ValueError(
            f"Rubro de gasto {codigo_contracredito} no es hoja"
        )

    # Validar saldo del contracredito
    saldo_contra = await rubros_gastos.saldo_disponible(db, codigo_contracredito)
    if valor > saldo_contra:
        raise ValueError(
            f"El valor ({valor:,.2f}) supera el saldo disponible del rubro "
            f"contracredito ({saldo_contra:,.2f})"
        )

    # Consecutivo
    numero = await config_svc.get_consecutivo(db, "modificacion")
    fecha = date.today().isoformat()

    # Crear modificacion
    mod = ModificacionPresupuestal(
        fecha=fecha,
        tipo="CREDITO_CONTRACREDITO",
        numero_acto=numero_acto,
        descripcion=descripcion,
        valor=valor,
        estado="ACTIVO",
    )
    db.add(mod)
    await db.flush()

    # Detalles
    detalle_credito = DetalleModificacion(
        id_modificacion=mod.id,
        codigo_rubro=codigo_credito,
        tipo_rubro="GASTO",
        campo_afectado="creditos",
        valor=valor,
    )
    detalle_contracredito = DetalleModificacion(
        id_modificacion=mod.id,
        codigo_rubro=codigo_contracredito,
        tipo_rubro="GASTO",
        campo_afectado="contracreditos",
        valor=valor,
    )
    db.add(detalle_credito)
    db.add(detalle_contracredito)

    # Actualizar rubros
    rubro_credito.creditos += valor
    _recalcular_gasto(rubro_credito)

    rubro_contracredito.contracreditos += valor
    _recalcular_gasto(rubro_contracredito)

    await db.flush()
    return (numero, fecha)


# ---------------------------------------------------------------------------
# Listar modificaciones
# ---------------------------------------------------------------------------

async def listar(db: AsyncSession) -> list[ModificacionPresupuestal]:
    stmt = select(ModificacionPresupuestal).order_by(
        ModificacionPresupuestal.id.desc()
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Obtener modificacion con detalles
# ---------------------------------------------------------------------------

async def get_modificacion(
    db: AsyncSession, id_mod: int
) -> ModificacionPresupuestal | None:
    stmt = select(ModificacionPresupuestal).where(
        ModificacionPresupuestal.id == id_mod
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
