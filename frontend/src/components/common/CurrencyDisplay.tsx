import { formatCOP } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  className?: string;
}

export function CurrencyDisplay({ value, className }: Props) {
  return (
    <span
      className={cn(
        "tabular-nums",
        value < 0 ? "text-red-600" : "",
        className,
      )}
    >
      {formatCOP(value)}
    </span>
  );
}
