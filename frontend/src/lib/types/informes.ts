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
  recon_anterior: number;
  recon_mes: number;
  recon_acumulado: number;
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

export interface ResumenRubro {
  rubro: { codigo: string; cuenta: string };
  apropiacion_inicial: number;
  adiciones: number;
  reducciones: number;
  creditos: number;
  contracreditos: number;
  apropiacion_definitiva: number;
  disp_anteriores: number;
  disp_periodo: number;
  total_disp: number;
  saldo_disponible: number;
  disp_sin_compromiso: number;
  aprop_x_afectar: number;
  comp_anteriores: number;
  comp_periodo: number;
  total_comp: number;
  comp_sin_obligacion: number;
  obl_anteriores: number;
  obl_periodo: number;
  total_obl: number;
  obl_x_pagar: number;
  pago_anteriores: number;
  pago_periodo: number;
  total_pago: number;
}

export interface CuentaPorPagarRow {
  obl_numero: number;
  fecha: string;
  codigo_rubro: string;
  nit: string;
  tercero: string;
  factura: string;
  valor_obl: number;
  total_pagado: number;
  saldo_por_pagar: number;
}

export interface PacMesRow {
  mes: number;
  pac: number;
  pagado: number;
}

export interface PacRubroRow {
  codigo: string;
  cuenta: string;
  pac_total: number;
  pagado_total: number;
  saldo_pac: number;
  pct_ejecucion: number;
  meses: PacMesRow[];
}

export interface PacVsEjecutadoResponse {
  mes_corte: number;
  rubros: PacRubroRow[];
}

export interface TerceroDocRP {
  numero: number;
  fecha: string;
  codigo_rubro: string;
  valor: number;
  objeto: string;
  estado: string;
}

export interface TerceroDocObl {
  numero: number;
  fecha: string;
  codigo_rubro: string;
  rp_numero: number;
  valor: number;
  factura: string;
  estado: string;
}

export interface TerceroDocPago {
  numero: number;
  fecha: string;
  codigo_rubro: string;
  obligacion_numero: number;
  valor: number;
  concepto: string;
  medio_pago: string;
  no_comprobante: string;
}

export interface InformeTerceroResponse {
  tercero: { nit: string; nombre: string };
  mes_inicio: number;
  mes_fin: number;
  rps: TerceroDocRP[];
  obligaciones: TerceroDocObl[];
  pagos: TerceroDocPago[];
  total_rp: number;
  total_obl: number;
  total_pagos: number;
}

export interface SIAGastoRow {
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
  obl_anterior: number;
  obl_mes: number;
  obl_acumulado: number;
  pago_anterior: number;
  pago_mes: number;
  pago_acumulado: number;
  saldo_x_comprometer: number;
  saldo_x_obligar: number;
  saldo_x_pagar: number;
}
