"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  value: string;
  onChange: (val: string) => void;
}

const TODOS = "__todos__";

export function FiltroEstado({ value, onChange }: Props) {
  return (
    <Select
      value={value === "" ? TODOS : value}
      onValueChange={(v) => onChange(v === TODOS ? "" : v)}
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>Todos</SelectItem>
        <SelectItem value="Activo">Activos</SelectItem>
        <SelectItem value="Anulado">Anulados</SelectItem>
      </SelectContent>
    </Select>
  );
}
