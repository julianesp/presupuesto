"use client";
import { useEffect, useState, useCallback } from "react";
import { cuentasBancariasApi } from "@/lib/api/cuentas-bancarias";
import type { CuentaBancaria, CuentaBancariaCreate } from "@/lib/types/cuenta-bancaria";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import { EstadoBadge } from "@/components/common/EstadoBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
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
import { PencilIcon, Trash2Icon } from "lucide-react";

function CuentaForm({
  open, cuenta, onSave, onClose,
}: {
  open: boolean;
  cuenta?: CuentaBancaria | null;
  onSave: (d: CuentaBancariaCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [banco, setBanco] = useState(cuenta?.banco ?? "");
  const [tipoCuenta, setTipoCuenta] = useState(cuenta?.tipo_cuenta ?? "Ahorros");
  const [numeroCuenta, setNumeroCuenta] = useState(cuenta?.numero_cuenta ?? "");
  const [denominacion, setDenominacion] = useState(cuenta?.denominacion ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await onSave({ banco, tipo_cuenta: tipoCuenta, numero_cuenta: numeroCuenta, denominacion }); onClose(); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{cuenta ? "Editar Cuenta" : "Nueva Cuenta Bancaria"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Banco</Label>
            <Input value={banco} onChange={(e) => setBanco(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de Cuenta</Label>
            <Select value={tipoCuenta} onValueChange={setTipoCuenta}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ahorros">Ahorros</SelectItem>
                <SelectItem value="Corriente">Corriente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Número de Cuenta</Label>
            <Input value={numeroCuenta} onChange={(e) => setNumeroCuenta(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Denominación</Label>
            <Input value={denominacion} onChange={(e) => setDenominacion(e.target.value)} placeholder="Opcional" />
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

export default function CuentasBancariasPage() {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CuentaBancaria | null>(null);
  const [deleting, setDeleting] = useState<CuentaBancaria | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setCuentas(await cuentasBancariasApi.getAll()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: CuentaBancariaCreate) {
    try {
      if (editing) { await cuentasBancariasApi.update(editing.id, data); toast({ title: "Cuenta actualizada" }); }
      else { await cuentasBancariasApi.create(data); toast({ title: "Cuenta creada" }); }
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
      await cuentasBancariasApi.delete(deleting.id);
      toast({ title: "Cuenta eliminada" });
      setDeleting(null); load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setDelLoading(false); }
  }

  return (
    <div>
      <PageHeader
        title="Cuentas Bancarias"
        action={{ label: "Nueva Cuenta", onClick: () => { setEditing(null); setFormOpen(true); } }}
      />
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && cuentas.length === 0 && <EmptyState />}
      {!loading && !error && cuentas.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {["Banco", "Tipo", "Número", "Denominación", "Estado", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-wide text-slate-700">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuentas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.banco}</TableCell>
                  <TableCell>{c.tipo_cuenta}</TableCell>
                  <TableCell className="font-mono">{c.numero_cuenta}</TableCell>
                  <TableCell>{c.denominacion}</TableCell>
                  <TableCell><EstadoBadge estado={c.estado} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setFormOpen(true); }}>
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleting(c)}>
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <CuentaForm open={formOpen} cuenta={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        title="¿Eliminar cuenta?"
        description={`Se eliminará la cuenta ${deleting?.numero_cuenta}.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={delLoading}
      />
    </div>
  );
}
