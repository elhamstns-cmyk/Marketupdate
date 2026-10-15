import { json, db, smtpSend, origin, SITE_NAME, DEMO, monthKeys, emailLogo } from '../util.js';
import { activity, monthName, times, mins } from '../../public/js/activity.js';
// Once a week (Vercel cron, Monday morning): email each Pro agent which clients were actively looking (E1).
// Built from the last 7 days of visits and Neighbourhoods views. Only sent when there is something to say.
// Agents can turn it off in Share > Client activity. Also removes visits older than 400 days, to keep the database small.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const by = (list, k) => { const o = {}; for (const x of list) if (x[k]) (o[x[k]] = o[x[k]] || []).push(x); return o; };

// One agent's email lines. links: their personal links. visits/views: the last 7 days (any client). Exported for tests.
export function weeklyLines(links, visits, views, { now = Date.now(), latest = null } = {}) {
  const VB = by(visits, 'link_id'), HB = by(views, 'link_id'), out = [];
  for (const l of links) {
    const a = activity(l, VB[l.id], HB[l.id], { days: 7, now, latest }); if (!a.visits && !a.looked.length) continue;
    const top = a.parts[0], bits = [];
    if (a.looked.length) bits.push(`looked at ${a.looked.slice(0, 3).map(([h, c]) => `<b>${esc(h)}</b> ${times(c)}`).join(', ')}`);
    if (a.months.length) bits.push(`looked back at <b>${a.months.slice(0, 2).map(monthName).join(' and ')}</b>`);
    if (a.contact) bits.push('opened your contact box');
    const did = a.visits ? `opened your report ${times(a.visits)} and read for ${mins(a.seconds)}${top ? `, mostly ${esc(top[1])}` : ''}` : '';
    out.push({ hot: a.level === 'hot', n: a.visits * 10 + a.looked.length, t: `${a.level === 'hot' ? '🔥 ' : ''}<b>${esc(l.name)}</b> (${esc(l.hood)}) ${[did, ...bits].filter(Boolean).join('; ')}.` });
  }
  out.sort((x, y) => y.hot - x.hot || y.n - x.n);
  // Links sent at least 3 days ago that were never opened.
  const quiet = links.filter((l) => !l.opens && new Date(l.created_at).getTime() < now - 3 * 864e5).map((l) => l.name);
  return { lines: out.slice(0, 12), hot: out.filter((x) => x.hot).length, quiet };
}

export default async function handler(req, res) {
  try {
    const ok = process.env.CRON_SECRET && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
    if (!ok) return json(res, 401, { error: 'Not allowed.' });
    if (DEMO) return json(res, 200, { ok: true, demo: true, emailed: 0 });
    await db(`visits?started_at=lt.${new Date(Date.now() - 400 * 864e5).toISOString()}`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {});
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const [views, visits, keys] = await Promise.all([db(`hood_views?created_at=gte.${since}&select=user_id,link_id,hood,kind,created_at&limit=20000`),
      db(`visits?started_at=gte.${since}&select=user_id,link_id,month,device,seconds,reached_end,parts,acts,started_at,updated_at&limit=20000`), monthKeys()]);
    const VU = by(visits, 'user_id'), HU = by(views, 'user_id'), ids = [...new Set([...Object.keys(VU), ...Object.keys(HU)])];
    if (!ids.length) return json(res, 200, { ok: true, emailed: 0 });
    const profs = await db(`profiles?id=in.(${ids.join(',')})&status=in.(active,trialing)&plan=eq.pro&select=id,email,contact_email,name,weekly_email`);
    const link = `${origin(req)}/app`, msgs = [];
    for (const p of profs) {
      if (p.weekly_email === false) continue;
      const links = await db(`personal_links?user_id=eq.${p.id}&select=id,name,hood,type,opens,created_at,last_opened_at`);
      const { lines, hot, quiet } = weeklyLines(links, VU[p.id] || [], HU[p.id] || [], { latest: keys[0] });
      const all = {}; for (const v of HU[p.id] || []) if (v.kind !== 'pick') all[v.hood] = (all[v.hood] || 0) + 1;
      const top = Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 3), general = (VU[p.id] || []).filter((v) => !v.link_id).length;
      if (!lines.length && !top.length && !general) continue;
      const hi = p.name ? `Hi ${esc(p.name.split(' ')[0])},` : 'Hi,';
      const head = lines.length ? (hot ? `This week, ${hot === 1 ? 'one client was' : `${hot} clients were`} actively looking.` : 'Here is what your clients did in your report this week.') : '';
      const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#1b2430;max-width:560px">${emailLogo(origin(req))}<p>${hi}</p>
        ${lines.length ? `<p><b>${head}</b> Someone opening your report again and again, or checking other neighbourhoods, may be thinking of moving, so it's a good reason to reach out.</p><ul style="padding-left:18px">${lines.map((x) => `<li style="margin-bottom:8px">${x.t}</li>`).join('')}</ul>` : ''}
        ${quiet.length ? `<p style="color:#55606e;font-size:14px">${quiet.length === 1 ? `One client hasn't opened their link yet: ${esc(quiet[0])}.` : `${quiet.length} clients haven't opened their link yet: ${quiet.slice(0, 6).map(esc).join(', ')}${quiet.length > 6 ? ' and others' : ''}.`}</p>` : ''}
        ${general ? `<p style="color:#55606e;font-size:14px">Your general link (Instagram, your website) was opened ${times(general)} this week.</p>` : ''}
        ${top.length ? `<p style="color:#55606e;font-size:14px">Most-viewed neighbourhoods this week (everyone who opened your report): ${top.map(([h, c]) => `${esc(h)} (${c})`).join(', ')}.</p>` : ''}
        <p><a href="${link}" style="display:inline-block;background:#1d4fbf;color:#ffffff;padding:12px 22px;border-radius:10px;font-weight:bold;text-decoration:none">See client activity</a></p>
        <p style="color:#6b7380;font-size:13px">You get this email because you use personal links. Turn it off in Share &gt; Client activity.</p><p>${SITE_NAME}</p></div>`;
      const text = html.replace(/<li[^>]*>/g, '- ').replace(/<[^>]+>/g, '').replace(/\n\s+/g, '\n').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&#39;|&quot;/g, "'");
      msgs.push({ to: p.contact_email || p.email, subject: hot ? `${hot === 1 ? '1 client was' : `${hot} clients were`} actively looking this week` : lines.length ? 'What your clients did in your report this week' : 'Your report this week', html, text });
    }
    const emailed = msgs.length ? await smtpSend(msgs) : 0;
    json(res, 200, { ok: true, emailed });
  } catch (err) { console.error(err); json(res, 500, { error: err.message }); }
}
