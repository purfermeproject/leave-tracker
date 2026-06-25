import { randomUUID } from 'crypto';

const URL = process.env.GOOGLE_APPS_SCRIPT_URL;

async function call(method, params) {
  let res;
  if (method === 'GET') {
    const qs = new URLSearchParams(params).toString();
    res = await fetch(`${URL}?${qs}`, { redirect: 'follow' });
  } else {
    res = await fetch(URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(params),
    });
  }
  return res.json();
}

export async function getRows(sheetName) {
  return call('GET', { action: 'getRows', sheet: sheetName });
}

export async function appendRow(sheetName, data) {
  return call('POST', { action: 'appendRow', sheet: sheetName, data });
}

export async function updateRowById(sheetName, id, updates) {
  return call('POST', { action: 'updateRow', sheet: sheetName, id, updates });
}

export { randomUUID };

// kept for API compatibility — headers are managed by Apps Script now
export const EMPLOYEE_HEADERS = [];
export const LEAVE_HEADERS = [];
