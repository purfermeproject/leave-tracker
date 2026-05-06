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
    console.log('Connecting to database...');
    await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS password TEXT DEFAULT \'password123\'');
    console.log('Column "password" added successfully (or already exists).');
    
    // Set default password for existing users if any
    await pool.query('UPDATE employees SET password = \'password123\' WHERE password IS NULL');
    
    // Also ensure we have at least one admin for testing
    const { rows } = await pool.query('SELECT * FROM employees WHERE role = \'Admin\' LIMIT 1');
    if (rows.length === 0) {
      console.log('No Admin found. Creating a default admin: admin@purferme.com / admin123');
      await pool.query(
        "INSERT INTO employees (name, email, role, joining_date, password) VALUES ($1, $2, $3, $4, $5)",
        ['Admin User', 'admin@purferme.com', 'Admin', new Date().toISOString().split('T')[0], 'admin123']
      );
    }

    process.exit(0);
  } catch (err) {
    console.error('Error updating database:', err.message);
    process.exit(1);
  }
}

run();
