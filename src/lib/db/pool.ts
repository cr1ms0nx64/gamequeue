import { Pool } from 'pg';
const globalForDb = globalThis as unknown as {
  gamesPool?: Pool;
};

export const db = globalForDb.gamesPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

if (process.env.NODE_ENV !== 'production') globalForDb.gamesPool = db;

