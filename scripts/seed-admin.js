#!/usr/bin/env node
/**
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/seed-admin.js
 *   -- or with individual vars --
 *   PG_HOST=... PG_USER=... node scripts/seed-admin.js
 *
 * Optionally override defaults:
 *   ADMIN_NAME="Jane Doe" ADMIN_EMAIL="jane@co.com" ADMIN_PASSWORD="secret99" node scripts/seed-admin.js
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host:     process.env.PG_HOST     || 'localhost',
      port:     parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DATABASE || 'leave_tracker',
      user:     process.env.PG_USER     || 'postgres',
      password: process.env.PG_PASSWORD || '',
    });

const name     = process.env.ADMIN_NAME     || 'Admin';
const email    = process.env.ADMIN_EMAIL    || 'admin@company.com';
const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

async function run() {
  const hash = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    `INSERT INTO employees (name, email, role, joining_date, password)
     VALUES ($1, $2, 'Admin', CURRENT_DATE, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, name, email, role`,
    [name, email, hash]
  );

  if (rows.length === 0) {
    console.log(`Admin with email "${email}" already exists — skipped.`);
  } else {
    console.log('Admin created:');
    console.log(`  Name:  ${rows[0].name}`);
    console.log(`  Email: ${rows[0].email}`);
    console.log(`  Role:  ${rows[0].role}`);
    console.log(`  Pass:  ${password}`);
    console.log('\nChange this password after first login!');
  }

  await pool.end();
}

run().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
