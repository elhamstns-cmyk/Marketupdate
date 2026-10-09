import { json, body, db, DEMO } from '../util.js';
// Campaign list. Everyone who starts sign-up is saved; "consent" records whether they ticked the marketing box.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Not allowed.' });
    const b = await body(req);
    const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(res, 400, { error: 'Please enter a valid email address.' });
    if (b.company) return json(res, 200, { ok: true }); // hidden field: bots fill it, people do not
    const row = { email, role: ['realtor', 'broker', 'other'].includes(b.role) ? b.role : 'realtor' };
    if (b.consent) { row.consent = true; row.consent_text = String(b.consentText || '').slice(0, 400); row.consent_at = new Date().toISOString(); }
    if (!DEMO) await db('leads?on_conflict=email', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', data: row });
    json(res, 200, { ok: true });
  } catch (err) { console.error(err); json(res, 500, { error: 'Something went wrong. Please try again.' }); }
}
