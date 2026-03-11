# Guía de Importación de Presupuestos

## Resumen

El sistema de presupuesto ahora soporta la importación de archivos Excel con el formato de la plantilla presupuestal proporcionada. Los datos importados se integran automáticamente con todos los informes presupuestales del sistema.

## Cambios Realizados

### 1. Actualización de Nombres en la Interfaz

Se cambiaron los siguientes nombres para mayor claridad:

- **"Rubros de Gastos"** → **"Plan de Gastos"**
- **"Rubros de Ingresos"** → **"Plan de Ingresos"**

Estos cambios se aplicaron en:
- Menú lateral (Sidebar)
- Títulos de páginas
- Módulo de importación
- Página de copias de seguridad
- Referencias en otras secciones del sistema

### 2. Compatibilidad con el Archivo Excel

El archivo Excel proporcionado (`/home/julian/Descargas/plantilla_presupuestal.xlsx`) es **100% compatible** con el importador actual del sistema.

**Estructura del archivo:**

#### Hoja GASTOS
- **Columna B (índice 1)**: Código del rubro
- **Columna C (índice 2)**: Nombre de la cuenta
- **Columna I (índice 8)**: Apropiación Inicial

Ejemplo:
```
| N° | CÓDIGO | NOMBRE DE LA CUENTA                    | ... | APROPIACIÓN INICIAL |
|----|--------|----------------------------------------|-----|---------------------|
| 1  | 2      | GASTOS                                 |     | 248,646,679         |
| 2  | 2.1    | FUNCIONAMIENTO                         |     | 248,646,679         |
| 3  | 2.1.2  | ADQUISICION DE BIENES Y SERVICIOS      |     | 248,646,679         |
```

#### Hoja INGRESOS
- **Columna B (índice 1)**: Código del rubro
- **Columna C (índice 2)**: Nombre de la cuenta
- **Columna G (índice 6)**: Presupuesto Inicial

Ejemplo:
```
| N° | CÓDIGO | NOMBRE DE LA CUENTA                    | ... | PRESUPUESTO INICIAL |
|----|--------|----------------------------------------|-----|---------------------|
| 1  | 1      | INGRESOS                               |     | 248,646,679         |
| 2  | 1.1    | INGRESOS CORRIENTES                    |     | 248,646,679         |
| 3  | 1.1.02 | INGRESOS NO TRIBUTARIOS                |     | 248,646,679         |
```

## Cómo Importar el Presupuesto

### Entornos Disponibles

El sistema funciona en **DOS entornos**:

1. **Desarrollo Local** (Python/FastAPI o TypeScript/Cloudflare Workers local)
2. **Producción** (Cloudflare Workers + D1) ✅ **SIN COSTOS ADICIONALES**

### Opción 1: Importación vía Excel en Producción (Cloudflare)

1. **Acceder al módulo de importación**
   - Ir a: **Configuración → Cargar Datos** (`/importacion`)

2. **Usar la tarjeta "Catálogo Excel (Gastos + Ingresos)"**
   - Click en "Seleccionar archivo"
   - Elegir el archivo `.xlsx` con las hojas GASTOS e INGRESOS
   - Click en "Cargar"

3. **Verificar resultados**
   - El sistema mostrará:
     - Cantidad de rubros de gastos importados
     - Cantidad de rubros de ingresos importados
     - Total de gastos
     - Total de ingresos
     - Diferencia (Ingresos - Gastos)

4. **Sincronizar rubros padre (automático)**
   - El importador automáticamente:
     - Detecta rubros hoja vs rubros padre (agrupadores)
     - Suma los valores de rubros hijos a sus padres
     - Calcula la apropiación/presupuesto definitivo

**NOTA**: La importación funciona 100% en Cloudflare Workers sin necesidad de Python ni servicios externos de pago.

### Opción 2: Importación vía CSV

Si prefieres separar gastos e ingresos:

**Para Gastos (CSV):**
```csv
codigo;cuenta;apropiacion_inicial
2.1.2.01.01.003.01.06.02;Extintores de incendios;2000000
```

**Para Ingresos (CSV):**
```csv
codigo;cuenta;presupuesto_inicial
1.1.02.05.002.09.01;Certificados y Constancias de desempeño;500000
```

## Articulación con Informes Presupuestales

Una vez importados, los datos están disponibles en **todos los informes** del sistema:

