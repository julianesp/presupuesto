"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, type UserCreate, type UserUpdate } from "@/lib/api/admin";
import type { UserInfo } from "@/lib/types/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingTable } from "@/components/common/LoadingTable";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Pencil, UserX } from "lucide-react";

const ROL_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  TESORERO: "bg-blue-100 text-blue-700",
  CONSULTA: "bg-slate-100 text-slate-700",
};

function UsuarioForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: UserInfo;
  onSave: (data: UserCreate | UserUpdate) => Promise<void>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [cargo, setCargo] = useState(initial?.cargo ?? "");
  const [rol, setRol] = useState<"ADMIN" | "TESORERO" | "CONSULTA">(
    initial?.rol ?? "CONSULTA",
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ email, nombre, cargo: cargo || undefined, rol });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initial && (
        <div className="space-y-1">
          <Label>Email *</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="usuario@institucion.edu.co"
          />
        </div>
      )}
      <div className="space-y-1">
        <Label>Nombre completo *</Label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          placeholder="Nombre del usuario"
        />
      </div>
      <div className="space-y-1">
        <Label>Cargo</Label>
        <Input
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          placeholder="Ej: Tesorero General"
        />
      </div>
      <div className="space-y-1">
        <Label>Rol *</Label>
        <Select value={rol} onValueChange={(v) => setRol(v as typeof rol)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">ADMIN - Administrador</SelectItem>
            <SelectItem value="TESORERO">TESORERO - Operaciones</SelectItem>
            <SelectItem value="CONSULTA">CONSULTA - Solo lectura</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : initial ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}

export default function UsuariosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [items, setItems] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserInfo | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && user?.rol !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminApi.getUsuarios());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.rol === "ADMIN") cargar();
  }, [user]);

  async function handleCreate(data: UserCreate | UserUpdate) {
    await adminApi.createUsuario(data as UserCreate);
    toast({ title: "Usuario creado" });
    await cargar();
  }

  async function handleEdit(data: UserCreate | UserUpdate) {
    await adminApi.updateUsuario(editing!.id, data as UserUpdate);
    toast({ title: "Usuario actualizado" });
    await cargar();
  }

  async function handleDesactivar() {
    if (confirmId === null) return;
    try {
      await adminApi.deleteUsuario(confirmId);
      toast({ title: "Usuario desactivado" });
      await cargar();
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error al desactivar",
        variant: "destructive",
      });
    } finally {
      setConfirmId(null);
    }
  }

  if (authLoading || user?.rol !== "ADMIN") return null;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios de la institución"
        action={{ label: "Nuevo usuario", onClick: () => setCreating(true) }}
      />

      {loading && <LoadingTable />}
      {!loading && error && <ErrorAlert message={error} onRetry={cargar} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState message="No hay usuarios registrados" />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{u.cargo ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${ROL_COLORS[u.rol] ?? ""}`}
                    >
                      {u.rol}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(u as UserInfo & { activo?: boolean }).activo === false ? "secondary" : "outline"}>
                      {(u as UserInfo & { activo?: boolean }).activo === false ? "Inactivo" : "Activo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {u.id !== user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => setConfirmId(u.id)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Crear usuario */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
          </DialogHeader>
          <UsuarioForm onSave={handleCreate} onClose={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      {/* Editar usuario */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {editing && (
            <UsuarioForm
              initial={editing}
              onSave={handleEdit}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar desactivar */}
      <ConfirmDialog
        open={confirmId !== null}
        title="¿Desactivar usuario?"
        description="El usuario no podrá acceder al sistema. Puedes reactivarlo editando su estado."
        onConfirm={handleDesactivar}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
