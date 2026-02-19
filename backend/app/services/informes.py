from sqlalchemy import select, func, and_, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rubros import RubroGasto, RubroIngreso
from app.models.cdp import CDP
from app.models.rp import RP
from app.models.obligacion import Obligacion
from app.models.pago import Pago
from app.models.recaudo import Recaudo
from app.services import config as config_svc


def _nivel(codigo: str) -> int:
    return codigo.count(".") + 1


async def _sum_by_rubro_and_period(db, model, campo_valor, codigo_rubro,
                                    campo_estado, estado_excluir, mes_antes=None, mes_desde=None, mes_hasta=None):
    """Helper to sum values by rubro optionally filtering by month period."""
    mes_col = func.cast(func.substr(model.fecha, 6, 2), Integer)
    conditions = [model.codigo_rubro == codigo_rubro]
    if campo_estado:
        conditions.append(getattr(model, campo_estado) != estado_excluir)
    if mes_antes is not None:
        conditions.append(mes_col < mes_antes)
    if mes_desde is not None:
        conditions.append(mes_col >= mes_desde)
    if mes_hasta is not None:
        conditions.append(mes_col <= mes_hasta)

    result = await db.execute(
        select(func.coalesce(func.sum(getattr(model, campo_valor)), 0)).where(and_(*conditions))
    )
    return result.scalar()


async def resumen_rubro(db: AsyncSession, codigo_rubro: str,
                        mes_inicio: int = 1, mes_fin: int = 12) -> dict:
    rubro = await db.execute(select(RubroGasto).where(RubroGasto.codigo == codigo_rubro))
    rubro = rubro.scalar_one_or_none()
    if not rubro:
        raise ValueError(f"Rubro {codigo_rubro} no encontrado")

    # If parent, aggregate children
    if rubro.es_hoja == 0:
        children = await db.execute(
            select(RubroGasto).where(
                and_(RubroGasto.codigo.like(f"{codigo_rubro}.%"), RubroGasto.es_hoja == 1)
            )
        )
        codigos = [c.codigo for c in children.scalars().all()]
    else:
        codigos = [codigo_rubro]

    totals = {
        "disp_anteriores": 0, "disp_periodo": 0,
        "comp_anteriores": 0, "comp_periodo": 0,
        "obl_anteriores": 0, "obl_periodo": 0,
        "pago_anteriores": 0, "pago_periodo": 0,
    }

    for cod in codigos:
        totals["disp_anteriores"] += await _sum_by_rubro_and_period(
            db, CDP, "valor", cod, "estado", "ANULADO", mes_antes=mes_inicio)
        totals["disp_periodo"] += await _sum_by_rubro_and_period(
            db, CDP, "valor", cod, "estado", "ANULADO", mes_desde=mes_inicio, mes_hasta=mes_fin)
        totals["comp_anteriores"] += await _sum_by_rubro_and_period(
            db, RP, "valor", cod, "estado", "ANULADO", mes_antes=mes_inicio)
        totals["comp_periodo"] += await _sum_by_rubro_and_period(
            db, RP, "valor", cod, "estado", "ANULADO", mes_desde=mes_inicio, mes_hasta=mes_fin)
        totals["obl_anteriores"] += await _sum_by_rubro_and_period(
            db, Obligacion, "valor", cod, "estado", "ANULADA", mes_antes=mes_inicio)
        totals["obl_periodo"] += await _sum_by_rubro_and_period(
            db, Obligacion, "valor", cod, "estado", "ANULADA", mes_desde=mes_inicio, mes_hasta=mes_fin)
        totals["pago_anteriores"] += await _sum_by_rubro_and_period(
            db, Pago, "valor", cod, "estado", "ANULADO", mes_antes=mes_inicio)
        totals["pago_periodo"] += await _sum_by_rubro_and_period(
            db, Pago, "valor", cod, "estado", "ANULADO", mes_desde=mes_inicio, mes_hasta=mes_fin)

    total_disp = totals["disp_anteriores"] + totals["disp_periodo"]
    total_comp = totals["comp_anteriores"] + totals["comp_periodo"]
    total_obl = totals["obl_anteriores"] + totals["obl_periodo"]
    total_pago = totals["pago_anteriores"] + totals["pago_periodo"]

    return {
        "rubro": {"codigo": rubro.codigo, "cuenta": rubro.cuenta},
        "apropiacion_inicial": rubro.apropiacion_inicial,
        "adiciones": rubro.adiciones,
        "reducciones": rubro.reducciones,
        "creditos": rubro.creditos,
        "contracreditos": rubro.contracreditos,
        "apropiacion_definitiva": rubro.apropiacion_definitiva,
        "disp_anteriores": totals["disp_anteriores"],
        "disp_periodo": totals["disp_periodo"],
        "total_disp": total_disp,
        "saldo_disponible": rubro.apropiacion_definitiva - total_disp,
        "disp_sin_compromiso": total_disp - total_comp,
        "comp_anteriores": totals["comp_anteriores"],
        "comp_periodo": totals["comp_periodo"],
        "total_comp": total_comp,
        "comp_sin_obligacion": total_comp - total_obl,
        "obl_anteriores": totals["obl_anteriores"],
        "obl_periodo": totals["obl_periodo"],
        "total_obl": total_obl,
        "obl_x_pagar": total_obl - total_pago,
        "pago_anteriores": totals["pago_anteriores"],
        "pago_periodo": totals["pago_periodo"],
        "total_pago": total_pago,
        "aprop_x_afectar": rubro.apropiacion_definitiva - total_disp,
    }


