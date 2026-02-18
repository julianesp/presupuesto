export interface PACMes {
  mes: number;
  valor_programado: number;
}

export interface PACResumenRubro {
  codigo: string;
  cuenta: string;
  apropiacion_definitiva: number;
  total_pac: number;
  pac_configurado: boolean;
  pac: PACMes[];
}

export interface PACUpdate {
  valores_mensuales: number[];
}

export interface PACDisponible {
  codigo_rubro: string;
  mes: number;
  valor_programado: number;
  pagos_mes: number;
  disponible: number;
}
