/**
 * Sistema Presupuestal - Database Schema
 * Migrado de SQLAlchemy (Python) a Drizzle ORM (TypeScript)
 */

import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey, foreignKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// ============================================================================
// TENANTS Y USUARIOS
// ============================================================================

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  nombre: text('nombre', { length: 300 }).notNull(),
  nit: text('nit', { length: 25 }).notNull().unique(),
  codigoDane: text('codigo_dane', { length: 20 }),
  vigenciaActual: integer('vigencia_actual').notNull().default(2026),
  estado: text('estado', { length: 20 }).notNull().default('ACTIVO'), // ACTIVO | SUSPENDIDO
  fechaCreacion: text('fecha_creacion').notNull(),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  email: text('email', { length: 200 }).notNull().unique(),
  nombre: text('nombre', { length: 300 }).notNull(),
  cargo: text('cargo', { length: 100 }),
  rol: text('rol', { length: 20 }).notNull().default('CONSULTA'), // ADMIN | TESORERO | CONSULTA
  superAdmin: integer('super_admin', { mode: 'boolean' }).notNull().default(false), // Acceso total: editar y eliminar
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  fechaCreacion: text('fecha_creacion').notNull(),
}, (table) => ({
  tenantIdx: index('ix_users_tenant').on(table.tenantId),
}));

// ============================================================================
// RUBROS DE GASTOS
// ============================================================================

export const rubrosGastos = sqliteTable('rubros_gastos', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  codigo: text('codigo', { length: 50 }).notNull(),
  cuenta: text('cuenta', { length: 500 }).notNull(),
  esHoja: integer('es_hoja').notNull().default(0),
  apropiacionInicial: real('apropiacion_inicial').notNull().default(0),
  adiciones: real('adiciones').notNull().default(0),
  reducciones: real('reducciones').notNull().default(0),
  creditos: real('creditos').notNull().default(0),
  contracreditos: real('contracreditos').notNull().default(0),
  apropiacionDefinitiva: real('apropiacion_definitiva').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.codigo] }),
  tenantIdx: index('ix_rubros_gastos_tenant').on(table.tenantId),
}));

// ============================================================================
// RUBROS DE INGRESOS
// ============================================================================

export const rubrosIngresos = sqliteTable('rubros_ingresos', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  codigo: text('codigo', { length: 50 }).notNull(),
  cuenta: text('cuenta', { length: 500 }).notNull(),
  esHoja: integer('es_hoja').notNull().default(0),
  presupuestoInicial: real('presupuesto_inicial').notNull().default(0),
  adiciones: real('adiciones').notNull().default(0),
  reducciones: real('reducciones').notNull().default(0),
  presupuestoDefinitivo: real('presupuesto_definitivo').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.codigo] }),
  tenantIdx: index('ix_rubros_ingresos_tenant').on(table.tenantId),
}));

// ============================================================================
// CDP (Certificado de Disponibilidad Presupuestal)
// ============================================================================

export const cdp = sqliteTable('cdp', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  numero: integer('numero').notNull(),
  fecha: text('fecha', { length: 10 }).notNull(),
  codigoRubro: text('codigo_rubro', { length: 50 }).notNull(),
  objeto: text('objeto', { length: 1000 }).notNull(),
  valor: real('valor').notNull(),
  estado: text('estado', { length: 20 }).notNull().default('ACTIVO'),
  fuenteSifse: integer('fuente_sifse').notNull().default(0),
  itemSifse: integer('item_sifse').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.numero] }),
  rubroFk: foreignKey({ columns: [table.tenantId, table.codigoRubro], foreignColumns: [rubrosGastos.tenantId, rubrosGastos.codigo] }),
  tenantIdx: index('ix_cdp_tenant').on(table.tenantId),
}));

// ============================================================================
// RP (Registro Presupuestal)
// ============================================================================

