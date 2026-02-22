"use client";
import { useEffect, useState, useCallback } from "react";
import { informesApi } from "@/lib/api/informes";
import type { SIAGastoRow, EjecucionIngresoRow } from "@/lib/types/informes";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { MesSelector } from "@/components/common/MesSelector";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { rubroIndentClass } from "@/lib/utils/rubro-level";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, FileText, Package } from "lucide-react";

// ─── Formatos CSV SIA ─────────────────────────────────────────────────────────
const FORMATOS_SIA = [
  { key: "f03",           label: "F03 — Movimiento de Bancos",          ext: "csv" },
  { key: "f7b",           label: "F7B — Formato de Pagos",              ext: "csv" },
  { key: "f08a-gastos",   label: "F08A — Modificaciones Gastos",        ext: "csv" },
  { key: "f08a-ingresos", label: "F08A — Modificaciones Ingresos",      ext: "csv" },
  { key: "f09",           label: "F09 — PAC",                           ext: "csv" },
  { key: "f13a",          label: "F13A — Contratación",                 ext: "csv" },
] as const;

// ─── Cabecera de grupo ────────────────────────────────────────────────────────
function GrupoHead({ label, cols }: { label: string; cols: number }) {
  return (
    <TableHead
      colSpan={cols}
      className="text-center text-xs font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 border-x border-slate-200"
    >
      {label}
    </TableHead>
  );
}

// ─── Celda monetaria ─────────────────────────────────────────────────────────
function MoneyCell({ value, highlight }: { value: number; highlight?: boolean }) {
  return (
    <TableCell className={`text-right text-xs tabular-nums ${highlight ? "font-semibold" : ""}`}>
      {value ? <CurrencyDisplay value={value} /> : <span className="text-slate-300">—</span>}
    </TableCell>
  );
}

