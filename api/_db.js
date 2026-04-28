import pg from 'pg';
const { Pool } = pg;

// Reuse pool across warm serverless invocations
let pool;
export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
  }
  return pool;
}
