/**
 * Rutas de Rubros de Ingresos
 */

import { Hono } from 'hono';
import { clerkAuth, requireTesorero } from '../middleware/auth';
import { getDb } from '../db';
import { rubrosIngresos, recaudos, reconocimientos } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and, like, or, sql, sum } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

const createRubroSchema = z.object({
  codigo: z.string().min(1).max(50),
  cuenta: z.string().min(1).max(500),
  presupuestoInicial: z.number().default(0),
  presupuestoDefinitivo: z.number().default(0),
});

const updateRubroSchema = z.object({
  cuenta: z.string().min(1).max(500).optional(),
  presupuestoInicial: z.number().optional(),
  presupuestoDefinitivo: z.number().optional(),
});

// ============================================================================
// HELPER: Calcular saldo por recaudar
// ============================================================================

async function calcularSaldoPorRecaudar(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  codigoRubro: string
): Promise<number> {
  // Obtener rubro
  const rubro = await db.query.rubrosIngresos.findFirst({
    where: and(
      eq(rubrosIngresos.tenantId, tenantId),
      eq(rubrosIngresos.codigo, codigoRubro)
    ),
  });

  if (!rubro) return 0;

  // Total recaudado
  const recaudosResult = await db
    .select({ total: sum(recaudos.valor) })
    .from(recaudos)
    .where(
      and(
        eq(recaudos.tenantId, tenantId),
        eq(recaudos.codigoRubro, codigoRubro)
      )
    );

  const totalRecaudado = Number(recaudosResult[0]?.total || 0);

  return rubro.presupuestoDefinitivo - totalRecaudado;
}

// ============================================================================
// RUTAS
// ============================================================================

/**
 * GET /api/rubros-ingresos
 * Listar todos los rubros de ingresos
 */
app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const soloHojas = c.req.query('solo_hojas') === 'true';

  const db = getDb(c.env);

  let whereCondition = eq(rubrosIngresos.tenantId, tenantId);

  if (soloHojas) {
    whereCondition = and(whereCondition, eq(rubrosIngresos.esHoja, 1))!;
  }

  const rubros = await db.query.rubrosIngresos.findMany({
    where: whereCondition,
    orderBy: (rubrosIngresos, { asc }) => [asc(rubrosIngresos.codigo)],
  });

  // Calcular saldo por recaudar para cada rubro
  const rubrosConSaldo = await Promise.all(
    rubros.map(async (rubro) => ({
      ...rubro,
      saldoPorRecaudar: await calcularSaldoPorRecaudar(db, tenantId, rubro.codigo),
    }))
  );

  return c.json(rubrosConSaldo);
});

/**
 * GET /api/rubros-ingresos/buscar?q=...
 * Buscar rubros por código o cuenta
 */
app.get('/buscar', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const query = c.req.query('q');

  if (!query || query.length < 1) {
    return c.json({ error: 'El parámetro q es requerido' }, 400);
  }

  const db = getDb(c.env);

  const rubros = await db.query.rubrosIngresos.findMany({
    where: and(
      eq(rubrosIngresos.tenantId, tenantId),
      or(
        like(rubrosIngresos.codigo, `%${query}%`),
        like(rubrosIngresos.cuenta, `%${query}%`)
      )
    ),
    limit: 50,
  });

  return c.json(rubros);
});

/**
 * GET /api/rubros-ingresos/:codigo
 * Obtener un rubro específico
 */
app.get('/:codigo', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const codigo = c.req.param('codigo');

  const db = getDb(c.env);

  const rubro = await db.query.rubrosIngresos.findFirst({
    where: and(
      eq(rubrosIngresos.tenantId, tenantId),
      eq(rubrosIngresos.codigo, codigo)
    ),
  });

  if (!rubro) {
    return c.json({ error: 'Rubro no encontrado' }, 404);
  }

  const saldoPorRecaudar = await calcularSaldoPorRecaudar(db, tenantId, codigo);

  return c.json({
    ...rubro,
    saldoPorRecaudar,
  });
});

/**
 * POST /api/rubros-ingresos
 * Crear un nuevo rubro de ingresos
 */
app.post('/', clerkAuth, requireTesorero, zValidator('json', createRubroSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');

  const db = getDb(c.env);

  // Verificar si ya existe
  const existe = await db.query.rubrosIngresos.findFirst({
    where: and(
      eq(rubrosIngresos.tenantId, tenantId),
      eq(rubrosIngresos.codigo, data.codigo)
    ),
  });

  if (existe) {
    return c.json({ error: 'El código de rubro ya existe' }, 400);
  }

  // Determinar si es hoja (no tiene hijos)
  const esHoja = 1; // Por defecto es hoja, se actualizará si se agregan hijos

  const [nuevoRubro] = await db
    .insert(rubrosIngresos)
    .values({
      tenantId,
      codigo: data.codigo,
      cuenta: data.cuenta,
      esHoja,
      presupuestoInicial: data.presupuestoInicial,
      presupuestoDefinitivo: data.presupuestoDefinitivo,
    })
    .returning();

  return c.json(nuevoRubro, 201);
});

/**
 * PUT /api/rubros-ingresos/:codigo
 * Actualizar un rubro de ingresos
 */
app.put('/:codigo', clerkAuth, requireTesorero, zValidator('json', updateRubroSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const codigo = c.req.param('codigo');
  const data = c.req.valid('json');

  const db = getDb(c.env);

  // Verificar que existe
  const rubro = await db.query.rubrosIngresos.findFirst({
    where: and(
      eq(rubrosIngresos.tenantId, tenantId),
      eq(rubrosIngresos.codigo, codigo)
    ),
  });

  if (!rubro) {
    return c.json({ error: 'Rubro no encontrado' }, 404);
  }

  // Actualizar
  const [actualizado] = await db
    .update(rubrosIngresos)
    .set({
      ...(data.cuenta && { cuenta: data.cuenta }),
      ...(data.presupuestoInicial !== undefined && { presupuestoInicial: data.presupuestoInicial }),
      ...(data.presupuestoDefinitivo !== undefined && { presupuestoDefinitivo: data.presupuestoDefinitivo }),
    })
    .where(
      and(
        eq(rubrosIngresos.tenantId, tenantId),
        eq(rubrosIngresos.codigo, codigo)
      )
    )
    .returning();

  return c.json(actualizado);
});

/**
 * DELETE /api/rubros-ingresos/:codigo
 * Eliminar un rubro de ingresos
 */
app.delete('/:codigo', clerkAuth, requireTesorero, async (c) => {
  const tenantId = c.get('tenantId');
  const codigo = c.req.param('codigo');

  const db = getDb(c.env);

  // Verificar que no tiene recaudos asociados
  const recaudosAsociados = await db.query.recaudos.findFirst({
    where: and(
      eq(recaudos.tenantId, tenantId),
      eq(recaudos.codigoRubro, codigo)
    ),
  });

  if (recaudosAsociados) {
    return c.json({ error: 'No se puede eliminar un rubro con recaudos asociados' }, 400);
  }

  // Eliminar
  await db
    .delete(rubrosIngresos)
    .where(
      and(
        eq(rubrosIngresos.tenantId, tenantId),
        eq(rubrosIngresos.codigo, codigo)
      )
    );

  return c.body(null, 204);
});

export default app;