export const rp = sqliteTable('rp', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  numero: integer('numero').notNull(),
  fecha: text('fecha', { length: 10 }).notNull(),
  numeroCdp: integer('numero_cdp').notNull(),
  codigoRubro: text('codigo_rubro', { length: 50 }).notNull(),
  nitTercero: text('nit_tercero', { length: 50 }),
  objeto: text('objeto', { length: 1000 }).notNull(),
  valor: real('valor').notNull(),
  estado: text('estado', { length: 20 }).notNull().default('ACTIVO'),
  fuenteSifse: integer('fuente_sifse').notNull().default(0),
  itemSifse: integer('item_sifse').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.numero] }),
  cdpFk: foreignKey({ columns: [table.tenantId, table.numeroCdp], foreignColumns: [cdp.tenantId, cdp.numero] }),
  rubroFk: foreignKey({ columns: [table.tenantId, table.codigoRubro], foreignColumns: [rubrosGastos.tenantId, rubrosGastos.codigo] }),
  terceroFk: foreignKey({ columns: [table.tenantId, table.nitTercero], foreignColumns: [terceros.tenantId, terceros.nit] }),
  tenantIdx: index('ix_rp_tenant').on(table.tenantId),
}));

// ============================================================================
// TERCEROS
// ============================================================================

export const terceros = sqliteTable('terceros', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  nit: text('nit', { length: 50 }).notNull(),
  dv: text('dv', { length: 2 }).notNull().default(''),
  nombre: text('nombre', { length: 500 }).notNull(),
  direccion: text('direccion', { length: 300 }).notNull().default(''),
  telefono: text('telefono', { length: 50 }).notNull().default(''),
  email: text('email', { length: 200 }).notNull().default(''),
  tipo: text('tipo', { length: 20 }).notNull().default('Natural'), // Natural | Juridico
  banco: text('banco', { length: 100 }).notNull().default(''),
  tipoCuenta: text('tipo_cuenta', { length: 50 }).notNull().default(''),
  noCuenta: text('no_cuenta', { length: 50 }).notNull().default(''),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.nit] }),
  tenantIdx: index('ix_terceros_tenant').on(table.tenantId),
  nitIdx: index('ix_terceros_nit').on(table.nit),
}));

// ============================================================================
// OBLIGACIONES
// ============================================================================

export const obligaciones = sqliteTable('obligaciones', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  numero: integer('numero').notNull(),
  fecha: text('fecha', { length: 10 }).notNull(),
  numeroRp: integer('numero_rp').notNull(),
  codigoRubro: text('codigo_rubro', { length: 50 }).notNull(),
  nitTercero: text('nit_tercero', { length: 50 }),
  valor: real('valor').notNull(),
  factura: text('factura', { length: 500 }).notNull().default(''),
  estado: text('estado', { length: 20 }).notNull().default('ACTIVO'),
  fuenteSifse: integer('fuente_sifse').notNull().default(0),
  itemSifse: integer('item_sifse').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.numero] }),
  rpFk: foreignKey({ columns: [table.tenantId, table.numeroRp], foreignColumns: [rp.tenantId, rp.numero] }),
  rubroFk: foreignKey({ columns: [table.tenantId, table.codigoRubro], foreignColumns: [rubrosGastos.tenantId, rubrosGastos.codigo] }),
  terceroFk: foreignKey({ columns: [table.tenantId, table.nitTercero], foreignColumns: [terceros.tenantId, terceros.nit] }),
  tenantIdx: index('ix_obligaciones_tenant').on(table.tenantId),
}));

// ============================================================================
// PAGOS
// ============================================================================

export const pagos = sqliteTable('pagos', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  numero: integer('numero').notNull(),
  fecha: text('fecha', { length: 10 }).notNull(),
  numeroObligacion: integer('numero_obligacion').notNull(),
  codigoRubro: text('codigo_rubro', { length: 50 }).notNull(),
  nitTercero: text('nit_tercero', { length: 50 }),
  valor: real('valor').notNull(),
  concepto: text('concepto', { length: 500 }).notNull().default(''),
  medioPago: text('medio_pago', { length: 50 }).notNull().default('Transferencia'),
  noComprobante: text('no_comprobante', { length: 100 }).notNull().default(''),
  cuentaBancariaId: integer('cuenta_bancaria_id').notNull().default(0),
  estado: text('estado', { length: 20 }).notNull().default('ACTIVO'),
  fuenteSifse: integer('fuente_sifse').notNull().default(0),
  itemSifse: integer('item_sifse').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.numero] }),
  obligacionFk: foreignKey({ columns: [table.tenantId, table.numeroObligacion], foreignColumns: [obligaciones.tenantId, obligaciones.numero] }),
  rubroFk: foreignKey({ columns: [table.tenantId, table.codigoRubro], foreignColumns: [rubrosGastos.tenantId, rubrosGastos.codigo] }),
  terceroFk: foreignKey({ columns: [table.tenantId, table.nitTercero], foreignColumns: [terceros.tenantId, terceros.nit] }),
  tenantIdx: index('ix_pagos_tenant').on(table.tenantId),
}));

