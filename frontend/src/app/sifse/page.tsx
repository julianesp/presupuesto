"use client";
import { useEffect, useState, useCallback } from "react";
import { sifseApi } from "@/lib/api/sifse";
import type { MapeoGasto, MapeoIngreso, SIFSEItem, SIFSEFuente } from "@/lib/types/sifse";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SaveIcon } from "lucide-react";

export default function SifsePage() {
  const [mapeosGastos, setMapeosGastos] = useState<MapeoGasto[]>([]);
  const [mapeosIngresos, setMapeosIngresos] = useState<MapeoIngreso[]>([]);
  const [items, setItems] = useState<SIFSEItem[]>([]);
  const [fuentes, setFuentes] = useState<SIFSEFuente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editGastos, setEditGastos] = useState<Record<string, string>>({});
  const [editIngresos, setEditIngresos] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mg, mi, it, fu] = await Promise.all([
        sifseApi.getMapeosGastos(),
        sifseApi.getMapeosIngresos(),
        sifseApi.getCatalogoItems(),
        sifseApi.getCatalogoFuentes(),
      ]);
      setMapeosGastos(mg);
      setMapeosIngresos(mi);
      setItems(it);
      setFuentes(fu);
      const initG: Record<string, string> = {};
      mg.forEach((m) => { initG[m.codigo_rubro] = String(m.sifse_item); });
      setEditGastos(initG);
      const initI: Record<string, string> = {};
      mi.forEach((m) => { initI[m.codigo_rubro] = String(m.sifse_fuente); });
      setEditIngresos(initI);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveGasto(codigo: string) {
    setSaving(codigo);
    try {
      await sifseApi.setMapeoGasto(codigo, parseInt(editGastos[codigo] ?? "0"));
      toast({ title: "Mapeo SIFSE actualizado" });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setSaving(null); }
  }

  async function saveIngreso(codigo: string) {
    setSaving(codigo);
    try {
      await sifseApi.setMapeoIngreso(codigo, parseInt(editIngresos[codigo] ?? "0"));
      toast({ title: "Mapeo SIFSE actualizado" });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setSaving(null); }
  }

  return (
    <div>
      <PageHeader title="Mapeo SIFSE" description="Configuración de ítems SIFSE para reportes MINEDUCACIÓN" />
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && (
        <Tabs defaultValue="gastos">
          <TabsList className="mb-4">
            <TabsTrigger value="gastos">Gastos</TabsTrigger>
            <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          </TabsList>
          <TabsContent value="gastos">
            {mapeosGastos.length === 0 ? <EmptyState message="No hay rubros hoja de gastos" /> : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs uppercase tracking-wide text-slate-700 w-28">Código</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-slate-700">Cuenta</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-slate-700">Ítem SIFSE</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapeosGastos.map((m) => (
                      <TableRow key={m.codigo_rubro}>
                        <TableCell className="font-mono text-xs">{m.codigo_rubro}</TableCell>
                        <TableCell className="text-sm">{m.cuenta}</TableCell>
                        <TableCell>
                          <Select
                            value={editGastos[m.codigo_rubro] ?? "0"}
                            onValueChange={(v) => setEditGastos((p) => ({ ...p, [m.codigo_rubro]: v }))}
                          >
                            <SelectTrigger className="w-72"><SelectValue placeholder="Sin mapeo" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sin mapeo</SelectItem>
                              {items.map((it) => (
                                <SelectItem key={it.id} value={String(it.id)}>{it.id} — {it.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => saveGasto(m.codigo_rubro)}
                            disabled={saving === m.codigo_rubro}
                          >
                            <SaveIcon className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          <TabsContent value="ingresos">
            {mapeosIngresos.length === 0 ? <EmptyState message="No hay rubros hoja de ingresos" /> : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs uppercase tracking-wide text-slate-700 w-28">Código</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-slate-700">Cuenta</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-slate-700">Fuente SIFSE</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapeosIngresos.map((m) => (
                      <TableRow key={m.codigo_rubro}>
                        <TableCell className="font-mono text-xs">{m.codigo_rubro}</TableCell>
                        <TableCell className="text-sm">{m.cuenta}</TableCell>
                        <TableCell>
                          <Select
                            value={editIngresos[m.codigo_rubro] ?? "0"}
                            onValueChange={(v) => setEditIngresos((p) => ({ ...p, [m.codigo_rubro]: v }))}
                          >
                            <SelectTrigger className="w-72"><SelectValue placeholder="Sin mapeo" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sin mapeo</SelectItem>
                              {fuentes.map((f) => (
                                <SelectItem key={f.id} value={String(f.id)}>{f.id} — {f.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => saveIngreso(m.codigo_rubro)}
                            disabled={saving === m.codigo_rubro}
                          >
                            <SaveIcon className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
