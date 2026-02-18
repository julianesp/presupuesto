from pydantic import BaseModel, Field


class RecaudoCreate(BaseModel):
    codigo_rubro: str
    valor: float = Field(gt=0)
    concepto: str = ""
    no_comprobante: str = ""
    cuenta_bancaria_id: int = 0


class RecaudoUpdate(BaseModel):
    valor: float | None = Field(default=None, gt=0)
    concepto: str | None = None
    no_comprobante: str | None = None
    cuenta_bancaria_id: int | None = None


class RecaudoResponse(BaseModel):
    numero: int
    fecha: str
    codigo_rubro: str
    cuenta: str | None = None
    valor: float
    concepto: str
    no_comprobante: str
    estado: str
    cuenta_bancaria_id: int

    model_config = {"from_attributes": True}
