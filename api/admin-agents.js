import { json, body, db, DEMO } from '../lib/util.js';
// Admin: list subscribers' licence numbers and mark them verified (or not) after checking the BCFSA public register.
export default async function handler(req, res) {
  try {
    if (!process.env.ADMIN_TOKEN || req.headers.authorization !== `Bearer ${process.env.ADMIN_TOKEN}`) return json(res, 401, { error: 'Wrong admin password.' });
    if (DEMO) return json(res, 200, { agents: [] });
    if (req.method === 'POST') {
      const { id, status } = await body(req);
      if (!['verified', 'rejected', 'pending'].includes(status)) return json(res, 400, { error: 'Bad status.' });
      await db(`profiles?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', prefer: 'return=minimal', data: { licence_status: status } });
      return json(res, 200, { ok: true });
    }
    const agents = await db('profiles?select=id,name,email,role,brokerage,licence,licence_status,gvr_member,status,plan,created_at&name=not.is.null&order=created_at.desc&limit=500');
    json(res, 200, { agents });
  } catch (err) { console.error(err); json(res, 500, { error: err.message }); }
}
