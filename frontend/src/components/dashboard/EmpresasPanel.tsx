"use client";
import { useState } from "react";
import { Building2, Check, Plus } from "lucide-react";
import { empresasApi, type EmpresaResumen } from "@/lib/api/empresas";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  empresas: EmpresaResumen[];
  puedeAdministrar: boolean;
  onCambio: () => void;
}

function pct(parte: number, total: number) {
  return total > 0 ? (parte / total) * 100 : 0;
}

function NuevaEmpresaForm({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {
  const { toast } = useToast();
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [vigencia, setVigencia] = useState(String(new Date().getFullYear()));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await empresasApi.create({ nombre, nit, vigenciaActual: parseInt(vigencia) });
      toast({ title: "Empresa creada" });
      onCreada();
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo crear la empresa",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Nombre *</Label>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>NIT *</Label>
        <Input value={nit} onChange={(e) => setNit(e.target.value)} required placeholder="000.000.000-0" />
      </div>
      <div className="space-y-1">
        <Label>Vigencia</Label>
        <Input type="number" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Creando..." : "Crear empresa"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Tarjetas con el resumen presupuestal de cada empresa o institución.
 * Los super admin pueden crear empresas y cambiar la empresa en la que trabajan.
 */
export function EmpresasPanel({ empresas, puedeAdministrar, onCambio }: Props) {
  const { toast } = useToast();
  const [creando, setCreando] = useState(false);
  const [activando, setActivando] = useState<string | null>(null);

  async function activar(empresa: EmpresaResumen) {
    setActivando(empresa.id);
    try {
      await empresasApi.activar(empresa.id);
      // Recargar para que todas las vistas usen la nueva empresa
      window.location.reload();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo cambiar de empresa",
        variant: "destructive",
      });
      setActivando(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Empresas e instituciones ({empresas.length})
        </p>
        {puedeAdministrar && (
          <Button size="sm" variant="outline" onClick={() => setCreando(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nueva empresa
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {empresas.map((e) => (
          <div
            key={e.id}
            className={`bg-white rounded-lg border p-4 space-y-3 ${
              e.activa ? "border-indigo-400 ring-1 ring-indigo-200" : "border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <Building2 className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 leading-tight">{e.nombre}</p>
                  <p className="text-xs text-slate-400">
                    NIT {e.nit} · Vigencia {e.vigenciaActual}
                  </p>
                </div>
              </div>
              {e.activa && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 shrink-0">
                  Activa
                </span>
              )}
            </div>

            {e.rubrosIngresos + e.rubrosGastos === 0 ? (
              <p className="text-sm text-slate-400">Sin catálogo presupuestal cargado</p>
            ) : (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Presupuesto ingresos</span>
                  <CurrencyDisplay value={e.pptoIngresos} className="font-mono text-slate-800" />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Apropiación gastos</span>
                  <CurrencyDisplay value={e.apropiacion} className="font-mono text-slate-800" />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Comprometido (RP)</span>
                  <span className="font-mono text-slate-700">
                    {pct(e.comprometido, e.apropiacion).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recaudado</span>
                  <span className="font-mono text-slate-700">
                    {pct(e.recaudado, e.pptoIngresos).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 pt-1">
                  {e.rubrosIngresos} rubros de ingresos · {e.rubrosGastos} de gastos
                </p>
              </div>
            )}

            {puedeAdministrar && !e.activa && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={activando !== null}
                onClick={() => activar(e)}
              >
                {activando === e.id ? "Cambiando..." : "Trabajar en esta empresa"}
              </Button>
            )}
            {e.activa && (
              <p className="flex items-center justify-center gap-1 text-xs text-indigo-600">
                <Check className="h-3.5 w-3.5" /> Estás trabajando en esta empresa
              </p>
            )}
          </div>
        ))}
      </div>

      <Dialog open={creando} onOpenChange={setCreando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva empresa o institución</DialogTitle>
          </DialogHeader>
          <NuevaEmpresaForm onClose={() => setCreando(false)} onCreada={onCambio} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
