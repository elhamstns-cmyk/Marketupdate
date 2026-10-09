import { json, db, getUser, stripe, origin } from '../util.js';
export default async function handler(req, res) {
  try {
    const u = await getUser(req);
    if (!u) return json(res, 401, { error: 'Please sign in.' });
    const [p] = await db(`profiles?id=eq.${u.id}`);
    if (!p?.stripe_customer_id) return json(res, 400, { error: 'No subscription yet.' });
    const s = await stripe('billing_portal/sessions', { customer: p.stripe_customer_id, return_url: `${origin(req)}/app` });
    json(res, 200, { url: s.url });
  } catch (err) { console.error(err); json(res, 500, { error: err.message }); }
}
