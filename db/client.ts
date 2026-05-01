import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type Db = ReturnType<typeof createDb>;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return drizzle(neon(url), { schema });
}

let cached: Db | null = null;

export function getDb(): Db {
  if (!cached) cached = createDb();
  return cached;
}
