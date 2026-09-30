-- Multiempresa: llaves primarias y foráneas compuestas (tenant_id + código/número).
--> statement-breakpoint
-- Se renombran las tablas viejas, se crean las nuevas de padres a hijos, se copian los datos y se borran las viejas de hijos a padres.
--> statement-breakpoint
DROP INDEX IF EXISTS `ix_rubros_gastos_tenant`;
--> statement-breakpoint
ALTER TABLE `rubros_gastos` RENAME TO `__old_rubros_gastos`;
--> statement-breakpoint
DROP INDEX IF EXISTS `ix_rubros_ingresos_tenant`;
--> statement-breakpoint
ALTER TABLE `rubros_ingresos` RENAME TO `__old_rubros_ingresos`;
--> statement-breakpoint
DROP INDEX IF EXISTS `ix_terceros_tenant`;
--> statement-breakpoint
DROP INDEX IF EXISTS `ix_terceros_nit`;
--> statement-breakpoint
ALTER TABLE `terceros` RENAME TO `__old_terceros`;
--> statement-breakpoint
DROP INDEX IF EXISTS `ix_cdp_tenant`;
--> statement-breakpoint
ALTER TABLE `cdp` RENAME TO `__old_cdp`;
--> statement-breakpoint
DROP INDEX IF EXISTS `ix_rp_tenant`;
--> statement-breakpoint
ALTER TABLE `rp` RENAME TO `__old_rp`;
--> statement-breakpoint
DROP INDEX IF EXISTS `ix_obligaciones_tenant`;
--> statement-breakpoint
ALTER TABLE `obligaciones` RENAME TO `__old_obligaciones`;
--> statement-breakpoint
DROP INDEX IF EXISTS `ix_pagos_tenant`;
--> statement-breakpoint
ALTER TABLE `pagos` RENAME TO `__old_pagos`;
--> statement-breakpoint
DROP INDEX IF EXISTS `ix_recaudos_tenant`;
--> statement-breakpoint
ALTER TABLE `recaudos` RENAME TO `__old_recaudos`;
--> statement-breakpoint
DROP INDEX IF EXISTS `ix_reconocimientos_tenant`;
--> statement-breakpoint
ALTER TABLE `reconocimientos` RENAME TO `__old_reconocimientos`;
--> statement-breakpoint
DROP INDEX IF EXISTS `ix_pac_tenant`;
--> statement-breakpoint
ALTER TABLE `pac` RENAME TO `__old_pac`;
--> statement-breakpoint
CREATE TABLE `rubros_gastos` (
	`tenant_id` text(36) NOT NULL,
	`codigo` text(50) NOT NULL,
	`cuenta` text(500) NOT NULL,
	`es_hoja` integer DEFAULT 0 NOT NULL,
	`apropiacion_inicial` real DEFAULT 0 NOT NULL,
	`adiciones` real DEFAULT 0 NOT NULL,
	`reducciones` real DEFAULT 0 NOT NULL,
	`creditos` real DEFAULT 0 NOT NULL,
	`contracreditos` real DEFAULT 0 NOT NULL,
	`apropiacion_definitiva` real DEFAULT 0 NOT NULL,
	PRIMARY KEY(`tenant_id`, `codigo`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `rubros_gastos`("tenant_id", "codigo", "cuenta", "es_hoja", "apropiacion_inicial", "adiciones", "reducciones", "creditos", "contracreditos", "apropiacion_definitiva") SELECT "tenant_id", "codigo", "cuenta", "es_hoja", "apropiacion_inicial", "adiciones", "reducciones", "creditos", "contracreditos", "apropiacion_definitiva" FROM `__old_rubros_gastos`;
--> statement-breakpoint
CREATE INDEX `ix_rubros_gastos_tenant` ON `rubros_gastos` (`tenant_id`);
--> statement-breakpoint
CREATE TABLE `rubros_ingresos` (
	`tenant_id` text(36) NOT NULL,
	`codigo` text(50) NOT NULL,
	`cuenta` text(500) NOT NULL,
	`es_hoja` integer DEFAULT 0 NOT NULL,
	`presupuesto_inicial` real DEFAULT 0 NOT NULL,
	`adiciones` real DEFAULT 0 NOT NULL,
	`reducciones` real DEFAULT 0 NOT NULL,
	`presupuesto_definitivo` real DEFAULT 0 NOT NULL,
	PRIMARY KEY(`tenant_id`, `codigo`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `rubros_ingresos`("tenant_id", "codigo", "cuenta", "es_hoja", "presupuesto_inicial", "adiciones", "reducciones", "presupuesto_definitivo") SELECT "tenant_id", "codigo", "cuenta", "es_hoja", "presupuesto_inicial", "adiciones", "reducciones", "presupuesto_definitivo" FROM `__old_rubros_ingresos`;
--> statement-breakpoint
CREATE INDEX `ix_rubros_ingresos_tenant` ON `rubros_ingresos` (`tenant_id`);
--> statement-breakpoint
CREATE TABLE `terceros` (
	`tenant_id` text(36) NOT NULL,
	`nit` text(50) NOT NULL,
	`dv` text(2) DEFAULT '' NOT NULL,
	`nombre` text(500) NOT NULL,
	`direccion` text(300) DEFAULT '' NOT NULL,
	`telefono` text(50) DEFAULT '' NOT NULL,
	`email` text(200) DEFAULT '' NOT NULL,
	`tipo` text(20) DEFAULT 'Natural' NOT NULL,
	`banco` text(100) DEFAULT '' NOT NULL,
	`tipo_cuenta` text(50) DEFAULT '' NOT NULL,
	`no_cuenta` text(50) DEFAULT '' NOT NULL,
	PRIMARY KEY(`tenant_id`, `nit`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `terceros`("tenant_id", "nit", "dv", "nombre", "direccion", "telefono", "email", "tipo", "banco", "tipo_cuenta", "no_cuenta") SELECT "tenant_id", "nit", "dv", "nombre", "direccion", "telefono", "email", "tipo", "banco", "tipo_cuenta", "no_cuenta" FROM `__old_terceros`;
--> statement-breakpoint
CREATE INDEX `ix_terceros_tenant` ON `terceros` (`tenant_id`);
--> statement-breakpoint
CREATE INDEX `ix_terceros_nit` ON `terceros` (`nit`);
--> statement-breakpoint
CREATE TABLE `cdp` (
	`tenant_id` text(36) NOT NULL,
	`numero` integer NOT NULL,
	`fecha` text(10) NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`objeto` text(1000) NOT NULL,
	`valor` real NOT NULL,
	`estado` text(20) DEFAULT 'ACTIVO' NOT NULL,
	`fuente_sifse` integer DEFAULT 0 NOT NULL,
	`item_sifse` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`tenant_id`, `numero`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`codigo_rubro`) REFERENCES `rubros_gastos`(`tenant_id`,`codigo`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `cdp`("tenant_id", "numero", "fecha", "codigo_rubro", "objeto", "valor", "estado", "fuente_sifse", "item_sifse") SELECT "tenant_id", "numero", "fecha", "codigo_rubro", "objeto", "valor", "estado", "fuente_sifse", "item_sifse" FROM `__old_cdp`;
--> statement-breakpoint
CREATE INDEX `ix_cdp_tenant` ON `cdp` (`tenant_id`);
--> statement-breakpoint
CREATE TABLE `rp` (
	`tenant_id` text(36) NOT NULL,
	`numero` integer NOT NULL,
	`fecha` text(10) NOT NULL,
	`numero_cdp` integer NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`nit_tercero` text(50),
	`objeto` text(1000) NOT NULL,
	`valor` real NOT NULL,
	`estado` text(20) DEFAULT 'ACTIVO' NOT NULL,
	`fuente_sifse` integer DEFAULT 0 NOT NULL,
	`item_sifse` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`tenant_id`, `numero`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`numero_cdp`) REFERENCES `cdp`(`tenant_id`,`numero`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`codigo_rubro`) REFERENCES `rubros_gastos`(`tenant_id`,`codigo`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`nit_tercero`) REFERENCES `terceros`(`tenant_id`,`nit`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `rp`("tenant_id", "numero", "fecha", "numero_cdp", "codigo_rubro", "nit_tercero", "objeto", "valor", "estado", "fuente_sifse", "item_sifse") SELECT "tenant_id", "numero", "fecha", "numero_cdp", "codigo_rubro", "nit_tercero", "objeto", "valor", "estado", "fuente_sifse", "item_sifse" FROM `__old_rp`;
--> statement-breakpoint
CREATE INDEX `ix_rp_tenant` ON `rp` (`tenant_id`);
--> statement-breakpoint
CREATE TABLE `obligaciones` (
	`tenant_id` text(36) NOT NULL,
	`numero` integer NOT NULL,
	`fecha` text(10) NOT NULL,
	`numero_rp` integer NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`nit_tercero` text(50),
	`valor` real NOT NULL,
	`factura` text(500) DEFAULT '' NOT NULL,
	`estado` text(20) DEFAULT 'ACTIVO' NOT NULL,
	`fuente_sifse` integer DEFAULT 0 NOT NULL,
	`item_sifse` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`tenant_id`, `numero`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`numero_rp`) REFERENCES `rp`(`tenant_id`,`numero`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`codigo_rubro`) REFERENCES `rubros_gastos`(`tenant_id`,`codigo`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`nit_tercero`) REFERENCES `terceros`(`tenant_id`,`nit`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `obligaciones`("tenant_id", "numero", "fecha", "numero_rp", "codigo_rubro", "nit_tercero", "valor", "factura", "estado", "fuente_sifse", "item_sifse") SELECT "tenant_id", "numero", "fecha", "numero_rp", "codigo_rubro", "nit_tercero", "valor", "factura", "estado", "fuente_sifse", "item_sifse" FROM `__old_obligaciones`;
--> statement-breakpoint
CREATE INDEX `ix_obligaciones_tenant` ON `obligaciones` (`tenant_id`);
--> statement-breakpoint
CREATE TABLE `pagos` (
	`tenant_id` text(36) NOT NULL,
	`numero` integer NOT NULL,
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
	PRIMARY KEY(`tenant_id`, `numero`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`numero_obligacion`) REFERENCES `obligaciones`(`tenant_id`,`numero`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`codigo_rubro`) REFERENCES `rubros_gastos`(`tenant_id`,`codigo`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`nit_tercero`) REFERENCES `terceros`(`tenant_id`,`nit`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `pagos`("tenant_id", "numero", "fecha", "numero_obligacion", "codigo_rubro", "nit_tercero", "valor", "concepto", "medio_pago", "no_comprobante", "cuenta_bancaria_id", "estado", "fuente_sifse", "item_sifse") SELECT "tenant_id", "numero", "fecha", "numero_obligacion", "codigo_rubro", "nit_tercero", "valor", "concepto", "medio_pago", "no_comprobante", "cuenta_bancaria_id", "estado", "fuente_sifse", "item_sifse" FROM `__old_pagos`;
--> statement-breakpoint
CREATE INDEX `ix_pagos_tenant` ON `pagos` (`tenant_id`);
--> statement-breakpoint
CREATE TABLE `recaudos` (
	`tenant_id` text(36) NOT NULL,
	`numero` integer NOT NULL,
	`fecha` text(10) NOT NULL,
	`codigo_rubro` text(50) NOT NULL,
	`valor` real NOT NULL,
	`concepto` text(500) DEFAULT '' NOT NULL,
	`no_comprobante` text(100) DEFAULT '' NOT NULL,
	`estado` text(20) DEFAULT 'ACTIVO' NOT NULL,
	`cuenta_bancaria_id` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`tenant_id`, `numero`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`codigo_rubro`) REFERENCES `rubros_ingresos`(`tenant_id`,`codigo`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `recaudos`("tenant_id", "numero", "fecha", "codigo_rubro", "valor", "concepto", "no_comprobante", "estado", "cuenta_bancaria_id") SELECT "tenant_id", "numero", "fecha", "codigo_rubro", "valor", "concepto", "no_comprobante", "estado", "cuenta_bancaria_id" FROM `__old_recaudos`;
--> statement-breakpoint
CREATE INDEX `ix_recaudos_tenant` ON `recaudos` (`tenant_id`);
--> statement-breakpoint
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
	FOREIGN KEY (`tenant_id`,`codigo_rubro`) REFERENCES `rubros_ingresos`(`tenant_id`,`codigo`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `reconocimientos`("tenant_id", "id", "fecha", "codigo_rubro", "concepto", "valor_reconocido", "valor_recaudado", "estado") SELECT "tenant_id", "id", "fecha", "codigo_rubro", "concepto", "valor_reconocido", "valor_recaudado", "estado" FROM `__old_reconocimientos`;
--> statement-breakpoint
CREATE INDEX `ix_reconocimientos_tenant` ON `reconocimientos` (`tenant_id`);
--> statement-breakpoint
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
	FOREIGN KEY (`tenant_id`,`codigo_rubro`) REFERENCES `rubros_gastos`(`tenant_id`,`codigo`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `pac`("tenant_id", "id", "codigo_rubro", "descripcion", "valor_estimado", "tipo_contrato", "fecha_estimada", "estado") SELECT "tenant_id", "id", "codigo_rubro", "descripcion", "valor_estimado", "tipo_contrato", "fecha_estimada", "estado" FROM `__old_pac`;
--> statement-breakpoint
CREATE INDEX `ix_pac_tenant` ON `pac` (`tenant_id`);
--> statement-breakpoint
DROP TABLE `__old_pac`;
--> statement-breakpoint
DROP TABLE `__old_reconocimientos`;
--> statement-breakpoint
DROP TABLE `__old_recaudos`;
--> statement-breakpoint
DROP TABLE `__old_pagos`;
--> statement-breakpoint
DROP TABLE `__old_obligaciones`;
--> statement-breakpoint
DROP TABLE `__old_rp`;
--> statement-breakpoint
DROP TABLE `__old_cdp`;
--> statement-breakpoint
DROP TABLE `__old_terceros`;
--> statement-breakpoint
DROP TABLE `__old_rubros_ingresos`;
--> statement-breakpoint
DROP TABLE `__old_rubros_gastos`;
