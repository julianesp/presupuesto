from pydantic import BaseModel, Field


class RubroGastoCreate(BaseModel):
    codigo: str
    cuenta: str
    apropiacion_definitiva: float = 0
    apropiacion_inicial: float = 0


class RubroGastoUpdate(BaseModel):
    cuenta: str | None = None
    apropiacion_definitiva: float | None = None
    apropiacion_inicial: float | None = None


class RubroGastoResponse(BaseModel):
    codigo: str
    cuenta: str
    es_hoja: int
    apropiacion_inicial: float
    adiciones: float
    reducciones: float
    creditos: float
    contracreditos: float
    apropiacion_definitiva: float
    saldo_disponible: float | None = None

    model_config = {"from_attributes": True}


class RubroIngresoCreate(BaseModel):
    codigo: str
    cuenta: str
    presupuesto_definitivo: float = 0
    presupuesto_inicial: float = 0


class RubroIngresoUpdate(BaseModel):
    cuenta: str | None = None
    presupuesto_definitivo: float | None = None
    presupuesto_inicial: float | None = None


class RubroIngresoResponse(BaseModel):
    codigo: str
    cuenta: str
    es_hoja: int
    presupuesto_inicial: float
    adiciones: float
    reducciones: float
    presupuesto_definitivo: float
    saldo_por_recaudar: float | None = None

    model_config = {"from_attributes": True}
