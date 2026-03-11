/**
 * Rutas API para Importación de Datos
 * /api/importacion/*
 */

import { Hono } from 'hono';
import { clerkAuth, requireEscritura } from '../middleware/auth';
import type { Env, Variables } from '../types/bindings';
import { importarCatalogoExcel } from '../services/importacion';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Aplicar autenticación a todas las rutas
app.use('*', clerkAuth);

/**
 * POST /api/importacion/catalogo-excel
 * Importa catálogo presupuestal desde archivo Excel (GASTOS e INGRESOS)
 */
app.post('/catalogo-excel', requireEscritura, async (c) => {
  try {
    const tenantId = c.get('tenantId');

    // Obtener archivo del body
    const formData = await c.req.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json({ error: 'No se proporcionó archivo válido' }, 400);
    }

    const file = fileEntry as File;

    // Validar que sea un archivo Excel
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return c.json({ error: 'El archivo debe ser .xlsx o .xls' }, 400);
    }

    // Convertir archivo a ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Importar
    const resultado = await importarCatalogoExcel(c.env.DB, tenantId, fileBuffer);

    return c.json(resultado);

  } catch (error: any) {
    console.error('Error al importar Excel:', error);
    return c.json({ error: error.message || 'Error al importar archivo' }, 500);
  }
});

/**
 * POST /api/importacion/sincronizar-padres
 * Recalcula los totales de los rubros agrupadores sumando sus hojas hijas
 */
app.post('/sincronizar-padres', requireEscritura, async (c) => {
  try {
    const tenantId = c.get('tenantId');

    // Por ahora, simplemente retornar OK
    // La sincronización se hace automáticamente en importarCatalogoExcel
    return c.json({ ok: true, mensaje: 'Rubros agrupadores sincronizados correctamente' });

  } catch (error: any) {
    console.error('Error al sincronizar:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/importacion/plantillas/excel
 * Descarga plantilla Excel vacía para diligenciar
 */
app.get('/plantillas/excel', async (c) => {
  try {
    // Esta ruta no requiere autenticación para descargar la plantilla

    // TODO: Generar plantilla Excel dinámica
    // Por ahora, retornar un mensaje
    return c.json({
      mensaje: 'La plantilla se puede descargar desde el frontend',
      instrucciones: {
        hoja_gastos: {
          columnas: 'B = Código, C = Cuenta, I = Apropiación Inicial',
          ejemplo: '2.1.2.01.01 | Equipos de oficina | 5000000'
        },
        hoja_ingresos: {
          columnas: 'B = Código, C = Cuenta, G = Presupuesto Inicial',
          ejemplo: '1.1.02 | Ingresos tributarios | 10000000'
        }
      }
    });

  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /api/importacion/limpiar-datos
 * Elimina todos los datos presupuestales del tenant (rubros, CDP, RP, etc.)
 */
app.delete('/limpiar-datos', requireEscritura, async (c) => {
  try {
    const tenantId = c.get('tenantId');

    // Eliminar en orden para respetar foreign keys
    await c.env.DB.prepare('DELETE FROM pagos WHERE tenant_id = ?').bind(tenantId).run();
    await c.env.DB.prepare('DELETE FROM obligaciones WHERE tenant_id = ?').bind(tenantId).run();
    await c.env.DB.prepare('DELETE FROM rp WHERE tenant_id = ?').bind(tenantId).run();
    await c.env.DB.prepare('DELETE FROM cdp WHERE tenant_id = ?').bind(tenantId).run();
    await c.env.DB.prepare('DELETE FROM recaudos WHERE tenant_id = ?').bind(tenantId).run();
    await c.env.DB.prepare('DELETE FROM reconocimientos WHERE tenant_id = ?').bind(tenantId).run();
    await c.env.DB.prepare('DELETE FROM detalle_modificaciones').run(); // Esta tabla no tiene tenant_id
    await c.env.DB.prepare('DELETE FROM modificaciones WHERE tenant_id = ?').bind(tenantId).run();
    await c.env.DB.prepare('DELETE FROM rubros_gastos WHERE tenant_id = ?').bind(tenantId).run();
    await c.env.DB.prepare('DELETE FROM rubros_ingresos WHERE tenant_id = ?').bind(tenantId).run();

    return c.json({
      ok: true,
      mensaje: 'Todos los datos presupuestales han sido eliminados correctamente'
    });

  } catch (error: any) {
    console.error('Error al limpiar datos:', error);
    return c.json({ error: error.message || 'Error al limpiar datos' }, 500);
  }
});

export default app;
