// Leave Tracker — Google Apps Script
// Paste this into: Extensions → Apps Script → Code.gs
// Then: Deploy → New Deployment → Web App → Anyone → Deploy
// Copy the Web App URL and set it as GOOGLE_APPS_SCRIPT_URL in Vercel

const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheet  = e.parameter.sheet;
    if (action === 'getRows') return json(getRows(sheet));
    if (action === 'health')  return json({ ok: true });
    return json({ error: 'Unknown action' });
  } catch (err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    const body    = JSON.parse(e.postData.contents);
    const { action, sheet, data, id, updates } = body;
    if (action === 'appendRow')  return json(appendRow(sheet, data));
    if (action === 'updateRow')  return json(updateRow(sheet, id, updates));
    return json({ error: 'Unknown action' });
  } catch (err) {
    return json({ error: err.message });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRows(sheetName) {
  const s = SS.getSheetByName(sheetName);
  if (!s) return [];
  const values = s.getDataRange().getValues();
  if (values.length < 2) return [];
  const [headers, ...rows] = values;
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
    return obj;
  });
}

function appendRow(sheetName, data) {
  const s = SS.getSheetByName(sheetName);
  if (!s) throw new Error(`Sheet "${sheetName}" not found`);
  const headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  s.appendRow(row);
  return data;
}

function updateRow(sheetName, id, updates) {
  const s = SS.getSheetByName(sheetName);
  if (!s) throw new Error(`Sheet "${sheetName}" not found`);
  const all = s.getDataRange().getValues();
  const [headers, ...rows] = all;
  const rowIdx = rows.findIndex(r => String(r[0]) === String(id));
  if (rowIdx === -1) return null;
  const current = {};
  headers.forEach((h, i) => { current[h] = rows[rowIdx][i]; });
  const updated = { ...current, ...updates };
  const newRow = headers.map(h => updated[h] !== undefined ? updated[h] : '');
  s.getRange(rowIdx + 2, 1, 1, newRow.length).setValues([newRow]);
  return updated;
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
