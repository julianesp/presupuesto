from datetime import date
from sqlalchemy import select, func, and_, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rubros import RubroGasto, RubroIngreso
from app.models.rp import RP
from app.models.pago import Pago
from app.models.recaudo import Recaudo
from app.models.pac import ConsolidacionMensual, ConsolidacionMensualIngresos
from app.services import config as config_svc


async def consolidar_mes(db: AsyncSession) -> tuple[int, int]:
    mes_actual = int(await config_svc.get_config(db, "mes_actual") or "1")
    vigencia = int(await config_svc.get_config(db, "vigencia") or "2026")

    hojas = await db.execute(
        select(RubroGasto).where(RubroGasto.es_hoja == 1)
    )
    rubros = hojas.scalars().all()
    count = 0

    for rubro in rubros:
        mes_col = func.cast(func.substr(RP.fecha, 6, 2), Integer)
        compromisos = await db.execute(
            select(func.coalesce(func.sum(RP.valor), 0)).where(
                and_(
                    RP.codigo_rubro == rubro.codigo,
                    RP.estado != "ANULADO",
                    mes_col == mes_actual,
                )
            )
        )
        comp_mes = compromisos.scalar()

        mes_col_p = func.cast(func.substr(Pago.fecha, 6, 2), Integer)
        pagos = await db.execute(
            select(func.coalesce(func.sum(Pago.valor), 0)).where(
                and_(
                    Pago.codigo_rubro == rubro.codigo,
                    Pago.estado != "ANULADO",
                    mes_col_p == mes_actual,
                )
            )
        )
        pag_mes = pagos.scalar()

        existing = await db.execute(
            select(ConsolidacionMensual).where(
                and_(
                    ConsolidacionMensual.mes == mes_actual,
                    ConsolidacionMensual.anio == vigencia,
                    ConsolidacionMensual.codigo_rubro == rubro.codigo,
                )
            )
        )
        row = existing.scalar_one_or_none()
        if row:
            row.compromisos_mes = comp_mes
            row.pagos_mes = pag_mes
            row.fecha_consolidacion = date.today().isoformat()
        else:
            db.add(ConsolidacionMensual(
                mes=mes_actual, anio=vigencia, codigo_rubro=rubro.codigo,
                compromisos_mes=comp_mes, pagos_mes=pag_mes,
                fecha_consolidacion=date.today().isoformat(),
            ))
        count += 1

    await db.commit()
    return mes_actual, count


async def consolidar_mes_ingresos(db: AsyncSession) -> tuple[int, int]:
    mes_actual = int(await config_svc.get_config(db, "mes_actual") or "1")
    vigencia = int(await config_svc.get_config(db, "vigencia") or "2026")

    hojas = await db.execute(
        select(RubroIngreso).where(RubroIngreso.es_hoja == 1)
    )
    rubros = hojas.scalars().all()
    count = 0

    for rubro in rubros:
        mes_col = func.cast(func.substr(Recaudo.fecha, 6, 2), Integer)
        recaudos = await db.execute(
            select(func.coalesce(func.sum(Recaudo.valor), 0)).where(
                and_(
                    Recaudo.codigo_rubro == rubro.codigo,
                    Recaudo.estado != "ANULADO",
                    mes_col == mes_actual,
                )
            )
        )
        rec_mes = recaudos.scalar()

        existing = await db.execute(
            select(ConsolidacionMensualIngresos).where(
                and_(
                    ConsolidacionMensualIngresos.mes == mes_actual,
                    ConsolidacionMensualIngresos.anio == vigencia,
                    ConsolidacionMensualIngresos.codigo_rubro == rubro.codigo,
                )
            )
        )
        row = existing.scalar_one_or_none()
        if row:
            row.recaudo_mes = rec_mes
            row.fecha_consolidacion = date.today().isoformat()
        else:
            db.add(ConsolidacionMensualIngresos(
                mes=mes_actual, anio=vigencia, codigo_rubro=rubro.codigo,
                recaudo_mes=rec_mes,
                fecha_consolidacion=date.today().isoformat(),
            ))
        count += 1

    await db.commit()
    return mes_actual, count


async def cierre_mes(db: AsyncSession) -> int:
    await consolidar_mes(db)
    await consolidar_mes_ingresos(db)
    mes_actual = int(await config_svc.get_config(db, "mes_actual") or "1")
    await config_svc.set_config(db, "mes_actual", str(mes_actual + 1))
    return mes_actual
