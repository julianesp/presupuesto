import { api } from "./client";
import type {
  CuentaBancaria,
  CuentaBancariaCreate,
  CuentaBancariaUpdate,
} from "@/lib/types/cuenta-bancaria";

export const cuentasBancariasApi = {
  getAll: () => api.get<CuentaBancaria[]>("/api/cuentas-bancarias"),
  create: (data: CuentaBancariaCreate) =>
    api.post<CuentaBancaria>("/api/cuentas-bancarias", data),
  update: (id: number, data: CuentaBancariaUpdate) =>
    api.put<CuentaBancaria>(`/api/cuentas-bancarias/${id}`, data),
  delete: (id: number) => api.delete<void>(`/api/cuentas-bancarias/${id}`),
};
