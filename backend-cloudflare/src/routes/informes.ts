/**
 * Rutas de informes
 */

import { Hono } from 'hono';
import { clerkAuth } from '../middleware/auth';
import { getDb } from '../db';
import type { Env, Variables } from '../types/bindings';
import { sql, type SQL } from 'drizzle-orm';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

interface Periodo {
  inicioMes: string; // primer día del mes consultado (o de la vigencia)
  finMes: string; // último día del mes consultado (o de la vigencia)
}

interface Movimiento {
  anterior: number;
  mes: number;
}

/**
 * Periodo del informe dentro de la vigencia de la empresa.
 * Sin mes: toda la vigencia (anterior = 0, mes = acumulado).
 */
async function obtenerPeriodo(db: any, tenantId: string, mesParam?: string): Promise<Periodo> {
  const rows = await db.all(sql`SELECT vigencia_actual AS vigencia FROM tenants WHERE id = ${tenantId}`);
  const vigencia = Number((rows[0] as any)?.vigencia) || new Date().getFullYear();
  const mes = mesParam ? parseInt(mesParam) : NaN;

  if (mes >= 1 && mes <= 12) {
    const mm = String(mes).padStart(2, '0');
    const ultimoDia = new Date(Date.UTC(vigencia, mes, 0)).getUTCDate();
    return { inicioMes: `${vigencia}-${mm}-01`, finMes: `${vigencia}-${mm}-${ultimoDia}` };
  }
  return { inicioMes: `${vigencia}-01-01`, finMes: `${vigencia}-12-31` };
}

/**
 * Suma por rubro los movimientos de una tabla, separando lo anterior al mes y lo del mes.
 * Excluye documentos anulados.
 */
async function movimientosPorRubro(
  db: any,
  tabla: SQL,
  columnaValor: SQL,
  tenantId: string,
  periodo: Periodo
): Promise<Map<string, Movimiento>> {
  const rows = await db.all(sql`
    SELECT
      codigo_rubro AS codigo,
      COALESCE(SUM(CASE WHEN fecha < ${periodo.inicioMes} THEN ${columnaValor} ELSE 0 END), 0) AS anterior,
      COALESCE(SUM(CASE WHEN fecha >= ${periodo.inicioMes} THEN ${columnaValor} ELSE 0 END), 0) AS mes
    FROM ${tabla}
    WHERE tenant_id = ${tenantId}
      AND estado != 'ANULADO'
      AND fecha <= ${periodo.finMes}
    GROUP BY codigo_rubro
  `);

  const mapa = new Map<string, Movimiento>();
  for (const r of rows as any[]) {
    mapa.set(r.codigo, { anterior: Number(r.anterior), mes: Number(r.mes) });
  }
  return mapa;
}

/**
 * Suma los movimientos de las hojas en cada rubro (hoja o padre) según el prefijo del código.
 */
function acumular(codigo: string, mapa: Map<string, Movimiento>) {
  let anterior = 0;
  let mes = 0;
  for (const [cod, m] of mapa) {
    if (cod === codigo || cod.startsWith(codigo + '.')) {
      anterior += m.anterior;
      mes += m.mes;
    }
  }
  return { anterior, mes, acumulado: anterior + mes };
}

/**
 * GET /api/informes/ejecucion-gastos?mes=N
 * Ejecución de gastos: apropiación, CDP, compromisos (RP), obligaciones y pagos
 */
