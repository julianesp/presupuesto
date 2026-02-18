"use client";
import { useEffect, useState, useCallback } from "react";
import { modificacionesApi } from "@/lib/api/modificaciones";
import { rubrosGastosApi, rubrosIngresosApi } from "@/lib/api/rubros";
import type { Modificacion, AdicionCreate, ReduccionCreate, CreditoContracreditoCreate } from "@/lib/types/modificacion";
import type { RubroGasto, RubroIngreso } from "@/lib/types/rubros";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import { EstadoBadge } from "@/components/common/EstadoBadge";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils/dates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { BanIcon, PlusIcon } from "lucide-react";

type FormTipo = "adicion" | "reduccion" | "credito";

function ModifForm({
  open, tipo, gastosHojas, ingresosHojas, onSave, onClose,
}: {
  open: boolean;
  tipo: FormTipo;
  gastosHojas: RubroGasto[];
  ingresosHojas: RubroIngreso[];
  onSave: (d: AdicionCreate | ReduccionCreate | CreditoContracreditoCreate) => Promise<void>;
  onClose: () => void;
}) {
  const [codigoA, setCodigoA] = useState("");
  const [codigoB, setCodigoB] = useState("");
  const [valor, setValor] = useState(0);
  const [numeroActo, setNumeroActo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);

  const titulos: Record<FormTipo, string> = {
    adicion: "Nueva Adición",
    reduccion: "Nueva Reducción",
    credito: "Nuevo Crédito/Contracrédito",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tipo === "adicion") {
        await onSave({ codigo_gasto: codigoA, codigo_ingreso: codigoB, valor, numero_acto: numeroActo, descripcion });
      } else if (tipo === "reduccion") {
        await onSave({ codigo_gasto: codigoA, codigo_ingreso: codigoB, valor, numero_acto: numeroActo, descripcion });
      } else {
        await onSave({ codigo_credito: codigoA, codigo_contracredito: codigoB, valor, numero_acto: numeroActo, descripcion });
      }
      onClose();
    } finally { setLoading(false); }
  }

  const labelA = tipo === "credito" ? "Rubro Crédito" : "Rubro Gasto";
  const labelB = tipo === "credito" ? "Rubro Contracrédito" : "Rubro Ingreso";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{titulos[tipo]}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{labelA}</Label>
            <Select value={codigoA} onValueChange={setCodigoA}>
              <SelectTrigger><SelectValue placeholder="Seleccionar rubro..." /></SelectTrigger>
              <SelectContent>
                {gastosHojas.map((r) => (
                  <SelectItem key={r.codigo} value={r.codigo}>{r.codigo} — {r.cuenta}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{labelB}</Label>
            <Select value={codigoB} onValueChange={setCodigoB}>
              <SelectTrigger><SelectValue placeholder="Seleccionar rubro..." /></SelectTrigger>
              <SelectContent>
                {(tipo === "credito" ? gastosHojas : ingresosHojas).map((r) => (
                  <SelectItem key={r.codigo} value={r.codigo}>{r.codigo} — {r.cuenta}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>N° Acto</Label>
              <Input value={numeroActo} onChange={(e) => setNumeroActo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || valor <= 0 || !codigoA || !codigoB}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ModificacionesPage() {
  const [modificaciones, setModificaciones] = useState<Modificacion[]>([]);
  const [gastosHojas, setGastosHojas] = useState<RubroGasto[]>([]);
  const [ingresosHojas, setIngresosHojas] = useState<RubroIngreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTipo, setFormTipo] = useState<FormTipo | null>(null);
  const [anulando, setAnulando] = useState<Modificacion | null>(null);
  const [anulLoading, setAnulLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ms, gs, is] = await Promise.all([
        modificacionesApi.getAll(),
        rubrosGastosApi.getAll(),
        rubrosIngresosApi.getAll(),
      ]);
      setModificaciones(ms);
      setGastosHojas(gs.filter((r) => r.es_hoja === 1));
      setIngresosHojas(is.filter((r) => r.es_hoja === 1));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: AdicionCreate | ReduccionCreate | CreditoContracreditoCreate) {
    try {
      if (formTipo === "adicion") await modificacionesApi.crearAdicion(data as AdicionCreate);
      else if (formTipo === "reduccion") await modificacionesApi.crearReduccion(data as ReduccionCreate);
      else await modificacionesApi.crearCredito(data as CreditoContracreditoCreate);
      toast({ title: "Modificación registrada" });
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
      await modificacionesApi.anular(anulando.id);
      toast({ title: "Modificación anulada" });
      setAnulando(null); load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setAnulLoading(false); }
  }

  const porTipo = (tipo: string) => modificaciones.filter((m) => m.tipo === tipo);

  function TablaModifs({ items }: { items: Modificacion[] }) {
    if (items.length === 0) return <EmptyState />;
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              {["N°", "Fecha", "Tipo", "Acto", "Descripción", "Valor", "Estado", ""].map((h) => (
                <TableHead key={h} className="text-xs uppercase tracking-wide text-slate-700">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((m) => (
              <TableRow key={m.id} className={m.estado === "Anulado" ? "opacity-60" : ""}>
                <TableCell className="font-mono">{m.id}</TableCell>
                <TableCell>{formatDate(m.fecha)}</TableCell>
                <TableCell className="text-sm">{m.tipo}</TableCell>
                <TableCell className="text-sm">{m.numero_acto}</TableCell>
                <TableCell className="text-sm max-w-xs truncate">{m.descripcion}</TableCell>
                <TableCell className="text-right"><CurrencyDisplay value={m.valor} /></TableCell>
                <TableCell><EstadoBadge estado={m.estado} /></TableCell>
                <TableCell>
                  {m.estado === "Activo" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setAnulando(m)}>
                      <BanIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Modificaciones Presupuestales</h1>
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && (
        <Tabs defaultValue="adicion">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="adicion">Adiciones</TabsTrigger>
              <TabsTrigger value="reduccion">Reducciones</TabsTrigger>
              <TabsTrigger value="credito">Créditos/Contracréditos</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setFormTipo("adicion")}><PlusIcon className="h-4 w-4 mr-1" />Adición</Button>
              <Button size="sm" variant="outline" onClick={() => setFormTipo("reduccion")}><PlusIcon className="h-4 w-4 mr-1" />Reducción</Button>
              <Button size="sm" variant="outline" onClick={() => setFormTipo("credito")}><PlusIcon className="h-4 w-4 mr-1" />Crédito</Button>
            </div>
          </div>
          <TabsContent value="adicion"><TablaModifs items={porTipo("Adicion")} /></TabsContent>
          <TabsContent value="reduccion"><TablaModifs items={porTipo("Reduccion")} /></TabsContent>
          <TabsContent value="credito"><TablaModifs items={porTipo("CreditoContracredito")} /></TabsContent>
        </Tabs>
      )}
      {formTipo && (
        <ModifForm
          open={!!formTipo}
          tipo={formTipo}
          gastosHojas={gastosHojas}
          ingresosHojas={ingresosHojas}
          onSave={handleSave}
          onClose={() => setFormTipo(null)}
        />
      )}
      <ConfirmDialog
        open={!!anulando}
        title="¿Anular modificación?"
        description={`Se anulará la modificación N° ${anulando?.id}.`}
        onConfirm={handleAnular}
        onCancel={() => setAnulando(null)}
        loading={anulLoading}
      />
    </div>
  );
}
