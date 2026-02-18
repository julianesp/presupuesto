from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import rubros_ingresos as svc
from app.schemas.rubros import RubroIngresoCreate, RubroIngresoUpdate, RubroIngresoResponse

router = APIRouter(prefix="/api/rubros-ingresos", tags=["Rubros Ingresos"])


@router.get("", response_model=list[RubroIngresoResponse])
async def listar(solo_hojas: bool = False, db: AsyncSession = Depends(get_db)):
    rubros = await svc.get_rubros(db, solo_hojas=solo_hojas)
    result = []
    for r in rubros:
        data = RubroIngresoResponse.model_validate(r)
        data.saldo_por_recaudar = await svc.saldo_por_recaudar(db, r.codigo)
        result.append(data)
    return result


@router.get("/buscar", response_model=list[RubroIngresoResponse])
async def buscar(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    return await svc.buscar(db, q)


@router.get("/{codigo}", response_model=RubroIngresoResponse)
async def obtener(codigo: str, db: AsyncSession = Depends(get_db)):
    rubro = await svc.get_rubro(db, codigo)
    if not rubro:
        raise HTTPException(404, "Rubro no encontrado")
    data = RubroIngresoResponse.model_validate(rubro)
    data.saldo_por_recaudar = await svc.saldo_por_recaudar(db, codigo)
    return data


@router.post("", response_model=RubroIngresoResponse, status_code=201)
async def crear(data: RubroIngresoCreate, db: AsyncSession = Depends(get_db)):
    try:
        rubro = await svc.crear(db, data.codigo, data.cuenta, data.apropiacion_definitiva, data.apropiacion_inicial)
        return RubroIngresoResponse.model_validate(rubro)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{codigo}", response_model=RubroIngresoResponse)
async def editar(codigo: str, data: RubroIngresoUpdate, db: AsyncSession = Depends(get_db)):
    try:
        rubro = await svc.editar(db, codigo, data.cuenta, data.apropiacion_definitiva, data.apropiacion_inicial)
        return RubroIngresoResponse.model_validate(rubro)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/{codigo}", status_code=204)
async def eliminar(codigo: str, db: AsyncSession = Depends(get_db)):
    try:
        await svc.eliminar(db, codigo)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/sincronizar-padres", status_code=200)
async def sincronizar_padres(db: AsyncSession = Depends(get_db)):
    await svc.sincronizar_padres(db)
    return {"message": "Padres sincronizados"}
