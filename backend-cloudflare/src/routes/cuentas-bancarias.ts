/**
 * Cuentas Bancarias - Endpoints
 * Gestión de cuentas bancarias por tenant
 */

import { Hono } from 'hono';
import { clerkAuth, requireTesorero } from '../middleware/auth';
import { getDb } from '../db';
import { cuentasBancarias } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchema = z.object({
  banco: z.string().max(200),
  tipoCuenta: z.string().max(50),
  numeroCuenta: z.string().max(100),
  titular: z.string().max(300),
});

const updateSchema = z.object({
  banco: z.string().max(200).optional(),
  tipoCuenta: z.string().max(50).optional(),
  numeroCuenta: z.string().max(100).optional(),
  titular: z.string().max(300).optional(),
});

// GET /api/cuentas-bancarias - Listar cuentas bancarias
app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);
  const soloActivas = c.req.query('solo_activas') !== 'false';

  let query = db.query.cuentasBancarias.findMany({
    where: eq(cuentasBancarias.tenantId, tenantId),
  });

  const cuentas = await query;

  // Filtrar activas si es necesario
  const resultado = soloActivas
    ? cuentas.filter(c => c.activa)
    : cuentas;

  return c.json(resultado);
});

// POST /api/cuentas-bancarias - Crear cuenta bancaria
app.post('/', clerkAuth, requireTesorero, zValidator('json', createSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  const [nuevaCuenta] = await db
    .insert(cuentasBancarias)
    .values({
      tenantId,
      banco: data.banco,
      tipoCuenta: data.tipoCuenta,
      numeroCuenta: data.numeroCuenta,
      titular: data.titular,
      saldo: 0,
      activa: true,
    })
    .returning();

  return c.json(nuevaCuenta, 201);
});

// PUT /api/cuentas-bancarias/:id - Actualizar cuenta bancaria
app.put('/:id', clerkAuth, requireTesorero, zValidator('json', updateSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar que existe
  const cuenta = await db.query.cuentasBancarias.findFirst({
    where: and(
      eq(cuentasBancarias.tenantId, tenantId),
      eq(cuentasBancarias.id, id)
    ),
  });

  if (!cuenta) {
    return c.json({ error: 'Cuenta bancaria no encontrada' }, 404);
  }

  const updates: any = {};
  if (data.banco !== undefined) updates.banco = data.banco;
  if (data.tipoCuenta !== undefined) updates.tipoCuenta = data.tipoCuenta;
  if (data.numeroCuenta !== undefined) updates.numeroCuenta = data.numeroCuenta;
  if (data.titular !== undefined) updates.titular = data.titular;

  const [cuentaActualizada] = await db
    .update(cuentasBancarias)
    .set(updates)
    .where(
      and(
        eq(cuentasBancarias.tenantId, tenantId),
        eq(cuentasBancarias.id, id)
      )
    )
    .returning();

  return c.json(cuentaActualizada);
});

// DELETE /api/cuentas-bancarias/:id - Desactivar cuenta bancaria
app.delete('/:id', clerkAuth, requireTesorero, async (c) => {
  const tenantId = c.get('tenantId');
  const id = parseInt(c.req.param('id'));
  const db = getDb(c.env);

  // Verificar que existe
  const cuenta = await db.query.cuentasBancarias.findFirst({
    where: and(
      eq(cuentasBancarias.tenantId, tenantId),
      eq(cuentasBancarias.id, id)
    ),
  });

  if (!cuenta) {
    return c.json({ error: 'Cuenta bancaria no encontrada' }, 404);
  }

  await db
    .update(cuentasBancarias)
    .set({ activa: false })
    .where(
      and(
        eq(cuentasBancarias.tenantId, tenantId),
        eq(cuentasBancarias.id, id)
      )
    );

  return c.body(null, 204);
});

export default app;
