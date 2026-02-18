"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import type { RubroGasto, RubroGastoCreate } from "@/lib/types/rubros";

interface Props {
  open: boolean;
  rubro?: RubroGasto | null;
  onSave: (data: RubroGastoCreate) => Promise<void>;
  onClose: () => void;
}

export function RubroGastoForm({ open, rubro, onSave, onClose }: Props) {
  const [codigo, setCodigo] = useState(rubro?.codigo ?? "");
  const [cuenta, setCuenta] = useState(rubro?.cuenta ?? "");
  const [apropiacionInicial, setApropiacionInicial] = useState(
    rubro?.apropiacion_inicial ?? 0,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ codigo, cuenta, apropiacion_inicial: apropiacionInicial });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {rubro ? "Editar Rubro" : "Nuevo Rubro de Gasto"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Código</Label>
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              disabled={!!rubro}
              placeholder="Ej: 2.1.1"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nombre de la Cuenta</Label>
            <Input
              value={cuenta}
              onChange={(e) => setCuenta(e.target.value)}
              placeholder="Nombre del rubro"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Apropiación Inicial</Label>
            <CurrencyInput value={apropiacionInicial} onChange={setApropiacionInicial} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
