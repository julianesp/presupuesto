"use client";
import { useCallback, useEffect, useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { contabilidadApi, type Periodo } from "@/lib/api/contabilidad";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { mesNombre } from "@/lib/utils/dates";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";

export default function PeriodosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const puedeCerrar = user?.rol === "ADMIN" || !!user?.superAdmin;
  const puedeAbrir = !!user?.superAdmin;

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<Periodo | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPeriodos(await contabilidadApi.periodos());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cambiar(p: Periodo) {
    try {
      if (p.cerrado) await contabilidadApi.abrirPeriodo(p.anio, p.mes);
      else await contabilidadApi.cerrarPeriodo(p.anio, p.mes);
      toast({ title: `${mesNombre(p.mes)} ${p.anio} ${p.cerrado ? "reabierto" : "cerrado"}` });
      await cargar();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally {
      setConfirmar(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Periodos Contables</h1>
        <p className="text-sm text-slate-500 mt-1">
          Un mes cerrado no admite comprobantes nuevos ni anulaciones. Solo un super administrador puede reabrirlo.
        </p>
      </div>

      {loading && <LoadingTable rows={4} cols={4} />}
      {!loading && error && <ErrorAlert message={error} onRetry={cargar} />}
      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {periodos.map((p) => (
            <div
              key={p.mes}
              className={`rounded-lg border p-4 space-y-3 ${p.cerrado ? "border-slate-300 bg-slate-50" : "border-emerald-200 bg-white"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-slate-900">
                  {mesNombre(p.mes)} {p.anio}
                </p>
                {p.cerrado ? <Lock className="h-4 w-4 text-slate-500" /> : <LockOpen className="h-4 w-4 text-emerald-600" />}
              </div>
              <p className="text-xs text-slate-500">
                {p.cerrado ? `Cerrado el ${p.fechaCierre?.slice(0, 10) ?? ""}` : "Abierto"}
              </p>
              {((p.cerrado && puedeAbrir) || (!p.cerrado && puedeCerrar)) && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => setConfirmar(p)}>
                  {p.cerrado ? "Reabrir" : "Cerrar periodo"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmar}
        title={confirmar ? `¿${confirmar.cerrado ? "Reabrir" : "Cerrar"} ${mesNombre(confirmar.mes)} ${confirmar.anio}?` : ""}
        description={
          confirmar?.cerrado
            ? "Se podrán registrar y anular comprobantes de este mes otra vez."
            : "No se podrán registrar ni anular comprobantes con fecha de este mes."
        }
        onConfirm={() => confirmar && cambiar(confirmar)}
        onCancel={() => setConfirmar(null)}
      />
    </div>
  );
}
