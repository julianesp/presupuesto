/**
 * Contabilidad - Endpoints (Res. 414 de 2014 - CGN)
 * Catálogo de cuentas, comprobantes contables, saldos iniciales y periodos.
 */

import { Hono } from 'hono';
import { clerkAuth, requireAdmin, requireAnular, requireEscritura, requireSuperAdmin } from '../middleware/auth';
import type { Env, Variables } from '../types/bindings';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  TIPOS_COMPROBANTE,
  importarCatalogo,
  importarSaldosIniciales,
  naturalezaHeredada,
  nivelCuenta,
  normalizarCodigo,
  periodoCerrado,
  plantillaCatalogo,
  plantillaSaldosIniciales,
  sentenciaRecalcularAuxiliares,
  sentenciasComprobante,
  validarComprobante,
  type NuevoComprobante,
} from '../services/contabilidad';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', clerkAuth);

const XLSX_HEADERS = (nombre: string) => ({
  'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'Content-Disposition': `attachment; filename="${nombre}"`,
});

async function archivoExcel(c: any): Promise<ArrayBuffer | Response> {
  const fileEntry = (await c.req.formData()).get('file');
  if (!fileEntry || typeof fileEntry === 'string') {
    return c.json({ error: 'No se proporcionó archivo válido' }, 400);
  }
  const file = fileEntry as File;
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    return c.json({ error: 'El archivo debe ser .xlsx o .xls' }, 400);
  }
  return file.arrayBuffer();
}

// ============================================================================
// CATÁLOGO DE CUENTAS
// ============================================================================

const cuentaSchema = z.object({
  codigo: z.string().min(1).max(30),
  nombre: z.string().min(1).max(300),
  naturaleza: z.enum(['D', 'C']).optional(),
  requiereTercero: z.boolean().optional(),
});

const updateCuentaSchema = z.object({
  nombre: z.string().min(1).max(300).optional(),
  naturaleza: z.enum(['D', 'C']).optional(),
  requiereTercero: z.boolean().optional(),
  activa: z.boolean().optional(),
});

/** GET /api/contabilidad/cuentas?solo_auxiliares=true */
app.get('/cuentas', async (c) => {
  const soloAuxiliares = c.req.query('solo_auxiliares') === 'true';
  const { results } = await c.env.DB!
    .prepare(
      `SELECT codigo, nombre, naturaleza, nivel, es_auxiliar AS esAuxiliar, requiere_tercero AS requiereTercero, activa
       FROM cuentas_contables WHERE tenant_id = ? ${soloAuxiliares ? 'AND es_auxiliar = 1 AND activa = 1' : ''}
       ORDER BY codigo`
    )
    .bind(c.get('tenantId'))
    .all();
  return c.json(results);
});

/** POST /api/contabilidad/cuentas */
app.post('/cuentas', requireAdmin, zValidator('json', cuentaSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const codigo = normalizarCodigo(data.codigo);
  const db = c.env.DB!;

  if (!codigo) return c.json({ error: 'El código debe tener dígitos' }, 400);
  const existe = await db.prepare('SELECT 1 FROM cuentas_contables WHERE tenant_id = ? AND codigo = ?').bind(tenantId, codigo).first();
  if (existe) return c.json({ error: `La cuenta ${codigo} ya existe` }, 400);

  // Si el padre directo ya tiene movimientos, no puede dejar de ser auxiliar
  const conMovimientos = await db
    .prepare(
      `SELECT codigo_cuenta AS codigo FROM movimientos_contables
       WHERE tenant_id = ? AND ? LIKE codigo_cuenta || '%' AND codigo_cuenta != ? LIMIT 1`
    )
    .bind(tenantId, codigo, codigo)
    .first<{ codigo: string }>();
  if (conMovimientos) {
    return c.json({ error: `La cuenta ${conMovimientos.codigo} ya tiene movimientos; no se le pueden crear subcuentas` }, 400);
  }

  const naturalezas = new Map(
    (
      await db
        .prepare('SELECT codigo, naturaleza FROM cuentas_contables WHERE tenant_id = ?')
        .bind(tenantId)
        .all<{ codigo: string; naturaleza: string }>()
    ).results.map((r) => [r.codigo, r.naturaleza])
  );

  await db.batch([
    db
      .prepare(
        `INSERT INTO cuentas_contables (tenant_id, codigo, nombre, naturaleza, nivel, es_auxiliar, requiere_tercero, activa)
         VALUES (?, ?, ?, ?, ?, 1, ?, 1)`
      )
      .bind(tenantId, codigo, data.nombre!.trim(), data.naturaleza ?? naturalezaHeredada(codigo, data.nombre!, naturalezas),
        nivelCuenta(codigo), data.requiereTercero ? 1 : 0),
    sentenciaRecalcularAuxiliares(db, tenantId),
  ]);
  return c.json({ codigo }, 201);
});

