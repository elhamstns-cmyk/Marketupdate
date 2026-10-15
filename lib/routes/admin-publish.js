import { json, body, db, smtpSend, origin, SITE_NAME, DEMO, emailLogo } from '../util.js';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TYPES = ['detached', 'condo', 'townhome'];

export function validate(D) {
  const errs = [];
  const m = /^(\w+) (\d{4})$/.exec(D?.month || '');
  if (!m || !MONTHS.includes(m[1])) errs.push('month must look like "October 2026"');
  if (!D?.asof) errs.push('asof date is missing');
  const gv = D?.cities?.['Greater Vancouver'];
  if (!gv) errs.push('cities must include "Greater Vancouver"');
  for (const [c, v] of Object.entries(D?.cities || {})) for (const t of TYPES) {
    for (const k of ['active', 'sales', 'dom', 'price']) if (typeof v?.[t]?.[k]?.now !== 'number') errs.push(`${c} ${t} ${k} is missing`);
  }
  if (Object.keys(D?.areas || {}).length < 15) errs.push('areas table looks incomplete');
  // Optional parts: when they are there, they must have the right shape (see ARCHITECTURE.md §4.1).
  if (D?.growth) for (const [t, o] of Object.entries(D.growth)) for (const [a, v] of Object.entries(o || {}))
    if (!Array.isArray(v) || v.length !== 3) { errs.push(`growth ${t} ${a} must be [3y, 5y, 10y]`); break; }
  if (D?.hoods) { let n = 0;
    for (const [c, hs] of Object.entries(D.hoods)) for (const [h, row] of Object.entries(hs || {})) for (const [t, v] of Object.entries(row || {})) {
      if (!['d', 't', 'c'].includes(t) || !Array.isArray(v) || v.length !== 9 || !(v[0] > 0)) { errs.push(`hoods ${c} / ${h} / ${t} looks wrong`); break; }
      n++; }
    if (n < 100) errs.push('hoods looks incomplete (fewer than 100 neighbourhood prices)'); }
  if (D?.history) { const pc = D.history.price?.composite;
    if (!pc || typeof pc !== 'object') errs.push('history.price.composite is missing');
    else if (m) { const key = `${m[2]}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0')}`;
      for (const a of ['Greater Vancouver', ...Object.keys(D.areas || {})]) if (pc[a] && !pc[a][key]) { errs.push(`history has no ${D.month} price for ${a}`); break; } } }
  return { errs, key: m ? `${m[2]}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0')}` : null };
}

export default async function handler(req, res) {
  try {
    if (!process.env.ADMIN_TOKEN || req.headers.authorization !== `Bearer ${process.env.ADMIN_TOKEN}`) return json(res, 401, { error: 'Wrong admin password.' });
    const { report, notify, testTo } = await body(req);
    const { errs, key } = validate(report);
    if (errs.length) return json(res, 400, { error: errs.slice(0, 8).join('; ') });
    if (DEMO) return json(res, 200, { ok: true, demo: true, key, emailed: 0 });
    if (!testTo) await db('reports?on_conflict=key', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      data: { key, month: report.month, data: report, published_at: new Date().toISOString() } });
    let emailed = 0;
    if (notify || testTo) {
      const subs = testTo ? [{ email: testTo, name: '' }] : await db('profiles?status=in.(active,trialing)&select=email,name');
      const link = `${origin(req)}/app`;
      const msgs = [];
      for (const s of subs) {
        const hi = s.name ? `Hi ${s.name.split(' ')[0]},` : 'Hi,';
        const text = `${hi}\n\nThe ${report.month} Greater Vancouver market report is ready, with your name and branding on it.\n\nLog in to share your link, download the PDF and social images, or copy the client email:\n${link}\n\n${SITE_NAME}`;
        const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#1b2430;max-width:520px">${emailLogo(origin(req))}<p>${hi}</p><p>The <strong>${report.month}</strong> Greater Vancouver market report is ready, with your name and branding on it.</p><p><a href="${link}" style="display:inline-block;background:#1d4fbf;color:#ffffff;padding:12px 22px;border-radius:10px;font-weight:bold;text-decoration:none">Open my report</a></p><p style="color:#5b6573;font-size:14px">Share your link, download the PDF and social images, or copy the client email.</p><p>${SITE_NAME}</p></div>`;
        msgs.push({ to: s.email, subject: `Your ${report.month} market report is ready`, html, text });
      }
      emailed = await smtpSend(msgs);
    }
    json(res, 200, { ok: true, key, emailed, test: !!testTo });
  } catch (err) { console.error(err); json(res, 500, { error: err.message }); }
}
