from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import consolidacion as svc

router = APIRouter(prefix="/api/consolidacion", tags=["Consolidacion"])


@router.post("/consolidar-mes")
async def consolidar_mes(db: AsyncSession = Depends(get_db)):
    mes, count = await svc.consolidar_mes(db)
    return {"mes": mes, "rubros_consolidados": count}


@router.post("/consolidar-ingresos")
async def consolidar_ingresos(db: AsyncSession = Depends(get_db)):
    mes, count = await svc.consolidar_mes_ingresos(db)
    return {"mes": mes, "rubros_consolidados": count}


@router.post("/cierre-mes")
async def cierre_mes(db: AsyncSession = Depends(get_db)):
    mes = await svc.cierre_mes(db)
    return {"mes_cerrado": mes}