// ─── Tabla Gastos ────────────────────────────────────────────────────────────
function TablaGastos({ rows }: { rows: SIAGastoRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          {/* Fila de grupos */}
          <TableRow className="bg-slate-50">
            <TableHead rowSpan={2} className="sticky left-0 bg-slate-50 z-20 w-24 text-xs uppercase">Código</TableHead>
            <TableHead rowSpan={2} className="sticky left-24 bg-slate-50 z-20 min-w-56 text-xs uppercase">Denominación</TableHead>
            <GrupoHead label="Apropiación" cols={6} />
            <GrupoHead label="Compromisos (RP)" cols={3} />
            <GrupoHead label="Obligaciones" cols={3} />
            <GrupoHead label="Pagos" cols={3} />
            <GrupoHead label="Saldos" cols={3} />
          </TableRow>
          <TableRow className="bg-slate-50">
            {[
              "Inicial", "Adiciones", "Reducciones", "Créditos", "Contracréditos", "Definitiva",
              "Anterior", "Período", "Acumulado",
              "Anterior", "Período", "Acumulado",
              "Anterior", "Período", "Acumulado",
              "x Comprometer", "x Obligar", "x Pagar",
            ].map((h) => (
              <TableHead key={h} className="text-right text-[10px] uppercase tracking-wide text-slate-600 min-w-24 whitespace-nowrap">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const esPadre = r.es_hoja === 0;
            return (
              <TableRow
                key={r.codigo}
                className={esPadre ? "bg-slate-50 border-t border-slate-300" : ""}
              >
                <TableCell className={`font-mono text-xs sticky left-0 z-10 ${esPadre ? "bg-slate-50" : "bg-white"}`}>
                  {r.codigo}
                </TableCell>
                <TableCell className={`text-xs sticky left-24 z-10 ${esPadre ? "bg-slate-50 font-semibold" : "bg-white"} ${rubroIndentClass(r.codigo)}`}>
                  {r.cuenta}
                </TableCell>
                <MoneyCell value={r.ppto_inicial} />
                <MoneyCell value={r.adiciones} />
                <MoneyCell value={r.reducciones} />
                <MoneyCell value={r.creditos} />
                <MoneyCell value={r.contracreditos} />
                <MoneyCell value={r.ppto_definitivo} highlight />
                <MoneyCell value={r.comp_anterior} />
                <MoneyCell value={r.comp_mes} />
                <MoneyCell value={r.comp_acumulado} highlight />
                <MoneyCell value={r.obl_anterior} />
                <MoneyCell value={r.obl_mes} />
                <MoneyCell value={r.obl_acumulado} highlight />
                <MoneyCell value={r.pago_anterior} />
                <MoneyCell value={r.pago_mes} />
                <MoneyCell value={r.pago_acumulado} highlight />
                <MoneyCell value={r.saldo_x_comprometer} />
                <MoneyCell value={r.saldo_x_obligar} />
                <MoneyCell value={r.saldo_x_pagar} />
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Tabla Ingresos ───────────────────────────────────────────────────────────
function TablaIngresos({ rows }: { rows: EjecucionIngresoRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead rowSpan={2} className="sticky left-0 bg-slate-50 z-20 w-24 text-xs uppercase">Código</TableHead>
            <TableHead rowSpan={2} className="sticky left-24 bg-slate-50 z-20 min-w-56 text-xs uppercase">Denominación</TableHead>
            <GrupoHead label="Presupuesto" cols={4} />
            <GrupoHead label="Reconocimientos" cols={3} />
            <GrupoHead label="Recaudos" cols={3} />
            <GrupoHead label="Saldo" cols={1} />
          </TableRow>
          <TableRow className="bg-slate-50">
            {[
              "Inicial", "Adiciones", "Reducciones", "Definitivo",
              "Anterior", "Período", "Acumulado",
              "Anterior", "Período", "Acumulado",
              "x Recaudar",
            ].map((h, i) => (
              <TableHead key={`${h}-${i}`} className="text-right text-[10px] uppercase tracking-wide text-slate-600 min-w-24 whitespace-nowrap">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const esPadre = r.es_hoja === 0;
            return (
              <TableRow
                key={r.codigo}
                className={esPadre ? "bg-slate-50 border-t border-slate-300" : ""}
              >
                <TableCell className={`font-mono text-xs sticky left-0 z-10 ${esPadre ? "bg-slate-50" : "bg-white"}`}>
                  {r.codigo}
                </TableCell>
                <TableCell className={`text-xs sticky left-24 z-10 ${esPadre ? "bg-slate-50 font-semibold" : "bg-white"} ${rubroIndentClass(r.codigo)}`}>
                  {r.cuenta}
                </TableCell>
                <MoneyCell value={r.ppto_inicial} />
                <MoneyCell value={r.adiciones} />
                <MoneyCell value={r.reducciones} />
                <MoneyCell value={r.ppto_definitivo} highlight />
                <MoneyCell value={r.recon_anterior} />
                <MoneyCell value={r.recon_mes} />
                <MoneyCell value={r.recon_acumulado} highlight />
                <MoneyCell value={r.recaudo_anterior} />
                <MoneyCell value={r.recaudo_mes} />
                <MoneyCell value={r.recaudo_acumulado} highlight />
                <MoneyCell value={r.saldo_por_recaudar} />
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SIAPage() {
  const [mes, setMes] = useState("");
  const [gastos, setGastos] = useState<SIAGastoRow[]>([]);
  const [ingresos, setIngresos] = useState<EjecucionIngresoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [descargandoCsv, setDescargandoCsv] = useState<string | null>(null);
  const [descargandoZip, setDescargandoZip] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mesNum = mes ? parseInt(mes) : undefined;
      const [g, i] = await Promise.all([
        informesApi.siaGastos(mesNum),
        informesApi.siaIngresos(mesNum),
      ]);
      setGastos(g);
      setIngresos(i);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [mes]);

  useEffect(() => { load(); }, [load]);

  async function handleDescargar() {
    setDescargando(true);
    try {
      await informesApi.descargarSIAExcel(mes ? parseInt(mes) : undefined);
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al descargar" });
    } finally {
      setDescargando(false);
    }
  }

  async function handleDescargarCSV(formato: string) {
    setDescargandoCsv(formato);
    try {
      await informesApi.descargarSIACSV(formato, mes ? parseInt(mes) : undefined);
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : `Error al descargar ${formato.toUpperCase()}` });
    } finally {
      setDescargandoCsv(null);
    }
  }

  async function handleDescargarZip() {
    setDescargandoZip(true);
    try {
      await informesApi.descargarSIAZip(mes ? parseInt(mes) : undefined);
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al descargar ZIP" });
    } finally {
      setDescargandoZip(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Informe SIA — Contraloría</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ejecución presupuestal en formato Sistema de Información y Auditoría
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MesSelector value={mes} onChange={setMes} label="Acumulado anual" />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={handleDescargar}
            disabled={descargando || loading}
          >
            <Download className="h-4 w-4" />
            {descargando ? "Generando..." : "Descargar Excel"}
          </Button>
        </div>
      </div>

      {loading && <LoadingTable rows={12} cols={10} />}
      {error && <ErrorAlert message={error} onRetry={load} />}

      {!loading && !error && (
        <Tabs defaultValue="gastos">
          <TabsList className="mb-4">
            <TabsTrigger value="gastos">Ejecución de Gastos</TabsTrigger>
            <TabsTrigger value="ingresos">Ejecución de Ingresos</TabsTrigger>
          </TabsList>
          <TabsContent value="gastos">
            {gastos.length === 0
              ? <p className="text-sm text-slate-500 py-8 text-center">No hay rubros de gastos registrados</p>
              : <TablaGastos rows={gastos} />
            }
          </TabsContent>
          <TabsContent value="ingresos">
            {ingresos.length === 0
              ? <p className="text-sm text-slate-500 py-8 text-center">No hay rubros de ingresos registrados</p>
              : <TablaIngresos rows={ingresos} />
            }
          </TabsContent>
        </Tabs>
      )}

      {/* ── Sección de exportación CSV para Contraloría ── */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Formatos CSV — Contraloría (SIA)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Archivos para carga directa al sistema SIA de la Contraloría. Acumulado enero al mes seleccionado.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-slate-400 text-slate-700 hover:bg-slate-100"
            onClick={handleDescargarZip}
            disabled={descargandoZip}
          >
            <Package className="h-4 w-4" />
            {descargandoZip ? "Generando..." : "Descargar todos (ZIP)"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {FORMATOS_SIA.map((fmt) => (
            <button
              key={fmt.key}
              onClick={() => handleDescargarCSV(fmt.key)}
              disabled={descargandoCsv === fmt.key}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center transition hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-wait"
            >
              <FileText className="h-5 w-5 text-emerald-600" />
              <span className="text-[11px] font-medium leading-tight text-slate-700">
                {descargandoCsv === fmt.key ? "Descargando..." : fmt.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