async def informe_ejecucion_gastos(db: AsyncSession, mes_consulta: int | None = None) -> list[dict]:
    if mes_consulta is None:
        mes_consulta = int(await config_svc.get_config(db, "mes_actual") or "1")

    rubros_result = await db.execute(select(RubroGasto).order_by(RubroGasto.codigo))
    rubros = rubros_result.scalars().all()
    filas = []

    for r in rubros:
        if r.es_hoja == 1:
            codigos = [r.codigo]
        else:
            children = await db.execute(
                select(RubroGasto).where(
                    and_(RubroGasto.codigo.like(f"{r.codigo}.%"), RubroGasto.es_hoja == 1)
                )
            )
            codigos = [c.codigo for c in children.scalars().all()]

        comp_ant = comp_mes = pago_ant = pago_mes = 0
        for cod in codigos:
            comp_ant += await _sum_by_rubro_and_period(db, RP, "valor", cod, "estado", "ANULADO", mes_antes=mes_consulta)
            comp_mes += await _sum_by_rubro_and_period(db, RP, "valor", cod, "estado", "ANULADO", mes_desde=mes_consulta, mes_hasta=mes_consulta)
            pago_ant += await _sum_by_rubro_and_period(db, Pago, "valor", cod, "estado", "ANULADO", mes_antes=mes_consulta)
            pago_mes += await _sum_by_rubro_and_period(db, Pago, "valor", cod, "estado", "ANULADO", mes_desde=mes_consulta, mes_hasta=mes_consulta)

        comp_acum = comp_ant + comp_mes
        pago_acum = pago_ant + pago_mes

        filas.append({
            "codigo": r.codigo,
            "cuenta": r.cuenta,
            "es_hoja": r.es_hoja,
            "nivel": _nivel(r.codigo),
            "ppto_inicial": r.apropiacion_inicial,
            "adiciones": r.adiciones,
            "reducciones": r.reducciones,
            "creditos": r.creditos,
            "contracreditos": r.contracreditos,
            "ppto_definitivo": r.apropiacion_definitiva,
            "comp_anterior": comp_ant,
            "comp_mes": comp_mes,
            "comp_acumulado": comp_acum,
            "pago_anterior": pago_ant,
            "pago_mes": pago_mes,
            "pago_acumulado": pago_acum,
            "saldo_apropiacion": r.apropiacion_definitiva - comp_acum,
            "saldo_comp_pagar": comp_acum - pago_acum,
        })

    return filas


