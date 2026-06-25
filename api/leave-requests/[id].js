import { updateRowById, LEAVE_HEADERS } from '../_sheets.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = verifyToken(req, res);
  if (!user) return;

  if (user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Only Admins can update request status' });
  }

  const { id } = req.query;
  const { status } = req.body;

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (Approved or Rejected) is required' });
  }

  try {
    const updated = await updateRowById('LeaveRequests', id, { status }, LEAVE_HEADERS);
    if (!updated) return res.status(404).json({ error: 'Leave request not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