// ============================================================================
// RECAUDOS (Ingresos)
// ============================================================================

export const recaudos = sqliteTable('recaudos', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  numero: integer('numero').notNull(),
  fecha: text('fecha', { length: 10 }).notNull(),
  codigoRubro: text('codigo_rubro', { length: 50 }).notNull(),
  valor: real('valor').notNull(),
  concepto: text('concepto', { length: 500 }).notNull().default(''),
  noComprobante: text('no_comprobante', { length: 100 }).notNull().default(''),
  estado: text('estado', { length: 20 }).notNull().default('ACTIVO'),
  cuentaBancariaId: integer('cuenta_bancaria_id').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.numero] }),
  rubroFk: foreignKey({ columns: [table.tenantId, table.codigoRubro], foreignColumns: [rubrosIngresos.tenantId, rubrosIngresos.codigo] }),
  tenantIdx: index('ix_recaudos_tenant').on(table.tenantId),
}));

// ============================================================================
// RECONOCIMIENTOS (Ingresos a reconocer)
// ============================================================================

export const reconocimientos = sqliteTable('reconocimientos', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha', { length: 10 }).notNull(),
  codigoRubro: text('codigo_rubro', { length: 50 }).notNull(),
  concepto: text('concepto', { length: 1000 }).notNull(),
  valorReconocido: real('valor_reconocido').notNull(),
  valorRecaudado: real('valor_recaudado').notNull().default(0),
  estado: text('estado', { length: 20 }).notNull().default('PENDIENTE'),
}, (table) => ({
  rubroFk: foreignKey({ columns: [table.tenantId, table.codigoRubro], foreignColumns: [rubrosIngresos.tenantId, rubrosIngresos.codigo] }),
  tenantIdx: index('ix_reconocimientos_tenant').on(table.tenantId),
}));

// ============================================================================
// MODIFICACIONES PRESUPUESTALES
// ============================================================================

export const modificaciones = sqliteTable('modificaciones', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha', { length: 10 }).notNull(),
  tipo: text('tipo', { length: 50 }).notNull(), // ADICION | REDUCCION | CREDITO | CONTRACREDITO | TRASLADO
  tipoPresupuesto: text('tipo_presupuesto', { length: 20 }).notNull(), // GASTO | INGRESO
  actoAdministrativo: text('acto_administrativo', { length: 200 }).notNull(),
  justificacion: text('justificacion', { length: 2000 }),
  estado: text('estado', { length: 20 }).notNull().default('APROBADA'),
}, (table) => ({
  tenantIdx: index('ix_modificaciones_tenant').on(table.tenantId),
}));

export const detalleModificaciones = sqliteTable('detalle_modificaciones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  idModificacion: integer('id_modificacion').notNull().references(() => modificaciones.id),
  codigoRubro: text('codigo_rubro', { length: 50 }).notNull(),
  tipoOperacion: text('tipo_operacion', { length: 20 }).notNull(), // SUMA | RESTA
  valor: real('valor').notNull(),
});

// ============================================================================
// PAC (Plan Anual de Contratación)
// ============================================================================

export const pac = sqliteTable('pac', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  id: integer('id').primaryKey({ autoIncrement: true }),
  codigoRubro: text('codigo_rubro', { length: 50 }).notNull(),
  descripcion: text('descripcion', { length: 1000 }).notNull(),
  valorEstimado: real('valor_estimado').notNull(),
  tipoContrato: text('tipo_contrato', { length: 100 }),
  fechaEstimada: text('fecha_estimada', { length: 10 }),
  estado: text('estado', { length: 20 }).notNull().default('PLANEADO'),
}, (table) => ({
  rubroFk: foreignKey({ columns: [table.tenantId, table.codigoRubro], foreignColumns: [rubrosGastos.tenantId, rubrosGastos.codigo] }),
  tenantIdx: index('ix_pac_tenant').on(table.tenantId),
}));

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export const config = sqliteTable('config', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  clave: text('clave', { length: 100 }).notNull(),
  valor: text('valor', { length: 1000 }),
  descripcion: text('descripcion', { length: 500 }),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.clave] }),
}));

