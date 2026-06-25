import { getRows, appendRow, LEAVE_HEADERS, randomUUID } from './_sheets.js';
import { verifyToken } from './_auth.js';

export default async function handler(req, res) {
  const user = verifyToken(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    try {
      const rows = await getRows('LeaveRequests');
      rows.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  } else if (req.method === 'POST') {
    const { employee_id, type, start_date, end_date, status = 'Pending', reason } = req.body;

    if (user.role !== 'Admin' && user.id !== employee_id) {
      return res.status(403).json({ error: 'Forbidden: You can only submit your own leave requests' });
    }
    if (!employee_id || !type || !start_date || !end_date) {
      return res.status(400).json({ error: 'employee_id, type, start_date, end_date are required' });
    }

    try {
      const newLeave = {
        id: randomUUID(),
        employee_id,
        type,
        start_date,
        end_date,
        status,
        reason: reason || '',
        applied_at: new Date().toISOString(),
      };
      await appendRow('LeaveRequests', newLeave, LEAVE_HEADERS);
      res.status(201).json(newLeave);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
