// Instagram connection (Pro): connect, settings, post now, and the monthly auto-post.
// Uses "Instagram API with Instagram Login" (works with a free Business or Creator account; no Facebook Page needed).
// Settings (Vercel environment variables): IG_APP_ID, IG_APP_SECRET. Optional: SITE_URL.
import crypto from 'node:crypto';
import { json, body, query, db, getUser, isActive, origin, latestReport, publicAgent, DEMO } from '../util.js';

const e = process.env, GRAPH = 'https://graph.instagram.com/v21.0';
const redirect = (req) => `${origin(req)}/api/instagram`;
const sign = (s) => crypto.createHmac('sha256', e.IG_APP_SECRET || 'x').update(s).digest('base64url');
const state = (uid) => { const s = `${uid}.${Date.now()}`; return `${s}.${sign(s)}`; };
const unstate = (st) => { const [uid, t, sig] = String(st || '').split('.'); if (!uid || sig !== sign(`${uid}.${t}`) || Date.now() - +t > 15 * 60e3) return null; return uid; };
const ig = async (url, opts) => { const r = await fetch(url, opts), j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error('Instagram said: ' + (j.error?.message || j.error_message || r.status)); return j; };
const form = (o) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o) });
const view = (c) => (c ? { connected: true, username: c.username, auto: !!c.auto, story: !!c.story, area: c.area || 'Greater Vancouver', last_month: c.last_month || null } : { connected: false });

