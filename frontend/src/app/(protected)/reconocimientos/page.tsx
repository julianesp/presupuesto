"use client";
import { useEffect, useState, useCallback } from "react";
import { reconocimientosApi } from "@/lib/api/reconocimientos";
import { rubrosIngresosApi } from "@/lib/api/rubros";
import { tercerosApi } from "@/lib/api/terceros";
import type { Reconocimiento, ReconocimientoCreate, ReconocimientoUpdate } from "@/lib/types/reconocimiento";
import type { RubroIngreso } from "@/lib/types/rubros";
import type { Tercero } from "@/lib/types/tercero";
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
import { BanIcon, PencilIcon } from "lucide-react";

function EditReconocimientoForm({
  item, terceros, onSave, onClose,
}: {
  item: Reconocimiento | null;
  terceros: Tercero[];
  onSave: (d: ReconocimientoUpdate) => Promise<void>;
  onClose: () => void;
}) {
  const NONE = "__none__";
  const [valor, setValor] = useState(0);
  const [terceroNit, setTerceroNit] = useState(NONE);
  const [concepto, setConcepto] = useState("");
  const [noDocumento, setNoDocumento] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setValor(item.valor);
      setTerceroNit(item.tercero_nit || NONE);
      setConcepto(item.concepto ?? "");
      setNoDocumento(item.no_documento ?? "");
    }
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        valor,
        tercero_nit: terceroNit === NONE ? "" : terceroNit,
        concepto,
        no_documento: noDocumento,
      });
      onClose();
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Reconocimiento N° {item?.numero}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tercero (Deudor / Fuente)</Label>
            <Select value={terceroNit} onValueChange={setTerceroNit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sin tercero —</SelectItem>
                {terceros.map((t) => (
                  <SelectItem key={t.nit} value={t.nit}>{t.nit} — {t.nombre}</SelectItem>
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
            <Label>N° Documento / Factura</Label>
            <Input value={noDocumento} onChange={(e) => setNoDocumento(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || valor <= 0}>
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReconocimientoForm({
  open,
  rubros,
  terceros,
  onSave,
  onClose,
}: {
  open: boolean;
  rubros: RubroIngreso[];
  terceros: Tercero[];
  onSave: (d: ReconocimientoCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [codigoRubro, setCodigoRubro] = useState("");
  const [valor, setValor] = useState(0);
  const NONE = "__none__";
  const [terceroNit, setTerceroNit] = useState(NONE);
  const [concepto, setConcepto] = useState("");
  const [noDocumento, setNoDocumento] = useState("");
  const [loading, setLoading] = useState(false);

  const hojas = rubros.filter((r) => r.es_hoja === 1);

  function reset() {
    setCodigoRubro(""); setValor(0); setTerceroNit(NONE);
    setConcepto(""); setNoDocumento("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        codigo_rubro: codigoRubro,
        valor,
        tercero_nit: terceroNit === NONE ? "" : terceroNit,
        concepto,
        no_documento: noDocumento,
      });
      reset();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Reconocimiento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Rubro de Ingreso</Label>
            <Select value={codigoRubro} onValueChange={setCodigoRubro} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rubro..." />
              </SelectTrigger>
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
            <Label>Tercero (Deudor / Fuente)</Label>
            <Select value={terceroNit} onValueChange={setTerceroNit}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tercero..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sin tercero —</SelectItem>
                {terceros.map((t) => (
                  <SelectItem key={t.nit} value={t.nit}>
                    {t.nit} — {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Valor esperado</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div className="space-y-1.5">
            <Label>Concepto</Label>
            <Input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Descripción del reconocimiento..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>N° Documento / Factura</Label>
            <Input
              value={noDocumento}
              onChange={(e) => setNoDocumento(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || valor <= 0 || !codigoRubro}
            >
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ReconocimientosPage() {
  const [items, setItems] = useState<Reconocimiento[]>([]);
  const [rubros, setRubros] = useState<RubroIngreso[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [anulando, setAnulando] = useState<Reconocimiento | null>(null);
  const [anulLoading, setAnulLoading] = useState(false);
  const [editando, setEditando] = useState<Reconocimiento | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, rubrs, ters] = await Promise.all([
        reconocimientosApi.getAll(filtro || undefined),
        rubrosIngresosApi.getAll(),
        tercerosApi.getAll(),
      ]);
      setItems(data);
      setRubros(rubrs);
      setTerceros(ters);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: ReconocimientoCreate) {
    try {
      await reconocimientosApi.create(data);
      toast({ title: "Reconocimiento registrado" });
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
      await reconocimientosApi.anular(anulando.numero);
      toast({ title: "Reconocimiento anulado" });
      setAnulando(null);
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally {
      setAnulLoading(false);
    }
  }

  async function handleEdit(data: ReconocimientoUpdate) {
    if (!editando) return;
    try {
      await reconocimientosApi.update(editando.numero, data);
      toast({ title: "Reconocimiento actualizado" });
      setEditando(null);
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
      throw e;
    }
  }

  return (
    <div>
      <PageHeader
        title="Reconocimientos"
        action={{ label: "Nuevo Reconocimiento", onClick: () => setFormOpen(true) }}
        onPrint={() => window.print()}
      />
      <div className="flex gap-3 mb-4">
        <FiltroEstado value={filtro} onChange={setFiltro} />
      </div>
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <EmptyState />}
      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {["N°", "Fecha", "Rubro", "Tercero", "Concepto", "Documento", "Valor", "Estado", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-wide text-slate-700">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.numero} className={r.estado === "ANULADO" ? "opacity-60" : ""}>
                  <TableCell className="font-mono">{r.numero}</TableCell>
                  <TableCell>{formatDate(r.fecha)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.codigo_rubro}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate">
                    {r.tercero_nombre || r.tercero_nit || "—"}
                  </TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{r.concepto}</TableCell>
                  <TableCell className="text-sm">{r.no_documento}</TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay value={r.valor} />
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={r.estado} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {r.estado === "ACTIVO" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" onClick={() => setEditando(r)} title="Editar">
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {r.estado === "ACTIVO" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setAnulando(r)} title="Anular">
                          <BanIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ReconocimientoForm
        open={formOpen}
        rubros={rubros}
        terceros={terceros}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
      />
      <EditReconocimientoForm
        item={editando}
        terceros={terceros}
        onSave={handleEdit}
        onClose={() => setEditando(null)}
      />

      <ConfirmDialog
        open={!!anulando}
        title="¿Anular reconocimiento?"
        description={`Se anulará el reconocimiento N° ${anulando?.numero} por valor de ${anulando?.valor?.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}.`}
        onConfirm={handleAnular}
        onCancel={() => setAnulando(null)}
        loading={anulLoading}
      />
    </div>
  );
}
