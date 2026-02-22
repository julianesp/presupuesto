export interface SIFSEFuente {
  codigo: number;
  descripcion: string;
}

export interface SIFSEItem {
  codigo: number;
  descripcion: string;
}

export interface MapeoGasto {
  codigo_rubro: string;
  cuenta: string;
  sifse_item: number;
}

export interface MapeoIngreso {
  codigo_rubro: string;
  cuenta: string;
  sifse_fuente: number;
}
