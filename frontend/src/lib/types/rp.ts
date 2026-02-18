export interface RP {
  numero: number;
  fecha: string;
  cdp_numero: number;
  codigo_rubro: string;
  cuenta?: string | null;
  nit_tercero: string;
  nombre_tercero?: string | null;
  valor: number;
  objeto: string;
  estado: string;
  fuente_sifse: number;
  item_sifse: number;
  saldo?: number | null;
}

export interface RPCreate {
  cdp_numero: number;
  nit_tercero: string;
  valor: number;
  objeto: string;
}

export interface RPUpdate {
  valor?: number;
  objeto?: string;
  fuente_sifse?: number;
  item_sifse?: number;
}
