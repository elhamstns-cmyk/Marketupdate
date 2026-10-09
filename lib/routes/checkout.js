import { json, body, db, getUser, stripe, origin } from '../util.js';
export default async function handler(req, res) {
  try {
    const u = await getUser(req);
    if (!u) return json(res, 401, { error: 'Please sign in.' });
    const { plan, cycle } = await body(req);
    const price = process.env[`STRIPE_PRICE_${plan === 'basic' ? 'BASIC' : 'PRO'}_${cycle === 'yearly' ? 'YEARLY' : 'MONTHLY'}`];
    if (!price) return json(res, 400, { error: 'That plan is not set up yet.' });
    const [p] = await db(`profiles?id=eq.${u.id}`);
    const params = { mode: 'subscription', 'line_items[0][price]': price, 'line_items[0][quantity]': '1',
      client_reference_id: u.id, success_url: `${origin(req)}/app?welcome=1`, cancel_url: `${origin(req)}/app`,
      allow_promotion_codes: 'true', 'automatic_tax[enabled]': process.env.STRIPE_TAX === '1' ? 'true' : 'false' };
    if (p?.stripe_customer_id) params.customer = p.stripe_customer_id; else params.customer_email = u.email;
    const s = await stripe('checkout/sessions', params);
    json(res, 200, { url: s.url });
  } catch (err) { console.error(err); json(res, 500, { error: err.message }); }
}
