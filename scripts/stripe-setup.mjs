// Creates the four subscription prices in Stripe and prints the lines to paste into your settings.
// Run: STRIPE_SECRET_KEY=sk_... node scripts/stripe-setup.mjs
import { stripe, PLANS } from '../lib/util.js';
for (const [id, p] of Object.entries(PLANS)) {
  const prod = await stripe('products', { name: `Market Update ${p.name}` });
  for (const [cycle, interval] of [['monthly', 'month'], ['yearly', 'year']]) {
    const price = await stripe('prices', { product: prod.id, currency: 'cad', unit_amount: String(p[cycle] * 100), 'recurring[interval]': interval });
    console.log(`STRIPE_PRICE_${id.toUpperCase()}_${cycle.toUpperCase()}=${price.id}`);
  }
}
