"use client";
import { useRef, useState } from "react";
import { importacionApi, descargarPlantillaCSV, type ResultadoImportacion } from "@/lib/api/importacion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  UploadCloud, FileSpreadsheet, FileText, CheckCircle2, XCircle,
  AlertCircle, Users, Download, RefreshCw,
} from "lucide-react";
import { formatCOP } from "@/lib/utils/currency";

// ─── Resultado visual ────────────────────────────────────────────────────────

function ResultadoPanel({ resultado }: { resultado: ResultadoImportacion }) {
  const esExcel = resultado.rubros_gastos !== undefined || resultado.rubros_ingresos !== undefined;
  const tienErrores = (resultado.errores?.length ?? 0) > 0;

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <span className="font-medium text-slate-800">Importación completada</span>
        {tienErrores && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            con advertencias
          </Badge>
        )}
      </div>

      {esExcel ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Rubros de Gastos" value={resultado.rubros_gastos ?? 0} />
          <Stat label="Rubros de Ingresos" value={resultado.rubros_ingresos ?? 0} />
          <Stat label="Total Gastos" value={formatCOP(resultado.total_gastos ?? 0)} />
          <Stat label="Total Ingresos" value={formatCOP(resultado.total_ingresos ?? 0)} />
          {resultado.diferencia !== undefined && (
            <div className="col-span-2">
              <Stat
                label="Diferencia (Ingresos − Gastos)"
                value={formatCOP(resultado.diferencia)}
                highlight={Math.abs(resultado.diferencia) > 1}
              />
            </div>
          )}
        </div>
      ) : (
        <Stat label="Registros importados" value={resultado.cantidad ?? 0} />
      )}

      {tienErrores && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-amber-700">Filas con error (omitidas):</p>
          <ul className="max-h-32 overflow-y-auto space-y-0.5">
            {resultado.errores!.map((e, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="rounded-md bg-white border border-slate-200 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? "text-red-600" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Zona de carga ───────────────────────────────────────────────────────────

interface UploadZoneProps {
  accept: string;
  loading: boolean;
  onFile: (f: File) => void;
  hint?: string;
}

function UploadZone({ accept, loading, onFile, hint }: UploadZoneProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors
        ${dragging ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"}
        ${loading ? "opacity-60 pointer-events-none" : ""}`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <UploadCloud className="h-10 w-10 text-slate-400 mb-2" />
      <p className="text-sm text-slate-600 font-medium">
        {loading ? "Procesando..." : "Haz clic o arrastra el archivo aquí"}
      </p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

// ─── Formato esperado ────────────────────────────────────────────────────────

function FormatoCSV({ filas, columnas }: { filas: string[][]; columnas: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-mono overflow-x-auto">
      <p className="text-slate-400 mb-1"># {columnas.join(" ; ")}</p>
      {filas.map((fila, i) => (
        <p key={i} className="text-slate-600">{fila.join(" ; ")}</p>
      ))}
    </div>
  );
}

// ─── Tarjeta individual de carga ─────────────────────────────────────────────

interface ImportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accept: string;
  hint: string;
  children?: React.ReactNode;
  onUpload: (file: File, sep: string) => Promise<ResultadoImportacion>;
  onDescargarPlantilla: () => void | Promise<void>;
  showSep?: boolean;
}

function ImportCard({
  icon, title, description, accept, hint, children,
  onUpload, onDescargarPlantilla, showSep = true,
}: ImportCardProps) {
  const [loading, setLoading] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [separador, setSeparador] = useState(";");
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const res = await onUpload(file, separador);
      setResultado(res);
      toast({ title: `${title}: importación exitosa` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(msg);
      toast({ variant: "destructive", title: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleDescargar() {
    setDescargando(true);
    try {
      await onDescargarPlantilla();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al descargar" });
    } finally {
      setDescargando(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 shrink-0">{icon}</div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={handleDescargar}
            disabled={descargando}
            title="Descargar plantilla"
          >
            <Download className="h-3.5 w-3.5" />
            {descargando ? "Descargando..." : "Plantilla"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              Formato esperado
            </p>
            {children}
          </div>
        )}

        {showSep && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500 shrink-0">Separador de columnas:</p>
            <Select value={separador} onValueChange={setSeparador}>
              <SelectTrigger className="w-36 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=";">Punto y coma ( ; )</SelectItem>
                <SelectItem value=",">Coma ( , )</SelectItem>
                <SelectItem value="|">Barra vertical ( | )</SelectItem>
                <SelectItem value="	">Tabulador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <UploadZone accept={accept} loading={loading} onFile={handleFile} hint={hint} />

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {resultado && <ResultadoPanel resultado={resultado} />}
      </CardContent>
    </Card>
  );
}

// ─── Datos de las plantillas CSV ──────────────────────────────────────────────

const PLANTILLA_GASTOS: string[][] = [
  ["codigo", "cuenta", "apropiacion_inicial"],
  ["2", "GASTOS DE FUNCIONAMIENTO", "0"],
  ["2.1", "SERVICIOS PERSONALES ASOCIADOS A LA NOMINA", "0"],
  ["2.1.1", "SUELDOS Y SALARIOS", "150000000"],
  ["2.1.2", "HORAS EXTRAS Y FESTIVOS", "8000000"],
  ["2.1.3", "PRIMA DE SERVICIOS", "12500000"],
  ["2.2", "ADQUISICION DE BIENES Y SERVICIOS", "0"],
  ["2.2.1", "MATERIALES Y SUMINISTROS", "25000000"],
  ["2.2.2", "MANTENIMIENTO Y REPARACIONES", "15000000"],
];

const PLANTILLA_INGRESOS: string[][] = [
  ["codigo", "cuenta", "presupuesto_inicial"],
  ["1", "INGRESOS CORRIENTES", "0"],
  ["1.1", "INGRESOS TRIBUTARIOS", "0"],
  ["1.1.1", "IMPUESTO PREDIAL UNIFICADO", "45000000"],
  ["1.1.2", "INDUSTRIA Y COMERCIO", "30000000"],
  ["1.2", "TRANSFERENCIAS CORRIENTES", "0"],
  ["1.2.1", "RECURSOS SGP FUNCIONAMIENTO", "180000000"],
  ["1.2.2", "RECURSOS SGP CALIDAD", "25000000"],
  ["1.3", "RECURSOS PROPIOS", "12000000"],
];

const PLANTILLA_TERCEROS: string[][] = [
  ["nit", "dv", "nombre", "direccion", "telefono", "email", "tipo", "banco", "tipo_cuenta", "no_cuenta"],
  ["900123456", "7", "EMPRESA EJEMPLO SAS", "Calle 1 # 2-3", "3001234567", "info@ejemplo.co", "Juridica", "BANCOLOMBIA", "CORRIENTE", "12345678901"],
  ["12345678", "9", "JUAN PEREZ GARCIA", "Carrera 5 # 10-20", "3209876543", "", "Natural", "DAVIVIENDA", "AHORROS", "98765432100"],
  ["70000001", "5", "MARIA LOPEZ RUIZ", "", "", "", "Natural", "", "", ""],
];

// ─── Página principal ────────────────────────────────────────────────────────

export default function ImportacionPage() {
  const { toast } = useToast();
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  async function handleDescargarPlantillaExcel() {
    setDescargandoExcel(true);
    try {
      await importacionApi.descargarPlantillaExcel();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al descargar" });
    } finally {
      setDescargandoExcel(false);
    }
  }

  async function handleSincronizarPadres() {
    setSincronizando(true);
    try {
      const res = await importacionApi.sincronizarPadres();
      toast({ title: res.mensaje });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al sincronizar" });
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Carga de Planes Presupuestales</h1>
        <p className="text-sm text-slate-500 mt-1">
          Descarga la plantilla, diligénciala y cárgala para alimentar las ejecuciones de ingresos y gastos.
        </p>
      </div>

      {/* Botón de sincronización */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-2 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium">¿Ya cargaste el presupuesto?</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Ejecuta esta acción para que los rubros agrupadores (padres) reflejen correctamente la suma de sus hojas en los informes.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 ml-4 gap-1.5 border-amber-400 text-amber-800 hover:bg-amber-100"
          onClick={handleSincronizarPadres}
          disabled={sincronizando}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${sincronizando ? "animate-spin" : ""}`} />
          {sincronizando ? "Sincronizando..." : "Sincronizar Rubros"}
        </Button>
      </div>

      {/* Aviso de flujo */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <div>
          <p className="font-medium">Orden recomendado de carga</p>
          <ol className="mt-1 list-decimal list-inside space-y-0.5 text-blue-700 text-xs">
            <li>Haz clic en <strong>Plantilla</strong> en la tarjeta correspondiente para descargar el archivo de ejemplo</li>
            <li>Diligencia la plantilla con los datos reales (respeta las columnas)</li>
            <li>Carga primero <strong>Rubros de Gastos</strong> y <strong>Rubros de Ingresos</strong> (o el Excel completo con ambos)</li>
            <li>Luego carga <strong>Terceros</strong></li>
            <li>Con los rubros cargados ya puedes registrar CDP, RP, Obligaciones, Pagos, Reconocimientos y Recaudos</li>
          </ol>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Excel completo */}
        <ImportCard
          icon={<FileSpreadsheet className="h-5 w-5" />}
          title="Catálogo Excel (Gastos + Ingresos)"
          description="Archivo .xlsx con dos hojas: GASTOS e INGRESOS"
          accept=".xlsx,.xls"
          hint="Solo archivos Excel (.xlsx)"
          showSep={false}
          onUpload={(file) => importacionApi.subirExcel(file)}
          onDescargarPlantilla={handleDescargarPlantillaExcel}
        >
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              <span className="font-semibold">Hoja GASTOS:</span>{" "}
              Col B = Código · Col C = Cuenta · Col I = Apropiación Inicial
            </p>
            <p>
              <span className="font-semibold">Hoja INGRESOS:</span>{" "}
              Col B = Código · Col C = Cuenta · Col G = Presupuesto Inicial
            </p>
            <p className="text-slate-400 italic">
              Las filas con "Total", "Código" o "Desequilibrio" se omiten automáticamente.
            </p>
          </div>
        </ImportCard>

        {/* CSV Rubros Gastos */}
        <ImportCard
          icon={<FileText className="h-5 w-5" />}
          title="Rubros de Gastos (CSV / TXT)"
          description="Un rubro por línea: código, nombre de cuenta y apropiación inicial"
          accept=".csv,.txt"
          hint="CSV o TXT — codificación UTF-8 o Latin-1"
          onUpload={(file, sep) => importacionApi.subirRubrosGastos(file, sep)}
          onDescargarPlantilla={() => descargarPlantillaCSV("plantilla_rubros_gastos.csv", PLANTILLA_GASTOS)}
        >
          <FormatoCSV
            columnas={["codigo", "cuenta", "apropiacion_inicial"]}
            filas={[
              ["2.1", "SERVICIOS PERSONALES", "0"],
              ["2.1.1", "SUELDOS Y SALARIOS", "150000000"],
              ["2.1.2", "CONTRIBUCIONES PATRONALES", "45000000"],
            ]}
          />
        </ImportCard>

        {/* CSV Rubros Ingresos */}
        <ImportCard
          icon={<FileText className="h-5 w-5" />}
          title="Rubros de Ingresos (CSV / TXT)"
          description="Un rubro por línea: código, nombre de cuenta y presupuesto inicial"
          accept=".csv,.txt"
          hint="CSV o TXT — codificación UTF-8 o Latin-1"
          onUpload={(file, sep) => importacionApi.subirRubrosIngresos(file, sep)}
          onDescargarPlantilla={() => descargarPlantillaCSV("plantilla_rubros_ingresos.csv", PLANTILLA_INGRESOS)}
        >
          <FormatoCSV
            columnas={["codigo", "cuenta", "presupuesto_inicial"]}
            filas={[
              ["1.2", "TRANSFERENCIAS CORRIENTES", "0"],
              ["1.2.1", "RECURSOS SGP FUNCIONAMIENTO", "180000000"],
              ["1.2.2", "RECURSOS SGP CALIDAD", "25000000"],
            ]}
          />
        </ImportCard>

        {/* CSV Terceros */}
        <ImportCard
          icon={<Users className="h-5 w-5" />}
          title="Terceros (Proveedores / Beneficiarios)"
          description="Personas naturales o jurídicas receptoras de pagos"
          accept=".csv,.txt"
          hint="CSV o TXT — codificación UTF-8 o Latin-1"
          onUpload={(file, sep) => importacionApi.subirTerceros(file, sep)}
          onDescargarPlantilla={() => descargarPlantillaCSV("plantilla_terceros.csv", PLANTILLA_TERCEROS)}
        >
          <FormatoCSV
            columnas={["nit", "dv", "nombre", "dirección*", "teléfono*", "email*", "tipo*", "banco*", "tipo_cuenta*", "no_cuenta*"]}
            filas={[
              ["900123456", "7", "EMPRESA EJEMPLO SAS", "Calle 1 # 2-3", "3001234567", "", "Juridica", "", "", ""],
              ["12345678", "9", "JUAN PEREZ", "", "", "", "Natural", "", "", ""],
            ]}
          />
          <p className="text-xs text-slate-400 mt-1">* Columnas opcionales — déjalas vacías si no aplica</p>
        </ImportCard>

      </div>
    </div>
  );
}