### Informes de Ejecución

1. **Ejecución de Gastos** (`/informes/ejecucion-gastos`)
   - Muestra apropiación inicial, adiciones, reducciones, créditos, contracréditos
   - Calcula apropiación definitiva
   - Muestra compromisos y pagos (si existen)
   - Calcula saldos disponibles

2. **Ejecución de Ingresos** (`/informes/ejecucion-ingresos`)
   - Muestra presupuesto inicial, adiciones, reducciones
   - Calcula presupuesto definitivo
   - Muestra reconocimientos y recaudos (si existen)
   - Calcula saldos por recaudar

### Otros Informes

- **Tarjeta Presupuestal** (`/informes/tarjeta`): Detalle por rubro
- **Cadena Presupuestal** (`/informes/cadena-presupuestal`): CDP → RP → Obligación → Pago
- **Cuentas por Pagar** (`/informes/cuentas-por-pagar`): Obligaciones pendientes
- **PAC vs Ejecutado** (`/informes/pac-vs-ejecutado`): Comparativo de ejecución
- **SIA Contraloría** (`/informes/sia`): Formatos F03, F7B, F08A, F09, F13A

### Gestión de Rubros

Los rubros importados pueden ser:

- **Consultados** en:
  - Plan de Gastos (`/rubros/gastos`)
  - Plan de Ingresos (`/rubros/ingresos`)

- **Editados**: Solo rubros hoja (no agrupadores)
- **Eliminados**: Solo rubros hoja sin movimientos asociados
- **Creados**: Nuevos rubros manualmente

## Estructura Jerárquica

El sistema maneja automáticamente la jerarquía de rubros:

```
2                          (PADRE) → Suma de todos los rubros 2.*
├── 2.1                    (PADRE) → Suma de todos los rubros 2.1.*
│   ├── 2.1.2              (PADRE) → Suma de todos los rubros 2.1.2.*
│   │   ├── 2.1.2.01       (PADRE) → Suma de todos los rubros 2.1.2.01.*
│   │   │   └── 2.1.2.01.01 (HOJA) → Valor específico
```

**Rubros Padre (Agrupadores):**
- `es_hoja = 0`
- No se pueden crear CDPs directamente
- Su valor es la suma de sus hijos

**Rubros Hoja:**
- `es_hoja = 1`
- Pueden tener CDPs, RP, Obligaciones, Pagos
- Valor específico definido en el Excel

## Validaciones del Importador

El importador realiza las siguientes validaciones:

1. **Omite filas automáticamente** si contienen:
   - Palabras clave: "total", "codigo", "cuenta", "presupuesto", "desequilibrio"
   - Código vacío
   - Cuenta vacía

2. **Detecta automáticamente** rubros padre:
   - Si un código tiene "hijos" (otros códigos que empiezan con él + ".")
   - Ejemplo: `2.1` es padre de `2.1.1`, `2.1.2`, etc.

3. **Sincroniza valores** de padres:
   - Suma apropiación/presupuesto de hijos a padres
   - Actualiza todos los niveles jerárquicos

## Troubleshooting

### Error: "Diferencia muy alta entre Ingresos y Gastos"

Si la diferencia es significativa, verificar:
- Que los totales en el Excel coincidan
- Que no haya rubros duplicados
- Que los valores numéricos estén bien formateados

### Rubros no aparecen en los informes

Asegúrate de:
1. Hacer click en "Sincronizar Rubros" después de importar
2. Verificar que el filtro de mes en los informes esté correcto
3. Revisar que el tenant_id sea el correcto (en ambientes multi-tenant)

### No puedo editar un rubro

Solo se pueden editar rubros hoja. Si un rubro es padre (agrupador), primero debes:
1. Eliminar o mover sus hijos
2. El sistema lo convertirá automáticamente en hoja

## Ejemplo Completo de Importación

### Paso 1: Preparar el Excel

Tu archivo debe tener exactamente la estructura del ejemplo:
- Fila 1: Título (se omite)
- Fila 2: Encabezados (se omite)
- Fila 3+: Datos de rubros

### Paso 2: Importar

```
1. Ir a /importacion
2. Click en "Seleccionar archivo" en la tarjeta de Excel
3. Seleccionar: /home/julian/Descargas/plantilla_presupuestal.xlsx
4. Click en "Cargar"
```

