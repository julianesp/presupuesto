"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { comprobantesApi } from "@/lib/api/comprobantes";
import type { ComprobanteCDP } from "@/lib/types/comprobante";
import { formatDate } from "@/lib/utils/dates";
import { formatCOP } from "@/lib/utils/currency";
import {
  ComprobanteHeader,
  ValorBox,
  CampoRow,
  DatosTable,
  Seccion,
  CadenaPresupuestal,
  FirmasBlock,
  PrintWrapper,
  ActionBar,
  Pie,
} from "@/components/comprobantes/ComprobanteLayout";

export default function ComprobanteCDPPage() {
  const { numero } = useParams<{ numero: string }>();
  const router = useRouter();
  const [data, setData] = useState<ComprobanteCDP | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    comprobantesApi
      .cdp(parseInt(numero))
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

  const { institucion, documento, rubro, saldo_cdp, comprometido, rps_vinculados } = data;

  return (
    <>
      <ActionBar onPrint={() => window.print()} onBack={() => router.back()} />
      <PrintWrapper>
        <ComprobanteHeader
          institucion={institucion}
          titulo="Certificado de Disponibilidad Presupuestal"
          subtitulo="CDP — Artículo 71 Ley 38/89 y Decreto 111/96"
          numero={documento.numero}
          fecha={documento.fecha}
          vigencia={institucion.vigencia}
          estado={documento.estado}
        />

        <ValorBox valor={documento.valor} letras={documento.valor_letras} />

        {/* Datos del CDP */}
        <Seccion titulo="Datos del Certificado" color="bg-blue-700">
          <DatosTable>
            <CampoRow label="N° CDP" value={documento.numero} mono />
            <CampoRow label="Fecha" value={formatDate(documento.fecha)} />
            <CampoRow label="Código Rubro" value={documento.codigo_rubro} mono />
            <CampoRow label="Nombre Rubro" value={documento.cuenta_rubro} />
            <CampoRow label="Objeto" value={documento.objeto} />
            <CampoRow label="Estado" value={
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                documento.estado === "ANULADO" ? "bg-red-100 text-red-700" :
                documento.estado === "COMPROMETIDO" ? "bg-violet-100 text-violet-700" :
                "bg-blue-100 text-blue-700"
              }`}>{documento.estado}</span>
            } />
          </DatosTable>
        </Seccion>

        {/* Apropiación del rubro */}
        <Seccion titulo="Apropiación Presupuestal del Rubro" color="bg-slate-600">
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="px-3 py-1.5 font-semibold text-slate-600 uppercase">Apropiación Inicial</td>
                <td className="px-3 py-1.5 text-right font-mono">{formatCOP(rubro.apropiacion_inicial)}</td>
              </tr>
              {rubro.adiciones !== 0 && (
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-1.5 text-slate-600">+ Adiciones / Créditos</td>
                  <td className="px-3 py-1.5 text-right font-mono text-green-700">{formatCOP(rubro.adiciones + rubro.creditos)}</td>
                </tr>
              )}
              {(rubro.reducciones !== 0 || rubro.contracreditos !== 0) && (
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-1.5 text-slate-600">− Reducciones / Contracréditos</td>
                  <td className="px-3 py-1.5 text-right font-mono text-red-700">({formatCOP(rubro.reducciones + rubro.contracreditos)})</td>
                </tr>
              )}
              <tr className="border-b-2 border-slate-700 bg-blue-50">
                <td className="px-3 py-1.5 font-bold text-blue-800 uppercase">Apropiación Definitiva</td>
                <td className="px-3 py-1.5 text-right font-mono font-bold text-blue-800">{formatCOP(rubro.apropiacion_definitiva)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">− Comprometido (RPs activos)</td>
                <td className="px-3 py-1.5 text-right font-mono text-orange-700">({formatCOP(comprometido)})</td>
              </tr>
              <tr className="bg-green-50">
                <td className="px-3 py-1.5 font-bold text-green-800 uppercase">Saldo Disponible después del CDP</td>
                <td className="px-3 py-1.5 text-right font-mono font-bold text-green-800">{formatCOP(saldo_cdp)}</td>
              </tr>
            </tbody>
          </table>
        </Seccion>

        {/* RPs vinculados */}
        {rps_vinculados.length > 0 && (
          <Seccion titulo={`Registros Presupuestales Vinculados (${rps_vinculados.length})`} color="bg-violet-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["N° RP", "Fecha", "Tercero / NIT", "Valor", "Estado"].map((h) => (
                    <th key={h} className="px-3 py-1.5 text-left font-semibold text-slate-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rps_vinculados.map((r) => (
                  <tr key={r.numero} className="border-b border-slate-100">
                    <td className="px-3 py-1.5 font-mono font-bold">{r.numero}</td>
                    <td className="px-3 py-1.5">{formatDate(r.fecha)}</td>
                    <td className="px-3 py-1.5">
                      <span className="font-medium">{r.tercero}</span>
                      {r.nit && <span className="text-slate-500 ml-1">({r.nit})</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatCOP(r.valor)}</td>
                    <td className="px-3 py-1.5">{r.estado}</td>
                  </tr>
                ))}
                <tr className="bg-violet-50 font-bold border-t-2 border-violet-300">
                  <td colSpan={3} className="px-3 py-1.5 text-right text-violet-800">TOTAL COMPROMETIDO</td>
                  <td className="px-3 py-1.5 text-right font-mono text-violet-800">{formatCOP(comprometido)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </Seccion>
        )}

        {/* Nota legal */}
        <div className="border border-slate-200 rounded bg-slate-50 px-3 py-2 mb-4 text-xs text-slate-600">
          <strong>NOTA:</strong> Este certificado acredita la existencia de apropiación presupuestal suficiente para atender el compromiso que se pretende adquirir.
          La disponibilidad se certifica con base en la información del sistema al momento de la expedición.
        </div>

        <FirmasBlock
          rector={institucion.rector}
          tesorero={institucion.tesorero}
        />

        <CadenaPresupuestal items={[
          { label: "CDP", numero: documento.numero, fecha: documento.fecha },
        ]} />

        <Pie vigencia={institucion.vigencia} />
      </PrintWrapper>
    </>
  );
}
