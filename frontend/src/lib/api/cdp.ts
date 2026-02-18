import { api } from "./client";
import type { CDP, CDPCreate, CDPUpdate } from "@/lib/types/cdp";

export const cdpApi = {
  getAll: (estado?: string) =>
    api.get<CDP[]>(estado ? `/api/cdp?estado=${estado}` : "/api/cdp"),
  create: (data: CDPCreate) => api.post<CDP>("/api/cdp", data),
  update: (numero: number, data: CDPUpdate) =>
    api.put<CDP>(`/api/cdp/${numero}`, data),
  anular: (numero: number) => api.put<void>(`/api/cdp/${numero}/anular`),
};
