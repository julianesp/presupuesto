/**
 * Recaudos - Endpoints
 * Migrado de Python/FastAPI a TypeScript/Hono
 */

import { Hono } from 'hono';
import { clerkAuth, requireEscritura } from '../middleware/auth';
import { getDb } from '../db';
import { recaudos, rubrosIngresos } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const createRecaudoSchema = z.object({
  codigoRubro: z.string().min(1).max(50),
  valor: z.number().positive(),
  concepto: z.string().max(500).default(''),
  noComprobante: z.string().max(100).default(''),
  cuentaBancariaId: z.number().int().default(0),
});

const updateRecaudoSchema = z.object({
  valor: z.number().positive().optional(),
  concepto: z.string().max(500).optional(),
  noComprobante: z.string().max(100).optional(),
  cuentaBancariaId: z.number().int().optional(),
});

async function obtenerSiguienteNumero(db: any, tenantId: string): Promise<number> {
  const ultimoRecaudo = await db.query.recaudos.findFirst({
    where: eq(recaudos.tenantId, tenantId),
    orderBy: (recaudos: any, { desc }: any) => [desc(recaudos.numero)],
  });

  return (ultimoRecaudo?.numero || 0) + 1;
}

app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);
  const estado = c.req.query('estado');

  let conditions = [eq(recaudos.tenantId, tenantId)];

  if (estado) {
    conditions.push(eq(recaudos.estado, estado));
  }

  const recaudosList = await db.query.recaudos.findMany({
    where: and(...conditions),
    with: {
      rubro: true,
    },
    orderBy: (recaudos, { desc }) => [desc(recaudos.numero)],
  });

  return c.json(recaudosList.map((r) => ({
    numero: r.numero,
    fecha: r.fecha,
    codigoRubro: r.codigoRubro,
    cuenta: r.rubro?.cuenta || null,
    valor: r.valor,
    concepto: r.concepto,
    noComprobante: r.noComprobante,
    estado: r.estado,
    cuentaBancariaId: r.cuentaBancariaId,
  })));
});

app.get('/:numero', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  const recaudo = await db.query.recaudos.findFirst({
    where: and(eq(recaudos.tenantId, tenantId), eq(recaudos.numero, numero)),
    with: {
      rubro: true,
    },
  });

  if (!recaudo) {
    return c.json({ error: 'Recaudo no encontrado' }, 404);
  }

  return c.json({
    numero: recaudo.numero,
    fecha: recaudo.fecha,
    codigoRubro: recaudo.codigoRubro,
    cuenta: recaudo.rubro?.cuenta || null,
    valor: recaudo.valor,
    concepto: recaudo.concepto,
    noComprobante: recaudo.noComprobante,
    estado: recaudo.estado,
    cuentaBancariaId: recaudo.cuentaBancariaId,
  });
});

app.post('/', clerkAuth, requireEscritura, zValidator('json', createRecaudoSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  const rubro = await db.query.rubrosIngresos.findFirst({
    where: and(
      eq(rubrosIngresos.tenantId, tenantId),
      eq(rubrosIngresos.codigo, data.codigoRubro)
    ),
  });

  if (!rubro) {
    return c.json({ error: `Rubro ${data.codigoRubro} no encontrado` }, 400);
  }

  const numero = await obtenerSiguienteNumero(db, tenantId);
  const fecha = new Date().toISOString().split('T')[0];

  const [nuevoRecaudo] = await db
    .insert(recaudos)
    .values({
      tenantId,
      numero,
      fecha,
      codigoRubro: data.codigoRubro,
      valor: data.valor,
      concepto: data.concepto,
      noComprobante: data.noComprobante,
      estado: 'ACTIVO',
      cuentaBancariaId: data.cuentaBancariaId,
    })
    .returning();

  return c.json(
    {
      numero: nuevoRecaudo.numero,
      fecha: nuevoRecaudo.fecha,
      codigoRubro: nuevoRecaudo.codigoRubro,
      cuenta: rubro.cuenta,
      valor: nuevoRecaudo.valor,
      concepto: nuevoRecaudo.concepto,
      noComprobante: nuevoRecaudo.noComprobante,
      estado: nuevoRecaudo.estado,
      cuentaBancariaId: nuevoRecaudo.cuentaBancariaId,
    },
    201
  );
});

app.put('/:numero', clerkAuth, requireEscritura, zValidator('json', updateRecaudoSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const data = c.req.valid('json');
  const db = getDb(c.env);

  const recaudo = await db.query.recaudos.findFirst({
    where: and(eq(recaudos.tenantId, tenantId), eq(recaudos.numero, numero)),
  });

  if (!recaudo) {
    return c.json({ error: `Recaudo ${numero} no encontrado` }, 404);
  }

  const updates: any = {};

  if (data.valor !== undefined) updates.valor = data.valor;
  if (data.concepto !== undefined) updates.concepto = data.concepto;
  if (data.noComprobante !== undefined) updates.noComprobante = data.noComprobante;
  if (data.cuentaBancariaId !== undefined) updates.cuentaBancariaId = data.cuentaBancariaId;

  const [actualizado] = await db
    .update(recaudos)
    .set(updates)
    .where(and(eq(recaudos.tenantId, tenantId), eq(recaudos.numero, numero)))
    .returning();

  return c.json({
    numero: actualizado.numero,
    fecha: actualizado.fecha,
    codigoRubro: actualizado.codigoRubro,
    cuenta: null,
    valor: actualizado.valor,
    concepto: actualizado.concepto,
    noComprobante: actualizado.noComprobante,
    estado: actualizado.estado,
    cuentaBancariaId: actualizado.cuentaBancariaId,
  });
});

app.put('/:numero/anular', clerkAuth, requireEscritura, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  const recaudo = await db.query.recaudos.findFirst({
    where: and(eq(recaudos.tenantId, tenantId), eq(recaudos.numero, numero)),
  });

  if (!recaudo) {
    return c.json({ error: `Recaudo ${numero} no encontrado` }, 404);
  }

  await db
    .update(recaudos)
    .set({ estado: 'ANULADO' })
    .where(and(eq(recaudos.tenantId, tenantId), eq(recaudos.numero, numero)));

  return c.json({ message: `Recaudo ${numero} anulado` });
});

export default app;
