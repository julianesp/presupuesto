import { api } from "./client";
import type { UserInfo } from "@/lib/types/auth";

export interface UserCreate {
  email: string;
  nombre: string;
  cargo?: string;
  rol: "ADMIN" | "TESORERO" | "CONSULTA";
}

export interface UserUpdate {
  nombre?: string;
  cargo?: string;
  rol?: "ADMIN" | "TESORERO" | "CONSULTA";
  activo?: boolean;
}

export const adminApi = {
  getUsuarios: () => api.get<UserInfo[]>("/api/admin/usuarios"),
  createUsuario: (data: UserCreate) =>
    api.post<UserInfo>("/api/admin/usuarios", data),
  updateUsuario: (id: number, data: UserUpdate) =>
    api.put<UserInfo>(`/api/admin/usuarios/${id}`, data),
  deleteUsuario: (id: number) =>
    api.delete<void>(`/api/admin/usuarios/${id}`),
};
