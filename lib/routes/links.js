import crypto from 'node:crypto';
import { json, body, db, getUser, isActive, DEMO } from '../util.js';
// Personal links: each client gets their own link with their name and neighbourhood. It updates itself every month.
// GET: the agent's links with what each client looked at (last 30 days). POST: create, delete, or turn the weekly email on/off.
const TXT = (v, n) => String(v || '').replace(/[<>]/g, '').trim().slice(0, n);

export default async function handler(req, res) {
  try {
    if (DEMO) return json(res, 200, { demo: true });
    const u = await getUser(req);
    if (!u) return json(res, 401, { error: 'Please sign in.' });
    const [p] = await db(`profiles?id=eq.${u.id}&select=id,plan,status,weekly_email`);
    if (req.method === 'GET') {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const [items, views] = await Promise.all([db(`personal_links?user_id=eq.${u.id}&order=created_at.desc&limit=500`),
        db(`hood_views?user_id=eq.${u.id}&created_at=gte.${since}&select=link_id,city,hood,kind&limit=5000`)]);
      const per = {}, top = {};
      for (const v of views) {
        if (v.kind !== 'pick') top[v.hood] = (top[v.hood] || 0) + 1;
        if (v.link_id) { const o = (per[v.link_id] = per[v.link_id] || {}); o[v.hood] = (o[v.hood] || 0) + 1; }
      }
      // What each client looked at, other than their own neighbourhood.
      for (const it of items) it.looked = Object.entries(per[it.id] || {}).filter(([h]) => h !== it.hood).sort((a, b) => b[1] - a[1]).slice(0, 4);
      return json(res, 200, { items, weekly: p.weekly_email !== false, top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5) });
    }
    if (!isActive(p) || p.plan !== 'pro') return json(res, 402, { error: 'Personal links are part of Pro.' });
    const b = await body(req);
    if (b.action === 'delete') { await db(`personal_links?user_id=eq.${u.id}&id=eq.${encodeURIComponent(b.id || '')}`, { method: 'DELETE', prefer: 'return=minimal' }); return json(res, 200, { ok: true }); }
    if (b.action === 'weekly') { await db(`profiles?id=eq.${u.id}`, { method: 'PATCH', prefer: 'return=minimal', data: { weekly_email: !!b.on } }); return json(res, 200, { ok: true }); }
    const row = { name: TXT(b.name, 60), city: TXT(b.city, 40), hood: TXT(b.hood, 60), type: ['d', 't', 'c'].includes(b.type) ? b.type : 'd' };
    if (!row.name || !row.city || !row.hood) return json(res, 400, { error: 'Add the client name and their neighbourhood.' });
    const n = await db(`personal_links?user_id=eq.${u.id}&select=id&limit=501`);
    if (n.length >= 500) return json(res, 400, { error: 'You can have up to 500 personal links. Remove some first.' });
    const [x] = await db('personal_links', { method: 'POST', data: { id: crypto.randomBytes(6).toString('base64url'), user_id: u.id, ...row } });
    json(res, 200, { item: { ...x, looked: [] } });
  } catch (err) { console.error(err); json(res, 500, { error: 'Something went wrong. Please try again.' }); }
}
