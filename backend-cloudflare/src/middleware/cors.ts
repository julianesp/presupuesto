/**
 * Middleware de CORS
 */

import { cors as honoCors } from 'hono/cors';
import type { Env } from '../types/bindings';

export function cors(env: Env) {
  const origins = env.CORS_ORIGINS.split(',').map(o => o.trim());

  return honoCors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 horas
  });
}
