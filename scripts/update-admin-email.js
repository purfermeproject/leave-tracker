import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'leave_tracker',
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || '',
});

async function run() {
  try {
    console.log('Updating Admin email...');
    await pool.query('UPDATE employees SET email = \'abhinav@purfermeproject.com\' WHERE role = \'Admin\'');
    console.log('Admin email updated to abhinav@purfermeproject.com');
    process.exit(0);
  } catch (err) {
    console.error('Error updating admin email:', err.message);
    process.exit(1);
  }
}

run();
