"use client";
import { useEffect, useState, useCallback } from "react";
import { cdpApi } from "@/lib/api/cdp";
import { rubrosGastosApi } from "@/lib/api/rubros";
import type { CDP, CDPCreate } from "@/lib/types/cdp";
import type { RubroGasto } from "@/lib/types/rubros";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import { EstadoBadge } from "@/components/common/EstadoBadge";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { FiltroEstado } from "@/components/common/FiltroEstado";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils/dates";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BanIcon } from "lucide-react";

function CdpForm({
  open, rubros, onSave, onClose,
}: {
  open: boolean;
  rubros: RubroGasto[];
  onSave: (d: CDPCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [codigoRubro, setCodigoRubro] = useState("");
  const [objeto, setObjeto] = useState("");
  const [valor, setValor] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await onSave({ codigo_rubro: codigoRubro, objeto, valor }); onClose(); }
    finally { setLoading(false); }
  }

  const hojas = rubros.filter((r) => r.es_hoja === 1);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuevo CDP</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Rubro de Gasto</Label>
            <Select value={codigoRubro} onValueChange={setCodigoRubro} required>
              <SelectTrigger><SelectValue placeholder="Seleccionar rubro..." /></SelectTrigger>
              <SelectContent>
                {hojas.map((r) => (
                  <SelectItem key={r.codigo} value={r.codigo}>
                    {r.codigo} — {r.cuenta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Objeto del CDP</Label>
            <Input value={objeto} onChange={(e) => setObjeto(e.target.value)} placeholder="Descripción del objeto" required />
          </div>
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || valor <= 0 || !codigoRubro}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CdpPage() {
  const [cdps, setCdps] = useState<CDP[]>([]);
  const [rubros, setRubros] = useState<RubroGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [anulando, setAnulando] = useState<CDP | null>(null);
  const [anulLoading, setAnulLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cs, rs] = await Promise.all([
        cdpApi.getAll(filtro || undefined),
        rubrosGastosApi.getAll(),
      ]);
      setCdps(cs);
      setRubros(rs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }, [filtro]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: CDPCreate) {
    try {
      await cdpApi.create(data);
      toast({ title: "CDP creado" });
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
      throw e;
    }
  }

  async function handleAnular() {
    if (!anulando) return;
    setAnulLoading(true);
    try {
      await cdpApi.anular(anulando.numero);
      toast({ title: "CDP anulado" });
      setAnulando(null);
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setAnulLoading(false); }
  }

  return (
    <div>
      <PageHeader
        title="Certificados de Disponibilidad (CDP)"
        action={{ label: "Nuevo CDP", onClick: () => setFormOpen(true) }}
      />
      <div className="flex gap-3 mb-4">
        <FiltroEstado value={filtro} onChange={setFiltro} />
      </div>
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && cdps.length === 0 && <EmptyState />}
      {!loading && !error && cdps.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs uppercase tracking-wide text-slate-700">N°</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700">Fecha</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700">Rubro</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700">Objeto</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Valor</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Saldo</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700">Estado</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cdps.map((c) => (
                <TableRow
                  key={c.numero}
                  className={c.estado === "Anulado" ? "opacity-60" : ""}
                >
                  <TableCell className="font-mono">{c.numero}</TableCell>
                  <TableCell>{formatDate(c.fecha)}</TableCell>
                  <TableCell className="font-mono text-xs">{c.codigo_rubro}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{c.objeto}</TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={c.valor} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={c.saldo ?? 0} /></TableCell>
                  <TableCell><EstadoBadge estado={c.estado} /></TableCell>
                  <TableCell>
                    {c.estado === "Activo" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => setAnulando(c)}
                        title="Anular"
                      >
                        <BanIcon className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <CdpForm open={formOpen} rubros={rubros} onSave={handleSave} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!anulando}
        title="¿Anular CDP?"
        description={`Se anulará el CDP N° ${anulando?.numero}. Esta acción no se puede deshacer.`}
        onConfirm={handleAnular}
        onCancel={() => setAnulando(null)}
        loading={anulLoading}
      />
    </div>
  );
}
