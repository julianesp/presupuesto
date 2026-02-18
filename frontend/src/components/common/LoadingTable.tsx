import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  rows?: number;
  cols?: number;
}

export function LoadingTable({ rows = 5, cols = 5 }: Props) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
