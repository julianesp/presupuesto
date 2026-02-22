"""
Sistema Presupuestal - Backend API
FastAPI + SQLAlchemy Async
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base, AsyncSessionLocal
from app.services.config import init_config_defaults
from app.services.sifse import poblar_catalogos

from app.routes import (
    auth,
    admin,
    rubros_gastos,
    rubros_ingresos,
    terceros,
    cdp,
    rp,
    obligaciones,
    pagos,
    recaudos,
    reconocimiento,
    modificaciones,
    pac,
    informes,
    config,
    cuentas_bancarias,
    dashboard,
    sifse,
    importacion,
    consolidacion,
    backup,
    comprobantes,
    ia,
)


DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: crear tablas y datos iniciales
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from app.models.tenant import Tenant, User
        from sqlalchemy import select
        from datetime import date

        # Crear tenant default si no existe
        result = await db.execute(select(Tenant).where(Tenant.id == DEFAULT_TENANT_ID))
        tenant = result.scalar_one_or_none()
        if tenant is None:
            tenant = Tenant(
                id=DEFAULT_TENANT_ID,
                nombre="Institución Principal",
                nit="000000000-0",
                vigencia_actual=2026,
                estado="ACTIVO",
                fecha_creacion=str(date.today()),
            )
            db.add(tenant)
            await db.flush()

        # Crear usuario admin default si no existe
        result_u = await db.execute(select(User).where(User.email == "admin@localhost"))
        if result_u.scalar_one_or_none() is None:
            db.add(User(
                tenant_id=DEFAULT_TENANT_ID,
                email="admin@localhost",
                nombre="Administrador",
                rol="ADMIN",
                activo=True,
                fecha_creacion=str(date.today()),
            ))
        await db.commit()

        # Inicializar configuración y catálogos SIFSE
        await init_config_defaults(db, DEFAULT_TENANT_ID)
        await poblar_catalogos(db)

    yield

    # Shutdown
    await engine.dispose()


settings = get_settings()

app = FastAPI(
    title="Sistema Presupuestal API",
    description="API REST para el Sistema Presupuestal de Instituciones Educativas",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(dashboard.router)
app.include_router(rubros_gastos.router)
app.include_router(rubros_ingresos.router)
app.include_router(terceros.router)
app.include_router(cdp.router)
app.include_router(rp.router)
app.include_router(obligaciones.router)
app.include_router(pagos.router)
app.include_router(recaudos.router)
app.include_router(reconocimiento.router)
app.include_router(modificaciones.router)
app.include_router(pac.router)
app.include_router(informes.router)
app.include_router(config.router)
app.include_router(cuentas_bancarias.router)
app.include_router(sifse.router)
app.include_router(importacion.router)
app.include_router(consolidacion.router)
app.include_router(backup.router)
app.include_router(comprobantes.router)
app.include_router(ia.router)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "app": "Sistema Presupuestal API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
