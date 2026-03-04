import { useAuth } from "@/contexts/AuthContext";

export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "anular"
  | "edit"; // Alias para update

export type PermissionModule =
  | "cdp"
  | "rp"
  | "obligaciones"
  | "pagos"
  | "recaudos"
  | "reconocimientos"
  | "terceros"
  | "rubros-gastos"
  | "rubros-ingresos"
  | "cuentas-bancarias"
  | "pac"
  | "modificaciones"
  | "usuarios"
  | "configuracion"
  | "sifse"
  | "all"; // Para permisos globales

interface PermissionCheck {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAnular: boolean;
  isAdmin: boolean;
  isMarthaAdmin: boolean; // Usuario principal con todos los permisos
}

/**
 * Hook para verificar permisos del usuario actual
 *
 * Reglas de permisos:
 * 1. marthacer7@gmail.com: TODOS los permisos (CRUD completo)
 * 2. ADMIN: Puede leer, crear y anular. NO puede editar ni eliminar definitivamente
 * 3. TESORERO: Puede leer y crear. NO puede editar, eliminar ni anular
 * 4. CONSULTA: Solo lectura
 */
export function usePermissions(module?: PermissionModule): PermissionCheck {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return {
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
      canAnular: false,
      isAdmin: false,
      isMarthaAdmin: false,
    };
  }

  // Usuario principal con TODOS los permisos
  const isMarthaAdmin = user.email === "marthacer7@gmail.com";

  // Si es Martha, tiene TODOS los permisos
  if (isMarthaAdmin) {
    return {
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
      canAnular: true,
      isAdmin: true,
      isMarthaAdmin: true,
    };
  }

  // Permisos basados en roles para otros usuarios
  const isAdmin = user.rol === "ADMIN";
  const isTesorero = user.rol === "TESORERO";
  const isConsulta = user.rol === "CONSULTA";

  return {
    canCreate: isAdmin || isTesorero,
    canRead: true, // Todos pueden leer
    canUpdate: false, // Solo Martha puede editar
    canDelete: false, // Solo Martha puede eliminar
    canAnular: isAdmin, // Solo Admin y Martha pueden anular
    isAdmin,
    isMarthaAdmin: false,
  };
}

/**
 * Hook simplificado para verificar si el usuario puede realizar una acción específica
 */
export function useHasPermission(
  module: PermissionModule,
  action: PermissionAction
): boolean {
  const permissions = usePermissions(module);

  switch (action) {
    case "create":
      return permissions.canCreate;
    case "read":
      return permissions.canRead;
    case "update":
    case "edit":
      return permissions.canUpdate;
    case "delete":
      return permissions.canDelete;
    case "anular":
      return permissions.canAnular;
    default:
      return false;
  }
}

/**
 * Hook para verificar si el usuario actual es Martha (admin principal)
 */
export function useIsMarthaAdmin(): boolean {
  const { user } = useAuth();
  return user?.email === "marthacer7@gmail.com";
}
