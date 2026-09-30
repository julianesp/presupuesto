"use client";
import { useRef, useState } from "react";
import { CheckCircle2, Download, History, Upload, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { importacionApi, type ResultadoEjecucionHistorica } from "@/lib/api/importacion";

const HOJAS = [
  ["Saldos iniciales", "Cuentas bancarias con su saldo al 1 de enero"],
  ["Terceros", "Proveedores y contratistas que aparecen en los RP"],
  ["CDP", "Número, fecha, rubro, objeto y valor"],
  ["RP", "Compromisos: número, fecha, CDP, tercero y valor"],
  ["Obligaciones", "Número, fecha, RP y valor"],
  ["Pagos", "Número, fecha, obligación y valor"],
  ["Reconocimientos", "Facturación / ingresos reconocidos por rubro"],
  ["Recaudos", "Recibos de caja por rubro"],
];

const ETIQUETAS: Record<string, string> = {
  saldos_iniciales: "Cuentas con saldo inicial",
  terceros: "Terceros nuevos",
  terceros_omitidos: "Terceros ya existentes (omitidos)",
  cdp: "CDP",
  rp: "RP",
  obligaciones: "Obligaciones",
  pagos: "Pagos",
  reconocimientos: "Reconocimientos",
  recaudos: "Recaudos",
};

/**
 * Carga de procesos ya ejecutados en la vigencia (desde enero) con una plantilla Excel.
 */
export function EjecucionHistoricaCard() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [descargando, setDescargando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEjecucionHistorica | null>(null);

  async function descargar() {
    setDescargando(true);
    try {
      await importacionApi.descargarPlantillaEjecucion();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al descargar" });
    } finally {
      setDescargando(false);
    }
  }

  async function cargar(file: File) {
    setCargando(true);
    setResultado(null);
    try {
      const res = await importacionApi.subirEjecucionHistorica(file);
      setResultado(res);
      toast(
        res.ok
          ? { title: "Ejecución histórica cargada" }
          : { variant: "destructive", title: `El archivo tiene ${res.errores.length} error(es); no se guardó nada` },
      );
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al cargar" });
    } finally {
      setCargando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <History className="h-5 w-5 text-slate-500 mt-0.5" />
            <div>
              <CardTitle className="text-base">Ejecución histórica (procesos ya ejecutados)</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Saldos iniciales, CDP, RP, obligaciones, pagos, reconocimientos y recaudos desde enero de la vigencia
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={descargar} disabled={descargando}>
              <Download className="h-4 w-4 mr-1" />
              {descargando ? "Descargando..." : "Plantilla"}
            </Button>
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={cargando}>
              <Upload className="h-4 w-4 mr-1" />
              {cargando ? "Validando y cargando..." : "Cargar archivo"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && cargar(e.target.files[0])}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
          {HOJAS.map(([hoja, desc]) => (
            <p key={hoja}>
              <span className="font-semibold">{hoja}:</span> {desc}
            </p>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          La plantilla incluye una hoja <strong>Rubros</strong> con los códigos de la empresa activa. Se valida todo el
          archivo antes de guardar: saldos de rubros, CDP, RP y obligaciones, fechas dentro de la vigencia y números
          repetidos. Si hay un solo error, no se guarda nada. Puedes cargar mes a mes: en cada archivo incluye solo
          los documentos nuevos del mes; pueden referenciar CDP, RP y obligaciones de meses anteriores.
        </p>

        {resultado?.ok && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4" /> Carga completada
            </p>
            <ul className="mt-1 text-xs space-y-0.5">
              {Object.entries(resultado.resumen).map(([k, v]) => (
                <li key={k}>
                  {ETIQUETAS[k] ?? k}: {v}
                </li>
              ))}
            </ul>
          </div>
        )}

        {resultado && !resultado.ok && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="flex items-center gap-1.5 font-medium">
              <XCircle className="h-4 w-4" /> No se guardó nada. Corrige estos errores y vuelve a cargar:
            </p>
            <ul className="mt-1 max-h-60 overflow-y-auto text-xs space-y-0.5 list-disc list-inside">
              {resultado.errores.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
