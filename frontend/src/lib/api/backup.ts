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

export interface RestaurarResult {
  message: string;
  fecha_backup: string;
  registros: Record<string, number>;
}

export const backupApi = {
  async exportar(): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/backup/exportar`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      let msg = `Error ${res.status}`;
      try {
        const data = await res.json();
        msg = data.detail || JSON.stringify(data);
      } catch {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    const today = new Date().toISOString().slice(0, 10);
    const filename = `backup_presupuestal_${today}.json`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async restaurar(file: File): Promise<RestaurarResult> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/api/backup/restaurar`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: form,
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
