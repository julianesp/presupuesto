"use client";
import { useRef, useState } from "react";
import { CheckCircle2, Download, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ResultadoCarga } from "@/lib/api/contabilidad";

interface Props {
  titulo: string;
  descripcion: string;
  etiquetas?: Record<string, string>;
  onPlantilla: () => Promise<void>;
  onCargar: (file: File) => Promise<ResultadoCarga>;
  onCargado?: () => void;
  deshabilitado?: boolean;
}

/** Descarga de plantilla + carga de Excel con el resultado (resumen o lista de errores). */
export function CargaExcel({ titulo, descripcion, etiquetas = {}, onPlantilla, onCargar, onCargado, deshabilitado }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [descargando, setDescargando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);

  async function descargar() {
    setDescargando(true);
    try {
      await onPlantilla();
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
      const res = await onCargar(file);
      setResultado(res);
      if (res.ok) {
        toast({ title: `${titulo}: carga completada` });
        onCargado?.();
      } else {
        toast({ variant: "destructive", title: "El archivo tiene errores; no se guardó nada" });
      }
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error al cargar" });
    } finally {
      setCargando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900 text-sm">{titulo}</p>
          <p className="text-xs text-slate-500 mt-0.5">{descripcion}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={descargar} disabled={descargando}>
            <Download className="h-4 w-4 mr-1" />
            {descargando ? "..." : "Plantilla"}
          </Button>
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={cargando || deshabilitado}>
            <Upload className="h-4 w-4 mr-1" />
            {cargando ? "Cargando..." : "Cargar"}
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

      {resultado?.ok && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <p className="flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> Carga completada
          </p>
          {Object.entries(resultado.resumen).map(([k, v]) => (
            <p key={k}>
              {etiquetas[k] ?? k}: {typeof v === "number" ? v.toLocaleString("es-CO") : v}
            </p>
          ))}
        </div>
      )}
      {resultado && !resultado.ok && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <p className="flex items-center gap-1 font-medium">
            <XCircle className="h-3.5 w-3.5" /> No se guardó nada. Corrija y vuelva a cargar:
          </p>
          <ul className="mt-1 max-h-48 overflow-y-auto list-disc list-inside space-y-0.5">
            {resultado.errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
