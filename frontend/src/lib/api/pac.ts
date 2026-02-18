import { api } from "./client";
import type { PACResumenRubro, PACUpdate } from "@/lib/types/pac";

export const pacApi = {
  getAll: () => api.get<PACResumenRubro[]>("/api/pac/resumen"),
  update: (codigo: string, data: PACUpdate) =>
    api.put<{ message: string }>(`/api/pac/${encodeURIComponent(codigo)}`, data),
};
