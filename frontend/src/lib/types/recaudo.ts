export interface Recaudo {
  numero: number;
  fecha: string;
  codigo_rubro: string;
  cuenta?: string | null;
  valor: number;
  concepto: string;
  no_comprobante: string;
  estado: string;
  cuenta_bancaria_id: number;
}

export interface RecaudoCreate {
  codigo_rubro: string;
  valor: number;
  concepto?: string;
  no_comprobante?: string;
  cuenta_bancaria_id?: number;
}

export interface RecaudoUpdate {
  valor?: number;
  concepto?: string;
  no_comprobante?: string;
  cuenta_bancaria_id?: number;
}
