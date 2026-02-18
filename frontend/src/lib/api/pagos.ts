import { api } from "./client";
import type { Pago, PagoCreate, PagoUpdate } from "@/lib/types/pago";

export const pagosApi = {
  getAll: (estado?: string) =>
    api.get<Pago[]>(estado ? `/api/pagos?estado=${estado}` : "/api/pagos"),
  create: (data: PagoCreate) => api.post<Pago>("/api/pagos", data),
  update: (numero: number, data: PagoUpdate) =>
    api.put<Pago>(`/api/pagos/${numero}`, data),
  anular: (numero: number) => api.put<void>(`/api/pagos/${numero}/anular`),
};
