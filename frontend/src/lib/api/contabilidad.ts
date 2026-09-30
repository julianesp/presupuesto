import { api, getAuthHeaders } from "./client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const TIPOS_COMPROBANTE = ["APERTURA", "DIARIO", "AJUSTE", "DEPRECIACION", "PROVISION", "CIERRE"] as const;
export type TipoComprobante = (typeof TIPOS_COMPROBANTE)[number];

export interface CuentaContable {
  codigo: string;
  nombre: string;
  naturaleza: "D" | "C";
  nivel: number;
  esAuxiliar: number;
  requiereTercero: number;
  activa: number;
}

export interface CuentaCreate {
  codigo: string;
  nombre: string;
  naturaleza?: "D" | "C";
  requiereTercero?: boolean;
}

export interface CuentaUpdate {
  nombre?: string;
  naturaleza?: "D" | "C";
  requiereTercero?: boolean;
  activa?: boolean;
}

export interface ComprobanteResumen {
  id: number;
  tipo: TipoComprobante;
  numero: number;
  fecha: string;
  descripcion: string;
  estado: string;
  origenTipo: string | null;
  origenNumero: number | null;
  totalDebito: number;
  totalCredito: number;
  lineas: number;
}

export interface LineaComprobante {
  codigoCuenta: string;
  nombreCuenta?: string;
  nitTercero?: string | null;
  nombreTercero?: string | null;
  descripcion?: string;
  debito: number;
  credito: number;
}

export interface ComprobanteDetalle extends Omit<ComprobanteResumen, "totalDebito" | "totalCredito" | "lineas"> {
  lineas: LineaComprobante[];
}

export interface ComprobanteCreate {
  tipo: TipoComprobante;
  fecha: string;
  descripcion: string;
  lineas: LineaComprobante[];
}

export interface Periodo {
  anio: number;
  mes: number;
  cerrado: boolean;
  fechaCierre: string | null;
}

export interface ResultadoCarga {
  ok: boolean;
  errores: string[];
  resumen: Record<string, number>;
}

async function descargar(path: string, nombre: string) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Sube un Excel. Los errores de validación (422) se devuelven sin lanzar excepción. */
async function subir(path: string, file: File): Promise<ResultadoCarga> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers: await getAuthHeaders(), body });
  const data = await res.json().catch(() => ({}));
  if (res.ok || res.status === 422) return data as ResultadoCarga;
  throw new Error(data.error || `Error ${res.status}`);
}

const encode = encodeURIComponent;

export const contabilidadApi = {
  cuentas: (soloAuxiliares = false) =>
    api.get<CuentaContable[]>(`/api/contabilidad/cuentas${soloAuxiliares ? "?solo_auxiliares=true" : ""}`),
  crearCuenta: (data: CuentaCreate) => api.post<{ codigo: string }>("/api/contabilidad/cuentas", data),
  actualizarCuenta: (codigo: string, data: CuentaUpdate) =>
    api.put<{ codigo: string }>(`/api/contabilidad/cuentas/${encode(codigo)}`, data),
  eliminarCuenta: (codigo: string) => api.delete<void>(`/api/contabilidad/cuentas/${encode(codigo)}`),
  plantillaCatalogo: () => descargar("/api/contabilidad/cuentas/plantilla", "plantilla_catalogo_cuentas.xlsx"),
  importarCatalogo: (file: File) => subir("/api/contabilidad/cuentas/importar", file),

  plantillaSaldosIniciales: () =>
    descargar("/api/contabilidad/saldos-iniciales/plantilla", "plantilla_saldos_iniciales_contables.xlsx"),
  importarSaldosIniciales: (file: File) => subir("/api/contabilidad/saldos-iniciales/importar", file),

  comprobantes: (tipo?: string, mes?: string) => {
    const q = new URLSearchParams();
    if (tipo) q.set("tipo", tipo);
    if (mes) q.set("mes", mes);
    return api.get<ComprobanteResumen[]>(`/api/contabilidad/comprobantes${q.size ? `?${q}` : ""}`);
  },
  comprobante: (id: number) => api.get<ComprobanteDetalle>(`/api/contabilidad/comprobantes/${id}`),
  crearComprobante: (data: ComprobanteCreate) =>
    api.post<{ tipo: string; numero: number }>("/api/contabilidad/comprobantes", data),
  anularComprobante: (id: number) => api.put<{ message: string }>(`/api/contabilidad/comprobantes/${id}/anular`),

  periodos: () => api.get<Periodo[]>("/api/contabilidad/periodos"),
  cerrarPeriodo: (anio: number, mes: number) =>
    api.put<Periodo>(`/api/contabilidad/periodos/${anio}/${mes}/cerrar`),
  abrirPeriodo: (anio: number, mes: number) => api.put<Periodo>(`/api/contabilidad/periodos/${anio}/${mes}/abrir`),
};
