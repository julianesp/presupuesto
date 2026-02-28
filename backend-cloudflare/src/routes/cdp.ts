/**
 * CDP (Certificados de Disponibilidad Presupuestal) - Endpoints
 * Migrado de Python/FastAPI a TypeScript/Hono
 */

import { Hono } from 'hono';
import { clerkAuth, requireEscritura } from '../middleware/auth';
import { getDb } from '../db';
import { cdp, rubrosGastos, rp } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and, sql, desc } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

const createCdpSchema = z.object({
  codigoRubro: z.string().min(1).max(50),
  objeto: z.string().min(1).max(1000),
  valor: z.number().positive(),
  fuenteSifse: z.number().int().default(0),
  itemSifse: z.number().int().default(0),
});

const updateCdpSchema = z.object({
  valor: z.number().positive().optional(),
  objeto: z.string().min(1).max(1000).optional(),
  fuenteSifse: z.number().int().optional(),
  itemSifse: z.number().int().optional(),
});

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Calcula el saldo de un CDP (valor - suma de RPs activos)
 */
async function calcularSaldoCdp(
  db: any,
  tenantId: string,
  numeroCdp: number
): Promise<number> {
  // Obtener el CDP
  const cdpRecord = await db.query.cdp.findFirst({
    where: and(eq(cdp.tenantId, tenantId), eq(cdp.numero, numeroCdp)),
  });

  if (!cdpRecord) return 0;

  // Sumar todos los RPs activos vinculados
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
 * Calcula el saldo disponible de un rubro
 */
async function calcularSaldoRubro(
  db: any,
  tenantId: string,
  codigoRubro: string
): Promise<number> {
  const rubro = await db.query.rubrosGastos.findFirst({
    where: and(
      eq(rubrosGastos.tenantId, tenantId),
      eq(rubrosGastos.codigo, codigoRubro)
    ),
  });

  if (!rubro) return 0;

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
 * Obtiene el siguiente número de CDP
 */
async function obtenerSiguienteNumero(db: any, tenantId: string): Promise<number> {
  const ultimoCdp = await db.query.cdp.findFirst({
    where: eq(cdp.tenantId, tenantId),
    orderBy: (cdp: any, { desc }: any) => [desc(cdp.numero)],
  });

  return (ultimoCdp?.numero || 0) + 1;
}

/**
 * Actualiza el estado del CDP según su saldo
 */
async function actualizarEstado(
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
 * GET /api/cdp
 * Listar todos los CDPs (con filtro opcional por estado)
 */
app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);
  const estado = c.req.query('estado');

  let conditions = [eq(cdp.tenantId, tenantId)];

  if (estado) {
    conditions.push(eq(cdp.estado, estado));
  }

  const cdps = await db.query.cdp.findMany({
    where: and(...conditions),
    with: {
      rubro: true,
    },
    orderBy: (cdp, { desc }) => [desc(cdp.numero)],
  });

  // Calcular saldo para cada CDP
  const result = await Promise.all(
    cdps.map(async (c) => ({
      numero: c.numero,
      fecha: c.fecha,
      codigoRubro: c.codigoRubro,
      cuenta: c.rubro?.cuenta || null,
      objeto: c.objeto,
      valor: c.valor,
      estado: c.estado,
      fuenteSifse: c.fuenteSifse,
      itemSifse: c.itemSifse,
      saldo: await calcularSaldoCdp(db, tenantId, c.numero),
    }))
  );

  return c.json(result);
});

/**
 * GET /api/cdp/:numero
 * Obtener un CDP específico
 */
app.get('/:numero', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  const cdpRecord = await db.query.cdp.findFirst({
    where: and(eq(cdp.tenantId, tenantId), eq(cdp.numero, numero)),
    with: {
      rubro: true,
    },
  });

  if (!cdpRecord) {
    return c.json({ error: 'CDP no encontrado' }, 404);
  }

  const saldo = await calcularSaldoCdp(db, tenantId, numero);

  return c.json({
    numero: cdpRecord.numero,
    fecha: cdpRecord.fecha,
    codigoRubro: cdpRecord.codigoRubro,
    cuenta: cdpRecord.rubro?.cuenta || null,
    objeto: cdpRecord.objeto,
    valor: cdpRecord.valor,
    estado: cdpRecord.estado,
    fuenteSifse: cdpRecord.fuenteSifse,
    itemSifse: cdpRecord.itemSifse,
    saldo,
  });
});

/**
 * POST /api/cdp
 * Registrar un nuevo CDP
 */
