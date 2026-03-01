# Guía de Despliegue en Render.com

## Configuración de la Base de Datos

El backend TypeScript usa **SQLite** (compatible con libSQL), pero Render.com no ofrece SQLite nativo. Necesitas usar un servicio de base de datos compatible:

### Opción 1: Turso (Recomendado - Gratis)

Turso es un servicio de base de datos libSQL (SQLite en la nube) compatible con el código actual.

1. **Crear cuenta en Turso**:
   ```bash
   # Instalar CLI de Turso
   curl -sSfL https://get.tur.so/install.sh | bash

   # Iniciar sesión
   turso auth login
   ```

2. **Crear base de datos**:
   ```bash
   turso db create presupuesto-prod
   ```

3. **Obtener credenciales**:
   ```bash
   # URL de la base de datos
   turso db show presupuesto-prod --url

   # Token de autenticación
   turso db tokens create presupuesto-prod
   ```

4. **Configurar en Render.com**:
   - Ve a tu servicio en Render.com
   - En "Environment", agrega la variable:
     ```
     DATABASE_URL=libsql://[tu-url].turso.io?authToken=[tu-token]
     ```

5. **Ejecutar migraciones**:
   ```bash
   # Conectarte a Turso
   turso db shell presupuesto-prod < migrations.sql
   ```

### Opción 2: Cloudflare Workers + D1

Si prefieres usar Cloudflare Workers (sin Render.com):

1. Crear base de datos D1:
   ```bash
   cd backend-cloudflare
   wrangler d1 create presupuesto-db
   ```

2. Ejecutar migraciones:
   ```bash
   npm run db:migrate:prod
   ```

3. Desplegar:
   ```bash
   npm run deploy
   ```

4. Actualizar el frontend en Vercel para usar la URL de Cloudflare Workers.

## Pasos para Desplegar en Render.com

1. **Conectar repositorio**:
   - Ve a Render.com Dashboard
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio de GitHub

2. **Configurar servicio**:
   - **Runtime**: Node
   - **Build Command**: `cd backend-cloudflare && npm install && npm run build`
   - **Start Command**: `cd backend-cloudflare && npm run start`

3. **Variables de entorno**:
   Configura estas variables en Render.com:
   ```
   DATABASE_URL=libsql://[tu-turso-url]?authToken=[tu-token]
   ENVIRONMENT=production
   CORS_ORIGINS=https://presupuesto-teal.vercel.app
   CLERK_SECRET_KEY=[tu-secret-key]
   CLERK_PUBLISHABLE_KEY=[tu-publishable-key]
   PORT=8080
   ```

4. **Desplegar**:
   - Click en "Create Web Service"
   - Render.com detectará automáticamente el `render.yaml` y configurará todo

5. **Verificar**:
   - Espera a que termine el despliegue
   - Visita la URL proporcionada por Render.com (ej: `https://sistema-presupuestal-api.onrender.com`)
   - Deberías ver el health check: `{"status": "ok"}`

## Migraciones de Base de Datos

Si vienes del backend Python y tienes datos en PostgreSQL:

1. **Exportar datos** del PostgreSQL antiguo
2. **Importar a Turso/SQLite** usando scripts de migración
3. O considerar usar PostgreSQL con Drizzle (requiere cambios en el código)

## Problemas Comunes

### Error de CORS
- Verifica que `CORS_ORIGINS` incluya la URL exacta de tu frontend en Vercel
- Ejemplo: `https://presupuesto-teal.vercel.app` (sin slash final)

### Error de conexión a base de datos
- Verifica que `DATABASE_URL` esté correctamente configurada
- Para Turso, debe empezar con `libsql://`
- Asegúrate de que el token de autenticación sea válido

### Error al compilar
- Verifica que todas las dependencias estén instaladas
- Ejecuta localmente `npm run build` para verificar

## Siguiente Paso

Después de desplegar el backend, actualiza la URL de la API en el frontend:

```typescript
// frontend/.env.production
NEXT_PUBLIC_API_URL=https://sistema-presupuestal-api.onrender.com
```
