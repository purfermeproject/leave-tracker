/**
 * Generates the admin row to paste into your Google Sheet, OR seeds via Apps Script URL.
 * Usage: node scripts/seed-admin.js
 */
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN = {
  name: 'Prachi',
  email: 'prachi@purfermeproject.com',
  password: 'password123',
  role: 'Admin',
  joining_date: '2024-01-01',
};

async function seed() {
  const hashedPassword = await bcrypt.hash(ADMIN.password, 10);
  const row = {
    id: randomUUID(),
    name: ADMIN.name,
    email: ADMIN.email,
    role: ADMIN.role,
    joining_date: ADMIN.joining_date,
    password: hashedPassword,
    created_at: new Date().toISOString(),
  };

  if (process.env.GOOGLE_APPS_SCRIPT_URL) {
    const res = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'appendRow', sheet: 'Employees', data: row }),
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    console.log(`✓ Admin seeded via Apps Script: ${ADMIN.email} / ${ADMIN.password}`);
  } else {
    console.log('No GOOGLE_APPS_SCRIPT_URL found. Paste this row manually into your Employees sheet:\n');
    console.log(Object.values(row).join('\t'));
    console.log('\nColumns: id | name | email | role | joining_date | password | created_at');
    console.log(`\nLogin: ${ADMIN.email} / ${ADMIN.password}`);
  }
}

seed().catch(err => { console.error(err.message); process.exit(1); });
