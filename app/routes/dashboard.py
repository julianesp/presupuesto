from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import informes as svc
from app.schemas.dashboard import DashboardResumen

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/resumen", response_model=DashboardResumen)
async def resumen(db: AsyncSession = Depends(get_db)):
    return await svc.get_resumen(db)
