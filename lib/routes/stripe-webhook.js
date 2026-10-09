import { json, raw, db, stripe, verifyStripe, PRICE_IDS, sendEmail, origin, PLANS } from '../util.js';
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
// A short welcome email once someone subscribes.
async function welcome(id, plan, site) {
  const [p] = await db(`profiles?id=eq.${id}&select=email,name`); if (!p?.email) return;
  const hi = p.name ? `Hi ${p.name.trim().split(/\s+/)[0]},` : 'Hi,', name = PLANS[plan]?.name || 'your plan', link = `${site}/app`;
  const text = `${hi}\n\nWelcome to The Market Update. You're on ${name}.\n\nYour branded report is ready to share: ${link}\n\nEvery month, as soon as the new Greater Vancouver numbers are out, we'll email you that your new report is ready.\n\nQuestions? Just reply to this email.\n\nThe Market Update`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#10231c;max-width:520px"><p style="font-size:18px;font-weight:bold">The Market Update</p><p>${hi}</p><p>Welcome aboard. You're on <strong>${name}</strong>, and your branded report is ready to share.</p><p><a href="${link}" style="display:inline-block;background:#0f6b4f;color:#ffffff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Open my report</a></p><p>Every month, as soon as the new Greater Vancouver numbers are out, we'll email you that your new report is ready.</p><p style="color:#577067;font-size:14px">Questions? Just reply to this email.</p></div>`;
  await sendEmail({ to: p.email, subject: 'Welcome to The Market Update', text, html });
}
export default async function handler(req, res) {
  const buf = (await raw(req)).toString('utf8');
  if (!verifyStripe(buf, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) return json(res, 400, { error: 'bad signature' });
  try {
    const ev = JSON.parse(buf), o = ev.data.object;
    if (ev.type === 'checkout.session.completed' && o.subscription && o.client_reference_id) {
      const sub = await stripe(`subscriptions/${o.subscription}`);
      await apply(sub, `id=eq.${o.client_reference_id}`, o.customer_details?.name);
      await welcome(o.client_reference_id, PRICE_IDS()[sub.items?.data?.[0]?.price?.id], origin(req)).catch((e) => console.error('welcome email', e.message));
    }
    else if (ev.type.startsWith('customer.subscription.'))
      await apply(o, `stripe_customer_id=eq.${o.customer}`);
    json(res, 200, { received: true });
  } catch (err) { console.error(err); json(res, 500, { error: 'failed' }); }
}
