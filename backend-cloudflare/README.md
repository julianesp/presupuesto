# Sistema Presupuestal - Backend (Cloudflare Workers)

Backend del Sistema Presupuestal migrado a **Cloudflare Workers** con **Hono**, **TypeScript** y **Cloudflare D1**.

## Arquitectura

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (v4) - Fast web framework
- **Lenguaje**: TypeScript
- **Base de datos**: Cloudflare D1 (SQLite distribuido)
- **ORM**: Drizzle ORM
- **Autenticación**: Clerk

## Ventajas de esta arquitectura

✅ **Totalmente gratis** en Cloudflare (tier generoso)
✅ **Ultra rápido** - Workers se ejecutan en el edge
✅ **TypeScript** - Type safety en todo el código
✅ **D1** - SQLite distribuido, simple de usar
✅ **Hono** - Framework moderno, rápido y liviano
✅ **Drizzle** - ORM type-safe perfecto para D1

## Requisitos

- Node.js 18+
- npm o pnpm
- Cuenta de Cloudflare (gratis)
- Cuenta de Clerk (gratis)

## Configuración inicial

### 1. Instalar dependencias

```bash
cd backend-cloudflare
npm install
```

### 2. Instalar Wrangler CLI (si no lo tienes)

```bash
npm install -g wrangler
```

### 3. Autenticarse en Cloudflare

```bash
wrangler login
```

### 4. Crear base de datos D1

```bash
wrangler d1 create presupuesto-db
```

Esto te devolverá un `database_id`. Cópialo y actualiza `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "presupuesto-db"
database_id = "tu-database-id-aqui"  # 👈 Reemplazar con tu ID
```

### 5. Configurar variables de entorno

Crea un archivo `.dev.vars` (nunca commitear a git):

```bash
cp .dev.vars.example .dev.vars
```

Edita `.dev.vars` y agrega tus claves de Clerk:

```
CLERK_SECRET_KEY=sk_test_tu_clave_secreta_aqui
CLERK_PUBLISHABLE_KEY=pk_test_tu_clave_publica_aqui
SECRET_KEY=genera-una-clave-secreta-segura-aqui
```

Para generar una clave secreta:

```bash
openssl rand -base64 32
```

### 6. Generar migraciones de la base de datos

```bash
npm run db:generate
```

### 7. Aplicar migraciones (local)

```bash
npm run db:migrate
```

## Desarrollo

### Iniciar servidor de desarrollo

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:8787`

### Ver base de datos en Drizzle Studio

```bash
npm run db:studio
```

Esto abre un navegador visual para tu base de datos en `https://local.drizzle.studio`

## Despliegue

### 1. Configurar secrets en producción

```bash
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_PUBLISHABLE_KEY
wrangler secret put SECRET_KEY
```

### 2. Crear base de datos de producción

```bash
wrangler d1 create presupuesto-db-prod
```

Actualiza `wrangler.toml` con el ID de producción (en otra sección).

### 3. Aplicar migraciones a producción

```bash
npm run db:migrate:prod
```

### 4. Desplegar

```bash
npm run deploy
```

Tu API estará disponible en: `https://presupuesto-backend.<tu-subdominio>.workers.dev`

## Estructura del proyecto

```
backend-cloudflare/
├── src/
│   ├── db/
│   │   ├── schema.ts         # Esquemas de Drizzle (tablas)
│   │   └── index.ts          # Conexión a D1
│   ├── middleware/
│   │   ├── auth.ts           # Middleware de autenticación Clerk
│   │   └── cors.ts           # Middleware CORS
│   ├── routes/
│   │   ├── auth.ts           # Rutas de autenticación
│   │   └── rubros-ingresos.ts # Ejemplo de rutas migradas
│   ├── types/
│   │   └── bindings.ts       # Tipos de Cloudflare Workers
│   └── index.ts              # Entrada principal de Hono
├── drizzle/
│   └── migrations/           # Migraciones SQL generadas
├── drizzle.config.ts         # Configuración de Drizzle
├── wrangler.toml             # Configuración de Cloudflare Workers
├── tsconfig.json             # Configuración de TypeScript
└── package.json
```

## Migración de endpoints

### Antes (FastAPI/Python)

```python
@router.get("", response_model=list[RubroIngresoResponse])
async def listar(
    solo_hojas: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return await svc.get_rubros(db, user.tenant_id, solo_hojas=solo_hojas)
```

### Después (Hono/TypeScript)

```typescript
app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const soloHojas = c.req.query('solo_hojas') === 'true';

  const db = getDb(c.env);

  const rubros = await db.query.rubrosIngresos.findMany({
    where: eq(rubrosIngresos.tenantId, tenantId),
  });

  return c.json(rubros);
});
```

## Próximos pasos

### Rutas pendientes de migrar:

- [ ] `/api/rubros-gastos` - Rubros de gastos
- [ ] `/api/cdp` - Certificados de Disponibilidad Presupuestal
- [ ] `/api/rp` - Registros Presupuestales
- [ ] `/api/obligaciones` - Obligaciones
- [ ] `/api/pagos` - Pagos
- [ ] `/api/recaudos` - Recaudos
- [ ] `/api/reconocimiento` - Reconocimientos
- [ ] `/api/modificaciones` - Modificaciones presupuestales
- [ ] `/api/terceros` - Gestión de terceros
- [ ] `/api/pac` - Plan Anual de Contratación
- [ ] `/api/cuentas-bancarias` - Cuentas bancarias
- [ ] `/api/dashboard` - Dashboard con métricas
- [ ] `/api/informes` - Generación de informes
- [ ] `/api/sifse` - Integración con SIFSE
- [ ] `/api/importacion` - Importación de datos
- [ ] `/api/consolidacion` - Consolidación de datos
- [ ] `/api/backup` - Backup y restauración
- [ ] `/api/comprobantes` - Generación de comprobantes PDF

### Migración de datos

Una vez que todas las rutas estén migradas, necesitarás:

1. Exportar datos de la base de datos actual (SQLite o PostgreSQL)
2. Transformar los datos al formato de D1
3. Importarlos usando `wrangler d1 execute`

### Actualizar frontend

El frontend en Next.js debe actualizarse para usar la nueva URL del backend:

```env
# .env.local
NEXT_PUBLIC_API_URL=https://presupuesto-backend.<tu-subdominio>.workers.dev
```

## Recursos

- [Documentación de Hono](https://hono.dev/)
- [Documentación de Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Documentación de Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Documentación de Drizzle ORM](https://orm.drizzle.team/)
- [Documentación de Clerk](https://clerk.com/docs)

## Licencia

MIT
