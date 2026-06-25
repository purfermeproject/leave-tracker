import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

async function callScript(params, method = 'GET') {
  if (method === 'GET') {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${SCRIPT_URL}?${qs}`, { redirect: 'follow' });
    return res.json();
  }
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Initialize sheets (creates tabs + headers)
    const setupResult = await callScript({ action: 'setup' });
    if (setupResult.error) throw new Error(`Sheet setup failed: ${setupResult.error}`);

    // 2. Check if admin already exists
    const employees = await callScript({ action: 'getRows', sheet: 'Employees' });
    if (employees.find && employees.find(e => e.email === 'prachi@purfermeproject.com')) {
      return res.json({ ok: true, message: 'Already set up — admin exists', alreadySeeded: true });
    }

    // 3. Seed admin user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = {
      id: randomUUID(),
      name: 'Prachi',
      email: 'prachi@purfermeproject.com',
      role: 'Admin',
      joining_date: '2024-01-01',
      password: hashedPassword,
      created_at: new Date().toISOString(),
    };

    const seedResult = await callScript({ action: 'appendRow', sheet: 'Employees', data: admin }, 'POST');
    if (seedResult && seedResult.error) throw new Error(`Seed failed: ${seedResult.error}`);

    res.json({
      ok: true,
      message: 'Setup complete! Sheets initialized and admin user created.',
      login: { email: 'prachi@purfermeproject.com', password: 'password123' },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
