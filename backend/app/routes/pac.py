from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import pac as svc
from app.schemas.pac import PACUpdate, PACResumenRubroResponse, PACDisponibleResponse
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/pac", tags=["PAC"])


@router.get("/resumen", response_model=list[PACResumenRubroResponse])
async def resumen(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.get_resumen_pac(db, user.tenant_id)


@router.get("/{codigo_rubro}")
async def obtener(codigo_rubro: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    pac = await svc.get_pac(db, user.tenant_id, codigo_rubro)
    return pac


@router.get("/{codigo_rubro}/disponible/{mes}", response_model=PACDisponibleResponse)
async def disponible(codigo_rubro: str, mes: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    disp = await svc.get_pac_disponible(db, user.tenant_id, codigo_rubro, mes)
    return disp


@router.put("/{codigo_rubro}")
async def actualizar(codigo_rubro: str, data: PACUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        await svc.set_pac_completo(db, user.tenant_id, codigo_rubro, data.valores_mensuales)
        return {"message": "PAC actualizado"}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{codigo_rubro}/distribuir-uniforme")
async def distribuir(codigo_rubro: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        valores = await svc.distribuir_uniforme(db, user.tenant_id, codigo_rubro)
        return {"valores": valores}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/distribuir-uniforme-todos")
async def distribuir_todos(db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    cantidad = await svc.distribuir_uniforme_todos(db, user.tenant_id)
    return {"message": f"PAC distribuido para {cantidad} rubro(s)"}
