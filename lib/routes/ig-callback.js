// Meta calls these when someone removes our app in Instagram, or asks for their data to be deleted.
//   /api/ig-callback?type=deauth   (Deauthorize callback URL)
//   /api/ig-callback?type=delete   (Data deletion request URL)
// Meta sends a form field "signed_request", signed with the Instagram app secret.
import crypto from 'node:crypto';
import { json, raw, query, db, origin, DEMO } from '../util.js';

const b64 = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
export function readSigned(sr, secret) {
  const [sig, payload] = String(sr || '').split('.');
  if (!sig || !payload || !secret) return null;
  const want = crypto.createHmac('sha256', secret).update(payload).digest();
  const got = b64(sig);
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  try { return JSON.parse(b64(payload).toString('utf8')); } catch { return null; }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
    const form = new URLSearchParams((await raw(req)).toString());
    const data = readSigned(form.get('signed_request'), process.env.IG_APP_SECRET);
    if (!data?.user_id) return json(res, 400, { error: 'Invalid request' });
    const id = encodeURIComponent(String(data.user_id));
    if (!DEMO) await db(`instagram?ig_user_id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
    if (query(req).get('type') === 'delete') {
      const code = 'del-' + crypto.randomBytes(6).toString('hex');
      return json(res, 200, { url: `${origin(req)}/privacy#instagram`, confirmation_code: code });
    }
    json(res, 200, { ok: true });
  } catch (err) { console.error(err); json(res, 500, { error: 'Something went wrong.' }); }
}
