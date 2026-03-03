"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { comprobantesApi } from "@/lib/api/comprobantes";
import type { ComprobanteRecaudo } from "@/lib/types/comprobante";
import { formatDate } from "@/lib/utils/dates";
import { formatCOP } from "@/lib/utils/currency";
import {
  ComprobanteHeader,
  CampoRow,
  DatosTable,
  Seccion,
  FirmasBlock,
  PrintWrapper,
  ActionBar,
  Pie,
} from "@/components/comprobantes/ComprobanteLayout";

export default function ComprobanteRecaudoPage() {
  const { numero } = useParams<{ numero: string }>();
  const router = useRouter();
  const [data, setData] = useState<ComprobanteRecaudo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    comprobantesApi
      .recaudo(parseInt(numero))
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error al cargar"));
  }, [numero]);

  if (error) {
    return (
      <div className="p-10 text-center text-red-600">
        <p className="text-lg font-semibold">Error</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-center text-slate-500">
        <p>Cargando comprobante...</p>
      </div>
    );
  }

  const { institucion, documento, rubro, cuenta_bancaria } = data;

  return (
    <>
      <ActionBar onPrint={() => window.print()} onBack={() => router.back()} />
      <PrintWrapper>
        <ComprobanteHeader
          institucion={institucion}
          titulo="Recibo de Caja — Recaudo de Ingresos"
          subtitulo="Reconocimiento y recaudo de ingreso presupuestal"
          numero={documento.numero}
          fecha={documento.fecha}
          vigencia={institucion.vigencia}
          estado={documento.estado}
        />

        {/* Valor destacado */}
        <div className="border-4 border-blue-700 rounded-lg bg-blue-50 p-4 mb-5 text-center">
          <p className="text-xs text-blue-600 uppercase font-semibold tracking-widest mb-1">
            Valor Recaudado
          </p>
          <p className="text-4xl font-black text-blue-800 font-mono tracking-tight">
            {formatCOP(documento.valor)}
          </p>
          <p className="text-sm text-blue-700 font-semibold mt-1 uppercase">
            {documento.valor_letras}
          </p>
        </div>

        {/* Datos del recaudo */}
        <Seccion titulo="Datos del Recibo de Caja" color="bg-blue-700">
          <DatosTable>
            <CampoRow label="N° Recaudo" value={documento.numero} mono />
            <CampoRow label="Fecha" value={formatDate(documento.fecha)} />
            <CampoRow label="Código Rubro" value={documento.codigo_rubro} mono />
            <CampoRow label="Rubro de Ingreso" value={documento.cuenta_rubro} />
            <CampoRow label="Concepto" value={documento.concepto} />
            {documento.no_comprobante && (
              <CampoRow label="N° Comprobante" value={documento.no_comprobante} mono />
            )}
            <CampoRow label="Estado" value={
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                documento.estado === "Anulado" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
              }`}>{documento.estado}</span>
            } />
          </DatosTable>
        </Seccion>

        {/* Información del rubro */}
        <Seccion titulo="Información del Rubro de Ingreso" color="bg-slate-600">
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="px-3 py-1.5 font-semibold text-slate-600 uppercase">Código</td>
                <td className="px-3 py-1.5 font-mono">{rubro.codigo}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 font-semibold text-slate-600 uppercase">Denominación</td>
                <td className="px-3 py-1.5">{rubro.cuenta}</td>
              </tr>
              {rubro.presupuesto_definitivo > 0 && (
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-1.5 font-semibold text-slate-600 uppercase">Presupuesto Definitivo</td>
                  <td className="px-3 py-1.5 font-mono">{formatCOP(rubro.presupuesto_definitivo)}</td>
                </tr>
              )}
              <tr className="bg-blue-50">
                <td className="px-3 py-1.5 font-bold text-blue-800 uppercase">Este Recaudo</td>
                <td className="px-3 py-1.5 font-mono font-bold text-blue-800">{formatCOP(documento.valor)}</td>
              </tr>
            </tbody>
          </table>
        </Seccion>

        {/* Cuenta bancaria */}
        {cuenta_bancaria && (
          <Seccion titulo="Cuenta Bancaria Destino" color="bg-slate-500">
            <DatosTable>
              <CampoRow label="Banco" value={cuenta_bancaria.banco} />
              <CampoRow label="Tipo de Cuenta" value={cuenta_bancaria.tipo_cuenta} />
              <CampoRow label="N° Cuenta" value={cuenta_bancaria.numero_cuenta} mono />
              {cuenta_bancaria.denominacion && (
                <CampoRow label="Denominación" value={cuenta_bancaria.denominacion} />
              )}
            </DatosTable>
          </Seccion>
        )}

        {/* Espacio para datos del pagante */}
        <div className="border-2 border-dashed border-slate-400 rounded p-3 mb-4 bg-slate-50">
          <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Datos del Pagante / Deudor:</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="border-b border-slate-400 h-7" />
              <p className="text-xs text-slate-500 mt-0.5">Nombre</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-7" />
              <p className="text-xs text-slate-500 mt-0.5">NIT / Cédula</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-7" />
              <p className="text-xs text-slate-500 mt-0.5">Concepto del Pago</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-7" />
              <p className="text-xs text-slate-500 mt-0.5">N° Recibo de Caja Externo</p>
            </div>
          </div>
        </div>

        <FirmasBlock
          rector={institucion.rector}
          tesorero={institucion.tesorero}
        />

        <Pie vigencia={institucion.vigencia} />
      </PrintWrapper>
    </>
  );
}