app.post('/', clerkAuth, requireEscritura, zValidator('json', createCdpSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar que el rubro existe
  const rubro = await db.query.rubrosGastos.findFirst({
    where: and(
      eq(rubrosGastos.tenantId, tenantId),
      eq(rubrosGastos.codigo, data.codigoRubro)
    ),
  });

  if (!rubro) {
    return c.json({ error: 'Rubro no encontrado' }, 400);
  }

  // Verificar saldo disponible del rubro
  const saldoRubro = await calcularSaldoRubro(db, tenantId, data.codigoRubro);

  if (data.valor > saldoRubro) {
    return c.json(
      {
        error: `El valor (${data.valor.toFixed(2)}) supera el saldo disponible del rubro (${saldoRubro.toFixed(2)})`,
      },
      400
    );
  }

  // Obtener siguiente número
  const numero = await obtenerSiguienteNumero(db, tenantId);

  // Fecha actual en formato YYYY-MM-DD
  const fecha = new Date().toISOString().split('T')[0];

  // Crear CDP
  const [nuevoCdp] = await db
    .insert(cdp)
    .values({
      tenantId,
      numero,
      fecha,
      codigoRubro: data.codigoRubro,
      objeto: data.objeto,
      valor: data.valor,
      estado: 'ACTIVO',
      fuenteSifse: data.fuenteSifse,
      itemSifse: data.itemSifse,
    })
    .returning();

  return c.json(
    {
      numero: nuevoCdp.numero,
      fecha: nuevoCdp.fecha,
      codigoRubro: nuevoCdp.codigoRubro,
      cuenta: rubro.cuenta,
      objeto: nuevoCdp.objeto,
      valor: nuevoCdp.valor,
      estado: nuevoCdp.estado,
      fuenteSifse: nuevoCdp.fuenteSifse,
      itemSifse: nuevoCdp.itemSifse,
      saldo: nuevoCdp.valor,
    },
    201
  );
});

/**
 * PUT /api/cdp/:numero
 * Editar un CDP existente
 */
app.put('/:numero', clerkAuth, requireEscritura, zValidator('json', updateCdpSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar que el CDP existe
  const cdpRecord = await db.query.cdp.findFirst({
    where: and(eq(cdp.tenantId, tenantId), eq(cdp.numero, numero)),
    with: {
      rubro: true,
    },
  });

  if (!cdpRecord) {
    return c.json({ error: `CDP ${numero} no encontrado` }, 404);
  }

  // Preparar actualizaciones
  const updates: any = {};

  // Si se actualiza el valor
  if (data.valor !== undefined) {
    // Calcular valor comprometido en RPs activos
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${rp.valor}), 0)`,
      })
      .from(rp)
      .where(
        and(
          eq(rp.tenantId, tenantId),
          eq(rp.numeroCdp, numero),
          sql`${rp.estado} != 'ANULADO'`
        )
      );

    const usadoEnRps = Number(result[0]?.total || 0);

    if (data.valor < usadoEnRps) {
      return c.json(
        {
          error: `El nuevo valor (${data.valor.toFixed(2)}) es menor que lo comprometido en RPs (${usadoEnRps.toFixed(2)})`,
        },
        400
      );
    }

    // Verificar disponibilidad en el rubro (solo la diferencia)
    const diferencia = data.valor - cdpRecord.valor;
    if (diferencia > 0) {
      const saldoRubro = await calcularSaldoRubro(db, tenantId, cdpRecord.codigoRubro);
      if (diferencia > saldoRubro) {
        return c.json(
          {
            error: `El incremento (${diferencia.toFixed(2)}) supera el saldo disponible del rubro (${saldoRubro.toFixed(2)})`,
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

  // Actualizar CDP
  const [actualizado] = await db
    .update(cdp)
    .set(updates)
    .where(and(eq(cdp.tenantId, tenantId), eq(cdp.numero, numero)))
    .returning();

  // Actualizar estado si se cambió el valor
  if (data.valor !== undefined) {
    await actualizarEstado(db, tenantId, numero);
  }

  const saldo = await calcularSaldoCdp(db, tenantId, numero);

  return c.json({
    numero: actualizado.numero,
    fecha: actualizado.fecha,
    codigoRubro: actualizado.codigoRubro,
    cuenta: cdpRecord.rubro?.cuenta || null,
    objeto: actualizado.objeto,
    valor: actualizado.valor,
    estado: actualizado.estado,
    fuenteSifse: actualizado.fuenteSifse,
    itemSifse: actualizado.itemSifse,
    saldo,
  });
});

/**
 * PUT /api/cdp/:numero/anular
 * Anular un CDP
 */
app.put('/:numero/anular', clerkAuth, requireEscritura, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  // Verificar que el CDP existe
  const cdpRecord = await db.query.cdp.findFirst({
    where: and(eq(cdp.tenantId, tenantId), eq(cdp.numero, numero)),
  });

  if (!cdpRecord) {
    return c.json({ error: `CDP ${numero} no encontrado` }, 404);
  }

  // Verificar que no tenga RPs activos
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(rp)
    .where(
      and(
        eq(rp.tenantId, tenantId),
        eq(rp.numeroCdp, numero),
        sql`${rp.estado} != 'ANULADO'`
      )
    );

  const rpsActivos = Number(result[0]?.count || 0);

  if (rpsActivos > 0) {
    return c.json(
      {
        error: `No se puede anular el CDP ${numero}: tiene ${rpsActivos} RP(s) activo(s)`,
      },
      400
    );
  }

  // Anular el CDP
  await db
    .update(cdp)
    .set({ estado: 'ANULADO' })
    .where(and(eq(cdp.tenantId, tenantId), eq(cdp.numero, numero)));

  return c.json({ message: `CDP ${numero} anulado` });
});

export default app;
