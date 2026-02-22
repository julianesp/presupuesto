"use client";
import { formatDate } from "@/lib/utils/dates";
import { formatCOP } from "@/lib/utils/currency";
import type { Institucion } from "@/lib/types/comprobante";

// ─── Encabezado institucional ─────────────────────────────────────────────────

export function ComprobanteHeader({
  institucion,
  titulo,
  subtitulo,
  numero,
  fecha,
  vigencia,
  estado,
}: {
  institucion: Institucion;
  titulo: string;
  subtitulo?: string;
  numero: number;
  fecha: string;
  vigencia?: string;
  estado: string;
}) {
  const anulado = estado === "ANULADO" || estado === "ANULADA";
  return (
    <div className="relative mb-6">
      {anulado && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-15">
          <span className="text-red-600 font-black text-8xl rotate-[-30deg] tracking-widest border-[10px] border-red-600 px-6 py-2 rounded-lg">
            ANULADO
          </span>
        </div>
      )}

      {/* Institución */}
      <div className="text-center border-b-2 border-slate-800 pb-3 mb-3">
        <p className="text-xs text-slate-500 uppercase tracking-widest">República de Colombia</p>
        <h1 className="text-lg font-black uppercase text-slate-900 leading-tight">
          {institucion.nombre}
        </h1>
        {institucion.nit && (
          <p className="text-sm text-slate-600">NIT: {institucion.nit}</p>
        )}
        {institucion.codigo_dane && (
          <p className="text-xs text-slate-500">Código DANE: {institucion.codigo_dane}</p>
        )}
      </div>

      {/* Título del documento */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold uppercase text-slate-800">{titulo}</h2>
          {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
        </div>
        <div className="text-right shrink-0 ml-6">
          <div className="inline-block border-2 border-slate-800 px-4 py-2 text-center">
            <p className="text-xs text-slate-500 uppercase font-semibold">N°</p>
            <p className="text-2xl font-black text-slate-900 leading-none">{numero}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Fecha: {formatDate(fecha)}
            </p>
          </div>
        </div>
      </div>

      {vigencia && (
        <p className="text-xs text-slate-500 mt-1">
          Vigencia Fiscal: <strong>{vigencia}</strong>
        </p>
      )}

      {anulado && (
        <div className="mt-2 bg-red-50 border border-red-300 rounded px-3 py-1.5">
          <p className="text-xs font-bold text-red-700 uppercase">Documento Anulado</p>
        </div>
      )}
    </div>
  );
}

// ─── Bloque de valor + letras ─────────────────────────────────────────────────

export function ValorBox({ valor, letras }: { valor: number; letras: string }) {
  return (
    <div className="border-2 border-slate-700 rounded bg-slate-50 p-3 mb-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase font-semibold text-slate-600">Valor:</span>
        <span className="text-xl font-black text-slate-900 font-mono">{formatCOP(valor)}</span>
      </div>
      <div className="mt-1 border-t border-slate-300 pt-1">
        <span className="text-xs text-slate-500">Son: </span>
        <span className="text-xs font-semibold text-slate-700 uppercase">{letras}</span>
      </div>
    </div>
  );
}

// ─── Fila de datos ────────────────────────────────────────────────────────────

export function CampoRow({
  label,
  value,
  mono = false,
  colSpan = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  colSpan?: boolean;
}) {
  return (
    <tr className="border-b border-slate-200">
      <td className="py-1.5 pr-3 text-xs font-semibold text-slate-600 uppercase whitespace-nowrap w-40">
        {label}
      </td>
      <td
        className={`py-1.5 text-sm text-slate-800 ${mono ? "font-mono" : ""} ${colSpan ? "col-span-2" : ""}`}
      >
        {value || "—"}
      </td>
    </tr>
  );
}

// ─── Tabla de datos generales ─────────────────────────────────────────────────

export function DatosTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-slate-300 rounded mb-4 overflow-hidden">
      <table className="w-full text-sm">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ─── Sección titulada ─────────────────────────────────────────────────────────

export function Seccion({
  titulo,
  color = "bg-slate-700",
  children,
}: {
  titulo: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className={`${color} text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5`}>
        {titulo}
      </div>
      <div className="border border-t-0 border-slate-300 rounded-b overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ─── Bloque cadena presupuestal ───────────────────────────────────────────────

export function CadenaPresupuestal({
  items,
}: {
  items: { label: string; numero: number | string; fecha?: string }[];
}) {
  const activos = items.filter((i) => i.numero && i.numero !== 0);
  if (activos.length === 0) return null;
  return (
    <div className="flex items-center gap-0 mb-4 text-xs overflow-x-auto">
      {activos.map((item, idx) => (
        <div key={idx} className="flex items-center">
          {idx > 0 && (
            <div className="w-6 h-[2px] bg-slate-400 shrink-0" />
          )}
          <div className="border border-slate-400 rounded px-2 py-1 text-center shrink-0 min-w-[70px]">
            <p className="text-slate-500 font-medium">{item.label}</p>
            <p className="font-bold text-slate-800">#{item.numero}</p>
            {item.fecha && (
              <p className="text-slate-400">{formatDate(item.fecha)}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Bloque de firmas ─────────────────────────────────────────────────────────

export function FirmasBlock({
  rector,
  tesorero,
  tercero,
  labelTercero = "Beneficiario / Proveedor",
}: {
  rector: string;
  tesorero: string;
  tercero?: string;
  labelTercero?: string;
}) {
  const cols = tercero ? 3 : 2;
  return (
    <div className={`grid grid-cols-${cols} gap-4 mt-8 pt-4 border-t-2 border-slate-300`}>
      <FirmaCol nombre={rector || "___________________________"} cargo="Rector(a)" />
      <FirmaCol nombre={tesorero || "___________________________"} cargo="Tesorero(a)" />
      {tercero && (
        <FirmaCol nombre={tercero} cargo={labelTercero} />
      )}
    </div>
  );
}

function FirmaCol({ nombre, cargo }: { nombre: string; cargo: string }) {
  return (
    <div className="text-center">
      <div className="border-b-2 border-slate-600 mb-1 h-10" />
      <p className="text-xs font-semibold text-slate-800 uppercase">{nombre}</p>
      <p className="text-xs text-slate-500">{cargo}</p>
    </div>
  );
}

// ─── Wrapper de impresión ─────────────────────────────────────────────────────

export function PrintWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 print:p-4 print:max-w-none shadow-lg print:shadow-none font-sans text-slate-900">
      {children}
    </div>
  );
}

// ─── Barra de acción (solo pantalla, oculta en print) ────────────────────────

export function ActionBar({
  onPrint,
  onBack,
}: {
  onPrint: () => void;
  onBack: () => void;
}) {
  return (
    <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-3 shadow-sm">
      <button
        onClick={onBack}
        className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
      >
        ← Volver
      </button>
      <span className="flex-1" />
      <button
        onClick={onPrint}
        className="bg-slate-800 text-white text-sm px-4 py-1.5 rounded hover:bg-slate-700 flex items-center gap-2"
      >
        🖨️ Imprimir / PDF
      </button>
    </div>
  );
}

// ─── Pie de página ────────────────────────────────────────────────────────────

export function Pie({ vigencia }: { vigencia: string }) {
  const now = new Date();
  const fechaImpresion = now.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
      <span>Sistema Presupuestal · Vigencia {vigencia}</span>
      <span>Impreso: {fechaImpresion}</span>
    </div>
  );
}
