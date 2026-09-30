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

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";
  if (isDev) {
    return { "X-Dev-Email": "admin@localhost" };
  }
  // En producción: obtener token directamente de Clerk
  if (typeof window !== "undefined") {
    try {
      // Intentar obtener de window.Clerk primero (más confiable)
      const clerk = (window as any).Clerk;
      if (clerk?.session) {
        const freshToken = await clerk.session.getToken();
        if (freshToken) {
          return { Authorization: `Bearer ${freshToken}` };
        }
      }

      // Fallback: obtener de sessionStorage si Clerk no está disponible
      const token = sessionStorage.getItem("clerk_token");
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    } catch (error) {
      console.error("Error al obtener token de Clerk:", error);
    }
  }
  return {};
}

/**
 * El backend (Cloudflare) usa camelCase y el frontend heredó snake_case del
 * backend Python anterior. Para que ambos lados se entiendan, se agrega a cada
 * objeto la otra forma de cada clave sin quitar la original: el backend ignora
 * las claves que no valida, y endpoints que esperan snake_case (config, SIFSE)
 * siguen recibiendo la suya.
 */
const toSnake = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, (_, a, b) => `${a}_${b.toLowerCase()}`);
const toCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

function withBothCases(value: unknown, convert: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => withBothCases(v, convert));
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    const converted = withBothCases(v, convert);
    out[key] = converted;
    const alt = convert(key);
    if (alt !== key && !(alt in (value as Record<string, unknown>))) out[alt] = converted;
  }
  return out;
}

const toBody = (body: unknown) => JSON.stringify(withBothCases(body, toCamel));

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

  // Si el token está expirado (401), limpiar sessionStorage
  // pero NO redirigir porque Clerk ya maneja eso
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("clerk_token");
    }
  }

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      msg = data.detail || data.error || JSON.stringify(data);
    } catch {}
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return withBothCases(await res.json(), toSnake) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: toBody(body) }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body !== undefined ? toBody(body) : undefined,
    }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
