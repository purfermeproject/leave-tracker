export default async function handler(req, res) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) return res.json({ error: 'GOOGLE_APPS_SCRIPT_URL not set' });

  try {
    const testUrl = `${url}?action=health`;
    const response = await fetch(testUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const text = await response.text();
    res.json({
      status: response.status,
      contentType: response.headers.get('content-type'),
      url: response.url,
      bodyPreview: text.slice(0, 500),
      isHTML: text.includes('<!DOCTYPE') || text.includes('<html'),
    });
  } catch (err) {
    res.json({ fetchError: err.message });
  }
}
