"""
Rutas de administración de la institución.
Solo accesibles por usuarios con rol ADMIN.
"""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.database import get_db
from app.models.tenant import Tenant, User
from app.schemas.auth import TenantCreate, TenantInfo, UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ─── Tenants ──────────────────────────────────────────────────────────────────

@router.get("/tenants", response_model=list[TenantInfo])
async def listar_tenants(
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lista todos los tenants (solo para super-admin futuro; por ahora retorna el propio)."""
    stmt = select(Tenant).where(Tenant.id == admin.tenant_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/tenants", response_model=TenantInfo, status_code=201)
async def crear_tenant(
    data: TenantCreate,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Crea una nueva institución (tenant). Solo super-admin."""
    # Verificar que el NIT no exista
    stmt = select(Tenant).where(Tenant.nit == data.nit)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un tenant con NIT {data.nit}")

    tenant = Tenant(
        id=str(uuid.uuid4()),
        nombre=data.nombre,
        nit=data.nit,
        codigo_dane=data.codigo_dane,
        vigencia_actual=data.vigencia_actual,
        estado="ACTIVO",
        fecha_creacion=str(date.today()),
    )
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return tenant


# ─── Usuarios ─────────────────────────────────────────────────────────────────

@router.get("/usuarios", response_model=list[UserResponse])
async def listar_usuarios(
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lista todos los usuarios de la misma institución."""
    stmt = select(User).where(User.tenant_id == admin.tenant_id).order_by(User.nombre)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/usuarios", response_model=UserResponse, status_code=201)
async def crear_usuario(
    data: UserCreate,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Crea un usuario en la misma institución del admin."""
    # Verificar email único
    stmt = select(User).where(User.email == data.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un usuario con email {data.email}")

    if data.rol not in ("ADMIN", "TESORERO", "CONSULTA"):
        raise HTTPException(status_code=400, detail="Rol inválido. Debe ser ADMIN, TESORERO o CONSULTA")

    user = User(
        tenant_id=admin.tenant_id,
        email=data.email,
        nombre=data.nombre,
        cargo=data.cargo,
        rol=data.rol,
        activo=True,
        fecha_creacion=str(date.today()),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/usuarios/{user_id}", response_model=UserResponse)
async def editar_usuario(
    user_id: int,
    data: UserUpdate,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Edita un usuario de la misma institución."""
    stmt = select(User).where(User.id == user_id, User.tenant_id == admin.tenant_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if data.nombre is not None:
        user.nombre = data.nombre
    if data.cargo is not None:
        user.cargo = data.cargo
    if data.rol is not None:
        if data.rol not in ("ADMIN", "TESORERO", "CONSULTA"):
            raise HTTPException(status_code=400, detail="Rol inválido")
        user.rol = data.rol
    if data.activo is not None:
        user.activo = data.activo

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/usuarios/{user_id}", status_code=204)
async def eliminar_usuario(
    user_id: int,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Desactiva un usuario (no elimina físicamente)."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="No puede desactivarse a sí mismo")

    stmt = select(User).where(User.id == user_id, User.tenant_id == admin.tenant_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.activo = False
    await db.commit()
