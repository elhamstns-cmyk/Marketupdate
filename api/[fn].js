// One server function for every /api/... address (Vercel Hobby allows only 12 functions).
// Each address is handled by its file in lib/routes, e.g. /api/me -> lib/routes/me.js.
import r_admin_agents from '../lib/routes/admin-agents.js';
import r_admin_publish from '../lib/routes/admin-publish.js';
import r_checkout from '../lib/routes/checkout.js';
import r_config from '../lib/routes/config.js';
import r_confirm from '../lib/routes/confirm.js';
import r_exports from '../lib/routes/exports.js';
import r_instagram from '../lib/routes/instagram.js';
import r_leads from '../lib/routes/leads.js';
import r_me from '../lib/routes/me.js';
import r_portal from '../lib/routes/portal.js';
import r_report from '../lib/routes/report.js';
import r_stripe_webhook from '../lib/routes/stripe-webhook.js';
import r_subscribe from '../lib/routes/subscribe.js';
const ROUTES = { 'admin-agents': r_admin_agents, 'admin-publish': r_admin_publish, 'checkout': r_checkout, 'config': r_config, 'confirm': r_confirm, 'exports': r_exports, 'instagram': r_instagram, 'leads': r_leads, 'me': r_me, 'portal': r_portal, 'report': r_report, 'stripe-webhook': r_stripe_webhook, 'subscribe': r_subscribe };
export default function handler(req, res) {
  const name = new URL(req.url, 'http://x').pathname.replace(/^\/api\//, '').replace(/\/$/, '');
  const fn = ROUTES[name];
  if (!fn) { res.statusCode = 404; res.setHeader('content-type', 'application/json'); return res.end('{"error":"Not found"}'); }
  return fn(req, res);
}
