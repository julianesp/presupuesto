"use client";
/**
 * Página de login - solo se muestra como fallback.
 * En producción, Cloudflare Access intercepta ANTES de llegar aquí.
 * En desarrollo, el middleware no redirige (NEXT_PUBLIC_DEV_MODE=true).
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">
          Sistema Presupuestal
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          El acceso está protegido por Cloudflare Access.
        </p>
        <p className="text-xs text-slate-400">
          Si no fuiste redirigido automáticamente, contacta al administrador de
          tu institución.
        </p>
      </div>
    </div>
  );
}
