import { api } from "./client";
import type {
  Modificacion,
  AdicionCreate,
  ReduccionCreate,
  CreditoContracreditoCreate,
  AplazamientoCreate,
  DesplazamientoCreate,
} from "@/lib/types/modificacion";

export const modificacionesApi = {
  getAll: () => api.get<Modificacion[]>("/api/modificaciones"),
  crearAdicion: (data: AdicionCreate) =>
    api.post<Modificacion>("/api/modificaciones/adicion", data),
  crearReduccion: (data: ReduccionCreate) =>
    api.post<Modificacion>("/api/modificaciones/reduccion", data),
  crearCredito: (data: CreditoContracreditoCreate) =>
    api.post<Modificacion>("/api/modificaciones/credito-contracredito", data),
  crearAplazamiento: (data: AplazamientoCreate) =>
    api.post<Modificacion>("/api/modificaciones/aplazamiento", data),
  crearDesplazamiento: (data: DesplazamientoCreate) =>
    api.post<Modificacion>("/api/modificaciones/desplazamiento", data),
  anular: (id: number) =>
    api.put<void>(`/api/modificaciones/${id}/anular`),
};
