import asyncio
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# Importar todos los modelos para que Alembic los detecte en autogenerate
from app.database import Base
from app.config import get_settings

# Importar todos los modelos (necesario para autogenerate)
import app.models.tenant          # noqa: F401
import app.models.rubros          # noqa: F401
import app.models.cdp             # noqa: F401
import app.models.rp              # noqa: F401
import app.models.obligacion      # noqa: F401
import app.models.pago            # noqa: F401
import app.models.recaudo         # noqa: F401
import app.models.reconocimiento  # noqa: F401
import app.models.terceros        # noqa: F401
import app.models.cuentas_bancarias  # noqa: F401
import app.models.pac             # noqa: F401
import app.models.config          # noqa: F401
import app.models.modificaciones  # noqa: F401
import app.models.conceptos       # noqa: F401
import app.models.sifse           # noqa: F401

# Alembic Config
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    return get_settings().async_database_url


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    """Modo offline: genera SQL sin conectarse."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Modo online con motor async (aiosqlite o asyncpg)."""
    connectable = create_async_engine(get_url(), echo=False)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
