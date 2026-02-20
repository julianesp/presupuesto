import { api } from "./client";
import type {
  Reconocimiento,
  ReconocimientoCreate,
  ReconocimientoUpdate,
} from "@/lib/types/reconocimiento";

export const reconocimientosApi = {
  getAll: (estado?: string) =>
    api.get<Reconocimiento[]>(
      estado ? `/api/reconocimientos?estado=${estado}` : "/api/reconocimientos",
    ),
  create: (data: ReconocimientoCreate) =>
    api.post<Reconocimiento>("/api/reconocimientos", data),
  update: (numero: number, data: ReconocimientoUpdate) =>
    api.put<Reconocimiento>(`/api/reconocimientos/${numero}`, data),
  anular: (numero: number) =>
    api.put<void>(`/api/reconocimientos/${numero}/anular`),
};
