from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./presupuesto.db"
    SECRET_KEY: str = "dev-secret-key-cambiar-en-produccion"
    CORS_ORIGINS: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"

    # Clerk Authentication (reemplaza Cloudflare Access)
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""

    # Cloudflare Access (legacy - mantener para compatibilidad)
    CF_TEAM_DOMAIN: str = ""   # e.g. "mi-equipo.cloudflareaccess.com" (solo producción)
    CF_AUD: str = ""            # Audience tag de la aplicación en CF Access (solo producción)

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    @property
    def async_database_url(self) -> str:
        """Convierte la URL de PostgreSQL de Render al formato async requerido."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
