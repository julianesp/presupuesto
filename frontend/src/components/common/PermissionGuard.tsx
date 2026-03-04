import { ReactNode } from "react";
import {
  useHasPermission,
  type PermissionAction,
  type PermissionModule,
} from "@/hooks/usePermissions";

interface PermissionGuardProps {
  module: PermissionModule;
  action: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente que oculta/muestra contenido basado en permisos del usuario
 *
 * @example
 * <PermissionGuard module="cdp" action="create">
 *   <Button>Crear CDP</Button>
 * </PermissionGuard>
 *
 * @example
 * <PermissionGuard module="terceros" action="delete" fallback={<span>Sin permisos</span>}>
 *   <Button variant="destructive">Eliminar</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  module,
  action,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const hasPermission = useHasPermission(module, action);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