### Paso 3: Verificar

```
Resultado esperado:
- Rubros de Gastos: 104 (ejemplo)
- Rubros de Ingresos: 58 (ejemplo)
- Total Gastos: $248,646,679
- Total Ingresos: $248,646,679
- Diferencia: $0
```

### Paso 4: Consultar en Plan de Gastos

```
1. Ir a /rubros/gastos
2. Verás el árbol completo con:
   - Código
   - Cuenta
   - Apropiación Inicial
   - Adiciones (0 inicialmente)
   - Reducciones (0 inicialmente)
   - Créditos (0 inicialmente)
   - Contracréditos (0 inicialmente)
   - Apropiación Definitiva (= Inicial)
   - Saldo Disponible
```

### Paso 5: Generar Informes

```
1. Ir a /informes/ejecucion-gastos
2. Seleccionar mes (opcional)
3. Ver informe completo de ejecución
```

## Mantenimiento y Actualizaciones

### Actualizar Apropiación Inicial

Si necesitas ajustar valores después de importar:

**Opción 1: Editar manualmente**
- Ir a Plan de Gastos/Ingresos
- Click en ✏️ (Editar) en el rubro hoja
- Modificar el valor
- Guardar

**Opción 2: Reimportar**
- Actualizar el archivo Excel
- Volver a importar
- El sistema usa `merge()` por lo que actualiza registros existentes

### Agregar Adiciones, Reducciones, Créditos

Estas modificaciones se hacen desde:
- **Modificaciones Presupuestales** (`/modificaciones`)

Tipos disponibles:
- **Adición**: Aumenta apropiación de un rubro
- **Reducción**: Disminuye apropiación de un rubro
- **Traslado**: Mueve recursos entre rubros (crédito + contracrédito)

## Archivos Modificados

Los siguientes archivos fueron actualizados para implementar esta funcionalidad:

### Frontend
- `/frontend/src/app/(protected)/rubros/gastos/page.tsx:79` - Cambio de título
- `/frontend/src/app/(protected)/rubros/ingresos/page.tsx:135` - Cambio de título
- `/frontend/src/components/layout/Sidebar.tsx:33-34` - Cambio en menú
- `/frontend/src/app/(protected)/backup/page.tsx:12-13` - Cambio en etiquetas
- `/frontend/src/app/(protected)/importacion/page.tsx` - Cambios en textos de importación
- `/frontend/src/app/(protected)/pac/page.tsx:163` - Cambio en mensaje de ayuda

### Backend Cloudflare (TypeScript) ✅
- `/backend-cloudflare/src/services/importacion.ts` - **NUEVO**: Servicio de importación Excel
- `/backend-cloudflare/src/routes/importacion.ts` - **NUEVO**: Endpoints API para importación
- `/backend-cloudflare/src/index.ts` - Registro de ruta `/api/importacion`

### Backend Python (Solo desarrollo local)
- El importador ya era compatible con el formato Excel proporcionado
- No se requirieron modificaciones en `/backend/app/services/importacion.py`
- No se requirieron modificaciones en `/backend/app/routes/importacion.py`

## Soporte

Para reportar problemas o solicitar mejoras:
- Crear un issue en el repositorio del proyecto
- Contactar al equipo de desarrollo

## Deployment en Cloudflare

### Requisitos
- Cuenta de Cloudflare (gratuita)
- Wrangler CLI instalado

### Despliegue del Backend

```bash
cd /home/julian/Documentos/sites/presupuesto/backend-cloudflare

# Configurar Cloudflare D1 (solo primera vez)
wrangler d1 create presupuesto-db

# Aplicar migraciones
wrangler d1 migrations apply presupuesto-db --remote

# Configurar secrets de Clerk
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_PUBLISHABLE_KEY

# Desplegar
wrangler deploy
```

### Costos (Cloudflare Free Tier)
- **Workers**: 100,000 requests/día GRATIS
- **D1 Database**: 5 GB almacenamiento GRATIS
- **R2 Storage** (opcional): 10 GB/mes GRATIS

**NO hay costos ocultos ni servicios externos de pago requeridos.**

---

**Última actualización:** 2026-03-10
**Versión del sistema:** 2.0.0
**Compatible con:**
- Cloudflare Workers + D1 (Producción)
- Python FastAPI + SQLite (Desarrollo local)
- Todos los informes presupuestales
