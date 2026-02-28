/**
 * Rubros de Gastos - Endpoints
 * Migrado de Python/FastAPI a TypeScript/Hono
 */

import { Hono } from 'hono';
import { clerkAuth, requireEscritura } from '../middleware/auth';
import { getDb } from '../db';
import { rubrosGastos, cdp } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and, like, or, sql } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

const createRubroGastoSchema = z.object({
  codigo: z.string().min(1).max(50),
  cuenta: z.string().min(1).max(500),
  apropiacionDefinitiva: z.number().default(0),
  apropiacionInicial: z.number().default(0),
});

const updateRubroGastoSchema = z.object({
  cuenta: z.string().min(1).max(500).optional(),
  apropiacionDefinitiva: z.number().optional(),
  apropiacionInicial: z.number().optional(),
});

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Calcula el saldo disponible de un rubro
 */
async function calcularSaldoDisponible(
  db: any,
  tenantId: string,
  codigoRubro: string
): Promise<number> {
  // Obtener el rubro
  const rubro = await db.query.rubrosGastos.findFirst({
    where: and(
      eq(rubrosGastos.tenantId, tenantId),
      eq(rubrosGastos.codigo, codigoRubro)
    ),
  });

  if (!rubro) return 0;

  // Sumar todos los CDPs activos (no anulados)
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${cdp.valor}), 0)`,
    })
    .from(cdp)
    .where(
      and(
        eq(cdp.tenantId, tenantId),
        eq(cdp.codigoRubro, codigoRubro),
        sql`${cdp.estado} != 'ANULADO'`
      )
    );

  const totalCdps = Number(result[0]?.total || 0);
  return rubro.apropiacionDefinitiva - totalCdps;
}

/**
 * Recalcula qué rubros son hojas y cuáles no
 */
async function recalcularHojas(db: any, tenantId: string): Promise<void> {
  // Obtener todos los rubros del tenant
  const todosLosRubros = await db.query.rubrosGastos.findMany({
    where: eq(rubrosGastos.tenantId, tenantId),
  });

  const codigos = new Set<string>(todosLosRubros.map((r: any) => r.codigo));

  // Para cada rubro, verificar si tiene hijos
  for (const rubro of todosLosRubros) {
    const tieneHijos = Array.from(codigos).some(
      (c) => c !== rubro.codigo && c.startsWith(rubro.codigo + '.')
    );

    const nuevoValor = tieneHijos ? 0 : 1;

    if (rubro.esHoja !== nuevoValor) {
      await db
        .update(rubrosGastos)
        .set({ esHoja: nuevoValor })
        .where(eq(rubrosGastos.codigo, rubro.codigo));
    }
  }
}

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * GET /api/rubros-gastos
 * Listar todos los rubros de gastos (opcionalmente solo hojas)
 */
app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);
  const soloHojas = c.req.query('solo_hojas') === 'true';

  let conditions = [eq(rubrosGastos.tenantId, tenantId)];

  if (soloHojas) {
    conditions.push(eq(rubrosGastos.esHoja, 1));
  }

  const rubros = await db.query.rubrosGastos.findMany({
    where: and(...conditions),
    orderBy: (rubrosGastos, { asc }) => [asc(rubrosGastos.codigo)],
  });

  // Calcular saldo disponible para cada rubro
  const result = await Promise.all(
    rubros.map(async (rubro) => ({
      ...rubro,
      saldoDisponible: await calcularSaldoDisponible(db, tenantId, rubro.codigo),
    }))
  );

  return c.json(result);
});

/**
 * GET /api/rubros-gastos/buscar?q=...
 * Buscar rubros por código o cuenta
 */
app.get('/buscar', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const q = c.req.query('q');

  if (!q || q.length < 1) {
    return c.json({ error: 'Parámetro de búsqueda requerido' }, 400);
  }

  const db = getDb(c.env);

  const rubros = await db.query.rubrosGastos.findMany({
    where: and(
      eq(rubrosGastos.tenantId, tenantId),
      eq(rubrosGastos.esHoja, 1),
      or(
        like(rubrosGastos.codigo, `%${q}%`),
        like(rubrosGastos.cuenta, `%${q}%`)
      )
    ),
    orderBy: (rubrosGastos, { asc }) => [asc(rubrosGastos.codigo)],
  });

  return c.json(rubros);
});

/**
 * GET /api/rubros-gastos/:codigo
 * Obtener un rubro específico por código
 */
app.get('/:codigo', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const codigo = c.req.param('codigo');
  const db = getDb(c.env);

  const rubro = await db.query.rubrosGastos.findFirst({
    where: and(
      eq(rubrosGastos.tenantId, tenantId),
      eq(rubrosGastos.codigo, codigo)
    ),
  });

  if (!rubro) {
    return c.json({ error: 'Rubro no encontrado' }, 404);
  }

  // Calcular saldo disponible
  const saldoDisponible = await calcularSaldoDisponible(db, tenantId, codigo);

  return c.json({
    ...rubro,
    saldoDisponible,
  });
});

/**
 * POST /api/rubros-gastos
 * Crear un nuevo rubro de gasto
 */
app.post('/', clerkAuth, requireEscritura, zValidator('json', createRubroGastoSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar si el rubro ya existe
  const existing = await db.query.rubrosGastos.findFirst({
    where: and(
      eq(rubrosGastos.tenantId, tenantId),
      eq(rubrosGastos.codigo, data.codigo)
    ),
  });

  if (existing) {
    return c.json({ error: `El rubro ${data.codigo} ya existe` }, 400);
  }

  // Determinar apropiación inicial
  const apropiacionInicial =
    data.apropiacionInicial > 0 ? data.apropiacionInicial : data.apropiacionDefinitiva;

  // Crear el rubro
  const [nuevoRubro] = await db
    .insert(rubrosGastos)
    .values({
      tenantId,
      codigo: data.codigo,
      cuenta: data.cuenta,
      esHoja: 1,
      apropiacionInicial,
      apropiacionDefinitiva: data.apropiacionDefinitiva,
    })
    .returning();

  // Marcar el padre como no-hoja si existe
  const parts = data.codigo.split('.');
  if (parts.length > 1) {
    const parentCode = parts.slice(0, -1).join('.');
    const parent = await db.query.rubrosGastos.findFirst({
      where: and(
        eq(rubrosGastos.tenantId, tenantId),
        eq(rubrosGastos.codigo, parentCode)
      ),
    });

    if (parent) {
      await db
        .update(rubrosGastos)
        .set({ esHoja: 0 })
        .where(eq(rubrosGastos.codigo, parentCode));
    }
  }

  // Recalcular hojas
  await recalcularHojas(db, tenantId);

  return c.json(nuevoRubro, 201);
});

/**
 * PUT /api/rubros-gastos/:codigo
 * Editar un rubro existente
 */
app.put('/:codigo', clerkAuth, requireEscritura, zValidator('json', updateRubroGastoSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const codigo = c.req.param('codigo');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar que el rubro existe
  const rubro = await db.query.rubrosGastos.findFirst({
    where: and(
      eq(rubrosGastos.tenantId, tenantId),
      eq(rubrosGastos.codigo, codigo)
    ),
  });

  if (!rubro) {
    return c.json({ error: `Rubro ${codigo} no encontrado` }, 404);
  }

  // Preparar objeto de actualización
  const updates: any = {};

  if (data.cuenta !== undefined) {
    updates.cuenta = data.cuenta;
  }

  if (data.apropiacionDefinitiva !== undefined) {
    updates.apropiacionDefinitiva = data.apropiacionDefinitiva;

    // Si no hay modificaciones, actualizar también la inicial
    const noMods =
      rubro.adiciones === 0 &&
      rubro.reducciones === 0 &&
      rubro.creditos === 0 &&
      rubro.contracreditos === 0;

    if (noMods) {
      updates.apropiacionInicial = data.apropiacionDefinitiva;
    }
  }

  if (data.apropiacionInicial !== undefined && data.apropiacionDefinitiva === undefined) {
    updates.apropiacionInicial = data.apropiacionInicial;
    updates.apropiacionDefinitiva =
      data.apropiacionInicial +
      rubro.adiciones -
      rubro.reducciones +
      rubro.creditos -
      rubro.contracreditos;
  }

  // Actualizar el rubro
  const [actualizado] = await db
    .update(rubrosGastos)
    .set(updates)
    .where(
      and(eq(rubrosGastos.tenantId, tenantId), eq(rubrosGastos.codigo, codigo))
    )
    .returning();

  return c.json(actualizado);
});

/**
 * DELETE /api/rubros-gastos/:codigo
 * Eliminar un rubro
 */
app.delete('/:codigo', clerkAuth, requireEscritura, async (c) => {
  const tenantId = c.get('tenantId');
  const codigo = c.req.param('codigo');
  const db = getDb(c.env);

  // Verificar que el rubro existe
  const rubro = await db.query.rubrosGastos.findFirst({
    where: and(
      eq(rubrosGastos.tenantId, tenantId),
      eq(rubrosGastos.codigo, codigo)
    ),
  });

  if (!rubro) {
    return c.json({ error: `Rubro ${codigo} no encontrado` }, 404);
  }

  // Verificar que no tenga CDPs registrados
  const cdpsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(cdp)
    .where(
      and(eq(cdp.tenantId, tenantId), eq(cdp.codigoRubro, codigo))
    );

  if (Number(cdpsCount[0]?.count || 0) > 0) {
    return c.json({ error: 'No se puede eliminar: tiene CDPs registrados' }, 400);
  }

  // Verificar que no tenga sub-rubros
  const subRubrosCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(rubrosGastos)
    .where(
      and(
        eq(rubrosGastos.tenantId, tenantId),
        like(rubrosGastos.codigo, `${codigo}.%`)
      )
    );

  if (Number(subRubrosCount[0]?.count || 0) > 0) {
    return c.json({ error: 'No se puede eliminar: tiene sub-rubros' }, 400);
  }

  // Eliminar el rubro
  await db
    .delete(rubrosGastos)
    .where(
      and(eq(rubrosGastos.tenantId, tenantId), eq(rubrosGastos.codigo, codigo))
    );

  // Recalcular hojas
  await recalcularHojas(db, tenantId);

  return c.body(null, 204);
});

/**
 * POST /api/rubros-gastos/sincronizar-padres
 * Sincronizar valores de rubros padre sumando los de sus hijos
 */
app.post('/sincronizar-padres', clerkAuth, requireEscritura, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);

  // Obtener todos los rubros
  const todosLosRubros = await db.query.rubrosGastos.findMany({
    where: eq(rubrosGastos.tenantId, tenantId),
  });

  const hojas = todosLosRubros.filter((r) => r.esHoja === 1);
  const padres = todosLosRubros.filter((r) => r.esHoja === 0);

  // Para cada padre, sumar los valores de sus hijos
  for (const padre of padres) {
    const hijos = hojas.filter((h) => h.codigo.startsWith(padre.codigo + '.'));

    if (hijos.length > 0) {
      const suma = {
        apropiacionInicial: hijos.reduce((sum, h) => sum + h.apropiacionInicial, 0),
        adiciones: hijos.reduce((sum, h) => sum + h.adiciones, 0),
        reducciones: hijos.reduce((sum, h) => sum + h.reducciones, 0),
        creditos: hijos.reduce((sum, h) => sum + h.creditos, 0),
        contracreditos: hijos.reduce((sum, h) => sum + h.contracreditos, 0),
        apropiacionDefinitiva: hijos.reduce((sum, h) => sum + h.apropiacionDefinitiva, 0),
      };

      await db
        .update(rubrosGastos)
        .set(suma)
        .where(eq(rubrosGastos.codigo, padre.codigo));
    }
  }

  return c.json({ message: 'Padres sincronizados' });
});

export default app;
