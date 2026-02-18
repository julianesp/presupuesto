import { Badge } from "@/components/ui/badge";

interface Props {
  estado: string;
}

export function EstadoBadge({ estado }: Props) {
  const isActive = estado === "Activo" || estado === "activo";
  return (
    <Badge variant={isActive ? "default" : "secondary"}>
      {estado}
    </Badge>
  );
}
