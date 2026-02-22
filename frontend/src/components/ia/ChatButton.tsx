"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import { iaApi } from "@/lib/api/ia";

export function ChatButton() {
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [alertasCount, setAlertasCount] = useState(0);

  useEffect(() => {
    // Cargar alertas al montar para mostrar badge
    iaApi
      .alertas()
      .then((lista) => {
        const altas = lista.filter((a) => a.urgencia === "ALTA").length;
        setAlertasCount(altas);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setPanelAbierto(true)}
        className="fixed bottom-6 right-6 z-50 bg-violet-600 hover:bg-violet-700 text-white rounded-full p-3 shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400"
        title="Asistente IA"
        aria-label="Abrir asistente IA"
      >
        <Sparkles className="h-6 w-6" />
        {alertasCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {alertasCount > 9 ? "9+" : alertasCount}
          </span>
        )}
      </button>

      {/* Panel deslizable */}
      <ChatPanel
        abierto={panelAbierto}
        onCerrar={() => setPanelAbierto(false)}
      />
    </>
  );
}
