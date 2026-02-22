import { api } from "./client";
import type {
  EjecucionGastoRow,
  EjecucionIngresoRow,
  SIAGastoRow,
  TarjetaResponse,
  CadenaPresupuestalItem,
  ResumenRubro,
  CuentaPorPagarRow,
  PacVsEjecutadoResponse,
  InformeTerceroResponse,
} from "@/lib/types/informes";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeaders(): Record<string, string> {
  const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";
  if (isDev) return { "X-Dev-Email": "admin@localhost" };
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/CF_Authorization=([^;]+)/);
    if (match) return { Authorization: `Bearer ${match[1]}` };
  }
  return {};
}

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
  resumenRubro: (codigo: string, mesInicio: number, mesFin: number) =>
    api.get<ResumenRubro>(
      `/api/informes/resumen-rubro/${encodeURIComponent(codigo)}?mes_inicio=${mesInicio}&mes_fin=${mesFin}`,
    ),
  cadenaPresupuestal: () =>
    api.get<CadenaPresupuestalItem[]>("/api/informes/cadena-presupuestal"),
  cuentasPorPagar: () =>
    api.get<CuentaPorPagarRow[]>("/api/informes/cuentas-por-pagar"),
  pacVsEjecutado: (mes?: number) =>
    api.get<PacVsEjecutadoResponse>(
      mes ? `/api/informes/pac-vs-ejecutado?mes=${mes}` : "/api/informes/pac-vs-ejecutado",
    ),
  informeTercero: (nit: string, mesInicio: number, mesFin: number) =>
    api.get<InformeTerceroResponse>(
      `/api/informes/tercero/${encodeURIComponent(nit)}?mes_inicio=${mesInicio}&mes_fin=${mesFin}`,
    ),

  siaGastos: (mes?: number) =>
    api.get<SIAGastoRow[]>(mes ? `/api/informes/sia/gastos?mes=${mes}` : "/api/informes/sia/gastos"),
  siaIngresos: (mes?: number) =>
    api.get<EjecucionIngresoRow[]>(mes ? `/api/informes/sia/ingresos?mes=${mes}` : "/api/informes/sia/ingresos"),

  async descargarSIAExcel(mes?: number): Promise<void> {
    const url = mes
      ? `${BASE_URL}/api/informes/sia/excel?mes=${mes}`
      : `${BASE_URL}/api/informes/sia/excel`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = mes ? `SIA_Contraloria_mes${mes}.xlsx` : "SIA_Contraloria.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },

  async descargarSIACSV(formato: string, mes?: number, filename?: string): Promise<void> {
    const params = mes ? `?mes=${mes}` : "";
    const url = `${BASE_URL}/api/informes/sia/csv/${formato}${params}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Error ${res.status} al descargar ${formato}`);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename || `${formato}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },

  async descargarSIAZip(mes?: number): Promise<void> {
    const params = mes ? `?mes=${mes}` : "";
    const url = `${BASE_URL}/api/informes/sia/csv/todos${params}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Error ${res.status} al descargar ZIP`);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = mes ? `SIA_Contraloria_mes${mes}.zip` : "SIA_Contraloria.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },
};
