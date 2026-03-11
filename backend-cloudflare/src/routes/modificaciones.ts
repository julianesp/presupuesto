/**
 * Rutas API para Modificaciones Presupuestales
 * Migrado de Python a TypeScript
 */

import { Hono } from 'hono';
import { clerkAuth, requireEscritura } from '../middleware/auth';
import type { Env, Variables } from '../types/bindings';
import { getDb } from '../db';
import {
  modificaciones,
  detalleModificaciones,
  rubrosGastos,
  rubrosIngresos,
  cdp
} from '../db/schema';
import { eq, and, sql, sum } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Aplicar autenticación
app.use('*', clerkAuth);

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

const adicionSchema = z.object({
  codigoGasto: z.string(),
  codigoIngreso: z.string(),
  valor: z.number().positive(),
  numeroActo: z.string(),
  descripcion: z.string().optional().default(''),
});

const reduccionSchema = z.object({
  codigoGasto: z.string(),
  codigoIngreso: z.string(),
  valor: z.number().positive(),
  numeroActo: z.string(),
  descripcion: z.string().optional().default(''),
});

const creditoContracreditoSchema = z.object({
  codigoCredito: z.string(),
  codigoContracredito: z.string(),
  valor: z.number().positive(),
  numeroActo: z.string(),
  descripcion: z.string().optional().default(''),
});

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

