export interface SIFSEFuente {
  id: number;
  nombre: string;
}

export interface SIFSEItem {
  id: number;
  nombre: string;
  fuente_id: number;
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
