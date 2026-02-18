import { api } from "./client";
import type { Tercero, TerceroCreate } from "@/lib/types/tercero";

export const tercerosApi = {
  getAll: () => api.get<Tercero[]>("/api/terceros"),
  buscar: (q: string) =>
    api.get<Tercero[]>(`/api/terceros/buscar?q=${encodeURIComponent(q)}`),
  create: (data: TerceroCreate) => api.post<Tercero>("/api/terceros", data),
};
