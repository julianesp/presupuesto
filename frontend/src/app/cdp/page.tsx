"use client";
import { useEffect, useState, useCallback } from "react";
import { cdpApi } from "@/lib/api/cdp";
import { rubrosGastosApi } from "@/lib/api/rubros";
import { sifseApi } from "@/lib/api/sifse";
import type { CDP, CDPCreate, CDPUpdate } from "@/lib/types/cdp";
import type { RubroGasto } from "@/lib/types/rubros";
import type { SIFSEFuente, SIFSEItem } from "@/lib/types/sifse";
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
import { BanIcon, PencilIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";

const NONE_SIFSE = "0";

function CdpForm({
  open, rubros, fuentes, items, onSave, onClose,
}: {
  open: boolean;
  rubros: RubroGasto[];
  fuentes: SIFSEFuente[];
  items: SIFSEItem[];
  onSave: (d: CDPCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [codigoRubro, setCodigoRubro] = useState("");
  const [objeto, setObjeto] = useState("");
  const [valor, setValor] = useState(0);
  const [fuenteId, setFuenteId] = useState(NONE_SIFSE);
  const [itemId, setItemId] = useState(NONE_SIFSE);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        codigo_rubro: codigoRubro,
        objeto,
        valor,
        fuente_sifse: fuenteId !== NONE_SIFSE ? parseInt(fuenteId) : undefined,
        item_sifse: itemId !== NONE_SIFSE ? parseInt(itemId) : undefined,
      });
      onClose();
    }
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fuente SIFSE</Label>
              <Select value={fuenteId} onValueChange={setFuenteId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar fuente..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SIFSE}>— Sin fuente —</SelectItem>
                  {fuentes.map((f) => (
                    <SelectItem key={f.codigo} value={String(f.codigo)}>
                      {f.codigo} — {f.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ítem de Gasto SIFSE</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar ítem..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SIFSE}>— Sin ítem —</SelectItem>
                  {items.map((it) => (
                    <SelectItem key={it.codigo} value={String(it.codigo)}>
                      {it.codigo} — {it.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

function EditCdpForm({
  item, fuentes, items, onSave, onClose,
}: {
  item: CDP | null;
  fuentes: SIFSEFuente[];
  items: SIFSEItem[];
  onSave: (d: CDPUpdate) => Promise<void>;
  onClose: () => void;
}) {
  const [valor, setValor] = useState(0);
  const [objeto, setObjeto] = useState("");
  const [fuenteId, setFuenteId] = useState(NONE_SIFSE);
  const [itemId, setItemId] = useState(NONE_SIFSE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setValor(item.valor);
      setObjeto(item.objeto);
      setFuenteId(item.fuente_sifse ? String(item.fuente_sifse) : NONE_SIFSE);
      setItemId(item.item_sifse ? String(item.item_sifse) : NONE_SIFSE);
    }
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        valor,
        objeto,
        fuente_sifse: fuenteId !== NONE_SIFSE ? parseInt(fuenteId) : undefined,
        item_sifse: itemId !== NONE_SIFSE ? parseInt(itemId) : undefined,
      });
      onClose();
    }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar CDP N° {item?.numero}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Objeto del CDP</Label>
            <Input value={objeto} onChange={(e) => setObjeto(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fuente SIFSE</Label>
              <Select value={fuenteId} onValueChange={setFuenteId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar fuente..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SIFSE}>— Sin fuente —</SelectItem>
                  {fuentes.map((f) => (
                    <SelectItem key={f.codigo} value={String(f.codigo)}>
                      {f.codigo} — {f.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ítem de Gasto SIFSE</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar ítem..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SIFSE}>— Sin ítem —</SelectItem>
                  {items.map((it) => (
                    <SelectItem key={it.codigo} value={String(it.codigo)}>
                      {it.codigo} — {it.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

export default function CdpPage() {
  const [cdps, setCdps] = useState<CDP[]>([]);
  const [rubros, setRubros] = useState<RubroGasto[]>([]);
  const [fuentes, setFuentes] = useState<SIFSEFuente[]>([]);
  const [sifseItems, setSifseItems] = useState<SIFSEItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [anulando, setAnulando] = useState<CDP | null>(null);
  const [anulLoading, setAnulLoading] = useState(false);
  const [editando, setEditando] = useState<CDP | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cs, rs, fs, its] = await Promise.all([
        cdpApi.getAll(filtro || undefined),
        rubrosGastosApi.getAll(),
        sifseApi.getCatalogoFuentes(),
        sifseApi.getCatalogoItems(),
      ]);
      setCdps(cs);
      setRubros(rs);
      setFuentes(fs);
      setSifseItems(its);
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

  async function handleEdit(data: CDPUpdate) {
    if (!editando) return;
    try {
      await cdpApi.update(editando.numero, data);
      toast({ title: "CDP actualizado" });
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
        title="Certificados de Disponibilidad (CDP)"
        action={{ label: "Nuevo CDP", onClick: () => setFormOpen(true) }}
        onPrint={() => window.print()}
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
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" title="Ver Comprobante" asChild>
                        <Link href={`/comprobantes/cdp/${c.numero}`} target="_blank">
                          <FileTextIcon className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {c.estado === "Activo" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-500"
                          onClick={() => setEditando(c)}
                          title="Editar"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <CdpForm open={formOpen} rubros={rubros} fuentes={fuentes} items={sifseItems} onSave={handleSave} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!anulando}
        title="¿Anular CDP?"
        description={`Se anulará el CDP N° ${anulando?.numero}. Esta acción no se puede deshacer.`}
        onConfirm={handleAnular}
        onCancel={() => setAnulando(null)}
        loading={anulLoading}
      />
      <EditCdpForm item={editando} fuentes={fuentes} items={sifseItems} onSave={handleEdit} onClose={() => setEditando(null)} />
    </div>
  );
}
