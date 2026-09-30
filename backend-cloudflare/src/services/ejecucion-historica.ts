/**
 * Carga de ejecución histórica (procesos ya ejecutados en la vigencia)
 *
 * Plantilla Excel con una hoja por tipo de documento. La importación valida todo
 * el libro antes de escribir y luego inserta en un solo batch de D1 (todo o nada).
 */

import * as XLSX from 'xlsx';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

// ============================================================================
// DEFINICIÓN DE HOJAS
// ============================================================================

interface Columna {
  clave: string;
  titulo: string;
  requerida: boolean;
  ejemplo: string | number;
  ayuda: string;
}

const HOJAS: Record<string, Columna[]> = {
  'Saldos iniciales': [
    { clave: 'banco', titulo: 'banco', requerida: true, ejemplo: 'Banco Agrario', ayuda: 'Nombre del banco' },
    { clave: 'numero_cuenta', titulo: 'numero_cuenta', requerida: true, ejemplo: '4-1234-567890', ayuda: 'Número de la cuenta' },
    { clave: 'tipo_cuenta', titulo: 'tipo_cuenta', requerida: true, ejemplo: 'Ahorros', ayuda: 'Ahorros o Corriente' },
    { clave: 'titular', titulo: 'titular', requerida: true, ejemplo: 'Nombre de la entidad', ayuda: 'Titular de la cuenta' },
    { clave: 'saldo_inicial', titulo: 'saldo_inicial', requerida: true, ejemplo: 15000000, ayuda: 'Saldo al 1 de enero de la vigencia' },
  ],
  Terceros: [
    { clave: 'nit', titulo: 'nit', requerida: true, ejemplo: '1124000111', ayuda: 'NIT o cédula sin dígito de verificación' },
    { clave: 'dv', titulo: 'dv', requerida: false, ejemplo: '', ayuda: 'Dígito de verificación' },
    { clave: 'nombre', titulo: 'nombre', requerida: true, ejemplo: 'NOMBRE DEL TERCERO', ayuda: 'Nombre o razón social' },
    { clave: 'tipo', titulo: 'tipo', requerida: false, ejemplo: 'Natural', ayuda: 'Natural o Juridico' },
    { clave: 'direccion', titulo: 'direccion', requerida: false, ejemplo: '', ayuda: '' },
    { clave: 'telefono', titulo: 'telefono', requerida: false, ejemplo: '', ayuda: '' },
    { clave: 'email', titulo: 'email', requerida: false, ejemplo: '', ayuda: '' },
    { clave: 'banco', titulo: 'banco', requerida: false, ejemplo: '', ayuda: 'Banco para pagos' },
    { clave: 'tipo_cuenta', titulo: 'tipo_cuenta', requerida: false, ejemplo: '', ayuda: 'Ahorros o Corriente' },
    { clave: 'no_cuenta', titulo: 'no_cuenta', requerida: false, ejemplo: '', ayuda: '' },
  ],
  CDP: [
    { clave: 'numero', titulo: 'numero', requerida: true, ejemplo: 1, ayuda: 'Número del CDP' },
    { clave: 'fecha', titulo: 'fecha', requerida: true, ejemplo: '2026-01-15', ayuda: 'AAAA-MM-DD' },
    { clave: 'codigo_rubro', titulo: 'codigo_rubro', requerida: true, ejemplo: '2.1.2.02.02.009.07', ayuda: 'Rubro hoja de gastos (ver hoja Rubros)' },
    { clave: 'objeto', titulo: 'objeto', requerida: true, ejemplo: 'Contrato de prestación de servicios', ayuda: '' },
    { clave: 'valor', titulo: 'valor', requerida: true, ejemplo: 21000000, ayuda: '' },
    { clave: 'estado', titulo: 'estado', requerida: false, ejemplo: 'ACTIVO', ayuda: 'ACTIVO o ANULADO (vacío = ACTIVO)' },
  ],
  RP: [
    { clave: 'numero', titulo: 'numero', requerida: true, ejemplo: 1, ayuda: 'Número del RP (compromiso)' },
    { clave: 'fecha', titulo: 'fecha', requerida: true, ejemplo: '2026-01-16', ayuda: 'AAAA-MM-DD' },
    { clave: 'numero_cdp', titulo: 'numero_cdp', requerida: true, ejemplo: 1, ayuda: 'CDP que respalda el RP (el rubro se toma del CDP)' },
    { clave: 'nit_tercero', titulo: 'nit_tercero', requerida: true, ejemplo: '1124000111', ayuda: 'Debe existir en Terceros (o en el sistema)' },
    { clave: 'objeto', titulo: 'objeto', requerida: true, ejemplo: 'Contrato de prestación de servicios', ayuda: '' },
    { clave: 'valor', titulo: 'valor', requerida: true, ejemplo: 21000000, ayuda: 'No puede superar el saldo del CDP' },
    { clave: 'estado', titulo: 'estado', requerida: false, ejemplo: 'ACTIVO', ayuda: 'ACTIVO o ANULADO (vacío = ACTIVO)' },
  ],
  Obligaciones: [
    { clave: 'numero', titulo: 'numero', requerida: true, ejemplo: 1, ayuda: 'Número de la obligación' },
    { clave: 'fecha', titulo: 'fecha', requerida: true, ejemplo: '2026-01-31', ayuda: 'AAAA-MM-DD' },
    { clave: 'numero_rp', titulo: 'numero_rp', requerida: true, ejemplo: 1, ayuda: 'RP que se obliga (rubro y tercero se toman del RP)' },
    { clave: 'valor', titulo: 'valor', requerida: true, ejemplo: 4200000, ayuda: 'No puede superar el saldo del RP' },
    { clave: 'factura', titulo: 'factura', requerida: false, ejemplo: 'Cuenta de cobro enero', ayuda: 'Factura o soporte' },
    { clave: 'estado', titulo: 'estado', requerida: false, ejemplo: 'ACTIVO', ayuda: 'ACTIVO o ANULADO (vacío = ACTIVO)' },
  ],
  Pagos: [
    { clave: 'numero', titulo: 'numero', requerida: true, ejemplo: 1, ayuda: 'Número del comprobante de egreso' },
    { clave: 'fecha', titulo: 'fecha', requerida: true, ejemplo: '2026-02-05', ayuda: 'AAAA-MM-DD' },
    { clave: 'numero_obligacion', titulo: 'numero_obligacion', requerida: true, ejemplo: 1, ayuda: 'Obligación que se paga' },
    { clave: 'valor', titulo: 'valor', requerida: true, ejemplo: 4200000, ayuda: 'No puede superar el saldo de la obligación' },
    { clave: 'concepto', titulo: 'concepto', requerida: false, ejemplo: 'Pago honorarios enero', ayuda: '' },
    { clave: 'medio_pago', titulo: 'medio_pago', requerida: false, ejemplo: 'Transferencia', ayuda: 'Transferencia, Cheque, Efectivo' },
    { clave: 'no_comprobante', titulo: 'no_comprobante', requerida: false, ejemplo: 'CE-001', ayuda: '' },
    { clave: 'estado', titulo: 'estado', requerida: false, ejemplo: 'ACTIVO', ayuda: 'ACTIVO o ANULADO (vacío = ACTIVO)' },
  ],
  Reconocimientos: [
    { clave: 'fecha', titulo: 'fecha', requerida: true, ejemplo: '2026-01-31', ayuda: 'AAAA-MM-DD' },
    { clave: 'codigo_rubro', titulo: 'codigo_rubro', requerida: true, ejemplo: '1.1.02.05.001.09.001.001.1.2.1.0.00.1.1.93121', ayuda: 'Rubro hoja de ingresos (ver hoja Rubros)' },
    { clave: 'concepto', titulo: 'concepto', requerida: true, ejemplo: 'Facturación cápita enero', ayuda: '' },
    { clave: 'valor', titulo: 'valor', requerida: true, ejemplo: 106228319, ayuda: 'Valor reconocido (facturado)' },
  ],
  Recaudos: [
    { clave: 'numero', titulo: 'numero', requerida: true, ejemplo: 1, ayuda: 'Número del recibo de caja' },
    { clave: 'fecha', titulo: 'fecha', requerida: true, ejemplo: '2026-02-10', ayuda: 'AAAA-MM-DD' },
    { clave: 'codigo_rubro', titulo: 'codigo_rubro', requerida: true, ejemplo: '1.1.02.05.001.09.001.001.1.2.1.0.00.1.1.93121', ayuda: 'Rubro hoja de ingresos (ver hoja Rubros)' },
    { clave: 'valor', titulo: 'valor', requerida: true, ejemplo: 106228319, ayuda: '' },
    { clave: 'concepto', titulo: 'concepto', requerida: false, ejemplo: 'Pago cápita enero', ayuda: '' },
    { clave: 'no_comprobante', titulo: 'no_comprobante', requerida: false, ejemplo: 'RC-001', ayuda: '' },
    { clave: 'estado', titulo: 'estado', requerida: false, ejemplo: 'ACTIVO', ayuda: 'ACTIVO o ANULADO (vacío = ACTIVO)' },
  ],
};

