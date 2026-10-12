import { json, body, db, isActive, DEMO } from '../util.js';
// Public: what a client looked at in the Neighbourhoods section (sent quietly from the report page).
// With a personal link the agent sees it per client; with the general link it only counts toward totals.
const KINDS = ['pick', 'peek', 'compare'];
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
    const b = await body(req);
    if (DEMO || !KINDS.includes(b.kind) || typeof b.slug !== 'string' || typeof b.hood !== 'string' || b.hood.length > 60) return json(res, 200, { ok: true });
    const [p] = await db(`profiles?slug=eq.${encodeURIComponent(b.slug)}&select=id,plan,status&limit=1`);
    if (!p || !isActive(p) || p.plan !== 'pro') return json(res, 200, { ok: true });
    let link = null;
    if (typeof b.p === 'string' && b.p) { const [l] = await db(`personal_links?id=eq.${encodeURIComponent(b.p)}&user_id=eq.${p.id}&select=id&limit=1`); link = l?.id || null; }
    await db('hood_views', { method: 'POST', prefer: 'return=minimal', data: { user_id: p.id, link_id: link, city: String(b.city || '').slice(0, 40), hood: b.hood, kind: b.kind } });
    json(res, 200, { ok: true });
  } catch (err) { console.error(err); json(res, 200, { ok: true }); }
}
