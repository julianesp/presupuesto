#!/usr/bin/env tsx
/**
 * Script para migrar datos del sistema anterior (Python/SQLite) al nuevo sistema (Cloudflare D1)
 */

import Database from 'better-sqlite3';
import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OLD_DB_PATH = path.join(__dirname, '../../backend/presupuesto.db');
const TENANT_ID = 'tenant_default';

console.log('🔄 Iniciando migración de datos del sistema anterior...\n');

// Conectar a la base de datos antigua
let oldDb: Database.Database;
try {
  oldDb = new Database(OLD_DB_PATH, { readonly: true });
  console.log('✅ Conectado a la base de datos antigua:', OLD_DB_PATH);
} catch (error) {
  console.error('❌ Error al conectar a la base de datos antigua:', error);
  process.exit(1);
}

// Función para ejecutar comandos SQL en D1
function executeD1(sql: string): any {
  try {
    const escapedSql = sql.replace(/"/g, '\\"').replace(/\n/g, ' ');
    const command = `wrangler d1 execute presupuesto-db --local --json --command "${escapedSql}"`;
    const result = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const parsed = JSON.parse(result);
    return parsed[0];
  } catch (error: any) {
    console.error('Error ejecutando SQL en D1:', error.message);
    throw error;
  }
}

// Ver qué tablas tiene la BD antigua
console.log('\n📋 Analizando base de datos antigua...');
const tables = oldDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tablas encontradas:', tables.map((t: any) => t.name).join(', '));

// Contar registros en cada tabla
console.log('\n📊 Conteo de registros:');
const counts: Record<string, number> = {};
for (const table of tables) {
  const tableName = (table as any).name;
  if (tableName === 'sqlite_sequence') continue;

  try {
    const count = oldDb.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
    counts[tableName] = count.count;
    console.log(`  ${tableName}: ${count.count} registros`);
  } catch (error) {
    console.log(`  ${tableName}: Error al contar`);
  }
}

// Función para escapar valores SQL
function escapeValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? '1' : '0';
  // Escapar comillas simples duplicándolas
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Migrar rubros de gastos
if (counts.rubros_gastos > 0) {
  console.log('\n📦 Migrando rubros de gastos...');
  const rubrosGastos = oldDb.prepare('SELECT * FROM rubros_gastos').all();

  for (const rubro of rubrosGastos) {
    const r = rubro as any;
    const sql = `INSERT INTO rubros_gastos (
      tenant_id, codigo, cuenta, es_hoja,
      apropiacion_inicial, adiciones, reducciones,
      creditos, contracreditos, apropiacion_definitiva
    ) VALUES (
      ${escapeValue(TENANT_ID)},
      ${escapeValue(r.codigo)},
      ${escapeValue(r.cuenta)},
      ${escapeValue(r.es_hoja)},
      ${escapeValue(r.apropiacion_inicial || 0)},
      ${escapeValue(r.adiciones || 0)},
      ${escapeValue(r.reducciones || 0)},
      ${escapeValue(r.creditos || 0)},
      ${escapeValue(r.contracreditos || 0)},
      ${escapeValue(r.apropiacion_definitiva || 0)}
    )`;

    try {
      executeD1(sql);
    } catch (error) {
      console.error(`  ❌ Error al insertar rubro ${r.codigo}`);
    }
  }
  console.log(`  ✅ ${rubrosGastos.length} rubros de gastos migrados`);
}

// Migrar rubros de ingresos
if (counts.rubros_ingresos > 0) {
  console.log('\n📦 Migrando rubros de ingresos...');
  const rubrosIngresos = oldDb.prepare('SELECT * FROM rubros_ingresos').all();

  for (const rubro of rubrosIngresos) {
    const r = rubro as any;
    const sql = `INSERT INTO rubros_ingresos (
      tenant_id, codigo, cuenta, es_hoja,
      presupuesto_inicial, adiciones, reducciones, presupuesto_definitivo
    ) VALUES (
      ${escapeValue(TENANT_ID)},
      ${escapeValue(r.codigo)},
      ${escapeValue(r.cuenta)},
      ${escapeValue(r.es_hoja)},
      ${escapeValue(r.presupuesto_inicial || 0)},
      ${escapeValue(r.adiciones || 0)},
      ${escapeValue(r.reducciones || 0)},
      ${escapeValue(r.presupuesto_definitivo || 0)}
    )`;

    try {
      executeD1(sql);
    } catch (error) {
      console.error(`  ❌ Error al insertar rubro ${r.codigo}`);
    }
  }
  console.log(`  ✅ ${rubrosIngresos.length} rubros de ingresos migrados`);
}

// Migrar terceros
if (counts.terceros > 0) {
  console.log('\n👥 Migrando terceros...');
  const terceros = oldDb.prepare('SELECT * FROM terceros').all();

  for (const tercero of terceros) {
    const t = tercero as any;
    const sql = `INSERT INTO terceros (
      tenant_id, nit, dv, nombre, direccion, telefono, email,
      tipo, banco, tipo_cuenta, no_cuenta
    ) VALUES (
      ${escapeValue(TENANT_ID)},
      ${escapeValue(t.nit)},
      ${escapeValue(t.dv || '')},
      ${escapeValue(t.nombre)},
      ${escapeValue(t.direccion || '')},
      ${escapeValue(t.telefono || '')},
      ${escapeValue(t.email || '')},
      ${escapeValue(t.tipo || 'Natural')},
      ${escapeValue(t.banco || '')},
      ${escapeValue(t.tipo_cuenta || '')},
      ${escapeValue(t.no_cuenta || '')}
    )`;

    try {
      executeD1(sql);
    } catch (error) {
      console.error(`  ❌ Error al insertar tercero ${t.nit}`);
    }
  }
  console.log(`  ✅ ${terceros.length} terceros migrados`);
}

// Migrar CDPs
if (counts.cdp > 0) {
  console.log('\n📄 Migrando CDPs...');
  const cdps = oldDb.prepare('SELECT * FROM cdp').all();

  for (const cdp of cdps) {
    const c = cdp as any;
    const sql = `INSERT INTO cdp (
      tenant_id, numero, fecha, codigo_rubro, objeto, valor, estado,
      fuente_sifse, item_sifse
    ) VALUES (
      ${escapeValue(TENANT_ID)},
      ${escapeValue(c.numero)},
      ${escapeValue(c.fecha)},
      ${escapeValue(c.codigo_rubro)},
      ${escapeValue(c.objeto)},
      ${escapeValue(c.valor)},
      ${escapeValue(c.estado || 'ACTIVO')},
      ${escapeValue(0)},
      ${escapeValue(0)}
    )`;

    try {
      executeD1(sql);
    } catch (error) {
      console.error(`  ❌ Error al insertar CDP ${c.numero}`);
    }
  }
  console.log(`  ✅ ${cdps.length} CDPs migrados`);
}

// Migrar RPs
if (counts.rp > 0) {
  console.log('\n📄 Migrando RPs...');
  const rps = oldDb.prepare('SELECT * FROM rp').all();

  for (const rp of rps) {
    const r = rp as any;
    const sql = `INSERT INTO rp (
      tenant_id, numero, fecha, numero_cdp, codigo_rubro,
      nit_tercero, valor, objeto, estado,
      fuente_sifse, item_sifse
    ) VALUES (
      ${escapeValue(TENANT_ID)},
      ${escapeValue(r.numero)},
      ${escapeValue(r.fecha)},
      ${escapeValue(r.cdp_numero)},
      ${escapeValue(r.codigo_rubro)},
      ${escapeValue(r.nit_tercero)},
      ${escapeValue(r.valor)},
      ${escapeValue(r.objeto)},
      ${escapeValue(r.estado || 'ACTIVO')},
      ${escapeValue(0)},
      ${escapeValue(0)}
    )`;

    try {
      executeD1(sql);
    } catch (error) {
      console.error(`  ❌ Error al insertar RP ${r.numero}`);
    }
  }
  console.log(`  ✅ ${rps.length} RPs migrados`);
}

// Migrar obligaciones
if (counts.obligacion > 0) {
  console.log('\n📄 Migrando obligaciones...');
  const obligaciones = oldDb.prepare('SELECT * FROM obligacion').all();

  for (const obligacion of obligaciones) {
    const o = obligacion as any;
    const sql = `INSERT INTO obligaciones (
      tenant_id, numero, fecha, numero_rp, codigo_rubro,
      nit_tercero, valor, factura, estado,
      fuente_sifse, item_sifse
    ) VALUES (
      ${escapeValue(TENANT_ID)},
      ${escapeValue(o.numero)},
      ${escapeValue(o.fecha)},
      ${escapeValue(o.rp_numero)},
      ${escapeValue(o.codigo_rubro)},
      ${escapeValue(o.nit_tercero)},
      ${escapeValue(o.valor)},
      ${escapeValue(o.factura || '')},
      ${escapeValue(o.estado || 'ACTIVO')},
      ${escapeValue(0)},
      ${escapeValue(0)}
    )`;

    try {
      executeD1(sql);
    } catch (error) {
      console.error(`  ❌ Error al insertar obligación ${o.numero}`);
    }
  }
  console.log(`  ✅ ${obligaciones.length} obligaciones migradas`);
}

// Migrar pagos (si existen)
if (counts.pago) {
  console.log('\n💰 Migrando pagos...');
  const pagos = oldDb.prepare('SELECT * FROM pago').all();

  for (const pago of pagos) {
    const p = pago as any;
    const sql = `INSERT INTO pagos (
      tenant_id, numero, fecha, numero_obligacion, codigo_rubro,
      nit_tercero, valor, forma_pago, estado
    ) VALUES (
      ${escapeValue(TENANT_ID)},
      ${escapeValue(p.numero)},
      ${escapeValue(p.fecha)},
      ${escapeValue(p.obligacion_numero)},
      ${escapeValue(p.codigo_rubro)},
      ${escapeValue(p.nit_tercero)},
      ${escapeValue(p.valor)},
      ${escapeValue(p.forma_pago || 'TRANSFERENCIA')},
      ${escapeValue(p.estado || 'ACTIVO')}
    )`;

    try {
      executeD1(sql);
    } catch (error) {
      console.error(`  ❌ Error al insertar pago ${p.numero}`);
    }
  }
  console.log(`  ✅ ${pagos.length} pagos migrados`);
}

// Migrar recaudos (si existen)
if (counts.recaudo) {
  console.log('\n💵 Migrando recaudos...');
  const recaudos = oldDb.prepare('SELECT * FROM recaudo').all();

  for (const recaudo of recaudos) {
    const r = recaudo as any;
    const sql = `INSERT INTO recaudos (
      tenant_id, numero, fecha, codigo_rubro,
      valor, descripcion, forma_pago, estado
    ) VALUES (
      ${escapeValue(TENANT_ID)},
      ${escapeValue(r.numero)},
      ${escapeValue(r.fecha)},
      ${escapeValue(r.codigo_rubro)},
      ${escapeValue(r.valor)},
      ${escapeValue(r.descripcion || '')},
      ${escapeValue(r.forma_pago || 'TRANSFERENCIA')},
      ${escapeValue(r.estado || 'ACTIVO')}
    )`;

    try {
      executeD1(sql);
    } catch (error) {
      console.error(`  ❌ Error al insertar recaudo ${r.numero}`);
    }
  }
  console.log(`  ✅ ${recaudos.length} recaudos migrados`);
}

// Migrar configuración
if (counts.config > 0) {
  console.log('\n⚙️  Migrando configuración...');
  const configs = oldDb.prepare('SELECT * FROM config').all();

  for (const config of configs) {
    const c = config as any;
    const sql = `INSERT OR REPLACE INTO config (tenant_id, clave, valor)
                 VALUES (${escapeValue(TENANT_ID)}, ${escapeValue(c.clave)}, ${escapeValue(c.valor)})`;

    try {
      executeD1(sql);
    } catch (error) {
      console.error(`  ❌ Error al insertar config ${c.clave}`);
    }
  }
  console.log(`  ✅ ${configs.length} configuraciones migradas`);
}

oldDb.close();

console.log('\n✅ ¡Migración completada exitosamente!');
console.log('\n📊 Resumen:');
console.log(`  Rubros de gastos: ${counts.rubros_gastos || 0}`);
console.log(`  Rubros de ingresos: ${counts.rubros_ingresos || 0}`);
console.log(`  Terceros: ${counts.terceros || 0}`);
console.log(`  CDPs: ${counts.cdp || 0}`);
console.log(`  RPs: ${counts.rp || 0}`);
console.log(`  Obligaciones: ${counts.obligacion || 0}`);
console.log(`  Pagos: ${counts.pago || 0}`);
console.log(`  Recaudos: ${counts.recaudo || 0}`);
console.log(`  Configuraciones: ${counts.config || 0}`);
