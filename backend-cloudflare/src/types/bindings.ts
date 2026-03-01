/**
 * Tipos de bindings de Cloudflare Workers
 */

export interface Env {
  // D1 Database (solo en Cloudflare Workers)
  DB?: D1Database;

  // Secrets
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  SECRET_KEY?: string;

  // Variables
  ENVIRONMENT: string;
  CORS_ORIGINS: string;
}

export interface Variables {
  userId: string;
  tenantId: string;
  userRole: string;
}
