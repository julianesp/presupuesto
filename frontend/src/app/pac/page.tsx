"use client";
import { useEffect, useState, useCallback } from "react";
import { pacApi } from "@/lib/api/pac";
import type { PACResumenRubro } from "@/lib/types/pac";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { useToast } from "@/hooks/use-toast";
import { mesNombre } from "@/lib/utils/dates";
import { formatCOP, parseCOP } from "@/lib/utils/currency";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SaveIcon, Wand2, RefreshCw } from "lucide-react";

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

function PacProgress({ total_pac, apropiacion }: { total_pac: number; apropiacion: number }) {
  if (apropiacion <= 0) return null;
  const pct = Math.min(100, Math.round((total_pac / apropiacion) * 100));
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium ${pct >= 100 ? "text-emerald-600" : pct >= 50 ? "text-blue-600" : "text-amber-600"}`}>
        {pct}%
      </span>
    </div>
  );
}

export default function PacPage() {
  const [rubros, setRubros] = useState<PACResumenRubro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [distribuyendo, setDistribuyendo] = useState<string | null>(null);
  const [distribuyendoTodos, setDistribuyendoTodos] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pacApi.getAll();
      setRubros(data);
      const init: Record<string, string[]> = {};
      data.forEach((r) => {
        const vals = Array.from({ length: 12 }, (_, i) => {
          const mes = r.pac.find((p) => p.mes === i + 1);
          return mes ? formatCOP(mes.valor_programado) : "$ 0";
        });
        init[r.codigo] = vals;
      });
      setEditValues(init);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleCellChange(codigo: string, idx: number, val: string) {
    setEditValues((prev) => {
      const arr = [...(prev[codigo] ?? Array(12).fill("$ 0"))];
      arr[idx] = val;
      return { ...prev, [codigo]: arr };
    });
  }

  async function handleSave(rubro: PACResumenRubro) {
    setSaving(rubro.codigo);
    try {
      const valores_mensuales = (editValues[rubro.codigo] ?? []).map((v) => parseCOP(v));
      await pacApi.update(rubro.codigo, { valores_mensuales });
      toast({ title: "PAC actualizado" });
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setSaving(null); }
  }

  async function handleDistribuir(rubro: PACResumenRubro) {
    setDistribuyendo(rubro.codigo);
    try {
      await pacApi.distribuirUniforme(rubro.codigo);
      toast({ title: `PAC distribuido uniformemente para ${rubro.codigo}` });
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setDistribuyendo(null); }
  }

  async function handleDistribuirTodos() {
    setDistribuyendoTodos(true);
    try {
      const res = await pacApi.distribuirTodos();
      toast({ title: res.message });
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setDistribuyendoTodos(false); }
  }

  const totalProgramado = rubros.reduce((s, r) => s + r.total_pac, 0);
  const totalApropriacion = rubros.reduce((s, r) => s + r.apropiacion_definitiva, 0);
  const rubrosConfigurados = rubros.filter((r) => r.pac_configurado).length;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Plan Anual de Caja (PAC)</h1>
          <p className="text-sm text-slate-500 mt-1">Programación mensual por rubro de gasto</p>
        </div>
        {rubros.length > 0 && (
          <Button
            onClick={handleDistribuirTodos}
            disabled={distribuyendoTodos}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Wand2 className="h-4 w-4" />
            {distribuyendoTodos ? "Distribuyendo..." : "Distribuir todos uniformemente"}
          </Button>
        )}
      </div>

      {rubros.length > 0 && (
        <div className="mb-4 flex items-center gap-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div>
            <span className="text-slate-500">Rubros configurados: </span>
            <span className="font-semibold">{rubrosConfigurados}</span>
            <span className="text-slate-400"> / {rubros.length}</span>
          </div>
          <div>
            <span className="text-slate-500">Total programado: </span>
            <span className="font-semibold"><CurrencyDisplay value={totalProgramado} /></span>
          </div>
          <div>
            <span className="text-slate-500">Total apropiación: </span>
            <span className="font-semibold"><CurrencyDisplay value={totalApropriacion} /></span>
          </div>
          <PacProgress total_pac={totalProgramado} apropiacion={totalApropriacion} />
        </div>
      )}

      {loading && <LoadingTable rows={8} cols={14} />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && rubros.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
          <p className="text-slate-500">No hay rubros de gasto registrados.</p>
          <p className="mt-1 text-sm text-slate-400">
            Primero crea rubros de gasto en{" "}
            <a href="/rubros/gastos" className="text-blue-600 hover:underline">Rubros de Gastos</a>{" "}
            para configurar el PAC.
          </p>
        </div>
      )}
      {!loading && !error && rubros.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 sticky left-0 bg-slate-50 z-10 w-32">Código</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 sticky left-32 bg-slate-50 z-10 min-w-48">Cuenta</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Aprop.</TableHead>
                {MESES.map((m) => (
                  <TableHead key={m} className="text-xs uppercase tracking-wide text-slate-700 text-center min-w-28">
                    {mesNombre(m).slice(0, 3)}
                  </TableHead>
                ))}
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right min-w-28">Total PAC</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-center w-24">%</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rubros.map((r) => (
                <TableRow key={r.codigo}>
                  <TableCell className="font-mono text-xs sticky left-0 bg-white z-10">{r.codigo}</TableCell>
                  <TableCell className="text-sm sticky left-32 bg-white z-10 max-w-xs truncate">
                    <div className="flex flex-col gap-0.5">
                      <span>{r.cuenta}</span>
                      {r.pac_configurado && (
                        <Badge variant="outline" className="w-fit text-xs text-emerald-600 border-emerald-300 bg-emerald-50 py-0 px-1.5 h-4">
                          configurado
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm"><CurrencyDisplay value={r.apropiacion_definitiva} /></TableCell>
                  {MESES.map((_, i) => (
                    <TableCell key={i} className="p-1">
                      <Input
                        value={editValues[r.codigo]?.[i] ?? "$ 0"}
                        onChange={(e) => handleCellChange(r.codigo, i, e.target.value)}
                        onBlur={(e) => {
                          const num = parseCOP(e.target.value);
                          handleCellChange(r.codigo, i, num > 0 ? formatCOP(num) : "$ 0");
                        }}
                        className="h-7 text-right text-xs tabular-nums w-24"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-sm font-medium">
                    <CurrencyDisplay value={r.total_pac} />
                  </TableCell>
                  <TableCell className="text-center">
                    <PacProgress total_pac={r.total_pac} apropiacion={r.apropiacion_definitiva} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDistribuir(r)}
                        disabled={distribuyendo === r.codigo}
                        title="Distribuir uniformemente"
                      >
                        {distribuyendo === r.codigo
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          : <Wand2 className="h-3.5 w-3.5" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleSave(r)}
                        disabled={saving === r.codigo}
                        title="Guardar PAC"
                      >
                        <SaveIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
