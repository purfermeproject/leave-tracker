import express from 'express';
import cors from 'cors';
import { pool } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM employees WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    // In a real app, generate a JWT here. For this demo, return the user object.
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
  const { name, email, role, joining_date, password } = req.body;
  if (!name || !email || !role || !joining_date) {
    return res.status(400).json({ error: 'name, email, role, joining_date are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO employees (name, email, role, joining_date, password)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email, role, joining_date, password || 'password123']
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

app.patch('/api/leave-requests/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (Approved or Rejected) is required' });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server → http://localhost:${PORT}`);
});
