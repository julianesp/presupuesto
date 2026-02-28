/**
 * Obligaciones - Endpoints
 * Migrado de Python/FastAPI a TypeScript/Hono
 */

import { Hono } from 'hono';
import { clerkAuth, requireEscritura } from '../middleware/auth';
import { getDb } from '../db';
import { obligaciones, rp, pagos, terceros } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and, sql, desc } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

const createObligacionSchema = z.object({
  rpNumero: z.number().int().positive(),
  valor: z.number().positive(),
  factura: z.string().max(500).default(''),
});

const updateObligacionSchema = z.object({
  valor: z.number().positive().optional(),
  factura: z.string().max(500).optional(),
  fuenteSifse: z.number().int().optional(),
  itemSifse: z.number().int().optional(),
});

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

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

async function calcularSaldoRp(db: any, tenantId: string, numeroRp: number): Promise<number> {
  const rpRecord = await db.query.rp.findFirst({
    where: and(eq(rp.tenantId, tenantId), eq(rp.numero, numeroRp)),
  });

  if (!rpRecord) return 0;

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${obligaciones.valor}), 0)`,
    })
    .from(obligaciones)
    .where(
      and(
        eq(obligaciones.tenantId, tenantId),
        eq(obligaciones.numeroRp, numeroRp),
        sql`${obligaciones.estado} != 'ANULADA'`
      )
    );

  const totalObligaciones = Number(result[0]?.total || 0);
  return rpRecord.valor - totalObligaciones;
}

async function obtenerSiguienteNumero(db: any, tenantId: string): Promise<number> {
  const ultimaObl = await db.query.obligaciones.findFirst({
    where: eq(obligaciones.tenantId, tenantId),
    orderBy: (obligaciones: any, { desc }: any) => [desc(obligaciones.numero)],
  });

  return (ultimaObl?.numero || 0) + 1;
}

async function actualizarEstadoRp(db: any, tenantId: string, numeroRp: number): Promise<void> {
  const rpRecord = await db.query.rp.findFirst({
    where: and(eq(rp.tenantId, tenantId), eq(rp.numero, numeroRp)),
  });

  if (!rpRecord || rpRecord.estado === 'ANULADO') return;

  const saldo = await calcularSaldoRp(db, tenantId, numeroRp);

  if (saldo <= 0 && rpRecord.estado !== 'AGOTADO') {
    await db
      .update(rp)
      .set({ estado: 'AGOTADO' })
      .where(and(eq(rp.tenantId, tenantId), eq(rp.numero, numeroRp)));
  } else if (saldo > 0 && rpRecord.estado === 'AGOTADO') {
    await db
      .update(rp)
      .set({ estado: 'ACTIVO' })
      .where(and(eq(rp.tenantId, tenantId), eq(rp.numero, numeroRp)));
  }
}

// ============================================================================
// ENDPOINTS
// ============================================================================

app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);
  const estado = c.req.query('estado');

  let conditions = [eq(obligaciones.tenantId, tenantId)];

  if (estado) {
    conditions.push(eq(obligaciones.estado, estado));
  }

  const obls = await db.query.obligaciones.findMany({
    where: and(...conditions),
    with: {
      tercero: true,
    },
    orderBy: (obligaciones, { desc }) => [desc(obligaciones.numero)],
  });

  const result = await Promise.all(
    obls.map(async (o) => ({
      numero: o.numero,
      fecha: o.fecha,
      rpNumero: o.numeroRp,
      codigoRubro: o.codigoRubro,
      cuenta: null,
      nitTercero: o.nitTercero,
      nombreTercero: o.tercero?.nombre || null,
      valor: o.valor,
      factura: o.factura,
      estado: o.estado,
      fuenteSifse: o.fuenteSifse,
      itemSifse: o.itemSifse,
      saldo: await calcularSaldoObligacion(db, tenantId, o.numero),
    }))
  );

  return c.json(result);
});

app.get('/:numero', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  const obl = await db.query.obligaciones.findFirst({
    where: and(eq(obligaciones.tenantId, tenantId), eq(obligaciones.numero, numero)),
    with: {
      tercero: true,
    },
  });

  if (!obl) {
    return c.json({ error: 'Obligación no encontrada' }, 404);
  }

  const saldo = await calcularSaldoObligacion(db, tenantId, numero);

  return c.json({
    numero: obl.numero,
    fecha: obl.fecha,
    rpNumero: obl.numeroRp,
    codigoRubro: obl.codigoRubro,
    cuenta: null,
    nitTercero: obl.nitTercero,
    nombreTercero: obl.tercero?.nombre || null,
    valor: obl.valor,
    factura: obl.factura,
    estado: obl.estado,
    fuenteSifse: obl.fuenteSifse,
    itemSifse: obl.itemSifse,
    saldo,
  });
});

app.post('/', clerkAuth, requireEscritura, zValidator('json', createObligacionSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  const rpRecord = await db.query.rp.findFirst({
    where: and(eq(rp.tenantId, tenantId), eq(rp.numero, data.rpNumero)),
  });

  if (!rpRecord) {
    return c.json({ error: `RP ${data.rpNumero} no encontrado` }, 400);
  }

  if (rpRecord.estado === 'ANULADO') {
    return c.json({ error: `RP ${data.rpNumero} está ANULADO, no se puede obligar` }, 400);
  }

  const saldoRp = await calcularSaldoRp(db, tenantId, data.rpNumero);

  if (data.valor > saldoRp) {
    return c.json(
      {
        error: `El valor (${data.valor.toFixed(2)}) supera el saldo disponible del RP (${saldoRp.toFixed(2)})`,
      },
      400
    );
  }

  const numero = await obtenerSiguienteNumero(db, tenantId);
  const fecha = new Date().toISOString().split('T')[0];

  const [nuevaObl] = await db
    .insert(obligaciones)
    .values({
      tenantId,
      numero,
      fecha,
      numeroRp: data.rpNumero,
      codigoRubro: rpRecord.codigoRubro,
      nitTercero: rpRecord.nitTercero,
      valor: data.valor,
      factura: data.factura,
      estado: 'ACTIVO',
      fuenteSifse: rpRecord.fuenteSifse,
      itemSifse: rpRecord.itemSifse,
    })
    .returning();

  await actualizarEstadoRp(db, tenantId, data.rpNumero);

  return c.json(
    {
      numero: nuevaObl.numero,
      fecha: nuevaObl.fecha,
      rpNumero: nuevaObl.numeroRp,
      codigoRubro: nuevaObl.codigoRubro,
      cuenta: null,
      nitTercero: nuevaObl.nitTercero,
      nombreTercero: null,
      valor: nuevaObl.valor,
      factura: nuevaObl.factura,
      estado: nuevaObl.estado,
      fuenteSifse: nuevaObl.fuenteSifse,
      itemSifse: nuevaObl.itemSifse,
      saldo: nuevaObl.valor,
    },
    201
  );
});

app.put('/:numero', clerkAuth, requireEscritura, zValidator('json', updateObligacionSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const data = c.req.valid('json');
  const db = getDb(c.env);

  const obl = await db.query.obligaciones.findFirst({
    where: and(eq(obligaciones.tenantId, tenantId), eq(obligaciones.numero, numero)),
  });

  if (!obl) {
    return c.json({ error: `Obligación ${numero} no encontrada` }, 404);
  }

  const updates: any = {};

  if (data.valor !== undefined) {
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${pagos.valor}), 0)`,
      })
      .from(pagos)
      .where(
        and(
          eq(pagos.tenantId, tenantId),
          eq(pagos.numeroObligacion, numero),
          sql`${pagos.estado} != 'ANULADO'`
        )
      );

    const usadoEnPagos = Number(result[0]?.total || 0);

    if (data.valor < usadoEnPagos) {
      return c.json(
        {
          error: `El nuevo valor (${data.valor.toFixed(2)}) es menor que lo pagado (${usadoEnPagos.toFixed(2)})`,
        },
        400
      );
    }

    const diferencia = data.valor - obl.valor;
    if (diferencia > 0) {
      const saldoRp = await calcularSaldoRp(db, tenantId, obl.numeroRp);
      if (diferencia > saldoRp) {
        return c.json(
          {
            error: `El incremento (${diferencia.toFixed(2)}) supera el saldo del RP (${saldoRp.toFixed(2)})`,
          },
          400
        );
      }
    }

    updates.valor = data.valor;
  }

  if (data.factura !== undefined) updates.factura = data.factura;
  if (data.fuenteSifse !== undefined) updates.fuenteSifse = data.fuenteSifse;
  if (data.itemSifse !== undefined) updates.itemSifse = data.itemSifse;

  const [actualizado] = await db
    .update(obligaciones)
    .set(updates)
    .where(and(eq(obligaciones.tenantId, tenantId), eq(obligaciones.numero, numero)))
    .returning();

  if (data.valor !== undefined) {
    await actualizarEstadoRp(db, tenantId, obl.numeroRp);
  }

  const saldo = await calcularSaldoObligacion(db, tenantId, numero);

  return c.json({
    numero: actualizado.numero,
    fecha: actualizado.fecha,
    rpNumero: actualizado.numeroRp,
    codigoRubro: actualizado.codigoRubro,
    cuenta: null,
    nitTercero: actualizado.nitTercero,
    nombreTercero: null,
    valor: actualizado.valor,
    factura: actualizado.factura,
    estado: actualizado.estado,
    fuenteSifse: actualizado.fuenteSifse,
    itemSifse: actualizado.itemSifse,
    saldo,
  });
});

app.put('/:numero/anular', clerkAuth, requireEscritura, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  const obl = await db.query.obligaciones.findFirst({
    where: and(eq(obligaciones.tenantId, tenantId), eq(obligaciones.numero, numero)),
  });

  if (!obl) {
    return c.json({ error: `Obligación ${numero} no encontrada` }, 404);
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(pagos)
    .where(
      and(
        eq(pagos.tenantId, tenantId),
        eq(pagos.numeroObligacion, numero),
        sql`${pagos.estado} != 'ANULADO'`
      )
    );

  const pagosActivos = Number(result[0]?.count || 0);

  if (pagosActivos > 0) {
    return c.json(
      {
        error: `No se puede anular la obligación ${numero}: tiene ${pagosActivos} pago(s) activo(s)`,
      },
      400
    );
  }

  await db
    .update(obligaciones)
    .set({ estado: 'ANULADA' })
    .where(and(eq(obligaciones.tenantId, tenantId), eq(obligaciones.numero, numero)));

  await actualizarEstadoRp(db, tenantId, obl.numeroRp);

  return c.json({ message: `Obligación ${numero} anulada` });
});

export default app;
