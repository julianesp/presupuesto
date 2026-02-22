from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import rubros_ingresos as svc
from app.schemas.rubros import RubroIngresoCreate, RubroIngresoUpdate, RubroIngresoResponse
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/rubros-ingresos", tags=["Rubros Ingresos"])


@router.get("", response_model=list[RubroIngresoResponse])
async def listar(solo_hojas: bool = False, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rubros = await svc.get_rubros(db, user.tenant_id, solo_hojas=solo_hojas)
    result = []
    for r in rubros:
        data = RubroIngresoResponse.model_validate(r)
        data.saldo_por_recaudar = await svc.saldo_por_recaudar(db, user.tenant_id, r.codigo)
        result.append(data)
    return result


@router.get("/buscar", response_model=list[RubroIngresoResponse])
async def buscar(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.buscar(db, user.tenant_id, q)


@router.get("/{codigo}", response_model=RubroIngresoResponse)
async def obtener(codigo: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rubro = await svc.get_rubro(db, user.tenant_id, codigo)
    if not rubro:
        raise HTTPException(404, "Rubro no encontrado")
    data = RubroIngresoResponse.model_validate(rubro)
    data.saldo_por_recaudar = await svc.saldo_por_recaudar(db, user.tenant_id, codigo)
    return data


@router.post("", response_model=RubroIngresoResponse, status_code=201)
async def crear(data: RubroIngresoCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        rubro = await svc.crear(db, user.tenant_id, data.codigo, data.cuenta, data.presupuesto_definitivo, data.presupuesto_inicial)
        return RubroIngresoResponse.model_validate(rubro)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{codigo}", response_model=RubroIngresoResponse)
async def editar(codigo: str, data: RubroIngresoUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        rubro = await svc.editar(db, user.tenant_id, codigo, data.cuenta, data.presupuesto_definitivo, data.presupuesto_inicial)
        return RubroIngresoResponse.model_validate(rubro)
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
