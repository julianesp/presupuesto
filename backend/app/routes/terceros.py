from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import terceros as svc
from app.schemas.terceros import TerceroCreate, TerceroResponse
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/terceros", tags=["Terceros"])


@router.get("", response_model=list[TerceroResponse])
async def listar(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.get_terceros(db, user.tenant_id)


@router.get("/buscar", response_model=list[TerceroResponse])
async def buscar(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.buscar(db, user.tenant_id, q)


@router.get("/{nit}", response_model=TerceroResponse)
async def obtener(nit: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    tercero = await svc.get_tercero(db, user.tenant_id, nit)
    if not tercero:
        raise HTTPException(404, "Tercero no encontrado")
    return tercero


@router.post("", response_model=TerceroResponse, status_code=201)
async def crear(data: TerceroCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    return await svc.guardar(
        db, user.tenant_id, data.nit, data.dv, data.nombre, data.direccion,
        data.telefono, data.email, data.tipo, data.banco,
        data.tipo_cuenta, data.no_cuenta
    )


@router.put("/{nit}", response_model=TerceroResponse)
async def actualizar(nit: str, data: TerceroCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    tercero = await svc.actualizar(db, user.tenant_id, nit, data.model_dump(exclude_unset=True))
    if not tercero:
        raise HTTPException(404, "Tercero no encontrado")
    return tercero


@router.delete("/{nit}", status_code=204)
async def eliminar(nit: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    if not await svc.eliminar(db, user.tenant_id, nit):
        raise HTTPException(404, "Tercero no encontrado")
