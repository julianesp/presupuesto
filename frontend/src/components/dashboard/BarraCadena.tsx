import { formatCOP } from "@/lib/utils/currency";

interface Props {
  apropiacion: number;
  cdp: number;
  comprometido: number;
  obligado: number;
  pagado: number;
}

function Segmento({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className="tabular-nums">{formatCOP(value)}</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function BarraCadena({
  apropiacion,
  cdp,
  comprometido,
  obligado,
  pagado,
}: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
        Cadena Presupuestal
      </p>
      <Segmento label="CDP" value={cdp} total={apropiacion} color="bg-blue-400" />
      <Segmento label="Comprometido (RP)" value={comprometido} total={apropiacion} color="bg-indigo-400" />
      <Segmento label="Obligado" value={obligado} total={apropiacion} color="bg-violet-400" />
      <Segmento label="Pagado" value={pagado} total={apropiacion} color="bg-purple-500" />
    </div>
  );
}
