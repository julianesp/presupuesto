"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { comprobantesApi } from "@/lib/api/comprobantes";
import type { ComprobantePago } from "@/lib/types/comprobante";
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

export default function ComprobantePagoPage() {
  const { numero } = useParams<{ numero: string }>();
  const router = useRouter();
  const [data, setData] = useState<ComprobantePago | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    comprobantesApi
      .pago(parseInt(numero))
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

  const { institucion, documento, tercero, obligacion, rp, cdp, cuenta_bancaria } = data;

  return (
    <>
      <ActionBar onPrint={() => window.print()} onBack={() => router.back()} />
      <PrintWrapper>
        <ComprobanteHeader
          institucion={institucion}
          titulo="Comprobante de Egreso"
          subtitulo="Comprobante de Pago Presupuestal"
          numero={documento.numero}
          fecha={documento.fecha}
          vigencia={institucion.vigencia}
          estado={documento.estado}
        />

        {/* Valor destacado — elemento central del comprobante de egreso */}
        <div className="border-4 border-emerald-700 rounded-lg bg-emerald-50 p-4 mb-5 text-center">
          <p className="text-xs text-emerald-600 uppercase font-semibold tracking-widest mb-1">
            Páguese a: <strong className="text-emerald-900 text-base">{documento.nombre_tercero}</strong>
          </p>
          <p className="text-4xl font-black text-emerald-800 font-mono tracking-tight">
            {formatCOP(documento.valor)}
          </p>
          <p className="text-sm text-emerald-700 font-semibold mt-1 uppercase">
            {documento.valor_letras}
          </p>
        </div>

        {/* Cadena presupuestal */}
        <CadenaPresupuestal items={[
          { label: "CDP", numero: cdp.numero, fecha: cdp.fecha },
          { label: "RP", numero: rp.numero, fecha: rp.fecha },
          { label: "Obligación", numero: obligacion.numero, fecha: obligacion.fecha },
          { label: "Pago", numero: documento.numero, fecha: documento.fecha },
        ]} />

        {/* Datos del pago */}
        <Seccion titulo="Datos del Comprobante de Egreso" color="bg-emerald-700">
          <DatosTable>
            <CampoRow label="N° Egreso" value={documento.numero} mono />
            <CampoRow label="Fecha" value={formatDate(documento.fecha)} />
            <CampoRow label="Obligación N°" value={documento.obligacion_numero} mono />
            <CampoRow label="RP N°" value={documento.rp_numero} mono />
            <CampoRow label="CDP N°" value={documento.cdp_numero} mono />
            <CampoRow label="Código Rubro" value={documento.codigo_rubro} mono />
            <CampoRow label="Nombre Rubro" value={documento.cuenta_rubro} />
            <CampoRow label="Concepto del Pago" value={documento.concepto} />
            <CampoRow label="Medio de Pago" value={
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                {documento.medio_pago}
              </span>
            } />
            {documento.no_comprobante && (
              <CampoRow label="N° Comprobante / Cheque" value={documento.no_comprobante} mono />
            )}
            <CampoRow label="Factura de Referencia" value={obligacion.factura || "—"} />
            <CampoRow label="Estado" value={
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                documento.estado === "ANULADO" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
              }`}>{documento.estado}</span>
            } />
          </DatosTable>
        </Seccion>

        {/* Datos del beneficiario */}
        <Seccion titulo="Datos del Beneficiario" color="bg-slate-600">
          <DatosTable>
            <CampoRow label="NIT / CC" value={documento.nit_tercero} mono />
            <CampoRow label="Nombre / Razón Social" value={documento.nombre_tercero} />
            {tercero?.direccion && <CampoRow label="Dirección" value={tercero.direccion} />}
            {tercero?.telefono && <CampoRow label="Teléfono" value={tercero.telefono} />}
            {tercero?.banco && (
              <CampoRow
                label="Cuenta Destino"
                value={`${tercero.banco} — ${tercero.tipo_cuenta} N° ${tercero.no_cuenta}`}
              />
            )}
          </DatosTable>
        </Seccion>

        {/* Cuenta bancaria emisora */}
        {cuenta_bancaria && (
          <Seccion titulo="Cuenta Bancaria Emisora" color="bg-slate-500">
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

        {/* Objeto de referencia (del RP) */}
        {rp.objeto && (
          <Seccion titulo="Objeto del Compromiso" color="bg-slate-500">
            <div className="px-3 py-2 text-sm text-slate-700">{rp.objeto}</div>
          </Seccion>
        )}

        {/* Nota de recibido (espacio para firma del beneficiario) */}
        <div className="border-2 border-dashed border-slate-400 rounded p-3 mb-4 bg-slate-50">
          <p className="text-xs font-semibold text-slate-600 uppercase mb-4">Recibido a satisfacción:</p>
          <div className="flex items-end gap-8 mt-6">
            <div className="flex-1">
              <div className="border-b-2 border-slate-500 mb-1 h-8" />
              <p className="text-xs text-center text-slate-600">Firma del Beneficiario</p>
            </div>
            <div className="flex-1">
              <div className="border-b-2 border-slate-500 mb-1 h-8" />
              <p className="text-xs text-center text-slate-600">Cédula de Ciudadanía</p>
            </div>
            <div className="w-40">
              <div className="border-b-2 border-slate-500 mb-1 h-8" />
              <p className="text-xs text-center text-slate-600">Fecha de Recibo</p>
            </div>
          </div>
        </div>

        <FirmasBlock
          rector={institucion.rector}
          tesorero={institucion.tesorero}
          tercero={documento.nombre_tercero}
          labelTercero="Beneficiario"
        />

        <Pie vigencia={institucion.vigencia} />
      </PrintWrapper>
    </>
  );
}