/** PUT /api/contabilidad/cuentas/:codigo */
app.put('/cuentas/:codigo', requireAdmin, zValidator('json', updateCuentaSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const codigo = c.req.param('codigo');
  const data = c.req.valid('json');
  const db = c.env.DB!;

  const cuenta = await db.prepare('SELECT codigo FROM cuentas_contables WHERE tenant_id = ? AND codigo = ?').bind(tenantId, codigo).first();
  if (!cuenta) return c.json({ error: 'Cuenta no encontrada' }, 404);

  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.nombre !== undefined) (sets.push('nombre = ?'), vals.push(data.nombre.trim()));
  if (data.naturaleza !== undefined) (sets.push('naturaleza = ?'), vals.push(data.naturaleza));
  if (data.requiereTercero !== undefined) (sets.push('requiere_tercero = ?'), vals.push(data.requiereTercero ? 1 : 0));
  if (data.activa !== undefined) (sets.push('activa = ?'), vals.push(data.activa ? 1 : 0));
  if (!sets.length) return c.json({ error: 'Nada que actualizar' }, 400);

  await db.prepare(`UPDATE cuentas_contables SET ${sets.join(', ')} WHERE tenant_id = ? AND codigo = ?`).bind(...vals, tenantId, codigo).run();
  return c.json({ codigo });
});

/** DELETE /api/contabilidad/cuentas/:codigo (solo si no tiene subcuentas ni movimientos) */
app.delete('/cuentas/:codigo', requireAdmin, async (c) => {
  const tenantId = c.get('tenantId');
  const codigo = c.req.param('codigo');
  const db = c.env.DB!;

  const hijas = await db
    .prepare("SELECT 1 FROM cuentas_contables WHERE tenant_id = ? AND codigo LIKE ? || '%' AND codigo != ? LIMIT 1")
    .bind(tenantId, codigo, codigo)
    .first();
  if (hijas) return c.json({ error: 'La cuenta tiene subcuentas' }, 400);
  const movs = await db.prepare('SELECT 1 FROM movimientos_contables WHERE tenant_id = ? AND codigo_cuenta = ? LIMIT 1').bind(tenantId, codigo).first();
  if (movs) return c.json({ error: 'La cuenta tiene movimientos; puede inactivarla' }, 400);

  await db.batch([
    db.prepare('DELETE FROM cuentas_contables WHERE tenant_id = ? AND codigo = ?').bind(tenantId, codigo),
    sentenciaRecalcularAuxiliares(db, tenantId),
  ]);
  return c.body(null, 204);
});

/** GET /api/contabilidad/cuentas/plantilla */
app.get('/cuentas/plantilla', (c) => c.body(plantillaCatalogo(), 200, XLSX_HEADERS('plantilla_catalogo_cuentas.xlsx')));

/** POST /api/contabilidad/cuentas/importar */
app.post('/cuentas/importar', requireAdmin, async (c) => {
  const archivo = await archivoExcel(c);
  if (archivo instanceof Response) return archivo;
  const resultado = await importarCatalogo(c.env.DB!, c.get('tenantId'), archivo);
  return c.json(resultado, resultado.ok ? 200 : 422);
});

// ============================================================================
// SALDOS INICIALES
// ============================================================================

/** GET /api/contabilidad/saldos-iniciales/plantilla */
app.get('/saldos-iniciales/plantilla', async (c) => {
  const buffer = await plantillaSaldosIniciales(c.env.DB!, c.get('tenantId'));
  return c.body(buffer, 200, XLSX_HEADERS('plantilla_saldos_iniciales_contables.xlsx'));
});

