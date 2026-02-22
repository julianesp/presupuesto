import { Button } from "@/components/ui/button";
import { PlusIcon, PrinterIcon } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onPrint?: () => void;
}

export function PageHeader({ title, description, action, onPrint }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onPrint && (
          <Button variant="outline" size="sm" onClick={onPrint} className="no-print">
            <PrinterIcon className="h-4 w-4 mr-1" />
            Imprimir
          </Button>
        )}
        {action && (
          <Button onClick={action.onClick} className="no-print">
            <PlusIcon className="h-4 w-4 mr-2" />
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
