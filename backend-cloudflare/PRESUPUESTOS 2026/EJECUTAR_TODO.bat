@echo off
chcp 65001 >nul
echo ============================================================
echo  SISTEMA PRESUPUESTAL IE 2026 - Instalador
echo ============================================================
echo.
echo PREREQUISITO: Debe habilitar el acceso programatico a VBA:
echo   Excel ^> Archivo ^> Opciones ^> Centro de confianza
echo   ^> Configuracion del Centro de confianza ^> Configuracion de macros
echo   ^> Marcar "Confiar en el acceso al modelo de objetos de proyectos de VBA"
echo.
echo Presione cualquier tecla cuando este listo...
pause >nul

echo.
echo [1/6] Creando estructura base del archivo...
cscript //nologo "D:\CONTABILIDAD EMPRESAS PORTATIL\PRESUPUESTOS 2026\01_CrearEstructura.vbs"
if %errorlevel% neq 0 (
    echo ERROR en Script 1. Abortando.
    pause
    exit /b 1
)

echo.
echo [2/6] Agregando formulas a hojas transaccionales...
cscript //nologo "D:\CONTABILIDAD EMPRESAS PORTATIL\PRESUPUESTOS 2026\02_AgregarFormulas.vbs"
if %errorlevel% neq 0 (
    echo ERROR en Script 2. Abortando.
    pause
    exit /b 1
)

echo.
echo [3/6] Creando modulos VBA - Parte 1 (Config, Validaciones, Navegacion, Terceros)...
cscript //nologo "D:\CONTABILIDAD EMPRESAS PORTATIL\PRESUPUESTOS 2026\03_AgregarVBA_Parte1.vbs"
if %errorlevel% neq 0 (
    echo ERROR en Script 3. Abortando.
    pause
    exit /b 1
)

echo.
echo [4/6] Creando modulos VBA - Parte 2 (CDP, RP)...
cscript //nologo "D:\CONTABILIDAD EMPRESAS PORTATIL\PRESUPUESTOS 2026\04_AgregarVBA_Parte2.vbs"
if %errorlevel% neq 0 (
    echo ERROR en Script 4. Abortando.
    pause
    exit /b 1
)

echo.
echo [5/6] Creando modulos VBA - Parte 3 (Obligacion, Pago)...
cscript //nologo "D:\CONTABILIDAD EMPRESAS PORTATIL\PRESUPUESTOS 2026\05_AgregarVBA_Parte3.vbs"
if %errorlevel% neq 0 (
    echo ERROR en Script 5. Abortando.
    pause
    exit /b 1
)

echo.
echo [6/6] Creando modulos VBA - Parte 4 (Tarjetas, Consolidacion, Menu, Botones)...
cscript //nologo "D:\CONTABILIDAD EMPRESAS PORTATIL\PRESUPUESTOS 2026\06_AgregarVBA_Parte4.vbs"
if %errorlevel% neq 0 (
    echo ERROR en Script 6. Abortando.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  INSTALACION COMPLETADA EXITOSAMENTE
echo ============================================================
echo.
echo Archivo creado: SISTEMA PRESUPUESTAL IE 2026.xlsm
echo.
echo INSTRUCCIONES:
echo   1. Abra el archivo en Excel
echo   2. Habilite macros cuando se lo solicite
echo   3. Vaya a la hoja CONFIG y complete los datos de la IE
echo   4. Use la hoja MENU para acceder a todas las funciones
echo.
echo Presione cualquier tecla para cerrar...
pause >nul
