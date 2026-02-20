export interface Reconocimiento {
  numero: number;
  fecha: string;
  codigo_rubro: string;
  cuenta?: string | null;
  tercero_nit: string;
  tercero_nombre?: string | null;
  valor: number;
  concepto: string;
  no_documento: string;
  estado: string;
}

export interface ReconocimientoCreate {
  codigo_rubro: string;
  valor: number;
  tercero_nit?: string;
  concepto?: string;
  no_documento?: string;
}

export interface ReconocimientoUpdate {
  valor?: number;
  tercero_nit?: string;
  concepto?: string;
  no_documento?: string;
}
