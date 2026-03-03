"use client";
import { useState, useRef } from "react";
import { backupApi, type RestaurarResult } from "@/lib/api/backup";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DownloadIcon, UploadCloudIcon, ShieldCheckIcon, AlertTriangleIcon, CheckCircleIcon } from "lucide-react";

const LABELS: Record<string, string> = {
  config: "Configuración",
  rubros_gastos: "Rubros de Gastos",
  rubros_ingresos: "Rubros de Ingresos",
  terceros: "Terceros",
  cuentas_bancarias: "Cuentas Bancarias",
  cdp: "CDP",
  rp: "RP",
  obligaciones: "Obligaciones",
  pagos: "Pagos",
  recaudos: "Recaudos",
  reconocimientos: "Reconocimientos",
  modificaciones: "Modificaciones Presupuestales",
  pac: "PAC",
  mapeo_sifse_ingresos: "Mapeos SIFSE Ingresos",
  mapeo_sifse_gastos: "Mapeos SIFSE Gastos",
};

export default function BackupPage() {
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<RestaurarResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleExportar() {
    setExporting(true);
    try {
      await backupApi.exportar();
      toast({ title: "Copia de seguridad descargada correctamente" });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al exportar" });
    } finally {
      setExporting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast({ variant: "destructive", title: "Seleccione un archivo .json de backup" });
      return;
    }
    setResult(null);
    setPendingFile(file);
    // reset input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleRestaurar() {
    if (!pendingFile) return;
    setConfirmOpen(false);
    setRestoring(true);
    try {
      const res = await backupApi.restaurar(pendingFile);
      setResult(res);
      setPendingFile(null);
      toast({ title: "Datos restaurados exitosamente" });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al restaurar" });
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Copias de Seguridad"
        description="Respalde y restaure todos los datos del sistema"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {/* ── Exportar ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5">
              <DownloadIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Crear copia de seguridad</h2>
              <p className="text-sm text-slate-500">Descarga todos los datos en un archivo JSON</p>
            </div>
          </div>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>Incluye rubros, CDPs, RPs, obligaciones, pagos, recaudos y más</li>
            <li>El archivo se guarda en tu computador</li>
            <li>Úsalo para restaurar en caso de pérdida de datos</li>
          </ul>
          <Button
            onClick={handleExportar}
            disabled={exporting}
            className="mt-auto w-full"
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            {exporting ? "Generando copia..." : "Descargar copia de seguridad"}
          </Button>
        </div>

        {/* ── Restaurar ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2.5">
              <UploadCloudIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Restaurar copia de seguridad</h2>
              <p className="text-sm text-slate-500">Carga un archivo JSON generado por este sistema</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <AlertTriangleIcon className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Advertencia:</strong> Esta operación reemplaza <strong>todos los datos actuales</strong> con el contenido del archivo.
              No se puede deshacer.
            </p>
          </div>

          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloudIcon className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">
              {pendingFile ? pendingFile.name : "Haga clic para seleccionar archivo"}
            </p>
            <p className="text-xs text-slate-400 mt-1">Formato: .json</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            variant="destructive"
            disabled={!pendingFile || restoring}
            onClick={() => setConfirmOpen(true)}
            className="mt-auto w-full"
          >
            <ShieldCheckIcon className="h-4 w-4 mr-2" />
            {restoring ? "Restaurando..." : pendingFile ? `Restaurar "${pendingFile.name}"` : "Seleccione un archivo"}
          </Button>
        </div>
      </div>

      {/* ── Resultado de restauración ─────────────────────────────── */}
      {result && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-800">
              Restauración completada — Backup del {result.fecha_backup}
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(result.registros).map(([key, count]) => (
              <div key={key} className="rounded-lg bg-white border border-emerald-200 px-3 py-2">
                <p className="text-xs text-slate-500">{LABELS[key] ?? key}</p>
                <p className="text-lg font-semibold text-slate-800">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Confirmación de restauración ─────────────────────────── */}
      <ConfirmDialog
        open={confirmOpen}
        title="¿Restaurar copia de seguridad?"
        description={`Se reemplazarán TODOS los datos actuales con el archivo "${pendingFile?.name}". Esta acción no se puede deshacer.`}
        confirmLabel="Sí, restaurar"
        cancelLabel="Cancelar"
        onConfirm={handleRestaurar}
        onCancel={() => { setConfirmOpen(false); setPendingFile(null); }}
        loading={restoring}
      />
    </div>
  );
}
