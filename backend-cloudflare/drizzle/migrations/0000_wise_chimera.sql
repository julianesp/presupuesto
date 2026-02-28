CREATE TABLE `cat_conceptos` (
	`codigo` integer PRIMARY KEY NOT NULL,
	`nombre` text(500) NOT NULL,
	`tipo` text(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cat_fuentes` (
	`codigo` integer PRIMARY KEY NOT NULL,
	`nombre` text(500) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cat_items` (
	`codigo` integer PRIMARY KEY NOT NULL,
	`nombre` text(500) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cdp` (
	`tenant_id` text(36) NOT NULL,
	`numero` integer PRIMARY KEY NOT NULL,
	`fecha` text(10) NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`objeto` text(1000) NOT NULL,
	`valor` real NOT NULL,
	`estado` text(20) DEFAULT 'ACTIVO' NOT NULL,
	`fuente_sifse` integer DEFAULT 0 NOT NULL,
	`item_sifse` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`codigo_rubro`) REFERENCES `rubros_gastos`(`codigo`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_cdp_tenant` ON `cdp` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `config` (
	`tenant_id` text(36) NOT NULL,
	`clave` text(100) NOT NULL,
	`valor` text(1000),
	`descripcion` text(500),
	PRIMARY KEY(`tenant_id`, `clave`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cuentas_bancarias` (
	`tenant_id` text(36) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`banco` text(200) NOT NULL,
	`numero_cuenta` text(100) NOT NULL,
	`tipo_cuenta` text(50) NOT NULL,
	`titular` text(300) NOT NULL,
	`saldo` real DEFAULT 0 NOT NULL,
	`activa` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_cuentas_bancarias_tenant` ON `cuentas_bancarias` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `detalle_modificaciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id_modificacion` integer NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`tipo_operacion` text(20) NOT NULL,
	`valor` real NOT NULL,
	FOREIGN KEY (`id_modificacion`) REFERENCES `modificaciones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `modificaciones` (
	`tenant_id` text(36) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text(10) NOT NULL,
	`tipo` text(50) NOT NULL,
	`tipo_presupuesto` text(20) NOT NULL,
	`acto_administrativo` text(200) NOT NULL,
	`justificacion` text(2000),
	`estado` text(20) DEFAULT 'APROBADA' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_modificaciones_tenant` ON `modificaciones` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `obligaciones` (
	`tenant_id` text(36) NOT NULL,
	`numero` integer PRIMARY KEY NOT NULL,
	`fecha` text(10) NOT NULL,
	`numero_rp` integer NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`nit_tercero` text(50),
	`valor` real NOT NULL,
	`factura` text(500) DEFAULT '' NOT NULL,
	`estado` text(20) DEFAULT 'ACTIVO' NOT NULL,
	`fuente_sifse` integer DEFAULT 0 NOT NULL,
	`item_sifse` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`numero_rp`) REFERENCES `rp`(`numero`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`codigo_rubro`) REFERENCES `rubros_gastos`(`codigo`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`nit_tercero`) REFERENCES `terceros`(`nit`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_obligaciones_tenant` ON `obligaciones` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `pac` (
	`tenant_id` text(36) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`descripcion` text(1000) NOT NULL,
	`valor_estimado` real NOT NULL,
	`tipo_contrato` text(100),
	`fecha_estimada` text(10),
	`estado` text(20) DEFAULT 'PLANEADO' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`codigo_rubro`) REFERENCES `rubros_gastos`(`codigo`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_pac_tenant` ON `pac` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `pagos` (
	`tenant_id` text(36) NOT NULL,
	`numero` integer PRIMARY KEY NOT NULL,
	`fecha` text(10) NOT NULL,
	`numero_obligacion` integer NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`nit_tercero` text(50),
	`valor` real NOT NULL,
	`concepto` text(500) DEFAULT '' NOT NULL,
	`medio_pago` text(50) DEFAULT 'Transferencia' NOT NULL,
	`no_comprobante` text(100) DEFAULT '' NOT NULL,
	`cuenta_bancaria_id` integer DEFAULT 0 NOT NULL,
	`estado` text(20) DEFAULT 'ACTIVO' NOT NULL,
	`fuente_sifse` integer DEFAULT 0 NOT NULL,
	`item_sifse` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`numero_obligacion`) REFERENCES `obligaciones`(`numero`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`codigo_rubro`) REFERENCES `rubros_gastos`(`codigo`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`nit_tercero`) REFERENCES `terceros`(`nit`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_pagos_tenant` ON `pagos` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `recaudos` (
	`tenant_id` text(36) NOT NULL,
	`numero` integer PRIMARY KEY NOT NULL,
	`fecha` text(10) NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`valor` real NOT NULL,
	`concepto` text(500) DEFAULT '' NOT NULL,
	`no_comprobante` text(100) DEFAULT '' NOT NULL,
	`estado` text(20) DEFAULT 'ACTIVO' NOT NULL,
	`cuenta_bancaria_id` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`codigo_rubro`) REFERENCES `rubros_ingresos`(`codigo`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_recaudos_tenant` ON `recaudos` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `reconocimientos` (
	`tenant_id` text(36) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text(10) NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`concepto` text(1000) NOT NULL,
	`valor_reconocido` real NOT NULL,
	`valor_recaudado` real DEFAULT 0 NOT NULL,
	`estado` text(20) DEFAULT 'PENDIENTE' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`codigo_rubro`) REFERENCES `rubros_ingresos`(`codigo`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_reconocimientos_tenant` ON `reconocimientos` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `rp` (
	`tenant_id` text(36) NOT NULL,
	`numero` integer PRIMARY KEY NOT NULL,
	`fecha` text(10) NOT NULL,
	`numero_cdp` integer NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`nit_tercero` text(50),
	`objeto` text(1000) NOT NULL,
	`valor` real NOT NULL,
	`estado` text(20) DEFAULT 'ACTIVO' NOT NULL,
	`fuente_sifse` integer DEFAULT 0 NOT NULL,
	`item_sifse` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`numero_cdp`) REFERENCES `cdp`(`numero`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`codigo_rubro`) REFERENCES `rubros_gastos`(`codigo`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`nit_tercero`) REFERENCES `terceros`(`nit`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_rp_tenant` ON `rp` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `rubros_gastos` (
	`tenant_id` text(36) NOT NULL,
	`codigo` text(50) PRIMARY KEY NOT NULL,
	`cuenta` text(500) NOT NULL,
	`es_hoja` integer DEFAULT 0 NOT NULL,
	`apropiacion_inicial` real DEFAULT 0 NOT NULL,
	`adiciones` real DEFAULT 0 NOT NULL,
	`reducciones` real DEFAULT 0 NOT NULL,
	`creditos` real DEFAULT 0 NOT NULL,
	`contracreditos` real DEFAULT 0 NOT NULL,
	`apropiacion_definitiva` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_rubros_gastos_tenant` ON `rubros_gastos` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `rubros_ingresos` (
	`tenant_id` text(36) NOT NULL,
	`codigo` text(50) PRIMARY KEY NOT NULL,
	`cuenta` text(500) NOT NULL,
	`es_hoja` integer DEFAULT 0 NOT NULL,
	`presupuesto_inicial` real DEFAULT 0 NOT NULL,
	`adiciones` real DEFAULT 0 NOT NULL,
	`reducciones` real DEFAULT 0 NOT NULL,
	`presupuesto_definitivo` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_rubros_ingresos_tenant` ON `rubros_ingresos` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text(300) NOT NULL,
	`nit` text(25) NOT NULL,
	`codigo_dane` text(20),
	`vigencia_actual` integer DEFAULT 2026 NOT NULL,
	`estado` text(20) DEFAULT 'ACTIVO' NOT NULL,
	`fecha_creacion` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_nit_unique` ON `tenants` (`nit`);--> statement-breakpoint
CREATE TABLE `terceros` (
	`tenant_id` text(36) NOT NULL,
	`nit` text(50) PRIMARY KEY NOT NULL,
	`dv` text(2) DEFAULT '' NOT NULL,
	`nombre` text(500) NOT NULL,
	`direccion` text(300) DEFAULT '' NOT NULL,
	`telefono` text(50) DEFAULT '' NOT NULL,
	`email` text(200) DEFAULT '' NOT NULL,
	`tipo` text(20) DEFAULT 'Natural' NOT NULL,
	`banco` text(100) DEFAULT '' NOT NULL,
	`tipo_cuenta` text(50) DEFAULT '' NOT NULL,
	`no_cuenta` text(50) DEFAULT '' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_terceros_tenant` ON `terceros` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `ix_terceros_nit` ON `terceros` (`nit`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text(36) NOT NULL,
	`email` text(200) NOT NULL,
	`nombre` text(300) NOT NULL,
	`cargo` text(100),
	`rol` text(20) DEFAULT 'CONSULTA' NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`fecha_creacion` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `ix_users_tenant` ON `users` (`tenant_id`);