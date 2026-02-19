from pydantic import BaseModel


class EjecucionGastoRow(BaseModel):
    codigo: str
    cuenta: str
    es_hoja: int
    nivel: int
    ppto_inicial: float
    adiciones: float
    reducciones: float
    creditos: float
    contracreditos: float
    ppto_definitivo: float
    comp_anterior: float
    comp_mes: float
    comp_acumulado: float
    pago_anterior: float
    pago_mes: float
    pago_acumulado: float
    saldo_apropiacion: float
    saldo_comp_pagar: float


class EjecucionIngresoRow(BaseModel):
    codigo: str
    cuenta: str
    es_hoja: int
    nivel: int
    ppto_inicial: float
    adiciones: float
    reducciones: float
    ppto_definitivo: float
    recaudo_anterior: float
    recaudo_mes: float
    recaudo_acumulado: float
    saldo_por_recaudar: float


class TarjetaMovimiento(BaseModel):
    fecha: str
    tipo: str
    numero: int
    nit: str
    tercero: str
    concepto: str
    v_cdp: float
    v_rp: float
    v_obl: float
    v_pago: float


class TarjetaResponse(BaseModel):
    rubro: dict
    movimientos: list[TarjetaMovimiento]


class CadenaPresupuestalItem(BaseModel):
    cdp: dict
    rps: list[dict]


class ResumenRubroGasto(BaseModel):
    codigo: str
    cuenta: str
    apropiacion_inicial: float
    adiciones: float
    reducciones: float
    creditos: float
    contracreditos: float
    apropiacion_definitiva: float
    disp_anteriores: float
    disp_periodo: float
    total_disp: float
    saldo_disponible: float
    disp_sin_compromiso: float
    comp_anteriores: float
    comp_periodo: float
    total_comp: float
    comp_sin_obligacion: float
    obl_anteriores: float
    obl_periodo: float
    total_obl: float
    obl_x_pagar: float
    pago_anteriores: float
    pago_periodo: float
    total_pago: float
    aprop_x_afectar: float


class ResumenRubroIngreso(BaseModel):
    codigo: str
    cuenta: str
    presupuesto_inicial: float
    adiciones: float
    reducciones: float
    presupuesto_definitivo: float
    recaudo_anterior: float
    recaudo_periodo: float
    recaudo_acumulado: float
    saldo_por_recaudar: float
