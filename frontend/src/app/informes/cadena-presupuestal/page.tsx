"use client";
import { useEffect, useState } from "react";
import { informesApi } from "@/lib/api/informes";
import type { CadenaPresupuestalItem } from "@/lib/types/informes";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";
import { EstadoBadge } from "@/components/common/EstadoBadge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export default function CadenaPresupuestalPage() {
  const [items, setItems] = useState<CadenaPresupuestalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try { setItems(await informesApi.cadenaPresupuestal()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Cadena Presupuestal</h1>
      </div>
      {loading && <LoadingTable rows={5} cols={3} />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <EmptyState message="No hay CDP registrados" />}
      {!loading && !error && items.length > 0 && (
        <Accordion type="multiple" className="space-y-2">
          {items.map((item, idx) => {
            const cdp = item.cdp as Record<string, unknown>;
            return (
              <AccordionItem key={idx} value={String(idx)} className="border border-slate-200 rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-4 text-left w-full">
                    <Badge variant="outline">CDP {cdp.numero as number}</Badge>
                    <span className="font-mono text-xs text-slate-500">{cdp.codigo_rubro as string}</span>
                    <span className="text-sm font-medium truncate max-w-sm flex-1">{cdp.objeto as string}</span>
                    <CurrencyDisplay value={cdp.valor as number} />
                    <EstadoBadge estado={cdp.estado as string} />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 pb-4 pl-4 space-y-3">
                    {item.rps.length === 0 && (
                      <p className="text-sm text-slate-400">Sin registros presupuestales</p>
                    )}
                    {item.rps.map((rp, ri) => {
                      const r = rp as Record<string, unknown>;
                      return (
                        <div key={ri} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                          <div className="flex items-center gap-4 text-sm">
                            <Badge variant="secondary">RP {r.numero as number}</Badge>
                            <span className="text-slate-600 flex-1">{r.nombre_tercero as string || r.nit_tercero as string}</span>
                            <CurrencyDisplay value={r.valor as number} />
                            <EstadoBadge estado={r.estado as string} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
