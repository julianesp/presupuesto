/**
 * Rutas de autenticación
 */

import { Hono } from 'hono';
import { clerkAuth } from '../middleware/auth';
import { getDb } from '../db';
import type { Env, Variables } from '../types/bindings';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/auth/me
 * Obtener información del usuario autenticado
 */
app.get('/me', clerkAuth, async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env);

  const user = await db.query.users.findFirst({
    where: eq(users.id, parseInt(userId)),
    with: {
      tenant: true,
    },
  });

  if (!user) {
    return c.json({ error: 'Usuario no encontrado' }, 404);
  }

  return c.json({
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    cargo: user.cargo,
    rol: user.rol,
    activo: user.activo,
    tenant: {
      id: user.tenant.id,
      nombre: user.tenant.nombre,
      nit: user.tenant.nit,
      vigenciaActual: user.tenant.vigenciaActual,
    },
  });
});

export default app;
