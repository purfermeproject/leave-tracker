/**
 * Run once to initialize your Google Sheet with the correct header rows.
 * Usage: node scripts/setup-sheets.js
 */
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

async function setup() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get existing sheets
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = meta.data.sheets.map(s => s.properties.title);
  console.log('Existing sheets:', existingSheets);

  const requests = [];

  if (!existingSheets.includes('Employees')) {
    requests.push({ addSheet: { properties: { title: 'Employees' } } });
  }
  if (!existingSheets.includes('LeaveRequests')) {
    requests.push({ addSheet: { properties: { title: 'LeaveRequests' } } });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests },
    });
    console.log('Created missing sheets');
  }

  // Write headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Employees!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['id', 'name', 'email', 'role', 'joining_date', 'password', 'created_at']],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'LeaveRequests!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['id', 'employee_id', 'type', 'start_date', 'end_date', 'status', 'reason', 'applied_at']],
    },
  });

  console.log('Headers written to Employees and LeaveRequests sheets.');
  console.log('\nNext: add your admin user by running:');
  console.log('  node scripts/seed-admin.js');
}

setup().catch(err => { console.error(err.message); process.exit(1); });
