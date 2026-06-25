import { randomUUID } from 'crypto';

const SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

// All requests use GET to avoid the POST→GET redirect conversion issue with Apps Script.
// Data is passed as a base64-encoded payload query param.
async function call(params) {
  const payload = Buffer.from(JSON.stringify(params)).toString('base64');
  const res = await fetch(`${SCRIPT_URL}?payload=${encodeURIComponent(payload)}`, {
    redirect: 'follow',
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error('Apps Script returned an HTML page — check deployment access settings.');
    }
    throw new Error(`Apps Script error: ${text.slice(0, 300)}`);
  }
}

export async function getRows(sheetName) {
  return call({ action: 'getRows', sheet: sheetName });
}

export async function appendRow(sheetName, data) {
  return call({ action: 'appendRow', sheet: sheetName, data });
}

export async function updateRowById(sheetName, id, updates) {
  return call({ action: 'updateRow', sheet: sheetName, id, updates });
}

export { randomUUID };

export const EMPLOYEE_HEADERS = [];
export const LEAVE_HEADERS = [];
