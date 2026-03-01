/**
 * Rutas del dashboard
 */

import { Hono } from 'hono';
import { clerkAuth } from '../middleware/auth';
import { getDb } from '../db';
import type { Env, Variables } from '../types/bindings';
import { sql } from 'drizzle-orm';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/dashboard/resumen
 * Obtener resumen del dashboard
 */
app.get('/resumen', clerkAuth, async (c) => {
  const db = getDb(c.env);
  const tenantId = c.get('tenantId');

  try {
    // ========== GASTOS ==========

    // 1. Apropiación definitiva total
    const apropiacionResult = await db.all(sql`
      SELECT COALESCE(SUM(apropiacion_definitiva), 0) as total
      FROM rubros_gastos
      WHERE tenant_id = ${tenantId}
    `);
    const apropiacion = (apropiacionResult[0] as any)?.total || 0;

    // 2. Total CDP expedidos
    const cdpResult = await db.all(sql`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM cdp
      WHERE tenant_id = ${tenantId} AND estado != 'ANULADO'
    `);
    const cdp = (cdpResult[0] as any)?.total || 0;

    // 3. Total comprometido (RP)
    const comprometidoResult = await db.all(sql`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM rp
      WHERE tenant_id = ${tenantId} AND estado != 'ANULADO'
    `);
    const comprometido = (comprometidoResult[0] as any)?.total || 0;

    // 4. Total obligaciones
    const obligadoResult = await db.all(sql`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM obligaciones
      WHERE tenant_id = ${tenantId} AND estado != 'ANULADO'
    `);
    const obligado = (obligadoResult[0] as any)?.total || 0;

    // 5. Total pagos
    const pagadoResult = await db.all(sql`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM pagos
      WHERE tenant_id = ${tenantId} AND estado != 'ANULADO'
    `);
    const pagado = (pagadoResult[0] as any)?.total || 0;

    // 6. Cálculos derivados de gastos
    const saldo_disponible = apropiacion - cdp;
    const saldo_por_pagar = obligado - pagado;

    // ========== INGRESOS ==========

    // 7. Presupuesto de ingresos
    const pptoIngresosResult = await db.all(sql`
      SELECT COALESCE(SUM(presupuesto_definitivo), 0) as total
      FROM rubros_ingresos
      WHERE tenant_id = ${tenantId}
    `);
    const ppto_ingresos = (pptoIngresosResult[0] as any)?.total || 0;

    // 8. Total recaudado
    const recaudadoResult = await db.all(sql`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM recaudos
      WHERE tenant_id = ${tenantId} AND estado != 'ANULADO'
    `);
    const recaudado = (recaudadoResult[0] as any)?.total || 0;

    // 9. Cálculos derivados de ingresos
    const saldo_por_recaudar = ppto_ingresos - recaudado;

    // ========== EQUILIBRIO ==========
    const equilibrio = ppto_ingresos - apropiacion;

    // ========== PORCENTAJES ==========
    // Evitar división por cero
    const pct_cdp = apropiacion > 0 ? (cdp / apropiacion) * 100 : 0;
    const pct_comprometido = apropiacion > 0 ? (comprometido / apropiacion) * 100 : 0;
    const pct_obligado = apropiacion > 0 ? (obligado / apropiacion) * 100 : 0;
    const pct_pagado = apropiacion > 0 ? (pagado / apropiacion) * 100 : 0;
    const pct_recaudado = ppto_ingresos > 0 ? (recaudado / ppto_ingresos) * 100 : 0;

    return c.json({
      // Valores absolutos - Gastos
      apropiacion,
      cdp,
      comprometido,
      obligado,
      pagado,
      saldo_disponible,
      saldo_por_pagar,

      // Valores absolutos - Ingresos
      ppto_ingresos,
      recaudado,
      saldo_por_recaudar,

      // Equilibrio
      equilibrio,

      // Porcentajes
      pct_cdp,
      pct_comprometido,
      pct_obligado,
      pct_pagado,
      pct_recaudado,
    });
  } catch (error) {
    console.error('Error obteniendo resumen del dashboard:', error);
    return c.json({ error: 'Error obteniendo resumen' }, 500);
  }
});

export default app;
