export interface CDP {
  numero: number;
  fecha: string;
  codigo_rubro: string;
  cuenta?: string | null;
  objeto: string;
  valor: number;
  estado: string;
  fuente_sifse: number;
  item_sifse: number;
  saldo?: number | null;
}

export interface CDPCreate {
  codigo_rubro: string;
  objeto: string;
  valor: number;
  fuente_sifse?: number;
}

export interface CDPUpdate {
  valor?: number;
  objeto?: string;
  fuente_sifse?: number;
  item_sifse?: number;
}
