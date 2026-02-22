import { api } from "./client";
import type {
  ComprobanteCDP,
  ComprobanteRP,
  ComprobanteObligacion,
  ComprobantePago,
  ComprobanteRecaudo,
} from "@/lib/types/comprobante";

export const comprobantesApi = {
  cdp: (numero: number) =>
    api.get<ComprobanteCDP>(`/api/comprobantes/cdp/${numero}`),

  rp: (numero: number) =>
    api.get<ComprobanteRP>(`/api/comprobantes/rp/${numero}`),

  obligacion: (numero: number) =>
    api.get<ComprobanteObligacion>(`/api/comprobantes/obligacion/${numero}`),

  pago: (numero: number) =>
    api.get<ComprobantePago>(`/api/comprobantes/pago/${numero}`),

  recaudo: (numero: number) =>
    api.get<ComprobanteRecaudo>(`/api/comprobantes/recaudo/${numero}`),
};
