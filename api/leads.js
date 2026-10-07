import { json, db, DEMO } from '../lib/util.js';
// Admin only: download the campaign list as a spreadsheet file.
export default async function handler(req, res) {
  try {
    if (!process.env.ADMIN_TOKEN || req.headers.authorization !== `Bearer ${process.env.ADMIN_TOKEN}`) return json(res, 401, { error: 'Wrong admin password.' });
    const rows = DEMO ? [] : await db('leads?select=email,role,consent,created_at&order=created_at.desc');
    const paid = new Set((DEMO ? [] : await db('profiles?status=in.(active,trialing)&select=email')).map((p) => (p.email || '').toLowerCase()));
    const csv = ['email,role,agreed_to_marketing_emails,paying_subscriber,started_sign_up',
      ...rows.map((r) => `${r.email},${r.role},${r.consent ? 'yes' : 'no'},${paid.has(r.email) ? 'yes' : 'no'},${r.created_at}`)].join('\n');
    res.statusCode = 200; res.setHeader('content-type', 'text/csv'); res.setHeader('cache-control', 'no-store'); res.end(csv);
  } catch (err) { console.error(err); json(res, 500, { error: 'Something went wrong.' }); }
}
