"""
Script para agregar usuarios administradores a la base de datos.
Uso: python add_admin_users.py
"""

import asyncio
import sys
from datetime import date
from pathlib import Path

# Agregar el directorio del backend al path para importar los módulos
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.tenant import Tenant, User
from app.config import get_settings


async def add_admin_users():
    """Agrega los usuarios administradores especificados."""
    
    settings = get_settings()
    
    # Crear engine y sesión
    engine = create_async_engine(settings.async_database_url, echo=True)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    # Emails de administradores
    admin_emails = [
        {"email": "marthacer7@gmail.com", "nombre": "Martha Cecilia"},
        {"email": "julii1295@gmail.com", "nombre": "Julian"},
    ]
    
    async with async_session() as session:
        # Obtener o crear tenant por defecto
        tenant_id = "00000000-0000-0000-0000-000000000001"
        stmt_t = select(Tenant).where(Tenant.id == tenant_id)
        result_t = await session.execute(stmt_t)
        tenant = result_t.scalar_one_or_none()
        
        if tenant is None:
            print(f"⚠️  Creando tenant por defecto...")
            tenant = Tenant(
                id=tenant_id,
                nombre="Institución Principal",
                nit="000000000-0",
                vigencia_actual=2026,
                estado="ACTIVO",
                fecha_creacion=str(date.today()),
            )
            session.add(tenant)
            await session.flush()
            print(f"✅ Tenant creado: {tenant.nombre}")
        else:
            print(f"✅ Usando tenant existente: {tenant.nombre}")
        
        # Agregar o actualizar usuarios
        for admin_data in admin_emails:
            email = admin_data["email"]
            nombre = admin_data["nombre"]
            
            # Verificar si el usuario ya existe
            stmt = select(User).where(User.email == email)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if user is None:
                # Crear nuevo usuario
                user = User(
                    tenant_id=tenant_id,
                    email=email,
                    nombre=nombre,
                    rol="ADMIN",
                    activo=True,
                    fecha_creacion=str(date.today()),
                )
                session.add(user)
                print(f"✅ Usuario creado: {email} con rol ADMIN")
            else:
                # Actualizar usuario existente
                user.rol = "ADMIN"
                user.activo = True
                print(f"✅ Usuario actualizado: {email} - rol cambiado a ADMIN")
        
        # Guardar cambios
        await session.commit()
        print("\n🎉 ¡Usuarios administradores agregados exitosamente!")
        print("\nUsuarios administradores:")
        for admin_data in admin_emails:
            print(f"  - {admin_data['email']}")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(add_admin_users())