/** POST /api/contabilidad/saldos-iniciales/importar */
app.post('/saldos-iniciales/importar', requireEscritura, async (c) => {
  const archivo = await archivoExcel(c);
  if (archivo instanceof Response) return archivo;
  const resultado = await importarSaldosIniciales(c.env.DB!, c.get('tenantId'), archivo, parseInt(c.get('userId')) || null);
  return c.json(resultado, resultado.ok ? 200 : 422);
});

// ============================================================================
// COMPROBANTES
// ============================================================================

const comprobanteSchema = z.object({
  tipo: z.enum(TIPOS_COMPROBANTE),
  fecha: z.string(),
  descripcion: z.string().min(1).max(1000),
  lineas: z
    .array(
      z.object({
        codigoCuenta: z.string().min(1),
        nitTercero: z.string().nullable().optional(),
        descripcion: z.string().max(500).optional(),
        debito: z.number().default(0),
        credito: z.number().default(0),
      })
    )
    .min(2),
});

/** GET /api/contabilidad/comprobantes?tipo=&mes= */
app.get('/comprobantes', async (c) => {
  const tenantId = c.get('tenantId');
  const tipo = c.req.query('tipo');
  const mes = c.req.query('mes');
  const filtros: string[] = ['c.tenant_id = ?'];
  const vals: unknown[] = [tenantId];
  if (tipo) (filtros.push('c.tipo = ?'), vals.push(tipo));
  if (mes) (filtros.push("CAST(strftime('%m', c.fecha) AS INTEGER) = ?"), vals.push(parseInt(mes)));

  const { results } = await c.env.DB!
    .prepare(
      `SELECT c.id, c.tipo, c.numero, c.fecha, c.descripcion, c.estado, c.origen_tipo AS origenTipo, c.origen_numero AS origenNumero,
              COALESCE(SUM(m.debito), 0) AS totalDebito, COALESCE(SUM(m.credito), 0) AS totalCredito, COUNT(m.id) AS lineas
       FROM comprobantes_contables c
       LEFT JOIN movimientos_contables m ON m.comprobante_id = c.id
       WHERE ${filtros.join(' AND ')}
       GROUP BY c.id
       ORDER BY c.fecha DESC, c.tipo, c.numero DESC`
    )
    .bind(...vals)
    .all();
  return c.json(results);
});

/** GET /api/contabilidad/comprobantes/:id */
app.get('/comprobantes/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const id = parseInt(c.req.param('id'));
  const db = c.env.DB!;
  const comp = await db
    .prepare(
      `SELECT id, tipo, numero, fecha, descripcion, estado, origen_tipo AS origenTipo, origen_numero AS origenNumero, fecha_creacion AS fechaCreacion
       FROM comprobantes_contables WHERE tenant_id = ? AND id = ?`
    )
    .bind(tenantId, id)
    .first();
  if (!comp) return c.json({ error: 'Comprobante no encontrado' }, 404);

  const { results: lineas } = await db
    .prepare(
      `SELECT m.id, m.codigo_cuenta AS codigoCuenta, cc.nombre AS nombreCuenta, m.nit_tercero AS nitTercero,
              t.nombre AS nombreTercero, m.descripcion, m.debito, m.credito
       FROM movimientos_contables m
       JOIN cuentas_contables cc ON cc.tenant_id = m.tenant_id AND cc.codigo = m.codigo_cuenta
       LEFT JOIN terceros t ON t.tenant_id = m.tenant_id AND t.nit = m.nit_tercero
       WHERE m.tenant_id = ? AND m.comprobante_id = ?
       ORDER BY m.id`
    )
    .bind(tenantId, id)
    .all();
  return c.json({ ...comp, lineas });
});

/** POST /api/contabilidad/comprobantes (manuales; la apertura se carga por plantilla) */
app.post('/comprobantes', requireEscritura, zValidator('json', comprobanteSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = c.env.DB!;

  if (data.tipo === 'APERTURA') {
    return c.json({ error: 'El comprobante de apertura se registra con la plantilla de saldos iniciales' }, 400);
  }
  const comprobante: NuevoComprobante = {
    tipo: data.tipo!,
    fecha: data.fecha!,
    descripcion: data.descripcion!,
    lineas: data.lineas!.map((l) => ({
      codigoCuenta: normalizarCodigo(l.codigoCuenta),
      nitTercero: l.nitTercero || null,
      descripcion: l.descripcion ?? '',
      debito: l.debito ?? 0,
      credito: l.credito ?? 0,
    })),
    usuarioId: parseInt(c.get('userId')) || null,
  };
  const errores = await validarComprobante(db, tenantId, comprobante);
  if (errores.length) return c.json({ error: errores.join('; '), errores }, 400);

  const { numero, stmts } = await sentenciasComprobante(db, tenantId, comprobante);
  await db.batch(stmts);
  return c.json({ tipo: data.tipo, numero }, 201);
});

