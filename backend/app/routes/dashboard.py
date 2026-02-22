from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import informes as svc
from app.schemas.dashboard import DashboardResumen
from app.auth.dependencies import get_current_user
from app.models.tenant import User

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/resumen", response_model=DashboardResumen)
async def resumen(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.get_resumen(db, user.tenant_id)
