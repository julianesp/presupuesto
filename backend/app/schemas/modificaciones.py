from pydantic import BaseModel, Field


class AdicionCreate(BaseModel):
    codigo_gasto: str
    codigo_ingreso: str
    valor: float = Field(gt=0)
    numero_acto: str = ""
    descripcion: str = ""


class ReduccionCreate(BaseModel):
    codigo_gasto: str
    codigo_ingreso: str
    valor: float = Field(gt=0)
    numero_acto: str = ""
    descripcion: str = ""


class CreditoContracreditoCreate(BaseModel):
    codigo_credito: str
    codigo_contracredito: str
    valor: float = Field(gt=0)
    numero_acto: str = ""
    descripcion: str = ""


class DetalleModificacionResponse(BaseModel):
    id: int
    codigo_rubro: str
    cuenta: str | None = None
    tipo_rubro: str
    campo_afectado: str
    valor: float

    model_config = {"from_attributes": True}


class ModificacionResponse(BaseModel):
    id: int
    fecha: str
    tipo: str
    numero_acto: str
    descripcion: str
    valor: float
    estado: str
    detalles: list[DetalleModificacionResponse] = []

    model_config = {"from_attributes": True}
