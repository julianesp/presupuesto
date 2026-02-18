from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import importacion as svc

router = APIRouter(prefix="/api/importacion", tags=["Importacion"])


@router.post("/catalogo-excel")
async def importar_excel(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        content = await file.read()
        result = await svc.importar_catalogo_excel(db, content)
        return result
    except Exception as e:
        raise HTTPException(400, f"Error al importar: {e}")


@router.post("/csv/rubros-gastos")
async def importar_rubros_gastos(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        content = (await file.read()).decode("utf-8")
        return await svc.importar_rubros_gastos_csv(db, content)
    except Exception as e:
        raise HTTPException(400, f"Error al importar: {e}")


@router.post("/csv/rubros-ingresos")
async def importar_rubros_ingresos(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        content = (await file.read()).decode("utf-8")
        return await svc.importar_rubros_ingresos_csv(db, content)
    except Exception as e:
        raise HTTPException(400, f"Error al importar: {e}")


@router.post("/csv/terceros")
async def importar_terceros(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        content = (await file.read()).decode("utf-8")
        return await svc.importar_terceros_csv(db, content)
    except Exception as e:
        raise HTTPException(400, f"Error al importar: {e}")
