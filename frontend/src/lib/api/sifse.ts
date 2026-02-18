import { api } from "./client";
import type {
  SIFSEFuente,
  SIFSEItem,
  MapeoGasto,
  MapeoIngreso,
} from "@/lib/types/sifse";

export const sifseApi = {
  getCatalogoFuentes: () =>
    api.get<SIFSEFuente[]>("/api/sifse/catalogo-fuentes"),
  getCatalogoItems: () => api.get<SIFSEItem[]>("/api/sifse/catalogo-items"),
  getMapeosGastos: () => api.get<MapeoGasto[]>("/api/sifse/mapeos-gastos"),
  getMapeosIngresos: () =>
    api.get<MapeoIngreso[]>("/api/sifse/mapeos-ingresos"),
  setMapeoGasto: (codigo: string, sifse_item: number) =>
    api.put<{ message: string }>(
      `/api/sifse/mapeo-gasto/${encodeURIComponent(codigo)}?sifse_item=${sifse_item}`,
    ),
  setMapeoIngreso: (codigo: string, sifse_fuente: number) =>
    api.put<{ message: string }>(
      `/api/sifse/mapeo-ingreso/${encodeURIComponent(codigo)}?sifse_fuente=${sifse_fuente}`,
    ),
};
