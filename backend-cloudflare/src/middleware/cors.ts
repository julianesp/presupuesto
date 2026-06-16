/**
 * Middleware de CORS
 */

import { cors as honoCors } from 'hono/cors';
import type { Env } from '../types/bindings';

export function cors(env?: Env) {
  // Fallback defensivo: en algunos modos de arranque (p. ej. tsx server.ts)
  // este middleware puede ejecutarse antes de que se inyecte `env`.
  const corsOrigins = env?.CORS_ORIGINS || 'http://localhost:3000';
  const origins = corsOrigins.split(',').map(o => o.trim());

  return honoCors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Dev-Email'],
    credentials: true,
    maxAge: 86400, // 24 horas
  });
}
