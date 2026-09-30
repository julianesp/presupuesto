/**
 * Servicio contable (Res. 414 de 2014 - CGN)
 *
 * Reglas del catálogo, validación y registro de comprobantes (partida doble),
 * carga del catálogo y de los saldos iniciales desde Excel.
 */

import * as XLSX from 'xlsx';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

export const TIPOS_COMPROBANTE = ['APERTURA', 'DIARIO', 'AJUSTE', 'DEPRECIACION', 'PROVISION', 'CIERRE'] as const;
export type TipoComprobante = (typeof TIPOS_COMPROBANTE)[number];

// ============================================================================
// REGLAS DEL CATÁLOGO
// ============================================================================

/** Deja solo los dígitos del código (el catálogo de la CGN no usa puntos). */
export function normalizarCodigo(codigo: unknown): string {
  return String(codigo ?? '').replace(/\D/g, '');
}

/** Nivel según la longitud del código: clase (1), grupo (2), cuenta (4), subcuenta (6), auxiliares (8, 10...). */
export function nivelCuenta(codigo: string): number {
  const n = codigo.length;
  if (n <= 1) return 1;
  if (n <= 2) return 2;
  if (n <= 4) return 3;
  if (n <= 6) return 4;
  return 4 + Math.ceil((n - 6) / 2);
}

/**
 * Naturaleza por defecto según la clase. Las cuentas de valuación del activo
 * (depreciación, amortización y deterioro acumulados) son de naturaleza crédito.
 */
export function naturalezaPorDefecto(codigo: string, nombre: string): 'D' | 'C' {
  const clase = codigo[0];
  if (clase === '1') return /ACUMULAD/i.test(nombre) ? 'C' : 'D';
  if (clase === '2' || clase === '3' || clase === '4') return 'C';
  if (clase === '5' || clase === '6' || clase === '7') return 'D';
  if (clase === '8') return codigo.startsWith('89') ? 'C' : 'D'; // 89 deudoras por contra
  if (clase === '9') return codigo.startsWith('99') ? 'D' : 'C'; // 99 acreedoras por contra
  return 'D';
}

/**
 * Naturaleza de una cuenta nueva: la de su cuenta madre más cercana (así las subcuentas
 * de 1685 Depreciación acumulada quedan crédito); si no tiene madre, la de la clase.
 */
export function naturalezaHeredada(codigo: string, nombre: string, conocidas: Map<string, string>): 'D' | 'C' {
  // Cuenta de valuación del activo (depreciación/amortización/deterioro acumulado): crédito aunque su madre sea débito
  if (codigo[0] === '1' && /ACUMULAD/i.test(nombre)) return 'C';
  for (let n = codigo.length - 1; n >= 1; n--) {
    const madre = conocidas.get(codigo.slice(0, n));
    if (madre === 'D' || madre === 'C') return madre;
  }
  return naturalezaPorDefecto(codigo, nombre);
}

