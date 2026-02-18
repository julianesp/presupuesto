from pydantic import BaseModel


class PACMesResponse(BaseModel):
    mes: int
    valor_programado: float

    model_config = {"from_attributes": True}


class PACUpdate(BaseModel):
    valores_mensuales: list[float]  # 12 values, one per month


class PACResumenRubroResponse(BaseModel):
    codigo: str
    cuenta: str
    apropiacion_definitiva: float
    total_pac: float
    pac_configurado: bool
    pac: list[PACMesResponse]

    model_config = {"from_attributes": True}


class PACDisponibleResponse(BaseModel):
    codigo_rubro: str
    mes: int
    valor_programado: float
    pagos_mes: float
    disponible: float
