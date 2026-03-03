#!/usr/bin/env tsx
/**
 * Script para importar datos desde archivos Excel al sistema
 */

import XLSX from 'xlsx';
import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXCEL_DIR = path.join(__dirname, '../PRESUPUESTOS 2026');
const CATALOGO_FILE = '6.1. CATALOGO PRESUPUESTAL INGRESOS Y GASTOS 2025- PRESUPUESTO IE 2025.xlsx';
const TENANT_ID = 'tenant_default';

// Leer argumentos de línea de comandos
const args = process.argv.slice(2);
const isProduction = args.includes('--prod') || args.includes('--production');
const dbFlag = isProduction ? '--remote' : '--local';

console.log(`📊 Importando datos desde archivos Excel a ${isProduction ? 'PRODUCCIÓN' : 'LOCAL'}...\n`);

// Función para ejecutar comandos SQL en D1
function executeD1(sql: string): any {
  try {
    const escapedSql = sql.replace(/"/g, '\\"').replace(/\n/g, ' ');
    const command = `wrangler d1 execute presupuesto-db ${dbFlag} --json --command "${escapedSql}"`;
    const result = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const parsed = JSON.parse(result);
    return parsed[0];
  } catch (error: any) {
    console.error('Error ejecutando SQL en D1:', error.message);
    return null;
  }
}

// Función para escapar valores SQL
function escapeValue(value: any): string {
  if (value === null || value === undefined || value === '') return 'NULL';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Leer archivo Excel del catálogo
const catalogoPath = path.join(EXCEL_DIR, CATALOGO_FILE);
console.log('📖 Leyendo archivo:', catalogoPath);

let workbook: XLSX.WorkBook;
try {
  workbook = XLSX.readFile(catalogoPath);
  console.log('✅ Archivo Excel leído correctamente\n');
} catch (error) {
  console.error('❌ Error al leer el archivo Excel:', error);
  process.exit(1);
}

console.log('📋 Hojas encontradas en el Excel:');
workbook.SheetNames.forEach((name, idx) => {
  console.log(`  ${idx + 1}. ${name}`);
});
console.log('');

// Función para limpiar y normalizar valores
function cleanValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    val = val.trim();
    return val === '' ? null : val;
  }
  return val;
}

// Importar rubros de gastos
const gastosSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('gasto'));
const gastosSheet = gastosSheetName ? workbook.Sheets[gastosSheetName] : null;
if (gastosSheet) {
  console.log('📦 Importando rubros de GASTOS...');

  const gastosData = XLSX.utils.sheet_to_json(gastosSheet, { defval: null });
  console.log(`  Encontrados ${gastosData.length} filas en la hoja GASTOS`);

  // Mostrar las primeras columnas para entender la estructura
  if (gastosData.length > 0) {
    console.log('  Columnas detectadas:', Object.keys(gastosData[0]));
  }

  let importedGastos = 0;
  for (const row of gastosData) {
    const r = row as any;

    // Intentar diferentes nombres de columnas (pueden variar en el Excel, incluyendo espacios)
    let codigo = cleanValue(r['CODIGO '] || r['CODIGO'] || r['Codigo'] || r['codigo'] || r['COD'] || r['Cod']);
    const cuenta = cleanValue(r['CUENTA '] || r['CUENTA'] || r['Cuenta'] || r['cuenta'] || r['DESCRIPCION'] || r['Descripcion'] || r['descripcion']);

    // Convertir código a string si es número
    if (typeof codigo === 'number') {
      codigo = codigo.toString();
    }

    if (!codigo || !cuenta) continue; // Saltar filas vacías

    // Determinar si es hoja (nodo terminal sin hijos)
    const esHoja = codigo.length >= 7 ? 1 : 0; // Rubros de 7+ dígitos son hojas

    // Valores presupuestales (pueden estar en diferentes columnas, con o sin espacios)
    const apropiacionInicial = cleanValue(r['PRESUPUESTO INICIAL '] || r['PRESUPUESTO INICIAL'] || r['APROPIACION INICIAL'] || r['Apropiacion Inicial'] || r['apropiacion_inicial'] || 0);
    const adiciones = cleanValue(r['ADICIONES '] || r['ADICIONES'] || r['Adiciones'] || r['adiciones'] || 0);
    const reducciones = cleanValue(r['REDUCCIONES '] || r['REDUCCIONES'] || r['Reducciones'] || r['reducciones'] || 0);
    const creditos = cleanValue(r['CREDITOS '] || r['CREDITOS'] || r['Creditos'] || r['creditos'] || 0);
    const contracreditos = cleanValue(r['CONTRA   CREDITOS '] || r['CONTRACREDITOS'] || r['Contracreditos'] || r['contracreditos'] || 0);

    const apropiacionDefinitiva = (apropiacionInicial || 0) + (adiciones || 0) - (reducciones || 0) + (creditos || 0) - (contracreditos || 0);

    const sql = `INSERT OR IGNORE INTO rubros_gastos (
      tenant_id, codigo, cuenta, es_hoja,
      apropiacion_inicial, adiciones, reducciones,
      creditos, contracreditos, apropiacion_definitiva
    ) VALUES (
      ${escapeValue(TENANT_ID)},
      ${escapeValue(codigo)},
      ${escapeValue(cuenta)},
      ${esHoja},
      ${apropiacionInicial || 0},
      ${adiciones || 0},
      ${reducciones || 0},
      ${creditos || 0},
      ${contracreditos || 0},
      ${apropiacionDefinitiva}
    )`;

    const result = executeD1(sql);
    if (result) importedGastos++;
  }

  console.log(`  ✅ ${importedGastos} rubros de gastos importados\n`);
} else {
  console.log('⚠️  No se encontró hoja de GASTOS en el Excel\n');
}

