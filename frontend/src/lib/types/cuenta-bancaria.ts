export interface CuentaBancaria {
  id: number;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  denominacion: string;
  estado: string;
}

export interface CuentaBancariaCreate {
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  denominacion?: string;
}

export interface CuentaBancariaUpdate {
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  denominacion?: string;
}
