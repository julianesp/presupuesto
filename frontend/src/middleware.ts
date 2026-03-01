import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sign-out(.*)",
  "/api/webhooks(.*)",
  "/unauthorized",
]);

export default clerkMiddleware(async (auth, request) => {
  // Si es una ruta pública, permitir acceso
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Proteger rutas privadas - requiere autenticación con Clerk
  await auth.protect();

  // La verificación de autorización (email en la BD) se hace en el backend
  // cuando el frontend hace llamadas a la API
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
