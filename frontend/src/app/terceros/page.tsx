"use client";
import { useEffect, useState, useCallback } from "react";
import { tercerosApi } from "@/lib/api/terceros";
import type { Tercero, TerceroCreate } from "@/lib/types/tercero";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";

/** Algoritmo oficial DIAN para calcular el dígito de verificación del NIT */
function calcularDV(nit: string): string {
  const solo = nit.replace(/\D/g, "");
  if (solo.length === 0) return "";
  const pesos = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3];
  const digits = solo.split("").map(Number);
  const offset = pesos.length - digits.length;
  const suma = digits.reduce((acc, d, i) => acc + d * pesos[offset + i], 0);
  const residuo = suma % 11;
  return String(residuo < 2 ? residuo : 11 - residuo);
}

function TerceroForm({
  open, initial, onSave, onClose,
}: {
  open: boolean;
  initial?: Tercero | null;
  onSave: (d: TerceroCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [nit, setNit] = useState("");
  const [dv, setDv] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("Natural");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setNit(initial.nit);
      setDv(initial.dv ?? "");
      setNombre(initial.nombre);
      setTipo(initial.tipo ?? "Natural");
      setDireccion(initial.direccion ?? "");
      setTelefono(initial.telefono ?? "");
      setEmail(initial.email ?? "");
    } else {
      setNit(""); setDv(""); setNombre(""); setTipo("Natural");
      setDireccion(""); setTelefono(""); setEmail("");
    }
  }, [initial, open]);

  // Recalcula DV automáticamente al escribir el NIT (solo en modo creación)
  useEffect(() => {
    if (!initial) {
      setDv(calcularDV(nit));
    }
  }, [nit, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await onSave({ nit, dv, nombre, tipo, direccion, telefono, email }); onClose(); }
    finally { setLoading(false); }
  }

  const isEditing = !!initial;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Tercero" : "Nuevo Tercero"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>NIT</Label>
              <Input value={nit} onChange={(e) => setNit(e.target.value)} required disabled={isEditing} />
            </div>
            <div className="space-y-1.5">
              <Label>DV</Label>
              <Input
                value={dv}
                readOnly
                className="bg-slate-50 text-center font-mono font-bold text-lg"
                placeholder="—"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nombre / Razón Social</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Natural">Natural</SelectItem>
                <SelectItem value="Juridico">Jurídico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : isEditing ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TercerosPage() {
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tercero | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tercero | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = buscar.trim().length >= 1
        ? await tercerosApi.buscar(buscar)
        : await tercerosApi.getAll();
      setTerceros(data);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [buscar]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: TerceroCreate) {
    try {
      if (editTarget) {
        await tercerosApi.update(editTarget.nit, data);
        toast({ title: "Tercero actualizado" });
      } else {
        await tercerosApi.create(data);
        toast({ title: "Tercero guardado" });
      }
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
      throw e;
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await tercerosApi.delete(deleteTarget.nit);
      toast({ title: "Tercero eliminado" });
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al eliminar" });
    } finally {
      setDeleting(false);
    }
  }

  function openEdit(t: Tercero) {
    setEditTarget(t);
    setFormOpen(true);
  }

  function openNew() {
    setEditTarget(null);
    setFormOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Terceros"
        action={{ label: "Nuevo Tercero", onClick: openNew }}
      />
      <div className="mb-4 max-w-sm">
        <SearchInput value={buscar} onChange={setBuscar} placeholder="Buscar por NIT o nombre..." />
      </div>
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && terceros.length === 0 && <EmptyState />}
      {!loading && !error && terceros.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {["NIT", "Nombre", "Tipo", "Dirección", "Teléfono", "Email", "Acciones"].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-wide text-slate-700">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {terceros.map((t) => (
                <TableRow key={t.nit}>
                  <TableCell className="font-mono">{t.nit}{t.dv ? `-${t.dv}` : ""}</TableCell>
                  <TableCell className="font-medium">{t.nombre}</TableCell>
                  <TableCell className="text-sm">{t.tipo}</TableCell>
                  <TableCell className="text-sm">{t.direccion}</TableCell>
                  <TableCell className="text-sm">{t.telefono}</TableCell>
                  <TableCell className="text-sm">{t.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:text-blue-600"
                        onClick={() => openEdit(t)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:text-red-600"
                        onClick={() => setDeleteTarget(t)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TerceroForm
        open={formOpen}
        initial={editTarget}
        onSave={handleSave}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tercero?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteTarget?.nombre}</strong> (NIT: {deleteTarget?.nit}).
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
