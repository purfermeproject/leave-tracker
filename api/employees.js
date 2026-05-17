import { getPool } from './_db.js';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from './_auth.js';

export default async function handler(req, res) {
  const pool = getPool();

  if (req.method === 'GET') {
    const user = verifyToken(req, res);
    if (!user) return; // verifyToken already sent 401/403

    try {
      const { rows } = await pool.query(
        'SELECT id, name, email, role, joining_date, created_at FROM employees ORDER BY created_at ASC'
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  } else if (req.method === 'POST') {
    const { name, email, role, joining_date, password } = req.body;
    if (!name || !email || !role || !joining_date) {
      return res.status(400).json({ error: 'name, email, role, joining_date are required' });
    }
    
    try {
      const hashedPassword = await bcrypt.hash(password || 'password123', 10);
      const { rows } = await pool.query(
        `INSERT INTO employees (name, email, role, joining_date, password)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, joining_date`,
        [name, email, role, joining_date, hashedPassword]
      );
      
      const newEmp = rows[0];
      const token = signToken(newEmp);
      res.status(201).json({ user: newEmp, token });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
      res.status(500).json({ error: err.message });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
