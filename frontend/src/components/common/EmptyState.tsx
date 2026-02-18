import { InboxIcon } from "lucide-react";

interface Props {
  message?: string;
}

export function EmptyState({ message = "No hay registros" }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <InboxIcon className="h-12 w-12 mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