async function getSaldoDisponible(db: any, tenantId: string, codigoRubro: string): Promise<number> {
  const rubro = await db.query.rubrosGastos.findFirst({
    where: and(
      eq(rubrosGastos.tenantId, tenantId),
      eq(rubrosGastos.codigo, codigoRubro)
    ),
  });

  if (!rubro) return 0;

  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${cdp.valor}), 0)` })
    .from(cdp)
    .where(
      and(
        eq(cdp.tenantId, tenantId),
        eq(cdp.codigoRubro, codigoRubro),
        eq(cdp.estado, 'ACTIVO')
      )
    );

  const comprometido = Number(result[0]?.total || 0);
  return rubro.apropiacionDefinitiva - comprometido;
}

async function getConsecutivo(db: any, tenantId: string): Promise<number> {
  // Obtener el máximo número de modificación + 1
  const result = await db
    .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
    .from(modificaciones)
    .where(eq(modificaciones.tenantId, tenantId));

  return Number(result[0]?.maxId || 0) + 1;
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * GET /api/modificaciones
 * Listar todas las modificaciones presupuestales
 */
app.get('/', requireEscritura, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);

  const mods = await db.query.modificaciones.findMany({
    where: eq(modificaciones.tenantId, tenantId),
    orderBy: (mods, { desc }) => [desc(mods.id)],
  });

  return c.json(mods);
});

/**
 * GET /api/modificaciones/:id
 * Obtener una modificación por ID
 */
app.get('/:id', requireEscritura, async (c) => {
  const tenantId = c.get('tenantId');
  const id = parseInt(c.req.param('id'));
  const db = getDb(c.env);

  const mod = await db.query.modificaciones.findFirst({
    where: and(
      eq(modificaciones.tenantId, tenantId),
      eq(modificaciones.id, id)
    ),
    with: {
      detalles: true,
    },
  });

  if (!mod) {
    return c.json({ error: 'Modificación no encontrada' }, 404);
  }

  return c.json(mod);
});

/**
 * POST /api/modificaciones/adicion
 * Registrar una adición presupuestal
 */
app.post('/adicion', requireEscritura, zValidator('json', adicionSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  try {
    // Validar rubros de gasto
    const rubroGasto = await db.query.rubrosGastos.findFirst({
      where: and(
        eq(rubrosGastos.tenantId, tenantId),
        eq(rubrosGastos.codigo, data.codigoGasto)
      ),
    });

    if (!rubroGasto) {
      return c.json({ error: `Rubro de gasto ${data.codigoGasto} no encontrado` }, 400);
    }
    if (rubroGasto.esHoja !== 1) {
      return c.json({ error: `Rubro de gasto ${data.codigoGasto} no es hoja` }, 400);
    }

    // Validar rubros de ingreso
    const rubroIngreso = await db.query.rubrosIngresos.findFirst({
      where: and(
        eq(rubrosIngresos.tenantId, tenantId),
        eq(rubrosIngresos.codigo, data.codigoIngreso)
      ),
    });

    if (!rubroIngreso) {
      return c.json({ error: `Rubro de ingreso ${data.codigoIngreso} no encontrado` }, 400);
    }
    if (rubroIngreso.esHoja !== 1) {
      return c.json({ error: `Rubro de ingreso ${data.codigoIngreso} no es hoja` }, 400);
    }

    const numero = await getConsecutivo(db, tenantId);
    const fecha = getTodayISO();

    // Crear modificación
    const [mod] = await db.insert(modificaciones).values({
      tenantId,
      fecha,
      tipo: 'ADICION',
      numeroActo: data.numeroActo,
      descripcion: data.descripcion,
      valor: data.valor,
      estado: 'ACTIVO',
    }).returning();

    // Crear detalles
    await db.insert(detalleModificaciones).values([
      {
        tenantId,
        idModificacion: mod.id,
        codigoRubro: data.codigoGasto,
        tipoRubro: 'GASTO',
        campoAfectado: 'adiciones',
        valor: data.valor,
      },
      {
        tenantId,
        idModificacion: mod.id,
        codigoRubro: data.codigoIngreso,
        tipoRubro: 'INGRESO',
        campoAfectado: 'adiciones',
        valor: data.valor,
      },
    ]);

    // Actualizar rubros
    await db.update(rubrosGastos)
      .set({
        adiciones: rubroGasto.adiciones + data.valor,
        apropiacionDefinitiva: rubroGasto.apropiacionInicial + (rubroGasto.adiciones + data.valor)
          - rubroGasto.reducciones + rubroGasto.creditos - rubroGasto.contracreditos,
      })
      .where(and(
        eq(rubrosGastos.tenantId, tenantId),
        eq(rubrosGastos.codigo, data.codigoGasto)
      ));

    await db.update(rubrosIngresos)
      .set({
        adiciones: rubroIngreso.adiciones + data.valor,
        presupuestoDefinitivo: rubroIngreso.presupuestoInicial + (rubroIngreso.adiciones + data.valor)
          - rubroIngreso.reducciones,
      })
      .where(and(
        eq(rubrosIngresos.tenantId, tenantId),
        eq(rubrosIngresos.codigo, data.codigoIngreso)
      ));

    return c.json({ numero, fecha }, 201);

  } catch (error: any) {
    console.error('Error al registrar adición:', error);
    return c.json({ error: error.message || 'Error al registrar adición' }, 500);
  }
});

/**
 * POST /api/modificaciones/reduccion
 * Registrar una reducción presupuestal
 */
app.post('/reduccion', requireEscritura, zValidator('json', reduccionSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  try {
    // Similar a adición pero con reducciones
    const rubroGasto = await db.query.rubrosGastos.findFirst({
      where: and(
        eq(rubrosGastos.tenantId, tenantId),
        eq(rubrosGastos.codigo, data.codigoGasto)
      ),
    });

    if (!rubroGasto || rubroGasto.esHoja !== 1) {
      return c.json({ error: 'Rubro de gasto inválido' }, 400);
    }

    const saldo = await getSaldoDisponible(db, tenantId, data.codigoGasto);
    if (data.valor > saldo) {
      return c.json({
        error: `El valor (${data.valor.toFixed(2)}) supera el saldo disponible (${saldo.toFixed(2)})`
      }, 400);
    }

    const numero = await getConsecutivo(db, tenantId);
    const fecha = getTodayISO();

    const [mod] = await db.insert(modificaciones).values({
      tenantId,
      fecha,
      tipo: 'REDUCCION',
      numeroActo: data.numeroActo,
      descripcion: data.descripcion,
      valor: data.valor,
      estado: 'ACTIVO',
    }).returning();

    await db.insert(detalleModificaciones).values([
      {
        tenantId,
        idModificacion: mod.id,
        codigoRubro: data.codigoGasto,
        tipoRubro: 'GASTO',
        campoAfectado: 'reducciones',
        valor: data.valor,
      },
      {
        tenantId,
        idModificacion: mod.id,
        codigoRubro: data.codigoIngreso,
        tipoRubro: 'INGRESO',
        campoAfectado: 'reducciones',
        valor: data.valor,
      },
    ]);

    await db.update(rubrosGastos)
      .set({
        reducciones: rubroGasto.reducciones + data.valor,
        apropiacionDefinitiva: rubroGasto.apropiacionInicial + rubroGasto.adiciones
          - (rubroGasto.reducciones + data.valor) + rubroGasto.creditos - rubroGasto.contracreditos,
      })
      .where(and(
        eq(rubrosGastos.tenantId, tenantId),
        eq(rubrosGastos.codigo, data.codigoGasto)
      ));

    return c.json({ numero, fecha }, 201);

  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/modificaciones/credito-contracredito
 * Registrar un traslado presupuestal (crédito y contracrédito)
 */
app.post('/credito-contracredito', requireEscritura, zValidator('json', creditoContracreditoSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  try {
    if (data.codigoCredito === data.codigoContracredito) {
      return c.json({ error: 'Los rubros crédito y contracrédito deben ser diferentes' }, 400);
    }

    const rubroCredito = await db.query.rubrosGastos.findFirst({
      where: and(
        eq(rubrosGastos.tenantId, tenantId),
        eq(rubrosGastos.codigo, data.codigoCredito)
      ),
    });

    const rubroContracredito = await db.query.rubrosGastos.findFirst({
      where: and(
        eq(rubrosGastos.tenantId, tenantId),
        eq(rubrosGastos.codigo, data.codigoContracredito)
      ),
    });

    if (!rubroCredito || !rubroContracredito) {
      return c.json({ error: 'Rubros no encontrados' }, 400);
    }

    const saldoContra = await getSaldoDisponible(db, tenantId, data.codigoContracredito);
    if (data.valor > saldoContra) {
      return c.json({ error: 'Saldo insuficiente en rubro contracrédito' }, 400);
    }

    const numero = await getConsecutivo(db, tenantId);
    const fecha = getTodayISO();

    const [mod] = await db.insert(modificaciones).values({
      tenantId,
      fecha,
      tipo: 'CREDITO_CONTRACREDITO',
      numeroActo: data.numeroActo,
      descripcion: data.descripcion,
      valor: data.valor,
      estado: 'ACTIVO',
    }).returning();

    await db.insert(detalleModificaciones).values([
      {
        tenantId,
        idModificacion: mod.id,
        codigoRubro: data.codigoCredito,
        tipoRubro: 'GASTO',
        campoAfectado: 'creditos',
        valor: data.valor,
      },
      {
        tenantId,
        idModificacion: mod.id,
        codigoRubro: data.codigoContracredito,
        tipoRubro: 'GASTO',
        campoAfectado: 'contracreditos',
        valor: data.valor,
      },
    ]);

    // Actualizar rubros
    await db.update(rubrosGastos)
      .set({
        creditos: rubroCredito.creditos + data.valor,
        apropiacionDefinitiva: rubroCredito.apropiacionInicial + rubroCredito.adiciones
          - rubroCredito.reducciones + (rubroCredito.creditos + data.valor) - rubroCredito.contracreditos,
      })
      .where(and(
        eq(rubrosGastos.tenantId, tenantId),
        eq(rubrosGastos.codigo, data.codigoCredito)
      ));

    await db.update(rubrosGastos)
      .set({
        contracreditos: rubroContracredito.contracreditos + data.valor,
        apropiacionDefinitiva: rubroContracredito.apropiacionInicial + rubroContracredito.adiciones
          - rubroContracredito.reducciones + rubroContracredito.creditos - (rubroContracredito.contracreditos + data.valor),
      })
      .where(and(
        eq(rubrosGastos.tenantId, tenantId),
        eq(rubrosGastos.codigo, data.codigoContracredito)
      ));

    return c.json({ numero, fecha }, 201);

  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
