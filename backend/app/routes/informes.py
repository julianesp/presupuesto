from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import informes as svc
from app.services import config as config_svc
from app.auth.dependencies import get_current_user
from app.models.tenant import User

router = APIRouter(prefix="/api/informes", tags=["Informes"])


@router.get("/ejecucion-gastos")
async def ejecucion_gastos(mes: int | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.informe_ejecucion_gastos(db, user.tenant_id, mes_consulta=mes)


@router.get("/ejecucion-ingresos")
async def ejecucion_ingresos(mes: int | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.informe_ejecucion_ingresos(db, user.tenant_id, mes_consulta=mes)


@router.get("/tarjeta/{codigo_rubro}")
async def tarjeta(codigo_rubro: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        return await svc.generar_tarjeta(db, user.tenant_id, codigo_rubro)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/cadena-presupuestal")
async def cadena(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.informe_cadena_presupuestal(db, user.tenant_id)


@router.get("/resumen-rubro/{codigo_rubro}")
async def resumen_rubro(codigo_rubro: str, mes_inicio: int = 1, mes_fin: int = 12, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        return await svc.resumen_rubro(db, user.tenant_id, codigo_rubro, mes_inicio, mes_fin)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/equilibrio")
async def equilibrio(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.verificar_equilibrio(db, user.tenant_id)


# ── SIA Contraloría ──────────────────────────────────────────────────────────

@router.get("/sia/gastos")
async def sia_gastos(
    mes: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await svc.informe_sia_gastos(db, user.tenant_id, mes_consulta=mes)


@router.get("/sia/ingresos")
async def sia_ingresos(
    mes: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await svc.informe_ejecucion_ingresos(db, user.tenant_id, mes_consulta=mes)


@router.get("/sia/excel")
async def sia_excel(
    mes: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    nombre = await config_svc.get_config(db, user.tenant_id, "nombre_institucion") or "INSTITUCIÓN"
    vigencia_str = await config_svc.get_config(db, user.tenant_id, "vigencia") or "2026"
    data = await svc.generar_sia_excel(
        db, user.tenant_id,
        mes_consulta=mes,
        nombre_institucion=nombre,
        vigencia=int(vigencia_str),
    )
    mes_str = f"_mes{mes}" if mes else ""
    return StreamingResponse(
        iter([data]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=SIA_Contraloria{mes_str}.xlsx"},
    )


# ─── SIA Contraloría — Exportación CSV por formato ───────────────────────────

async def _mes_anio(db, tenant_id, mes):
    if mes is None:
        mes = int(await config_svc.get_config(db, tenant_id, "mes_actual") or "1")
    anio = await config_svc.get_config(db, tenant_id, "vigencia") or "2026"
    return mes, anio


def _csv_response(data: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(
        iter([data]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/sia/csv/f03")
async def sia_csv_f03(
    mes: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mes, anio = await _mes_anio(db, user.tenant_id, mes)
    institucion = await config_svc.get_config(db, user.tenant_id, "nombre_institucion") or "INSTITUCIÓN"
    data = await svc.generar_sia_csv_f03(db, user.tenant_id, mes, anio, institucion)
    return _csv_response(data, f"F03_MovBancos_{anio}_Ene_a_{mes:02d}.csv")


@router.get("/sia/csv/f7b")
async def sia_csv_f7b(
    mes: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mes, anio = await _mes_anio(db, user.tenant_id, mes)
    data = await svc.generar_sia_csv_f7b(db, user.tenant_id, mes, anio)
    return _csv_response(data, f"F7B_Pagos_{anio}_Ene_a_{mes:02d}.csv")


@router.get("/sia/csv/f08a-gastos")
async def sia_csv_f08a_gastos(
    mes: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mes, anio = await _mes_anio(db, user.tenant_id, mes)
    data = await svc.generar_sia_csv_f08a(db, user.tenant_id, mes, anio, "GASTO")
    return _csv_response(data, f"F08A_Modif_Gastos_{anio}_Ene_a_{mes:02d}.csv")


@router.get("/sia/csv/f08a-ingresos")
async def sia_csv_f08a_ingresos(
    mes: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mes, anio = await _mes_anio(db, user.tenant_id, mes)
    data = await svc.generar_sia_csv_f08a(db, user.tenant_id, mes, anio, "INGRESO")
    return _csv_response(data, f"F08A_Modif_Ingresos_{anio}_Ene_a_{mes:02d}.csv")


@router.get("/sia/csv/f09")
async def sia_csv_f09(
    mes: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mes, anio = await _mes_anio(db, user.tenant_id, mes)
    data = await svc.generar_sia_csv_f09(db, user.tenant_id, mes, anio)
    return _csv_response(data, f"F09_PAC_{anio}_Ene_a_{mes:02d}.csv")


@router.get("/sia/csv/f13a")
async def sia_csv_f13a(
    mes: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    mes, anio = await _mes_anio(db, user.tenant_id, mes)
    data = await svc.generar_sia_csv_f13a(db, user.tenant_id, mes, anio)
    return _csv_response(data, f"F13A_Contratacion_{anio}_Ene_a_{mes:02d}.csv")


@router.get("/cuentas-por-pagar")
async def cuentas_por_pagar(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.cuentas_por_pagar(db, user.tenant_id)


@router.get("/pac-vs-ejecutado")
async def pac_vs_ejecutado(
    mes: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await svc.pac_vs_ejecutado(db, user.tenant_id, mes_corte=mes)


@router.get("/tercero/{nit}")
async def informe_tercero(
    nit: str,
    mes_inicio: int = 1,
    mes_fin: int = 12,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return await svc.informe_tercero(db, user.tenant_id, nit, mes_inicio, mes_fin)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/sia/csv/todos")
async def sia_csv_todos(
    mes: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data, anio, _ = await svc.generar_sia_zip(db, user.tenant_id, mes_consulta=mes)
    mes_str = f"_mes{mes}" if mes else ""
    return StreamingResponse(
        iter([data]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="SIA_Contraloria_{anio}{mes_str}.zip"'},
    )
