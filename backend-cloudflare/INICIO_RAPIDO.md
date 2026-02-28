# Inicio Rápido

Guía rápida para levantar el backend en desarrollo en menos de 5 minutos.

## 1. Instalar dependencias

```bash
cd backend-cloudflare
npm install
```

## 2. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .dev.vars.example .dev.vars

# Editar y agregar tus claves de Clerk
nano .dev.vars  # o usa tu editor favorito
```

Contenido de `.dev.vars`:

```
CLERK_SECRET_KEY=sk_test_SSy4i9MiW3vZy6JM2NqNxcc6stTqvX7XZO02fIgWnB
CLERK_PUBLISHABLE_KEY=pk_test_YXBwYXJlbnQtaW5zZWN0LTg0LmNsZXJrLmFjY291bnRzLmRldiQ
SECRET_KEY=dev-secret-key-cambiar-en-produccion
```

## 3. Configurar Cloudflare D1 (local)

```bash
# Instalar Wrangler globalmente (si no lo tienes)
npm install -g wrangler

# Generar migraciones
npm run db:generate

# Aplicar migraciones a base de datos local
npm run db:migrate
```

## 4. Iniciar servidor de desarrollo

```bash
npm run dev
```

El servidor estará en `http://localhost:8787` 🚀

## 5. Probar la API

### Health check

```bash
curl http://localhost:8787/health
```

Respuesta:
```json
{
  "status": "healthy"
}
```

### Obtener información de la API

```bash
curl http://localhost:8787/
```

Respuesta:
```json
{
  "status": "ok",
  "app": "Sistema Presupuestal API",
  "version": "2.0.0",
  "runtime": "Cloudflare Workers",
  "framework": "Hono + TypeScript",
  "database": "Cloudflare D1"
}
```

### Probar endpoints autenticados

Necesitas un token de Clerk. Puedes obtenerlo desde el frontend o usando:

```bash
curl http://localhost:8787/api/auth/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## Comandos útiles

### Ver base de datos en navegador

```bash
npm run db:studio
```

Abre `https://local.drizzle.studio` para ver tus tablas y datos.

### Type check

```bash
npm run type-check
```

### Ver logs en tiempo real

Los logs se muestran automáticamente cuando usas `npm run dev`.

## Próximos pasos

1. **Migrar más endpoints**: Revisa `MIGRACION.md` para aprender cómo migrar el resto de rutas
2. **Poblar datos iniciales**: Crea un script de seed para agregar datos de prueba
3. **Actualizar frontend**: Cambiar `NEXT_PUBLIC_API_URL` para apuntar a este backend

## Estructura de carpetas

```
backend-cloudflare/
├── src/
│   ├── db/               # Esquemas y conexión
│   ├── middleware/       # Auth, CORS, etc.
│   ├── routes/           # Endpoints de la API
│   ├── types/            # Tipos de TypeScript
│   └── index.ts          # Archivo principal
├── drizzle/
│   └── migrations/       # Migraciones SQL
├── .dev.vars             # Variables de desarrollo (NO COMMITEAR)
├── wrangler.toml         # Config de Cloudflare
└── package.json
```

## Troubleshooting

### Error: "Cannot find module 'wrangler'"

```bash
npm install -g wrangler
```

### Error: "Database not found"

Ejecuta las migraciones:

```bash
npm run db:migrate
```

### Error en autenticación

Verifica que:
1. Las claves de Clerk en `.dev.vars` sean correctas
2. El token de Clerk sea válido y no haya expirado
3. El usuario exista en la tabla `users`

### El puerto 8787 está en uso

Detén el proceso que usa ese puerto o cambia el puerto en `wrangler.toml`:

```toml
[dev]
port = 8788
```

## Recursos

- [README.md](./README.md) - Documentación completa
- [MIGRACION.md](./MIGRACION.md) - Guía de migración de Python a TypeScript
- [Documentación de Hono](https://hono.dev/)
- [Documentación de Drizzle](https://orm.drizzle.team/)
