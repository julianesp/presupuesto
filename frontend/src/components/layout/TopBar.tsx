"use client";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { configApi } from "@/lib/api/config";
import { mesNombre } from "@/lib/utils/dates";
import type { Config } from "@/lib/types/config";
import { useAuth } from "@/contexts/AuthContext";

const ROL_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  TESORERO: "Tesorero",
  CONSULTA: "Consulta",
};

export function TopBar() {
  const [config, setConfig] = useState<Config | null>(null);
  const { user, logout, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Solo cargar config cuando el usuario esté autenticado
    if (!isLoading && isAuthenticated) {
      configApi.get().then(setConfig).catch(() => null);
    }
  }, [isLoading, isAuthenticated]);

  const mes = config?.mes_actual ? mesNombre(parseInt(config.mes_actual)) : "";

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div>
        <span className="text-sm font-medium text-slate-700">
          {user?.tenant?.nombre || config?.institucion || ""}
        </span>
        {(user?.tenant?.vigencia_actual || config?.vigencia) && (
          <span className="ml-2 text-xs text-slate-400">
            Vigencia {user?.tenant?.vigencia_actual || config?.vigencia}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {mes && (
          <span className="text-sm text-slate-500">Mes actual: {mes}</span>
        )}
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">{user.nombre}</span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">
              {ROL_LABELS[user.rol] ?? user.rol}
            </span>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
