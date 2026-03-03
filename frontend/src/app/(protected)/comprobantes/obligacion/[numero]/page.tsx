"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { comprobantesApi } from "@/lib/api/comprobantes";
import type { ComprobanteObligacion } from "@/lib/types/comprobante";
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

export default function ComprobanteObligacionPage() {
  const { numero } = useParams<{ numero: string }>();
  const router = useRouter();
  const [data, setData] = useState<ComprobanteObligacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    comprobantesApi
      .obligacion(parseInt(numero))
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

  const { institucion, documento, tercero, rp, cdp, rubro, saldo_obligacion, pagado, pagos_vinculados } = data;

  return (
    <>
      <ActionBar onPrint={() => window.print()} onBack={() => router.back()} />
      <PrintWrapper>
        <ComprobanteHeader
          institucion={institucion}
          titulo="Obligación Presupuestal"
          subtitulo="Reconocimiento de obligación a cargo del presupuesto"
          numero={documento.numero}
          fecha={documento.fecha}
          vigencia={institucion.vigencia}
          estado={documento.estado}
        />

        <ValorBox valor={documento.valor} letras={documento.valor_letras} />

        {/* Cadena presupuestal */}
        <CadenaPresupuestal items={[
          { label: "CDP", numero: cdp.numero, fecha: cdp.fecha },
          { label: "RP", numero: rp.numero, fecha: rp.fecha },
          { label: "Obligación", numero: documento.numero, fecha: documento.fecha },
        ]} />

        {/* Datos obligación */}
        <Seccion titulo="Datos de la Obligación" color="bg-amber-700">
          <DatosTable>
            <CampoRow label="N° Obligación" value={documento.numero} mono />
            <CampoRow label="Fecha" value={formatDate(documento.fecha)} />
            <CampoRow label="RP N°" value={documento.rp_numero} mono />
            <CampoRow label="CDP N°" value={documento.cdp_numero} mono />
            <CampoRow label="Código Rubro" value={documento.codigo_rubro} mono />
            <CampoRow label="Nombre Rubro" value={documento.cuenta_rubro} />
            <CampoRow label="Factura / Documento" value={documento.factura} />
            <CampoRow label="Estado" value={
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                documento.estado === "ANULADA" ? "bg-red-100 text-red-700" :
                documento.estado === "PAGADA" ? "bg-green-100 text-green-700" :
                "bg-amber-100 text-amber-700"
              }`}>{documento.estado}</span>
            } />
          </DatosTable>
        </Seccion>

        {/* Proveedor */}
        <Seccion titulo="Datos del Acreedor / Proveedor" color="bg-slate-600">
          <DatosTable>
            <CampoRow label="NIT / CC" value={documento.nit_tercero} mono />
            <CampoRow label="Nombre / Razón Social" value={documento.nombre_tercero} />
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

        {/* Objeto del contrato (del RP) */}
        {rp.objeto && (
          <Seccion titulo="Objeto del Contrato / Compromiso" color="bg-slate-500">
            <div className="px-3 py-2 text-sm text-slate-700">{rp.objeto}</div>
          </Seccion>
        )}

        {/* Estado de pagos */}
        <Seccion titulo="Estado de Pagos" color="bg-emerald-700">
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="px-3 py-1.5 font-semibold text-slate-600 uppercase">Valor Obligado</td>
                <td className="px-3 py-1.5 text-right font-mono font-bold">{formatCOP(documento.valor)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">− Pagado</td>
                <td className="px-3 py-1.5 text-right font-mono text-emerald-700">({formatCOP(pagado)})</td>
              </tr>
              <tr className="border-b-2 border-slate-700 bg-orange-50">
                <td className="px-3 py-1.5 font-bold text-orange-800 uppercase">Saldo por Pagar</td>
                <td className="px-3 py-1.5 text-right font-mono font-bold text-orange-800">{formatCOP(saldo_obligacion)}</td>
              </tr>
            </tbody>
          </table>
        </Seccion>

        {/* Pagos vinculados */}
        {pagos_vinculados.length > 0 && (
          <Seccion titulo={`Pagos Realizados (${pagos_vinculados.length})`} color="bg-emerald-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["N° Pago", "Fecha", "Medio de Pago", "Comprobante", "Valor", "Estado"].map((h) => (
                    <th key={h} className="px-3 py-1.5 text-left font-semibold text-slate-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagos_vinculados.map((p) => (
                  <tr key={p.numero} className="border-b border-slate-100">
                    <td className="px-3 py-1.5 font-mono font-bold">{p.numero}</td>
                    <td className="px-3 py-1.5">{formatDate(p.fecha)}</td>
                    <td className="px-3 py-1.5">{p.medio_pago}</td>
                    <td className="px-3 py-1.5">{p.no_comprobante || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatCOP(p.valor)}</td>
                    <td className="px-3 py-1.5">{p.estado}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50 font-bold border-t-2 border-emerald-300">
                  <td colSpan={4} className="px-3 py-1.5 text-right text-emerald-800">TOTAL PAGADO</td>
                  <td className="px-3 py-1.5 text-right font-mono text-emerald-800">{formatCOP(pagado)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </Seccion>
        )}

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
