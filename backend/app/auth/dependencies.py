"""
Dependencias FastAPI para autenticación y autorización.

En desarrollo (ENVIRONMENT=development):
  - Se acepta el header X-Dev-Email sin verificar JWT.
  - Si el usuario no existe en la DB, se crea automáticamente con rol ADMIN.

En producción (ENVIRONMENT=production):
  - Se verifica el JWT de Clerk en el header Authorization: Bearer <token>.
  - El usuario debe existir en la tabla users (el admin lo crea previamente).
"""

import uuid
from datetime import date

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.clerk_auth import verify_clerk_token
from app.config import get_settings
from app.database import get_db

# Import diferido para evitar circular imports con models
# Los modelos se importan dentro de las funciones


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna el User autenticado.
    - Dev: lee X-Dev-Email, crea user/tenant automáticamente si no existe.
    - Prod: verifica JWT de Clerk, busca user en DB.
    """
    # Import local para evitar circular imports
    from app.models.tenant import Tenant, User

    settings = get_settings()

    if settings.ENVIRONMENT == "development":
        email = request.headers.get("X-Dev-Email", "admin@localhost")
        return await _get_or_create_dev_user(db, email)

    # Producción: verificar Clerk JWT
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticación requerido")

    token = auth_header.removeprefix("Bearer ")
    try:
        payload = await verify_clerk_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    # Clerk almacena el email en diferentes campos dependiendo de la configuración
    # Intentar obtener el email de varios campos posibles
    email = (
        payload.get("email") or
        payload.get("primary_email_address_id") or
        payload.get("sub", "")
    )

    # Si el email no está directamente en el payload, puede estar en el campo 'email_verified'
    # o necesitamos extraerlo del 'sub' que tiene formato: user_xxxxx
    if not email or not "@" in str(email):
        # En Clerk, a veces necesitamos usar metadata adicional
        # Por ahora, si no encontramos email, rechazamos
        raise HTTPException(status_code=401, detail="El token no contiene email válido")

    stmt = select(User).where(User.email == email, User.activo == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Usuario no autorizado. Contacte al administrador de su institución.",
        )
    return user


async def _get_or_create_dev_user(db: AsyncSession, email: str):
    """Busca o crea automáticamente un usuario dev con tenant default."""
    from app.models.tenant import Tenant, User

    # Buscar usuario existente
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user:
        return user

    # Crear tenant default si no existe
    tenant_id = "00000000-0000-0000-0000-000000000001"
    stmt_t = select(Tenant).where(Tenant.id == tenant_id)
    result_t = await db.execute(stmt_t)
    tenant = result_t.scalar_one_or_none()
    if tenant is None:
        tenant = Tenant(
            id=tenant_id,
            nombre="Institución de Desarrollo",
            nit="000000000-0",
            vigencia_actual=2026,
            estado="ACTIVO",
            fecha_creacion=str(date.today()),
        )
        db.add(tenant)
        await db.flush()

    # Crear usuario admin dev
    user = User(
        tenant_id=tenant_id,
        email=email,
        nombre="Administrador Dev",
        rol="ADMIN",
        activo=True,
        fecha_creacion=str(date.today()),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def require_escritura(user=Depends(get_current_user)):
    """Requiere rol ADMIN o TESORERO. El rol CONSULTA solo puede leer."""
    if user.rol not in ("ADMIN", "TESORERO"):
        raise HTTPException(
            status_code=403,
            detail="Se requiere rol ADMIN o TESORERO para esta operación.",
        )
    return user


async def require_admin(user=Depends(get_current_user)):
    """Requiere rol ADMIN."""
    if user.rol != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Se requiere rol ADMIN para esta operación.",
        )
    return user
