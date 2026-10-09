import { json, body, db, DEMO } from '../lib/util.js';
// The "Confirm your email" link lands here. We check the one-time code with the sign-in service ourselves,
// so only someone who opened that inbox can mark the email as confirmed.
export default async function handler(req, res) {
  try {
    if (DEMO) return json(res, 200, { demo: true });
    const { token_hash } = await body(req);
    if (!token_hash) return json(res, 400, { error: 'Missing code.' });
    const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/verify`, { method: 'POST',
      headers: { apikey: process.env.SUPABASE_ANON_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'magiclink', token_hash }) });
    const s = await r.json().catch(() => ({}));
    if (!r.ok || !s.user?.id) return json(res, 400, { error: 'That link has expired or was already used.' });
    await db(`profiles?id=eq.${s.user.id}`, { method: 'PATCH', prefer: 'return=minimal', data: { email_verified: true } });
    json(res, 200, { session: { access_token: s.access_token, refresh_token: s.refresh_token, expires_in: s.expires_in } });
  } catch (err) { console.error(err); json(res, 500, { error: 'Something went wrong. Please try again.' }); }
}
