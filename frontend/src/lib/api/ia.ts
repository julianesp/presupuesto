import { AlertaIA, DocumentoExtraido, MensajeChat } from "@/lib/types/ia";
import { api } from "./client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeaders(): Record<string, string> {
  const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";
  if (isDev) {
    return { "X-Dev-Email": "admin@localhost" };
  }
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/CF_Authorization=([^;]+)/);
    if (match) {
      return { Authorization: `Bearer ${match[1]}` };
    }
  }
  return {};
}

export const iaApi = {
  chat: (mensaje: string, historial: MensajeChat[]) =>
    api.post<{ respuesta: string }>("/api/ia/chat", { mensaje, historial }),

  alertas: () => api.get<AlertaIA[]>("/api/ia/alertas"),

  resumen: () => api.get<{ texto: string }>("/api/ia/resumen"),

  analizarDocumento: async (file: File): Promise<DocumentoExtraido> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_URL}/api/ia/analizar-doc`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
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
  },
};
