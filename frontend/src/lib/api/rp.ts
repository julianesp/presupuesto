import { api } from "./client";
import type { RP, RPCreate, RPUpdate } from "@/lib/types/rp";

export const rpApi = {
  getAll: (estado?: string) =>
    api.get<RP[]>(estado ? `/api/rp?estado=${estado}` : "/api/rp"),
  create: (data: RPCreate) => api.post<RP>("/api/rp", data),
  update: (numero: number, data: RPUpdate) =>
    api.put<RP>(`/api/rp/${numero}`, data),
  anular: (numero: number) => api.put<void>(`/api/rp/${numero}/anular`),
};
