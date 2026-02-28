"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-red-100">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Acceso No Autorizado
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              Tu cuenta no tiene permisos para acceder a este sistema
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Mail className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Solo usuarios autorizados</p>
                <p>
                  Este sistema está restringido a cuentas específicas autorizadas
                  por la institución.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-600 text-center">
              Si crees que deberías tener acceso, contacta al administrador del sistema.
            </p>

            <Button
              onClick={handleSignOut}
              className="w-full bg-slate-700 hover:bg-slate-800"
              size="lg"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión e Intentar con Otra Cuenta
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Sistema Presupuestal - MINEDUCACIÓN SIFSE
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
