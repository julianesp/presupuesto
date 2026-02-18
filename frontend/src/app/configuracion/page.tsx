"use client";
import { useEffect, useState } from "react";
import { configApi } from "@/lib/api/config";
import type { Config, ConfigUpdate } from "@/lib/types/config";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [consolidando, setConsolidando] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState<ConfigUpdate>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const c = await configApi.get();
      setConfig(c);
      setForm({
        vigencia: c.vigencia,
        institucion: c.institucion,
        nit_institucion: c.nit_institucion,
        rector: c.rector,
        tesorero: c.tesorero,
        codigo_dane: c.codigo_dane,
      });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function set(field: keyof ConfigUpdate, val: string) {
    setForm((p) => ({ ...p, [field]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await configApi.update(form);
      toast({ title: "Configuración guardada" });
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setSaving(false); }
  }

  async function handleConsolidar() {
    setConsolidando(true);
    try {
      const res = await configApi.consolidarMes();
      toast({ title: `Mes ${res.mes} consolidado — ${res.rubros_consolidados} rubros` });
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setConsolidando(false); }
  }

  async function handleCierreMes() {
    setConsolidando(true);
    try {
      const res = await configApi.cierreMes();
      toast({ title: `Mes ${res.mes_cerrado} cerrado. Ahora en el siguiente período.` });
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally { setConsolidando(false); }
  }

  if (loading) return <LoadingTable rows={6} cols={2} />;
  if (error) return <ErrorAlert message={error} onRetry={load} />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la Institución</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Vigencia</Label>
                <Input value={form.vigencia ?? ""} onChange={(e) => set("vigencia", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>NIT Institución</Label>
                <Input value={form.nit_institucion ?? ""} onChange={(e) => set("nit_institucion", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nombre de la Institución</Label>
              <Input value={form.institucion ?? ""} onChange={(e) => set("institucion", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rector</Label>
                <Input value={form.rector ?? ""} onChange={(e) => set("rector", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tesorero</Label>
                <Input value={form.tesorero ?? ""} onChange={(e) => set("tesorero", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Código DANE</Label>
              <Input value={form.codigo_dane ?? ""} onChange={(e) => set("codigo_dane", e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Período Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Mes actual del sistema: <strong className="text-slate-900">{config?.mes_actual}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consolidación Mensual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            La consolidación registra los acumulados del período actual. El cierre de mes avanza al siguiente período.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleConsolidar}
              disabled={consolidando}
            >
              {consolidando ? "Procesando..." : "Consolidar gastos"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCierreMes}
              disabled={consolidando}
            >
              {consolidando ? "Procesando..." : "Cerrar mes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
