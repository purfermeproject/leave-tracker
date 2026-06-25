export default async function handler(req, res) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) return res.json({ error: 'GOOGLE_APPS_SCRIPT_URL not set' });

  try {
    // Test a real appendRow call the same way _sheets.js does it
    const params = {
      action: 'appendRow',
      sheet: 'LeaveRequests',
      data: {
        id: 'debug-test-' + Date.now(),
        employee_id: 'debug-employee',
        type: 'Annual',
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        status: 'Pending',
        reason: 'debug test - safe to delete',
        applied_at: new Date().toISOString(),
      },
    };
    const payload = Buffer.from(JSON.stringify(params)).toString('base64');
    const testUrl = `${url}?payload=${encodeURIComponent(payload)}`;

    const response = await fetch(testUrl, { redirect: 'follow' });
    const text = await response.text();

    res.json({
      status: response.status,
      url: response.url,
      bodyPreview: text.slice(0, 500),
      isHTML: text.includes('<!DOCTYPE') || text.includes('<html'),
    });
  } catch (err) {
    res.json({ fetchError: err.message });
  }
}
