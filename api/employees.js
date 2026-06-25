import bcrypt from 'bcryptjs';
import { getRows, appendRow, EMPLOYEE_HEADERS, randomUUID } from './_sheets.js';
import { signToken, verifyToken } from './_auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const user = verifyToken(req, res);
    if (!user) return;

    try {
      const rows = await getRows('Employees');
      const safe = rows.map(({ password: _pw, ...e }) => e);
      res.json(safe);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  } else if (req.method === 'POST') {
    const { name, email, role, joining_date, password } = req.body;
    if (!name || !email || !role || !joining_date) {
      return res.status(400).json({ error: 'name, email, role, joining_date are required' });
    }

    try {
      const existing = await getRows('Employees');
      if (existing.find(e => e.email === email)) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password || 'password123', 10);
      const newEmp = {
        id: randomUUID(),
        name,
        email,
        role,
        joining_date,
        password: hashedPassword,
        created_at: new Date().toISOString(),
      };

      await appendRow('Employees', newEmp, EMPLOYEE_HEADERS);
      const token = signToken(newEmp);
      const { password: _pw, ...safeUser } = newEmp;
      res.status(201).json({ user: safeUser, token });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
