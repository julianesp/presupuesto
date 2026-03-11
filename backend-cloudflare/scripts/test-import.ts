/**
 * Script para probar la importación de Excel en local
 */

import { readFileSync } from 'fs';
import { importarCatalogoExcel } from '../src/services/importacion';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

async function main() {
  // Conectar a la base de datos local de Wrangler
  const dbPath = '.wrangler/state/v3/d1';

  // Buscar el archivo .sqlite en el directorio
  const { readdirSync } = await import('fs');
  const { join } = await import('path');

  const d1Dir = join(process.cwd(), dbPath);
  const files = readdirSync(d1Dir, { recursive: true }) as string[];
  const sqliteFile = files.find(f => f.endsWith('.sqlite'));

  if (!sqliteFile) {
    throw new Error('No se encontró archivo .sqlite');
  }

  const fullPath = join(d1Dir, sqliteFile);
  console.log('Conectando a:', fullPath);

  const client = createClient({
    url: `file:${fullPath}`,
  });

  const db = drizzle(client);

  // Leer archivo Excel
  const excelPath = '/home/julian/Descargas/plantilla_presupuestal.xlsx';
  console.log('Leyendo Excel:', excelPath);

  const fileBuffer = readFileSync(excelPath);

  // Importar
  console.log('Iniciando importación...');
  const resultado = await importarCatalogoExcel(db.batch as any, 'tenant_default', fileBuffer);

  console.log('Resultado:', JSON.stringify(resultado, null, 2));
}

main().catch(console.error);
