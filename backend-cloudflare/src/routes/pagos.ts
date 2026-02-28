/**
 * Pagos - Endpoints
 * Migrado de Python/FastAPI a TypeScript/Hono
 */

import { Hono } from 'hono';
import { clerkAuth, requireEscritura } from '../middleware/auth';
import { getDb } from '../db';
import { pagos, obligaciones, terceros } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and, sql } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const createPagoSchema = z.object({
  obligacionNumero: z.number().int().positive(),
  valor: z.number().positive(),
  concepto: z.string().max(500).default(''),
  medioPago: z.string().max(50).default('Transferencia'),
  noComprobante: z.string().max(100).default(''),
  cuentaBancariaId: z.number().int().default(0),
});

const updatePagoSchema = z.object({
  valor: z.number().positive().optional(),
  concepto: z.string().max(500).optional(),
  medioPago: z.string().max(50).optional(),
  noComprobante: z.string().max(100).optional(),
  cuentaBancariaId: z.number().int().optional(),
  fuenteSifse: z.number().int().optional(),
  itemSifse: z.number().int().optional(),
});

async function calcularSaldoObligacion(
  db: any,
  tenantId: string,
  numeroObl: number
): Promise<number> {
  const obl = await db.query.obligaciones.findFirst({
    where: and(eq(obligaciones.tenantId, tenantId), eq(obligaciones.numero, numeroObl)),
  });

  if (!obl) return 0;

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${pagos.valor}), 0)`,
    })
    .from(pagos)
    .where(
      and(
        eq(pagos.tenantId, tenantId),
        eq(pagos.numeroObligacion, numeroObl),
        sql`${pagos.estado} != 'ANULADO'`
      )
    );

  const totalPagos = Number(result[0]?.total || 0);
  return obl.valor - totalPagos;
}

async function obtenerSiguienteNumero(db: any, tenantId: string): Promise<number> {
  const ultimoPago = await db.query.pagos.findFirst({
    where: eq(pagos.tenantId, tenantId),
    orderBy: (pagos: any, { desc }: any) => [desc(pagos.numero)],
  });

  return (ultimoPago?.numero || 0) + 1;
}

app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);
  const estado = c.req.query('estado');

  let conditions = [eq(pagos.tenantId, tenantId)];

  if (estado) {
    conditions.push(eq(pagos.estado, estado));
  }

  const pagosList = await db.query.pagos.findMany({
    where: and(...conditions),
    with: {
      tercero: true,
    },
    orderBy: (pagos, { desc }) => [desc(pagos.numero)],
  });

  return c.json(pagosList.map((p) => ({
    numero: p.numero,
    fecha: p.fecha,
    obligacionNumero: p.numeroObligacion,
    codigoRubro: p.codigoRubro,
    cuenta: null,
    nitTercero: p.nitTercero,
    nombreTercero: p.tercero?.nombre || null,
    valor: p.valor,
    concepto: p.concepto,
    medioPago: p.medioPago,
    noComprobante: p.noComprobante,
    cuentaBancariaId: p.cuentaBancariaId,
    fuenteSifse: p.fuenteSifse,
    itemSifse: p.itemSifse,
    estado: p.estado,
  })));
});

app.get('/:numero', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  const pago = await db.query.pagos.findFirst({
    where: and(eq(pagos.tenantId, tenantId), eq(pagos.numero, numero)),
    with: {
      tercero: true,
    },
  });

  if (!pago) {
    return c.json({ error: 'Pago no encontrado' }, 404);
  }

  return c.json({
    numero: pago.numero,
    fecha: pago.fecha,
    obligacionNumero: pago.numeroObligacion,
    codigoRubro: pago.codigoRubro,
    cuenta: null,
    nitTercero: pago.nitTercero,
    nombreTercero: pago.tercero?.nombre || null,
    valor: pago.valor,
    concepto: pago.concepto,
    medioPago: pago.medioPago,
    noComprobante: pago.noComprobante,
    cuentaBancariaId: pago.cuentaBancariaId,
    fuenteSifse: pago.fuenteSifse,
    itemSifse: pago.itemSifse,
    estado: pago.estado,
  });
});

app.post('/', clerkAuth, requireEscritura, zValidator('json', createPagoSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  const obl = await db.query.obligaciones.findFirst({
    where: and(eq(obligaciones.tenantId, tenantId), eq(obligaciones.numero, data.obligacionNumero)),
  });

  if (!obl) {
    return c.json({ error: `Obligación ${data.obligacionNumero} no encontrada` }, 400);
  }

  if (obl.estado === 'ANULADA') {
    return c.json({ error: `Obligación ${data.obligacionNumero} está ANULADA` }, 400);
  }

  const saldoObl = await calcularSaldoObligacion(db, tenantId, data.obligacionNumero);

  if (data.valor > saldoObl) {
    return c.json(
      {
        error: `El valor (${data.valor.toFixed(2)}) supera el saldo de la obligación (${saldoObl.toFixed(2)})`,
      },
      400
    );
  }

  const numero = await obtenerSiguienteNumero(db, tenantId);
  const fecha = new Date().toISOString().split('T')[0];

  const [nuevoPago] = await db
    .insert(pagos)
    .values({
      tenantId,
      numero,
      fecha,
      numeroObligacion: data.obligacionNumero,
      codigoRubro: obl.codigoRubro,
      nitTercero: obl.nitTercero,
      valor: data.valor,
      concepto: data.concepto,
      medioPago: data.medioPago,
      noComprobante: data.noComprobante,
      cuentaBancariaId: data.cuentaBancariaId,
      estado: 'ACTIVO',
      fuenteSifse: obl.fuenteSifse,
      itemSifse: obl.itemSifse,
    })
    .returning();

  return c.json(
    {
      numero: nuevoPago.numero,
      fecha: nuevoPago.fecha,
      obligacionNumero: nuevoPago.numeroObligacion,
      codigoRubro: nuevoPago.codigoRubro,
      cuenta: null,
      nitTercero: nuevoPago.nitTercero,
      nombreTercero: null,
      valor: nuevoPago.valor,
      concepto: nuevoPago.concepto,
      medioPago: nuevoPago.medioPago,
      noComprobante: nuevoPago.noComprobante,
      cuentaBancariaId: nuevoPago.cuentaBancariaId,
      fuenteSifse: nuevoPago.fuenteSifse,
      itemSifse: nuevoPago.itemSifse,
      estado: nuevoPago.estado,
    },
    201
  );
});

app.put('/:numero', clerkAuth, requireEscritura, zValidator('json', updatePagoSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const data = c.req.valid('json');
  const db = getDb(c.env);

  const pago = await db.query.pagos.findFirst({
    where: and(eq(pagos.tenantId, tenantId), eq(pagos.numero, numero)),
  });

  if (!pago) {
    return c.json({ error: `Pago ${numero} no encontrado` }, 404);
  }

  const updates: any = {};

  if (data.valor !== undefined) updates.valor = data.valor;
  if (data.concepto !== undefined) updates.concepto = data.concepto;
  if (data.medioPago !== undefined) updates.medioPago = data.medioPago;
  if (data.noComprobante !== undefined) updates.noComprobante = data.noComprobante;
  if (data.cuentaBancariaId !== undefined) updates.cuentaBancariaId = data.cuentaBancariaId;
  if (data.fuenteSifse !== undefined) updates.fuenteSifse = data.fuenteSifse;
  if (data.itemSifse !== undefined) updates.itemSifse = data.itemSifse;

  const [actualizado] = await db
    .update(pagos)
    .set(updates)
    .where(and(eq(pagos.tenantId, tenantId), eq(pagos.numero, numero)))
    .returning();

  return c.json({
    numero: actualizado.numero,
    fecha: actualizado.fecha,
    obligacionNumero: actualizado.numeroObligacion,
    codigoRubro: actualizado.codigoRubro,
    cuenta: null,
    nitTercero: actualizado.nitTercero,
    nombreTercero: null,
    valor: actualizado.valor,
    concepto: actualizado.concepto,
    medioPago: actualizado.medioPago,
    noComprobante: actualizado.noComprobante,
    cuentaBancariaId: actualizado.cuentaBancariaId,
    fuenteSifse: actualizado.fuenteSifse,
    itemSifse: actualizado.itemSifse,
    estado: actualizado.estado,
  });
});

app.put('/:numero/anular', clerkAuth, requireEscritura, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  const pago = await db.query.pagos.findFirst({
    where: and(eq(pagos.tenantId, tenantId), eq(pagos.numero, numero)),
  });

  if (!pago) {
    return c.json({ error: `Pago ${numero} no encontrado` }, 404);
  }

  await db
    .update(pagos)
    .set({ estado: 'ANULADO' })
    .where(and(eq(pagos.tenantId, tenantId), eq(pagos.numero, numero)));

  return c.json({ message: `Pago ${numero} anulado` });
});

export default app;
