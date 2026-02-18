export interface Obligacion {
  numero: number;
  fecha: string;
  rp_numero: number;
  codigo_rubro: string;
  cuenta?: string | null;
  nit_tercero: string;
  nombre_tercero?: string | null;
  valor: number;
  factura: string;
  estado: string;
  fuente_sifse: number;
  item_sifse: number;
  saldo?: number | null;
}

export interface ObligacionCreate {
  rp_numero: number;
  valor: number;
  factura?: string;
}

export interface ObligacionUpdate {
  valor?: number;
  factura?: string;
  fuente_sifse?: number;
  item_sifse?: number;
}
