"use client";
import { useEffect, useState, useCallback } from "react";
import { obligacionesApi } from "@/lib/api/obligaciones";
import { rpApi } from "@/lib/api/rp";
import type { Obligacion, ObligacionCreate, ObligacionUpdate } from "@/lib/types/obligacion";
import type { RP } from "@/lib/types/rp";
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
import { formatCOP } from "@/lib/utils/currency";
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
import { BanIcon, PencilIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";

function EditObligacionForm({
  item, onSave, onClose,
}: {
  item: Obligacion | null;
  onSave: (d: ObligacionUpdate) => Promise<void>;
  onClose: () => void;
}) {
  const [valor, setValor] = useState(0);
  const [factura, setFactura] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) { setValor(item.valor); setFactura(item.factura ?? ""); }
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await onSave({ valor, factura }); onClose(); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Obligación N° {item?.numero}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>N° Factura</Label>
            <Input value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
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

function ObligacionForm({
  open, rps, onSave, onClose,
}: {
  open: boolean;
  rps: RP[];
  onSave: (d: ObligacionCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [rpNum, setRpNum] = useState("");
  const [factura, setFactura] = useState("");
  const [valor, setValor] = useState(0);
  const [loading, setLoading] = useState(false);

  const activeRps = rps.filter((r) => r.estado === "Activo");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ rp_numero: parseInt(rpNum), factura, valor });
      onClose();
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva Obligación</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>RP</Label>
            <Select value={rpNum} onValueChange={setRpNum}>
              <SelectTrigger><SelectValue placeholder="Seleccionar RP..." /></SelectTrigger>
              <SelectContent>
                {activeRps.map((r) => (
                  <SelectItem key={r.numero} value={String(r.numero)}>
                    RP {r.numero} — {r.nombre_tercero || r.nit_tercero} — Saldo: {formatCOP(r.saldo ?? 0)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>N° Factura</Label>
            <Input value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || valor <= 0 || !rpNum}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ObligacionesPage() {
  const [obligaciones, setObligaciones] = useState<Obligacion[]>([]);
  const [rps, setRps] = useState<RP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [anulando, setAnulando] = useState<Obligacion | null>(null);
  const [anulLoading, setAnulLoading] = useState(false);
  const [editando, setEditando] = useState<Obligacion | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [os, rs] = await Promise.all([
        obligacionesApi.getAll(filtro || undefined),
        rpApi.getAll(),
      ]);
      setObligaciones(os); setRps(rs);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [filtro]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: ObligacionCreate) {
    try {
      await obligacionesApi.create(data);
      toast({ title: "Obligación creada" });
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
      await obligacionesApi.anular(anulando.numero);
      toast({ title: "Obligación anulada" });
      setAnulando(null); load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setAnulLoading(false); }
  }

  async function handleEdit(data: ObligacionUpdate) {
    if (!editando) return;
    try {
      await obligacionesApi.update(editando.numero, data);
      toast({ title: "Obligación actualizada" });
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
        title="Obligaciones"
        action={{ label: "Nueva Obligación", onClick: () => setFormOpen(true) }}
        onPrint={() => window.print()}
      />
      <div className="flex gap-3 mb-4"><FiltroEstado value={filtro} onChange={setFiltro} /></div>
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && obligaciones.length === 0 && <EmptyState />}
      {!loading && !error && obligaciones.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {["N°", "Fecha", "RP", "Rubro", "Tercero", "Factura", "Valor", "Saldo", "Estado", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-wide text-slate-700">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {obligaciones.map((o) => (
                <TableRow key={o.numero} className={o.estado === "Anulado" ? "opacity-60" : ""}>
                  <TableCell className="font-mono">{o.numero}</TableCell>
                  <TableCell>{formatDate(o.fecha)}</TableCell>
                  <TableCell className="font-mono">{o.rp_numero}</TableCell>
                  <TableCell className="font-mono text-xs">{o.codigo_rubro}</TableCell>
                  <TableCell className="text-sm">{o.nombre_tercero || o.nit_tercero}</TableCell>
                  <TableCell className="text-sm">{o.factura}</TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={o.valor} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={o.saldo ?? 0} /></TableCell>
                  <TableCell><EstadoBadge estado={o.estado} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" title="Ver Comprobante" asChild>
                        <Link href={`/comprobantes/obligacion/${o.numero}`} target="_blank">
                          <FileTextIcon className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {o.estado === "Activo" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" onClick={() => setEditando(o)} title="Editar">
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {o.estado === "Activo" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setAnulando(o)} title="Anular">
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
      <ObligacionForm open={formOpen} rps={rps} onSave={handleSave} onClose={() => setFormOpen(false)} />
      <EditObligacionForm item={editando} onSave={handleEdit} onClose={() => setEditando(null)} />
      <ConfirmDialog
        open={!!anulando}
        title="¿Anular obligación?"
        description={`Se anulará la obligación N° ${anulando?.numero}.`}
        onConfirm={handleAnular}
        onCancel={() => setAnulando(null)}
        loading={anulLoading}
      />
    </div>
  );
}
