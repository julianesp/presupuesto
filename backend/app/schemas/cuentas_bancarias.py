from pydantic import BaseModel


class CuentaBancariaCreate(BaseModel):
    banco: str
    tipo_cuenta: str
    numero_cuenta: str
    denominacion: str = ""


class CuentaBancariaUpdate(BaseModel):
    banco: str | None = None
    tipo_cuenta: str | None = None
    numero_cuenta: str | None = None
    denominacion: str | None = None


class CuentaBancariaResponse(BaseModel):
    id: int
    banco: str
    tipo_cuenta: str
    numero_cuenta: str
    denominacion: str
    estado: str

    model_config = {"from_attributes": True}
