/**
 * Config - Endpoints
 * Configuración del sistema por tenant (modelo clave-valor)
 */

import { Hono } from 'hono';
import { clerkAuth, requireTesorero } from '../middleware/auth';
import { getDb } from '../db';
import { config } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const updateConfigSchema = z.object({
  vigencia: z.string().max(4).optional(),
  institucion: z.string().max(200).optional(),
  nit_institucion: z.string().max(50).optional(),
  rector: z.string().max(200).optional(),
  tesorero: z.string().max(200).optional(),
  codigo_dane: z.string().max(50).optional(),
});

// Helper: obtener todas las configuraciones como diccionario
async function getAllConfig(db: any, tenantId: string): Promise<Record<string, string>> {
  const rows = await db.query.config.findMany({
    where: eq(config.tenantId, tenantId),
  });
  const configMap: Record<string, string> = {};
  for (const row of rows) {
    configMap[row.clave] = row.valor || '';
  }
  return configMap;
}

// Helper: establecer un valor de configuración
async function setConfig(db: any, tenantId: string, clave: string, valor: string) {
  const existing = await db.query.config.findFirst({
    where: and(eq(config.tenantId, tenantId), eq(config.clave, clave)),
  });

  if (existing) {
    await db
      .update(config)
      .set({ valor })
      .where(and(eq(config.tenantId, tenantId), eq(config.clave, clave)));
  } else {
    await db.insert(config).values({ tenantId, clave, valor });
  }
}

app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);

  const allConfig = await getAllConfig(db, tenantId);

  // Si no existe config de vigencia, crear una por defecto
  if (!allConfig.vigencia) {
    const currentYear = new Date().getFullYear().toString();
    await setConfig(db, tenantId, 'vigencia', currentYear);
    allConfig.vigencia = currentYear;
  }

  // Si no existe mes_actual, crear uno por defecto
  if (!allConfig.mes_actual) {
    await setConfig(db, tenantId, 'mes_actual', '1');
    allConfig.mes_actual = '1';
  }

  return c.json({
    vigencia: allConfig.vigencia || '',
    institucion: allConfig.institucion || '',
    nit_institucion: allConfig.nit_institucion || '',
    rector: allConfig.rector || '',
    tesorero: allConfig.tesorero || '',
    mes_actual: allConfig.mes_actual || '1',
    codigo_dane: allConfig.codigo_dane || '',
  });
});

app.put('/', clerkAuth, requireTesorero, zValidator('json', updateConfigSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Actualizar cada configuración
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      await setConfig(db, tenantId, key, value);
    }
  }

  return c.json({ message: 'Configuración actualizada exitosamente' });
});

export default app;
