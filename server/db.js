import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: true } : false,
    })
  : new Pool({
      host:     process.env.PG_HOST     || 'localhost',
      port:     parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DATABASE || 'leave_tracker',
      user:     process.env.PG_USER     || 'postgres',
      password: process.env.PG_PASSWORD || '',
      ssl:      isProduction ? { rejectUnauthorized: true } : false,
    });

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});