async def informe_ejecucion_ingresos(db: AsyncSession, mes_consulta: int | None = None) -> list[dict]:
    if mes_consulta is None:
        mes_consulta = int(await config_svc.get_config(db, "mes_actual") or "1")

    rubros_result = await db.execute(select(RubroIngreso).order_by(RubroIngreso.codigo))
    rubros = rubros_result.scalars().all()
    filas = []

    for r in rubros:
        if r.es_hoja == 1:
            codigos = [r.codigo]
        else:
            children = await db.execute(
                select(RubroIngreso).where(
                    and_(RubroIngreso.codigo.like(f"{r.codigo}.%"), RubroIngreso.es_hoja == 1)
                )
            )
            codigos = [c.codigo for c in children.scalars().all()]

        rec_ant = rec_mes = 0
        for cod in codigos:
            rec_ant += await _sum_by_rubro_and_period(db, Recaudo, "valor", cod, "estado", "ANULADO", mes_antes=mes_consulta)
            rec_mes += await _sum_by_rubro_and_period(db, Recaudo, "valor", cod, "estado", "ANULADO", mes_desde=mes_consulta, mes_hasta=mes_consulta)

        rec_acum = rec_ant + rec_mes

        filas.append({
            "codigo": r.codigo,
            "cuenta": r.cuenta,
            "es_hoja": r.es_hoja,
            "nivel": _nivel(r.codigo),
            "ppto_inicial": r.presupuesto_inicial,
            "adiciones": r.adiciones,
            "reducciones": r.reducciones,
            "ppto_definitivo": r.presupuesto_definitivo,
            "recaudo_anterior": rec_ant,
            "recaudo_mes": rec_mes,
            "recaudo_acumulado": rec_acum,
            "saldo_por_recaudar": r.presupuesto_definitivo - rec_acum,
        })

    return filas


async def generar_tarjeta(db: AsyncSession, codigo_rubro: str) -> dict:
    rubro = await db.execute(select(RubroGasto).where(RubroGasto.codigo == codigo_rubro))
    rubro = rubro.scalar_one_or_none()
    if not rubro:
        raise ValueError(f"Rubro {codigo_rubro} no encontrado")

    movimientos = []

    cdps = await db.execute(
        select(CDP).where(and_(CDP.codigo_rubro == codigo_rubro, CDP.estado != "ANULADO"))
        .order_by(CDP.fecha)
    )
    for c in cdps.scalars().all():
        movimientos.append({
            "fecha": c.fecha, "tipo": "CDP", "numero": c.numero,
            "nit": "", "tercero": "", "concepto": c.objeto,
            "v_cdp": c.valor, "v_rp": 0, "v_obl": 0, "v_pago": 0,
        })

    rps = await db.execute(
        select(RP).where(and_(RP.codigo_rubro == codigo_rubro, RP.estado != "ANULADO"))
        .order_by(RP.fecha)
    )
    for r in rps.scalars().all():
        tercero = r.tercero
        movimientos.append({
            "fecha": r.fecha, "tipo": "RP", "numero": r.numero,
            "nit": r.nit_tercero, "tercero": tercero.nombre if tercero else "",
            "concepto": r.objeto,
            "v_cdp": 0, "v_rp": r.valor, "v_obl": 0, "v_pago": 0,
        })

    obls = await db.execute(
        select(Obligacion).where(
            and_(Obligacion.codigo_rubro == codigo_rubro, Obligacion.estado != "ANULADA")
        ).order_by(Obligacion.fecha)
    )
    for o in obls.scalars().all():
        tercero = o.tercero
        movimientos.append({
            "fecha": o.fecha, "tipo": "OBL", "numero": o.numero,
            "nit": o.nit_tercero, "tercero": tercero.nombre if tercero else "",
            "concepto": o.factura,
            "v_cdp": 0, "v_rp": 0, "v_obl": o.valor, "v_pago": 0,
        })

    pagos = await db.execute(
        select(Pago).where(
            and_(Pago.codigo_rubro == codigo_rubro, Pago.estado != "ANULADO")
        ).order_by(Pago.fecha)
    )
    for p in pagos.scalars().all():
        tercero = p.tercero
        movimientos.append({
            "fecha": p.fecha, "tipo": "PAGO", "numero": p.numero,
            "nit": p.nit_tercero, "tercero": tercero.nombre if tercero else "",
            "concepto": p.concepto,
            "v_cdp": 0, "v_rp": 0, "v_obl": 0, "v_pago": p.valor,
        })

    movimientos.sort(key=lambda m: (m["fecha"], ["CDP", "RP", "OBL", "PAGO"].index(m["tipo"])))

    return {
        "rubro": {
            "codigo": rubro.codigo, "cuenta": rubro.cuenta,
            "apropiacion_definitiva": rubro.apropiacion_definitiva,
        },
        "movimientos": movimientos,
    }


