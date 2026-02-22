"use client";
import { useEffect, useState, useCallback } from "react";
import { rpApi } from "@/lib/api/rp";
import { cdpApi } from "@/lib/api/cdp";
import { tercerosApi } from "@/lib/api/terceros";
import type { RP, RPCreate, RPUpdate } from "@/lib/types/rp";
import type { CDP } from "@/lib/types/cdp";
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

function RpForm({
  open, cdps, terceros, onSave, onClose,
}: {
  open: boolean;
  cdps: CDP[];
  terceros: Tercero[];
  onSave: (d: RPCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [cdpNum, setCdpNum] = useState("");
  const [nitTercero, setNitTercero] = useState("");
  const [objeto, setObjeto] = useState("");
  const [valor, setValor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [buscarTercero, setBuscarTercero] = useState("");

  const activeCdps = cdps.filter((c) => c.estado === "Activo");
  const filtTerceros = terceros.filter(
    (t) =>
      !buscarTercero ||
      t.nombre.toLowerCase().includes(buscarTercero.toLowerCase()) ||
      t.nit.includes(buscarTercero),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ cdp_numero: parseInt(cdpNum), nit_tercero: nitTercero, objeto, valor });
      onClose();
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuevo RP</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>CDP</Label>
            <Select value={cdpNum} onValueChange={setCdpNum}>
              <SelectTrigger><SelectValue placeholder="Seleccionar CDP..." /></SelectTrigger>
              <SelectContent>
                {activeCdps.map((c) => (
                  <SelectItem key={c.numero} value={String(c.numero)}>
                    CDP {c.numero} — {c.codigo_rubro} — Saldo: {formatCOP(c.saldo ?? 0)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tercero</Label>
            <Input
              value={buscarTercero}
              onChange={(e) => setBuscarTercero(e.target.value)}
              placeholder="Buscar tercero..."
              className="mb-1"
            />
            <Select value={nitTercero} onValueChange={setNitTercero}>
              <SelectTrigger><SelectValue placeholder="Seleccionar tercero..." /></SelectTrigger>
              <SelectContent>
                {filtTerceros.slice(0, 50).map((t) => (
                  <SelectItem key={t.nit} value={t.nit}>
                    {t.nit} — {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Objeto</Label>
            <Input value={objeto} onChange={(e) => setObjeto(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || valor <= 0 || !cdpNum || !nitTercero}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditRpForm({
  item, onSave, onClose,
}: {
  item: RP | null;
  onSave: (d: RPUpdate) => Promise<void>;
  onClose: () => void;
}) {
  const [valor, setValor] = useState(0);
  const [objeto, setObjeto] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) { setValor(item.valor); setObjeto(item.objeto); }
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await onSave({ valor, objeto }); onClose(); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar RP N° {item?.numero}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Objeto del RP</Label>
            <Input value={objeto} onChange={(e) => setObjeto(e.target.value)} required />
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

export default function RpPage() {
  const [rps, setRps] = useState<RP[]>([]);
  const [cdps, setCdps] = useState<CDP[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [anulando, setAnulando] = useState<RP | null>(null);
  const [anulLoading, setAnulLoading] = useState(false);
  const [editando, setEditando] = useState<RP | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rs, cs, ts] = await Promise.all([
        rpApi.getAll(filtro || undefined),
        cdpApi.getAll(),
        tercerosApi.getAll(),
      ]);
      setRps(rs); setCdps(cs); setTerceros(ts);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [filtro]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: RPCreate) {
    try {
      await rpApi.create(data);
      toast({ title: "RP creado" });
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
      await rpApi.anular(anulando.numero);
      toast({ title: "RP anulado" });
      setAnulando(null);
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setAnulLoading(false); }
  }

  async function handleEdit(data: RPUpdate) {
    if (!editando) return;
    try {
      await rpApi.update(editando.numero, data);
      toast({ title: "RP actualizado" });
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
        title="Registros Presupuestales (RP)"
        action={{ label: "Nuevo RP", onClick: () => setFormOpen(true) }}
        onPrint={() => window.print()}
      />
      <div className="flex gap-3 mb-4">
        <FiltroEstado value={filtro} onChange={setFiltro} />
      </div>
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && rps.length === 0 && <EmptyState />}
      {!loading && !error && rps.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {["N°", "Fecha", "CDP", "Rubro", "Tercero", "Objeto", "Valor", "Saldo", "Estado", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-wide text-slate-700">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rps.map((r) => (
                <TableRow key={r.numero} className={r.estado === "Anulado" ? "opacity-60" : ""}>
                  <TableCell className="font-mono">{r.numero}</TableCell>
                  <TableCell>{formatDate(r.fecha)}</TableCell>
                  <TableCell className="font-mono">{r.cdp_numero}</TableCell>
                  <TableCell className="font-mono text-xs">{r.codigo_rubro}</TableCell>
                  <TableCell className="text-sm">{r.nombre_tercero || r.nit_tercero}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{r.objeto}</TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.valor} /></TableCell>
                  <TableCell className="text-right"><CurrencyDisplay value={r.saldo ?? 0} /></TableCell>
                  <TableCell><EstadoBadge estado={r.estado} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" title="Ver Comprobante" asChild>
                        <Link href={`/comprobantes/rp/${r.numero}`} target="_blank">
                          <FileTextIcon className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {r.estado === "Activo" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-500"
                          onClick={() => setEditando(r)}
                          title="Editar"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {r.estado === "Activo" && (
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
      <RpForm open={formOpen} cdps={cdps} terceros={terceros} onSave={handleSave} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!anulando}
        title="¿Anular RP?"
        description={`Se anulará el RP N° ${anulando?.numero}.`}
        onConfirm={handleAnular}
        onCancel={() => setAnulando(null)}
        loading={anulLoading}
      />
      <EditRpForm item={editando} onSave={handleEdit} onClose={() => setEditando(null)} />
    </div>
  );
}
