# Guía de Migración: Python (FastAPI) → TypeScript (Hono)

Esta guía te ayudará a migrar el resto de los endpoints del backend de Python/FastAPI a TypeScript/Hono.

## Comparación de Sintaxis

### Decoradores de rutas

#### Python (FastAPI)
```python
@router.get("/api/rubros-ingresos", response_model=list[RubroResponse])
async def listar():
    ...
```

#### TypeScript (Hono)
```typescript
app.get('/api/rubros-ingresos', async (c) => {
  ...
});
```

### Dependencias y Middleware

#### Python (FastAPI)
```python
async def listar(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ...
```

#### TypeScript (Hono)
```typescript
app.get('/', clerkAuth, async (c) => {
  const db = getDb(c.env);
  const tenantId = c.get('tenantId');
  ...
});
```

### Query Parameters

#### Python (FastAPI)
```python
async def buscar(q: str = Query(..., min_length=1)):
    ...
```

#### TypeScript (Hono)
```typescript
app.get('/buscar', async (c) => {
  const q = c.req.query('q');
  if (!q || q.length < 1) {
    return c.json({ error: 'Parámetro requerido' }, 400);
  }
  ...
});
```

### Path Parameters

#### Python (FastAPI)
```python
@router.get("/{id}")
async def obtener(id: int):
    ...
```

#### TypeScript (Hono)
```typescript
app.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  ...
});
```

### Request Body Validation

#### Python (FastAPI)
```python
from pydantic import BaseModel

class CreateRequest(BaseModel):
    nombre: str
    valor: float

@router.post("")
async def crear(data: CreateRequest):
    ...
```

#### TypeScript (Hono + Zod)
```typescript
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const createSchema = z.object({
  nombre: z.string().min(1),
  valor: z.number(),
});

app.post('/', zValidator('json', createSchema), async (c) => {
  const data = c.req.valid('json');
  ...
});
```

### Responses

#### Python (FastAPI)
```python
return {"status": "ok", "data": result}

# O con status code específico
raise HTTPException(status_code=404, detail="No encontrado")
```

#### TypeScript (Hono)
```typescript
return c.json({ status: 'ok', data: result });

// Con status code específico
return c.json({ error: 'No encontrado' }, 404);

// Sin body (204)
return c.body(null, 204);
```

## Migración de Queries

### SQLAlchemy → Drizzle ORM

#### SELECT básico

**Python (SQLAlchemy)**
```python
from sqlalchemy import select

result = await db.execute(
    select(RubroIngreso).where(RubroIngreso.tenant_id == tenant_id)
)
rubros = result.scalars().all()
```

**TypeScript (Drizzle)**
```typescript
import { eq } from 'drizzle-orm';

const rubros = await db.query.rubrosIngresos.findMany({
  where: eq(rubrosIngresos.tenantId, tenantId),
});
```

#### SELECT con filtros múltiples

**Python (SQLAlchemy)**
```python
result = await db.execute(
    select(RubroIngreso)
    .where(
        RubroIngreso.tenant_id == tenant_id,
        RubroIngreso.es_hoja == 1
    )
)
```

**TypeScript (Drizzle)**
```typescript
import { eq, and } from 'drizzle-orm';

const rubros = await db.query.rubrosIngresos.findMany({
  where: and(
    eq(rubrosIngresos.tenantId, tenantId),
    eq(rubrosIngresos.esHoja, 1)
  ),
});
```

#### SELECT con LIKE

**Python (SQLAlchemy)**
```python
result = await db.execute(
    select(RubroIngreso)
    .where(RubroIngreso.cuenta.like(f"%{query}%"))
)
```

**TypeScript (Drizzle)**
```typescript
import { like } from 'drizzle-orm';

const rubros = await db.query.rubrosIngresos.findMany({
  where: like(rubrosIngresos.cuenta, `%${query}%`),
});
```

#### INSERT

**Python (SQLAlchemy)**
```python
nuevo_rubro = RubroIngreso(
    tenant_id=tenant_id,
    codigo=codigo,
    cuenta=cuenta
)
db.add(nuevo_rubro)
await db.commit()
await db.refresh(nuevo_rubro)
```

**TypeScript (Drizzle)**
```typescript
const [nuevoRubro] = await db
  .insert(rubrosIngresos)
  .values({
    tenantId,
    codigo,
    cuenta,
  })
  .returning();
```

#### UPDATE

**Python (SQLAlchemy)**
```python
await db.execute(
    update(RubroIngreso)
    .where(RubroIngreso.codigo == codigo)
    .values(cuenta=nueva_cuenta)
)
await db.commit()
```

**TypeScript (Drizzle)**
```typescript
const [actualizado] = await db
  .update(rubrosIngresos)
  .set({ cuenta: nuevaCuenta })
  .where(eq(rubrosIngresos.codigo, codigo))
  .returning();
```

#### DELETE

**Python (SQLAlchemy)**
```python
await db.execute(
    delete(RubroIngreso).where(RubroIngreso.codigo == codigo)
)
await db.commit()
```

**TypeScript (Drizzle)**
```typescript
await db
  .delete(rubrosIngresos)
  .where(eq(rubrosIngresos.codigo, codigo));
```

#### Agregaciones (SUM, COUNT, etc.)

**Python (SQLAlchemy)**
```python
from sqlalchemy import func

result = await db.execute(
    select(func.sum(Recaudo.valor))
    .where(Recaudo.codigo_rubro == codigo)
)
total = result.scalar_one()
```

**TypeScript (Drizzle)**
```typescript
import { sum } from 'drizzle-orm';

const result = await db
  .select({ total: sum(recaudos.valor) })
  .from(recaudos)
  .where(eq(recaudos.codigoRubro, codigo));

const total = Number(result[0]?.total || 0);
```

