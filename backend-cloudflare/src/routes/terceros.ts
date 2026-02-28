/**
 * Terceros - Endpoints
 * Migrado de Python/FastAPI a TypeScript/Hono
 */

import { Hono } from 'hono';
import { clerkAuth, requireEscritura } from '../middleware/auth';
import { getDb } from '../db';
import { terceros } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and, like, or } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

const createTerceroSchema = z.object({
  nit: z.string().min(1).max(50),
  dv: z.string().max(2).default(''),
  nombre: z.string().min(1).max(500),
  direccion: z.string().max(300).default(''),
  telefono: z.string().max(50).default(''),
  email: z.string().email().or(z.literal('')).default(''),
  tipo: z.enum(['Natural', 'Juridico']).default('Natural'),
  banco: z.string().max(100).default(''),
  tipoCuenta: z.string().max(50).default(''),
  noCuenta: z.string().max(50).default(''),
});

const updateTerceroSchema = z.object({
  nit: z.string().min(1).max(50).optional(),
  dv: z.string().max(2).optional(),
  nombre: z.string().min(1).max(500).optional(),
  direccion: z.string().max(300).optional(),
  telefono: z.string().max(50).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  tipo: z.enum(['Natural', 'Juridico']).optional(),
  banco: z.string().max(100).optional(),
  tipoCuenta: z.string().max(50).optional(),
  noCuenta: z.string().max(50).optional(),
});

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * GET /api/terceros
 * Listar todos los terceros
 */
app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);

  const listaTerceros = await db.query.terceros.findMany({
    where: eq(terceros.tenantId, tenantId),
    orderBy: (terceros, { asc }) => [asc(terceros.nombre)],
  });

  return c.json(listaTerceros);
});

/**
 * GET /api/terceros/buscar?q=...
 * Buscar terceros por NIT o nombre
 */
app.get('/buscar', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const q = c.req.query('q');

  if (!q || q.length < 1) {
    return c.json({ error: 'Parámetro de búsqueda requerido' }, 400);
  }

  const db = getDb(c.env);

  const resultados = await db.query.terceros.findMany({
    where: and(
      eq(terceros.tenantId, tenantId),
      or(
        like(terceros.nit, `%${q}%`),
        like(terceros.nombre, `%${q}%`)
      )
    ),
    orderBy: (terceros, { asc }) => [asc(terceros.nombre)],
  });

  return c.json(resultados);
});

/**
 * GET /api/terceros/:nit
 * Obtener un tercero específico por NIT
 */
app.get('/:nit', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const nit = c.req.param('nit');
  const db = getDb(c.env);

  const tercero = await db.query.terceros.findFirst({
    where: and(
      eq(terceros.tenantId, tenantId),
      eq(terceros.nit, nit)
    ),
  });

  if (!tercero) {
    return c.json({ error: 'Tercero no encontrado' }, 404);
  }

  return c.json(tercero);
});

/**
 * POST /api/terceros
 * Crear o actualizar un tercero (upsert)
 */
app.post('/', clerkAuth, requireEscritura, zValidator('json', createTerceroSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar si el tercero ya existe
  const existing = await db.query.terceros.findFirst({
    where: and(
      eq(terceros.tenantId, tenantId),
      eq(terceros.nit, data.nit)
    ),
  });

  // Convertir nombre a mayúsculas
  const nombreUpper = data.nombre.toUpperCase();

  if (existing) {
    // Actualizar tercero existente
    const [actualizado] = await db
      .update(terceros)
      .set({
        dv: data.dv,
        nombre: nombreUpper,
        direccion: data.direccion,
        telefono: data.telefono,
        email: data.email,
        tipo: data.tipo,
        banco: data.banco,
        tipoCuenta: data.tipoCuenta,
        noCuenta: data.noCuenta,
      })
      .where(
        and(
          eq(terceros.tenantId, tenantId),
          eq(terceros.nit, data.nit)
        )
      )
      .returning();

    return c.json(actualizado);
  }

  // Crear nuevo tercero
  const [nuevoTercero] = await db
    .insert(terceros)
    .values({
      tenantId,
      nit: data.nit,
      dv: data.dv,
      nombre: nombreUpper,
      direccion: data.direccion,
      telefono: data.telefono,
      email: data.email,
      tipo: data.tipo,
      banco: data.banco,
      tipoCuenta: data.tipoCuenta,
      noCuenta: data.noCuenta,
    })
    .returning();

  return c.json(nuevoTercero, 201);
});

/**
 * PUT /api/terceros/:nit
 * Actualizar un tercero existente
 */
app.put('/:nit', clerkAuth, requireEscritura, zValidator('json', updateTerceroSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const nit = c.req.param('nit');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar que el tercero existe
  const tercero = await db.query.terceros.findFirst({
    where: and(
      eq(terceros.tenantId, tenantId),
      eq(terceros.nit, nit)
    ),
  });

  if (!tercero) {
    return c.json({ error: 'Tercero no encontrado' }, 404);
  }

  // Preparar objeto de actualización
  const updates: any = {};

  if (data.dv !== undefined) updates.dv = data.dv;
  if (data.nombre !== undefined) updates.nombre = data.nombre.toUpperCase();
  if (data.direccion !== undefined) updates.direccion = data.direccion;
  if (data.telefono !== undefined) updates.telefono = data.telefono;
  if (data.email !== undefined) updates.email = data.email;
  if (data.tipo !== undefined) updates.tipo = data.tipo;
  if (data.banco !== undefined) updates.banco = data.banco;
  if (data.tipoCuenta !== undefined) updates.tipoCuenta = data.tipoCuenta;
  if (data.noCuenta !== undefined) updates.noCuenta = data.noCuenta;

  // Actualizar el tercero
  const [actualizado] = await db
    .update(terceros)
    .set(updates)
    .where(
      and(
        eq(terceros.tenantId, tenantId),
        eq(terceros.nit, nit)
      )
    )
    .returning();

  return c.json(actualizado);
});

/**
 * DELETE /api/terceros/:nit
 * Eliminar un tercero
 */
app.delete('/:nit', clerkAuth, requireEscritura, async (c) => {
  const tenantId = c.get('tenantId');
  const nit = c.req.param('nit');
  const db = getDb(c.env);

  // Verificar que el tercero existe
  const tercero = await db.query.terceros.findFirst({
    where: and(
      eq(terceros.tenantId, tenantId),
      eq(terceros.nit, nit)
    ),
  });

  if (!tercero) {
    return c.json({ error: 'Tercero no encontrado' }, 404);
  }

  // TODO: Verificar que no tenga RPs, obligaciones o pagos asociados
  // antes de eliminar

  // Eliminar el tercero
  await db
    .delete(terceros)
    .where(
      and(
        eq(terceros.tenantId, tenantId),
        eq(terceros.nit, nit)
      )
    );

  return c.body(null, 204);
});

export default app;
