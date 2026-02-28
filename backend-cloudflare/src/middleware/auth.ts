/**
 * Middleware de autenticación con Clerk
 */

import { createMiddleware } from 'hono/factory';
import { verifyToken } from '@clerk/backend';
import type { Env, Variables } from '../types/bindings';
import { getDb } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware para verificar token de Clerk y obtener usuario
 */
export const clerkAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    try {
      const authHeader = c.req.header('Authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'No autorizado' }, 401);
      }

      const token = authHeader.substring(7);
      const payload = await verifyToken(token, {
        secretKey: c.env.CLERK_SECRET_KEY,
      });

      if (!payload || !payload.sub) {
        return c.json({ error: 'Token inválido' }, 401);
      }

      // El sub de Clerk contiene el ID del usuario
      const clerkUserId = payload.sub;

      // Intentar obtener el email de diferentes campos del payload
      // Clerk puede poner el email en diferentes lugares dependiendo de la configuración
      let email =
        (payload.email as string) ||
        (payload.email_address as string) ||
        (payload.primary_email_address as string) ||
        '';

      // Si no hay email en el token, necesitamos obtenerlo de Clerk
      if (!email && clerkUserId) {
        // Log para debug
        console.log('Token payload keys:', Object.keys(payload));
        console.log('Payload completo:', JSON.stringify(payload));
        return c.json({
          error: 'Email no encontrado en el token. Por favor, configura el JWT template en Clerk para incluir el email.',
          debug: Object.keys(payload)
        }, 401);
      }

      const db = getDb(c.env);
      const userRecord = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
        with: {
          tenant: true,
        },
      });

      if (!userRecord) {
        return c.json({
          error: 'Acceso denegado. Tu cuenta no está autorizada para usar este sistema.',
          unauthorized: true
        }, 403);
      }

      if (!userRecord.activo) {
        return c.json({ error: 'Usuario inactivo' }, 403);
      }

      // Guardar info del usuario en el contexto
      c.set('userId', String(userRecord.id));
      c.set('tenantId', userRecord.tenantId);
      c.set('userRole', userRecord.rol);

      await next();
    } catch (error) {
      console.error('Error en autenticación:', error);
      return c.json({ error: 'Error al verificar autenticación' }, 401);
    }
  }
);

/**
 * Middleware para verificar rol de admin
 */
export const requireAdmin = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const role = c.get('userRole');

    if (role !== 'ADMIN') {
      return c.json({ error: 'Requiere permisos de administrador' }, 403);
    }

    await next();
  }
);

/**
 * Middleware para verificar rol de tesorero o admin
 */
export const requireTesorero = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const role = c.get('userRole');

    if (role !== 'ADMIN' && role !== 'TESORERO') {
      return c.json({ error: 'Requiere permisos de tesorero o administrador' }, 403);
    }

    await next();
  }
);

/**
 * Middleware para verificar permisos de escritura (alias de requireTesorero)
 */
export const requireEscritura = requireTesorero;
