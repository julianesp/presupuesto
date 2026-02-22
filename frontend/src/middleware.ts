import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";

  // En desarrollo no se verifica auth (el backend acepta X-Dev-Email)
  if (isDev) return NextResponse.next();

  // En producción: Cloudflare Access ya interceptó la request antes de llegar aquí.
  // Si la cookie CF_Authorization no existe, redirigir al login.
  const cfToken = request.cookies.get("CF_Authorization");
  if (!cfToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Proteger todas las rutas excepto login y assets de Next.js
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