app.get('/ejecucion-gastos', clerkAuth, async (c) => {
  const db = getDb(c.env);
  const tenantId = c.get('tenantId');

  try {
    const periodo = await obtenerPeriodo(db, tenantId, c.req.query('mes'));

    const [rubros, cdps, compromisos, obligaciones, pagos] = await Promise.all([
      db.all(sql`
        SELECT codigo, cuenta, es_hoja, apropiacion_inicial, adiciones, reducciones,
               creditos, contracreditos, apropiacion_definitiva
        FROM rubros_gastos
        WHERE tenant_id = ${tenantId}
        ORDER BY codigo
      `),
      movimientosPorRubro(db, sql`cdp`, sql`valor`, tenantId, periodo),
      movimientosPorRubro(db, sql`rp`, sql`valor`, tenantId, periodo),
      movimientosPorRubro(db, sql`obligaciones`, sql`valor`, tenantId, periodo),
      movimientosPorRubro(db, sql`pagos`, sql`valor`, tenantId, periodo),
    ]);

    const result = (rubros as any[]).map((r) => {
      const cdp = acumular(r.codigo, cdps);
      const comp = acumular(r.codigo, compromisos);
      const oblig = acumular(r.codigo, obligaciones);
      const pago = acumular(r.codigo, pagos);
      const definitivo = Number(r.apropiacion_definitiva);

      return {
        codigo: r.codigo,
        cuenta: r.cuenta,
        es_hoja: r.es_hoja,
        nivel: r.codigo.split('.').length,
        ppto_inicial: Number(r.apropiacion_inicial),
        adiciones: Number(r.adiciones),
        reducciones: Number(r.reducciones),
        creditos: Number(r.creditos),
        contracreditos: Number(r.contracreditos),
        ppto_definitivo: definitivo,
        cdp_anterior: cdp.anterior,
        cdp_mes: cdp.mes,
        cdp_acumulado: cdp.acumulado,
        comp_anterior: comp.anterior,
        comp_mes: comp.mes,
        comp_acumulado: comp.acumulado,
        oblig_anterior: oblig.anterior,
        oblig_mes: oblig.mes,
        oblig_acumulado: oblig.acumulado,
        pago_anterior: pago.anterior,
        pago_mes: pago.mes,
        pago_acumulado: pago.acumulado,
        // Apropiación sin CDP (saldo disponible)
        saldo_apropiacion: definitivo - cdp.acumulado,
        // Compromisos sin obligar (reservas)
        reservas: comp.acumulado - oblig.acumulado,
        // Obligaciones sin pagar (cuentas por pagar)
        cuentas_por_pagar: oblig.acumulado - pago.acumulado,
        // Compromisos sin pagar
        saldo_comp_pagar: comp.acumulado - pago.acumulado,
      };
    });

    return c.json(result);
  } catch (error) {
    console.error('Error obteniendo informe de ejecución de gastos:', error);
    return c.json({ error: 'Error obteniendo informe' }, 500);
  }
});

/**
 * GET /api/informes/ejecucion-ingresos?mes=N
 * Ejecución de ingresos: presupuesto, reconocimientos y recaudos
 */
app.get('/ejecucion-ingresos', clerkAuth, async (c) => {
  const db = getDb(c.env);
  const tenantId = c.get('tenantId');

  try {
    const periodo = await obtenerPeriodo(db, tenantId, c.req.query('mes'));

    const [rubros, reconocimientos, recaudos] = await Promise.all([
      db.all(sql`
        SELECT codigo, cuenta, es_hoja, presupuesto_inicial, adiciones, reducciones, presupuesto_definitivo
        FROM rubros_ingresos
        WHERE tenant_id = ${tenantId}
        ORDER BY codigo
      `),
      movimientosPorRubro(db, sql`reconocimientos`, sql`valor_reconocido`, tenantId, periodo),
      movimientosPorRubro(db, sql`recaudos`, sql`valor`, tenantId, periodo),
    ]);

    const result = (rubros as any[]).map((r) => {
      const recon = acumular(r.codigo, reconocimientos);
      const recaudo = acumular(r.codigo, recaudos);
      const definitivo = Number(r.presupuesto_definitivo);

      return {
        codigo: r.codigo,
        cuenta: r.cuenta,
        es_hoja: r.es_hoja,
        nivel: r.codigo.split('.').length,
        ppto_inicial: Number(r.presupuesto_inicial),
        adiciones: Number(r.adiciones),
        reducciones: Number(r.reducciones),
        ppto_definitivo: definitivo,
        recon_anterior: recon.anterior,
        recon_mes: recon.mes,
        recon_acumulado: recon.acumulado,
        recaudo_anterior: recaudo.anterior,
        recaudo_mes: recaudo.mes,
        recaudo_acumulado: recaudo.acumulado,
        // Presupuesto pendiente de recaudar
        saldo_por_recaudar: definitivo - recaudo.acumulado,
        // Reconocido pendiente de recaudar (cartera)
        reconocido_por_recaudar: recon.acumulado - recaudo.acumulado,
      };
    });

    return c.json(result);
  } catch (error) {
    console.error('Error obteniendo informe de ejecución de ingresos:', error);
    return c.json({ error: 'Error obteniendo informe' }, 500);
  }
});

export default app;
