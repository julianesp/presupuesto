"use client";
import { useEffect, useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { configApi } from "@/lib/api/config";
import { mesNombre } from "@/lib/utils/dates";
import type { Config } from "@/lib/types/config";
import { useAuth } from "@/contexts/AuthContext";
import { empresasApi, type EmpresaResumen } from "@/lib/api/empresas";

const ROL_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  TESORERO: "Tesorero",
  CONSULTA: "Consulta",
};

export function TopBar({ onAbrirMenu }: { onAbrirMenu: () => void }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaResumen[]>([]);
  const { user, logout, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Solo cargar config cuando el usuario esté autenticado
    if (!isLoading && isAuthenticated) {
      configApi.get().then(setConfig).catch(() => null);
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (user?.superAdmin) {
      empresasApi.list().then(setEmpresas).catch(() => null);
    }
  }, [user?.superAdmin]);

  async function cambiarEmpresa(id: string) {
    await empresasApi.activar(id);
    // Recargar para que todas las vistas usen la nueva empresa
    window.location.reload();
  }

  const mes = config?.mes_actual ? mesNombre(parseInt(config.mes_actual)) : "";

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between gap-2 px-3 md:px-6 shrink-0 sticky top-0 z-30">
      <button onClick={onAbrirMenu} className="md:hidden p-2 -ml-1 text-slate-600" aria-label="Abrir menú">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        {empresas.length > 1 ? (
          <select
            value={user?.tenant?.id}
            onChange={(e) => cambiarEmpresa(e.target.value)}
            title="Cambiar de empresa"
            className="text-sm font-medium text-slate-700 bg-transparent border border-slate-200 rounded px-2 py-1 w-full max-w-[14rem] md:max-w-xs truncate"
          >
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm font-medium text-slate-700 block truncate">
            {user?.tenant?.nombre || config?.institucion || ""}
          </span>
        )}
        {(user?.tenant?.vigencia_actual || config?.vigencia) && (
          <span className="ml-2 text-xs text-slate-400 hidden sm:inline">
            Vigencia {user?.tenant?.vigencia_actual || config?.vigencia}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {mes && (
          <span className="text-sm text-slate-500 hidden lg:inline">Mes actual: {mes}</span>
        )}
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 hidden md:inline">{user.nombre}</span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 hidden sm:inline">
              {ROL_LABELS[user.rol] ?? user.rol}
            </span>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
