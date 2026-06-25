import { getRows } from './_sheets.js';

export default async function handler(_req, res) {
  try {
    await getRows('Employees');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
}