// ============================================================================
// CUENTAS BANCARIAS
// ============================================================================

export const cuentasBancarias = sqliteTable('cuentas_bancarias', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  id: integer('id').primaryKey({ autoIncrement: true }),
  banco: text('banco', { length: 200 }).notNull(),
  numeroCuenta: text('numero_cuenta', { length: 100 }).notNull(),
  tipoCuenta: text('tipo_cuenta', { length: 50 }).notNull(),
  titular: text('titular', { length: 300 }).notNull(),
  saldo: real('saldo').notNull().default(0),
  activa: integer('activa', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({
  tenantIdx: index('ix_cuentas_bancarias_tenant').on(table.tenantId),
}));

// ============================================================================
// CONTABILIDAD (Res. 414 de 2014 - CGN)
// ============================================================================

export const cuentasContables = sqliteTable('cuentas_contables', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  codigo: text('codigo', { length: 30 }).notNull(),
  nombre: text('nombre', { length: 300 }).notNull(),
  naturaleza: text('naturaleza', { length: 1 }).notNull(), // D | C
  nivel: integer('nivel').notNull(), // 1 clase, 2 grupo, 3 cuenta, 4 subcuenta, 5+ auxiliar
  esAuxiliar: integer('es_auxiliar').notNull().default(1), // 1 = sin subcuentas, recibe movimientos
  requiereTercero: integer('requiere_tercero', { mode: 'boolean' }).notNull().default(false),
  activa: integer('activa', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.codigo] }),
}));

export const comprobantesContables = sqliteTable('comprobantes_contables', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo', { length: 20 }).notNull(), // APERTURA | DIARIO | AJUSTE | DEPRECIACION | PROVISION | CIERRE
  numero: integer('numero').notNull(), // consecutivo por empresa y tipo
  fecha: text('fecha', { length: 10 }).notNull(),
  descripcion: text('descripcion', { length: 1000 }).notNull(),
  estado: text('estado', { length: 20 }).notNull().default('ACTIVO'), // ACTIVO | ANULADO
  origenTipo: text('origen_tipo', { length: 20 }), // documento presupuestal que lo generó (Fase 2)
  origenNumero: integer('origen_numero'),
  usuarioId: integer('usuario_id'),
  fechaCreacion: text('fecha_creacion').notNull(),
}, (table) => ({
  tenantIdx: index('ix_comprobantes_contables_tenant').on(table.tenantId),
  numeroIdx: uniqueIndex('ux_comprobantes_contables_numero').on(table.tenantId, table.tipo, table.numero),
}));

export const movimientosContables = sqliteTable('movimientos_contables', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  id: integer('id').primaryKey({ autoIncrement: true }),
  comprobanteId: integer('comprobante_id').notNull().references(() => comprobantesContables.id),
  codigoCuenta: text('codigo_cuenta', { length: 30 }).notNull(),
  nitTercero: text('nit_tercero', { length: 50 }),
  descripcion: text('descripcion', { length: 500 }).notNull().default(''),
  debito: real('debito').notNull().default(0),
  credito: real('credito').notNull().default(0),
}, (table) => ({
  comprobanteIdx: index('ix_movimientos_contables_comprobante').on(table.comprobanteId),
  cuentaIdx: index('ix_movimientos_contables_cuenta').on(table.tenantId, table.codigoCuenta),
  cuentaFk: foreignKey({ columns: [table.tenantId, table.codigoCuenta], foreignColumns: [cuentasContables.tenantId, cuentasContables.codigo] }),
  terceroFk: foreignKey({ columns: [table.tenantId, table.nitTercero], foreignColumns: [terceros.tenantId, terceros.nit] }),
}));

export const periodosContables = sqliteTable('periodos_contables', {
  tenantId: text('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
  anio: integer('anio').notNull(),
  mes: integer('mes').notNull(),
  cerrado: integer('cerrado', { mode: 'boolean' }).notNull().default(false),
  fechaCierre: text('fecha_cierre'),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenantId, table.anio, table.mes] }),
}));

