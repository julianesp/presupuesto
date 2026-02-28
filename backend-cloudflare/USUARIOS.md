# Gestión de Usuarios

Este documento explica cómo gestionar usuarios en el Sistema Presupuestal.

## 🔐 Cómo Funciona la Autorización

El sistema usa un modelo de **autorización basado en base de datos**:

1. **Clerk** maneja la autenticación (login con Google/Microsoft)
2. **La base de datos** determina quién tiene acceso
3. Solo los usuarios **registrados en la tabla `users`** pueden acceder al sistema

### Flujo de Autenticación

```
Usuario intenta acceder
    ↓
Clerk verifica credenciales (Google/Microsoft)
    ↓
¿Email existe en la tabla users?
    ↓ Sí                    ↓ No
Usuario autorizado      Acceso denegado
```

## ➕ Agregar Nuevo Usuario

### Opción 1: Script Interactivo (Recomendado)

El sistema incluye un script interactivo para agregar usuarios:

```bash
cd backend-cloudflare
npm run add-user
```

El script te guiará paso a paso:

1. Selecciona o crea un tenant (institución)
2. Ingresa el email del usuario
3. Ingresa el nombre completo
4. Ingresa el cargo (opcional)
5. Selecciona el rol:
   - **ADMIN**: Acceso total al sistema
   - **TESORERO**: Puede crear y editar registros
   - **CONSULTA**: Solo lectura

### Opción 2: Usando Drizzle Studio

Puedes usar la interfaz gráfica de Drizzle:

```bash
cd backend-cloudflare
npm run db:studio
```

Luego accede a http://localhost:4983 y agrega usuarios directamente en la tabla `users`.

### Opción 3: SQL Directo

Si prefieres SQL directo, puedes usar wrangler:

```bash
cd backend-cloudflare
wrangler d1 execute presupuesto-db --local --command "
INSERT INTO users (tenant_id, email, nombre, cargo, rol, activo, fecha_creacion)
VALUES (
  'tu_tenant_id',
  'usuario@ejemplo.com',
  'Nombre Completo',
  'Cargo',
  'ADMIN',
  1,
  '2026-02-27T00:00:00.000Z'
);"
```

## 👥 Roles y Permisos

### ADMIN
- Acceso completo al sistema
- Puede gestionar usuarios
- Puede crear y editar todos los registros
- Puede modificar configuración del tenant

### TESORERO
- Puede crear y editar registros presupuestales
- No puede gestionar usuarios
- No puede modificar configuración del tenant

### CONSULTA
- Solo puede ver información
- No puede crear ni editar registros

## 📋 Ver Usuarios Existentes

Puedes ver todos los usuarios ejecutando el script add-user y cancelando cuando te pregunte si quieres actualizar un usuario existente. El script mostrará todos los usuarios al final.

O usando Drizzle Studio:

```bash
npm run db:studio
```

## 🔒 Seguridad

**Importante**: Los emails autorizados ya NO están en el código fuente. Ahora se gestionan completamente desde la base de datos, lo que es más seguro porque:

- ✅ No se exponen en el repositorio
- ✅ Se pueden agregar/eliminar sin redesplegar
- ✅ Se gestionan de forma centralizada
- ✅ Se puede auditar quién tiene acceso

## 🚨 Desactivar un Usuario

Para desactivar un usuario sin eliminarlo:

```bash
npm run db:studio
```

Luego busca el usuario en la tabla `users` y cambia el campo `activo` a `false`.

O usa SQL:

```bash
wrangler d1 execute presupuesto-db --local --command "
UPDATE users SET activo = 0 WHERE email = 'usuario@ejemplo.com';"
```

## ❓ Preguntas Frecuentes

### ¿Qué pasa si un usuario no está en la BD?

Recibirá el mensaje: "Acceso denegado. Tu cuenta no está autorizada para usar este sistema."

### ¿Puedo cambiar el rol de un usuario?

Sí, usa el script `npm run add-user` con el email del usuario existente y el script te preguntará si quieres actualizarlo.

### ¿Cómo creo el primer usuario admin?

Usa el script `npm run add-user`. Si no hay tenants en la base de datos, el script te ayudará a crear uno.

### ¿Puedo tener usuarios en múltiples tenants?

No. Cada usuario pertenece a un solo tenant (institución). Si necesitas acceso a múltiples instituciones, necesitas crear usuarios separados con emails diferentes.

## 🔧 Troubleshooting

### Error: "Usuario no encontrado en el sistema"

El email del usuario no existe en la tabla `users`. Agrégalo usando `npm run add-user`.

### Error: "Usuario inactivo"

El usuario existe pero está desactivado. Actívalo cambiando `activo = 1` en la base de datos.

### Error: "No autorizado"

El token de Clerk no es válido. Cierra sesión e inicia sesión nuevamente.
