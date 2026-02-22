from pydantic import BaseModel, EmailStr


class TenantInfo(BaseModel):
    id: str
    nombre: str
    nit: str
    vigencia_actual: int
    estado: str

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: int
    email: str
    nombre: str
    cargo: str | None
    rol: str
    tenant: TenantInfo

    model_config = {"from_attributes": True}


class TenantCreate(BaseModel):
    nombre: str
    nit: str
    codigo_dane: str | None = None
    vigencia_actual: int = 2026


class UserCreate(BaseModel):
    email: str
    nombre: str
    cargo: str | None = None
    rol: str = "CONSULTA"


class UserUpdate(BaseModel):
    nombre: str | None = None
    cargo: str | None = None
    rol: str | None = None
    activo: bool | None = None
