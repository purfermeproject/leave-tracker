import { getPool } from './_db.js';

export default async function handler(req, res) {
  const pool = getPool();

  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM leave_requests ORDER BY applied_at DESC'
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  } else if (req.method === 'POST') {
    const { employee_id, type, start_date, end_date, status = 'Approved', reason } = req.body;
    if (!employee_id || !type || !start_date || !end_date) {
      return res.status(400).json({ error: 'employee_id, type, start_date, end_date are required' });
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO leave_requests (employee_id, type, start_date, end_date, status, reason)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [employee_id, type, start_date, end_date, status, reason || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
