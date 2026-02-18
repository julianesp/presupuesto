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
