import { CurrencyDisplay } from "@/components/common/CurrencyDisplay";

interface Props {
  equilibrio: number;
}

export function EquilibrioIndicator({ equilibrio }: Props) {
  const ok = equilibrio === 0;
  return (
    <div
      className={`rounded-lg p-4 flex items-center justify-between ${ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
    >
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Equilibrio Presupuestal
        </p>
        <p className="text-lg font-bold mt-1">
          <CurrencyDisplay value={equilibrio} />
        </p>
      </div>
      <div
        className={`text-sm font-semibold px-3 py-1 rounded-full ${ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
      >
        {ok ? "Equilibrado" : "Desequilibrio"}
      </div>
    </div>
  );
}
