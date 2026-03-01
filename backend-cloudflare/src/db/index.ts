/**
 * Database connection and helpers
 */

import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import type { Env } from '../types/bindings';

let cachedDb: any = null;

export function getDb(env: Env) {
  // Si ya tenemos una conexión en caché en Node.js, reutilizarla
  if (cachedDb && !env.DB) {
    return cachedDb;
  }

  // Cloudflare Workers con D1
  if (env.DB) {
    return drizzleD1(env.DB, { schema });
  }

  // Node.js con libSQL (usando DATABASE_URL del entorno)
  const databaseUrl = process.env.DATABASE_URL || 'file:./local.db';

  const client = createClient({
    url: databaseUrl,
  });

  cachedDb = drizzleLibsql(client, { schema });
  return cachedDb;
}

export type DbClient = ReturnType<typeof getDb>;

// Re-export schema
export * from './schema';
