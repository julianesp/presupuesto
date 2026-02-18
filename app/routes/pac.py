from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import pac as svc
from app.schemas.pac import PACUpdate, PACResumenRubroResponse, PACDisponibleResponse

router = APIRouter(prefix="/api/pac", tags=["PAC"])


@router.get("/resumen")
async def resumen(db: AsyncSession = Depends(get_db)):
    return await svc.get_resumen_pac(db)


@router.get("/{codigo_rubro}")
async def obtener(codigo_rubro: str, db: AsyncSession = Depends(get_db)):
    pac = await svc.get_pac(db, codigo_rubro)
    return pac


@router.get("/{codigo_rubro}/disponible/{mes}", response_model=PACDisponibleResponse)
async def disponible(codigo_rubro: str, mes: int, db: AsyncSession = Depends(get_db)):
    disp = await svc.get_pac_disponible(db, codigo_rubro, mes)
    return disp


@router.put("/{codigo_rubro}")
async def actualizar(codigo_rubro: str, data: PACUpdate, db: AsyncSession = Depends(get_db)):
    try:
        await svc.set_pac_completo(db, codigo_rubro, data.valores_mensuales)
        return {"message": "PAC actualizado"}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{codigo_rubro}/distribuir-uniforme")
async def distribuir(codigo_rubro: str, db: AsyncSession = Depends(get_db)):
    try:
        valores = await svc.distribuir_uniforme(db, codigo_rubro)
        return {"valores": valores}
    except ValueError as e:
        raise HTTPException(400, str(e))
