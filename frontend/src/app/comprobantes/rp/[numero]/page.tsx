"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { comprobantesApi } from "@/lib/api/comprobantes";
import type { ComprobanteRP } from "@/lib/types/comprobante";
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

export default function ComprobanteRPPage() {
  const { numero } = useParams<{ numero: string }>();
  const router = useRouter();
  const [data, setData] = useState<ComprobanteRP | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    comprobantesApi
      .rp(parseInt(numero))
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

  const { institucion, documento, tercero, cdp, rubro, saldo_rp, obligado, obligaciones_vinculadas } = data;

  return (
    <>
      <ActionBar onPrint={() => window.print()} onBack={() => router.back()} />
      <PrintWrapper>
        <ComprobanteHeader
          institucion={institucion}
          titulo="Registro Presupuestal de Compromiso"
          subtitulo="RP — Artículo 71 Ley 38/89 y Decreto 111/96"
          numero={documento.numero}
          fecha={documento.fecha}
          vigencia={institucion.vigencia}
          estado={documento.estado}
        />

        <ValorBox valor={documento.valor} letras={documento.valor_letras} />

        {/* Cadena */}
        <CadenaPresupuestal items={[
          { label: "CDP", numero: cdp.numero, fecha: cdp.fecha },
          { label: "RP", numero: documento.numero, fecha: documento.fecha },
        ]} />

        {/* Datos generales */}
        <Seccion titulo="Datos del Registro Presupuestal" color="bg-violet-700">
          <DatosTable>
            <CampoRow label="N° RP" value={documento.numero} mono />
            <CampoRow label="Fecha" value={formatDate(documento.fecha)} />
            <CampoRow label="CDP N°" value={documento.cdp_numero} mono />
            <CampoRow label="Código Rubro" value={documento.codigo_rubro} mono />
            <CampoRow label="Nombre Rubro" value={documento.cuenta_rubro} />
            <CampoRow label="Objeto / Contrato" value={documento.objeto} />
            <CampoRow label="Estado" value={
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                documento.estado === "ANULADO" ? "bg-red-100 text-red-700" :
                documento.estado === "OBLIGADO" ? "bg-amber-100 text-amber-700" :
                "bg-violet-100 text-violet-700"
              }`}>{documento.estado}</span>
            } />
          </DatosTable>
        </Seccion>

        {/* Tercero */}
        <Seccion titulo="Datos del Contratista / Proveedor" color="bg-slate-600">
          <DatosTable>
            <CampoRow label="NIT / CC" value={documento.nit_tercero} mono />
            <CampoRow label="Nombre" value={documento.nombre_tercero} />
            {tercero?.direccion && <CampoRow label="Dirección" value={tercero.direccion} />}
            {tercero?.telefono && <CampoRow label="Teléfono" value={tercero.telefono} />}
            {tercero?.banco && (
              <CampoRow
                label="Datos Bancarios"
                value={`${tercero.banco} — ${tercero.tipo_cuenta} N° ${tercero.no_cuenta}`}
              />
            )}
          </DatosTable>
        </Seccion>

        {/* Ejecución del RP */}
        <Seccion titulo="Ejecución del RP" color="bg-slate-600">
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="px-3 py-1.5 font-semibold text-slate-600 uppercase">Valor del RP</td>
                <td className="px-3 py-1.5 text-right font-mono font-bold">{formatCOP(documento.valor)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">− Obligado</td>
                <td className="px-3 py-1.5 text-right font-mono text-amber-700">({formatCOP(obligado)})</td>
              </tr>
              <tr className="border-b-2 border-slate-700 bg-green-50">
                <td className="px-3 py-1.5 font-bold text-green-800 uppercase">Saldo por Obligar</td>
                <td className="px-3 py-1.5 text-right font-mono font-bold text-green-800">{formatCOP(saldo_rp)}</td>
              </tr>
            </tbody>
          </table>
        </Seccion>

        {/* Obligaciones vinculadas */}
        {obligaciones_vinculadas.length > 0 && (
          <Seccion titulo={`Obligaciones Vinculadas (${obligaciones_vinculadas.length})`} color="bg-amber-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["N° Obl.", "Fecha", "Factura / Ref.", "Valor", "Estado"].map((h) => (
                    <th key={h} className="px-3 py-1.5 text-left font-semibold text-slate-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {obligaciones_vinculadas.map((o) => (
                  <tr key={o.numero} className="border-b border-slate-100">
                    <td className="px-3 py-1.5 font-mono font-bold">{o.numero}</td>
                    <td className="px-3 py-1.5">{formatDate(o.fecha)}</td>
                    <td className="px-3 py-1.5">{o.factura || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatCOP(o.valor)}</td>
                    <td className="px-3 py-1.5">{o.estado}</td>
                  </tr>
                ))}
                <tr className="bg-amber-50 font-bold border-t-2 border-amber-300">
                  <td colSpan={3} className="px-3 py-1.5 text-right text-amber-800">TOTAL OBLIGADO</td>
                  <td className="px-3 py-1.5 text-right font-mono text-amber-800">{formatCOP(obligado)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </Seccion>
        )}

        {/* CDP referencia */}
        <Seccion titulo="CDP de Referencia" color="bg-blue-700">
          <DatosTable>
            <CampoRow label="N° CDP" value={cdp.numero} mono />
            <CampoRow label="Fecha CDP" value={formatDate(cdp.fecha)} />
            <CampoRow label="Valor CDP" value={<span className="font-mono">{formatCOP(cdp.valor)}</span>} />
            <CampoRow label="Objeto CDP" value={cdp.objeto} />
          </DatosTable>
        </Seccion>

        <FirmasBlock
          rector={institucion.rector}
          tesorero={institucion.tesorero}
          tercero={documento.nombre_tercero}
        />

        <Pie vigencia={institucion.vigencia} />
      </PrintWrapper>
    </>
  );
}
