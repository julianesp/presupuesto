/**
 * Servidor Node.js para producción (Render.com)
 * Usa el adaptador de Hono para Node.js
 */

import { serve } from '@hono/node-server';
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

// Middleware para inyectar env en cada request
app.use('*', async (c, next) => {
  // Inyectar env en el contexto
  (c.env as any) = envAdapter;
  await next();
});

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Servidor corriendo en http://localhost:${port}`);
