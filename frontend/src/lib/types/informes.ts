export interface EjecucionGastoRow {
  codigo: string;
  cuenta: string;
  es_hoja: number;
  nivel: number;
  ppto_inicial: number;
  adiciones: number;
  reducciones: number;
  creditos: number;
  contracreditos: number;
  ppto_definitivo: number;
  comp_anterior: number;
  comp_mes: number;
  comp_acumulado: number;
  pago_anterior: number;
  pago_mes: number;
  pago_acumulado: number;
  saldo_apropiacion: number;
  saldo_comp_pagar: number;
}

export interface EjecucionIngresoRow {
  codigo: string;
  cuenta: string;
  es_hoja: number;
  nivel: number;
  ppto_inicial: number;
  adiciones: number;
  reducciones: number;
  ppto_definitivo: number;
  recaudo_anterior: number;
  recaudo_mes: number;
  recaudo_acumulado: number;
  saldo_por_recaudar: number;
}

export interface TarjetaMovimiento {
  fecha: string;
  tipo: string;
  numero: number;
  nit: string;
  tercero: string;
  concepto: string;
  v_cdp: number;
  v_rp: number;
  v_obl: number;
  v_pago: number;
}

export interface TarjetaResponse {
  rubro: Record<string, unknown>;
  movimientos: TarjetaMovimiento[];
}

export interface CadenaPresupuestalItem {
  cdp: Record<string, unknown>;
  rps: Record<string, unknown>[];
}
