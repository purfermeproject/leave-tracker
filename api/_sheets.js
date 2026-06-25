import { google } from 'googleapis';
import { randomUUID } from 'crypto';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

export const EMPLOYEE_HEADERS = ['id', 'name', 'email', 'role', 'joining_date', 'password', 'created_at'];
export const LEAVE_HEADERS = ['id', 'employee_id', 'type', 'start_date', 'end_date', 'status', 'reason', 'applied_at'];

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// Read all rows as array of objects
export async function getRows(sheetName) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  const [headers, ...rows] = res.data.values || [];
  if (!headers) return [];
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? null; });
    return obj;
  });
}

// Append a new row, returns the full object with generated id + timestamps
export async function appendRow(sheetName, data, headers) {
  const sheets = getSheets();
  const row = headers.map(h => data[h] ?? '');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
  return data;
}

// Find row index by id (returns 1-based sheet row number, accounting for header)
async function findRowIndex(sheetName, id) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  const [, ...rows] = res.data.values || [];
  const idx = rows.findIndex(r => r[0] === id);
  return idx === -1 ? null : idx + 2; // +2: 1-based + header row
}

// Update a row by id, returns updated object or null if not found
export async function updateRowById(sheetName, id, updates, headers) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  const [headerRow, ...rows] = res.data.values || [];
  if (!headerRow) return null;

  const rowIdx = rows.findIndex(r => r[0] === id);
  if (rowIdx === -1) return null;

  const current = {};
  headerRow.forEach((h, i) => { current[h] = rows[rowIdx][i] ?? ''; });
  const updated = { ...current, ...updates };
  const newRow = headers.map(h => updated[h] ?? '');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIdx + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [newRow] },
  });
  return updated;
}

export { randomUUID };
