export interface RubroGasto {
  codigo: string;
  cuenta: string;
  es_hoja: number;
  apropiacion_inicial: number;
  adiciones: number;
  reducciones: number;
  creditos: number;
  contracreditos: number;
  apropiacion_definitiva: number;
  saldo_disponible?: number | null;
}

export interface RubroGastoCreate {
  codigo: string;
  cuenta: string;
  apropiacion_definitiva?: number;
  apropiacion_inicial?: number;
}

export interface RubroGastoUpdate {
  cuenta?: string;
  apropiacion_definitiva?: number;
  apropiacion_inicial?: number;
}

export interface RubroIngreso {
  codigo: string;
  cuenta: string;
  es_hoja: number;
  presupuesto_inicial: number;
  adiciones: number;
  reducciones: number;
  presupuesto_definitivo: number;
  saldo_por_recaudar?: number | null;
}

export interface RubroIngresoCreate {
  codigo: string;
  cuenta: string;
  presupuesto_definitivo?: number;
  presupuesto_inicial?: number;
}

export interface RubroIngresoUpdate {
  cuenta?: string;
  presupuesto_definitivo?: number;
  presupuesto_inicial?: number;
}
