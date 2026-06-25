// Leave Tracker — Google Apps Script
// Paste this into: Extensions → Apps Script → Code.gs
// Then: Deploy → Manage Deployments → edit Version 1 → Save new version → Done

const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  try {
    let action, sheet, data, id, updates;

    if (e.parameter.payload) {
      // All requests now use base64-encoded payload to avoid POST→GET redirect issues
      const decoded = Utilities.newBlob(Utilities.base64Decode(e.parameter.payload)).getDataAsString();
      ({ action, sheet, data, id, updates } = JSON.parse(decoded));
    } else {
      action = e.parameter.action;
      sheet  = e.parameter.sheet;
    }

    if (action === 'getRows')    return json(getRows(sheet));
    if (action === 'appendRow')  return json(appendRow(sheet, data));
    if (action === 'updateRow')  return json(updateRow(sheet, id, updates));
    if (action === 'health')     return json({ ok: true });
    if (action === 'setup')      return json(setup());
    return json({ error: 'Unknown action' });
  } catch (err) {
    return json({ error: err.message });
  }
}

// ── Setup (run once) ──────────────────────────────────────────────────────────

function setup() {
  ensureSheet('Employees',     ['id','name','email','role','joining_date','password','created_at']);
  ensureSheet('LeaveRequests', ['id','employee_id','type','start_date','end_date','status','reason','applied_at']);
  return { ok: true, message: 'Sheets initialized' };
}

function ensureSheet(name, headers) {
  let s = SS.getSheetByName(name);
  if (!s) s = SS.insertSheet(name);
  // Only write headers if the sheet is empty
  if (s.getLastRow() === 0) {
    s.getRange(1, 1, 1, headers.length).setValues([headers]);
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
  if (!s) throw new Error(`Sheet "${sheetName}" not found — run setup first`);
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
