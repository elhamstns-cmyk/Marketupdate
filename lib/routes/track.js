import { json, body, db, isActive, DEMO } from '../util.js';
import { SEC_IDS } from '../../public/js/layout.js';
// Public: what a client does in the report, sent quietly from the report page.
// kind pick/peek/compare: what they looked at in Neighbourhoods (hood_views).
// kind visit: one page open with its running totals: reading time, time per section, read to the end, taps (visits, for Client activity).
// With a personal link the agent sees it per client; with the general link it only counts toward totals. Kept only for active Pro agents.
const KINDS = ['pick', 'peek', 'compare'];
const VID = /^[A-Za-z0-9_-]{8,24}$/, ACT = /^(contact|email|text|copy|type:[dtc]|month:\d{4}-\d{2}|area:[A-Za-z .'-]{2,40})$/;
// A visit as it is stored: numbers capped, only known sections and taps.
export function cleanVisit(b) {
  const parts = {}; let n = 0;
  if (b.parts && typeof b.parts === 'object') for (const [k, v] of Object.entries(b.parts)) if (SEC_IDS.includes(k) && Number.isFinite(v) && v > 0) { parts[k] = Math.min(Math.round(v), 7200); n++; }
  const acts = Array.isArray(b.acts) ? b.acts.filter((a) => typeof a === 'string' && ACT.test(a)).slice(0, 40) : [];
  return { seconds: Math.max(0, Math.min(Math.round(Number(b.sec) || 0), 7200)), reached_end: b.end === true, device: b.dev === 'phone' ? 'phone' : 'computer',
    month: /^\d{4}-\d{2}$/.test(b.m || '') ? b.m : null, parts, acts };
}
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
    const b = await body(req);
    const visit = b.kind === 'visit' && typeof b.id === 'string' && VID.test(b.id);
    if (DEMO || typeof b.slug !== 'string' || (!visit && (!KINDS.includes(b.kind) || typeof b.hood !== 'string' || b.hood.length > 60))) return json(res, 200, { ok: true });
    const [p] = await db(`profiles?slug=eq.${encodeURIComponent(b.slug)}&select=id,plan,status&limit=1`);
    if (!p || !isActive(p) || p.plan !== 'pro') return json(res, 200, { ok: true });
    let link = null;
    if (typeof b.p === 'string' && b.p) { const [l] = await db(`personal_links?id=eq.${encodeURIComponent(b.p)}&user_id=eq.${p.id}&select=id&limit=1`); link = l?.id || null; }
    if (visit) await db('visits?on_conflict=id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', data: { id: b.id, user_id: p.id, link_id: link, ...cleanVisit(b), updated_at: new Date().toISOString() } });
    else await db('hood_views', { method: 'POST', prefer: 'return=minimal', data: { user_id: p.id, link_id: link, city: String(b.city || '').slice(0, 40), hood: b.hood, kind: b.kind } });
    json(res, 200, { ok: true });
  } catch (err) { console.error(err); json(res, 200, { ok: true }); }
}
