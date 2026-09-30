CREATE TABLE `comprobantes_contables` (
	`tenant_id` text(36) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo` text(20) NOT NULL,
	`numero` integer NOT NULL,
	`fecha` text(10) NOT NULL,
	`descripcion` text(1000) NOT NULL,
	`estado` text(20) DEFAULT 'ACTIVO' NOT NULL,
	`origen_tipo` text(20),
	`origen_numero` integer,
	`usuario_id` integer,
	`fecha_creacion` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_comprobantes_contables_tenant` ON `comprobantes_contables` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_comprobantes_contables_numero` ON `comprobantes_contables` (`tenant_id`,`tipo`,`numero`);--> statement-breakpoint
CREATE TABLE `cuentas_contables` (
	`tenant_id` text(36) NOT NULL,
	`codigo` text(30) NOT NULL,
	`nombre` text(300) NOT NULL,
	`naturaleza` text(1) NOT NULL,
	`nivel` integer NOT NULL,
	`es_auxiliar` integer DEFAULT 1 NOT NULL,
	`requiere_tercero` integer DEFAULT false NOT NULL,
	`activa` integer DEFAULT true NOT NULL,
	PRIMARY KEY(`tenant_id`, `codigo`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `movimientos_contables` (
	`tenant_id` text(36) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comprobante_id` integer NOT NULL,
	`codigo_cuenta` text(30) NOT NULL,
	`nit_tercero` text(50),
	`descripcion` text(500) DEFAULT '' NOT NULL,
	`debito` real DEFAULT 0 NOT NULL,
	`credito` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`comprobante_id`) REFERENCES `comprobantes_contables`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`codigo_cuenta`) REFERENCES `cuentas_contables`(`tenant_id`,`codigo`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`nit_tercero`) REFERENCES `terceros`(`tenant_id`,`nit`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_movimientos_contables_comprobante` ON `movimientos_contables` (`comprobante_id`);--> statement-breakpoint
CREATE INDEX `ix_movimientos_contables_cuenta` ON `movimientos_contables` (`tenant_id`,`codigo_cuenta`);--> statement-breakpoint
CREATE TABLE `periodos_contables` (
	`tenant_id` text(36) NOT NULL,
	`anio` integer NOT NULL,
	`mes` integer NOT NULL,
	`cerrado` integer DEFAULT false NOT NULL,
	`fecha_cierre` text,
	PRIMARY KEY(`tenant_id`, `anio`, `mes`),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
