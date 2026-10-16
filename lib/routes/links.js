import crypto from 'node:crypto';
import { json, body, db, getUser, isActive, DEMO, query, monthKeys } from '../util.js';
import { activity } from '../../public/js/activity.js';
// Personal links: each client gets their own link with their name and neighbourhood. It updates itself every month.
// GET ?days=7|30|365: the agent's links, each with its Client activity (how active, opens, reading time, sections, what they looked at),
// plus totals for the general link. POST: create (optionally for one month), delete, or turn the weekly email on/off.
const TXT = (v, n) => String(v || '').replace(/[<>]/g, '').trim().slice(0, n);

export default async function handler(req, res) {
  try {
    if (DEMO) return json(res, 200, { demo: true });
    const u = await getUser(req);
    if (!u) return json(res, 401, { error: 'Please sign in.' });
    const [p] = await db(`profiles?id=eq.${u.id}&select=id,plan,status,weekly_email`);
    if (req.method === 'GET') {
      // Just the neighbourhood requests (for the red count on the Clients tab).
      if (query(req).get('only') === 'requests') { let requests = []; try { requests = await db(`hood_requests?user_id=eq.${u.id}&status=eq.new&select=id&limit=99`); } catch {} return json(res, 200, { requests }); }
      const days = [7, 30, 365].includes(+query(req).get('days')) ? +query(req).get('days') : 30, now = Date.now();
      const since = new Date(now - Math.max(2 * days, 60) * 864e5).toISOString(), from = now - days * 864e5;
      const [items, views, visits, keys] = await Promise.all([db(`personal_links?user_id=eq.${u.id}&order=created_at.desc&limit=500`),
        db(`hood_views?user_id=eq.${u.id}&created_at=gte.${since}&select=link_id,city,hood,kind,created_at&limit=20000`),
        db(`visits?user_id=eq.${u.id}&started_at=gte.${since}&select=link_id,month,device,seconds,reached_end,parts,acts,started_at,updated_at&order=started_at.desc&limit=20000`),
        monthKeys()]);
      const per = {}, top = {}, by = (list, k) => { const o = {}; for (const x of list) if (x[k]) (o[x[k]] = o[x[k]] || []).push(x); return o; };
      for (const v of views) {
        if (new Date(v.created_at).getTime() < from) continue;
        if (v.kind !== 'pick') top[v.hood] = (top[v.hood] || 0) + 1;
        if (v.link_id) { const o = (per[v.link_id] = per[v.link_id] || {}); o[v.hood] = (o[v.hood] || 0) + 1; }
      }
      const VB = by(visits, 'link_id'), HB = by(views, 'link_id');
      for (const it of items) {
        // What each client looked at, other than their own neighbourhood (kept for older screens).
        it.looked = Object.entries(per[it.id] || {}).filter(([h]) => h !== it.hood).sort((a, b) => b[1] - a[1]).slice(0, 4);
        it.act = activity(it, VB[it.id], HB[it.id], { days, now, latest: keys[0] });
      }
      // Most active first, then by last open.
      const rank = { hot: 0, some: 1, quiet: 2, none: 3 };
      items.sort((a, b) => rank[a.act.level] - rank[b.act.level] || (b.act.visits - a.act.visits) || String(b.act.lastAt || '').localeCompare(String(a.act.lastAt || '')));
      const general = visits.filter((v) => !v.link_id && new Date(v.started_at).getTime() >= from).length;
      // Clients who asked about their neighbourhood (S5 Ask). The table may not exist yet: then there are none.
      let requests = []; try { requests = await db(`hood_requests?user_id=eq.${u.id}&order=created_at.desc&limit=50`); } catch {}
      return json(res, 200, { items, days, general, requests, weekly: p.weekly_email !== false, top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5) });
    }
    if (!isActive(p) || p.plan !== 'pro') return json(res, 402, { error: 'Personal links are part of Pro.' });
    const b = await body(req);
    if (b.action === 'delete') { await db(`personal_links?user_id=eq.${u.id}&id=eq.${encodeURIComponent(b.id || '')}`, { method: 'DELETE', prefer: 'return=minimal' }); return json(res, 200, { ok: true }); }
    // A request from Clients (P10): mark it done.
    if (b.action === 'request') {
      const [r] = await db(`hood_requests?user_id=eq.${u.id}&id=eq.${encodeURIComponent(b.id || '')}`);
      if (!r) return json(res, 404, { error: 'That request is gone.' });
      await db(`hood_requests?id=eq.${r.id}`, { method: 'PATCH', prefer: 'return=minimal', data: { status: 'done' } }); return json(res, 200, { request: { ...r, status: 'done' } });
    }
    if (b.action === 'weekly') { await db(`profiles?id=eq.${u.id}`, { method: 'PATCH', prefer: 'return=minimal', data: { weekly_email: !!b.on } }); return json(res, 200, { ok: true }); }
    const row = { name: TXT(b.name, 60), city: TXT(b.city, 40), hood: TXT(b.hood, 60), type: ['d', 't', 'c'].includes(b.type) ? b.type : 'd', month: /^\d{4}-\d{2}$/.test(b.month || '') ? b.month : null };
    if (!row.name || !row.city || !row.hood) return json(res, 400, { error: 'Add the client name and their neighbourhood.' });
    const n = await db(`personal_links?user_id=eq.${u.id}&select=id&limit=501`);
    if (n.length >= 500) return json(res, 400, { error: 'You can have up to 500 personal links. Remove some first.' });
    const [x] = await db('personal_links', { method: 'POST', data: { id: crypto.randomBytes(6).toString('base64url'), user_id: u.id, ...row } });
    json(res, 200, { item: { ...x, looked: [], act: activity(x, [], [], {}) } });
  } catch (err) { console.error(err); json(res, 500, { error: 'Something went wrong. Please try again.' }); }
}
