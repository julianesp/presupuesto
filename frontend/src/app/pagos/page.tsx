"use client";
import { useEffect, useState, useCallback } from "react";
import { pagosApi } from "@/lib/api/pagos";
import { obligacionesApi } from "@/lib/api/obligaciones";
import { cuentasBancariasApi } from "@/lib/api/cuentas-bancarias";
import type { Pago, PagoCreate, PagoUpdate } from "@/lib/types/pago";
import type { Obligacion } from "@/lib/types/obligacion";
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

const MEDIOS_PAGO = ["Transferencia", "Cheque", "Efectivo", "Otro"];

function EditPagoForm({
  item, cuentas, onSave, onClose,
}: {
  item: Pago | null;
  cuentas: CuentaBancaria[];
  onSave: (d: PagoUpdate) => Promise<void>;
  onClose: () => void;
}) {
  const [valor, setValor] = useState(0);
  const [concepto, setConcepto] = useState("");
  const [medioPago, setMedioPago] = useState("Transferencia");
  const [comprobante, setComprobante] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setValor(item.valor);
      setConcepto(item.concepto ?? "");
      setMedioPago(item.medio_pago ?? "Transferencia");
      setComprobante(item.no_comprobante ?? "");
      setCuentaId(item.cuenta_bancaria_id ? String(item.cuenta_bancaria_id) : "");
    }
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        valor,
        concepto,
        medio_pago: medioPago,
        no_comprobante: comprobante,
        cuenta_bancaria_id: cuentaId ? parseInt(cuentaId) : undefined,
      });
      onClose();
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar Pago N° {item?.numero}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div className="space-y-1.5">
            <Label>Concepto</Label>
            <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Medio de Pago</Label>
              <Select value={medioPago} onValueChange={setMedioPago}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEDIOS_PAGO.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>N° Comprobante</Label>
              <Input value={comprobante} onChange={(e) => setComprobante(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cuenta Bancaria</Label>
            <Select value={cuentaId} onValueChange={setCuentaId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cuenta..." /></SelectTrigger>
              <SelectContent>
                {cuentas.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.banco} — {c.numero_cuenta}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

function PagoForm({
  open, obligaciones, cuentas, onSave, onClose,
}: {
  open: boolean;
  obligaciones: Obligacion[];
  cuentas: CuentaBancaria[];
  onSave: (d: PagoCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [oblNum, setOblNum] = useState("");
  const [valor, setValor] = useState(0);
  const [concepto, setConcepto] = useState("");
  const [medioPago, setMedioPago] = useState("Transferencia");
  const [comprobante, setComprobante] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [loading, setLoading] = useState(false);

  const activeObls = obligaciones.filter((o) => o.estado === "Activo");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        obligacion_numero: parseInt(oblNum),
        valor,
        concepto,
        medio_pago: medioPago,
        no_comprobante: comprobante,
        cuenta_bancaria_id: cuentaId ? parseInt(cuentaId) : 0,
      });
      onClose();
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuevo Pago</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Obligación</Label>
            <Select value={oblNum} onValueChange={setOblNum}>
              <SelectTrigger><SelectValue placeholder="Seleccionar obligación..." /></SelectTrigger>
              <SelectContent>
                {activeObls.map((o) => (
                  <SelectItem key={o.numero} value={String(o.numero)}>
                    Obl {o.numero} — {o.nombre_tercero || o.nit_tercero} — Saldo: {formatCOP(o.saldo ?? 0)}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Medio de Pago</Label>
              <Select value={medioPago} onValueChange={setMedioPago}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEDIOS_PAGO.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>N° Comprobante</Label>
              <Input value={comprobante} onChange={(e) => setComprobante(e.target.value)} />
            </div>
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
            <Button type="submit" disabled={loading || valor <= 0 || !oblNum}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [obligaciones, setObligaciones] = useState<Obligacion[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [anulando, setAnulando] = useState<Pago | null>(null);
  const [anulLoading, setAnulLoading] = useState(false);
  const [editando, setEditando] = useState<Pago | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ps, os, cs] = await Promise.all([
        pagosApi.getAll(filtro || undefined),
        obligacionesApi.getAll(),
        cuentasBancariasApi.getAll(),
      ]);
      setPagos(ps); setObligaciones(os); setCuentas(cs);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [filtro]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: PagoCreate) {
    try {
      await pagosApi.create(data);
      toast({ title: "Pago registrado" });
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
      await pagosApi.anular(anulando.numero);
      toast({ title: "Pago anulado" });
      setAnulando(null); load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setAnulLoading(false); }
  }

  async function handleEdit(data: PagoUpdate) {
    if (!editando) return;
    try {
      await pagosApi.update(editando.numero, data);
      toast({ title: "Pago actualizado" });
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
        title="Pagos"
        action={{ label: "Nuevo Pago", onClick: () => setFormOpen(true) }}
        onPrint={() => window.print()}
      />
      <div className="flex gap-3 mb-4"><FiltroEstado value={filtro} onChange={setFiltro} /></div>
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && pagos.length === 0 && <EmptyState />}
      {!loading && !error && pagos.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {["N°", "Fecha", "Obligación", "Rubro", "Tercero", "Concepto", "Medio", "Valor", "Estado", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-wide text-slate-700">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.map((p) => (
                <TableRow key={p.numero} className={p.estado === "Anulado" ? "opacity-60" : ""}>
                  <TableCell className="font-mono">{p.numero}</TableCell>
                  <TableCell>{formatDate(p.fecha)}</TableCell>
                  <TableCell className="font-mono">{p.obligacion_numero}</TableCell>
                  <TableCell className="font-mono text-xs">{p.codigo_rubro}</TableCell>
                  <TableCell className="text-sm">{p.nombre_tercero || p.nit_tercero}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{p.concepto}</TableCell>
                  <TableCell className="text-sm">{p.medio_pago}</TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={p.valor} /></TableCell>
                  <TableCell><EstadoBadge estado={p.estado} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" title="Ver Comprobante de Egreso" asChild>
                        <Link href={`/comprobantes/pago/${p.numero}`} target="_blank">
                          <FileTextIcon className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {p.estado === "Activo" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" onClick={() => setEditando(p)} title="Editar">
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {p.estado === "Activo" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setAnulando(p)} title="Anular">
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
      <PagoForm open={formOpen} obligaciones={obligaciones} cuentas={cuentas} onSave={handleSave} onClose={() => setFormOpen(false)} />
      <EditPagoForm item={editando} cuentas={cuentas} onSave={handleEdit} onClose={() => setEditando(null)} />
      <ConfirmDialog
        open={!!anulando}
        title="¿Anular pago?"
        description={`Se anulará el pago N° ${anulando?.numero}.`}
        onConfirm={handleAnular}
        onCancel={() => setAnulando(null)}
        loading={anulLoading}
      />
    </div>
  );
}