/** Recalcula qué cuentas son auxiliares (no tienen subcuentas) en el catálogo de la empresa. */
export function sentenciaRecalcularAuxiliares(db: D1Database, tenantId: string): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE cuentas_contables SET es_auxiliar = CASE WHEN EXISTS (
         SELECT 1 FROM cuentas_contables h
         WHERE h.tenant_id = cuentas_contables.tenant_id
           AND h.codigo != cuentas_contables.codigo
           AND h.codigo LIKE cuentas_contables.codigo || '%'
       ) THEN 0 ELSE 1 END
       WHERE tenant_id = ?`
    )
    .bind(tenantId);
}

// ============================================================================
// PERIODOS
// ============================================================================

async function vigenciaEmpresa(db: D1Database, tenantId: string): Promise<number> {
  const t = await db.prepare('SELECT vigencia_actual AS v FROM tenants WHERE id = ?').bind(tenantId).first<{ v: number }>();
  return Number(t?.v) || new Date().getFullYear();
}

export async function periodoCerrado(db: D1Database, tenantId: string, fecha: string): Promise<boolean> {
  const [anio, mes] = fecha.split('-').map(Number);
  const p = await db
    .prepare('SELECT cerrado FROM periodos_contables WHERE tenant_id = ? AND anio = ? AND mes = ?')
    .bind(tenantId, anio, mes)
    .first<{ cerrado: number }>();
  return p?.cerrado === 1;
}

// ============================================================================
// COMPROBANTES
// ============================================================================

export interface LineaComprobante {
  codigoCuenta: string;
  nitTercero?: string | null;
  descripcion?: string;
  debito: number;
  credito: number;
}

export interface NuevoComprobante {
  tipo: TipoComprobante;
  fecha: string;
  descripcion: string;
  lineas: LineaComprobante[];
  origenTipo?: string | null;
  origenNumero?: number | null;
  usuarioId?: number | null;
}

const redondear = (v: number) => Math.round(v * 100) / 100;

/**
 * Valida un comprobante. Devuelve la lista de errores (vacía si es válido).
 * `prefijo` permite identificar la fila de origen (ej. "fila 5") en cargas masivas.
 */
export async function validarComprobante(
  db: D1Database,
  tenantId: string,
  c: NuevoComprobante,
  prefijo: (i: number) => string = (i) => `línea ${i + 1}`
): Promise<string[]> {
  const errores: string[] = [];

  if (!TIPOS_COMPROBANTE.includes(c.tipo)) errores.push(`tipo de comprobante "${c.tipo}" no válido`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)) {
    errores.push(`fecha inválida "${c.fecha}"`);
  } else {
    const vigencia = await vigenciaEmpresa(db, tenantId);
    if (!c.fecha.startsWith(String(vigencia))) errores.push(`la fecha ${c.fecha} no pertenece a la vigencia ${vigencia}`);
    if (await periodoCerrado(db, tenantId, c.fecha)) errores.push(`el periodo ${c.fecha.slice(0, 7)} está cerrado`);
  }
  if (!c.descripcion?.trim()) errores.push('la descripción es obligatoria');
  if (c.lineas.length < 2) errores.push('un comprobante necesita al menos dos líneas');

  const cuentas = new Map(
    (
      await db
        .prepare('SELECT codigo, es_auxiliar, requiere_tercero, activa FROM cuentas_contables WHERE tenant_id = ?')
        .bind(tenantId)
        .all<{ codigo: string; es_auxiliar: number; requiere_tercero: number; activa: number }>()
    ).results.map((r) => [r.codigo, r])
  );
  const terceros = new Set(
    (await db.prepare('SELECT nit FROM terceros WHERE tenant_id = ?').bind(tenantId).all<{ nit: string }>()).results.map(
      (r) => r.nit
    )
  );

  let debitos = 0;
  let creditos = 0;
  c.lineas.forEach((l, i) => {
    const donde = prefijo(i);
    const cuenta = cuentas.get(l.codigoCuenta);
    if (!cuenta) errores.push(`${donde}: la cuenta ${l.codigoCuenta} no existe en el catálogo`);
    else if (cuenta.es_auxiliar !== 1) errores.push(`${donde}: la cuenta ${l.codigoCuenta} no es auxiliar (tiene subcuentas)`);
    else if (cuenta.activa !== 1) errores.push(`${donde}: la cuenta ${l.codigoCuenta} está inactiva`);
    if (cuenta?.requiere_tercero === 1 && !l.nitTercero) errores.push(`${donde}: la cuenta ${l.codigoCuenta} exige tercero`);
    if (l.nitTercero && !terceros.has(l.nitTercero)) errores.push(`${donde}: el tercero ${l.nitTercero} no existe`);

    const d = Number(l.debito) || 0;
    const cr = Number(l.credito) || 0;
    if (d < 0 || cr < 0) errores.push(`${donde}: los valores no pueden ser negativos`);
    if ((d > 0) === (cr > 0)) errores.push(`${donde}: registre el valor en débito o en crédito, no en ambos ni en ninguno`);
    debitos += d;
    creditos += cr;
  });

  if (c.lineas.length >= 2 && redondear(debitos) !== redondear(creditos)) {
    errores.push(`el comprobante no cuadra: débitos ${redondear(debitos)} ≠ créditos ${redondear(creditos)}`);
  }
  return errores;
}

/**
 * Sentencias para registrar un comprobante ya validado (para ejecutar en un batch).
 * El número es el siguiente consecutivo por empresa y tipo.
 */
export async function sentenciasComprobante(
  db: D1Database,
  tenantId: string,
  c: NuevoComprobante
): Promise<{ numero: number; stmts: D1PreparedStatement[] }> {
  const ultimo = await db
    .prepare('SELECT COALESCE(MAX(numero), 0) AS n FROM comprobantes_contables WHERE tenant_id = ? AND tipo = ?')
    .bind(tenantId, c.tipo)
    .first<{ n: number }>();
  const numero = (ultimo?.n ?? 0) + 1;

  const stmts: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO comprobantes_contables
           (tenant_id, tipo, numero, fecha, descripcion, estado, origen_tipo, origen_numero, usuario_id, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, 'ACTIVO', ?, ?, ?, ?)`
      )
      .bind(tenantId, c.tipo, numero, c.fecha, c.descripcion.trim(), c.origenTipo ?? null, c.origenNumero ?? null,
        c.usuarioId ?? null, new Date().toISOString()),
  ];
  for (const l of c.lineas) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO movimientos_contables (tenant_id, comprobante_id, codigo_cuenta, nit_tercero, descripcion, debito, credito)
           VALUES (?, (SELECT id FROM comprobantes_contables WHERE tenant_id = ? AND tipo = ? AND numero = ?), ?, ?, ?, ?, ?)`
        )
        .bind(tenantId, tenantId, c.tipo, numero, l.codigoCuenta, l.nitTercero || null, l.descripcion ?? '',
          redondear(Number(l.debito) || 0), redondear(Number(l.credito) || 0))
    );
  }
  return { numero, stmts };
}

// ============================================================================
// UTILIDADES EXCEL
// ============================================================================

function texto(v: unknown): string {
  return v === undefined || v === null ? '' : String(v).trim();
}

function numero(v: unknown): number {
  if (typeof v === 'number') return v;
  const t = texto(v).replace(/[$\s]/g, '');
  if (t === '') return 0;
  // Acepta 1.234.567,89 y 1234567.89
  const limpio = /,\d{1,2}$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  return Number(limpio);
}

/** Filas de la primera hoja que tenga las columnas indicadas, con claves en minúscula. */
function leerFilas(archivo: ArrayBuffer, hojaPreferida: string): { hoja: string; filas: Record<string, unknown>[] } {
  const wb = XLSX.read(archivo, { type: 'array' });
  const hoja = wb.SheetNames.find((n) => n.toLowerCase() === hojaPreferida.toLowerCase()) ?? wb.SheetNames[0];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[hoja], { defval: '', raw: true }).map((f) => {
    const normal: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(f)) {
      normal[k.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')] = v;
    }
    return normal;
  });
  return { hoja, filas };
}

function libro(hojas: Record<string, (string | number)[][]>, anchos: Record<string, number[]>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [nombre, filas] of Object.entries(hojas)) {
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws['!cols'] = (anchos[nombre] ?? []).map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, nombre);
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

// ============================================================================
// CATÁLOGO DESDE EXCEL
// ============================================================================

export function plantillaCatalogo(): ArrayBuffer {
  return libro(
    {
      Instrucciones: [
        ['CATÁLOGO DE CUENTAS - RES. 414 DE 2014 (CGN)'],
        [],
        ['Hoja "Catalogo": una cuenta por fila, incluyendo clases, grupos, cuentas, subcuentas y auxiliares.'],
        ['codigo *: solo dígitos (1, 11, 1105, 110502, 11050201...). Los puntos se ignoran.'],
        ['nombre *: nombre de la cuenta.'],
        ['naturaleza: D (débito) o C (crédito). Vacío = según la clase (1,5,6,7 débito; 2,3,4 crédito; valuación del activo crédito).'],
        ['requiere_tercero: SI o NO (vacío = NO). Ej.: cuentas por cobrar y por pagar.'],
        [],
        ['Si la cuenta ya existe se actualizan su nombre, naturaleza y requiere_tercero.'],
        ['Solo las cuentas auxiliares (sin subcuentas) reciben movimientos.'],
      ],
      Catalogo: [
        ['codigo', 'nombre', 'naturaleza', 'requiere_tercero'],
        ['1', 'ACTIVOS', '', ''],
        ['11', 'EFECTIVO Y EQUIVALENTES AL EFECTIVO', '', ''],
        ['1110', 'DEPÓSITOS EN INSTITUCIONES FINANCIERAS', '', ''],
        ['111005', 'Cuenta corriente', '', ''],
        ['111006', 'Cuenta de ahorro', '', ''],
      ],
    },
    { Instrucciones: [110], Catalogo: [14, 60, 12, 18] }
  );
}

export interface ResultadoCarga {
  ok: boolean;
  errores: string[];
  resumen: Record<string, number>;
}

export async function importarCatalogo(db: D1Database, tenantId: string, archivo: ArrayBuffer): Promise<ResultadoCarga> {
  const { hoja, filas } = leerFilas(archivo, 'Catalogo');
  const errores: string[] = [];
  const naturalezas = new Map(
    (
      await db
        .prepare('SELECT codigo, naturaleza FROM cuentas_contables WHERE tenant_id = ?')
        .bind(tenantId)
        .all<{ codigo: string; naturaleza: string }>()
    ).results.map((r) => [r.codigo, r.naturaleza])
  );
  const existentes = new Set(naturalezas.keys());
  const vistos = new Set<string>();
  const stmts: D1PreparedStatement[] = [];
  let nuevas = 0;
  let actualizadas = 0;

  // Se procesan de madres a hijas para que las subcuentas hereden la naturaleza
  const ordenadas = filas
    .map((f, i) => ({ f, fila: i + 2, codigo: normalizarCodigo(f.codigo ?? f.cuenta ?? f.codigo_contable) }))
    .sort((a, b) => a.codigo.length - b.codigo.length || a.fila - b.fila);

  ordenadas.forEach(({ f, fila, codigo }) => {
    const nombre = texto(f.nombre ?? f.descripcion ?? f.nombre_cuenta);
    if (!codigo && !nombre) return;
    if (!codigo) return void errores.push(`${hoja} fila ${fila}: falta el código`);
    if (!nombre) return void errores.push(`${hoja} fila ${fila}: falta el nombre de la cuenta ${codigo}`);
    if (vistos.has(codigo)) return void errores.push(`${hoja} fila ${fila}: el código ${codigo} está repetido`);
    vistos.add(codigo);

    const nat = texto(f.naturaleza).toUpperCase().charAt(0);
    if (nat && nat !== 'D' && nat !== 'C') return void errores.push(`${hoja} fila ${fila}: naturaleza "${texto(f.naturaleza)}" no válida (D o C)`);
    const naturaleza = nat || naturalezaHeredada(codigo, nombre, naturalezas);
    naturalezas.set(codigo, naturaleza);
    const requiereTercero = /^(SI|SÍ|S|1|X|TRUE)$/i.test(texto(f.requiere_tercero)) ? 1 : 0;

    if (existentes.has(codigo)) actualizadas++;
    else nuevas++;
    stmts.push(
      db
        .prepare(
          `INSERT INTO cuentas_contables (tenant_id, codigo, nombre, naturaleza, nivel, es_auxiliar, requiere_tercero, activa)
           VALUES (?, ?, ?, ?, ?, 1, ?, 1)
           ON CONFLICT (tenant_id, codigo) DO UPDATE SET nombre = excluded.nombre, naturaleza = excluded.naturaleza,
             requiere_tercero = excluded.requiere_tercero`
        )
        .bind(tenantId, codigo, nombre, naturaleza, nivelCuenta(codigo), requiereTercero)
    );
  });

  if (errores.length) return { ok: false, errores, resumen: {} };
  if (!stmts.length) return { ok: false, errores: ['El archivo no tiene cuentas'], resumen: {} };

  stmts.push(sentenciaRecalcularAuxiliares(db, tenantId));
  await db.batch(stmts);
  return { ok: true, errores: [], resumen: { cuentas_nuevas: nuevas, cuentas_actualizadas: actualizadas } };
}

// ============================================================================
// SALDOS INICIALES (COMPROBANTE DE APERTURA)
// ============================================================================

export async function plantillaSaldosIniciales(db: D1Database, tenantId: string): Promise<ArrayBuffer> {
  const vigencia = await vigenciaEmpresa(db, tenantId);
  const auxiliares = (
    await db
      .prepare(
        'SELECT codigo, nombre, naturaleza, requiere_tercero FROM cuentas_contables WHERE tenant_id = ? AND es_auxiliar = 1 AND activa = 1 ORDER BY codigo'
      )
      .bind(tenantId)
      .all<{ codigo: string; nombre: string; naturaleza: string; requiere_tercero: number }>()
  ).results;

  return libro(
    {
      Instrucciones: [
        [`SALDOS INICIALES CONTABLES AL 1 DE ENERO DE ${vigencia}`],
        [],
        ['Hoja "Saldos": una línea por cuenta auxiliar (y por tercero cuando la cuenta lo exige).'],
        ['Los saldos de naturaleza débito van en la columna debito y los de naturaleza crédito en credito.'],
        ['El total de débitos debe ser igual al total de créditos (el balance de apertura debe cuadrar).'],
        ['Se registra como un comprobante de APERTURA con fecha 1 de enero. Solo puede haber uno activo por vigencia.'],
        ['La hoja "Cuentas" lista las cuentas auxiliares disponibles en el catálogo de la empresa.'],
      ],
      Saldos: [
        ['codigo_cuenta', 'nit_tercero', 'descripcion', 'debito', 'credito'],
        ['11100501', '', 'Saldo cuenta corriente', 15000000, ''],
        ['31050601', '', 'Capital fiscal', '', 15000000],
      ],
      Cuentas: [
        ['codigo', 'nombre', 'naturaleza', 'requiere_tercero'],
        ...auxiliares.map((c) => [c.codigo, c.nombre, c.naturaleza, c.requiere_tercero ? 'SI' : 'NO']),
      ],
    },
    { Instrucciones: [110], Saldos: [16, 16, 40, 16, 16], Cuentas: [16, 60, 12, 18] }
  );
}

export async function importarSaldosIniciales(
  db: D1Database,
  tenantId: string,
  archivo: ArrayBuffer,
  usuarioId: number | null
): Promise<ResultadoCarga> {
  const vigencia = await vigenciaEmpresa(db, tenantId);
  const existente = await db
    .prepare("SELECT numero FROM comprobantes_contables WHERE tenant_id = ? AND tipo = 'APERTURA' AND estado = 'ACTIVO' AND fecha LIKE ?")
    .bind(tenantId, `${vigencia}-%`)
    .first<{ numero: number }>();
  if (existente) {
    return {
      ok: false,
      errores: [`Ya existe el comprobante de apertura APERTURA-${existente.numero} de ${vigencia}. Anúlelo antes de cargar otro.`],
      resumen: {},
    };
  }

  const { hoja, filas } = leerFilas(archivo, 'Saldos');
  const errores: string[] = [];
  const lineas: (LineaComprobante & { fila: number })[] = [];
  filas.forEach((f, i) => {
    const codigo = normalizarCodigo(f.codigo_cuenta ?? f.codigo);
    const debito = numero(f.debito);
    const credito = numero(f.credito);
    if (!codigo && !debito && !credito) return;
    if (Number.isNaN(debito) || Number.isNaN(credito)) return void errores.push(`${hoja} fila ${i + 2}: valor inválido`);
    lineas.push({
      fila: i + 2,
      codigoCuenta: codigo,
      nitTercero: texto(f.nit_tercero) || null,
      descripcion: texto(f.descripcion) || 'Saldo inicial',
      debito,
      credito,
    });
  });

  const comprobante: NuevoComprobante = {
    tipo: 'APERTURA',
    fecha: `${vigencia}-01-01`,
    descripcion: `Saldos iniciales vigencia ${vigencia}`,
    lineas,
    usuarioId,
  };
  errores.push(...(await validarComprobante(db, tenantId, comprobante, (i) => `${hoja} fila ${lineas[i].fila}`)));
  if (errores.length) return { ok: false, errores, resumen: {} };

  const { numero: n, stmts } = await sentenciasComprobante(db, tenantId, comprobante);
  await db.batch(stmts);
  const total = lineas.reduce((s, l) => s + l.debito, 0);
  return { ok: true, errores: [], resumen: { comprobante_apertura: n, lineas: lineas.length, total_debitos: total } };
}
