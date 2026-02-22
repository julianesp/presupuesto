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
    tenant_id: str,
    codigo_gasto: str,
    codigo_ingreso: str,
    valor: float,
    numero_acto: str,
    descripcion: str = "",
) -> tuple[int, str]:
    if valor <= 0:
        raise ValueError("El valor de la adicion debe ser mayor a cero")

    # Validar rubros
    rubro_gasto = await rubros_gastos.get_rubro(db, tenant_id, codigo_gasto)
    if rubro_gasto is None:
        raise ValueError(f"Rubro de gasto {codigo_gasto} no encontrado")
    if rubro_gasto.es_hoja != 1:
        raise ValueError(f"Rubro de gasto {codigo_gasto} no es hoja")

    rubro_ingreso = await rubros_ingresos.get_rubro(db, tenant_id, codigo_ingreso)
    if rubro_ingreso is None:
        raise ValueError(f"Rubro de ingreso {codigo_ingreso} no encontrado")
    if rubro_ingreso.es_hoja != 1:
        raise ValueError(f"Rubro de ingreso {codigo_ingreso} no es hoja")

    # Consecutivo
    numero = await config_svc.get_consecutivo(db, tenant_id, "modificacion")
    fecha = date.today().isoformat()

    # Crear modificacion
    mod = ModificacionPresupuestal(
        tenant_id=tenant_id,
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
        tenant_id=tenant_id,
        id_modificacion=mod.id,
        codigo_rubro=codigo_gasto,
        tipo_rubro="GASTO",
        campo_afectado="adiciones",
        valor=valor,
    )
    detalle_ingreso = DetalleModificacion(
        tenant_id=tenant_id,
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
    tenant_id: str,
    codigo_gasto: str,
    codigo_ingreso: str,
    valor: float,
    numero_acto: str,
    descripcion: str = "",
) -> tuple[int, str]:
    if valor <= 0:
        raise ValueError("El valor de la reduccion debe ser mayor a cero")

    # Validar rubros
    rubro_gasto = await rubros_gastos.get_rubro(db, tenant_id, codigo_gasto)
    if rubro_gasto is None:
        raise ValueError(f"Rubro de gasto {codigo_gasto} no encontrado")
    if rubro_gasto.es_hoja != 1:
        raise ValueError(f"Rubro de gasto {codigo_gasto} no es hoja")

    rubro_ingreso = await rubros_ingresos.get_rubro(db, tenant_id, codigo_ingreso)
    if rubro_ingreso is None:
        raise ValueError(f"Rubro de ingreso {codigo_ingreso} no encontrado")
    if rubro_ingreso.es_hoja != 1:
        raise ValueError(f"Rubro de ingreso {codigo_ingreso} no es hoja")

    # Validar saldo disponible en gasto
    saldo = await rubros_gastos.saldo_disponible(db, tenant_id, codigo_gasto)
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
    numero = await config_svc.get_consecutivo(db, tenant_id, "modificacion")
    fecha = date.today().isoformat()

    # Crear modificacion
    mod = ModificacionPresupuestal(
        tenant_id=tenant_id,
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
        tenant_id=tenant_id,
        id_modificacion=mod.id,
        codigo_rubro=codigo_gasto,
        tipo_rubro="GASTO",
        campo_afectado="reducciones",
        valor=valor,
    )
    detalle_ingreso = DetalleModificacion(
        tenant_id=tenant_id,
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
    tenant_id: str,
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
    rubro_credito = await rubros_gastos.get_rubro(db, tenant_id, codigo_credito)
    if rubro_credito is None:
        raise ValueError(f"Rubro de gasto {codigo_credito} no encontrado")
    if rubro_credito.es_hoja != 1:
        raise ValueError(f"Rubro de gasto {codigo_credito} no es hoja")

    rubro_contracredito = await rubros_gastos.get_rubro(db, tenant_id, codigo_contracredito)
    if rubro_contracredito is None:
        raise ValueError(
            f"Rubro de gasto {codigo_contracredito} no encontrado"
        )
    if rubro_contracredito.es_hoja != 1:
        raise ValueError(
            f"Rubro de gasto {codigo_contracredito} no es hoja"
        )

    # Validar saldo del contracredito
    saldo_contra = await rubros_gastos.saldo_disponible(db, tenant_id, codigo_contracredito)
    if valor > saldo_contra:
        raise ValueError(
            f"El valor ({valor:,.2f}) supera el saldo disponible del rubro "
            f"contracredito ({saldo_contra:,.2f})"
        )

    # Consecutivo
    numero = await config_svc.get_consecutivo(db, tenant_id, "modificacion")
    fecha = date.today().isoformat()

    # Crear modificacion
    mod = ModificacionPresupuestal(
        tenant_id=tenant_id,
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
        tenant_id=tenant_id,
        id_modificacion=mod.id,
        codigo_rubro=codigo_credito,
        tipo_rubro="GASTO",
        campo_afectado="creditos",
        valor=valor,
    )
    detalle_contracredito = DetalleModificacion(
        tenant_id=tenant_id,
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

async def listar(db: AsyncSession, tenant_id: str) -> list[ModificacionPresupuestal]:
    stmt = select(ModificacionPresupuestal).where(
        ModificacionPresupuestal.tenant_id == tenant_id
    ).order_by(
        ModificacionPresupuestal.id.desc()
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Obtener modificacion con detalles
# ---------------------------------------------------------------------------

async def get_modificacion(
    db: AsyncSession, tenant_id: str, id_mod: int
) -> ModificacionPresupuestal | None:
    stmt = select(ModificacionPresupuestal).where(
        ModificacionPresupuestal.tenant_id == tenant_id,
        ModificacionPresupuestal.id == id_mod,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Registrar Aplazamiento (congela apropiación de un rubro, sin contraparte)
# ---------------------------------------------------------------------------

async def registrar_aplazamiento(
    db: AsyncSession,
    tenant_id: str,
    codigo_rubro: str,
    valor: float,
    numero_acto: str,
    descripcion: str = "",
) -> tuple[int, str]:
    if valor <= 0:
        raise ValueError("El valor del aplazamiento debe ser mayor a cero")

    rubro = await rubros_gastos.get_rubro(db, tenant_id, codigo_rubro)
    if rubro is None:
        raise ValueError(f"Rubro de gasto {codigo_rubro} no encontrado")
    if rubro.es_hoja != 1:
        raise ValueError(f"Rubro de gasto {codigo_rubro} no es hoja")

    saldo = await rubros_gastos.saldo_disponible(db, tenant_id, codigo_rubro)
    if valor > saldo:
        raise ValueError(
            f"El valor ({valor:,.2f}) supera el saldo disponible del rubro ({saldo:,.2f})"
        )

    numero = await config_svc.get_consecutivo(db, tenant_id, "modificacion")
    fecha = date.today().isoformat()

    mod = ModificacionPresupuestal(
        tenant_id=tenant_id,
        fecha=fecha,
        tipo="APLAZAMIENTO",
        numero_acto=numero_acto,
        descripcion=descripcion,
        valor=valor,
        estado="ACTIVO",
    )
    db.add(mod)
    await db.flush()

    detalle = DetalleModificacion(
        tenant_id=tenant_id,
        id_modificacion=mod.id,
        codigo_rubro=codigo_rubro,
        tipo_rubro="GASTO",
        campo_afectado="reducciones",
        valor=valor,
    )
    db.add(detalle)

    rubro.reducciones += valor
    _recalcular_gasto(rubro)

    await db.flush()
    return (numero, fecha)


# ---------------------------------------------------------------------------
# Registrar Desplazamiento (traslado interno entre rubros de gasto)
# ---------------------------------------------------------------------------

async def registrar_desplazamiento(
    db: AsyncSession,
    tenant_id: str,
    codigo_origen: str,
    codigo_destino: str,
    valor: float,
    numero_acto: str,
    descripcion: str = "",
) -> tuple[int, str]:
    if valor <= 0:
        raise ValueError("El valor del desplazamiento debe ser mayor a cero")

    if codigo_origen == codigo_destino:
        raise ValueError("El rubro origen y destino deben ser diferentes")

    rubro_origen = await rubros_gastos.get_rubro(db, tenant_id, codigo_origen)
    if rubro_origen is None:
        raise ValueError(f"Rubro origen {codigo_origen} no encontrado")
    if rubro_origen.es_hoja != 1:
        raise ValueError(f"Rubro origen {codigo_origen} no es hoja")

    rubro_destino = await rubros_gastos.get_rubro(db, tenant_id, codigo_destino)
    if rubro_destino is None:
        raise ValueError(f"Rubro destino {codigo_destino} no encontrado")
    if rubro_destino.es_hoja != 1:
        raise ValueError(f"Rubro destino {codigo_destino} no es hoja")

    saldo_origen = await rubros_gastos.saldo_disponible(db, tenant_id, codigo_origen)
    if valor > saldo_origen:
        raise ValueError(
            f"El valor ({valor:,.2f}) supera el saldo disponible del rubro origen ({saldo_origen:,.2f})"
        )

    numero = await config_svc.get_consecutivo(db, tenant_id, "modificacion")
    fecha = date.today().isoformat()

    mod = ModificacionPresupuestal(
        tenant_id=tenant_id,
        fecha=fecha,
        tipo="DESPLAZAMIENTO",
        numero_acto=numero_acto,
        descripcion=descripcion,
        valor=valor,
        estado="ACTIVO",
    )
    db.add(mod)
    await db.flush()

    db.add(DetalleModificacion(
        tenant_id=tenant_id,
        id_modificacion=mod.id,
        codigo_rubro=codigo_origen,
        tipo_rubro="GASTO",
        campo_afectado="contracreditos",
        valor=valor,
    ))
    db.add(DetalleModificacion(
        tenant_id=tenant_id,
        id_modificacion=mod.id,
        codigo_rubro=codigo_destino,
        tipo_rubro="GASTO",
        campo_afectado="creditos",
        valor=valor,
    ))

    rubro_origen.contracreditos += valor
    _recalcular_gasto(rubro_origen)
    rubro_destino.creditos += valor
    _recalcular_gasto(rubro_destino)

    await db.flush()
    return (numero, fecha)