async def informe_cadena_presupuestal(db: AsyncSession) -> list[dict]:
    cdps = await db.execute(
        select(CDP).where(CDP.estado != "ANULADO").order_by(CDP.numero)
    )
    resultado = []

    for cdp in cdps.scalars().all():
        rps_data = []
        rps = await db.execute(
            select(RP).where(and_(RP.cdp_numero == cdp.numero, RP.estado != "ANULADO"))
            .order_by(RP.numero)
        )
        for rp in rps.scalars().all():
            obls_data = []
            obls = await db.execute(
                select(Obligacion).where(
                    and_(Obligacion.rp_numero == rp.numero, Obligacion.estado != "ANULADA")
                ).order_by(Obligacion.numero)
            )
            for obl in obls.scalars().all():
                pagos_data = []
                pagos = await db.execute(
                    select(Pago).where(
                        and_(Pago.obligacion_numero == obl.numero, Pago.estado != "ANULADO")
                    ).order_by(Pago.numero)
                )
                for pag in pagos.scalars().all():
                    pagos_data.append({
                        "numero": pag.numero, "fecha": pag.fecha,
                        "valor": pag.valor, "concepto": pag.concepto,
                    })
                obls_data.append({
                    "obligacion": {
                        "numero": obl.numero, "fecha": obl.fecha,
                        "valor": obl.valor, "factura": obl.factura, "estado": obl.estado,
                    },
                    "pagos": pagos_data,
                })
            rps_data.append({
                "rp": {
                    "numero": rp.numero, "fecha": rp.fecha,
                    "nit_tercero": rp.nit_tercero, "valor": rp.valor,
                    "objeto": rp.objeto, "estado": rp.estado,
                },
                "obligaciones": obls_data,
            })
        resultado.append({
            "cdp": {
                "numero": cdp.numero, "fecha": cdp.fecha,
                "codigo_rubro": cdp.codigo_rubro, "valor": cdp.valor,
                "objeto": cdp.objeto, "estado": cdp.estado,
            },
            "rps": rps_data,
        })

    return resultado


async def get_resumen(db: AsyncSession) -> dict:
    # Total apropiacion
    result = await db.execute(
        select(func.coalesce(func.sum(RubroGasto.apropiacion_definitiva), 0))
        .where(RubroGasto.es_hoja == 1)
    )
    total_aprop = result.scalar()

    # Total CDPs
    result = await db.execute(
        select(func.coalesce(func.sum(CDP.valor), 0)).where(CDP.estado != "ANULADO")
    )
    total_cdp = result.scalar()

    # Total comprometido (RP)
    result = await db.execute(
        select(func.coalesce(func.sum(RP.valor), 0)).where(RP.estado != "ANULADO")
    )
    total_comp = result.scalar()

    # Total obligado
    result = await db.execute(
        select(func.coalesce(func.sum(Obligacion.valor), 0)).where(Obligacion.estado != "ANULADA")
    )
    total_obl = result.scalar()

    # Total pagado
    result = await db.execute(
        select(func.coalesce(func.sum(Pago.valor), 0)).where(Pago.estado != "ANULADO")
    )
    total_pag = result.scalar()

    # Total ingresos
    result = await db.execute(
        select(func.coalesce(func.sum(RubroIngreso.presupuesto_definitivo), 0))
        .where(RubroIngreso.es_hoja == 1)
    )
    total_ing = result.scalar()

    # Total recaudado
    result = await db.execute(
        select(func.coalesce(func.sum(Recaudo.valor), 0)).where(Recaudo.estado != "ANULADO")
    )
    total_rec = result.scalar()

    return {
        "apropiacion": total_aprop,
        "cdp": total_cdp,
        "comprometido": total_comp,
        "obligado": total_obl,
        "pagado": total_pag,
        "saldo_disponible": total_aprop - total_cdp,
        "saldo_por_pagar": total_comp - total_pag,
        "ppto_ingresos": total_ing,
        "recaudado": total_rec,
        "saldo_por_recaudar": total_ing - total_rec,
        "equilibrio": total_ing - total_aprop,
    }


async def verificar_equilibrio(db: AsyncSession) -> dict:
    result = await db.execute(
        select(func.coalesce(func.sum(RubroGasto.apropiacion_definitiva), 0))
        .where(RubroGasto.es_hoja == 1)
    )
    total_gastos = result.scalar()

    result = await db.execute(
        select(func.coalesce(func.sum(RubroIngreso.presupuesto_definitivo), 0))
        .where(RubroIngreso.es_hoja == 1)
    )
    total_ingresos = result.scalar()

    return {
        "total_gastos": total_gastos,
        "total_ingresos": total_ingresos,
        "diferencia": total_ingresos - total_gastos,
    }
