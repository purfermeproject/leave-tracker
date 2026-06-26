import { getRows, appendRow, LEAVE_HEADERS, randomUUID } from './_sheets.js';
import { verifyToken } from './_auth.js';
import { Resend } from 'resend';

function toIST(date) {
  return new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

async function notifyAdmins(employees, leave) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const resend = new Resend(resendKey);
  const admins = employees.filter(e => e.role === 'Admin');
  const appUrl = process.env.APP_URL || 'https://leave-tracker-20.vercel.app';

  for (const admin of admins) {
    await resend.emails.send({
      from: 'Leave Tracker <onboarding@resend.dev>',
      to: admin.email,
      subject: `New Leave Request from ${leave.employee_name}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px">
          <h2 style="color:#1a1a2e">New Leave Request</h2>
          <p><strong>Employee:</strong> ${leave.employee_name}</p>
          <p><strong>Type:</strong> ${leave.type} Leave</p>
          <p><strong>From:</strong> ${leave.start_date}</p>
          <p><strong>To:</strong> ${leave.end_date}</p>
          <p><strong>Reason:</strong> ${leave.reason || '—'}</p>
          <p><strong>Applied at:</strong> ${leave.applied_at} IST</p>
          <a href="${appUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#6c63ff;color:#fff;border-radius:6px;text-decoration:none">
            Review in Leave Tracker →
          </a>
        </div>
      `,
    });
  }
}

export default async function handler(req, res) {
  const user = verifyToken(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    try {
      const rows = await getRows('LeaveRequests');
      rows.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  } else if (req.method === 'POST') {
    const { employee_id, type, start_date, end_date, status = 'Pending', reason } = req.body;

    if (user.role !== 'Admin' && user.id !== employee_id) {
      return res.status(403).json({ error: 'Forbidden: You can only submit your own leave requests' });
    }
    if (!employee_id || !type || !start_date || !end_date) {
      return res.status(400).json({ error: 'employee_id, type, start_date, end_date are required' });
    }

    try {
      const [employees, existingLeaves] = await Promise.all([
        getRows('Employees'),
        getRows('LeaveRequests'),
      ]);

      // Check for overlapping approved leaves
      const reqStart = new Date(start_date);
      const reqEnd = new Date(end_date);
      const overlap = existingLeaves.find(l =>
        l.employee_id === employee_id &&
        l.status === 'Approved' &&
        new Date(l.start_date) <= reqEnd &&
        new Date(l.end_date) >= reqStart
      );
      if (overlap) {
        return res.status(409).json({
          error: `You already have an approved ${overlap.type} leave from ${overlap.start_date} to ${overlap.end_date} that overlaps with your request.`,
        });
      }

      const emp = employees.find(e => e.id === employee_id);
      const employee_name = emp ? emp.name : '';

      const newLeave = {
        id: randomUUID(),
        employee_id,
        employee_name,
        type,
        start_date,
        end_date,
        status,
        reason: reason || '',
        applied_at: toIST(new Date()),
      };

      await appendRow('LeaveRequests', newLeave, LEAVE_HEADERS);

      // Send email to all admins (non-blocking — don't fail the request if email fails)
      notifyAdmins(employees, newLeave).catch(err => console.error('Email error:', err));

      res.status(201).json(newLeave);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
