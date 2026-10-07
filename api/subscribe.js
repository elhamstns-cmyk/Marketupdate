import { json, body, db, DEMO } from '../lib/util.js';
// Early-access email list. Stores only people who ticked the consent box.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Not allowed.' });
    const b = await body(req);
    const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(res, 400, { error: 'Please enter a valid email address.' });
    if (!b.consent) return json(res, 400, { error: 'Please tick the box so we can email you.' });
    if (b.company) return json(res, 200, { ok: true }); // hidden field: bots fill it, people do not
    const role = ['realtor', 'broker', 'other'].includes(b.role) ? b.role : 'realtor';
    if (!DEMO) await db('leads?on_conflict=email', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal',
      data: { email, role, consent_text: String(b.consentText || '').slice(0, 400) } });
    json(res, 200, { ok: true });
  } catch (err) { console.error(err); json(res, 500, { error: 'Something went wrong. Please try again.' }); }
}
