"use client";
import { useEffect, useState, useCallback } from "react";
import { recaudosApi } from "@/lib/api/recaudos";
import { rubrosIngresosApi } from "@/lib/api/rubros";
import { cuentasBancariasApi } from "@/lib/api/cuentas-bancarias";
import type { Recaudo, RecaudoCreate } from "@/lib/types/recaudo";
import type { RubroIngreso } from "@/lib/types/rubros";
import type { CuentaBancaria } from "@/lib/types/cuenta-bancaria";
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

function RecaudoForm({
  open, rubros, cuentas, onSave, onClose,
}: {
  open: boolean;
  rubros: RubroIngreso[];
  cuentas: CuentaBancaria[];
  onSave: (d: RecaudoCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [codigoRubro, setCodigoRubro] = useState("");
  const [valor, setValor] = useState(0);
  const [concepto, setConcepto] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [loading, setLoading] = useState(false);

  const hojas = rubros.filter((r) => r.es_hoja === 1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        codigo_rubro: codigoRubro,
        valor,
        concepto,
        no_comprobante: comprobante,
        cuenta_bancaria_id: cuentaId ? parseInt(cuentaId) : 0,
      });
      onClose();
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo Recaudo</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Rubro de Ingreso</Label>
            <Select value={codigoRubro} onValueChange={setCodigoRubro}>
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
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div className="space-y-1.5">
            <Label>Concepto</Label>
            <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>N° Comprobante</Label>
            <Input value={comprobante} onChange={(e) => setComprobante(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cuenta Bancaria</Label>
            <Select value={cuentaId} onValueChange={setCuentaId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cuenta..." /></SelectTrigger>
              <SelectContent>
                {cuentas.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.banco} — {c.numero_cuenta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

export default function RecaudosPage() {
  const [recaudos, setRecaudos] = useState<Recaudo[]>([]);
  const [rubros, setRubros] = useState<RubroIngreso[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [anulando, setAnulando] = useState<Recaudo | null>(null);
  const [anulLoading, setAnulLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rs, rubrs, cs] = await Promise.all([
        recaudosApi.getAll(filtro || undefined),
        rubrosIngresosApi.getAll(),
        cuentasBancariasApi.getAll(),
      ]);
      setRecaudos(rs); setRubros(rubrs); setCuentas(cs);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [filtro]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: RecaudoCreate) {
    try {
      await recaudosApi.create(data);
      toast({ title: "Recaudo registrado" });
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
      await recaudosApi.anular(anulando.numero);
      toast({ title: "Recaudo anulado" });
      setAnulando(null); load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setAnulLoading(false); }
  }

  return (
    <div>
      <PageHeader
        title="Recaudos"
        action={{ label: "Nuevo Recaudo", onClick: () => setFormOpen(true) }}
      />
      <div className="flex gap-3 mb-4"><FiltroEstado value={filtro} onChange={setFiltro} /></div>
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && recaudos.length === 0 && <EmptyState />}
      {!loading && !error && recaudos.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {["N°", "Fecha", "Rubro", "Concepto", "Comprobante", "Valor", "Estado", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-wide text-slate-700">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {recaudos.map((r) => (
                <TableRow key={r.numero} className={r.estado === "Anulado" ? "opacity-60" : ""}>
                  <TableCell className="font-mono">{r.numero}</TableCell>
                  <TableCell>{formatDate(r.fecha)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.codigo_rubro}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{r.concepto}</TableCell>
                  <TableCell className="text-sm">{r.no_comprobante}</TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.valor} /></TableCell>
                  <TableCell><EstadoBadge estado={r.estado} /></TableCell>
                  <TableCell>
                    {r.estado === "Activo" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setAnulando(r)}>
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
      <RecaudoForm open={formOpen} rubros={rubros} cuentas={cuentas} onSave={handleSave} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!anulando}
        title="¿Anular recaudo?"
        description={`Se anulará el recaudo N° ${anulando?.numero}.`}
        onConfirm={handleAnular}
        onCancel={() => setAnulando(null)}
        loading={anulLoading}
      />
    </div>
  );
}
