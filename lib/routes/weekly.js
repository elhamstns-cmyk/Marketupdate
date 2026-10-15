import { json, db, smtpSend, origin, SITE_NAME, DEMO, emailLogo } from '../util.js';
// Once a week (Vercel cron, Monday morning): email each Pro agent what their clients looked at in the Neighbourhoods section.
// Only sent when there is something to say. Agents can turn it off in Personal links.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

export default async function handler(req, res) {
  try {
    const ok = process.env.CRON_SECRET && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
    if (!ok) return json(res, 401, { error: 'Not allowed.' });
    if (DEMO) return json(res, 200, { ok: true, demo: true, emailed: 0 });
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const views = await db(`hood_views?created_at=gte.${since}&kind=neq.pick&select=user_id,link_id,hood&limit=20000`);
    const by = {}; for (const v of views) (by[v.user_id] = by[v.user_id] || []).push(v);
    const ids = Object.keys(by); if (!ids.length) return json(res, 200, { ok: true, emailed: 0 });
    const profs = await db(`profiles?id=in.(${ids.join(',')})&status=in.(active,trialing)&plan=eq.pro&select=id,email,contact_email,name,weekly_email`);
    const link = `${origin(req)}/app`, msgs = [];
    for (const p of profs) {
      if (p.weekly_email === false) continue;
      const vs = by[p.id], links = await db(`personal_links?user_id=eq.${p.id}&select=id,name,hood`), L = Object.fromEntries(links.map((l) => [l.id, l]));
      // Per client: neighbourhoods other than their own, most looked-at first.
      const per = {};
      for (const v of vs) { const l = L[v.link_id]; if (!l || v.hood === l.hood) continue; const o = (per[l.id] = per[l.id] || {}); o[v.hood] = (o[v.hood] || 0) + 1; }
      const lines = Object.entries(per).map(([id, o]) => { const top = Object.entries(o).sort((a, b) => b[1] - a[1]);
        return { n: top.reduce((s, x) => s + x[1], 0), t: `<b>${esc(L[id].name)}</b> (${esc(L[id].hood)}) looked at ${top.slice(0, 3).map(([h, c]) => `<b>${esc(h)}</b> ${times(c)}`).join(', ')}.` }; }).sort((a, b) => b.n - a.n).slice(0, 10);
      const all = {}; for (const v of vs) all[v.hood] = (all[v.hood] || 0) + 1;
      const top = Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (!lines.length && !top.length) continue;
      const hi = p.name ? `Hi ${esc(p.name.split(' ')[0])},` : 'Hi,';
      const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#1b2430;max-width:560px">${emailLogo(origin(req))}<p>${hi}</p>
        ${lines.length ? `<p>Here is what your clients looked at in your report this week. Someone checking another neighbourhood again and again may be thinking of moving, so it's a good reason to reach out.</p><ul style="padding-left:18px">${lines.map((x) => `<li style="margin-bottom:6px">${x.t}</li>`).join('')}</ul>` : ''}
        ${top.length ? `<p style="color:#55606e;font-size:14px">Most-viewed neighbourhoods this week (everyone who opened your report): ${top.map(([h, c]) => `${esc(h)} (${c})`).join(', ')}.</p>` : ''}
        <p><a href="${link}" style="display:inline-block;background:#1d4fbf;color:#ffffff;padding:12px 22px;border-radius:10px;font-weight:bold;text-decoration:none">Open my report</a></p>
        <p style="color:#6b7380;font-size:13px">You get this email because you use personal links or the Neighbourhoods section. Turn it off in Share &gt; Personal links.</p><p>${SITE_NAME}</p></div>`;
      const text = html.replace(/<li[^>]*>/g, '- ').replace(/<[^>]+>/g, '').replace(/\n\s+/g, '\n').replace(/&amp;/g, '&').replace(/&gt;/g, '>');
      msgs.push({ to: p.contact_email || p.email, subject: lines.length ? `${lines.length} client${lines.length > 1 ? 's' : ''} looked at other neighbourhoods this week` : 'What clients looked at in your report this week', html, text });
    }
    const emailed = msgs.length ? await smtpSend(msgs) : 0;
    json(res, 200, { ok: true, emailed });
  } catch (err) { console.error(err); json(res, 500, { error: err.message }); }
}
