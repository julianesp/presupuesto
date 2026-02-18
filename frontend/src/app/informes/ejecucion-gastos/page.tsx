"use client";
import { useEffect, useState, useCallback } from "react";
import { informesApi } from "@/lib/api/informes";
import type { EjecucionGastoRow } from "@/lib/types/informes";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { MesSelector } from "@/components/common/MesSelector";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { rubroIndentClass } from "@/lib/utils/rubro-level";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function EjecucionGastosPage() {
  const [mes, setMes] = useState("");
  const [rows, setRows] = useState<EjecucionGastoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await informesApi.ejecucionGastos(mes ? parseInt(mes) : undefined));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [mes]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Ejecución de Gastos</h1>
        <MesSelector value={mes} onChange={setMes} label="Todos los meses" />
      </div>
      {loading && <LoadingTable rows={10} cols={10} />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 sticky left-0 bg-slate-50 z-10 w-28">Código</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 sticky left-28 bg-slate-50 z-10 min-w-52">Cuenta</TableHead>
                {["Ppto Inicial", "Adiciones", "Reducciones", "Créditos", "Contracréditos", "Ppto Definitivo", "Comp Ant", "Comp Mes", "Comp Acum", "Pago Ant", "Pago Mes", "Pago Acum", "Saldo Aprop", "Saldo x Pagar"].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-wide text-slate-700 text-right min-w-28">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.codigo} className={r.es_hoja === 0 ? "bg-slate-50 font-semibold" : ""}>
                  <TableCell className="font-mono text-xs sticky left-0 bg-inherit z-10">{r.codigo}</TableCell>
                  <TableCell className={`sticky left-28 bg-inherit z-10 ${rubroIndentClass(r.codigo)}`}>{r.cuenta}</TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.ppto_inicial} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.adiciones} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.reducciones} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.creditos} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.contracreditos} /></TableCell>
                  <TableCell className="text-right font-medium"><CurrencyDisplay value={r.ppto_definitivo} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.comp_anterior} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.comp_mes} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.comp_acumulado} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.pago_anterior} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.pago_mes} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.pago_acumulado} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.saldo_apropiacion} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.saldo_comp_pagar} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
