import { api } from "./client";
import type { Config, ConfigUpdate } from "@/lib/types/config";

export const configApi = {
  get: () => api.get<Config>("/api/config"),
  update: (data: ConfigUpdate) => api.put<{ message: string }>("/api/config", data),
  consolidarMes: () =>
    api.post<{ mes: number; rubros_consolidados: number }>(
      "/api/consolidacion/consolidar-mes",
      {},
    ),
  consolidarIngresos: () =>
    api.post<{ mes: number; rubros_consolidados: number }>(
      "/api/consolidacion/consolidar-ingresos",
      {},
    ),
  cierreMes: () =>
    api.post<{ mes_cerrado: number }>("/api/consolidacion/cierre-mes", {}),
  aperturaVigencia: (anio: number) =>
    api.post<{ anio: number; consecutivos_reseteados: string[] }>(
      `/api/config/apertura-vigencia?anio=${anio}`,
      {},
    ),
};
