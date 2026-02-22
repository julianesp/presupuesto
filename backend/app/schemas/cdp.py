from pydantic import BaseModel, Field


class CDPCreate(BaseModel):
    codigo_rubro: str
    objeto: str
    valor: float = Field(gt=0)
    fuente_sifse: int = 0
    item_sifse: int = 0


class CDPUpdate(BaseModel):
    valor: float | None = Field(default=None, gt=0)
    objeto: str | None = None
    fuente_sifse: int | None = None
    item_sifse: int | None = None


class CDPResponse(BaseModel):
    numero: int
    fecha: str
    codigo_rubro: str
    cuenta: str | None = None
    objeto: str
    valor: float
    estado: str
    fuente_sifse: int
    item_sifse: int
    saldo: float | None = None

    model_config = {"from_attributes": True}
