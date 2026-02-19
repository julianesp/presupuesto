from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import config as svc
from app.schemas.config import ConfigUpdate, ConfigResponse

router = APIRouter(prefix="/api/config", tags=["Configuracion"])


@router.get("", response_model=ConfigResponse)
async def obtener(db: AsyncSession = Depends(get_db)):
    all_config = await svc.get_all_config(db)
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
async def actualizar(data: ConfigUpdate, db: AsyncSession = Depends(get_db)):
    updates = data.model_dump(exclude_none=True)
    for clave, valor in updates.items():
        await svc.set_config(db, clave, valor)
    return {"message": "Configuracion actualizada"}
