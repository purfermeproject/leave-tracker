import { getPool } from './_db.js';

export default async function handler(req, res) {
  const pool = getPool();

  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM employees ORDER BY created_at ASC'
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  } else if (req.method === 'POST') {
    const { name, email, role, joining_date } = req.body;
    if (!name || !email || !role || !joining_date) {
      return res.status(400).json({ error: 'name, email, role, joining_date are required' });
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO employees (name, email, role, joining_date)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, email, role, joining_date]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
      res.status(500).json({ error: err.message });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
