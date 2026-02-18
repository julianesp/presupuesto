export interface Pago {
  numero: number;
  fecha: string;
  obligacion_numero: number;
  codigo_rubro: string;
  cuenta?: string | null;
  nit_tercero: string;
  nombre_tercero?: string | null;
  valor: number;
  concepto: string;
  medio_pago: string;
  no_comprobante: string;
  estado: string;
  fuente_sifse: number;
  item_sifse: number;
  cuenta_bancaria_id: number;
}

export interface PagoCreate {
  obligacion_numero: number;
  valor: number;
  concepto?: string;
  medio_pago?: string;
  no_comprobante?: string;
  cuenta_bancaria_id?: number;
}

export interface PagoUpdate {
  valor?: number;
  concepto?: string;
  medio_pago?: string;
  no_comprobante?: string;
  cuenta_bancaria_id?: number;
  fuente_sifse?: number;
  item_sifse?: number;
}
