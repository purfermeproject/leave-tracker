import { getPool } from './_db.js';

export default async function handler(_req, res) {
  try {
    await getPool().query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
}
