"use client";
import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api/dashboard";
import type { DashboardResumen } from "@/lib/types/dashboard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { EquilibrioIndicator } from "@/components/dashboard/EquilibrioIndicator";
import { BarraCadena } from "@/components/dashboard/BarraCadena";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { useAuth } from "@/contexts/AuthContext";

function IndicadorEjecucion({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  const barColor =
    pct >= 100 ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : color;
  const alertClass =
    pct >= 100 ? "text-red-700 font-bold" : pct >= 90 ? "text-amber-700 font-semibold" : "text-slate-700";
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-600">{label}</span>
        <span className={`font-mono ${alertClass}`}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [data, setData] = useState<DashboardResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getResumen();
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Solo cargar datos cuando la autenticación esté lista
    if (!authLoading && isAuthenticated) {
      load();
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading || loading) return <LoadingTable rows={6} cols={3} />;
  if (error) return <ErrorAlert message={error} onRetry={load} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>

      {/* KPIs Gastos */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Ejecución de Gastos
        </p>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard title="Apropiación Definitiva" value={data.apropiacion} />
          <KpiCard title="CDP Expedidos" value={data.cdp} />
          <KpiCard title="Saldo Disponible" value={data.saldo_disponible} />
          <KpiCard title="Comprometido (RP)" value={data.comprometido} />
          <KpiCard title="Obligado" value={data.obligado} />
          <KpiCard title="Pagado" value={data.pagado} />
        </div>
      </div>

      {/* Indicadores de ejecución */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gastos */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Indicadores de Ejecución — Gastos
          </p>
          <div className="space-y-4">
            <IndicadorEjecucion label="CDP / Apropiación" pct={data.pct_cdp} color="bg-indigo-500" />
            <IndicadorEjecucion label="Comprometido / Apropiación" pct={data.pct_comprometido} color="bg-violet-500" />
            <IndicadorEjecucion label="Obligado / Apropiación" pct={data.pct_obligado} color="bg-amber-500" />
            <IndicadorEjecucion label="Pagado / Apropiación" pct={data.pct_pagado} color="bg-emerald-500" />
          </div>
          {data.pct_pagado >= 90 && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              ⚠️ La ejecución de pagos supera el 90% de la apropiación
            </div>
          )}
        </div>

        {/* Ingresos */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Indicadores de Ejecución — Ingresos
          </p>
          <div className="space-y-4">
            <IndicadorEjecucion label="Recaudado / Presupuesto" pct={data.pct_recaudado} color="bg-teal-500" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Presupuesto Ingresos</span>
              <span className="font-mono text-slate-800"><CurrencyDisplay value={data.ppto_ingresos} /></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Recaudado</span>
              <span className="font-mono text-emerald-700"><CurrencyDisplay value={data.recaudado} /></span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
              <span className="text-slate-500">Saldo por Recaudar</span>
              <span className="font-mono text-slate-800"><CurrencyDisplay value={data.saldo_por_recaudar} /></span>
            </div>
          </div>
        </div>
      </div>

      {/* Equilibrio + Cadena */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <EquilibrioIndicator equilibrio={data.equilibrio} />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <BarraCadena
            apropiacion={data.apropiacion}
            cdp={data.cdp}
            comprometido={data.comprometido}
            obligado={data.obligado}
            pagado={data.pagado}
          />
        </div>
      </div>
    </div>
  );
}
