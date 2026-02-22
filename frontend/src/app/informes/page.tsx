import Link from "next/link";
import { BarChart2, TrendingUp, GitBranch, FileSearch, ShieldAlert, AlertCircle, Calendar, Users } from "lucide-react";

const cards = [
  {
    href: "/informes/ejecucion-gastos",
    title: "Ejecución de Gastos",
    desc: "Informe detallado de ejecución presupuestal de gastos",
    icon: BarChart2,
    color: "bg-blue-50 text-blue-700",
  },
  {
    href: "/informes/ejecucion-ingresos",
    title: "Ejecución de Ingresos",
    desc: "Informe de recaudo por rubro de ingreso",
    icon: TrendingUp,
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    href: "/informes/cadena-presupuestal",
    title: "Cadena Presupuestal",
    desc: "Trazabilidad CDP → RP → Obligación → Pago",
    icon: GitBranch,
    color: "bg-violet-50 text-violet-700",
  },
  {
    href: "/informes/tarjeta",
    title: "Tarjeta de Rubro (CCPET)",
    desc: "Movimientos y resumen de apropiación, compromisos, obligaciones y pagos por rubro",
    icon: FileSearch,
    color: "bg-amber-50 text-amber-700",
  },
  {
    href: "/informes/cuentas-por-pagar",
    title: "Cuentas por Pagar",
    desc: "Obligaciones activas con saldo pendiente de pago, agrupadas por tercero",
    icon: AlertCircle,
    color: "bg-orange-50 text-orange-700",
  },
  {
    href: "/informes/pac-vs-ejecutado",
    title: "PAC vs Ejecutado",
    desc: "Comparativo del Plan Anual de Caja programado vs pagos reales por mes y rubro",
    icon: Calendar,
    color: "bg-cyan-50 text-cyan-700",
  },
  {
    href: "/informes/tercero",
    title: "Informe por Tercero",
    desc: "Todos los documentos (RPs, Obligaciones, Pagos) de un proveedor en el período",
    icon: Users,
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    href: "/informes/sia",
    title: "SIA — Contraloría",
    desc: "Ejecución presupuestal en formato Sistema de Información y Auditoría · Descarga Excel para radicación",
    icon: ShieldAlert,
    color: "bg-red-50 text-red-700",
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
              <div className={`rounded-lg p-3 shrink-0 ${c.color}`}>
                <Icon className="h-5 w-5" />
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
