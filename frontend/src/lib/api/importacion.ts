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

async function uploadFile<T>(path: string, file: File, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const body = new FormData();
  body.append("file", file);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: getAuthHeaders(),
    body,
  });

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      msg = data.detail || JSON.stringify(data);
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/** Descarga un blob como archivo en el navegador. */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Genera y descarga un CSV directamente en el navegador (sin llamada al backend). */
export function descargarPlantillaCSV(filename: string, filas: string[][]): void {
  // BOM UTF-8 para que Excel lo abra correctamente
  const contenido = "\uFEFF" + filas.map((f) => f.join(";")).join("\r\n");
  triggerDownload(new Blob([contenido], { type: "text/csv;charset=utf-8" }), filename);
}

export interface ResultadoImportacion {
  cantidad?: number;
  rubros_gastos?: number;
  rubros_ingresos?: number;
  total_gastos?: number;
  total_ingresos?: number;
  diferencia?: number;
  errores?: string[];
}

export const importacionApi = {
  subirExcel: (file: File) =>
    uploadFile<ResultadoImportacion>("/api/importacion/catalogo-excel", file),

  subirRubrosGastos: (file: File, separador = ";") =>
    uploadFile<ResultadoImportacion>("/api/importacion/csv/rubros-gastos", file, { separador }),

  subirRubrosIngresos: (file: File, separador = ";") =>
    uploadFile<ResultadoImportacion>("/api/importacion/csv/rubros-ingresos", file, { separador }),

  subirTerceros: (file: File, separador = ";") =>
    uploadFile<ResultadoImportacion>("/api/importacion/csv/terceros", file, { separador }),

  async descargarPlantillaExcel(): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/importacion/plantillas/excel`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const blob = await res.blob();
    triggerDownload(blob, "plantilla_presupuestal.xlsx");
  },

  async sincronizarPadres(): Promise<{ ok: boolean; mensaje: string }> {
    const res = await fetch(`${BASE_URL}/api/importacion/sincronizar-padres`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
  },
};
