/**
 * Empresas (tenants) - Endpoints
 * Cada empresa o institución tiene su propio catálogo presupuestal.
 * Los super admin ven y administran todas; los demás usuarios solo la suya.
 */

import { Hono } from 'hono';
import { clerkAuth, requireSuperAdmin } from '../middleware/auth';
import { getDb } from '../db';
import { tenants, users } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, sql } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const createEmpresaSchema = z.object({
  nombre: z.string().min(1).max(300),
  nit: z.string().min(1).max(25),
  codigoDane: z.string().max(20).optional(),
  vigenciaActual: z.number().int().optional(),
});

/**
 * GET /api/empresas
 * Listar empresas con un resumen presupuestal de cada una
 */
app.get('/', clerkAuth, async (c) => {
  const db = getDb(c.env);
  const tenantId = c.get('tenantId');
  const filtro = c.get('isSuperAdmin') ? sql`1 = 1` : sql`t.id = ${tenantId}`;

  // Solo rubros hoja para evitar doble conteo con los padres
  const empresas = await db.all(sql`
    SELECT
      t.id,
      t.nombre,
      t.nit,
      t.vigencia_actual AS vigenciaActual,
      t.estado,
      (SELECT COUNT(*) FROM rubros_ingresos WHERE tenant_id = t.id) AS rubrosIngresos,
      (SELECT COUNT(*) FROM rubros_gastos WHERE tenant_id = t.id) AS rubrosGastos,
      (SELECT COALESCE(SUM(presupuesto_definitivo), 0) FROM rubros_ingresos WHERE tenant_id = t.id AND es_hoja = 1) AS pptoIngresos,
      (SELECT COALESCE(SUM(apropiacion_definitiva), 0) FROM rubros_gastos WHERE tenant_id = t.id AND es_hoja = 1) AS apropiacion,
      (SELECT COALESCE(SUM(valor), 0) FROM cdp WHERE tenant_id = t.id AND estado != 'ANULADO') AS cdp,
      (SELECT COALESCE(SUM(valor), 0) FROM rp WHERE tenant_id = t.id AND estado != 'ANULADO') AS comprometido,
      (SELECT COALESCE(SUM(valor), 0) FROM pagos WHERE tenant_id = t.id AND estado != 'ANULADO') AS pagado,
      (SELECT COALESCE(SUM(valor), 0) FROM recaudos WHERE tenant_id = t.id AND estado != 'ANULADO') AS recaudado
    FROM tenants t
    WHERE ${filtro}
    ORDER BY t.nombre
  `);

  return c.json(
    (empresas as any[]).map((e) => ({ ...e, activa: e.id === tenantId }))
  );
});

/**
 * POST /api/empresas
 * Crear una empresa o institución nueva (solo super admin)
 */
app.post('/', clerkAuth, requireSuperAdmin, zValidator('json', createEmpresaSchema), async (c) => {
  const data = c.req.valid('json');
  const db = getDb(c.env);

  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.nit, data.nit),
  });

  if (existing) {
    return c.json({ error: `Ya existe una empresa con NIT ${data.nit}` }, 400);
  }

  const [nueva] = await db
    .insert(tenants)
    .values({
      id: createId(),
      nombre: data.nombre,
      nit: data.nit,
      codigoDane: data.codigoDane || null,
      vigenciaActual: data.vigenciaActual || new Date().getFullYear(),
      estado: 'ACTIVO',
      fechaCreacion: new Date().toISOString(),
    })
    .returning();

  return c.json(nueva, 201);
});

/**
 * POST /api/empresas/:id/activar
 * Cambiar la empresa en la que trabaja el usuario actual (solo super admin)
 */
app.post('/:id/activar', clerkAuth, requireSuperAdmin, async (c) => {
  const id = c.req.param('id');
  const userId = parseInt(c.get('userId'));
  const db = getDb(c.env);

  const empresa = await db.query.tenants.findFirst({
    where: eq(tenants.id, id),
  });

  if (!empresa) {
    return c.json({ error: 'Empresa no encontrada' }, 404);
  }

  await db.update(users).set({ tenantId: id }).where(eq(users.id, userId));

  return c.json({ message: `Empresa activa: ${empresa.nombre}`, tenantId: id });
});

export default app;
