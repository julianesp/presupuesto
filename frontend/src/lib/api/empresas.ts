import { api } from "./client";

export interface EmpresaResumen {
  id: string;
  nombre: string;
  nit: string;
  vigenciaActual: number;
  estado: string;
  rubrosIngresos: number;
  rubrosGastos: number;
  pptoIngresos: number;
  apropiacion: number;
  cdp: number;
  comprometido: number;
  pagado: number;
  recaudado: number;
  activa: boolean;
}

export interface EmpresaCreate {
  nombre: string;
  nit: string;
  vigenciaActual?: number;
}

export const empresasApi = {
  list: () => api.get<EmpresaResumen[]>("/api/empresas"),
  create: (data: EmpresaCreate) => api.post<EmpresaResumen>("/api/empresas", data),
  activar: (id: string) =>
    api.post<{ message: string; tenantId: string }>(`/api/empresas/${id}/activar`, {}),
};
