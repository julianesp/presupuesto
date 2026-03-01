/**
 * Sistema Presupuestal Backend
 * Cloudflare Workers + Hono + TypeScript + D1
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import type { Env, Variables } from './types/bindings';
import { cors } from './middleware/cors';

// Importar rutas
import rubrosIngresosRoutes from './routes/rubros-ingresos';
import rubrosGastosRoutes from './routes/rubros-gastos';
import tercerosRoutes from './routes/terceros';
import cdpRoutes from './routes/cdp';
import rpRoutes from './routes/rp';
import obligacionesRoutes from './routes/obligaciones';
import pagosRoutes from './routes/pagos';
import recaudosRoutes from './routes/recaudos';
import authRoutes from './routes/auth';
import configRoutes from './routes/config';
import cuentasBancariasRoutes from './routes/cuentas-bancarias';
import adminRoutes from './routes/admin';
import sifseRoutes from './routes/sifse';
import dashboardRoutes from './routes/dashboard';
import informesRoutes from './routes/informes';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================================================
// MIDDLEWARE GLOBAL
// ============================================================================

// Logger
app.use('*', logger());

// Pretty JSON en desarrollo
app.use('*', prettyJSON());

// CORS
app.use('*', async (c, next) => {
  const corsMiddleware = cors(c.env);
  return corsMiddleware(c, next);
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/', (c) => {
  return c.json({
    status: 'ok',
    app: 'Sistema Presupuestal API',
    version: '2.0.0',
    runtime: 'Cloudflare Workers',
    framework: 'Hono + TypeScript',
    database: 'Cloudflare D1',
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy' });
});

// ============================================================================
// RUTAS
// ============================================================================

app.route('/api/auth', authRoutes);
app.route('/api/config', configRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/sifse', sifseRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/informes', informesRoutes);
app.route('/api/rubros-ingresos', rubrosIngresosRoutes);
app.route('/api/rubros-gastos', rubrosGastosRoutes);
app.route('/api/terceros', tercerosRoutes);
app.route('/api/cdp', cdpRoutes);
app.route('/api/rp', rpRoutes);
app.route('/api/obligaciones', obligacionesRoutes);
app.route('/api/pagos', pagosRoutes);
app.route('/api/recaudos', recaudosRoutes);
app.route('/api/cuentas-bancarias', cuentasBancariasRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(
    {
      error: err.message || 'Error interno del servidor',
      ...(c.env.ENVIRONMENT === 'development' && { stack: err.stack }),
    },
    500
  );
});

app.notFound((c) => {
  return c.json({ error: 'Ruta no encontrada' }, 404);
});

export default app;
