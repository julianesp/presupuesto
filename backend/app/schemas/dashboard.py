from pydantic import BaseModel


class DashboardResumen(BaseModel):
    apropiacion: float
    cdp: float
    comprometido: float
    obligado: float
    pagado: float
    saldo_disponible: float
    saldo_por_pagar: float
    ppto_ingresos: float
    recaudado: float
    saldo_por_recaudar: float
    equilibrio: float
    pct_cdp: float = 0.0
    pct_comprometido: float = 0.0
    pct_obligado: float = 0.0
    pct_pagado: float = 0.0
    pct_recaudado: float = 0.0
