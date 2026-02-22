from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import sifse as svc
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/sifse", tags=["SIFSE"])


@router.get("/catalogo-fuentes")
async def catalogo_fuentes(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.get_catalogo_fuentes(db)


@router.get("/catalogo-items")
async def catalogo_items(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.get_catalogo_items(db)


@router.get("/mapeos-ingresos")
async def mapeos_ingresos(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.get_todos_mapeos_ingresos(db, user.tenant_id)


@router.get("/mapeos-gastos")
async def mapeos_gastos(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.get_todos_mapeos_gastos(db, user.tenant_id)


@router.put("/mapeo-ingreso/{codigo_rubro}")
async def set_mapeo_ingreso(codigo_rubro: str, sifse_fuente: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    await svc.set_mapeo_ingreso(db, user.tenant_id, codigo_rubro, sifse_fuente)
    return {"message": "Mapeo actualizado"}


@router.put("/mapeo-gasto/{codigo_rubro}")
async def set_mapeo_gasto(codigo_rubro: str, sifse_item: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    await svc.set_mapeo_gasto(db, user.tenant_id, codigo_rubro, sifse_item)
    return {"message": "Mapeo actualizado"}
