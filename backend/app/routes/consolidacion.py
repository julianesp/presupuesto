from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import consolidacion as svc
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/consolidacion", tags=["Consolidacion"])


@router.post("/consolidar-mes")
async def consolidar_mes(db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    mes, count = await svc.consolidar_mes(db, user.tenant_id)
    return {"mes": mes, "rubros_consolidados": count}


@router.post("/consolidar-ingresos")
async def consolidar_ingresos(db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    mes, count = await svc.consolidar_mes_ingresos(db, user.tenant_id)
    return {"mes": mes, "rubros_consolidados": count}


@router.post("/cierre-mes")
async def cierre_mes(db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    mes = await svc.cierre_mes(db, user.tenant_id)
    return {"mes_cerrado": mes}
