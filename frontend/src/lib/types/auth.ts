export interface TenantInfo {
  id: string;
  nombre: string;
  nit: string;
  vigencia_actual: number;
  estado: string;
}

export interface UserInfo {
  id: number;
  email: string;
  nombre: string;
  cargo: string | null;
  rol: "ADMIN" | "TESORERO" | "CONSULTA";
  superAdmin?: boolean; // Acceso total: editar y eliminar
  tenant: TenantInfo;
}
