from pydantic import BaseModel, Field


class ObligacionCreate(BaseModel):
    rp_numero: int
    valor: float = Field(gt=0)
    factura: str = ""


class ObligacionUpdate(BaseModel):
    valor: float | None = Field(default=None, gt=0)
    factura: str | None = None
    fuente_sifse: int | None = None
    item_sifse: int | None = None


class ObligacionResponse(BaseModel):
    numero: int
    fecha: str
    rp_numero: int
    codigo_rubro: str
    cuenta: str | None = None
    nit_tercero: str
    nombre_tercero: str | None = None
    valor: float
    factura: str
    estado: str
    fuente_sifse: int
    item_sifse: int
    saldo: float | None = None

    model_config = {"from_attributes": True}