// Saves the JPEG somewhere Instagram can fetch it (a public Supabase Storage bucket called "social").
async function upload(dataUrl, path) {
  const m = /^data:image\/jpeg;base64,(.+)$/.exec(dataUrl || ''); if (!m) throw new Error('The image is missing.');
  const buf = Buffer.from(m[1], 'base64'); if (buf.length > 3e6) throw new Error('The image is too large.');
  const r = await fetch(`${e.SUPABASE_URL}/storage/v1/object/social/${path}`, { method: 'POST', body: buf,
    headers: { apikey: e.SUPABASE_SERVICE_KEY, authorization: `Bearer ${e.SUPABASE_SERVICE_KEY}`, 'content-type': 'image/jpeg', 'x-upsert': 'true' } });
  if (!r.ok) throw new Error('Could not store the image: ' + (await r.text()));
  return `${e.SUPABASE_URL}/storage/v1/object/public/social/${path}`;
}
// Publishes one image as a post or a story. Returns the Instagram media id.
async function publish(c, kind, imageUrl, caption) {
  const params = { image_url: imageUrl, access_token: c.token, ...(kind === 'story' ? { media_type: 'STORIES' } : { caption: String(caption || '').slice(0, 2200) }) };
  const box = await ig(`${GRAPH}/${c.ig_user_id}/media`, form(params));
  for (let i = 0; i < 10; i++) { const s = await ig(`${GRAPH}/${box.id}?fields=status_code&access_token=${encodeURIComponent(c.token)}`); if (s.status_code === 'FINISHED') break; if (s.status_code === 'ERROR') throw new Error('Instagram could not read the image.'); await new Promise((r) => setTimeout(r, 1500)); }
  return (await ig(`${GRAPH}/${c.ig_user_id}/media_publish`, form({ creation_id: box.id, access_token: c.token }))).id;
}
// Long-lived tokens last 60 days; refreshing each time keeps them alive.
async function fresh(c) {
  if (Date.now() - new Date(c.refreshed_at || 0) < 7 * 864e5) return c;
  try { const j = await ig(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(c.token)}`);
    const patch = { token: j.access_token, refreshed_at: new Date().toISOString() }; await db(`instagram?user_id=eq.${c.user_id}`, { method: 'PATCH', data: patch }); return { ...c, ...patch }; } catch { return c; }
}
async function postBoth(c, b, month) {
  c = await fresh(c); const out = [], stamp = Date.now().toString(36);
  for (const kind of ['post', 'story']) { const img = b[kind]; if (!img) continue;
    const url = await upload(img, `${c.user_id}/${month.replace(' ', '-')}-${kind}-${stamp}.jpg`); out.push([kind, await publish(c, kind, url, b.caption)]); }
  await db(`instagram?user_id=eq.${c.user_id}`, { method: 'PATCH', data: { last_month: month, last_posted_at: new Date().toISOString() } });
  return out;
}

export default async function handler(req, res) {
  try {
    // Instagram sends the agent back here after they approve.
    if (req.method === 'GET') {
      const q = query(req), uid = unstate(q.get('state')), back = (s) => { res.statusCode = 302; res.setHeader('location', `/app?view=account&ig=${s}`); res.end(); };
      if (!uid || !q.get('code')) return back(q.get('error') ? 'cancelled' : 'failed');
      try {
        const t = await ig('https://api.instagram.com/oauth/access_token', form({ client_id: e.IG_APP_ID, client_secret: e.IG_APP_SECRET, grant_type: 'authorization_code', redirect_uri: redirect(req), code: q.get('code').replace(/#_$/, '') }));
        const L = await ig(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(e.IG_APP_SECRET)}&access_token=${encodeURIComponent(t.access_token)}`);
        const me = await ig(`${GRAPH}/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(L.access_token)}`);
        await db('instagram?on_conflict=user_id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', data: { user_id: uid, ig_user_id: String(me.user_id || t.user_id), username: me.username,
          token: L.access_token, expires_at: new Date(Date.now() + (L.expires_in || 5184000) * 1000).toISOString(), refreshed_at: new Date().toISOString() } });
        return back('connected');
      } catch (err) { console.error(err); return back('failed'); }
    }

    const b = await body(req);
    // The monthly auto-post, run from the admin page after a new report is published.
    if (b.action === 'autolist' || b.action === 'autopost') {
      if (!e.ADMIN_TOKEN || req.headers.authorization !== `Bearer ${e.ADMIN_TOKEN}`) return json(res, 401, { error: 'Wrong admin password.' });
      const D = await latestReport();
      if (b.action === 'autolist') {
        const rows = await db('instagram?auto=eq.true&select=user_id,area,story,last_month');
        const ids = rows.map((r) => r.user_id); const ps = ids.length ? await db(`profiles?id=in.(${ids.join(',')})`) : [];
        const list = rows.map((r) => ({ ...r, p: ps.find((p) => p.id === r.user_id) })).filter((r) => r.p && isActive(r.p) && r.p.plan === 'pro' && r.p.licence_status !== 'rejected' && r.last_month !== D.month)
          .map((r) => ({ id: r.user_id, area: r.area || 'Greater Vancouver', story: r.story, agent: publicAgent(r.p) }));
        return json(res, 200, { report: D, agents: list });
      }
      const [c] = await db(`instagram?user_id=eq.${encodeURIComponent(b.id)}`); if (!c?.auto) return json(res, 400, { error: 'Auto-post is off for this agent.' });
      if (c.last_month === D.month) return json(res, 200, { ok: true, skipped: true });
      return json(res, 200, { ok: true, posted: await postBoth(c, b, D.month) });
    }

    // Everything else is the signed-in agent.
    if (DEMO) return json(res, 200, { demo: true, configured: false, connected: false });
    const u = await getUser(req); if (!u) return json(res, 401, { error: 'Please sign in.' });
    const [p] = await db(`profiles?id=eq.${u.id}`); if (!isActive(p) || p.plan !== 'pro') return json(res, 403, { error: 'Instagram posting is part of Pro.' });
    let [c] = await db(`instagram?user_id=eq.${u.id}`);
    const configured = !!(e.IG_APP_ID && e.IG_APP_SECRET);
    if (b.action === 'start') {
      if (!configured) return json(res, 400, { error: 'Instagram connection is not switched on yet.' });
      return json(res, 200, { url: `https://www.instagram.com/oauth/authorize?${new URLSearchParams({ client_id: e.IG_APP_ID, redirect_uri: redirect(req), response_type: 'code', scope: 'instagram_business_basic,instagram_business_content_publish', state: state(u.id) })}` });
    }
    if (b.action === 'settings' && c) {
      const patch = {}; if ('auto' in b) patch.auto = !!b.auto; if ('story' in b) patch.story = !!b.story; if (typeof b.area === 'string') patch.area = b.area.slice(0, 60);
      [c] = await db(`instagram?user_id=eq.${u.id}`, { method: 'PATCH', data: patch });
    }
    if (b.action === 'disconnect' && c) { await db(`instagram?user_id=eq.${u.id}`, { method: 'DELETE', prefer: 'return=minimal' }); c = null; }
    if (b.action === 'post') { if (!c) return json(res, 400, { error: 'Connect Instagram first.' }); const D = await latestReport(); await postBoth(c, b, D.month); [c] = await db(`instagram?user_id=eq.${u.id}`); }
    json(res, 200, { configured, ...view(c) });
  } catch (err) { console.error(err); json(res, 500, { error: err.message.startsWith('Instagram') || err.message.startsWith('Could not') || err.message.startsWith('The image') ? err.message : 'Something went wrong. Please try again.' }); }
}
