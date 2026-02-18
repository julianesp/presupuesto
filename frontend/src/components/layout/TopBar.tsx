"use client";
import { useEffect, useState } from "react";
import { configApi } from "@/lib/api/config";
import { mesNombre } from "@/lib/utils/dates";
import type { Config } from "@/lib/types/config";

export function TopBar() {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    configApi.get().then(setConfig).catch(() => null);
  }, []);

  const mes = config?.mes_actual ? mesNombre(parseInt(config.mes_actual)) : "";

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div>
        <span className="text-sm font-medium text-slate-700">
          {config?.institucion || ""}
        </span>
        {config?.vigencia && (
          <span className="ml-2 text-xs text-slate-400">
            Vigencia {config.vigencia}
          </span>
        )}
      </div>
      <div className="text-sm text-slate-500">
        {mes && `Mes actual: ${mes}`}
      </div>
    </header>
  );
}
