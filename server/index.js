import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getRows, appendRow, updateRowById, EMPLOYEE_HEADERS, LEAVE_HEADERS } from '../api/_sheets.js';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

const app = express();
app.use(cors());
app.use(express.json());

// ── Middleware ────────────────────────────────────────────────────────────────
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

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await getRows('Employees');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const employees = await getRows('Employees');
    const user = employees.find(e => e.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    const { password: _pw, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Employees ─────────────────────────────────────────────────────────────────
app.patch('/api/employees/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });

  try {
    const employees = await getRows('Employees');
    const emp = employees.find(e => e.id === req.user.id);
    if (!emp) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, emp.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect current password' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await updateRowById('Employees', req.user.id, { password: hashed }, EMPLOYEE_HEADERS);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/employees', authenticateToken, async (_req, res) => {
  try {
    const rows = await getRows('Employees');
    res.json(rows.map(({ password: _pw, ...e }) => e));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', async (req, res) => {
  const { name, email, role, joining_date, password } = req.body;
  if (!name || !email || !role || !joining_date)
    return res.status(400).json({ error: 'name, email, role, joining_date are required' });

  try {
    const existing = await getRows('Employees');
    if (existing.find(e => e.email === email))
      return res.status(409).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const newEmp = {
      id: randomUUID(),
      name, email, role, joining_date,
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
});

// ── Leave Requests ────────────────────────────────────────────────────────────
app.get('/api/leave-requests', authenticateToken, async (_req, res) => {
  try {
    const rows = await getRows('LeaveRequests');
    rows.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leave-requests', authenticateToken, async (req, res) => {
  const { employee_id, type, start_date, end_date, status = 'Pending', reason } = req.body;

  if (req.user.role !== 'Admin' && req.user.id !== employee_id)
    return res.status(403).json({ error: 'Forbidden: You can only submit your own leave requests' });
  if (!employee_id || !type || !start_date || !end_date)
    return res.status(400).json({ error: 'employee_id, type, start_date, end_date are required' });

  try {
    const newLeave = {
      id: randomUUID(),
      employee_id, type, start_date, end_date,
      status,
      reason: reason || '',
      applied_at: new Date().toISOString(),
    };
    await appendRow('LeaveRequests', newLeave, LEAVE_HEADERS);
    res.status(201).json(newLeave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/leave-requests/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin')
    return res.status(403).json({ error: 'Forbidden: Only Admins can update request status' });

  const { status } = req.body;
  if (!status || !['Approved', 'Rejected'].includes(status))
    return res.status(400).json({ error: 'Valid status (Approved or Rejected) is required' });

  try {
    const updated = await updateRowById('LeaveRequests', req.params.id, { status }, LEAVE_HEADERS);
    if (!updated) return res.status(404).json({ error: 'Leave request not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API server → http://localhost:${PORT}`));
