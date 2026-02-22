from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import modificaciones as svc
from app.schemas.modificaciones import (
    AdicionCreate, ReduccionCreate, CreditoContracreditoCreate,
    AplazamientoCreate, DesplazamientoCreate, ModificacionResponse,
)
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/modificaciones", tags=["Modificaciones"])


@router.get("", response_model=list[ModificacionResponse])
async def listar(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.listar(db, user.tenant_id)


@router.get("/{id_mod}", response_model=ModificacionResponse)
async def obtener(id_mod: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    mod = await svc.get_modificacion(db, user.tenant_id, id_mod)
    if not mod:
        raise HTTPException(404, "Modificacion no encontrada")
    return mod


@router.post("/adicion", status_code=201)
async def registrar_adicion(data: AdicionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        numero, fecha = await svc.registrar_adicion(
            db, user.tenant_id, data.codigo_gasto, data.codigo_ingreso, data.valor,
            data.numero_acto, data.descripcion
        )
        return {"numero": numero, "fecha": fecha}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/reduccion", status_code=201)
async def registrar_reduccion(data: ReduccionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        numero, fecha = await svc.registrar_reduccion(
            db, user.tenant_id, data.codigo_gasto, data.codigo_ingreso, data.valor,
            data.numero_acto, data.descripcion
        )
        return {"numero": numero, "fecha": fecha}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/credito-contracredito", status_code=201)
async def registrar_credito_contracredito(data: CreditoContracreditoCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        numero, fecha = await svc.registrar_credito_contracredito(
            db, user.tenant_id, data.codigo_credito, data.codigo_contracredito, data.valor,
            data.numero_acto, data.descripcion
        )
        return {"numero": numero, "fecha": fecha}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/aplazamiento", status_code=201)
async def registrar_aplazamiento(data: AplazamientoCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        numero, fecha = await svc.registrar_aplazamiento(
            db, user.tenant_id, data.codigo_rubro, data.valor,
            data.numero_acto, data.descripcion
        )
        return {"numero": numero, "fecha": fecha}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/desplazamiento", status_code=201)
async def registrar_desplazamiento(data: DesplazamientoCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        numero, fecha = await svc.registrar_desplazamiento(
            db, user.tenant_id, data.codigo_origen, data.codigo_destino, data.valor,
            data.numero_acto, data.descripcion
        )
        return {"numero": numero, "fecha": fecha}
    except ValueError as e:
        raise HTTPException(400, str(e))
