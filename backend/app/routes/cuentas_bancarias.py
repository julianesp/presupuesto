from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import cuentas_bancarias as svc
from app.schemas.cuentas_bancarias import CuentaBancariaCreate, CuentaBancariaUpdate, CuentaBancariaResponse
from app.auth.dependencies import get_current_user, require_escritura, require_admin
from app.models.tenant import User

router = APIRouter(prefix="/api/cuentas-bancarias", tags=["Cuentas Bancarias"])


@router.get("", response_model=list[CuentaBancariaResponse])
async def listar(solo_activas: bool = True, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await svc.listar(db, user.tenant_id, solo_activas=solo_activas)


@router.post("", response_model=CuentaBancariaResponse, status_code=201)
async def crear(data: CuentaBancariaCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    return await svc.crear(db, user.tenant_id, data.banco, data.tipo_cuenta, data.numero_cuenta, data.denominacion)


@router.put("/{id}", response_model=CuentaBancariaResponse)
async def editar(id: int, data: CuentaBancariaUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        cuenta = await svc.get_cuenta(db, user.tenant_id, id)
        if not cuenta:
            raise HTTPException(404, "Cuenta no encontrada")
        return await svc.editar(
            db, user.tenant_id, id,
            data.banco or cuenta.banco,
            data.tipo_cuenta or cuenta.tipo_cuenta,
            data.numero_cuenta or cuenta.numero_cuenta,
            data.denominacion if data.denominacion is not None else cuenta.denominacion,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/{id}", status_code=204)
async def desactivar(id: int, db: AsyncSession = Depends(get_db), user: User = Depends(require_escritura)):
    try:
        await svc.desactivar(db, user.tenant_id, id)
    except ValueError as e:
        raise HTTPException(400, str(e))
