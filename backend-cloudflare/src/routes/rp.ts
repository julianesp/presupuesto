/**
 * RP (Registro Presupuestal) - Endpoints
 * Migrado de Python/FastAPI a TypeScript/Hono
 */

import { Hono } from 'hono';
import { clerkAuth, requireEscritura } from '../middleware/auth';
import { getDb } from '../db';
import { rp, cdp, terceros, obligaciones } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and, sql, desc } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

const createRpSchema = z.object({
  cdpNumero: z.number().int().positive(),
  nitTercero: z.string().min(1).max(50),
  valor: z.number().positive(),
  objeto: z.string().min(1).max(1000),
});

const updateRpSchema = z.object({
  valor: z.number().positive().optional(),
  objeto: z.string().min(1).max(1000).optional(),
  fuenteSifse: z.number().int().optional(),
  itemSifse: z.number().int().optional(),
});

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Calcula el saldo de un RP (valor - suma de obligaciones activas)
 */
async function calcularSaldoRp(
  db: any,
  tenantId: string,
  numeroRp: number
): Promise<number> {
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

/**
 * Calcula el saldo de un CDP
 */
async function calcularSaldoCdp(
  db: any,
  tenantId: string,
  numeroCdp: number
): Promise<number> {
  const cdpRecord = await db.query.cdp.findFirst({
    where: and(eq(cdp.tenantId, tenantId), eq(cdp.numero, numeroCdp)),
  });

  if (!cdpRecord) return 0;

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${rp.valor}), 0)`,
    })
    .from(rp)
    .where(
      and(
        eq(rp.tenantId, tenantId),
        eq(rp.numeroCdp, numeroCdp),
        sql`${rp.estado} != 'ANULADO'`
      )
    );

  const totalRps = Number(result[0]?.total || 0);
  return cdpRecord.valor - totalRps;
}

/**
 * Obtiene el siguiente número de RP
 */
async function obtenerSiguienteNumero(db: any, tenantId: string): Promise<number> {
  const ultimoRp = await db.query.rp.findFirst({
    where: eq(rp.tenantId, tenantId),
    orderBy: (rp: any, { desc }: any) => [desc(rp.numero)],
  });

  return (ultimoRp?.numero || 0) + 1;
}

/**
 * Actualiza el estado del RP según su saldo
 */
async function actualizarEstadoRp(
  db: any,
  tenantId: string,
  numeroRp: number
): Promise<void> {
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

/**
 * Actualiza el estado del CDP según su saldo
 */
async function actualizarEstadoCdp(
  db: any,
  tenantId: string,
  numeroCdp: number
): Promise<void> {
  const cdpRecord = await db.query.cdp.findFirst({
    where: and(eq(cdp.tenantId, tenantId), eq(cdp.numero, numeroCdp)),
  });

  if (!cdpRecord || cdpRecord.estado === 'ANULADO') return;

  const saldo = await calcularSaldoCdp(db, tenantId, numeroCdp);

  if (saldo <= 0 && cdpRecord.estado !== 'AGOTADO') {
    await db
      .update(cdp)
      .set({ estado: 'AGOTADO' })
      .where(and(eq(cdp.tenantId, tenantId), eq(cdp.numero, numeroCdp)));
  } else if (saldo > 0 && cdpRecord.estado === 'AGOTADO') {
    await db
      .update(cdp)
      .set({ estado: 'ACTIVO' })
      .where(and(eq(cdp.tenantId, tenantId), eq(cdp.numero, numeroCdp)));
  }
}

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * GET /api/rp
 * Listar todos los RPs (con filtro opcional por estado)
 */
app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);
  const estado = c.req.query('estado');

  let conditions = [eq(rp.tenantId, tenantId)];

  if (estado) {
    conditions.push(eq(rp.estado, estado));
  }

  const rps = await db.query.rp.findMany({
    where: and(...conditions),
    with: {
      tercero: true,
    },
    orderBy: (rp, { desc }) => [desc(rp.numero)],
  });

  // Calcular saldo para cada RP
  const result = await Promise.all(
    rps.map(async (r) => ({
      numero: r.numero,
      fecha: r.fecha,
      cdpNumero: r.numeroCdp,
      codigoRubro: r.codigoRubro,
      cuenta: null,
      nitTercero: r.nitTercero,
      nombreTercero: r.tercero?.nombre || null,
      valor: r.valor,
      objeto: r.objeto,
      estado: r.estado,
      fuenteSifse: r.fuenteSifse,
      itemSifse: r.itemSifse,
      saldo: await calcularSaldoRp(db, tenantId, r.numero),
    }))
  );

  return c.json(result);
});

/**
 * GET /api/rp/:numero
 * Obtener un RP específico
 */
app.get('/:numero', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  const rpRecord = await db.query.rp.findFirst({
    where: and(eq(rp.tenantId, tenantId), eq(rp.numero, numero)),
    with: {
      tercero: true,
    },
  });

  if (!rpRecord) {
    return c.json({ error: 'RP no encontrado' }, 404);
  }

  const saldo = await calcularSaldoRp(db, tenantId, numero);

  return c.json({
    numero: rpRecord.numero,
    fecha: rpRecord.fecha,
    cdpNumero: rpRecord.numeroCdp,
    codigoRubro: rpRecord.codigoRubro,
    cuenta: null,
    nitTercero: rpRecord.nitTercero,
    nombreTercero: rpRecord.tercero?.nombre || null,
    valor: rpRecord.valor,
    objeto: rpRecord.objeto,
    estado: rpRecord.estado,
    fuenteSifse: rpRecord.fuenteSifse,
    itemSifse: rpRecord.itemSifse,
    saldo,
  });
});

/**
 * POST /api/rp
 * Registrar un nuevo RP
 */
app.post('/', clerkAuth, requireEscritura, zValidator('json', createRpSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar que el CDP existe y está activo
  const cdpRecord = await db.query.cdp.findFirst({
    where: and(eq(cdp.tenantId, tenantId), eq(cdp.numero, data.cdpNumero)),
  });

  if (!cdpRecord) {
    return c.json({ error: `CDP ${data.cdpNumero} no encontrado` }, 400);
  }

  if (cdpRecord.estado === 'ANULADO') {
    return c.json({ error: `El CDP ${data.cdpNumero} está anulado` }, 400);
  }

  // Verificar que el tercero existe
  const tercero = await db.query.terceros.findFirst({
    where: and(
      eq(terceros.tenantId, tenantId),
      eq(terceros.nit, data.nitTercero)
    ),
  });

  if (!tercero) {
    return c.json({ error: `Tercero con NIT ${data.nitTercero} no encontrado` }, 400);
  }

  // Verificar saldo del CDP
  const saldoCdp = await calcularSaldoCdp(db, tenantId, data.cdpNumero);

  if (data.valor > saldoCdp) {
    return c.json(
      {
        error: `El valor (${data.valor.toFixed(2)}) supera el saldo del CDP (${saldoCdp.toFixed(2)})`,
      },
      400
    );
  }

  // Obtener siguiente número
  const numero = await obtenerSiguienteNumero(db, tenantId);

  // Fecha actual en formato YYYY-MM-DD
  const fecha = new Date().toISOString().split('T')[0];

  // Crear RP
  const [nuevoRp] = await db
    .insert(rp)
    .values({
      tenantId,
      numero,
      fecha,
      numeroCdp: data.cdpNumero,
      codigoRubro: cdpRecord.codigoRubro,
      nitTercero: data.nitTercero,
      objeto: data.objeto,
      valor: data.valor,
      estado: 'ACTIVO',
      fuenteSifse: cdpRecord.fuenteSifse,
      itemSifse: cdpRecord.itemSifse,
    })
    .returning();

  // Actualizar estado del CDP
  await actualizarEstadoCdp(db, tenantId, data.cdpNumero);

  return c.json(
    {
      numero: nuevoRp.numero,
      fecha: nuevoRp.fecha,
      cdpNumero: nuevoRp.numeroCdp,
      codigoRubro: nuevoRp.codigoRubro,
      cuenta: null,
      nitTercero: nuevoRp.nitTercero,
      nombreTercero: tercero.nombre,
      valor: nuevoRp.valor,
      objeto: nuevoRp.objeto,
      estado: nuevoRp.estado,
      fuenteSifse: nuevoRp.fuenteSifse,
      itemSifse: nuevoRp.itemSifse,
      saldo: nuevoRp.valor,
    },
    201
  );
});

/**
 * PUT /api/rp/:numero
 * Editar un RP existente
 */
app.put('/:numero', clerkAuth, requireEscritura, zValidator('json', updateRpSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar que el RP existe
  const rpRecord = await db.query.rp.findFirst({
    where: and(eq(rp.tenantId, tenantId), eq(rp.numero, numero)),
    with: {
      tercero: true,
    },
  });

  if (!rpRecord) {
    return c.json({ error: `RP ${numero} no encontrado` }, 404);
  }

  // Preparar actualizaciones
  const updates: any = {};

  // Si se actualiza el valor
  if (data.valor !== undefined) {
    // Calcular valor comprometido en obligaciones activas
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${obligaciones.valor}), 0)`,
      })
      .from(obligaciones)
      .where(
        and(
          eq(obligaciones.tenantId, tenantId),
          eq(obligaciones.numeroRp, numero),
          sql`${obligaciones.estado} != 'ANULADA'`
        )
      );

    const usadoEnObligaciones = Number(result[0]?.total || 0);

    if (data.valor < usadoEnObligaciones) {
      return c.json(
        {
          error: `El nuevo valor (${data.valor.toFixed(2)}) es menor que lo comprometido en obligaciones (${usadoEnObligaciones.toFixed(2)})`,
        },
        400
      );
    }

    // Verificar disponibilidad en el CDP (solo la diferencia)
    const diferencia = data.valor - rpRecord.valor;
    if (diferencia > 0) {
      const saldoCdp = await calcularSaldoCdp(db, tenantId, rpRecord.numeroCdp);
      if (diferencia > saldoCdp) {
        return c.json(
          {
            error: `El incremento (${diferencia.toFixed(2)}) supera el saldo del CDP (${saldoCdp.toFixed(2)})`,
          },
          400
        );
      }
    }

    updates.valor = data.valor;
  }

  if (data.objeto !== undefined) updates.objeto = data.objeto;
  if (data.fuenteSifse !== undefined) updates.fuenteSifse = data.fuenteSifse;
  if (data.itemSifse !== undefined) updates.itemSifse = data.itemSifse;

  // Actualizar RP
  const [actualizado] = await db
    .update(rp)
    .set(updates)
    .where(and(eq(rp.tenantId, tenantId), eq(rp.numero, numero)))
    .returning();

  // Actualizar estados si se cambió el valor
  if (data.valor !== undefined) {
    await actualizarEstadoRp(db, tenantId, numero);
    await actualizarEstadoCdp(db, tenantId, rpRecord.numeroCdp);
  }

  const saldo = await calcularSaldoRp(db, tenantId, numero);

  return c.json({
    numero: actualizado.numero,
    fecha: actualizado.fecha,
    cdpNumero: actualizado.numeroCdp,
    codigoRubro: actualizado.codigoRubro,
    cuenta: null,
    nitTercero: actualizado.nitTercero,
    nombreTercero: rpRecord.tercero?.nombre || null,
    valor: actualizado.valor,
    objeto: actualizado.objeto,
    estado: actualizado.estado,
    fuenteSifse: actualizado.fuenteSifse,
    itemSifse: actualizado.itemSifse,
    saldo,
  });
});

