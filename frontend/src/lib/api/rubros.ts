import { api } from "./client";
import type {
  RubroGasto,
  RubroGastoCreate,
  RubroGastoUpdate,
  RubroIngreso,
  RubroIngresoCreate,
  RubroIngresoUpdate,
} from "@/lib/types/rubros";

export const rubrosGastosApi = {
  getAll: () => api.get<RubroGasto[]>("/api/rubros-gastos"),
  getHojas: () => api.get<RubroGasto[]>("/api/rubros-gastos?solo_hojas=true"),
  create: (data: RubroGastoCreate) =>
    api.post<RubroGasto>("/api/rubros-gastos", data),
  update: (codigo: string, data: RubroGastoUpdate) =>
    api.put<RubroGasto>(`/api/rubros-gastos/${encodeURIComponent(codigo)}`, data),
  delete: (codigo: string) =>
    api.delete<void>(`/api/rubros-gastos/${encodeURIComponent(codigo)}`),
};

export const rubrosIngresosApi = {
  getAll: () => api.get<RubroIngreso[]>("/api/rubros-ingresos"),
  getHojas: () => api.get<RubroIngreso[]>("/api/rubros-ingresos?solo_hojas=true"),
  create: (data: RubroIngresoCreate) =>
    api.post<RubroIngreso>("/api/rubros-ingresos", data),
  update: (codigo: string, data: RubroIngresoUpdate) =>
    api.put<RubroIngreso>(
      `/api/rubros-ingresos/${encodeURIComponent(codigo)}`,
      data,
    ),
  delete: (codigo: string) =>
    api.delete<void>(`/api/rubros-ingresos/${encodeURIComponent(codigo)}`),
};
