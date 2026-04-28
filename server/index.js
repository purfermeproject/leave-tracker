import express from 'express';
import cors from 'cors';
import { pool } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// ── Employees ─────────────────────────────────────────────────────────────────
app.get('/api/employees', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM employees ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', async (req, res) => {
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
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Leave Requests ────────────────────────────────────────────────────────────
app.get('/api/leave-requests', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM leave_requests ORDER BY applied_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leave-requests', async (req, res) => {
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
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server → http://localhost:${PORT}`);
});
