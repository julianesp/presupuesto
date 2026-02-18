"use client";
import { useEffect, useState, useCallback } from "react";
import { pacApi } from "@/lib/api/pac";
import type { PACResumenRubro } from "@/lib/types/pac";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { useToast } from "@/hooks/use-toast";
import { mesNombre } from "@/lib/utils/dates";
import { formatCOP, parseCOP } from "@/lib/utils/currency";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveIcon } from "lucide-react";

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function PacPage() {
  const [rubros, setRubros] = useState<PACResumenRubro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
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

  return (
    <div>
      <PageHeader title="Plan Anual de Caja (PAC)" description="Programación mensual por rubro de gasto" />
      {loading && <LoadingTable rows={8} cols={14} />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && rubros.length === 0 && <EmptyState />}
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
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Total PAC</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rubros.map((r) => (
                <TableRow key={r.codigo}>
                  <TableCell className="font-mono text-xs sticky left-0 bg-white z-10">{r.codigo}</TableCell>
                  <TableCell className="text-sm sticky left-32 bg-white z-10 max-w-xs truncate">{r.cuenta}</TableCell>
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
                  <TableCell>
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
