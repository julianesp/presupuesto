import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
