"use client";
import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api/dashboard";
import type { DashboardResumen } from "@/lib/types/dashboard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { EquilibrioIndicator } from "@/components/dashboard/EquilibrioIndicator";
import { BarraCadena } from "@/components/dashboard/BarraCadena";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";

export default function DashboardPage() {
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

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingTable rows={6} cols={3} />;
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

      {/* KPIs Ingresos */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Ejecución de Ingresos
        </p>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard title="Presupuesto Ingresos" value={data.ppto_ingresos} />
          <KpiCard title="Recaudado" value={data.recaudado} />
          <KpiCard title="Saldo por Recaudar" value={data.saldo_por_recaudar} />
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
