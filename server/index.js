import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

const app = express();
app.use(cors());
app.use(express.json());

// ── Middleware ─────────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM employees WHERE email = $1',
      [email]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    delete user.password;
    res.json({ user, token });
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
app.patch('/api/employees/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }

  try {
    const { rows } = await pool.query('SELECT password FROM employees WHERE id = $1', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE employees SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/employees', authenticateToken, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, joining_date, created_at FROM employees ORDER BY created_at ASC'
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
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const { rows } = await pool.query(
      `INSERT INTO employees (name, email, role, joining_date, password)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, joining_date`,
      [name, email, role, joining_date, hashedPassword]
    );
    
    const user = rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Leave Requests ────────────────────────────────────────────────────────────
app.get('/api/leave-requests', authenticateToken, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM leave_requests ORDER BY applied_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leave-requests', authenticateToken, async (req, res) => {
  const { employee_id, type, start_date, end_date, status = 'Pending', reason } = req.body;
  
  // Security check: Employees should only submit for themselves unless they are Admin
  if (req.user.role !== 'Admin' && req.user.id !== employee_id) {
    return res.status(403).json({ error: 'Forbidden: You can only submit your own leave requests' });
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
});

app.patch('/api/leave-requests/:id', authenticateToken, async (req, res) => {
  // Only Admin can approve/reject
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Only Admins can update request status' });
  }

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
