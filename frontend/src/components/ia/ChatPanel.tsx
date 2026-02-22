"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  RefreshCw,
  AlertTriangle,
  FileText,
  Upload,
  Copy,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Bell,
  BookOpen,
  ScanText,
} from "lucide-react";
import { iaApi } from "@/lib/api/ia";
import { AlertaIA, DocumentoExtraido, MensajeChat } from "@/lib/types/ia";

type Tab = "chat" | "alertas" | "resumen" | "documento";

interface ChatPanelProps {
  abierto: boolean;
  onCerrar: () => void;
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function TabChat() {
  const [historial, setHistorial] = useState<MensajeChat[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historial, cargando]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || cargando) return;

    const nuevoHistorial: MensajeChat[] = [
      ...historial,
      { rol: "user", contenido: texto },
    ];
    setHistorial(nuevoHistorial);
    setInput("");
    setCargando(true);
    setError(null);

    try {
      const { respuesta } = await iaApi.chat(texto, historial);
      setHistorial([
        ...nuevoHistorial,
        { rol: "model", contenido: respuesta },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al conectar con el asistente";
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {historial.length === 0 && (
          <div className="text-center text-gray-400 mt-8 text-sm">
            <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Pregunta sobre el presupuesto de tu institución.</p>
            <p className="mt-1 text-xs">Ej: ¿Cuánto presupuesto queda disponible?</p>
          </div>
        )}

        {historial.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.rol === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.rol === "user"
                  ? "bg-violet-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.contenido}
            </div>
          </div>
        ))}

        {cargando && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-500 text-center bg-red-50 rounded p-2">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 bg-white">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta... (Enter para enviar)"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <button
            onClick={enviar}
            disabled={!input.trim() || cargando}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg p-2 self-end transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TabAlertas() {
  const [alertas, setAlertas] = useState<AlertaIA[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargadoUnaVez, setCargadoUnaVez] = useState(false);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await iaApi.alertas();
      setAlertas(lista);
      setCargadoUnaVez(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al cargar alertas";
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const colorUrgencia = {
    ALTA: "bg-red-50 border-red-300 text-red-800",
    MEDIA: "bg-amber-50 border-amber-300 text-amber-800",
    BAJA: "bg-blue-50 border-blue-300 text-blue-800",
  };

  const iconUrgencia = {
    ALTA: <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />,
    MEDIA: <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />,
    BAJA: <Bell className="h-4 w-4 text-blue-500 flex-shrink-0" />,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {cargadoUnaVez
            ? `${alertas.length} alerta(s) detectada(s)`
            : "Detecta condiciones de riesgo automáticamente"}
        </span>
        <button
          onClick={cargar}
          disabled={cargando}
          className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${cargando ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cargando && (
          <div className="flex justify-center mt-8">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        )}

        {error && (
          <div className="text-xs text-red-500 bg-red-50 rounded p-2">{error}</div>
        )}

        {!cargando && cargadoUnaVez && alertas.length === 0 && (
          <div className="text-center text-gray-400 mt-8 text-sm">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30 text-green-500" />
            <p>No se detectaron alertas.</p>
            <p className="text-xs mt-1">El presupuesto está dentro de parámetros normales.</p>
          </div>
        )}

        {alertas.map((a, i) => (
          <div
            key={i}
            className={`border rounded-lg p-3 ${colorUrgencia[a.urgencia] || "bg-gray-50 border-gray-200"}`}
          >
            <div className="flex items-start gap-2">
              {iconUrgencia[a.urgencia] || null}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs">{a.titulo}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                      a.urgencia === "ALTA"
                        ? "bg-red-200 text-red-700"
                        : a.urgencia === "MEDIA"
                          ? "bg-amber-200 text-amber-700"
                          : "bg-blue-200 text-blue-700"
                    }`}
                  >
                    {a.urgencia}
                  </span>
                </div>
                <p className="text-xs mt-0.5 leading-relaxed">{a.descripcion}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabResumen() {
  const [texto, setTexto] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generar = async () => {
    setCargando(true);
    setError(null);
    try {
      const { texto: resumen } = await iaApi.resumen();
      setTexto(resumen);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al generar resumen";
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <button
          onClick={generar}
          disabled={cargando}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm rounded-lg py-2 flex items-center justify-center gap-2 transition-colors"
        >
          {cargando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )}
          {cargando ? "Generando..." : "Generar / Actualizar Resumen"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {error && (
          <div className="text-xs text-red-500 bg-red-50 rounded p-2 mb-2">{error}</div>
        )}

        {!texto && !cargando && !error && (
          <div className="text-center text-gray-400 mt-8 text-sm">
            <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Haz clic en &quot;Generar Resumen&quot; para obtener</p>
            <p>un análisis narrativo del presupuesto.</p>
          </div>
        )}

        {cargando && (
          <div className="flex flex-col items-center mt-8 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-2" />
            <p className="text-sm">Analizando presupuesto con IA...</p>
          </div>
        )}

        {texto && (
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border">
            {texto}
          </div>
        )}
      </div>
    </div>
  );
}

function TabDocumento() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [datos, setDatos] = useState<DocumentoExtraido | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const analizar = async (file: File) => {
    setArchivo(file);
    setCargando(true);
    setError(null);
    setDatos(null);
    try {
      const resultado = await iaApi.analizarDocumento(file);
      setDatos(resultado);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al analizar documento";
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) analizar(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analizar(file);
  };

  const copiarDatos = () => {
    if (!datos) return;
    const texto = Object.entries(datos)
      .map(([k, v]) => `${k}: ${v ?? ""}`)
      .join("\n");
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const camposLabel: Record<keyof DocumentoExtraido, string> = {
    nit: "NIT",
    nombre_proveedor: "Proveedor",
    fecha: "Fecha",
    numero_factura: "N° Factura",
    valor_total: "Valor Total",
    concepto: "Concepto",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Zona de carga */}
      <div className="p-3 border-b">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 hover:border-violet-400 rounded-lg p-4 text-center cursor-pointer transition-colors"
        >
          <Upload className="h-6 w-6 mx-auto mb-1 text-gray-400" />
          <p className="text-xs text-gray-500">
            Arrastra o haz clic para subir
          </p>
          <p className="text-xs text-gray-400 mt-0.5">PDF, JPEG, PNG (máx. 10 MB)</p>
          {archivo && (
            <p className="text-xs text-violet-600 mt-1 font-medium truncate">
              {archivo.name}
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Resultados */}
      <div className="flex-1 overflow-y-auto p-3">
        {error && (
          <div className="text-xs text-red-500 bg-red-50 rounded p-2 mb-2">{error}</div>
        )}

        {!datos && !cargando && !error && (
          <div className="text-center text-gray-400 mt-6 text-sm">
            <ScanText className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Sube una factura o contrato para</p>
            <p>extraer datos automáticamente con IA.</p>
          </div>
        )}

        {cargando && (
          <div className="flex flex-col items-center mt-8 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-2" />
            <p className="text-sm">Analizando documento...</p>
          </div>
        )}

        {datos && (
          <div className="space-y-2">
            {(Object.keys(camposLabel) as (keyof DocumentoExtraido)[]).map((campo) => (
              <div key={campo} className="flex flex-col gap-0.5">
                <label className="text-xs text-gray-500 font-medium">
                  {camposLabel[campo]}
                </label>
                <input
                  type="text"
                  value={datos[campo] !== null && datos[campo] !== undefined ? String(datos[campo]) : ""}
                  onChange={(e) =>
                    setDatos({ ...datos, [campo]: e.target.value || null })
                  }
                  className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                  placeholder="No encontrado"
                />
              </div>
            ))}

            <button
              onClick={copiarDatos}
              className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg py-2 flex items-center justify-center gap-1 transition-colors"
            >
              {copiado ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar datos
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Chat", icon: <MessageCircle className="h-4 w-4" /> },
  { id: "alertas", label: "Alertas", icon: <Bell className="h-4 w-4" /> },
  { id: "resumen", label: "Resumen", icon: <BookOpen className="h-4 w-4" /> },
  { id: "documento", label: "Documento", icon: <FileText className="h-4 w-4" /> },
];

export function ChatPanel({ abierto, onCerrar }: ChatPanelProps) {
  const [tabActiva, setTabActiva] = useState<Tab>("chat");

  return (
    <>
      {/* Overlay al hacer click fuera */}
      {abierto && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={onCerrar}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ${
          abierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-full p-1">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <span className="font-semibold text-sm">Asistente IA · Presupuestal</span>
          </div>
          <button
            onClick={onCerrar}
            className="hover:bg-white/20 rounded-full p-1 transition-colors"
            aria-label="Cerrar panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                tabActiva === tab.id
                  ? "text-violet-600 border-b-2 border-violet-600 bg-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido de la tab activa */}
        <div className="flex-1 overflow-hidden">
          {tabActiva === "chat" && <TabChat />}
          {tabActiva === "alertas" && <TabAlertas />}
          {tabActiva === "resumen" && <TabResumen />}
          {tabActiva === "documento" && <TabDocumento />}
        </div>
      </div>
    </>
  );
}
