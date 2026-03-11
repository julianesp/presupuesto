/**
 * Servicio de Importación de Archivos Excel
 * Compatible con Cloudflare Workers
 */

import * as XLSX from 'xlsx';
import type { D1Database } from '@cloudflare/workers-types';

/**
 * Limpia y normaliza valores
 */
function cleanValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    val = val.trim();
    return val === '' ? null : val;
  }
  return val;
}

/**
 * Escapa valores para SQL
 */
function escapeValue(value: any): string {
  if (value === null || value === undefined || value === '') return 'NULL';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Busca una hoja en el workbook por nombre parcial (case insensitive)
 */
function buscarHoja(workbook: XLSX.WorkBook, nombreParcial: string): XLSX.WorkSheet | null {
  const sheetName = workbook.SheetNames.find(name =>
    name.toLowerCase().includes(nombreParcial.toLowerCase())
  );
  return sheetName ? workbook.Sheets[sheetName] : null;
}

/**
 * Detecta si un código es hoja (nodo terminal) basándose en jerarquía
 */
async function esRubroHoja(
  db: D1Database,
  tenantId: string,
  codigo: string,
  tipo: 'gastos' | 'ingresos',
  todosLosCodigos: Set<string>
): Promise<boolean> {
  // Un rubro es hoja si no hay ningún otro rubro que empiece con su código seguido de punto
  for (const cod of todosLosCodigos) {
    if (cod !== codigo && cod.startsWith(codigo + '.')) {
      return false; // Tiene hijos, es padre
    }
  }
  return true; // No tiene hijos, es hoja
}

interface ResultadoImportacion {
  rubros_gastos?: number;
  rubros_ingresos?: number;
  total_gastos?: number;
  total_ingresos?: number;
  diferencia?: number;
  errores?: string[];
}

/**
 * Importa catálogo presupuestal desde archivo Excel
 */
export async function importarCatalogoExcel(
  db: D1Database,
  tenantId: string,
  fileBuffer: ArrayBuffer
): Promise<ResultadoImportacion> {
  const errores: string[] = [];

  try {
    // Leer archivo Excel
    const workbook = XLSX.read(fileBuffer, { type: 'array' });

    let countGastos = 0;
    let countIngresos = 0;
    let totalGastos = 0;
    let totalIngresos = 0;

    // Palabras clave a omitir
    const skipWords = ['total', 'codigo', 'cuenta', 'presupuesto', 'desequilibrio', 'apropiacion'];

    // ==================== IMPORTAR GASTOS ====================

    const gastosSheet = buscarHoja(workbook, 'gastos');
    if (gastosSheet) {
      const gastosData = XLSX.utils.sheet_to_json(gastosSheet, { header: 1, defval: null }) as any[][];

      // Recolectar todos los códigos primero para determinar jerarquía
      const codigosGastos = new Set<string>();

      for (let i = 2; i < gastosData.length; i++) { // Empezar desde fila 2 (0-indexed)
        const row = gastosData[i];
        if (!row || row.length < 3) continue;

        let codigo = cleanValue(row[1]); // Columna B (índice 1)
        const cuenta = cleanValue(row[2]); // Columna C (índice 2)

        // Convertir código a string
        if (typeof codigo === 'number') codigo = codigo.toString();
        if (!codigo || !cuenta) continue;

        // Saltar filas con palabras clave
        const codigoLower = codigo.toLowerCase();
        const cuentaLower = cuenta.toLowerCase();
        if (skipWords.some(w => codigoLower.includes(w) || cuentaLower.includes(w))) {
          continue;
        }

        codigosGastos.add(codigo);
      }

      // Ahora importar con detección de hojas
      for (let i = 2; i < gastosData.length; i++) {
        const row = gastosData[i];
        if (!row || row.length < 3) continue;

        let codigo = cleanValue(row[1]);
        const cuenta = cleanValue(row[2]);

        if (typeof codigo === 'number') codigo = codigo.toString();
        if (!codigo || !cuenta) continue;

        const codigoLower = codigo.toLowerCase();
        const cuentaLower = cuenta.toLowerCase();
        if (skipWords.some(w => codigoLower.includes(w) || cuentaLower.includes(w))) {
          continue;
        }

        // Apropiación inicial (columna I = índice 8)
        const apropIniExcel = cleanValue(row[8]) || 0;

        // Determinar si es hoja
        const esHoja = await esRubroHoja(db, tenantId, codigo, 'gastos', codigosGastos);

        // IMPORTANTE: Solo guardar el valor del Excel en rubros HOJA
        // Los rubros padre se sincronizarán después sumando sus hijos
        const apropIni = esHoja ? apropIniExcel : 0;

        try {
          await db.prepare(`
            INSERT OR REPLACE INTO rubros_gastos (
              tenant_id, codigo, cuenta, es_hoja,
              apropiacion_inicial, adiciones, reducciones,
              creditos, contracreditos, apropiacion_definitiva
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            tenantId,
            codigo,
            cuenta,
            esHoja ? 1 : 0,
            apropIni,
            0, // adiciones
            0, // reducciones
            0, // créditos
            0, // contracréditos
            apropIni // apropiación definitiva
          ).run();

          countGastos++;
          if (esHoja) {
            totalGastos += Number(apropIni) || 0;
          }
        } catch (error: any) {
          errores.push(`Fila ${i}: Error al insertar rubro de gasto ${codigo}: ${error.message}`);
        }
      }
    }

    // ==================== IMPORTAR INGRESOS ====================

    const ingresosSheet = buscarHoja(workbook, 'ingresos');
    if (ingresosSheet) {
      const ingresosData = XLSX.utils.sheet_to_json(ingresosSheet, { header: 1, defval: null }) as any[][];

      // Recolectar todos los códigos primero
      const codigosIngresos = new Set<string>();

      for (let i = 2; i < ingresosData.length; i++) {
        const row = ingresosData[i];
        if (!row || row.length < 3) continue;

        let codigo = cleanValue(row[1]);
        const cuenta = cleanValue(row[2]);

        if (typeof codigo === 'number') codigo = codigo.toString();
        if (!codigo || !cuenta) continue;

        const codigoLower = codigo.toLowerCase();
        const cuentaLower = cuenta.toLowerCase();
        if (skipWords.some(w => codigoLower.includes(w) || cuentaLower.includes(w))) {
          continue;
        }

        codigosIngresos.add(codigo);
      }

      // Importar con detección de hojas
      for (let i = 2; i < ingresosData.length; i++) {
        const row = ingresosData[i];
        if (!row || row.length < 3) continue;

        let codigo = cleanValue(row[1]);
        const cuenta = cleanValue(row[2]);

        if (typeof codigo === 'number') codigo = codigo.toString();
        if (!codigo || !cuenta) continue;

        const codigoLower = codigo.toLowerCase();
        const cuentaLower = cuenta.toLowerCase();
        if (skipWords.some(w => codigoLower.includes(w) || cuentaLower.includes(w))) {
          continue;
        }

        // Presupuesto inicial (columna G = índice 6)
        const pptoIniExcel = cleanValue(row[6]) || 0;

        // Determinar si es hoja
        const esHoja = await esRubroHoja(db, tenantId, codigo, 'ingresos', codigosIngresos);

        // IMPORTANTE: Solo guardar el valor del Excel en rubros HOJA
        // Los rubros padre se sincronizarán después sumando sus hijos
        const pptoIni = esHoja ? pptoIniExcel : 0;

        try {
          await db.prepare(`
            INSERT OR REPLACE INTO rubros_ingresos (
              tenant_id, codigo, cuenta, es_hoja,
              presupuesto_inicial, adiciones, reducciones, presupuesto_definitivo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            tenantId,
            codigo,
            cuenta,
            esHoja ? 1 : 0,
            pptoIni,
            0, // adiciones
            0, // reducciones
            pptoIni // presupuesto definitivo
          ).run();

          countIngresos++;
          if (esHoja) {
            totalIngresos += Number(pptoIni) || 0;
          }
        } catch (error: any) {
          errores.push(`Fila ${i}: Error al insertar rubro de ingreso ${codigo}: ${error.message}`);
        }
      }
    }

    // Sincronizar rubros padre (sumar valores de hijos)
    await sincronizarRubrosPadre(db, tenantId);

    return {
      rubros_gastos: countGastos,
      rubros_ingresos: countIngresos,
      total_gastos: totalGastos,
      total_ingresos: totalIngresos,
      diferencia: totalIngresos - totalGastos,
      errores: errores.length > 0 ? errores : undefined,
    };

  } catch (error: any) {
    throw new Error(`Error al procesar archivo Excel: ${error.message}`);
  }
}

/**
 * Sincroniza valores de rubros padre sumando SOLO sus hijos directos
 * IMPORTANTE: No suma nietos ni otros descendientes, solo hijos inmediatos
 */
async function sincronizarRubrosPadre(db: D1Database, tenantId: string): Promise<void> {
  // Obtener todos los rubros de gastos ordenados por profundidad (descendente)
  // Esto asegura que procesamos primero los niveles más profundos
  const gastosResult = await db.prepare(`
    SELECT codigo, cuenta, es_hoja,
           apropiacion_inicial, adiciones, reducciones, creditos, contracreditos
    FROM rubros_gastos
    WHERE tenant_id = ?
    ORDER BY LENGTH(codigo) - LENGTH(REPLACE(codigo, '.', '')) DESC, codigo
  `).bind(tenantId).all();

  const rubrosGastos = gastosResult.results || [];

  // Procesar cada rubro padre (de más profundo a más superficial)
  for (const rubro of rubrosGastos) {
    if (rubro.es_hoja === 0) {
      const codigoPadre = rubro.codigo as string;

      // Obtener SOLO hijos directos (un nivel más profundo)
      const hijosDirectos = rubrosGastos.filter(r => {
        const codigo = r.codigo as string;
        if (codigo === codigoPadre) return false;

        // Verificar que sea hijo directo: debe empezar con codigoPadre + '.'
        // y no tener más puntos después
        if (!codigo.startsWith(codigoPadre + '.')) return false;

        const sufijo = codigo.substring(codigoPadre.length + 1);
        return !sufijo.includes('.'); // No tiene más niveles = hijo directo
      });

      // Sumar valores de hijos directos
      let apropIni = 0;
      let adiciones = 0;
      let reducciones = 0;
      let creditos = 0;
      let contracreditos = 0;

      for (const hijo of hijosDirectos) {
        apropIni += Number(hijo.apropiacion_inicial) || 0;
        adiciones += Number(hijo.adiciones) || 0;
        reducciones += Number(hijo.reducciones) || 0;
        creditos += Number(hijo.creditos) || 0;
        contracreditos += Number(hijo.contracreditos) || 0;
      }

      const apropDef = apropIni + adiciones - reducciones + creditos - contracreditos;

      await db.prepare(`
        UPDATE rubros_gastos
        SET apropiacion_inicial = ?,
            adiciones = ?,
            reducciones = ?,
            creditos = ?,
            contracreditos = ?,
            apropiacion_definitiva = ?
        WHERE tenant_id = ? AND codigo = ?
      `).bind(apropIni, adiciones, reducciones, creditos, contracreditos, apropDef, tenantId, codigoPadre).run();
    }
  }

  // Sincronizar ingresos con la misma lógica
  const ingresosResult = await db.prepare(`
    SELECT codigo, cuenta, es_hoja,
           presupuesto_inicial, adiciones, reducciones
    FROM rubros_ingresos
    WHERE tenant_id = ?
    ORDER BY LENGTH(codigo) - LENGTH(REPLACE(codigo, '.', '')) DESC, codigo
  `).bind(tenantId).all();

  const rubrosIngresos = ingresosResult.results || [];

  for (const rubro of rubrosIngresos) {
    if (rubro.es_hoja === 0) {
      const codigoPadre = rubro.codigo as string;

      // Obtener SOLO hijos directos
      const hijosDirectos = rubrosIngresos.filter(r => {
        const codigo = r.codigo as string;
        if (codigo === codigoPadre) return false;

        if (!codigo.startsWith(codigoPadre + '.')) return false;

        const sufijo = codigo.substring(codigoPadre.length + 1);
        return !sufijo.includes('.');
      });

      // Sumar valores de hijos directos
      let pptoIni = 0;
      let adiciones = 0;
      let reducciones = 0;

      for (const hijo of hijosDirectos) {
        pptoIni += Number(hijo.presupuesto_inicial) || 0;
        adiciones += Number(hijo.adiciones) || 0;
        reducciones += Number(hijo.reducciones) || 0;
      }

      const pptoDef = pptoIni + adiciones - reducciones;

      await db.prepare(`
        UPDATE rubros_ingresos
        SET presupuesto_inicial = ?,
            adiciones = ?,
            reducciones = ?,
            presupuesto_definitivo = ?
        WHERE tenant_id = ? AND codigo = ?
      `).bind(pptoIni, adiciones, reducciones, pptoDef, tenantId, codigoPadre).run();
    }
  }
}
