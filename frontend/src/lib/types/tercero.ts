export interface Tercero {
  nit: string;
  dv: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  tipo: string;
  banco: string;
  tipo_cuenta: string;
  no_cuenta: string;
}

export interface TerceroCreate {
  nit: string;
  dv?: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  tipo?: string;
  banco?: string;
  tipo_cuenta?: string;
  no_cuenta?: string;
}
