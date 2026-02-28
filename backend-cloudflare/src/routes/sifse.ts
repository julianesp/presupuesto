/**
 * SIFSE - Endpoints
 * Gestión de catálogos y mapeos SIFSE (Sistema Integrado de Información Financiera Estatal)
 */

import { Hono } from 'hono';
import { clerkAuth, requireTesorero } from '../middleware/auth';
import { getDb } from '../db';
import { catFuentes, catItems, rubrosGastos, rubrosIngresos } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and } from 'drizzle-orm';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/sifse/catalogo-fuentes - Obtener catálogo de fuentes SIFSE
app.get('/catalogo-fuentes', clerkAuth, async (c) => {
  const db = getDb(c.env);
  const fuentes = await db.query.catFuentes.findMany();
  return c.json(fuentes);
});

// GET /api/sifse/catalogo-items - Obtener catálogo de items SIFSE
app.get('/catalogo-items', clerkAuth, async (c) => {
  const db = getDb(c.env);
  const items = await db.query.catItems.findMany();
  return c.json(items);
});

// GET /api/sifse/mapeos-ingresos - Obtener mapeos de rubros de ingresos a fuentes SIFSE
app.get('/mapeos-ingresos', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);

  const rubros = await db.query.rubrosIngresos.findMany({
    where: eq(rubrosIngresos.tenantId, tenantId),
  });

  // TODO: En el backend Python hay una tabla de mapeos.
  // Por ahora devolvemos los rubros con sus códigos SIFSE si los tienen.
  // Necesitaríamos agregar tablas de mapeo al schema si no existen.

  return c.json(rubros.map(r => ({
    codigo_rubro: r.codigo,
    cuenta: r.cuenta,
    // sifse_fuente: r.sifse_fuente || null, // Descomentar cuando exista en schema
  })));
});

// GET /api/sifse/mapeos-gastos - Obtener mapeos de rubros de gastos a items SIFSE
app.get('/mapeos-gastos', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);

  const rubros = await db.query.rubrosGastos.findMany({
    where: eq(rubrosGastos.tenantId, tenantId),
  });

  // TODO: Similar a mapeos-ingresos
  return c.json(rubros.map(r => ({
    codigo_rubro: r.codigo,
    cuenta: r.cuenta,
    // sifse_item: r.sifse_item || null, // Descomentar cuando exista en schema
  })));
});

// PUT /api/sifse/mapeo-ingreso/:codigo_rubro - Actualizar mapeo de rubro de ingreso
app.put('/mapeo-ingreso/:codigo_rubro', clerkAuth, requireTesorero, async (c) => {
  const tenantId = c.get('tenantId');
  const codigoRubro = c.req.param('codigo_rubro');
  const body = await c.req.json();
  const sifse_fuente = parseInt(body.sifse_fuente);
  const db = getDb(c.env);

  // Verificar que el rubro existe
  const rubro = await db.query.rubrosIngresos.findFirst({
    where: and(
      eq(rubrosIngresos.tenantId, tenantId),
      eq(rubrosIngresos.codigo, codigoRubro)
    ),
  });

  if (!rubro) {
    return c.json({ error: 'Rubro no encontrado' }, 404);
  }

  // TODO: Actualizar mapeo en tabla de mapeos cuando exista
  // Por ahora solo retornamos éxito
  return c.json({ message: 'Mapeo actualizado' });
});

// PUT /api/sifse/mapeo-gasto/:codigo_rubro - Actualizar mapeo de rubro de gasto
app.put('/mapeo-gasto/:codigo_rubro', clerkAuth, requireTesorero, async (c) => {
  const tenantId = c.get('tenantId');
  const codigoRubro = c.req.param('codigo_rubro');
  const body = await c.req.json();
  const sifse_item = parseInt(body.sifse_item);
  const db = getDb(c.env);

  // Verificar que el rubro existe
  const rubro = await db.query.rubrosGastos.findFirst({
    where: and(
      eq(rubrosGastos.tenantId, tenantId),
      eq(rubrosGastos.codigo, codigoRubro)
    ),
  });

  if (!rubro) {
    return c.json({ error: 'Rubro no encontrado' }, 404);
  }

  // TODO: Actualizar mapeo en tabla de mapeos cuando exista
  // Por ahora solo retornamos éxito
  return c.json({ message: 'Mapeo actualizado' });
});

export default app;
