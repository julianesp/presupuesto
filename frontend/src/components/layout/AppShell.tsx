"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  // En pantallas pequeñas el menú es un panel deslizable; en escritorio siempre está visible
  const [menuAbierto, setMenuAbierto] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onAbrirMenu={() => setMenuAbierto(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