/** PUT /api/contabilidad/comprobantes/:id/anular */
app.put('/comprobantes/:id/anular', requireAnular, async (c) => {
  const tenantId = c.get('tenantId');
  const id = parseInt(c.req.param('id'));
  const db = c.env.DB!;
  const comp = await db
    .prepare('SELECT tipo, numero, fecha, estado, origen_tipo FROM comprobantes_contables WHERE tenant_id = ? AND id = ?')
    .bind(tenantId, id)
    .first<{ tipo: string; numero: number; fecha: string; estado: string; origen_tipo: string | null }>();
  if (!comp) return c.json({ error: 'Comprobante no encontrado' }, 404);
  if (comp.estado === 'ANULADO') return c.json({ error: 'El comprobante ya está anulado' }, 400);
  if (comp.origen_tipo) {
    return c.json({ error: `Este comprobante lo generó un documento de ${comp.origen_tipo}; anule el documento de origen` }, 400);
  }
  if (await periodoCerrado(db, tenantId, comp.fecha)) {
    return c.json({ error: `El periodo ${comp.fecha.slice(0, 7)} está cerrado` }, 400);
  }
  await db.prepare("UPDATE comprobantes_contables SET estado = 'ANULADO' WHERE tenant_id = ? AND id = ?").bind(tenantId, id).run();
  return c.json({ message: `Comprobante ${comp.tipo}-${comp.numero} anulado` });
});

// ============================================================================
// PERIODOS
// ============================================================================

/** GET /api/contabilidad/periodos - los 12 meses de la vigencia con su estado */
app.get('/periodos', async (c) => {
  const tenantId = c.get('tenantId');
  const db = c.env.DB!;
  const t = await db.prepare('SELECT vigencia_actual AS v FROM tenants WHERE id = ?').bind(tenantId).first<{ v: number }>();
  const anio = Number(t?.v) || new Date().getFullYear();
  const { results } = await db
    .prepare(
      `SELECT mes, cerrado, fecha_cierre AS fechaCierre FROM periodos_contables WHERE tenant_id = ? AND anio = ?`
    )
    .bind(tenantId, anio)
    .all<{ mes: number; cerrado: number; fechaCierre: string | null }>();
  const porMes = new Map(results.map((r) => [r.mes, r]));
  return c.json(
    Array.from({ length: 12 }, (_, i) => ({
      anio,
      mes: i + 1,
      cerrado: porMes.get(i + 1)?.cerrado === 1,
      fechaCierre: porMes.get(i + 1)?.fechaCierre ?? null,
    }))
  );
});

async function cambiarPeriodo(c: any, cerrado: boolean) {
  const tenantId = c.get('tenantId');
  const anio = parseInt(c.req.param('anio'));
  const mes = parseInt(c.req.param('mes'));
  if (!(mes >= 1 && mes <= 12)) return c.json({ error: 'Mes inválido' }, 400);
  await c.env.DB
    .prepare(
      `INSERT INTO periodos_contables (tenant_id, anio, mes, cerrado, fecha_cierre) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (tenant_id, anio, mes) DO UPDATE SET cerrado = excluded.cerrado, fecha_cierre = excluded.fecha_cierre`
    )
    .bind(tenantId, anio, mes, cerrado ? 1 : 0, cerrado ? new Date().toISOString() : null)
    .run();
  return c.json({ anio, mes, cerrado });
}

/** PUT /api/contabilidad/periodos/:anio/:mes/cerrar */
app.put('/periodos/:anio/:mes/cerrar', requireAdmin, (c) => cambiarPeriodo(c, true));

/** PUT /api/contabilidad/periodos/:anio/:mes/abrir (solo super admin) */
app.put('/periodos/:anio/:mes/abrir', requireSuperAdmin, (c) => cambiarPeriodo(c, false));

export default app;
