/**
 * Seeds the admin user into your Google Sheet.
 * Edit the values below, then run: node scripts/seed-admin.js
 */
import { google } from 'googleapis';
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
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const hashedPassword = await bcrypt.hash(ADMIN.password, 10);

  const row = [
    randomUUID(),
    ADMIN.name,
    ADMIN.email,
    ADMIN.role,
    ADMIN.joining_date,
    hashedPassword,
    new Date().toISOString(),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Employees!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  console.log(`Admin user seeded: ${ADMIN.email} / ${ADMIN.password}`);
}

seed().catch(err => { console.error(err.message); process.exit(1); });