// Importar rubros de ingresos
const ingresosSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('ingreso'));
const ingresosSheet = ingresosSheetName ? workbook.Sheets[ingresosSheetName] : null;
if (ingresosSheet) {
  console.log('📦 Importando rubros de INGRESOS...');

  const ingresosData = XLSX.utils.sheet_to_json(ingresosSheet, { defval: null });
  console.log(`  Encontrados ${ingresosData.length} filas en la hoja INGRESOS`);

  if (ingresosData.length > 0) {
    console.log('  Columnas detectadas:', Object.keys(ingresosData[0]));
  }

  let importedIngresos = 0;
  for (const row of ingresosData) {
    const r = row as any;

    let codigo = cleanValue(r['CODIGO '] || r['CODIGO'] || r['Codigo'] || r['codigo'] || r['COD'] || r['Cod']);
    const cuenta = cleanValue(r['CUENTA '] || r['CUENTA'] || r['Cuenta'] || r['cuenta'] || r['DESCRIPCION'] || r['Descripcion'] || r['descripcion']);

    // Convertir código a string si es número
    if (typeof codigo === 'number') {
      codigo = codigo.toString();
    }

    if (!codigo || !cuenta) continue;

    const esHoja = codigo.length >= 7 ? 1 : 0;

    const presupuestoInicial = cleanValue(r['PRESUPUESTO INICIAL '] || r['PRESUPUESTO INICIAL'] || r['Presupuesto Inicial'] || r['presupuesto_inicial'] || r['APROPIACION INICIAL'] || 0);
    const adiciones = cleanValue(r['ADICIONES '] || r['ADICIONES'] || r['Adiciones'] || r['adiciones'] || 0);
    const reducciones = cleanValue(r['REDUCCIONES '] || r['REDUCCIONES'] || r['Reducciones'] || r['reducciones'] || 0);

    const presupuestoDefinitivo = (presupuestoInicial || 0) + (adiciones || 0) - (reducciones || 0);

    const sql = `INSERT OR IGNORE INTO rubros_ingresos (
      tenant_id, codigo, cuenta, es_hoja,
      presupuesto_inicial, adiciones, reducciones, presupuesto_definitivo
    ) VALUES (
      ${escapeValue(TENANT_ID)},
      ${escapeValue(codigo)},
      ${escapeValue(cuenta)},
      ${esHoja},
      ${presupuestoInicial || 0},
      ${adiciones || 0},
      ${reducciones || 0},
      ${presupuestoDefinitivo}
    )`;

    const result = executeD1(sql);
    if (result) importedIngresos++;
  }

  console.log(`  ✅ ${importedIngresos} rubros de ingresos importados\n`);
} else {
  console.log('⚠️  No se encontró hoja de INGRESOS en el Excel\n');
}

console.log('✅ ¡Importación completada!');
