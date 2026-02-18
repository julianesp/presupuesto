from pydantic import BaseModel, Field


class RPCreate(BaseModel):
    cdp_numero: int
    nit_tercero: str
    valor: float = Field(gt=0)
    objeto: str


class RPUpdate(BaseModel):
    valor: float | None = Field(default=None, gt=0)
    objeto: str | None = None
    fuente_sifse: int | None = None
    item_sifse: int | None = None


class RPResponse(BaseModel):
    numero: int
    fecha: str
    cdp_numero: int
    codigo_rubro: str
    cuenta: str | None = None
    nit_tercero: str
    nombre_tercero: str | None = None
    valor: float
    objeto: str
    estado: str
    fuente_sifse: int
    item_sifse: int
    saldo: float | None = None

    model_config = {"from_attributes": True}
