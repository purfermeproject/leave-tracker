import { getPool } from './_db.js';
import { verifyToken } from './_auth.js';

export default async function handler(req, res) {
  const pool = getPool();
  const user = verifyToken(req, res);
  if (!user) return;

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
    const { employee_id, type, start_date, end_date, status = 'Pending', reason } = req.body;
    
    // Authorization check
    if (user.role !== 'Admin' && user.id !== employee_id) {
      return res.status(403).json({ error: 'Forbidden: You can only submit your own requests' });
    }

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

  } else if (req.method === 'PATCH') {
    // Only Admin can update status via PATCH /api/leave-requests?id=...
    if (user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Admins can update status' });
    }

    const { id } = req.query;
    const { status } = req.body;
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    try {
      const { rows } = await pool.query(
        'UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