#### JOINs y relaciones

**Python (SQLAlchemy con relationships)**
```python
result = await db.execute(
    select(CDP).options(selectinload(CDP.rubro))
)
cdps = result.scalars().all()
```

**TypeScript (Drizzle)**
```typescript
const cdps = await db.query.cdp.findMany({
  with: {
    rubro: true,
  },
});
```

## Patrón de Migración Recomendado

Para cada archivo de rutas (`backend/app/routes/*.py`):

1. **Crear archivo equivalente** en `backend-cloudflare/src/routes/`
2. **Importar dependencias** de Hono, Drizzle y middleware
3. **Definir schemas de validación** con Zod
4. **Migrar cada endpoint** uno por uno
5. **Probar** cada endpoint con `npm run dev`

### Ejemplo completo

```typescript
// backend-cloudflare/src/routes/cdp.ts

import { Hono } from 'hono';
import { clerkAuth, requireTesorero } from '../middleware/auth';
import { getDb } from '../db';
import { cdp, rubrosGastos } from '../db/schema';
import type { Env, Variables } from '../types/bindings';
import { eq, and } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Schema de validación
const createCdpSchema = z.object({
  fecha: z.string(),
  codigoRubro: z.string(),
  objeto: z.string().min(1).max(1000),
  valor: z.number().positive(),
  fuenteSifse: z.number().default(0),
  itemSifse: z.number().default(0),
});

// GET /api/cdp
app.get('/', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const db = getDb(c.env);

  const cdps = await db.query.cdp.findMany({
    where: eq(cdp.tenantId, tenantId),
    with: {
      rubro: true,
    },
    orderBy: (cdp, { desc }) => [desc(cdp.numero)],
  });

  return c.json(cdps);
});

// GET /api/cdp/:numero
app.get('/:numero', clerkAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  const cdpRecord = await db.query.cdp.findFirst({
    where: and(
      eq(cdp.tenantId, tenantId),
      eq(cdp.numero, numero)
    ),
    with: {
      rubro: true,
      rps: true,
    },
  });

  if (!cdpRecord) {
    return c.json({ error: 'CDP no encontrado' }, 404);
  }

  return c.json(cdpRecord);
});

// POST /api/cdp
app.post('/', clerkAuth, requireTesorero, zValidator('json', createCdpSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const data = c.req.valid('json');
  const db = getDb(c.env);

  // Verificar que el rubro existe
  const rubro = await db.query.rubrosGastos.findFirst({
    where: and(
      eq(rubrosGastos.tenantId, tenantId),
      eq(rubrosGastos.codigo, data.codigoRubro)
    ),
  });

  if (!rubro) {
    return c.json({ error: 'Rubro no encontrado' }, 400);
  }

  // Obtener siguiente número de CDP
  const ultimoCdp = await db.query.cdp.findFirst({
    where: eq(cdp.tenantId, tenantId),
    orderBy: (cdp, { desc }) => [desc(cdp.numero)],
  });

  const nuevoNumero = (ultimoCdp?.numero || 0) + 1;

  // Crear CDP
  const [nuevoCdp] = await db
    .insert(cdp)
    .values({
      tenantId,
      numero: nuevoNumero,
      fecha: data.fecha,
      codigoRubro: data.codigoRubro,
      objeto: data.objeto,
      valor: data.valor,
      estado: 'ACTIVO',
      fuenteSifse: data.fuenteSifse,
      itemSifse: data.itemSifse,
    })
    .returning();

  return c.json(nuevoCdp, 201);
});

// DELETE /api/cdp/:numero
app.delete('/:numero', clerkAuth, requireTesorero, async (c) => {
  const tenantId = c.get('tenantId');
  const numero = parseInt(c.req.param('numero'));
  const db = getDb(c.env);

  // Verificar que no tiene RPs asociados
  const rpsAsociados = await db.query.rp.findFirst({
    where: and(
      eq(rp.tenantId, tenantId),
      eq(rp.numeroCdp, numero)
    ),
  });

  if (rpsAsociados) {
    return c.json({ error: 'No se puede eliminar un CDP con RPs asociados' }, 400);
  }

  await db
    .delete(cdp)
    .where(
      and(
        eq(cdp.tenantId, tenantId),
        eq(cdp.numero, numero)
      )
    );

  return c.body(null, 204);
});

export default app;
```

## Checklist de Migración

Para cada endpoint:

- [ ] Crear archivo de rutas en TypeScript
- [ ] Definir schemas de validación con Zod
- [ ] Migrar queries de SQLAlchemy a Drizzle
- [ ] Implementar middleware de auth
- [ ] Validar request body con zValidator
- [ ] Manejar errores apropiadamente
- [ ] Probar con datos reales
- [ ] Actualizar `src/index.ts` para incluir las nuevas rutas

## Tips y Buenas Prácticas

1. **Type safety**: Aprovecha TypeScript al máximo. Define tipos para tus responses.
2. **Validación**: Usa Zod para validar todos los inputs del usuario.
3. **Errores consistentes**: Siempre retorna JSON con estructura `{ error: string }` para errores.
4. **Multi-tenancy**: Siempre filtra por `tenantId` en todas las queries.
5. **Performance**: Usa `with` en Drizzle para cargar relaciones eficientemente.
6. **Transacciones**: Para operaciones que modifican múltiples tablas, usa `db.transaction()`.

```typescript
await db.transaction(async (tx) => {
  await tx.insert(cdp).values({...});
  await tx.update(rubrosGastos).set({...});
});
```

7. **Testing**: Considera usar Vitest para escribir tests unitarios.

## Recursos

- [Hono Documentation](https://hono.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Zod Documentation](https://zod.dev/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
