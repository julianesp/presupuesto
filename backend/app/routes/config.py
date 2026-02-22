from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import config as svc
from app.schemas.config import ConfigUpdate, ConfigResponse
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/config", tags=["Configuracion"])


@router.get("", response_model=ConfigResponse)
async def obtener(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    all_config = await svc.get_all_config(db, user.tenant_id)
    return ConfigResponse(
        vigencia=all_config.get("vigencia", ""),
        institucion=all_config.get("institucion", ""),
        nit_institucion=all_config.get("nit_institucion", ""),
        rector=all_config.get("rector", ""),
        tesorero=all_config.get("tesorero", ""),
        mes_actual=all_config.get("mes_actual", "1"),
        codigo_dane=all_config.get("codigo_dane", ""),
    )


@router.put("")
async def actualizar(data: ConfigUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    updates = data.model_dump(exclude_none=True)
    for clave, valor in updates.items():
        await svc.set_config(db, user.tenant_id, clave, valor)
    return {"message": "Configuracion actualizada"}


@router.post("/apertura-vigencia")
async def apertura_vigencia(
    anio: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    try:
        return await svc.apertura_vigencia(db, user.tenant_id, anio)
    except Exception as e:
        raise HTTPException(400, str(e))
