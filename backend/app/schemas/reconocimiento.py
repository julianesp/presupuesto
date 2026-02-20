from pydantic import BaseModel, Field


class ReconocimientoCreate(BaseModel):
    codigo_rubro: str
    valor: float = Field(gt=0)
    tercero_nit: str = ""
    concepto: str = ""
    no_documento: str = ""


class ReconocimientoUpdate(BaseModel):
    valor: float | None = Field(default=None, gt=0)
    tercero_nit: str | None = None
    concepto: str | None = None
    no_documento: str | None = None


class ReconocimientoResponse(BaseModel):
    numero: int
    fecha: str
    codigo_rubro: str
    cuenta: str | None = None
    tercero_nit: str
    tercero_nombre: str | None = None
    valor: float
    concepto: str
    no_documento: str
    estado: str

    model_config = {"from_attributes": True}
