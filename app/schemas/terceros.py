from pydantic import BaseModel


class TerceroCreate(BaseModel):
    nit: str
    dv: str = ""
    nombre: str
    direccion: str = ""
    telefono: str = ""
    email: str = ""
    tipo: str = "Natural"
    banco: str = ""
    tipo_cuenta: str = ""
    no_cuenta: str = ""


class TerceroResponse(BaseModel):
    nit: str
    dv: str
    nombre: str
    direccion: str
    telefono: str
    email: str
    tipo: str
    banco: str
    tipo_cuenta: str
    no_cuenta: str

    model_config = {"from_attributes": True}
