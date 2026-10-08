import { json, raw, db, stripe, verifyStripe, PRICE_IDS } from '../lib/util.js';
// Stripe tells us when someone subscribes, renews, changes plan or cancels.
async function apply(sub, where, name) {
  const item = sub.items?.data?.[0];
  const end = item?.current_period_end || sub.current_period_end;
  await db(`profiles?${where}`, { method: 'PATCH', data: {
    status: sub.status, plan: PRICE_IDS()[item?.price?.id] || 'basic',
    stripe_customer_id: sub.customer, period_end: end ? new Date(end * 1000).toISOString() : null } });
  // Use the name given at checkout if the profile has none yet, so the dashboard starts filled in.
  if (name) await db(`profiles?${where}&name=is.null`, { method: 'PATCH', data: { name: String(name).slice(0, 200) } });
}
export default async function handler(req, res) {
  const buf = (await raw(req)).toString('utf8');
  if (!verifyStripe(buf, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) return json(res, 400, { error: 'bad signature' });
  try {
    const ev = JSON.parse(buf), o = ev.data.object;
    if (ev.type === 'checkout.session.completed' && o.subscription && o.client_reference_id)
      await apply(await stripe(`subscriptions/${o.subscription}`), `id=eq.${o.client_reference_id}`, o.customer_details?.name);
    else if (ev.type.startsWith('customer.subscription.'))
      await apply(o, `stripe_customer_id=eq.${o.customer}`);
    json(res, 200, { received: true });
  } catch (err) { console.error(err); json(res, 500, { error: 'failed' }); }
}
