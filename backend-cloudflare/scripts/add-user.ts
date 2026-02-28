#!/usr/bin/env node
/**
 * Script para agregar usuarios al sistema
 * Uso: npm run add-user
 */

import { execSync } from 'child_process';
import * as readline from 'readline';

// Interfaz para entrada del usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function executeSQL(sql: string): any {
  try {
    const command = `wrangler d1 execute presupuesto-db --local --json --command "${sql.replace(/"/g, '\\"')}"`;
    const result = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const parsed = JSON.parse(result);
    return parsed[0]?.results || [];
  } catch (error: any) {
    console.error('Error ejecutando SQL:', error.message);
    throw error;
  }
}

async function getTenantId(): Promise<string> {
  // Buscar tenants existentes
  const existingTenants = executeSQL('SELECT * FROM tenants');

  if (existingTenants.length === 0) {
    console.log('\n⚠️  No hay tenants en la base de datos. Creando uno nuevo...\n');

    const nombre = await question('Nombre de la institución: ');
    const nit = await question('NIT: ');
    const codigoDane = await question('Código DANE (opcional, Enter para omitir): ');
    const vigencia = await question('Vigencia actual (Enter para 2026): ');

    const tenantId = 'tenant_' + Date.now();
    const fechaCreacion = new Date().toISOString();

    executeSQL(`
      INSERT INTO tenants (id, nombre, nit, codigo_dane, vigencia_actual, estado, fecha_creacion)
      VALUES (
        '${tenantId}',
        '${nombre.replace(/'/g, "''")}',
        '${nit}',
        ${codigoDane ? `'${codigoDane}'` : 'NULL'},
        ${vigencia || 2026},
        'ACTIVO',
        '${fechaCreacion}'
      )
    `);

    console.log(`\n✅ Tenant creado: ${nombre} (${tenantId})\n`);
    return tenantId;
  }

  if (existingTenants.length === 1) {
    console.log(`\n✅ Usando tenant: ${existingTenants[0].nombre} (${existingTenants[0].id})\n`);
    return existingTenants[0].id;
  }

  // Mostrar opciones si hay varios tenants
  console.log('\n📋 Tenants disponibles:');
  existingTenants.forEach((t: any, idx: number) => {
    console.log(`  ${idx + 1}. ${t.nombre} (${t.nit})`);
  });

  const seleccion = await question('\nSelecciona el tenant (número): ');
  const idx = parseInt(seleccion) - 1;

  if (idx < 0 || idx >= existingTenants.length) {
    throw new Error('Selección inválida');
  }

  return existingTenants[idx].id;
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('   📝 AGREGAR USUARIO AL SISTEMA');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Obtener o crear tenant
    const tenantId = await getTenantId();

    // Solicitar datos del usuario
    const email = await question('Email del usuario: ');

    // Verificar si el email ya existe
    const existingUsers = executeSQL(`SELECT * FROM users WHERE email = '${email.toLowerCase()}'`);

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      console.log(`\n⚠️  El usuario ${email} ya existe.`);
      const actualizar = await question('¿Deseas actualizarlo? (s/n): ');

      if (actualizar.toLowerCase() !== 's') {
        console.log('Operación cancelada.');
        rl.close();
        return;
      }

      // Actualizar usuario existente
      const nombre = await question(`Nombre (actual: ${existingUser.nombre}, Enter para mantener): `);
      const cargo = await question(`Cargo (actual: ${existingUser.cargo || 'Sin cargo'}, Enter para mantener): `);

      console.log('\nRoles disponibles:');
      console.log('  1. ADMIN - Acceso total');
      console.log('  2. TESORERO - Puede crear/editar registros');
      console.log('  3. CONSULTA - Solo lectura');

      const rolNum = await question(`Selecciona rol (actual: ${existingUser.rol}, Enter para mantener): `);
      const roles = ['ADMIN', 'TESORERO', 'CONSULTA'];
      const rol = rolNum ? (roles[parseInt(rolNum) - 1] || existingUser.rol) : existingUser.rol;

      const activo = await question('¿Usuario activo? (s/n, Enter para mantener): ');
      const activoVal = activo === '' ? existingUser.activo : (activo.toLowerCase() === 's' ? 1 : 0);

      const finalNombre = nombre || existingUser.nombre;
      const finalCargo = cargo || existingUser.cargo;

      executeSQL(`
        UPDATE users
        SET nombre = '${finalNombre.replace(/'/g, "''")}',
            cargo = ${finalCargo ? `'${finalCargo.replace(/'/g, "''")}'` : 'NULL'},
            rol = '${rol}',
            activo = ${activoVal}
        WHERE email = '${email.toLowerCase()}'
      `);

      console.log(`\n✅ Usuario ${email} actualizado exitosamente!`);
    } else {
      // Crear nuevo usuario
      const nombre = await question('Nombre completo: ');
      const cargo = await question('Cargo (opcional, Enter para omitir): ');

      console.log('\nRoles disponibles:');
      console.log('  1. ADMIN - Acceso total');
      console.log('  2. TESORERO - Puede crear/editar registros');
      console.log('  3. CONSULTA - Solo lectura');

      const rolNum = await question('Selecciona rol (1-3): ');
      const roles = ['ADMIN', 'TESORERO', 'CONSULTA'];
      const rol = roles[parseInt(rolNum) - 1] || 'CONSULTA';

      const fechaCreacion = new Date().toISOString();

      executeSQL(`
        INSERT INTO users (tenant_id, email, nombre, cargo, rol, activo, fecha_creacion)
        VALUES (
          '${tenantId}',
          '${email.toLowerCase()}',
          '${nombre.replace(/'/g, "''")}',
          ${cargo ? `'${cargo.replace(/'/g, "''")}'` : 'NULL'},
          '${rol}',
          1,
          '${fechaCreacion}'
        )
      `);

      console.log(`\n✅ Usuario ${email} creado exitosamente!`);
    }

    // Mostrar resumen de usuarios
    const allUsers = executeSQL(`SELECT * FROM users WHERE tenant_id = '${tenantId}'`);

    console.log('\n📋 Usuarios en el sistema:');
    allUsers.forEach((u: any) => {
      const status = u.activo ? '✅' : '❌';
      console.log(`  ${status} ${u.email} - ${u.nombre} (${u.rol})`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    rl.close();
  }
}

main();
