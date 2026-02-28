/**
 * Database connection and helpers
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import type { Env } from '../types/bindings';

export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
}

export type DbClient = ReturnType<typeof getDb>;

// Re-export schema
export * from './schema';
