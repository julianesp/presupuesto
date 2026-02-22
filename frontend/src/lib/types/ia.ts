export interface MensajeChat {
  rol: "user" | "model";
  contenido: string;
}

export interface AlertaIA {
  tipo: string;
  titulo: string;
  descripcion: string;
  urgencia: "ALTA" | "MEDIA" | "BAJA";
  valor?: number | null;
}

export interface DocumentoExtraido {
  nit: string | null;
  nombre_proveedor: string | null;
  fecha: string | null;
  numero_factura: string | null;
  valor_total: number | null;
  concepto: string | null;
}