/**
 * PUT /api/rp/:numero/anular
 * Anular un RP
 */
app.put('/:numero/anular', clerkAuth, requireEscritura, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  // Verificar que el RP existe
  const rpRecord = await db.query.rp.findFirst({
    where: and(eq(rp.tenantId, tenantId), eq(rp.numero, numero)),
  });

  if (!rpRecord) {
    return c.json({ error: `RP ${numero} no encontrado` }, 404);
  }

  // Verificar que no tenga obligaciones activas
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(obligaciones)
    .where(
      and(
        eq(obligaciones.tenantId, tenantId),
        eq(obligaciones.numeroRp, numero),
        sql`${obligaciones.estado} != 'ANULADA'`
      )
    );

  const obligacionesActivas = Number(result[0]?.count || 0);

  if (obligacionesActivas > 0) {
    return c.json(
      {
        error: `No se puede anular el RP ${numero}: tiene ${obligacionesActivas} obligacion(es) activa(s)`,
      },
      400
    );
  }

  // Anular el RP
  await db
    .update(rp)
    .set({ estado: 'ANULADO' })
    .where(and(eq(rp.tenantId, tenantId), eq(rp.numero, numero)));

  // Actualizar estado del CDP
  await actualizarEstadoCdp(db, tenantId, rpRecord.numeroCdp);

  return c.json({ message: `RP ${numero} anulado` });
});

export default app;
