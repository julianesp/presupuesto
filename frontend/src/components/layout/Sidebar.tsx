"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderTree,
  FileText,
  FileMinus,
  CheckSquare,
  CreditCard,
  ArrowDownCircle,
  ClipboardList,
  SlidersHorizontal,
  Calendar,
  BarChart2,
  Users,
  Landmark,
  FileBarChart,
  Settings,
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  HardDriveDownload,
  X,
  BookOpen,
  NotebookPen,
  CalendarCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navGroups = [
  {
    label: "PRESUPUESTAL",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/rubros/gastos", label: "Plan de Gastos", icon: FolderTree },
      { href: "/rubros/ingresos", label: "Plan de Ingresos", icon: FolderTree },
    ],
  },
  {
    label: "EJECUCIÓN GASTOS",
    items: [
      { href: "/cdp", label: "CDP", icon: FileText },
      { href: "/rp", label: "RP", icon: FileMinus },
      { href: "/obligaciones", label: "Obligaciones", icon: CheckSquare },
      { href: "/pagos", label: "Pagos", icon: CreditCard },
    ],
  },
  {
    label: "EJECUCIÓN INGRESOS",
    items: [
      { href: "/reconocimientos", label: "Reconocimientos", icon: ClipboardList },
      { href: "/recaudos", label: "Recaudos", icon: ArrowDownCircle },
    ],
  },
  {
    label: "PRESUPUESTO",
    items: [
      { href: "/modificaciones", label: "Modificaciones", icon: SlidersHorizontal },
      { href: "/pac", label: "PAC", icon: Calendar },
    ],
  },
  {
    label: "CONTABILIDAD",
    items: [
      { href: "/contabilidad/cuentas", label: "Plan de Cuentas", icon: BookOpen },
      { href: "/contabilidad/comprobantes", label: "Comprobantes", icon: NotebookPen },
      { href: "/contabilidad/periodos", label: "Periodos", icon: CalendarCheck },
    ],
  },
  {
    label: "INFORMES",
    items: [
      { href: "/informes", label: "Informes", icon: BarChart2 },
      { href: "/informes/cuentas-por-pagar", label: "Cuentas por Pagar", icon: ClipboardList },
      { href: "/informes/pac-vs-ejecutado", label: "PAC vs Ejecutado", icon: Calendar },
      { href: "/informes/tercero", label: "Informe Tercero", icon: Users },
      { href: "/informes/sia", label: "SIA Contraloría", icon: ShieldAlert },
      { href: "/sifse", label: "SIFSE", icon: FileBarChart },
    ],
  },
  {
    label: "CONFIGURACIÓN",
    items: [
      { href: "/importacion", label: "Cargar Datos", icon: UploadCloud },
      { href: "/backup", label: "Copias de Seguridad", icon: HardDriveDownload },
      { href: "/terceros", label: "Terceros", icon: Users },
      { href: "/cuentas-bancarias", label: "Cuentas Bancarias", icon: Landmark },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

export function Sidebar({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {/* Fondo oscuro detrás del menú en celulares */}
      {abierto && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onCerrar} aria-hidden />}
    <aside
      className={cn(
        "w-64 md:w-60 bg-slate-900 text-slate-100 flex flex-col shrink-0",
        "fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:min-h-screen md:translate-x-0",
        abierto ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="p-4 border-b border-slate-700 flex items-start justify-between gap-2">
        <div className="min-w-0">
        <h2 className="text-sm font-bold text-white tracking-wide">
          Sistema Presupuestal
        </h2>
        <p className="text-xs text-slate-400 mt-0.5 truncate" title={user?.tenant?.nombre}>
          {user?.tenant?.nombre ?? ""}
        </p>
        </div>
        <button onClick={onCerrar} className="md:hidden p-1 text-slate-400 hover:text-white" aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-500 tracking-widest uppercase">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2.5 md:py-2 text-sm transition-colors",
                    active
                      ? "bg-slate-700 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Panel de administración: solo visible para rol ADMIN */}
        {user?.rol === "ADMIN" && (
          <div className="mb-4">
            <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-500 tracking-widest uppercase">
              ADMINISTRACIÓN
            </p>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Panel Admin
            </Link>
          </div>
        )}
      </nav>
    </aside>
    </>
  );
}
