/**
 * Admin - Endpoints
 * Administración de tenants y usuarios (solo para ADMIN)
 */

import { Hono } from 'hono';
import { clerkAuth } from '../middleware/auth';
import { getDb } from '../db';
import { tenants, users } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware: solo ADMIN
const requireAdmin = async (c: any, next: any) => {
  const role = c.get('role');
  if (role !== 'ADMIN') {
    return c.json({ error: 'Acceso denegado. Se requiere rol ADMIN' }, 403);
  }
  await next();
};

const createTenantSchema = z.object({
  nombre: z.string().max(300),
  nit: z.string().max(25),
  codigoDane: z.string().max(20).optional(),
  vigenciaActual: z.number().int().optional(),
});

const createUserSchema = z.object({
  email: z.string().email().max(200),
  nombre: z.string().max(300),
  cargo: z.string().max(100).optional(),
  rol: z.enum(['ADMIN', 'TESORERO', 'CONSULTA']),
});

const updateUserSchema = z.object({
  nombre: z.string().max(300).optional(),
  cargo: z.string().max(100).optional(),
  rol: z.enum(['ADMIN', 'TESORERO', 'CONSULTA']).optional(),
  activo: z.boolean().optional(),
});

// ============================================================================
// TENANTS
// ============================================================================

// GET /api/admin/tenants - Listar tenants
app.get('/tenants', clerkAuth, requireAdmin, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);

  // Por ahora solo devuelve el tenant del usuario
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  return c.json(tenant ? [tenant] : []);
});

// POST /api/admin/tenants - Crear tenant
app.post('/tenants', clerkAuth, requireAdmin, zValidator('json', createTenantSchema), async (c) => {
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar que el NIT no exista
  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.nit, data.nit),
  });

  if (existing) {
    return c.json({ error: `Ya existe un tenant con NIT ${data.nit}` }, 400);
  }

  const [nuevoTenant] = await db
    .insert(tenants)
    .values({
      id: createId(),
      nombre: data.nombre,
      nit: data.nit,
      codigoDane: data.codigoDane || null,
      vigenciaActual: data.vigenciaActual || new Date().getFullYear(),
      estado: 'ACTIVO',
      fechaCreacion: new Date().toISOString(),
    })
    .returning();

  return c.json(nuevoTenant, 201);
});

// ============================================================================
// USUARIOS
// ============================================================================

// GET /api/admin/usuarios - Listar usuarios del tenant
app.get('/usuarios', clerkAuth, requireAdmin, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);

  const usuarios = await db.query.users.findMany({
    where: eq(users.tenantId, tenantId),
  });

  return c.json(usuarios);
});

// POST /api/admin/usuarios - Crear usuario
app.post('/usuarios', clerkAuth, requireAdmin, zValidator('json', createUserSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar email único
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });

  if (existing) {
    return c.json({ error: `Ya existe un usuario con email ${data.email}` }, 400);
  }

  const [nuevoUsuario] = await db
    .insert(users)
    .values({
      tenantId,
      email: data.email,
      nombre: data.nombre,
      cargo: data.cargo || null,
      rol: data.rol,
      activo: true,
      fechaCreacion: new Date().toISOString(),
    })
    .returning();

  return c.json(nuevoUsuario, 201);
});

// PUT /api/admin/usuarios/:id - Actualizar usuario
app.put('/usuarios/:id', clerkAuth, requireAdmin, zValidator('json', updateUserSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar que existe
  const usuario = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, tenantId)),
  });

  if (!usuario) {
    return c.json({ error: 'Usuario no encontrado' }, 404);
  }

  const updates: any = {};
  if (data.nombre !== undefined) updates.nombre = data.nombre;
  if (data.cargo !== undefined) updates.cargo = data.cargo;
  if (data.rol !== undefined) updates.rol = data.rol;
  if (data.activo !== undefined) updates.activo = data.activo;

  const [usuarioActualizado] = await db
    .update(users)
    .set(updates)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
    .returning();

  return c.json(usuarioActualizado);
});

// DELETE /api/admin/usuarios/:id - Desactivar usuario
app.delete('/usuarios/:id', clerkAuth, requireAdmin, async (c) => {
  const tenantId = c.get('tenantId');
  const currentUserId = parseInt(c.get('userId') || '0');
  const id = parseInt(c.req.param('id'));
  const db = getDb(c.env);

  // No permitir desactivarse a sí mismo
  if (id === currentUserId) {
    return c.json({ error: 'No puede desactivarse a sí mismo' }, 400);
  }

  // Verificar que existe
  const usuario = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, tenantId)),
  });

  if (!usuario) {
    return c.json({ error: 'Usuario no encontrado' }, 404);
  }

  await db
    .update(users)
    .set({ activo: false })
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));

  return c.body(null, 204);
});

export default app;
