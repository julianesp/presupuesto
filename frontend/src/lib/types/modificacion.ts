export interface DetalleModificacion {
  id: number;
  codigo_rubro: string;
  cuenta?: string | null;
  tipo_rubro: string;
  campo_afectado: string;
  valor: number;
}

export interface Modificacion {
  id: number;
  fecha: string;
  tipo: string;
  numero_acto: string;
  descripcion: string;
  valor: number;
  estado: string;
  detalles: DetalleModificacion[];
}

export interface AdicionCreate {
  codigo_gasto: string;
  codigo_ingreso: string;
  valor: number;
  numero_acto?: string;
  descripcion?: string;
}

export interface ReduccionCreate {
  codigo_gasto: string;
  codigo_ingreso: string;
  valor: number;
  numero_acto?: string;
  descripcion?: string;
}

export interface CreditoContracreditoCreate {
  codigo_credito: string;
  codigo_contracredito: string;
  valor: number;
  numero_acto?: string;
  descripcion?: string;
}
