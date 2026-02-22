"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.rol !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || user?.rol !== "ADMIN") return null;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Panel de Administración"
        description={`Gestión de la institución: ${user.tenant.nombre}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/usuarios">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Users className="h-5 w-5 text-slate-600" />
              <CardTitle className="text-base">Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Crear, editar y desactivar usuarios de la institución.
                Asignar roles: ADMIN, TESORERO, CONSULTA.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="opacity-50 cursor-not-allowed">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Shield className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-base text-slate-400">
              Suscripción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Gestión de plan y pagos. Disponible en Fase 4.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
