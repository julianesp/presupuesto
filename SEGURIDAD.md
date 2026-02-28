# Configuración de Seguridad - Sistema Presupuestal

## Control de Acceso por Email

Este sistema implementa un control de acceso estricto basado en una lista de emails autorizados.

### Emails Autorizados

Solo los siguientes emails pueden acceder al sistema:

1. **marthacer7@gmail.com** - Martha Cecilia (Administrador)
2. **julii1295@gmail.com** - Julian (Administrador)

### Ubicación de la Configuración

Los emails autorizados están configurados en:

- **Frontend**: `frontend/src/config/auth.ts`
- **Backend**: `backend-cloudflare/src/config/auth.ts`

### Cómo Funciona

#### Frontend (Next.js)

1. El middleware de Next.js (`frontend/src/middleware.ts`) intercepta todas las rutas protegidas
2. Verifica que el usuario esté autenticado con Clerk
3. Extrae el email del usuario de la sesión de Clerk
4. Verifica que el email esté en la lista de autorizados
5. Si NO está autorizado, redirige a `/unauthorized`

#### Backend (Cloudflare Workers)

1. El middleware de autenticación (`backend-cloudflare/src/middleware/auth.ts`) intercepta todas las peticiones API
2. Verifica el token JWT de Clerk
3. Extrae el email del payload del token
4. Verifica que el email esté en la lista de autorizados
5. Si NO está autorizado, retorna error 403

### Agregar un Nuevo Usuario Autorizado

Para agregar un nuevo email autorizado:

1. **Actualizar configuración del frontend**:
   ```typescript
   // frontend/src/config/auth.ts
   export const AUTHORIZED_EMAILS = [
     'marthacer7@gmail.com',
     'julii1295@gmail.com',
     'nuevo@email.com',  // ← Agregar aquí
   ] as const;
   ```

2. **Actualizar configuración del backend**:
   ```typescript
   // backend-cloudflare/src/config/auth.ts
   export const AUTHORIZED_EMAILS = [
     'marthacer7@gmail.com',
     'julii1295@gmail.com',
     'nuevo@email.com',  // ← Agregar aquí
   ] as const;
   ```

3. **Reiniciar ambos servicios** (frontend y backend)

4. **Agregar el usuario a la base de datos**:
   El usuario debe ser creado en la base de datos con el mismo email que se agregó a la lista de autorizados.

### Página de No Autorizado

Si un usuario intenta acceder con un email NO autorizado, verá la página:
- **Ruta**: `/unauthorized`
- **Ubicación**: `frontend/src/app/unauthorized/page.tsx`

Esta página:
- Muestra un mensaje claro de acceso denegado
- Permite al usuario cerrar sesión
- Sugiere contactar al administrador si necesita acceso

### Flujo de Autenticación Completo

```
1. Usuario visita localhost:3000
   ↓
2. Middleware verifica si está autenticado
   ↓
3. Si NO → Redirige a /sign-in
   ↓
4. Usuario inicia sesión con Clerk
   ↓
5. Middleware verifica el email del usuario
   ↓
6. Si email NO está autorizado → Redirige a /unauthorized
   ↓
7. Si email SÍ está autorizado → Permite acceso
   ↓
8. Frontend hace peticiones al backend
   ↓
9. Backend verifica token y email
   ↓
10. Si email NO está autorizado → Error 403
    ↓
11. Si email SÍ está autorizado → Procesa la petición
```

### Seguridad Adicional

- ✅ **Doble validación**: Tanto frontend como backend verifican los emails
- ✅ **Sin bypass**: No hay forma de saltarse la validación
- ✅ **Tokens JWT**: Usa tokens de Clerk para autenticación segura
- ✅ **HTTPS**: En producción, todo el tráfico debe ser HTTPS
- ✅ **Sesiones**: Las sesiones de Clerk expiran automáticamente

### Importante

- **NO** commitear claves secretas en git
- **NO** compartir las credenciales de Clerk
- **NO** agregar emails no autorizados a la lista
- **SÍ** mantener las listas sincronizadas entre frontend y backend
- **SÍ** revisar logs regularmente para detectar intentos de acceso no autorizado

### Auditoría

Para revisar quién ha intentado acceder:

1. Revisar logs de Clerk en el dashboard de Clerk
2. Revisar logs del backend de Cloudflare Workers
3. Buscar errores 403 con `"unauthorized": true`

---

Última actualización: 2026-02-27
