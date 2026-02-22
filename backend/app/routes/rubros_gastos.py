from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import rubros_gastos as svc
from app.schemas.rubros import RubroGastoCreate, RubroGastoUpdate, RubroGastoResponse
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/rubros-gastos", tags=["Rubros Gastos"])


@router.get("", response_model=list[RubroGastoResponse])
async def listar(solo_hojas: bool = False, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rubros = await svc.get_rubros(db, user.tenant_id, solo_hojas=solo_hojas)
    result = []
    for r in rubros:
        data = RubroGastoResponse.model_validate(r)
        data.saldo_disponible = await svc.saldo_disponible(db, user.tenant_id, r.codigo)
        result.append(data)
    return result


@router.get("/buscar", response_model=list[RubroGastoResponse])
async def buscar(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.buscar(db, user.tenant_id, q)


@router.get("/{codigo}", response_model=RubroGastoResponse)
async def obtener(codigo: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rubro = await svc.get_rubro(db, user.tenant_id, codigo)
    if not rubro:
        raise HTTPException(404, "Rubro no encontrado")
    data = RubroGastoResponse.model_validate(rubro)
    data.saldo_disponible = await svc.saldo_disponible(db, user.tenant_id, codigo)
    return data


@router.post("", response_model=RubroGastoResponse, status_code=201)
async def crear(data: RubroGastoCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        rubro = await svc.crear(db, user.tenant_id, data.codigo, data.cuenta, data.apropiacion_definitiva, data.apropiacion_inicial)
        return RubroGastoResponse.model_validate(rubro)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{codigo}", response_model=RubroGastoResponse)
async def editar(codigo: str, data: RubroGastoUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        rubro = await svc.editar(db, user.tenant_id, codigo, data.cuenta, data.apropiacion_definitiva, data.apropiacion_inicial)
        return RubroGastoResponse.model_validate(rubro)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/{codigo}", status_code=204)
async def eliminar(codigo: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        await svc.eliminar(db, user.tenant_id, codigo)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/sincronizar-padres", status_code=200)
async def sincronizar_padres(db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    await svc.sincronizar_padres(db, user.tenant_id)
    return {"message": "Padres sincronizados"}
