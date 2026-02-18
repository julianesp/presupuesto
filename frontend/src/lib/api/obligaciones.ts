import { api } from "./client";
import type {
  Obligacion,
  ObligacionCreate,
  ObligacionUpdate,
} from "@/lib/types/obligacion";

export const obligacionesApi = {
  getAll: (estado?: string) =>
    api.get<Obligacion[]>(
      estado ? `/api/obligaciones?estado=${estado}` : "/api/obligaciones",
    ),
  create: (data: ObligacionCreate) =>
    api.post<Obligacion>("/api/obligaciones", data),
  update: (numero: number, data: ObligacionUpdate) =>
    api.put<Obligacion>(`/api/obligaciones/${numero}`, data),
  anular: (numero: number) =>
    api.put<void>(`/api/obligaciones/${numero}/anular`),
};
