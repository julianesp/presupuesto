"use client";
import { useState } from "react";
import { informesApi } from "@/lib/api/informes";
import type { TarjetaResponse } from "@/lib/types/informes";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { formatDate } from "@/lib/utils/dates";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchIcon } from "lucide-react";

export default function TarjetaRubroPage() {
  const [codigo, setCodigo] = useState("");
  const [data, setData] = useState<TarjetaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuscar() {
    if (!codigo.trim()) return;
    setLoading(true);
    setError(null);
    try { setData(await informesApi.tarjetaRubro(codigo.trim())); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Rubro no encontrado"); setData(null); }
    finally { setLoading(false); }
  }

  const totales = data?.movimientos.reduce(
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
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Tarjeta de Rubro</h1>
      <div className="flex gap-3 mb-6 items-end">
        <div className="space-y-1.5">
          <Label>Código de Rubro</Label>
          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej: 2.1.1"
            className="w-40"
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
          />
        </div>
        <Button onClick={handleBuscar} disabled={loading || !codigo.trim()}>
          <SearchIcon className="h-4 w-4 mr-2" />
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>
      {error && <ErrorAlert message={error} />}
      {data && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700">
              {(data.rubro as Record<string, unknown>).codigo as string} — {(data.rubro as Record<string, unknown>).cuenta as string}
            </p>
          </div>
          {data.movimientos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sin movimientos</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {["Fecha", "Tipo", "N°", "NIT", "Tercero", "Concepto", "CDP", "RP", "Obligación", "Pago"].map((h) => (
                      <TableHead key={h} className="text-xs uppercase tracking-wide text-slate-700">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.movimientos.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(m.fecha)}</TableCell>
                      <TableCell className="text-sm">{m.tipo}</TableCell>
                      <TableCell className="font-mono">{m.numero}</TableCell>
                      <TableCell className="font-mono text-xs">{m.nit}</TableCell>
                      <TableCell className="text-sm">{m.tercero}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{m.concepto}</TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={m.v_cdp} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={m.v_rp} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={m.v_obl} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={m.v_pago} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {totales && (
                  <TableFooter>
                    <TableRow className="font-semibold bg-slate-50">
                      <TableCell colSpan={6}>TOTALES</TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={totales.v_cdp} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={totales.v_rp} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={totales.v_obl} /></TableCell>
                      <TableCell className="text-right"><CurrencyDisplay value={totales.v_pago} /></TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
