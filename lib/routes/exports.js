import crypto from 'node:crypto';
import { json, body, query, db, getUser, isActive, cleanTheme, cleanShow, monthKey, DEMO } from '../util.js';
// The agent's history: every link, email, PDF and image they create.
const KINDS = ['link', 'email', 'pdf', 'post', 'story', 'caption'];
// Postgres reorders JSON keys, so compare with keys sorted.
const canon = (v) => (v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${k}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v ?? null));
const same = (a, b) => canon(a || {}) === canon(b || {});

export default async function handler(req, res) {
  try {
    if (DEMO) return json(res, 200, { demo: true });
    const u = await getUser(req);
    if (!u) return json(res, 401, { error: 'Please sign in.' });
    const [p] = await db(`profiles?id=eq.${u.id}&select=id,plan,status`);
    if (req.method === 'GET') return json(res, 200, { items: await db(`exports?user_id=eq.${u.id}&order=created_at.desc&limit=300`) });
    if (req.method === 'DELETE') { await db(`exports?user_id=eq.${u.id}&id=eq.${encodeURIComponent(query(req).get('id') || '')}`, { method: 'DELETE', prefer: 'return=minimal' }); return json(res, 200, { ok: true }); }
    if (!isActive(p)) return json(res, 402, { error: 'Your subscription is not active.' });
    const b = await body(req), pro = p.plan === 'pro';
    if (!KINDS.includes(b.kind) || (!pro && !['link', 'email'].includes(b.kind))) return json(res, 400, { error: 'That format is part of Pro.' });
    const key = monthKey(b.month); if (!key) return json(res, 400, { error: 'Missing report month.' });
    const row = { kind: b.kind, area: pro ? String(b.area || 'Greater Vancouver').split('|').map((a) => a.trim().slice(0, 60)).filter(Boolean).slice(0, 4).join('|') || 'Greater Vancouver' : 'Greater Vancouver', month_key: key, month: b.month,
      settings: pro ? { theme: cleanTheme(b.settings?.theme), show: cleanShow(b.settings?.show) } : {} };
    // Making the same thing again reuses it (same link), and moves it to the top of the list.
    const prev = (await db(`exports?user_id=eq.${u.id}&kind=eq.${row.kind}&area=eq.${encodeURIComponent(row.area)}&month_key=eq.${key}`)).find((x) => same(x.settings, row.settings));
    if (prev) { const [x] = await db(`exports?id=eq.${prev.id}`, { method: 'PATCH', data: { created_at: new Date().toISOString() } }); return json(res, 200, { item: x }); }
    const [x] = await db('exports', { method: 'POST', data: { id: crypto.randomBytes(6).toString('base64url'), user_id: u.id, ...row } });
    json(res, 200, { item: x });
  } catch (err) { console.error(err); json(res, 500, { error: 'Something went wrong. Please try again.' }); }
}
