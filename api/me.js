import { json, body, db, getUser, isActive, latestReport, forPlan, slugify, DEMO, SEED } from '../lib/util.js';
const FIELDS = ['name', 'tagline', 'brokerage', 'phone', 'contact_email', 'website', 'licence', 'gvr_member', 'logo', 'photo'];

export default async function handler(req, res) {
  try {
    if (DEMO) return json(res, 200, { demo: true, report: SEED });
    const u = await getUser(req);
    if (!u) return json(res, 401, { error: 'Please sign in.' });
    let [p] = await db(`profiles?id=eq.${u.id}`);
    if (!p) [p] = await db('profiles', { method: 'POST', data: { id: u.id, email: u.email, contact_email: u.email } });

    if (req.method === 'POST') {
      const b = await body(req), patch = {};
      for (const f of FIELDS) if (f in b) patch[f] = typeof b[f] === 'string' ? b[f].slice(0, f === 'logo' || f === 'photo' ? 400000 : 200) : b[f];
      if (!p.slug && patch.name) {
        let s = slugify(patch.name);
        const taken = await db(`profiles?slug=eq.${s}&select=id`);
        if (taken.length) s += '-' + Math.random().toString(36).slice(2, 5);
        patch.slug = s;
      }
      [p] = await db(`profiles?id=eq.${u.id}`, { method: 'PATCH', data: patch });
    }
    const active = isActive(p);
    json(res, 200, { profile: p, active, report: active ? forPlan(await latestReport(), p.plan) : null });
  } catch (err) { console.error(err); json(res, 500, { error: 'Something went wrong. Please try again.' }); }
}
