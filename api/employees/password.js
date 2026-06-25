import bcrypt from 'bcryptjs';
import { getRows, updateRowById, EMPLOYEE_HEADERS } from '../_sheets.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = verifyToken(req, res);
  if (!user) return;

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }

  try {
    const employees = await getRows('Employees');
    const emp = employees.find(e => e.id === user.id);
    if (!emp) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(currentPassword, emp.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await updateRowById('Employees', user.id, { password: hashedNewPassword }, EMPLOYEE_HEADERS);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
