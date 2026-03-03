"use client";
import { useEffect, useState, useCallback } from "react";
import { rubrosGastosApi } from "@/lib/api/rubros";
import type { RubroGasto, RubroGastoCreate } from "@/lib/types/rubros";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RubrosGastosTree } from "@/components/rubros/RubrosTree";
import { RubroGastoForm } from "@/components/rubros/RubroGastoForm";
import { useToast } from "@/hooks/use-toast";

export default function RubrosGastosPage() {
  const [rubros, setRubros] = useState<RubroGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RubroGasto | null>(null);
  const [deleting, setDeleting] = useState<RubroGasto | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRubros(await rubrosGastosApi.getAll());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: RubroGastoCreate) {
    try {
      if (editing) {
        await rubrosGastosApi.update(editing.codigo, {
          cuenta: data.cuenta,
          apropiacion_inicial: data.apropiacion_inicial,
        });
        toast({ title: "Rubro actualizado" });
      } else {
        await rubrosGastosApi.create(data);
        toast({ title: "Rubro creado" });
      }
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
      throw e;
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await rubrosGastosApi.delete(deleting.codigo);
      toast({ title: "Rubro eliminado" });
      setDeleting(null);
      load();
    } catch (e: unknown) {
      toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });
    } finally {
      setDelLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Rubros de Gastos"
        description="Árbol presupuestal de gastos"
        action={{ label: "Nuevo Rubro", onClick: () => { setEditing(null); setFormOpen(true); } }}
      />
      {loading && <LoadingTable />}
      {error && <ErrorAlert message={error} onRetry={load} />}
      {!loading && !error && rubros.length === 0 && <EmptyState />}
      {!loading && !error && rubros.length > 0 && (
        <RubrosGastosTree
          rubros={rubros}
          onEdit={(r) => { setEditing(r); setFormOpen(true); }}
          onDelete={setDeleting}
        />
      )}
      <RubroGastoForm
        open={formOpen}
        rubro={editing}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={!!deleting}
        title="¿Eliminar rubro?"
        description={`Se eliminará el rubro "${deleting?.cuenta}". Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={delLoading}
      />
    </div>
  );
}