// ============================================================================
// CATÁLOGOS SIFSE
// ============================================================================

export const catFuentes = sqliteTable('cat_fuentes', {
  codigo: integer('codigo').primaryKey(),
  nombre: text('nombre', { length: 500 }).notNull(),
});

export const catItems = sqliteTable('cat_items', {
  codigo: integer('codigo').primaryKey(),
  nombre: text('nombre', { length: 500 }).notNull(),
});

export const catConceptos = sqliteTable('cat_conceptos', {
  codigo: integer('codigo').primaryKey(),
  nombre: text('nombre', { length: 500 }).notNull(),
  tipo: text('tipo', { length: 20 }).notNull(), // INGRESO | GASTO
});

// ============================================================================
// RELACIONES
// ============================================================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  usuarios: many(users),
  rubrosGastos: many(rubrosGastos),
  rubrosIngresos: many(rubrosIngresos),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}));

export const rubrosGastosRelations = relations(rubrosGastos, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [rubrosGastos.tenantId],
    references: [tenants.id],
  }),
  cdps: many(cdp),
  pacs: many(pac),
}));

export const rubrosIngresosRelations = relations(rubrosIngresos, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [rubrosIngresos.tenantId],
    references: [tenants.id],
  }),
  recaudos: many(recaudos),
  reconocimientos: many(reconocimientos),
}));

export const cdpRelations = relations(cdp, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [cdp.tenantId],
    references: [tenants.id],
  }),
  rubro: one(rubrosGastos, {
    fields: [cdp.tenantId, cdp.codigoRubro],
    references: [rubrosGastos.tenantId, rubrosGastos.codigo],
  }),
  rps: many(rp),
}));

export const rpRelations = relations(rp, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [rp.tenantId],
    references: [tenants.id],
  }),
  cdp: one(cdp, {
    fields: [rp.tenantId, rp.numeroCdp],
    references: [cdp.tenantId, cdp.numero],
  }),
  tercero: one(terceros, {
    fields: [rp.tenantId, rp.nitTercero],
    references: [terceros.tenantId, terceros.nit],
  }),
  obligaciones: many(obligaciones),
}));

export const obligacionesRelations = relations(obligaciones, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [obligaciones.tenantId],
    references: [tenants.id],
  }),
  rp: one(rp, {
    fields: [obligaciones.tenantId, obligaciones.numeroRp],
    references: [rp.tenantId, rp.numero],
  }),
  tercero: one(terceros, {
    fields: [obligaciones.tenantId, obligaciones.nitTercero],
    references: [terceros.tenantId, terceros.nit],
  }),
  pagos: many(pagos),
}));

export const pagosRelations = relations(pagos, ({ one }) => ({
  tenant: one(tenants, {
    fields: [pagos.tenantId],
    references: [tenants.id],
  }),
  obligacion: one(obligaciones, {
    fields: [pagos.tenantId, pagos.numeroObligacion],
    references: [obligaciones.tenantId, obligaciones.numero],
  }),
  tercero: one(terceros, {
    fields: [pagos.tenantId, pagos.nitTercero],
    references: [terceros.tenantId, terceros.nit],
  }),
}));

export const recaudosRelations = relations(recaudos, ({ one }) => ({
  tenant: one(tenants, {
    fields: [recaudos.tenantId],
    references: [tenants.id],
  }),
  rubro: one(rubrosIngresos, {
    fields: [recaudos.tenantId, recaudos.codigoRubro],
    references: [rubrosIngresos.tenantId, rubrosIngresos.codigo],
  }),
}));

export const reconocimientosRelations = relations(reconocimientos, ({ one }) => ({
  tenant: one(tenants, {
    fields: [reconocimientos.tenantId],
    references: [tenants.id],
  }),
  rubro: one(rubrosIngresos, {
    fields: [reconocimientos.tenantId, reconocimientos.codigoRubro],
    references: [rubrosIngresos.tenantId, rubrosIngresos.codigo],
  }),
}));

export const pacRelations = relations(pac, ({ one }) => ({
  tenant: one(tenants, {
    fields: [pac.tenantId],
    references: [tenants.id],
  }),
  rubro: one(rubrosGastos, {
    fields: [pac.tenantId, pac.codigoRubro],
    references: [rubrosGastos.tenantId, rubrosGastos.codigo],
  }),
}));
