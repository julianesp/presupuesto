/**
 * Rutas de informes
 */

import { Hono } from 'hono';
import { clerkAuth } from '../middleware/auth';
import { getDb } from '../db';
import type { Env, Variables } from '../types/bindings';
import { sql } from 'drizzle-orm';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/informes/ejecucion-gastos
 * Informe de ejecución de gastos
 */
app.get('/ejecucion-gastos', clerkAuth, async (c) => {
  const db = getDb(c.env);
  const tenantId = c.get('tenantId');
  const mes = c.req.query('mes');
  const anio = c.req.query('anio');

  try {
    // Obtener ejecución de gastos por rubro
    const result = await db.all(sql`
      SELECT
        rg.codigo,
        rg.nombre,
        rg.presupuesto_inicial,
        rg.presupuesto_definitivo,
        COALESCE(SUM(cdp.valor), 0) as comprometido,
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN o.valor ELSE 0 END), 0) as obligado,
        COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN p.valor ELSE 0 END), 0) as pagado
      FROM rubros_gastos rg
      LEFT JOIN cdp_rubros cr ON rg.id = cr.rubro_id
      LEFT JOIN cdp ON cr.cdp_id = cdp.id AND cdp.estado != 'ANULADO'
      LEFT JOIN obligaciones o ON cdp.id = o.cdp_id AND o.estado != 'ANULADO'
      LEFT JOIN pagos p ON o.id = p.obligacion_id AND p.estado != 'ANULADO'
      WHERE rg.tenant_id = ${tenantId}
      ${mes && anio ? sql`AND strftime('%m', cdp.fecha) = ${mes} AND strftime('%Y', cdp.fecha) = ${anio}` : sql``}
      GROUP BY rg.id, rg.codigo, rg.nombre, rg.presupuesto_inicial, rg.presupuesto_definitivo
      ORDER BY rg.codigo
    `);

    return c.json(result);
  } catch (error) {
    console.error('Error obteniendo informe de ejecución de gastos:', error);
    return c.json({ error: 'Error obteniendo informe' }, 500);
  }
});

/**
 * GET /api/informes/ejecucion-ingresos
 * Informe de ejecución de ingresos
 */
app.get('/ejecucion-ingresos', clerkAuth, async (c) => {
  const db = getDb(c.env);
  const tenantId = c.get('tenantId');
  const mes = c.req.query('mes');
  const anio = c.req.query('anio');

  try {
    const result = await db.all(sql`
      SELECT
        ri.codigo,
        ri.nombre,
        ri.presupuesto_inicial,
        ri.presupuesto_definitivo,
        COALESCE(SUM(r.valor), 0) as recaudado
      FROM rubros_ingresos ri
      LEFT JOIN recaudos r ON ri.id = r.rubro_id AND r.estado != 'ANULADO'
      WHERE ri.tenant_id = ${tenantId}
      ${mes && anio ? sql`AND strftime('%m', r.fecha) = ${mes} AND strftime('%Y', r.fecha) = ${anio}` : sql``}
      GROUP BY ri.id, ri.codigo, ri.nombre, ri.presupuesto_inicial, ri.presupuesto_definitivo
      ORDER BY ri.codigo
    `);

    return c.json(result);
  } catch (error) {
    console.error('Error obteniendo informe de ejecución de ingresos:', error);
    return c.json({ error: 'Error obteniendo informe' }, 500);
  }
});

export default app;
