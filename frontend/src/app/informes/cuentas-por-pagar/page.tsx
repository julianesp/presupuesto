"use client";
import { useEffect, useState, useCallback } from "react";
import { informesApi } from "@/lib/api/informes";
import type { CuentaPorPagarRow } from "@/lib/types/informes";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { LoadingTable } from "@/components/common/LoadingTable";
import { EmptyState } from "@/components/common/EmptyState";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { formatDate } from "@/lib/utils/dates";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCwIcon, SearchIcon, PrinterIcon } from "lucide-react";

export default function CuentasPorPagarPage() {
  const [data, setData] = useState<CuentaPorPagarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await informesApi.cuentasPorPagar());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtrado = filtro
    ? data.filter(
        (r) =>
          r.tercero.toLowerCase().includes(filtro.toLowerCase()) ||
          r.nit.includes(filtro) ||
          r.codigo_rubro.includes(filtro),
      )
    : data;

  // Agrupar por NIT
  const porTercero = filtrado.reduce<Record<string, CuentaPorPagarRow[]>>((acc, r) => {
    const key = r.nit;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const totalSaldo = filtrado.reduce((s, r) => s + r.saldo_por_pagar, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cuentas por Pagar</h1>
          <p className="text-sm text-slate-500 mt-1">Obligaciones activas con saldo pendiente de pago</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <PrinterIcon className="h-4 w-4 mr-1" />Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCwIcon className="h-4 w-4 mr-1" />Actualizar
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <SearchIcon className="h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por tercero, NIT o rubro..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="max-w-sm"
        />
        {filtrado.length > 0 && (
          <span className="text-sm text-slate-500">
            {filtrado.length} obligación{filtrado.length !== 1 ? "es" : ""} — Total:{" "}
            <strong><CurrencyDisplay value={totalSaldo} /></strong>
          </span>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={load} />}
      {loading && <LoadingTable rows={8} cols={7} />}

      {!loading && !error && filtrado.length === 0 && (
        <EmptyState message="No hay cuentas por pagar pendientes" />
      )}

      {!loading && !error && filtrado.length > 0 && (
        <div className="space-y-6 print:space-y-4">
          {Object.entries(porTercero).map(([nit, items]) => {
            const totalTercero = items.reduce((s, r) => s + r.saldo_por_pagar, 0);
            return (
              <div key={nit} className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-700 text-white px-4 py-2 flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    {items[0].tercero}
                    <span className="ml-2 font-mono text-xs text-slate-300">NIT: {nit}</span>
                  </span>
                  <span className="font-mono text-sm">
                    <CurrencyDisplay value={totalTercero} />
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {["N° Obl.", "Fecha", "Rubro", "Factura/Ref.", "Valor Obl.", "Pagado", "Saldo"].map((h) => (
                        <TableHead key={h} className="text-xs uppercase text-slate-600">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((r) => (
                      <TableRow key={r.obl_numero} className="text-sm">
                        <TableCell className="font-mono">{r.obl_numero}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(r.fecha)}</TableCell>
                        <TableCell className="font-mono text-xs">{r.codigo_rubro}</TableCell>
                        <TableCell className="text-xs max-w-[160px] truncate">{r.factura || "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <CurrencyDisplay value={r.valor_obl} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-700">
                          {r.total_pagado > 0 ? <CurrencyDisplay value={r.total_pagado} /> : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-amber-700">
                          <CurrencyDisplay value={r.saldo_por_pagar} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}

          <div className="rounded-lg bg-slate-800 text-white px-4 py-3 flex justify-between items-center font-semibold">
            <span>TOTAL CUENTAS POR PAGAR</span>
            <span className="font-mono text-lg"><CurrencyDisplay value={totalSaldo} /></span>
          </div>
        </div>
      )}
    </div>
  );
}
