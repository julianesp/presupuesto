"use client";
import { useEffect, useState, useCallback } from "react";
import { rubrosIngresosApi } from "@/lib/api/rubros";
import type { RubroIngreso, RubroIngresoCreate } from "@/lib/types/rubros";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { rubroIndentClass } from "@/lib/utils/rubro-level";
import { PencilIcon, Trash2Icon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/common/CurrencyInput";

function RubroIngresoForm({
  open, rubro, onSave, onClose,
}: {
  open: boolean;
  rubro?: RubroIngreso | null;
  onSave: (d: RubroIngresoCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [codigo, setCodigo] = useState(rubro?.codigo ?? "");
  const [cuenta, setCuenta] = useState(rubro?.cuenta ?? "");
  const [presupuesto, setPresupuesto] = useState(rubro?.presupuesto_inicial ?? 0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ codigo, cuenta, presupuesto_inicial: presupuesto });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rubro ? "Editar Rubro" : "Nuevo Rubro de Ingreso"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Código</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={!!rubro} required />
          </div>
          <div className="space-y-1.5">
            <Label>Nombre de la Cuenta</Label>
            <Input value={cuenta} onChange={(e) => setCuenta(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Presupuesto Inicial</Label>
            <CurrencyInput value={presupuesto} onChange={setPresupuesto} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RubrosIngresosPage() {
  const [rubros, setRubros] = useState<RubroIngreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RubroIngreso | null>(null);
  const [deleting, setDeleting] = useState<RubroIngreso | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setRubros(await rubrosIngresosApi.getAll()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: RubroIngresoCreate) {
    try {
      if (editing) {
        await rubrosIngresosApi.update(editing.codigo, { cuenta: data.cuenta, presupuesto_inicial: data.presupuesto_inicial });
        toast({ title: "Rubro actualizado" });
      } else {
        await rubrosIngresosApi.create(data);
        toast({ title: "Rubro creado" });
      }
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
      throw e;
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await rubrosIngresosApi.delete(deleting.codigo);
      toast({ title: "Rubro eliminado" });
      setDeleting(null);
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setDelLoading(false); }
  }

  return (
    <div>
      <PageHeader
        title="Rubros de Ingresos"
        description="Árbol presupuestal de ingresos"
        action={{ label: "Nuevo Rubro", onClick: () => { setEditing(null); setFormOpen(true); } }}
      />
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && rubros.length === 0 && <EmptyState />}
      {!loading && !error && rubros.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 w-32">Código</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700">Cuenta</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Ppto. Inicial</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Adiciones</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Reducciones</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Ppto. Definitivo</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-700 text-right">Saldo x Recaudar</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rubros.map((r) => {
                const isLeaf = r.es_hoja === 1;
                return (
                  <TableRow key={r.codigo} className={!isLeaf ? "bg-slate-50" : ""}>
                    <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                    <TableCell>
                      <span className={`${rubroIndentClass(r.codigo)} ${!isLeaf ? "font-semibold" : ""}`}>
                        {r.cuenta}
                      </span>
                    </TableCell>
                    <TableCell className="text-right"><CurrencyDisplay value={r.presupuesto_inicial} /></TableCell>
                    <TableCell className="text-right"><CurrencyDisplay value={r.adiciones} /></TableCell>
                    <TableCell className="text-right"><CurrencyDisplay value={r.reducciones} /></TableCell>
                    <TableCell className="text-right font-medium"><CurrencyDisplay value={r.presupuesto_definitivo} /></TableCell>
                    <TableCell className="text-right"><CurrencyDisplay value={r.saldo_por_recaudar ?? 0} /></TableCell>
                    <TableCell>
                      {isLeaf && (
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(r); setFormOpen(true); }}>
                            <PencilIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleting(r)}>
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <RubroIngresoForm open={formOpen} rubro={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        title="¿Eliminar rubro?"
        description={`Se eliminará "${deleting?.cuenta}".`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={delLoading}
      />
    </div>
  );
}
