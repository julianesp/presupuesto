from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import informes as svc

router = APIRouter(prefix="/api/informes", tags=["Informes"])


@router.get("/ejecucion-gastos")
async def ejecucion_gastos(mes: int | None = None, db: AsyncSession = Depends(get_db)):
    return await svc.informe_ejecucion_gastos(db, mes_consulta=mes)


@router.get("/ejecucion-ingresos")
async def ejecucion_ingresos(mes: int | None = None, db: AsyncSession = Depends(get_db)):
    return await svc.informe_ejecucion_ingresos(db, mes_consulta=mes)


@router.get("/tarjeta/{codigo_rubro}")
async def tarjeta(codigo_rubro: str, db: AsyncSession = Depends(get_db)):
    try:
        return await svc.generar_tarjeta(db, codigo_rubro)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/cadena-presupuestal")
async def cadena(db: AsyncSession = Depends(get_db)):
    return await svc.informe_cadena_presupuestal(db)


@router.get("/resumen-rubro/{codigo_rubro}")
async def resumen_rubro(codigo_rubro: str, mes_inicio: int = 1, mes_fin: int = 12, db: AsyncSession = Depends(get_db)):
    try:
        return await svc.resumen_rubro(db, codigo_rubro, mes_inicio, mes_fin)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/equilibrio")
async def equilibrio(db: AsyncSession = Depends(get_db)):
    return await svc.verificar_equilibrio(db)
