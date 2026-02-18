import { api } from "./client";
import type {
  EjecucionGastoRow,
  EjecucionIngresoRow,
  TarjetaResponse,
  CadenaPresupuestalItem,
} from "@/lib/types/informes";

export const informesApi = {
  ejecucionGastos: (mes?: number) =>
    api.get<EjecucionGastoRow[]>(
      mes ? `/api/informes/ejecucion-gastos?mes=${mes}` : "/api/informes/ejecucion-gastos",
    ),
  ejecucionIngresos: (mes?: number) =>
    api.get<EjecucionIngresoRow[]>(
      mes ? `/api/informes/ejecucion-ingresos?mes=${mes}` : "/api/informes/ejecucion-ingresos",
    ),
  tarjetaRubro: (codigo: string) =>
    api.get<TarjetaResponse>(
      `/api/informes/tarjeta/${encodeURIComponent(codigo)}`,
    ),
  cadenaPresupuestal: () =>
    api.get<CadenaPresupuestalItem[]>("/api/informes/cadena-presupuestal"),
};
