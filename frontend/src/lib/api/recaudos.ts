import { api } from "./client";
import type { Recaudo, RecaudoCreate, RecaudoUpdate } from "@/lib/types/recaudo";

export const recaudosApi = {
  getAll: (estado?: string) =>
    api.get<Recaudo[]>(
      estado ? `/api/recaudos?estado=${estado}` : "/api/recaudos",
    ),
  create: (data: RecaudoCreate) => api.post<Recaudo>("/api/recaudos", data),
  update: (numero: number, data: RecaudoUpdate) =>
    api.put<Recaudo>(`/api/recaudos/${numero}`, data),
  anular: (numero: number) => api.put<void>(`/api/recaudos/${numero}/anular`),
};
