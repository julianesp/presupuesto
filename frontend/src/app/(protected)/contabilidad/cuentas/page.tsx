"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { contabilidadApi, type CuentaContable } from "@/lib/api/contabilidad";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { CargaExcel } from "@/components/contabilidad/CargaExcel";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const NIVELES = ["", "Clase", "Grupo", "Cuenta", "Subcuenta"];

function CuentaForm({
  inicial,
  onGuardar,
  onCerrar,
}: {
  inicial?: CuentaContable;
  onGuardar: (d: { codigo: string; nombre: string; naturaleza?: "D" | "C"; requiereTercero: boolean; activa: boolean }) => Promise<void>;
  onCerrar: () => void;
}) {
  const [codigo, setCodigo] = useState(inicial?.codigo ?? "");
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [naturaleza, setNaturaleza] = useState<string>(inicial?.naturaleza ?? "auto");
  const [requiereTercero, setRequiereTercero] = useState(!!inicial?.requiereTercero);
  const [activa, setActiva] = useState(inicial ? !!inicial.activa : true);
  const [guardando, setGuardando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await onGuardar({
        codigo,
        nombre,
        naturaleza: naturaleza === "auto" ? undefined : (naturaleza as "D" | "C"),
        requiereTercero,
        activa,
      });
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!inicial && (
        <div className="space-y-1">
          <Label>Código *</Label>
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} required placeholder="Ej. 11100501" />
        </div>
      )}
      <div className="space-y-1">
        <Label>Nombre *</Label>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Naturaleza</Label>
        <Select value={naturaleza} onValueChange={setNaturaleza}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {!inicial && <SelectItem value="auto">Automática (hereda de la cuenta madre)</SelectItem>}
            <SelectItem value="D">Débito</SelectItem>
            <SelectItem value="C">Crédito</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={requiereTercero} onChange={(e) => setRequiereTercero(e.target.checked)} />
        Exige tercero en los movimientos
      </label>
      {inicial && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
          Activa
        </label>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

export default function PlanCuentasPage() {
  const { user } = useAuth();
  const permisos = usePermissions("configuracion");
  const puedeAdministrar = user?.rol === "ADMIN" || permisos.isSuperAdmin;
  const { toast } = useToast();

  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<CuentaContable | null>(null);
  const [eliminando, setEliminando] = useState<CuentaContable | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCuentas(await contabilidadApi.cuentas());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar el catálogo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return cuentas;
    return cuentas.filter((c) => c.codigo.startsWith(q) || c.nombre.toLowerCase().includes(q));
  }, [cuentas, filtro]);

  const error422 = (e: unknown) =>
    toast({ variant: "destructive", title: e instanceof Error ? e.message : "Error" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Plan de Cuentas</h1>
        <p className="text-sm text-slate-500 mt-1">Catálogo General de Cuentas — Resolución 414 de 2014 (CGN)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CargaExcel
          titulo="1. Catálogo de cuentas"
          descripcion="Cargue el catálogo completo (clases, grupos, cuentas, subcuentas y auxiliares). Las cuentas existentes se actualizan."
          etiquetas={{ cuentas_nuevas: "Cuentas nuevas", cuentas_actualizadas: "Cuentas actualizadas" }}
          onPlantilla={contabilidadApi.plantillaCatalogo}
          onCargar={contabilidadApi.importarCatalogo}
          onCargado={cargar}
          deshabilitado={!puedeAdministrar}
        />
        <CargaExcel
          titulo="2. Saldos iniciales (comprobante de apertura)"
          descripcion="Saldos de las cuentas auxiliares al 1 de enero. Débitos y créditos deben cuadrar."
          etiquetas={{ comprobante_apertura: "Comprobante APERTURA nº", lineas: "Líneas", total_debitos: "Total débitos" }}
          onPlantilla={contabilidadApi.plantillaSaldosIniciales}
          onCargar={contabilidadApi.importarSaldosIniciales}
          deshabilitado={cuentas.length === 0}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por código o nombre..."
          className="max-w-sm"
        />
        {puedeAdministrar && (
          <Button onClick={() => setCreando(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nueva cuenta
          </Button>
        )}
      </div>

      {loading && <LoadingTable rows={8} cols={5} />}
      {!loading && error && <ErrorAlert message={error} onRetry={cargar} />}
      {!loading && !error && cuentas.length === 0 && (
        <EmptyState message="Aún no hay catálogo de cuentas. Descargue la plantilla y cárguelo." />
      )}

      {!loading && !error && cuentas.length > 0 && (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-36">Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-24">Nivel</TableHead>
                <TableHead className="w-24">Naturaleza</TableHead>
                <TableHead className="w-28">Tercero</TableHead>
                {puedeAdministrar && <TableHead className="w-24 text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((c) => (
                <TableRow key={c.codigo} className={c.esAuxiliar ? "" : "bg-slate-50 font-semibold"}>
                  <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                  <TableCell style={{ paddingLeft: `${(c.nivel - 1) * 14 + 16}px` }}>
                    <span className={c.activa ? "" : "text-slate-400 line-through"}>{c.nombre}</span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {c.esAuxiliar ? "Auxiliar" : NIVELES[c.nivel] ?? "Auxiliar"}
                  </TableCell>
                  <TableCell className="text-xs">{c.naturaleza === "D" ? "Débito" : "Crédito"}</TableCell>
                  <TableCell className="text-xs">{c.requiereTercero ? "Exige" : ""}</TableCell>
                  {puedeAdministrar && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditando(c)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {c.esAuxiliar === 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => setEliminando(c)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={creando} onOpenChange={setCreando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva cuenta</DialogTitle>
          </DialogHeader>
          <CuentaForm
            onCerrar={() => setCreando(false)}
            onGuardar={async (d) => {
              try {
                await contabilidadApi.crearCuenta(d);
                toast({ title: `Cuenta ${d.codigo} creada` });
                await cargar();
              } catch (e) {
                error422(e);
                throw e;
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cuenta {editando?.codigo}</DialogTitle>
          </DialogHeader>
          {editando && (
            <CuentaForm
              inicial={editando}
              onCerrar={() => setEditando(null)}
              onGuardar={async (d) => {
                try {
                  await contabilidadApi.actualizarCuenta(editando.codigo, {
                    nombre: d.nombre,
                    naturaleza: d.naturaleza,
                    requiereTercero: d.requiereTercero,
                    activa: d.activa,
                  });
                  toast({ title: "Cuenta actualizada" });
                  await cargar();
                } catch (e) {
                  error422(e);
                  throw e;
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!eliminando}
        title={`¿Eliminar la cuenta ${eliminando?.codigo}?`}
        description="Solo se puede eliminar si no tiene movimientos. Si ya los tiene, puede inactivarla."
        onConfirm={async () => {
          if (!eliminando) return;
          try {
            await contabilidadApi.eliminarCuenta(eliminando.codigo);
            toast({ title: "Cuenta eliminada" });
            await cargar();
          } catch (e) {
            error422(e);
          } finally {
            setEliminando(null);
          }
        }}
        onCancel={() => setEliminando(null)}
      />
    </div>
  );
}
