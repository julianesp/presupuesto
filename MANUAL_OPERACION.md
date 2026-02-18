# MANUAL DE OPERACION
# SISTEMA PRESUPUESTAL IE 2026
## Institucion Educativa Almirante Padilla - Putumayo

**Version:** 1.0
**Fecha:** Febrero 2026
**Codigo DANE:** 186755000015

---

# TABLA DE CONTENIDO

1. [Inicio del Sistema y Dashboard](#1-inicio-del-sistema-y-dashboard)
2. [Configuracion Inicial](#2-configuracion-inicial)
3. [Plan Presupuestal - Rubros](#3-plan-presupuestal---rubros)
4. [Gestion de Terceros](#4-gestion-de-terceros)
5. [Registro de Movimiento - Cadena Presupuestal](#5-registro-de-movimiento---cadena-presupuestal)
   - 5.1 CDP (Certificado de Disponibilidad Presupuestal)
   - 5.2 RP (Registro Presupuestal)
   - 5.3 Obligacion
   - 5.4 Pago
   - 5.5 Recaudo (Ingresos)
6. [Modificaciones Presupuestales](#6-modificaciones-presupuestales)
7. [Consultas y Listados](#7-consultas-y-listados)
8. [Generacion de Informes](#8-generacion-de-informes)
9. [Informe SIFSE (Trimestral)](#9-informe-sifse-trimestral)
10. [Mapeo SIFSE](#10-mapeo-sifse)
11. [Plan Anualizado de Caja (PAC)](#11-plan-anualizado-de-caja-pac)
12. [Procesos Presupuestales](#12-procesos-presupuestales)
13. [Copias de Seguridad](#13-copias-de-seguridad)
14. [Guia Rapida de Pruebas](#14-guia-rapida-de-pruebas)

---

# 1. INICIO DEL SISTEMA Y DASHBOARD

## Como iniciar
Ejecute el archivo `main.py` o el acceso directo del sistema. La ventana principal
se abrira maximizada.

## Pantalla principal (Dashboard)

Al iniciar vera:

**Encabezado:**
- Nombre de la IE, NIT, Vigencia, Mes activo, Rector, Tesorero

**Botones de acceso rapido organizados en 4 secciones:**

| Seccion | Botones |
|---------|---------|
| Plan Presupuestal | Rubros Gastos, Rubros Ingresos, Resumen, Terceros, PAC |
| Registro de Movimiento | 1.CDP, 2.RP, 3.OBLIGACION, 4.PAGO, 5.RECAUDO |
| Modificaciones | 6.ADICION, 7.REDUCCION, 8.CRED/CONTRACRED |
| Informes y Procesos | INFORMES, TARJETAS, LISTADOS, CONSOLIDAR, CIERRE MES |

**Panel de resumen financiero:**
- Izquierda: Gastos (Apropiacion, CDPs, Compromisos, Obligaciones, Pagos, Saldos)
- Derecha: Ingresos (Presupuesto, Recaudado, Saldo)
- Indicador de equilibrio presupuestal (verde = OK, rojo = desbalance)

**Estado de backup** (parte inferior)

## Barra de menu superior

| Menu | Opciones |
|------|----------|
| Plan Presupuestal | Rubros Gastos, Rubros Ingresos, Importar Excel, Importar CSV, Resumen, PAC |
| Gestion de Terceros | Registrar Tercero, Ver Terceros |
| Registro de Movimiento | CDP, RP, Obligacion, Pago, Recaudo, Adicion, Reduccion, Credito/Contracredito |
| Consultas | Ver CDPs, Ver RPs, Ver Obligaciones, Ver Pagos, Ver Recaudos, Tarjeta, Modificaciones |
| Generacion de Informes | Informes y Ejecuciones, Informe SIFSE (Trimestral) |
| Procesos Presupuestales | Consolidar Mes, Cierre de Mes |
| Configuracion | Config General, Mapeo SIFSE, Backup, Restaurar, Salir |

---

# 2. CONFIGURACION INICIAL

**Ruta:** Menu Configuracion > Configuracion General

Antes de empezar a usar el sistema, configure estos datos:

| Campo | Que poner | Ejemplo |
|-------|-----------|---------|
| Vigencia | Ano fiscal | 2026 |
| Institucion Educativa | Nombre completo de la IE | IE Almirante Padilla |
| NIT Institucion | NIT con DV | 800.123.456-7 |
| Codigo DANE | Codigo del MEN (12 digitos) | 186755000015 |
| Rector/Director | Nombre del rector | Juan Perez Garcia |
| Tesorero/Pagador | Nombre de la tesorera | Martha Riobamba |
| Mes Actual | Mes en curso (1-12) | 2 |

Haga clic en **Guardar** para aplicar los cambios.

> **IMPORTANTE:** El Codigo DANE es necesario para el informe SIFSE. Viene
> precargado con 186755000015.

---

# 3. PLAN PRESUPUESTAL - RUBROS

## 3.1 Importar el catalogo desde Excel

**Ruta:** Menu Plan Presupuestal > Importar Catalogo Excel

1. Haga clic en "Importar Catalogo Excel"
2. Seleccione el archivo .xlsx o .xlsm con el presupuesto aprobado
3. El sistema importara rubros de gastos e ingresos
4. Mostrara: cantidad importada, totales, y si hay equilibrio

> Si ya tiene datos importados, esta opcion los actualiza.

## 3.2 Importar desde CSV

**Ruta:** Menu Plan Presupuestal > Importar Archivo Plano

Para cada tipo de archivo:
- **Formato:** Separador punto y coma (;), codificacion UTF-8
- **Primera fila** (encabezados) se ignora

| Tipo | Columnas |
|------|----------|
| Rubros de Gastos | codigo;cuenta;apropiacion_inicial |
| Rubros de Ingresos | codigo;cuenta;presupuesto_inicial |
| Terceros | nit;dv;nombre;direccion;telefono;email;tipo;banco;tipo_cuenta;no_cuenta |
| Conceptos | codigo_rubro;concepto |

Puede descargar las **plantillas CSV** desde el mismo submenu.

## 3.3 Gestion de Rubros de Gastos

**Ruta:** Menu Plan Presupuestal > Gestion Rubros de Gastos
(o boton "Rubros de Gastos" en el dashboard)

Pantalla con:
- **Barra de busqueda** (filtra por codigo o nombre en tiempo real)
- **Tabla** con: Codigo, Cuenta, Hoja (Si/No), Aprop. Inicial, Aprop. Definitiva

**Operaciones disponibles:**
- **Crear Rubro:** Ingrese codigo, nombre y apropiacion
- **Editar Rubro:** Seleccione y modifique nombre o valores
- **Eliminar Rubro:** Solo si no tiene CDPs ni hijos

> Los rubros **padre** (no-hoja) se calculan automaticamente sumando sus hijos.
> Solo los rubros **hoja** pueden tener movimientos (CDPs, RPs, etc.)

## 3.4 Gestion de Rubros de Ingresos

Funciona igual que gastos. Los campos son:
- Presupuesto Inicial (en vez de Apropiacion)
- Presupuesto Definitivo

## 3.5 Resumen Presupuestal

**Ruta:** Menu Plan Presupuestal > Resumen Presupuestal

Pantalla dividida en dos paneles:
- **Izquierda:** Arbol de rubros (seleccione Gastos o Ingresos con los radio buttons)
- **Derecha:** Detalle del rubro seleccionado con todos los valores

Los valores son **enlaces clickeables**: haga clic en un valor (ej: "Total CDPs")
para ver la lista de documentos asociados.

---

# 4. GESTION DE TERCEROS

## 4.1 Registrar un tercero

**Ruta:** Menu Gestion de Terceros > Registrar Tercero

| Campo | Obligatorio | Descripcion |
|-------|-------------|-------------|
| NIT/CC | Si | Cedula o NIT del proveedor |
| DV | No | Digito de verificacion |
| Nombre/Razon Social | Si | Nombre completo |
| Direccion | No | |
| Telefono | No | |
| Email | No | |
| Tipo | Si | Natural o Juridica |
| Banco | No | Para pagos |
| Tipo Cuenta | No | Ahorros o Corriente |
| No. Cuenta | No | Numero de cuenta bancaria |

## 4.2 Ver Terceros

**Ruta:** Menu Gestion de Terceros > Ver Terceros

Muestra la lista completa con NIT, Nombre, Tipo, Telefono y Email.

> **NOTA:** Tambien puede crear terceros rapidos al momento de registrar un RP
> (el sistema le preguntara si desea registrarlo).

---

# 5. REGISTRO DE MOVIMIENTO - CADENA PRESUPUESTAL

La cadena presupuestal sigue un orden obligatorio:

```
CDP --> RP --> OBLIGACION --> PAGO
```

Cada paso depende del anterior. No se puede crear un RP sin un CDP,
ni una Obligacion sin un RP, ni un Pago sin una Obligacion.

## 5.1 CDP - Certificado de Disponibilidad Presupuestal

**Ruta:** Menu Registro de Movimiento > 1. Disponibilidades (CDP)
(o boton "1. CDP" en el dashboard)

### Paso a paso:

**PASO 1 - Seleccionar rubro de gasto:**
1. Se abre la ventana "Buscar Rubro Presupuestal"
2. Escriba en el campo de busqueda (filtra por codigo o nombre)
3. La tabla muestra: Codigo, Cuenta, Apropiacion Definitiva
4. Al seleccionar un rubro, abajo aparece el **saldo disponible**
5. **Doble-clic** en el rubro para seleccionarlo

> Solo se muestran rubros hoja (los que tienen movimientos).
> Si el saldo es $0 o negativo, el sistema muestra error.

**PASO 2 - Seleccionar concepto/objeto del gasto:**
1. Se abre ventana con los conceptos usados anteriormente para ese rubro
2. **Opcion A:** Haga clic en un concepto de la lista para reutilizarlo
3. **Opcion B:** Escriba un nuevo concepto en el campo de texto
4. Haga clic en "Seleccionar" o "Usar Nuevo Concepto"

**PASO 3 - Seleccionar fuente SIFSE:**
1. Se abre ventana "Fuente de Financiacion (SIFSE)"
2. Seleccione de la lista desplegable la fuente que financia este gasto
3. Ejemplos comunes:
   - **2 - SGP Calidad por Gratuidad (MEN)** → para gastos con recursos de gratuidad
   - **1 - Recursos Propios** → para gastos con venta de bienes/servicios
   - **6 - SGP Matricula** → para gastos con calidad SGP
4. Haga clic en **Aceptar**

> La fuente SIFSE se propaga automaticamente a RP, Obligacion y Pago.
> Esta se selecciona UNA sola vez aqui en el CDP.

**PASO 4 - Ingresar valor:**
1. El sistema muestra: rubro, objeto, saldo disponible
2. Ingrese el valor del CDP (solo numeros)
3. El valor no puede exceder el saldo disponible

**PASO 5 - Confirmar:**
1. Revise el resumen: rubro, objeto, fuente SIFSE, valor
2. Haga clic en **Si** para confirmar

**Resultado:**
- Numero de CDP asignado automaticamente
- Fecha: la del dia actual
- Estado: ACTIVO

### Ejemplo practico:
```
Rubro: 2.1.2.02.02.006.04 - Energia electrica
Concepto: Pago factura EMSA febrero 2026
Fuente SIFSE: 2 - SGP Calidad por Gratuidad (MEN)
Valor: $ 800,000
→ CDP No. 1 creado exitosamente
```

---

## 5.2 RP - Registro Presupuestal (Compromiso)

**Ruta:** Menu Registro de Movimiento > 2. Registros Presupuestales (RP)
(o boton "2. RP" en el dashboard)

### Paso a paso:

**PASO 1 - Seleccionar CDP:**
1. Se abre la ventana "Seleccionar CDP Disponible"
2. La tabla muestra: No, Fecha, Rubro, Objeto, **Fuente SIFSE**, Valor, Saldo, Estado
3. CDPs agotados (saldo $0) aparecen en gris
4. **Doble-clic** para seleccionar el CDP

> Desde esta ventana tambien puede:
> - **Anular CDP** (boton rojo) - solo si no tiene RPs
> - **Editar Valor** (boton naranja) - ajustar el monto del CDP

**PASO 2 - Ingresar tercero (beneficiario):**
1. Ingrese el NIT o cedula del tercero
2. Si no existe, el sistema pregunta si desea crearlo
3. Si acepta, pide solo el nombre para crearlo rapido

**PASO 3 - Ingresar valor:**
1. Muestra info del CDP, tercero y saldo disponible
2. Ingrese el valor del RP
3. No puede exceder el saldo del CDP

**PASO 4 - Ingresar objeto/contrato:**
1. Escriba la descripcion del compromiso o contrato

**PASO 5 - Confirmar:**
1. Revise: CDP, Tercero, Valor, Objeto
2. Confirme con **Si**

**Resultado:**
- Numero de RP asignado
- Fuente SIFSE heredada automaticamente del CDP
- El saldo del CDP se reduce

### Ejemplo practico:
```
CDP: No. 1 (Energia electrica)
Tercero: 800.456.789-1 - EMSA S.A.
Valor: $ 800,000
Objeto: Contrato suministro energia 2026
→ RP No. 1 creado (fuente SIFSE = 2, heredada del CDP)
```

---

## 5.3 Obligacion

**Ruta:** Menu Registro de Movimiento > 3. Obligaciones
(o boton "3. OBLIGACION" en el dashboard)

### Paso a paso:

**PASO 1 - Seleccionar RP:**
1. Se abre la ventana "Seleccionar RP"
2. Muestra: No, Fecha, CDP, Rubro, Tercero, Valor, Saldo, Estado
3. RPs agotados aparecen en gris
4. **Doble-clic** para seleccionar

**PASO 2 - Ingresar valor:**
1. Muestra info del RP, tercero y saldo
2. Ingrese el valor de la obligacion (puede ser parcial)

**PASO 3 - Factura/Concepto:**
1. Ingrese el numero de factura o concepto de la obligacion

**PASO 4 - Confirmar**

**Resultado:**
- Obligacion registrada
- Fuente SIFSE heredada del RP
- Tercero heredado del RP

### Ejemplo practico:
```
RP: No. 1 (EMSA S.A.)
Valor: $ 800,000
Factura: Factura FE-2026-00123
→ Obligacion No. 1 creada
```

---

## 5.4 Pago

**Ruta:** Menu Registro de Movimiento > 4. Pagos
(o boton "4. PAGO" en el dashboard)

### Paso a paso:

**PASO 1 - Seleccionar obligacion:**
1. Ventana con obligaciones pendientes
2. **Doble-clic** para seleccionar

**PASO 2 - Ingresar valor:**
1. Puede ser pago parcial o total
2. Se valida contra el saldo de la obligacion
3. Se valida contra el PAC del mes (si esta configurado)

**PASO 3 - Concepto del pago:**
1. Descripcion breve del pago

**PASO 4 - Medio de pago:**
1. Ventana SI/NO:
   - **SI** = Transferencia bancaria
   - **NO** = Cheque

**PASO 5 - Numero de comprobante de egreso:**
1. Ingrese el numero del comprobante

**PASO 6 - Confirmar**

**Resultado:**
- Pago registrado con estado PAGADO
- Fuente SIFSE heredada de la obligacion

### Ejemplo practico:
```
Obligacion: No. 1 (EMSA S.A.)
Valor: $ 800,000
Concepto: Pago factura energia febrero
Medio: Transferencia
Comprobante: CE-001
→ Pago No. 1 registrado
```

---

## 5.5 Recaudo (Ingresos)

**Ruta:** Menu Registro de Movimiento > 5. Ingresos / Recaudos
(o boton "5. RECAUDO" en el dashboard)

### Paso a paso:

**PASO 1 - Seleccionar rubro de ingreso:**
1. Ventana de busqueda de rubros de ingresos
2. Busque por codigo o nombre
3. **Doble-clic** para seleccionar

**PASO 2 - Concepto:**
1. Describa el origen del ingreso

**PASO 3 - Numero de comprobante de ingreso:**
1. Ingrese el numero del comprobante

**PASO 4 - Valor:**
1. Monto recaudado
2. Si excede el presupuesto: muestra advertencia (pero permite continuar)

**PASO 5 - Confirmar**

### Ejemplo practico:
```
Rubro: 1.1.02.06.001.01.03.02 - SGP Calidad por Gratuidad
Concepto: Giro MEN febrero 2026
Comprobante: CI-001
Valor: $ 20,333,039
→ Recaudo No. 1 registrado
```

---

# 6. MODIFICACIONES PRESUPUESTALES

## 6.1 Adicion Presupuestal

**Ruta:** Menu Registro de Movimiento > 6. Adicion Presupuestal

Aumenta tanto un rubro de gasto como uno de ingreso por el mismo valor.

**Pasos:**
1. Seleccione el rubro de **gasto** a adicionar
2. Seleccione el rubro de **ingreso** correspondiente
3. Ingrese el valor de la adicion
4. Ingrese el numero del acto administrativo (Resolucion/Acuerdo)
5. Ingrese una descripcion (opcional)
6. Confirme (se muestra el antes y despues)

> La adicion mantiene el equilibrio presupuestal.

## 6.2 Reduccion Presupuestal

**Ruta:** Menu Registro de Movimiento > 7. Reduccion Presupuestal

Disminuye un rubro de gasto y uno de ingreso por el mismo valor.

**Pasos:** (igual que la adicion)

> No se puede reducir mas del saldo disponible del rubro de gasto.

## 6.3 Credito / Contracredito

**Ruta:** Menu Registro de Movimiento > 8. Credito / Contracredito

Traslada recursos entre dos rubros de **gasto** (no afecta ingresos).

**Pasos:**
1. Seleccione el rubro que **recibe** recursos (CREDITO)
2. Seleccione el rubro que **cede** recursos (CONTRACREDITO)
3. Ingrese el valor a trasladar
4. Ingrese numero de acto y descripcion
5. Confirme

> El total de gastos no cambia, solo se redistribuye.

## 6.4 Ver Modificaciones

**Ruta:** Menu Consultas > Ver Modificaciones Presupuestales

Tabla con todas las modificaciones: No, Fecha, Tipo, Acto, Valor, Descripcion.
**Doble-clic** en una fila para ver el detalle completo.

---

# 7. CONSULTAS Y LISTADOS

## 7.1 Listados de documentos

**Ruta:** Menu Consultas

| Opcion | Que muestra |
|--------|-------------|
| Ver CDPs | Todos los CDPs con rubro, objeto, valor, estado |
| Ver RPs | Todos los RPs con CDP origen, tercero, valor |
| Ver Obligaciones | Todas las obligaciones con RP, tercero, factura |
| Ver Pagos | Todos los pagos con medio, comprobante, valor |
| Ver Recaudos | Todos los recaudos por rubro |

**Acciones disponibles en cada listado:**
- **Anular** (boton rojo): Cambia estado a ANULADO (no se elimina)
- **Editar Valor** (boton naranja): Ajustar el monto
- **Imprimir** (boton azul): Genera comprobante HTML para imprimir

> **Doble-clic** en cualquier fila abre el comprobante para imprimir.

## 7.2 Tarjeta Presupuestal

**Ruta:** Menu Consultas > Tarjeta Presupuestal

1. Seleccione un rubro de gasto
2. Vera todos los movimientos del rubro en orden cronologico
3. Columnas: Fecha, Tipo, No, NIT, Tercero, Concepto, V.CDP, V.RP, V.Oblig, V.Pago
4. Totales al final
5. **Doble-clic** en una fila imprime el documento

---

# 8. GENERACION DE INFORMES

**Ruta:** Menu Generacion de Informes > Informes y Ejecuciones

Se abre una ventana con:
- **Filtros:** Mes Inicial y Mes Final
- **Arbol de informes** (doble-clic o boton "Generar")

## 8.1 Ejecucion de Gastos (Formato Catalogo)

Informe oficial con columnas:
- Ppto Inicial, Adiciones, Reducciones, Creditos, Contra-Creditos, Ppto Definitivo
- Compromisos (Anterior, Mes, Acumulado)
- Pagos (Anterior, Mes, Acumulado)
- Saldo Apropiacion, Saldo Compromisos por Pagar

Tiene **selector de mes** para cambiar el periodo.

Boton **Exportar Excel**: genera archivo .xlsx con formato profesional, formulas
y colores por nivel jerarquico.

## 8.2 Auxiliar - Detalle Movimientos

Muestra TODOS los movimientos en un periodo:
- CDPs, RPs, Obligaciones, Pagos
- Codificados por color segun tipo
- Totales por tipo de documento

## 8.3 Cadena Presupuestal (CDP > RP > Oblig > Pago)

Vista jerarquica de toda la cadena de ejecucion:
- Nodo raiz: CDP
  - Hijo: RP
    - Hijo: Obligacion
      - Hijo: Pago

Expandible/colapsable para ver el flujo completo.

## 8.4 Ejecucion de Ingresos (Formato Catalogo)

Informe oficial con:
- Ppto Inicial, Adiciones, Reducciones, Ppto Definitivo
- Recaudo (Anterior, Mes, Acumulado)
- Saldo por Recaudar

Tambien exportable a Excel.

## 8.5 Equilibrio Presupuestal

Comparativo Ingresos vs Gastos con:
- Presupuesto, Ejecucion, Porcentajes
- Resultado: Equilibrado / Superavit / Deficit

## 8.6 Consulta por Rubro y Periodo

Abre el Resumen Presupuestal con filtros de mes.

---

# 9. INFORME SIFSE (TRIMESTRAL)

**Ruta:** Menu Generacion de Informes > Informe SIFSE (Trimestral)

Este es el informe que se sube al Sistema de Informacion de Fondos de Servicios
Educativos del MEN.

## Paso a paso:

**PASO 1 - Seleccionar periodo:**
1. Trimestre: 1, 2, 3 o 4
   - T1 = Enero - Marzo
   - T2 = Abril - Junio
   - T3 = Julio - Septiembre
   - T4 = Octubre - Diciembre
2. Ano: 2025, 2026 o 2027

**PASO 2 - Vista previa:**
La pantalla tiene dos pestanas:

### Pestana "Ingresos Presupuestales"
| Columna | Descripcion |
|---------|-------------|
| Fuente | Codigo fuente SIFSE (1, 2, 3, 6, 32...) |
| Descripcion | Nombre de la fuente |
| Ppto Inicial | Presupuesto inicial por fuente |
| Ppto Definitivo | Presupuesto definitivo por fuente |
| Recaudado | Total recaudado en el trimestre |

### Pestana "Gastos Presupuestales"
| Columna | Descripcion |
|---------|-------------|
| Fuente | Codigo fuente SIFSE del CDP |
| Item | Codigo item de gasto SIFSE (7, 9, 10...) |
| Desc Item | Descripcion del item |
| Ppto Inicial | Apropiacion inicial |
| Ppto Definitivo | Apropiacion definitiva |
| Compromisos | Total RPs del trimestre |
| Obligaciones | Total obligaciones del trimestre |
| Pagos | Total pagos del trimestre |

**PASO 3 - Verificar advertencias:**
- Si hay rubros SIN mapeo SIFSE, aparece advertencia en amarillo
- Si hay CDPs sin fuente asignada, aparecen como "N/A"

**PASO 4 - Exportar:**
1. Haga clic en **Exportar .xls**
2. Seleccione ubicacion y nombre del archivo
3. Se genera archivo .xls con 2 hojas:
   - **Ingresos_Presupuestales**: CODIGO_DANE, ANIO, TRIMESTRE, FUENTE, PPTO_INICIAL, PPTO_DEFINITIVO, RECAUDADO
   - **Gastos_Presupuestales**: CODIGO_DANE, ANIO, TRIMESTRE, FUENTE, ITEM, PPTO_INICIAL, PPTO_DEFINITIVO, COMPROMISOS, OBLIGACIONES, PAGOS

> Este archivo es el que se sube directamente al portal SIFSE del MEN.

---

# 10. MAPEO SIFSE

**Ruta:** Menu Configuracion > Mapeo SIFSE

El sistema SIFSE usa codigos diferentes al catalogo CCPET. Esta pantalla permite
configurar que codigo SIFSE corresponde a cada rubro del presupuesto.

## Pestana "Ingresos -> Fuente SIFSE"

Muestra todos los rubros de ingreso hoja con:
- Codigo CCPET | Cuenta | Fuente SIFSE | Descripcion SIFSE
- Rubros sin mapear aparecen en **rojo claro**

**Para editar un mapeo:**
1. **Doble-clic** en el rubro
2. Se abre ventana con la lista de fuentes SIFSE
3. Seleccione la fuente correcta
4. Haga clic en **Guardar**

## Pestana "Gastos -> Item SIFSE"

Muestra todos los rubros de gasto hoja con:
- Codigo CCPET | Cuenta | Item SIFSE | Descripcion SIFSE

Funciona igual: **doble-clic** para editar.

## Mapeo por defecto

El sistema viene con un mapeo predeterminado basado en los codigos CCPET tipicos
de las IE. Si necesita restaurarlo:

1. Haga clic en **Restaurar Mapeo por Defecto**
2. Confirme la accion
3. Se borraran los mapeos actuales y se aplicaran los predeterminados

### Fuentes SIFSE principales:

| Cod | Fuente | Rubros CCPET tipicos |
|-----|--------|---------------------|
| 1 | Recursos Propios | 1.1.02.05.* (Venta bienes/servicios) |
| 2 | SGP Gratuidad | 1.1.02.06.001.01.03.02 |
| 3 | Otras Transferencias | Aportes nacion, dptos, municipio |
| 6 | SGP Matricula | 1.1.02.06.006.06.* |
| 32 | Rec. Balance Gratuidad | 1.2.10.02.01 |
| 35 | Rend. Financieros Gratuidad | 1.2.05.02.01 |
| 36 | Rend. Financieros Otros | 1.2.05.02.02, 1.2.05.02.04 |

### Items SIFSE principales:

| Cod | Item | Rubros CCPET tipicos |
|-----|------|---------------------|
| 7 | Funcionamiento basico | Aseo, botiquin, otros bienes |
| 9 | Servicios publicos | Acueducto, aseo |
| 10 | Energia | 2.1.2.02.02.006.04 |
| 12 | Internet | 2.1.2.02.02.008.03 |
| 14 | Seguros | 2.1.2.02.02.007.01 |
| 15 | Serv. profesionales | 2.1.2.02.02.008.05/06 |
| 20 | Mant. infraestructura | 2.1.2.02.02.005.01 |
| 21 | Dotacion institucional | Maquinaria, muebles, software |
| 22 | Material pedagogico | Papeleria, deporte, dotacion |
| 23 | Transporte escolar | 2.1.2.02.02.006.06 |
| 25 | Alimentacion escolar | 2.1.2.02.02.006.07 |
| 26 | Act. pedagogicas | 2.1.2.02.02.009.* |
| 86 | Servicios financieros | 2.1.2.02.02.007.02 |

---

# 11. PLAN ANUALIZADO DE CAJA (PAC)

**Ruta:** Menu Plan Presupuestal > Plan Anualizado de Caja (PAC)
(o boton "PAC" en el dashboard)

El PAC distribuye la apropiacion de cada rubro de gasto en los 12 meses del ano.
Si esta configurado, el sistema **valida** que cada pago no exceda el cupo mensual.

## Pantalla PAC:

**Panel izquierdo:** Lista de rubros de gasto (hoja)
- Busqueda por codigo o nombre
- Seleccione un rubro para ver/editar su PAC

**Panel derecho:** Distribucion mensual
- 12 campos editables (uno por mes)
- Cada fila muestra: Mes, Programado, Ejecutado (pagos reales), Disponible
- Total al final
- Advertencia si el total no coincide con la apropiacion

**Acciones:**
- **Distribuir Uniforme:** Divide la apropiacion en 12 partes iguales
- **Guardar PAC:** Guarda la distribucion manual

> Si el PAC no esta configurado para un rubro, los pagos no tienen restriccion mensual.

---

# 12. PROCESOS PRESUPUESTALES

## 12.1 Consolidar Mes

**Ruta:** Menu Procesos Presupuestales > Consolidar Mes

Agrega los movimientos del mes actual para cada rubro:
- Compromisos del mes (RPs)
- Pagos del mes
- Recaudos del mes (ingresos)

> Ejecute esto al final de cada mes antes del cierre.

## 12.2 Cierre de Mes

**Ruta:** Menu Procesos Presupuestales > Cierre de Mes

1. Confirme el cierre
2. El sistema consolida automaticamente
3. Avanza el mes activo al siguiente
4. Si cierra diciembre, muestra "FIN DE VIGENCIA"

> **IMPORTANTE:** El cierre de mes no es reversible. Asegurese de que todos
> los movimientos del mes esten registrados antes de cerrar.

---

# 13. COPIAS DE SEGURIDAD

## 13.1 Crear Backup

**Ruta:** Menu Configuracion > Crear Copia de Seguridad

1. Seleccione la carpeta destino
2. Se crea archivo: `presupuesto_ie_2026_backup_AAAAMMDD_HHMMSS.db`
3. Muestra el tamano del archivo

> Haga backup frecuentemente, especialmente antes de modificaciones importantes.

## 13.2 Restaurar Backup

**Ruta:** Menu Configuracion > Restaurar Copia de Seguridad

1. **ADVERTENCIA:** Esto reemplaza TODOS los datos actuales
2. Seleccione el archivo .db de respaldo
3. Confirme la restauracion
4. El sistema se reinicia automaticamente

---

# 14. GUIA RAPIDA DE PRUEBAS

Siga estos pasos en orden para probar todo el sistema:

## PRUEBA 1: Configuracion (5 minutos)

1. Abra **Configuracion > Configuracion General**
2. Llene todos los campos (institucion, NIT, DANE, rector, tesorera)
3. Verifique que el Mes Actual sea 1 (Enero) o el mes correcto
4. Guarde
5. Verifique que el dashboard muestre los datos correctos

## PRUEBA 2: Catalogo presupuestal (ya debe estar importado)

1. Revise **Plan Presupuestal > Rubros de Gastos**
2. Busque un rubro conocido (ej: "energia")
3. Verifique que aparezca con la apropiacion correcta
4. Revise **Rubros de Ingresos** de la misma forma
5. Verifique el **Resumen Presupuestal** - debe mostrar equilibrio

## PRUEBA 3: Registrar un tercero (2 minutos)

1. Vaya a **Gestion de Terceros > Registrar Tercero**
2. Ingrese: NIT=900123456, DV=7, Nombre=EMPRESA DE ENERGIA SA, Tipo=Juridica
3. Guarde
4. Verifique en **Ver Terceros**

## PRUEBA 4: Registrar CDP completo (3 minutos)

1. Haga clic en **1. CDP** en el dashboard
2. Busque el rubro "Energia" (ej: 2.1.2.02.02.006.04)
3. Doble-clic para seleccionar
4. Escriba concepto: "Pago energia electrica enero 2026"
5. Seleccione fuente SIFSE: **2 - SGP Calidad por Gratuidad (MEN)**
6. Ingrese valor: 500000
7. Confirme
8. **Resultado esperado:** CDP No. 1 creado exitosamente

## PRUEBA 5: Registrar RP (3 minutos)

1. Haga clic en **2. RP**
2. En la ventana de CDPs, verifique que aparece el CDP recien creado
   - Debe mostrar columna "Fuente SIFSE" con valor 2
3. Doble-clic en el CDP No. 1
4. Ingrese NIT: 900123456 (el tercero creado antes)
5. Valor: 500000
6. Objeto: "Contrato energia enero 2026"
7. Confirme
8. **Resultado esperado:** RP No. 1, fuente SIFSE heredada del CDP

## PRUEBA 6: Registrar Obligacion (2 minutos)

1. Haga clic en **3. OBLIGACION**
2. Doble-clic en el RP No. 1
3. Valor: 500000
4. Factura: "FE-2026-001"
5. Confirme
6. **Resultado esperado:** Obligacion No. 1

## PRUEBA 7: Registrar Pago (2 minutos)

1. Haga clic en **4. PAGO**
2. Doble-clic en la Obligacion No. 1
3. Valor: 500000
4. Concepto: "Pago factura energia enero"
5. Medio: SI (Transferencia)
6. Comprobante: "CE-001"
7. Confirme
8. **Resultado esperado:** Pago No. 1

## PRUEBA 8: Registrar Recaudo (2 minutos)

1. Haga clic en **5. RECAUDO**
2. Busque el rubro de ingreso de Gratuidad (1.1.02.06.001.01.03.02)
3. Concepto: "Giro MEN primer trimestre 2026"
4. Comprobante: "CI-001"
5. Valor: 20333039
6. Confirme
7. **Resultado esperado:** Recaudo No. 1

## PRUEBA 9: Verificar dashboard (1 minuto)

Regrese al dashboard y verifique:
- Total CDPs: $ 500,000
- Comprometido: $ 500,000
- Total Obligado: $ 500,000
- Total Pagado: $ 500,000
- En ingresos: Total Recaudado: $ 20,333,039

## PRUEBA 10: Consultas (3 minutos)

1. **Consultas > Ver CDPs** → debe mostrar CDP No. 1
2. **Consultas > Ver RPs** → debe mostrar RP No. 1
3. **Consultas > Tarjeta Presupuestal** → seleccione el rubro de energia
   - Debe mostrar toda la cadena: CDP, RP, Obligacion, Pago

## PRUEBA 11: Informes (5 minutos)

1. **Informes > Informes y Ejecuciones**
2. Seleccione "Ejecucion de Gastos" → doble-clic
3. Verifique que el rubro de energia muestra los montos correctos
4. Pruebe **Exportar Excel**
5. Repita con "Ejecucion de Ingresos"
6. Revise "Cadena Presupuestal" → debe mostrar el arbol CDP>RP>Oblig>Pago
7. Revise "Equilibrio Presupuestal"

## PRUEBA 12: Informe SIFSE (5 minutos)

1. **Informes > Informe SIFSE (Trimestral)**
2. Trimestre: 1, Ano: 2026
3. Haga clic en **Vista Previa**
4. **Pestana Ingresos:** Verifique que aparezca Fuente 2 (Gratuidad) con el recaudo
5. **Pestana Gastos:** Verifique que aparezca Fuente 2, Item 10 (Energia) con los montos
6. Haga clic en **Exportar .xls**
7. Abra el archivo generado en Excel y verifique las 2 hojas

## PRUEBA 13: Mapeo SIFSE (3 minutos)

1. **Configuracion > Mapeo SIFSE**
2. Pestana Ingresos: verifique que los rubros tienen fuente asignada
3. Rubros sin mapeo aparecen en rojo claro
4. Doble-clic en un rubro para cambiar su fuente
5. Pestana Gastos: verificar items asignados
6. Probar "Restaurar Mapeo por Defecto"

## PRUEBA 14: Modificacion presupuestal (3 minutos)

1. Haga clic en **6. ADICION**
2. Seleccione un rubro de gasto y uno de ingreso
3. Valor: 100000, Acto: "Resolucion 001"
4. Confirme
5. Verifique que las apropiaciones cambiaron
6. Revise en **Consultas > Ver Modificaciones**

## PRUEBA 15: Backup (2 minutos)

1. **Configuracion > Crear Copia de Seguridad**
2. Seleccione carpeta
3. Verifique que el archivo se creo

---

## RESUMEN DE ATAJOS Y TIPS

| Accion | Como hacerlo |
|--------|-------------|
| Seleccionar en cualquier lista | **Doble-clic** |
| Buscar rubros | Escriba codigo o nombre en campo busqueda |
| Imprimir comprobante | Doble-clic en listado o boton "Imprimir" |
| Editar mapeo SIFSE | Doble-clic en rubro (pantalla Mapeo SIFSE) |
| Ver detalle de modificacion | Doble-clic en listado de modificaciones |
| Exportar informe | Boton "Exportar Excel" en pantalla del informe |
| Volver al inicio | Boton "< Volver" o clic en boton del dashboard |

---

## FLUJO RECOMENDADO MENSUAL

1. **Inicio de mes:** Verificar mes activo en Configuracion
2. **Durante el mes:**
   - Registrar CDPs segun necesidad (con fuente SIFSE)
   - Crear RPs al comprometer con proveedores
   - Registrar Obligaciones al recibir facturas
   - Registrar Pagos al realizar transferencias
   - Registrar Recaudos al recibir ingresos
3. **Fin de mes:**
   - Verificar saldos en el dashboard
   - Generar informe de ejecucion de gastos
   - Consolidar mes
   - Cierre de mes
   - Crear copia de seguridad
4. **Fin de trimestre (adicional):**
   - Generar Informe SIFSE
   - Exportar .xls
   - Subir al portal SIFSE del MEN

---

*Manual generado para el Sistema Presupuestal IE 2026*
*IE Almirante Padilla - DANE 186755000015*
