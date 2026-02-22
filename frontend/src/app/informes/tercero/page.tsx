"use client";
import { useEffect, useState, useCallback } from "react";
import { informesApi } from "@/lib/api/informes";
import type { InformeTerceroResponse } from "@/lib/types/informes";
import { tercerosApi } from "@/lib/api/terceros";
import type { Tercero } from "@/lib/types/tercero";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { LoadingTable } from "@/components/common/LoadingTable";
import { EmptyState } from "@/components/common/EmptyState";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { MesSelector } from "@/components/common/MesSelector";
import { formatDate, mesNombre } from "@/lib/utils/dates";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchIcon, PrinterIcon } from "lucide-react";

function SeccionDoc({ titulo, color, children }: { titulo: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className={`text-xs font-bold text-white uppercase tracking-widest px-3 py-1.5 rounded-t ${color}`}>
        {titulo}
      </div>
      <div className="border border-t-0 border-slate-200 rounded-b overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function InformeTerceroPage() {
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [nit, setNit] = useState("");
  const [mesInicio, setMesInicio] = useState("1");
  const [mesFin, setMesFin] = useState("12");
  const [data, setData] = useState<InformeTerceroResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tercerosApi.getAll().then(setTerceros).catch(() => {});
  }, []);

  const buscar = useCallback(async () => {
    if (!nit) return;
    setLoading(true);
    setError(null);
    try {
      setData(await informesApi.informeTercero(nit, parseInt(mesInicio), parseInt(mesFin)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tercero no encontrado");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [nit, mesInicio, mesFin]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Informe por Tercero</h1>
          <p className="text-sm text-slate-500 mt-1">Todos los documentos de un proveedor en el período</p>
        </div>
        {data && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <PrinterIcon className="h-4 w-4 mr-1" />Imprimir
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div className="space-y-1.5 flex-1 min-w-[200px] max-w-md">
          <Label>Tercero / Proveedor</Label>
          <Select value={nit} onValueChange={setNit}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tercero..." />
            </SelectTrigger>
            <SelectContent>
              {terceros.map((t) => (
                <SelectItem key={t.nit} value={t.nit}>
                  {t.nombre} — <span className="font-mono text-xs">{t.nit}</span>
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
        <Button onClick={buscar} disabled={loading || !nit}>
          <SearchIcon className="h-4 w-4 mr-2" />
          {loading ? "Consultando..." : "Consultar"}
        </Button>
      </div>

      {error && <ErrorAlert message={error} />}
      {loading && <LoadingTable rows={6} cols={5} />}

      {data && !loading && (
        <>
          {/* Encabezado */}
          <div className="mb-4 rounded-lg bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-lg">{data.tercero.nombre}</span>
              <span className="ml-3 font-mono text-sm text-slate-300">NIT: {data.tercero.nit}</span>
            </div>
            <span className="text-xs text-slate-400">
              {mesNombre(data.mes_inicio)} — {mesNombre(data.mes_fin)}
            </span>
          </div>

          {/* Totales */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center">
              <p className="text-xs text-violet-600 uppercase font-semibold">Total RP</p>
              <p className="text-lg font-semibold text-violet-900 mt-1"><CurrencyDisplay value={data.total_rp} /></p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
              <p className="text-xs text-amber-600 uppercase font-semibold">Total Obligaciones</p>
              <p className="text-lg font-semibold text-amber-900 mt-1"><CurrencyDisplay value={data.total_obl} /></p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-xs text-emerald-600 uppercase font-semibold">Total Pagado</p>
              <p className="text-lg font-semibold text-emerald-900 mt-1"><CurrencyDisplay value={data.total_pagos} /></p>
            </div>
          </div>

          {/* Registros Presupuestales */}
          {data.rps.length > 0 && (
            <SeccionDoc titulo={`Registros Presupuestales (${data.rps.length})`} color="bg-violet-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {["N° RP", "Fecha", "Rubro", "Objeto", "Valor", "Estado"].map((h) => (
                      <TableHead key={h} className="text-xs uppercase text-slate-600">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rps.map((r) => (
                    <TableRow key={r.numero} className="text-sm">
                      <TableCell className="font-mono">{r.numero}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(r.fecha)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.codigo_rubro}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs">{r.objeto}</TableCell>
                      <TableCell className="text-right font-mono text-xs"><CurrencyDisplay value={r.valor} /></TableCell>
                      <TableCell>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">{r.estado}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold bg-slate-50">
                    <TableCell colSpan={4}>TOTAL RP</TableCell>
                    <TableCell className="text-right"><CurrencyDisplay value={data.total_rp} /></TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </SeccionDoc>
          )}

          {/* Obligaciones */}
          {data.obligaciones.length > 0 && (
            <SeccionDoc titulo={`Obligaciones (${data.obligaciones.length})`} color="bg-amber-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {["N° Obl.", "Fecha", "Rubro", "RP N°", "Factura/Ref.", "Valor", "Estado"].map((h) => (
                      <TableHead key={h} className="text-xs uppercase text-slate-600">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.obligaciones.map((o) => (
                    <TableRow key={o.numero} className="text-sm">
                      <TableCell className="font-mono">{o.numero}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(o.fecha)}</TableCell>
                      <TableCell className="font-mono text-xs">{o.codigo_rubro}</TableCell>
                      <TableCell className="font-mono">{o.rp_numero}</TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate">{o.factura || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs"><CurrencyDisplay value={o.valor} /></TableCell>
                      <TableCell>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{o.estado}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold bg-slate-50">
                    <TableCell colSpan={5}>TOTAL OBLIGACIONES</TableCell>
                    <TableCell className="text-right"><CurrencyDisplay value={data.total_obl} /></TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </SeccionDoc>
          )}

          {/* Pagos */}
          {data.pagos.length > 0 && (
            <SeccionDoc titulo={`Pagos (${data.pagos.length})`} color="bg-emerald-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {["N° Pago", "Fecha", "Rubro", "Obl. N°", "Concepto", "Medio", "Valor"].map((h) => (
                      <TableHead key={h} className="text-xs uppercase text-slate-600">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pagos.map((p) => (
                    <TableRow key={p.numero} className="text-sm">
                      <TableCell className="font-mono">{p.numero}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(p.fecha)}</TableCell>
                      <TableCell className="font-mono text-xs">{p.codigo_rubro}</TableCell>
                      <TableCell className="font-mono">{p.obligacion_numero}</TableCell>
                      <TableCell className="text-xs max-w-[160px] truncate">{p.concepto}</TableCell>
                      <TableCell className="text-xs">{p.medio_pago}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-emerald-700">
                        <CurrencyDisplay value={p.valor} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold bg-slate-50">
                    <TableCell colSpan={6}>TOTAL PAGOS</TableCell>
                    <TableCell className="text-right"><CurrencyDisplay value={data.total_pagos} /></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </SeccionDoc>
          )}

          {data.rps.length === 0 && data.obligaciones.length === 0 && data.pagos.length === 0 && (
            <EmptyState message="Sin movimientos para este tercero en el período seleccionado" />
          )}
        </>
      )}

      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <SearchIcon className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Seleccione un tercero y un rango de meses para consultar</p>
        </div>
      )}
    </div>
  );
}
