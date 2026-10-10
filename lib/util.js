import crypto from 'node:crypto';
import { smtpSend } from './smtp.js';
import seedData from '../data/seed-report.js';
import HISTORY from '../data/history.js';
// Every report carries its price and sales history (for the 12-month charts).
const withHistory = (D) => (D && !D.history ? { ...D, history: HISTORY } : D);
const seed = withHistory(seedData);

const e = process.env;
export const DEMO = !e.SUPABASE_URL;
export const SITE_NAME = e.SITE_NAME || 'The Market Update';
export const SEED = seed;
export const PLANS = {
  basic: { name: 'Essentials', monthly: 19, yearly: 190 },
  pro: { name: 'Pro', monthly: 29, yearly: 290 },
};
export const PRICE_IDS = () => ({
  [e.STRIPE_PRICE_BASIC_MONTHLY]: 'basic', [e.STRIPE_PRICE_BASIC_YEARLY]: 'basic',
  [e.STRIPE_PRICE_PRO_MONTHLY]: 'pro', [e.STRIPE_PRICE_PRO_YEARLY]: 'pro',
});
export const DEMO_AGENT = { name: 'Alex Morgan', tagline: 'Vancouver Real Estate', brokerage: 'Your Brokerage Name',
  phone: '604-555-0100', contact_email: 'alex@example.com', website: '', logo: '', photo: '', slug: 'demo' };

export const json = (res, code, obj) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); };
export const query = (req) => new URL(req.url, 'http://x').searchParams;
export const origin = (req) => (e.SITE_URL || '').replace(/\/+$/, '') || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
export async function raw(req) { const c = []; for await (const x of req) c.push(x); return Buffer.concat(c); }
export async function body(req) { try { return JSON.parse((await raw(req)).toString() || '{}'); } catch { return {}; } }

// Supabase database (service key, server only)
export async function db(path, { method = 'GET', data, prefer } = {}) {
  const r = await fetch(`${e.SUPABASE_URL}/rest/v1/${path}`, {
    method, body: data ? JSON.stringify(data) : undefined,
    headers: { apikey: e.SUPABASE_SERVICE_KEY, authorization: `Bearer ${e.SUPABASE_SERVICE_KEY}`,
      'content-type': 'application/json', prefer: prefer || 'return=representation' },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`db ${r.status}: ${t}`);
  return t ? JSON.parse(t) : null;
}
export async function getUser(req) {
  const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!tok) return null;
  const r = await fetch(`${e.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: e.SUPABASE_ANON_KEY, authorization: `Bearer ${tok}` } });
  return r.ok ? r.json() : null;
}
export const isActive = (p) => !!p && ['active', 'trialing'].includes(p.status);
export async function latestReport() {
  if (DEMO) return seed;
  const rows = await db('reports?select=data&order=key.desc&limit=1');
  return withHistory(rows[0]?.data || null);
}
// Essentials plan: Greater Vancouver only
export function forPlan(D, plan) {
  if (!D || plan === 'pro') return D;
  const H = D.history, only = (o, keep) => Object.fromEntries(Object.entries(o || {}).map(([t, a]) => [t, { [keep]: a[keep] }]));
  return { ...D, cities: { 'Greater Vancouver': D.cities['Greater Vancouver'] }, areas: {}, history: H && { ...H, price: only(H.price, 'Greater Vancouver'), sales: only(H.sales, 'Grand Totals'), listings: {} } };
}
// Essentials has one fixed white and blue look; Pro uses the agent's own theme.
export const BASIC_THEME = { style: 'basic', ac: '#1d4f9c', ac2: '#a9c8f5', bg: '#ffffff', font: 'modern' };
const HEX = /^#[0-9a-f]{6}$/i, SHOW_KEYS = ['prices', 'changes', 'sold', 'forsale', 'days', 'market', 'detached', 'townhome', 'condo', 'summary', 'meaning', 'trend', 'compare', 'picker'];
export const cleanTheme = (t) => (t && typeof t === 'object' ? { style: /^[a-z]{3,20}$/.test(t.style || '') ? t.style : 'highlights', ac: HEX.test(t.ac) ? t.ac : '#14523d', ...(HEX.test(t.ac2) ? { ac2: t.ac2 } : {}), bg: HEX.test(t.bg) ? t.bg : '#ffffff',
  font: /^[a-z]{3,20}$/.test(t.font || '') ? t.font : 'modern', contact: t.contact === 'side' ? 'side' : 'bottom' } : null);
export const cleanShow = (s) => (s && typeof s === 'object' ? Object.fromEntries(SHOW_KEYS.map((k) => [k, s[k] !== false])) : null);
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthKey = (m) => { const x = /^(\w+) (\d{4})$/.exec(m || ''); return x && MONTHS.includes(x[1]) ? `${x[2]}-${String(MONTHS.indexOf(x[1]) + 1).padStart(2, '0')}` : null; };
export async function reportFor(key) {
  if (DEMO || !key) return latestReport();
  const rows = await db(`reports?key=eq.${encodeURIComponent(key)}&select=data&limit=1`);
  return rows[0]?.data ? withHistory(rows[0].data) : latestReport();
}
export const publicAgent = (p) => ({ name: p.name, tagline: p.tagline, brokerage: p.brokerage, phone: p.phone, role: p.role || 'realtor',
  contact_email: p.contact_email, website: p.website, logo: p.logo, photo: p.photo, slug: p.slug,
  theme: p.plan === 'pro' && p.theme ? p.theme : BASIC_THEME, show: p.plan === 'pro' ? p.show || null : null });

// Stripe REST
export async function stripe(path, params, method = params ? 'POST' : 'GET') {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method, headers: { authorization: `Bearer ${e.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Stripe error');
  return j;
}
export function verifyStripe(rawBody, header, secret) {
  const parts = Object.fromEntries((header || '').split(',').map((s) => s.split('=')));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) return false;
  const sig = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(parts.v1)); } catch { return false; }
}
// Email goes out through Google Workspace (see lib/smtp.js). Returns true if accepted.
export async function sendEmail(msg) { return (await smtpSend([msg])) === 1; }
export { smtpSend };
export const slugify = (s) => (s || 'agent').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'agent';
