import Link from "next/link";
import { BarChart2, TrendingUp, GitBranch, FileSearch } from "lucide-react";

const cards = [
  {
    href: "/informes/ejecucion-gastos",
    title: "Ejecución de Gastos",
    desc: "Informe detallado de ejecución presupuestal de gastos",
    icon: BarChart2,
  },
  {
    href: "/informes/ejecucion-ingresos",
    title: "Ejecución de Ingresos",
    desc: "Informe de recaudo por rubro de ingreso",
    icon: TrendingUp,
  },
  {
    href: "/informes/cadena-presupuestal",
    title: "Cadena Presupuestal",
    desc: "Trazabilidad CDP → RP → Obligación → Pago",
    icon: GitBranch,
  },
  {
    href: "/informes/tarjeta",
    title: "Tarjeta de Rubro",
    desc: "Movimientos detallados por rubro de gasto",
    icon: FileSearch,
  },
];

export default function InformesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Informes</h1>
      <div className="grid grid-cols-2 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="flex gap-4 items-start p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm transition-all"
            >
              <div className="rounded-lg bg-slate-100 p-3 shrink-0">
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{c.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">{c.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
