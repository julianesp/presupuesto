/**
 * Servidor Node.js para producción (Render.com)
 * Usa el adaptador de Hono para Node.js
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import app from './src/index';
import type { Env } from './src/types/bindings';

const port = parseInt(process.env.PORT || '8080');

console.log(`🚀 Servidor iniciando en puerto ${port}...`);
console.log(`📦 Entorno: ${process.env.ENVIRONMENT || 'development'}`);
console.log(`🔗 CORS Origins: ${process.env.CORS_ORIGINS || 'not set'}`);

// Adaptador de variables de entorno de Node.js a formato Cloudflare Workers
const envAdapter: Env = {
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
  ENVIRONMENT: process.env.ENVIRONMENT || 'production',
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3000',
};

// App raíz que inyecta `env` ANTES de delegar en la app principal.
// Importante: el inyector debe correr antes que los middlewares de `app`
// (logger, CORS, auth), que dependen de `c.env`.
const root = new Hono();

root.use('*', async (c, next) => {
  (c.env as any) = envAdapter;
  await next();
});

root.route('/', app);

serve({
  fetch: root.fetch,
  port,
});

console.log(`✅ Servidor corriendo en http://localhost:${port}`);
