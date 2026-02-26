const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";
  if (isDev) {
    return { "X-Dev-Email": "admin@localhost" };
  }
  // En producción: obtener token directamente de Clerk
  if (typeof window !== "undefined") {
    try {
      // Obtener token de Clerk directamente
      const token = sessionStorage.getItem("clerk_token");
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }

      // Si no está en sessionStorage, intentar obtener de window.Clerk
      const clerk = (window as any).Clerk;
      if (clerk?.session) {
        const freshToken = await clerk.session.getToken();
        if (freshToken) {
          sessionStorage.setItem("clerk_token", freshToken);
          return { Authorization: `Bearer ${freshToken}` };
        }
      }
    } catch (error) {
      console.error("Error al obtener token de Clerk:", error);
    }
  }
  return {};
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const authHeaders = await getAuthHeaders();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      msg = data.detail || JSON.stringify(data);
    } catch {}
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
