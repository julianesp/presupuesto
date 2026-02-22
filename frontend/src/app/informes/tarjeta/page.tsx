"use client";
import { useEffect, useState, useCallback } from "react";
import { informesApi } from "@/lib/api/informes";
import { rubrosGastosApi } from "@/lib/api/rubros";
import type { ResumenRubro, TarjetaMovimiento } from "@/lib/types/informes";
import type { RubroGasto } from "@/lib/types/rubros";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { LoadingTable } from "@/components/common/LoadingTable";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { MesSelector } from "@/components/common/MesSelector";
import { formatDate, mesNombre } from "@/lib/utils/dates";
import { rubroIndentClass } from "@/lib/utils/rubro-level";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchIcon } from "lucide-react";

// ── Fila de la tarjeta de resumen ─────────────────────────────────────────────

function FilaResumen({
  label, valor, highlight = false, subTotal = false, indent = false,
}: {
  label: string;
  valor: number;
  highlight?: boolean;
  subTotal?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-center py-1 px-2 rounded text-sm ${
        highlight
          ? "bg-blue-600 text-white font-bold"
          : subTotal
          ? "bg-slate-100 font-semibold text-slate-800"
          : "text-slate-700"
      } ${indent ? "pl-5" : ""}`}
    >
      <span>{label}</span>
      <span className="font-mono text-right min-w-[120px]">
        <CurrencyDisplay value={valor} />
      </span>
    </div>
  );
}

// ── Sección con título ────────────────────────────────────────────────────────

function Seccion({ titulo, color, children }: {
  titulo: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className={`text-xs font-bold text-white uppercase tracking-widest px-2 py-1 rounded-t ${color}`}>
        {titulo}
      </div>
      <div className="border border-t-0 border-slate-200 rounded-b p-1 space-y-0.5">
        {children}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function TarjetaCCPETPage() {
  const [rubros, setRubros] = useState<RubroGasto[]>([]);
  const [codigo, setCodigo] = useState("");
  const [mesInicio, setMesInicio] = useState("1");
  const [mesFin, setMesFin] = useState("12");
  const [data, setData] = useState<ResumenRubro | null>(null);
  const [movimientos, setMovimientos] = useState<TarjetaMovimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar rubros al montar
  useEffect(() => {
    rubrosGastosApi.getAll().then(setRubros).catch(() => {});
  }, []);

  const buscar = useCallback(async () => {
    if (!codigo) return;
    setLoading(true);
    setError(null);
    try {
      const [resumen, tarjeta] = await Promise.all([
        informesApi.resumenRubro(codigo, parseInt(mesInicio), parseInt(mesFin)),
        informesApi.tarjetaRubro(codigo),
      ]);
      setData(resumen);
      setMovimientos(tarjeta.movimientos);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Rubro no encontrado");
      setData(null);
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  }, [codigo, mesInicio, mesFin]);

  const totales = movimientos.reduce(
    (acc, m) => ({
      v_cdp: acc.v_cdp + m.v_cdp,
      v_rp: acc.v_rp + m.v_rp,
      v_obl: acc.v_obl + m.v_obl,
      v_pago: acc.v_pago + m.v_pago,
    }),
    { v_cdp: 0, v_rp: 0, v_obl: 0, v_pago: 0 },
  );

  return (
    <div>
      {/* ── Barra de selección ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div className="space-y-1.5 flex-1 min-w-[200px] max-w-md">
          <Label>Rubro / Cuenta</Label>
          <Select value={codigo} onValueChange={setCodigo}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar rubro..." />
            </SelectTrigger>
            <SelectContent>
              {rubros.map((r) => (
                <SelectItem key={r.codigo} value={r.codigo}>
                  <span className={rubroIndentClass(r.codigo)}>
                    {r.codigo} — {r.cuenta}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Mes Inicial</Label>
          <MesSelector value={mesInicio} onChange={setMesInicio} label="Enero" />
        </div>
        <div className="space-y-1.5">
          <Label>Mes Final</Label>
          <MesSelector value={mesFin} onChange={setMesFin} label="Diciembre" />
        </div>
        <Button onClick={buscar} disabled={loading || !codigo}>
          <SearchIcon className="h-4 w-4 mr-2" />
          {loading ? "Consultando..." : "Consultar"}
        </Button>
      </div>

      {error && <ErrorAlert message={error} />}
      {loading && <LoadingTable rows={6} cols={4} />}

      {/* ── Panel CCPET ─────────────────────────────────────────── */}
      {data && !loading && (
        <>
          {/* Encabezado del rubro */}
          <div className="mb-4 rounded-lg bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-mono text-sm text-slate-300 mr-3">{data.rubro.codigo}</span>
              <span className="font-semibold">{data.rubro.cuenta}</span>
            </div>
            <span className="text-xs text-slate-400">
              Período: {mesNombre(parseInt(mesInicio))} — {mesNombre(parseInt(mesFin))}
            </span>
          </div>

          {/* Dos columnas: Apropiación/Disponibilidades | Compromisos/Obligaciones/Pagos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

            {/* ── Columna izquierda ─────────────────────────────── */}
            <div>
              <Seccion titulo="Apropiación" color="bg-slate-700">
                <FilaResumen label="Apropiación Inicial" valor={data.apropiacion_inicial} />
                <FilaResumen label="Adiciones" valor={data.adiciones} indent />
                <FilaResumen label="Reducciones" valor={data.reducciones} indent />
                <FilaResumen label="Créditos" valor={data.creditos} indent />
                <FilaResumen label="Contra Créditos" valor={data.contracreditos} indent />
                <FilaResumen label="Apropiación Definitiva" valor={data.apropiacion_definitiva} subTotal />
              </Seccion>

              <Seccion titulo="Disponibilidades (CDP)" color="bg-indigo-700">
                <FilaResumen label="Disponibilidades anteriores" valor={data.disp_anteriores} />
                <FilaResumen label="Disponibilidades período" valor={data.disp_periodo} />
                <FilaResumen label="Total Disponibilidades" valor={data.total_disp} subTotal />
                <FilaResumen label="Saldo Disponible" valor={data.saldo_disponible} highlight />
                <FilaResumen label="Disponibilidades sin compromiso" valor={data.disp_sin_compromiso} indent />
                <FilaResumen label="Apropiación x afectar" valor={data.aprop_x_afectar} indent />
              </Seccion>
            </div>

            {/* ── Columna derecha ───────────────────────────────── */}
            <div>
              <Seccion titulo="Compromisos (RP)" color="bg-violet-700">
                <FilaResumen label="Compromisos anteriores" valor={data.comp_anteriores} />
                <FilaResumen label="Compromisos período" valor={data.comp_periodo} />
                <FilaResumen label="Total Compromisos" valor={data.total_comp} subTotal />
                <FilaResumen label="Compromisos sin obligación" valor={data.comp_sin_obligacion} indent />
              </Seccion>

              <Seccion titulo="Obligaciones" color="bg-amber-700">
                <FilaResumen label="Obligaciones anteriores" valor={data.obl_anteriores} />
                <FilaResumen label="Obligaciones período" valor={data.obl_periodo} />
                <FilaResumen label="Total Obligaciones" valor={data.total_obl} subTotal />
                <FilaResumen label="Obligaciones x pagar" valor={data.obl_x_pagar} indent />
              </Seccion>

              <Seccion titulo="Pagos" color="bg-emerald-700">
                <FilaResumen label="Pagos anteriores" valor={data.pago_anteriores} />
                <FilaResumen label="Pagos período" valor={data.pago_periodo} />
                <FilaResumen label="Total Pagos" valor={data.total_pago} subTotal />
              </Seccion>
            </div>
          </div>

          {/* ── Movimientos ───────────────────────────────────────── */}
          {movimientos.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Movimientos del rubro
              </h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {["Fecha", "Tipo", "N°", "NIT", "Tercero", "Concepto", "CDP", "RP", "Obligación", "Pago"].map((h) => (
                        <TableHead key={h} className="text-xs uppercase tracking-wide text-slate-700 whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.map((m, i) => (
                      <TableRow key={i} className="text-sm">
                        <TableCell className="whitespace-nowrap">{formatDate(m.fecha)}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            m.tipo === "CDP" ? "bg-indigo-100 text-indigo-700"
                            : m.tipo === "RP" ? "bg-violet-100 text-violet-700"
                            : m.tipo === "OBL" ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {m.tipo}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono">{m.numero}</TableCell>
                        <TableCell className="font-mono text-xs">{m.nit}</TableCell>
                        <TableCell className="max-w-[140px] truncate">{m.tercero}</TableCell>
                        <TableCell className="max-w-xs truncate">{m.concepto}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {m.v_cdp > 0 ? <CurrencyDisplay value={m.v_cdp} /> : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {m.v_rp > 0 ? <CurrencyDisplay value={m.v_rp} /> : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {m.v_obl > 0 ? <CurrencyDisplay value={m.v_obl} /> : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {m.v_pago > 0 ? <CurrencyDisplay value={m.v_pago} /> : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-semibold bg-slate-50">
                      <TableCell colSpan={6}>TOTALES</TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={totales.v_cdp} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={totales.v_rp} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={totales.v_obl} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={totales.v_pago} /></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Estado inicial */}
      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <SearchIcon className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Seleccione un rubro y un rango de meses para consultar</p>
        </div>
      )}
    </div>
  );
}