// ============================================================================
// PLANTILLA
// ============================================================================

/**
 * Genera la plantilla Excel. Incluye una hoja "Rubros" con los rubros hoja de la
 * empresa activa como referencia para diligenciar los códigos.
 */
export async function generarPlantilla(db: D1Database, tenantId: string): Promise<ArrayBuffer> {
  const wb = XLSX.utils.book_new();

  const instrucciones = [
    ['CARGA DE EJECUCIÓN HISTÓRICA'],
    [],
    ['1. Diligencie solo las hojas que necesite; las hojas vacías se ignoran.'],
    ['2. No cambie los títulos de la primera fila. La fila de ejemplo (fila 2) debe borrarse antes de cargar.'],
    ['3. Fechas en formato AAAA-MM-DD (o fecha de Excel) y dentro de la vigencia de la empresa.'],
    ['4. Valores sin puntos ni signo $ (ej. 21000000).'],
    ['5. Orden de la cadena: CDP → RP → Obligaciones → Pagos. Cada documento debe referenciar uno existente en el archivo o en el sistema.'],
    ['6. Los códigos de rubro deben ser rubros hoja (ver hoja Rubros).'],
    ['7. La carga es todo o nada: si hay errores no se guarda nada y se muestra la lista de errores por hoja y fila.'],
    ['8. Puede cargar mes a mes: suba en cada archivo solo los documentos nuevos del mes. Se pueden referenciar CDP, RP y obligaciones cargados en meses anteriores.'],
    ['9. Terceros ya cargados se omiten sin error. Saldos iniciales se suben una sola vez (la primera carga).'],
    [],
    ['Columnas por hoja (* = obligatoria):'],
  ];
  for (const [hoja, cols] of Object.entries(HOJAS)) {
    instrucciones.push([]);
    instrucciones.push([hoja]);
    for (const col of cols) {
      instrucciones.push([`  ${col.titulo}${col.requerida ? ' *' : ''}`, col.ayuda]);
    }
  }
  const wsInstr = XLSX.utils.aoa_to_sheet(instrucciones);
  wsInstr['!cols'] = [{ wch: 40 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');

  for (const [hoja, cols] of Object.entries(HOJAS)) {
    const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.titulo), cols.map((c) => c.ejemplo)]);
    ws['!cols'] = cols.map((c) => ({ wch: Math.max(14, c.titulo.length + 2, String(c.ejemplo).length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, hoja);
  }

  const gastos = await db
    .prepare('SELECT codigo, cuenta FROM rubros_gastos WHERE tenant_id = ? AND es_hoja = 1 ORDER BY codigo')
    .bind(tenantId)
    .all<{ codigo: string; cuenta: string }>();
  const ingresos = await db
    .prepare('SELECT codigo, cuenta FROM rubros_ingresos WHERE tenant_id = ? AND es_hoja = 1 ORDER BY codigo')
    .bind(tenantId)
    .all<{ codigo: string; cuenta: string }>();
  const rubros: (string | number)[][] = [['tipo', 'codigo', 'cuenta']];
  for (const r of gastos.results) rubros.push(['GASTO', r.codigo, r.cuenta]);
  for (const r of ingresos.results) rubros.push(['INGRESO', r.codigo, r.cuenta]);
  const wsRubros = XLSX.utils.aoa_to_sheet(rubros);
  wsRubros['!cols'] = [{ wch: 10 }, { wch: 50 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsRubros, 'Rubros');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

// ============================================================================
// IMPORTACIÓN
// ============================================================================

export interface ResultadoImportacion {
  ok: boolean;
  errores: string[];
  resumen: Record<string, number>;
}

type Fila = Record<string, any> & { _fila: number };

function texto(v: unknown): string {
  return v === undefined || v === null ? '' : String(v).trim();
}

function numero(v: unknown): number {
  if (typeof v === 'number') return v;
  const limpio = texto(v).replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.');
  return limpio === '' ? NaN : Number(limpio);
}

function fecha(v: unknown): string {
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : '';
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const t = texto(v);
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const dmy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return '';
}

function estado(v: unknown): string {
  const e = texto(v).toUpperCase();
  return e === '' ? 'ACTIVO' : e;
}

/** Lee una hoja como filas con las claves de la plantilla; ignora filas vacías. */
function leerHoja(wb: XLSX.WorkBook, hoja: string): Fila[] {
  const ws = wb.Sheets[hoja];
  if (!ws) return [];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: true });
  return filas
    .map((f, i) => {
      const normal: Fila = { _fila: i + 2 };
      for (const [k, v] of Object.entries(f)) normal[k.trim().toLowerCase()] = v;
      return normal;
    })
    .filter((f) => Object.entries(f).some(([k, v]) => k !== '_fila' && texto(v) !== ''));
}

export async function importarEjecucion(
  db: D1Database,
  tenantId: string,
  archivo: ArrayBuffer
): Promise<ResultadoImportacion> {
  const wb = XLSX.read(archivo, { type: 'array' });
  const errores: string[] = [];
  const err = (hoja: string, fila: number, msg: string) => errores.push(`${hoja} fila ${fila}: ${msg}`);

  // ---------------------------------------------------------------- contexto
  const tenant = await db
    .prepare('SELECT vigencia_actual AS vigencia FROM tenants WHERE id = ?')
    .bind(tenantId)
    .first<{ vigencia: number }>();
  const vigencia = String(tenant?.vigencia ?? new Date().getFullYear());

  const q = async <T>(sqlText: string) =>
    (await db.prepare(sqlText).bind(tenantId).all<T>()).results;

  const rubrosGasto = new Map(
    (await q<{ codigo: string; es_hoja: number; apropiacion_definitiva: number }>(
      'SELECT codigo, es_hoja, apropiacion_definitiva FROM rubros_gastos WHERE tenant_id = ?'
    )).map((r) => [r.codigo, r])
  );
  const rubrosIngreso = new Map(
    (await q<{ codigo: string; es_hoja: number }>('SELECT codigo, es_hoja FROM rubros_ingresos WHERE tenant_id = ?')).map(
      (r) => [r.codigo, r]
    )
  );
  const cuentasExistentes = new Set(
    (await q<{ numero_cuenta: string }>('SELECT numero_cuenta FROM cuentas_bancarias WHERE tenant_id = ?')).map(
      (r) => r.numero_cuenta
    )
  );
  // Los reconocimientos no tienen número: se detectan repetidos por fecha + rubro + valor
  const reconocimientosExist = new Set(
    (await q<{ fecha: string; codigo_rubro: string; valor_reconocido: number }>(
      'SELECT fecha, codigo_rubro, valor_reconocido FROM reconocimientos WHERE tenant_id = ?'
    )).map((r) => `${r.fecha}|${r.codigo_rubro}|${r.valor_reconocido}`)
  );
  const tercerosExistentes = new Set(
    (await q<{ nit: string }>('SELECT nit FROM terceros WHERE tenant_id = ?')).map((r) => r.nit)
  );

  // Documentos existentes (para referencias y saldos)
  const cdpExist = new Map(
    (await q<{ numero: number; codigo_rubro: string; valor: number; estado: string }>(
      'SELECT numero, codigo_rubro, valor, estado FROM cdp WHERE tenant_id = ?'
    )).map((r) => [r.numero, r])
  );
  const rpExist = new Map(
    (await q<{ numero: number; numero_cdp: number; codigo_rubro: string; nit_tercero: string; valor: number; estado: string }>(
      'SELECT numero, numero_cdp, codigo_rubro, nit_tercero, valor, estado FROM rp WHERE tenant_id = ?'
    )).map((r) => [r.numero, r])
  );
  const obligExist = new Map(
    (await q<{ numero: number; numero_rp: number; codigo_rubro: string; nit_tercero: string; valor: number; estado: string }>(
      'SELECT numero, numero_rp, codigo_rubro, nit_tercero, valor, estado FROM obligaciones WHERE tenant_id = ?'
    )).map((r) => [r.numero, r])
  );
  const pagosExist = new Set(
    (await q<{ numero: number }>('SELECT numero FROM pagos WHERE tenant_id = ?')).map((r) => r.numero)
  );
  const recaudosExist = new Set(
    (await q<{ numero: number }>('SELECT numero FROM recaudos WHERE tenant_id = ?')).map((r) => r.numero)
  );

  // Valores usados (no anulados) por documento padre y por rubro
  const usado = {
    rubro: new Map<string, number>(),
    cdp: new Map<number, number>(),
    rp: new Map<number, number>(),
    oblig: new Map<number, number>(),
  };
  const sumar = <K>(m: Map<K, number>, k: K, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  for (const c of cdpExist.values()) if (c.estado !== 'ANULADO') sumar(usado.rubro, c.codigo_rubro, c.valor);
  for (const r of rpExist.values()) if (r.estado !== 'ANULADO') sumar(usado.cdp, r.numero_cdp, r.valor);
  for (const o of obligExist.values()) if (o.estado !== 'ANULADO') sumar(usado.rp, o.numero_rp, o.valor);
  for (const p of await q<{ numero_obligacion: number; valor: number; estado: string }>(
    'SELECT numero_obligacion, valor, estado FROM pagos WHERE tenant_id = ?'
  )) {
    if (p.estado !== 'ANULADO') sumar(usado.oblig, p.numero_obligacion, p.valor);
  }

  const stmts: D1PreparedStatement[] = [];
  const resumen: Record<string, number> = {};
  const ins = (sqlText: string, ...vals: unknown[]) => stmts.push(db.prepare(sqlText).bind(...vals));
  const contar = (clave: string) => (resumen[clave] = (resumen[clave] ?? 0) + 1);

  // Validaciones comunes
  const validarFecha = (hoja: string, f: Fila): string | null => {
    const d = fecha(f.fecha);
    if (!d) return err(hoja, f._fila, `fecha inválida "${texto(f.fecha)}"`), null;
    if (!d.startsWith(vigencia)) return err(hoja, f._fila, `la fecha ${d} no pertenece a la vigencia ${vigencia}`), null;
    return d;
  };
  const validarValor = (hoja: string, f: Fila, clave = 'valor'): number | null => {
    const v = numero(f[clave]);
    if (!(v > 0)) return err(hoja, f._fila, `${clave} inválido "${texto(f[clave])}"`), null;
    return v;
  };
  const validarNumero = (hoja: string, f: Fila, clave: string): number | null => {
    const n = numero(f[clave]);
    if (!Number.isInteger(n) || n <= 0) return err(hoja, f._fila, `${clave} inválido "${texto(f[clave])}"`), null;
    return n;
  };
  const validarEstado = (hoja: string, f: Fila): string | null => {
    const e = estado(f.estado);
    if (e !== 'ACTIVO' && e !== 'ANULADO') return err(hoja, f._fila, `estado "${e}" no válido (ACTIVO o ANULADO)`), null;
    return e;
  };
  const requeridos = (hoja: string, f: Fila): boolean => {
    const faltan = HOJAS[hoja].filter((c) => c.requerida && texto(f[c.clave]) === '').map((c) => c.clave);
    if (faltan.length) err(hoja, f._fila, `faltan columnas obligatorias: ${faltan.join(', ')}`);
    return faltan.length === 0;
  };

  // ---------------------------------------------------------------- Saldos iniciales
  for (const f of leerHoja(wb, 'Saldos iniciales')) {
    if (!requeridos('Saldos iniciales', f)) continue;
    const saldo = numero(f.saldo_inicial);
    if (Number.isNaN(saldo)) {
      err('Saldos iniciales', f._fila, `saldo_inicial inválido "${texto(f.saldo_inicial)}"`);
      continue;
    }
    const cuenta = texto(f.numero_cuenta);
    if (cuentasExistentes.has(cuenta)) {
      err('Saldos iniciales', f._fila, `la cuenta ${cuenta} ya fue cargada; los saldos iniciales se suben una sola vez`);
      continue;
    }
    cuentasExistentes.add(cuenta);
    ins(
      'INSERT INTO cuentas_bancarias (tenant_id, banco, numero_cuenta, tipo_cuenta, titular, saldo, activa) VALUES (?, ?, ?, ?, ?, ?, 1)',
      tenantId, texto(f.banco), texto(f.numero_cuenta), texto(f.tipo_cuenta), texto(f.titular), saldo
    );
    contar('saldos_iniciales');
  }

  // ---------------------------------------------------------------- Terceros
  const tercerosNuevos = new Set<string>();
  for (const f of leerHoja(wb, 'Terceros')) {
    if (!requeridos('Terceros', f)) continue;
    const nit = texto(f.nit);
    if (tercerosExistentes.has(nit)) {
      // Ya cargado en un mes anterior: se omite para permitir repetir la hoja mes a mes
      contar('terceros_omitidos');
      continue;
    }
    if (tercerosNuevos.has(nit)) {
      err('Terceros', f._fila, `el NIT ${nit} está repetido en el archivo`);
      continue;
    }
    tercerosNuevos.add(nit);
    ins(
      `INSERT INTO terceros (tenant_id, nit, dv, nombre, direccion, telefono, email, tipo, banco, tipo_cuenta, no_cuenta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      tenantId, nit, texto(f.dv), texto(f.nombre), texto(f.direccion), texto(f.telefono), texto(f.email),
      texto(f.tipo) || 'Natural', texto(f.banco), texto(f.tipo_cuenta), texto(f.no_cuenta)
    );
    contar('terceros');
  }
  const terceroExiste = (nit: string) => tercerosExistentes.has(nit) || tercerosNuevos.has(nit);

  // ---------------------------------------------------------------- CDP
  const cdpNuevos = new Map<number, { codigo_rubro: string; valor: number; estado: string }>();
  for (const f of leerHoja(wb, 'CDP').sort((a, b) => fecha(a.fecha).localeCompare(fecha(b.fecha)))) {
    if (!requeridos('CDP', f)) continue;
    const n = validarNumero('CDP', f, 'numero');
    const d = validarFecha('CDP', f);
    const v = validarValor('CDP', f);
    const e = validarEstado('CDP', f);
    const rubro = rubrosGasto.get(texto(f.codigo_rubro));
    if (!rubro) err('CDP', f._fila, `el rubro ${texto(f.codigo_rubro)} no existe en gastos`);
    else if (rubro.es_hoja !== 1) err('CDP', f._fila, `el rubro ${rubro.codigo} no es hoja`);
    if (n !== null && (cdpExist.has(n) || cdpNuevos.has(n))) err('CDP', f._fila, `el CDP ${n} ya existe`);
    if (n === null || !d || v === null || !e || !rubro || rubro.es_hoja !== 1 || cdpExist.has(n) || cdpNuevos.has(n)) continue;

    if (e === 'ACTIVO') {
      const disponible = rubro.apropiacion_definitiva - (usado.rubro.get(rubro.codigo) ?? 0);
      if (v > disponible + 0.005) {
        err('CDP', f._fila, `valor ${v} supera el saldo disponible del rubro ${rubro.codigo} (${disponible})`);
        continue;
      }
      sumar(usado.rubro, rubro.codigo, v);
    }
    cdpNuevos.set(n, { codigo_rubro: rubro.codigo, valor: v, estado: e });
    ins(
      'INSERT INTO cdp (tenant_id, numero, fecha, codigo_rubro, objeto, valor, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      tenantId, n, d, rubro.codigo, texto(f.objeto), v, e
    );
    contar('cdp');
  }
  const buscarCdp = (n: number) => cdpNuevos.get(n) ?? cdpExist.get(n);

  // ---------------------------------------------------------------- RP
  const rpNuevos = new Map<number, { codigo_rubro: string; nit_tercero: string; valor: number; estado: string }>();
  for (const f of leerHoja(wb, 'RP').sort((a, b) => fecha(a.fecha).localeCompare(fecha(b.fecha)))) {
    if (!requeridos('RP', f)) continue;
    const n = validarNumero('RP', f, 'numero');
    const nCdp = validarNumero('RP', f, 'numero_cdp');
    const d = validarFecha('RP', f);
    const v = validarValor('RP', f);
    const e = validarEstado('RP', f);
    const nit = texto(f.nit_tercero);
    const cdpRef = nCdp !== null ? buscarCdp(nCdp) : undefined;
    if (nCdp !== null && !cdpRef) err('RP', f._fila, `el CDP ${nCdp} no existe`);
    else if (cdpRef?.estado === 'ANULADO') err('RP', f._fila, `el CDP ${nCdp} está anulado`);
    if (!terceroExiste(nit)) err('RP', f._fila, `el tercero ${nit} no existe (agréguelo en la hoja Terceros)`);
    if (n !== null && (rpExist.has(n) || rpNuevos.has(n))) err('RP', f._fila, `el RP ${n} ya existe`);
    if (n === null || nCdp === null || !d || v === null || !e || !cdpRef || cdpRef.estado === 'ANULADO' || !terceroExiste(nit) || rpExist.has(n) || rpNuevos.has(n)) continue;

    if (e === 'ACTIVO') {
      const saldo = cdpRef.valor - (usado.cdp.get(nCdp) ?? 0);
      if (v > saldo + 0.005) {
        err('RP', f._fila, `valor ${v} supera el saldo del CDP ${nCdp} (${saldo})`);
        continue;
      }
      sumar(usado.cdp, nCdp, v);
    }
    rpNuevos.set(n, { codigo_rubro: cdpRef.codigo_rubro, nit_tercero: nit, valor: v, estado: e });
    ins(
      'INSERT INTO rp (tenant_id, numero, fecha, numero_cdp, codigo_rubro, nit_tercero, objeto, valor, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      tenantId, n, d, nCdp, cdpRef.codigo_rubro, nit, texto(f.objeto), v, e
    );
    contar('rp');
  }
  const buscarRp = (n: number) => rpNuevos.get(n) ?? rpExist.get(n);

  // ---------------------------------------------------------------- Obligaciones
  const obligNuevas = new Map<number, { codigo_rubro: string; nit_tercero: string; valor: number; estado: string }>();
  for (const f of leerHoja(wb, 'Obligaciones').sort((a, b) => fecha(a.fecha).localeCompare(fecha(b.fecha)))) {
    if (!requeridos('Obligaciones', f)) continue;
    const n = validarNumero('Obligaciones', f, 'numero');
    const nRp = validarNumero('Obligaciones', f, 'numero_rp');
    const d = validarFecha('Obligaciones', f);
    const v = validarValor('Obligaciones', f);
    const e = validarEstado('Obligaciones', f);
    const rpRef = nRp !== null ? buscarRp(nRp) : undefined;
    if (nRp !== null && !rpRef) err('Obligaciones', f._fila, `el RP ${nRp} no existe`);
    else if (rpRef?.estado === 'ANULADO') err('Obligaciones', f._fila, `el RP ${nRp} está anulado`);
    if (n !== null && (obligExist.has(n) || obligNuevas.has(n))) err('Obligaciones', f._fila, `la obligación ${n} ya existe`);
    if (n === null || nRp === null || !d || v === null || !e || !rpRef || rpRef.estado === 'ANULADO' || obligExist.has(n) || obligNuevas.has(n)) continue;

    if (e === 'ACTIVO') {
      const saldo = rpRef.valor - (usado.rp.get(nRp) ?? 0);
      if (v > saldo + 0.005) {
        err('Obligaciones', f._fila, `valor ${v} supera el saldo del RP ${nRp} (${saldo})`);
        continue;
      }
      sumar(usado.rp, nRp, v);
    }
    obligNuevas.set(n, { codigo_rubro: rpRef.codigo_rubro, nit_tercero: rpRef.nit_tercero, valor: v, estado: e });
    ins(
      'INSERT INTO obligaciones (tenant_id, numero, fecha, numero_rp, codigo_rubro, nit_tercero, valor, factura, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      tenantId, n, d, nRp, rpRef.codigo_rubro, rpRef.nit_tercero, v, texto(f.factura), e
    );
    contar('obligaciones');
  }
  const buscarOblig = (n: number) => obligNuevas.get(n) ?? obligExist.get(n);

  // ---------------------------------------------------------------- Pagos
  const pagosNuevos = new Set<number>();
  for (const f of leerHoja(wb, 'Pagos').sort((a, b) => fecha(a.fecha).localeCompare(fecha(b.fecha)))) {
    if (!requeridos('Pagos', f)) continue;
    const n = validarNumero('Pagos', f, 'numero');
    const nOb = validarNumero('Pagos', f, 'numero_obligacion');
    const d = validarFecha('Pagos', f);
    const v = validarValor('Pagos', f);
    const e = validarEstado('Pagos', f);
    const obRef = nOb !== null ? buscarOblig(nOb) : undefined;
    if (nOb !== null && !obRef) err('Pagos', f._fila, `la obligación ${nOb} no existe`);
    else if (obRef?.estado === 'ANULADO') err('Pagos', f._fila, `la obligación ${nOb} está anulada`);
    if (n !== null && (pagosExist.has(n) || pagosNuevos.has(n))) err('Pagos', f._fila, `el pago ${n} ya existe`);
    if (n === null || nOb === null || !d || v === null || !e || !obRef || obRef.estado === 'ANULADO' || pagosExist.has(n) || pagosNuevos.has(n)) continue;

    if (e === 'ACTIVO') {
      const saldo = obRef.valor - (usado.oblig.get(nOb) ?? 0);
      if (v > saldo + 0.005) {
        err('Pagos', f._fila, `valor ${v} supera el saldo de la obligación ${nOb} (${saldo})`);
        continue;
      }
      sumar(usado.oblig, nOb, v);
    }
    pagosNuevos.add(n);
    ins(
      `INSERT INTO pagos (tenant_id, numero, fecha, numero_obligacion, codigo_rubro, nit_tercero, valor, concepto, medio_pago, no_comprobante, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      tenantId, n, d, nOb, obRef.codigo_rubro, obRef.nit_tercero, v, texto(f.concepto),
      texto(f.medio_pago) || 'Transferencia', texto(f.no_comprobante), e
    );
    contar('pagos');
  }

  // ---------------------------------------------------------------- Reconocimientos
  for (const f of leerHoja(wb, 'Reconocimientos')) {
    if (!requeridos('Reconocimientos', f)) continue;
    const d = validarFecha('Reconocimientos', f);
    const v = validarValor('Reconocimientos', f);
    const rubro = rubrosIngreso.get(texto(f.codigo_rubro));
    if (!rubro) err('Reconocimientos', f._fila, `el rubro ${texto(f.codigo_rubro)} no existe en ingresos`);
    else if (rubro.es_hoja !== 1) err('Reconocimientos', f._fila, `el rubro ${rubro.codigo} no es hoja`);
    if (!d || v === null || !rubro || rubro.es_hoja !== 1) continue;
    if (reconocimientosExist.has(`${d}|${rubro.codigo}|${v}`)) {
      err('Reconocimientos', f._fila, `ya existe un reconocimiento del ${d} en el rubro ${rubro.codigo} por ${v} (¿se cargó antes?)`);
      continue;
    }
    ins(
      "INSERT INTO reconocimientos (tenant_id, fecha, codigo_rubro, concepto, valor_reconocido, valor_recaudado, estado) VALUES (?, ?, ?, ?, ?, 0, 'ACTIVO')",
      tenantId, d, rubro.codigo, texto(f.concepto), v
    );
    contar('reconocimientos');
  }

  // ---------------------------------------------------------------- Recaudos
  const recaudosNuevos = new Set<number>();
  for (const f of leerHoja(wb, 'Recaudos')) {
    if (!requeridos('Recaudos', f)) continue;
    const n = validarNumero('Recaudos', f, 'numero');
    const d = validarFecha('Recaudos', f);
    const v = validarValor('Recaudos', f);
    const e = validarEstado('Recaudos', f);
    const rubro = rubrosIngreso.get(texto(f.codigo_rubro));
    if (!rubro) err('Recaudos', f._fila, `el rubro ${texto(f.codigo_rubro)} no existe en ingresos`);
    else if (rubro.es_hoja !== 1) err('Recaudos', f._fila, `el rubro ${rubro.codigo} no es hoja`);
    if (n !== null && (recaudosExist.has(n) || recaudosNuevos.has(n))) err('Recaudos', f._fila, `el recaudo ${n} ya existe`);
    if (n === null || !d || v === null || !e || !rubro || rubro.es_hoja !== 1 || recaudosExist.has(n) || recaudosNuevos.has(n)) continue;
    recaudosNuevos.add(n);
    ins(
      'INSERT INTO recaudos (tenant_id, numero, fecha, codigo_rubro, valor, concepto, no_comprobante, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      tenantId, n, d, rubro.codigo, v, texto(f.concepto), texto(f.no_comprobante), e
    );
    contar('recaudos');
  }

  if (errores.length > 0) {
    return { ok: false, errores, resumen: {} };
  }
  if (stmts.length === 0) {
    return { ok: false, errores: ['El archivo no tiene filas nuevas para cargar'], resumen: {} };
  }

  // Estados AGOTADO de CDP y RP según los saldos resultantes
  stmts.push(
    db.prepare(
      `UPDATE cdp SET estado = 'AGOTADO' WHERE tenant_id = ? AND estado = 'ACTIVO'
         AND valor <= (SELECT COALESCE(SUM(valor), 0) FROM rp WHERE rp.tenant_id = cdp.tenant_id AND rp.numero_cdp = cdp.numero AND rp.estado != 'ANULADO')`
    ).bind(tenantId),
    db.prepare(
      `UPDATE rp SET estado = 'AGOTADO' WHERE tenant_id = ? AND estado = 'ACTIVO'
         AND valor <= (SELECT COALESCE(SUM(valor), 0) FROM obligaciones o WHERE o.tenant_id = rp.tenant_id AND o.numero_rp = rp.numero AND o.estado != 'ANULADO')`
    ).bind(tenantId)
  );

  await db.batch(stmts);
  return { ok: true, errores: [], resumen };
}
