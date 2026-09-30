"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Eye, Plus, Trash2 } from "lucide-react";
import {
  TIPOS_COMPROBANTE,
  contabilidadApi,
  type ComprobanteDetalle,
  type ComprobanteResumen,
  type CuentaContable,
  type LineaComprobante,
} from "@/lib/api/contabilidad";
import { tercerosApi } from "@/lib/api/terceros";
import type { Tercero } from "@/lib/types/tercero";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import { MesSelector } from "@/components/common/MesSelector";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TIPOS_MANUALES = TIPOS_COMPROBANTE.filter((t) => t !== "APERTURA");
const TIPO_LABEL: Record<string, string> = {
  APERTURA: "Apertura",
  DIARIO: "Diario",
  AJUSTE: "Ajuste",
  DEPRECIACION: "Depreciación",
  PROVISION: "Provisión",
  CIERRE: "Cierre",
};

const lineaVacia = (): LineaComprobante => ({ codigoCuenta: "", nitTercero: "", descripcion: "", debito: 0, credito: 0 });
const codigoDe = (texto: string) => texto.split(" — ")[0].trim();

function NuevoComprobante({
  cuentas,
  terceros,
  onGuardado,
  onCerrar,
}: {
  cuentas: CuentaContable[];
  terceros: Tercero[];
  onGuardado: () => void;
  onCerrar: () => void;
}) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<string>("DIARIO");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState("");
  const [lineas, setLineas] = useState<LineaComprobante[]>([lineaVacia(), lineaVacia()]);
  const [guardando, setGuardando] = useState(false);

  const porCodigo = useMemo(() => new Map(cuentas.map((c) => [c.codigo, c])), [cuentas]);
  const totalD = lineas.reduce((s, l) => s + (l.debito || 0), 0);
  const totalC = lineas.reduce((s, l) => s + (l.credito || 0), 0);
  const diferencia = Math.round((totalD - totalC) * 100) / 100;

  const cambiar = (i: number, cambios: Partial<LineaComprobante>) =>
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...cambios } : l)));

  async function guardar() {
    setGuardando(true);
    try {
      const res = await contabilidadApi.crearComprobante({
        tipo: tipo as ComprobanteDetalle["tipo"],
        fecha,
        descripcion,
        lineas: lineas
          .filter((l) => l.codigoCuenta || l.debito || l.credito)
          .map((l) => ({ ...l, codigoCuenta: codigoDe(l.codigoCuenta), nitTercero: codigoDe(l.nitTercero ?? "") || null })),
      });
      toast({ title: `Comprobante ${TIPO_LABEL[res.tipo]} nº ${res.numero} registrado` });
      onGuardado();
      onCerrar();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al guardar" });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_MANUALES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Fecha</Label>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <Label>Descripción</Label>
          <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Concepto del comprobante" />
        </div>
      </div>

      <datalist id="cuentas-auxiliares">
        {cuentas.map((c) => (
          <option key={c.codigo} value={`${c.codigo} — ${c.nombre}`} />
        ))}
      </datalist>
      <datalist id="terceros-lista">
        {terceros.map((t) => (
          <option key={t.nit} value={`${t.nit} — ${t.nombre}`} />
        ))}
      </datalist>

      {/* Líneas: tarjetas apiladas en celular, fila tipo tabla en escritorio */}
      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
        <div className="hidden md:grid md:grid-cols-[2fr_1.5fr_1.3fr_1fr_1fr_2rem] gap-2 bg-slate-50 px-2 py-2 text-xs font-medium text-slate-600">
          <span>Cuenta</span>
          <span>Tercero</span>
          <span>Detalle</span>
          <span className="text-right">Débito</span>
          <span className="text-right">Crédito</span>
          <span />
        </div>
        {lineas.map((l, i) => {
          const cuenta = porCodigo.get(codigoDe(l.codigoCuenta));
          return (
            <div
              key={i}
              className="grid grid-cols-2 md:grid-cols-[2fr_1.5fr_1.3fr_1fr_1fr_2rem] gap-2 p-2 items-end md:items-center"
            >
              <div className="col-span-2 md:col-span-1 space-y-1">
                <span className="text-xs text-slate-500 md:hidden">Cuenta {i + 1}</span>
                <Input list="cuentas-auxiliares" value={l.codigoCuenta} onChange={(e) => cambiar(i, { codigoCuenta: e.target.value })} placeholder="Código o nombre" />
              </div>
              <div className="col-span-2 md:col-span-1 space-y-1">
                <span className="text-xs text-slate-500 md:hidden">Tercero</span>
                <Input
                  list="terceros-lista"
                  value={l.nitTercero ?? ""}
                  onChange={(e) => cambiar(i, { nitTercero: e.target.value })}
                  placeholder={cuenta?.requiereTercero ? "Obligatorio" : "Opcional"}
                  className={cuenta?.requiereTercero && !l.nitTercero ? "border-amber-400" : ""}
                />
              </div>
              <div className="col-span-2 md:col-span-1 space-y-1">
                <span className="text-xs text-slate-500 md:hidden">Detalle</span>
                <Input value={l.descripcion ?? ""} onChange={(e) => cambiar(i, { descripcion: e.target.value })} />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500 md:hidden">Débito</span>
                <CurrencyInput value={l.debito} onChange={(v) => cambiar(i, { debito: v, credito: v ? 0 : l.credito })} />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500 md:hidden">Crédito</span>
                <CurrencyInput value={l.credito} onChange={(v) => cambiar(i, { credito: v, debito: v ? 0 : l.debito })} />
              </div>
              <div className="col-span-2 md:col-span-1 flex justify-end">
                {lineas.length > 2 && (
                  <Button variant="ghost" size="sm" onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))} title="Quitar línea">
                    <Trash2 className="h-4 w-4 text-slate-400" />
                    <span className="md:hidden ml-1 text-xs text-slate-500">Quitar</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1.5fr_1.3fr_1fr_1fr_2rem] gap-2 bg-slate-50 p-2 text-sm font-medium items-center">
          <div className="col-span-2 md:col-span-3">
            <Button variant="outline" size="sm" onClick={() => setLineas((ls) => [...ls, lineaVacia()])}>
              <Plus className="h-4 w-4 mr-1" /> Línea
            </Button>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 md:hidden block">Total débito</span>
            <CurrencyDisplay value={totalD} />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 md:hidden block">Total crédito</span>
            <CurrencyDisplay value={totalC} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${diferencia === 0 && totalD > 0 ? "text-emerald-700" : "text-red-600"}`}>
          {diferencia === 0 && totalD > 0 ? "El comprobante cuadra" : <>Diferencia: <CurrencyDisplay value={diferencia} /></>}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando || diferencia !== 0 || totalD === 0 || !descripcion.trim()}>
            {guardando ? "Guardando..." : "Registrar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetalleComprobante({ id }: { id: number }) {
  const [data, setData] = useState<ComprobanteDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    contabilidadApi.comprobante(id).then(setData).catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [id]);

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <LoadingTable rows={3} cols={4} />;
  const totalD = data.lineas.reduce((s, l) => s + l.debito, 0);
  const totalC = data.lineas.reduce((s, l) => s + l.credito, 0);

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600 space-y-0.5">
        <p>
          <span className="font-medium">Fecha:</span> {data.fecha} · <span className="font-medium">Estado:</span> {data.estado}
          {data.origenTipo && ` · Origen: ${data.origenTipo} nº ${data.origenNumero}`}
        </p>
        <p>{data.descripcion}</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Cuenta</TableHead>
            <TableHead>Tercero</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead className="text-right">Débito</TableHead>
            <TableHead className="text-right">Crédito</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.lineas.map((l, i) => (
            <TableRow key={i}>
              <TableCell className="text-xs">
                <span className="font-mono">{l.codigoCuenta}</span> {l.nombreCuenta}
              </TableCell>
              <TableCell className="text-xs">{l.nitTercero ? `${l.nitTercero} ${l.nombreTercero ?? ""}` : ""}</TableCell>
              <TableCell className="text-xs">{l.descripcion}</TableCell>
              <TableCell className="text-right">{l.debito ? <CurrencyDisplay value={l.debito} /> : ""}</TableCell>
              <TableCell className="text-right">{l.credito ? <CurrencyDisplay value={l.credito} /> : ""}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-slate-50 font-semibold">
            <TableCell colSpan={3}>Totales</TableCell>
            <TableCell className="text-right">
              <CurrencyDisplay value={totalD} />
            </TableCell>
            <TableCell className="text-right">
              <CurrencyDisplay value={totalC} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default function ComprobantesPage() {
  const { toast } = useToast();
  const permisos = usePermissions("all");
  const [tipo, setTipo] = useState("todos");
  const [mes, setMes] = useState("");
  const [items, setItems] = useState<ComprobanteResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [viendo, setViendo] = useState<ComprobanteResumen | null>(null);
  const [anulando, setAnulando] = useState<ComprobanteResumen | null>(null);
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await contabilidadApi.comprobantes(tipo === "todos" ? undefined : tipo, mes || undefined));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [tipo, mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function abrirNuevo() {
    try {
      const [c, t] = await Promise.all([contabilidadApi.cuentas(true), tercerosApi.getAll()]);
      setCuentas(c);
      setTerceros(t);
      setCreando(true);
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Comprobantes Contables</h1>
          <p className="text-sm text-slate-500 mt-1">Registros de partida doble: apertura, diario, ajustes, depreciaciones, provisiones y cierre</p>
        </div>
        {permisos.canCreate && (
          <Button onClick={abrirNuevo}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo comprobante
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {TIPOS_COMPROBANTE.map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MesSelector value={mes} onChange={setMes} label="Todos los meses" />
      </div>

      {loading && <LoadingTable rows={6} cols={6} />}
      {!loading && error && <ErrorAlert message={error} onRetry={cargar} />}
      {!loading && !error && items.length === 0 && <EmptyState message="No hay comprobantes" />}
      {!loading && !error && items.length > 0 && (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Tipo</TableHead>
                <TableHead>Nº</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Débitos</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id} className={c.estado === "ANULADO" ? "text-slate-400" : ""}>
                  <TableCell>{TIPO_LABEL[c.tipo] ?? c.tipo}</TableCell>
                  <TableCell>{c.numero}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.fecha}</TableCell>
                  <TableCell className="max-w-md truncate">{c.descripcion}</TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay value={c.totalDebito} />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay value={c.totalCredito} />
                  </TableCell>
                  <TableCell className="text-xs">{c.estado}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setViendo(c)} title="Ver">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {permisos.canAnular && c.estado !== "ANULADO" && !c.origenTipo && (
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setAnulando(c)} title="Anular">
                          <Ban className="h-4 w-4" />
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

      <Dialog open={creando} onOpenChange={setCreando}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Nuevo comprobante contable</DialogTitle>
          </DialogHeader>
          <NuevoComprobante cuentas={cuentas} terceros={terceros} onGuardado={cargar} onCerrar={() => setCreando(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viendo} onOpenChange={(o) => !o && setViendo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Comprobante {viendo && (TIPO_LABEL[viendo.tipo] ?? viendo.tipo)} nº {viendo?.numero}
            </DialogTitle>
          </DialogHeader>
          {viendo && <DetalleComprobante id={viendo.id} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!anulando}
        title={`¿Anular el comprobante ${anulando ? TIPO_LABEL[anulando.tipo] : ""} nº ${anulando?.numero}?`}
        description="El comprobante queda anulado y deja de afectar los saldos. No se puede deshacer."
        onConfirm={async () => {
          if (!anulando) return;
          try {
            await contabilidadApi.anularComprobante(anulando.id);
            toast({ title: "Comprobante anulado" });
            await cargar();
          } catch (e: unknown) {
            toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
          } finally {
            setAnulando(null);
          }
        }}
        onCancel={() => setAnulando(null)}
      />
    </div>
  );
}
