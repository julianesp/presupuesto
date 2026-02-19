from pydantic import BaseModel, Field


class PagoCreate(BaseModel):
    obligacion_numero: int
    valor: float = Field(gt=0)
    concepto: str = ""
    medio_pago: str = "Transferencia"
    no_comprobante: str = ""
    cuenta_bancaria_id: int = 0


class PagoUpdate(BaseModel):
    valor: float | None = Field(default=None, gt=0)
    concepto: str | None = None
    medio_pago: str | None = None
    no_comprobante: str | None = None
    cuenta_bancaria_id: int | None = None
    fuente_sifse: int | None = None
    item_sifse: int | None = None


class PagoResponse(BaseModel):
    numero: int
    fecha: str
    obligacion_numero: int
    codigo_rubro: str
    cuenta: str | None = None
    nit_tercero: str
    nombre_tercero: str | None = None
    valor: float
    concepto: str
    medio_pago: str
    no_comprobante: str
    estado: str
    fuente_sifse: int
    item_sifse: int
    cuenta_bancaria_id: int

    model_config = {"from_attributes": True}
