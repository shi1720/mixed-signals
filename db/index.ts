import { env } from 'cloudflare:workers';
export function getDb(): D1Database {
  if (!env.DB) throw new Error('D1 database binding DB is unavailable.');
  return env.DB as D1Database;
}
