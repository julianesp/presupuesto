"use client";
import { useEffect, useState, useCallback } from "react";
import { informesApi } from "@/lib/api/informes";
import type { PacVsEjecutadoResponse, PacRubroRow } from "@/lib/types/informes";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { LoadingTable } from "@/components/common/LoadingTable";
import { EmptyState } from "@/components/common/EmptyState";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { MesSelector } from "@/components/common/MesSelector";
import { mesNombre } from "@/lib/utils/dates";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchIcon, PrinterIcon } from "lucide-react";

function BarraProgreso({ pct }: { pct: number }) {
  const color =
    pct >= 100 ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : pct >= 50 ? "bg-blue-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-mono w-12 text-right ${pct >= 100 ? "text-red-600 font-bold" : "text-slate-600"}`}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export default function PacVsEjecutadoPage() {
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [data, setData] = useState<PacVsEjecutadoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await informesApi.pacVsEjecutado(parseInt(mes)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [mes]);

  useEffect(() => { buscar(); }, [buscar]);

  const rubros = data?.rubros ?? [];
  const conPac = rubros.filter((r) => r.pac_total > 0 || r.pagado_total > 0);

  const totPac = conPac.reduce((s, r) => s + r.pac_total, 0);
  const totPag = conPac.reduce((s, r) => s + r.pagado_total, 0);
  const totPct = totPac > 0 ? Math.round((totPag / totPac) * 1000) / 10 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">PAC vs Ejecutado</h1>
          <p className="text-sm text-slate-500 mt-1">Comparativo PAC programado vs pagos reales</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <PrinterIcon className="h-4 w-4 mr-1" />Imprimir
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div className="space-y-1.5">
          <Label>Corte al mes</Label>
          <MesSelector value={mes} onChange={setMes} label="Mes actual" />
        </div>
        <Button onClick={buscar} disabled={loading}>
          <SearchIcon className="h-4 w-4 mr-2" />
          {loading ? "Consultando..." : "Consultar"}
        </Button>
      </div>

      {error && <ErrorAlert message={error} onRetry={buscar} />}
      {loading && <LoadingTable rows={8} cols={5} />}

      {data && !loading && (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">PAC Acumulado</p>
              <p className="text-xl font-semibold text-slate-800 mt-1"><CurrencyDisplay value={totPac} /></p>
              <p className="text-xs text-slate-400 mt-0.5">Hasta {mesNombre(parseInt(mes))}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Pagado</p>
              <p className="text-xl font-semibold text-emerald-700 mt-1"><CurrencyDisplay value={totPag} /></p>
              <p className="text-xs text-slate-400 mt-0.5">Pagos efectivos</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Ejecución PAC</p>
              <p className={`text-xl font-semibold mt-1 ${totPct >= 100 ? "text-red-600" : totPct >= 90 ? "text-amber-600" : "text-blue-700"}`}>
                {totPct.toFixed(1)}%
              </p>
              <BarraProgreso pct={totPct} />
            </div>
          </div>

          {conPac.length === 0 ? (
            <EmptyState message="Sin datos de PAC para este período" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs uppercase text-slate-600">Código</TableHead>
                    <TableHead className="text-xs uppercase text-slate-600">Rubro</TableHead>
                    <TableHead className="text-xs uppercase text-slate-600 text-right">PAC</TableHead>
                    <TableHead className="text-xs uppercase text-slate-600 text-right">Pagado</TableHead>
                    <TableHead className="text-xs uppercase text-slate-600 text-right">Saldo PAC</TableHead>
                    <TableHead className="text-xs uppercase text-slate-600 w-40">% Ejecución</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conPac.map((r: PacRubroRow) => (
                    <TableRow key={r.codigo} className="text-sm">
                      <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                      <TableCell className="max-w-xs truncate">{r.cuenta}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <CurrencyDisplay value={r.pac_total} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-700">
                        <CurrencyDisplay value={r.pagado_total} />
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs ${r.saldo_pac < 0 ? "text-red-600 font-bold" : ""}`}>
                        <CurrencyDisplay value={r.saldo_pac} />
                      </TableCell>
                      <TableCell className="w-40">
                        <BarraProgreso pct={r.pct_ejecucion} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold bg-slate-50">
                    <TableCell colSpan={2}>TOTALES</TableCell>
                    <TableCell className="text-right"><CurrencyDisplay value={totPac} /></TableCell>
                    <TableCell className="text-right"><CurrencyDisplay value={totPag} /></TableCell>
                    <TableCell className="text-right"><CurrencyDisplay value={totPac - totPag} /></TableCell>
                    <TableCell><BarraProgreso pct={totPct} /></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
