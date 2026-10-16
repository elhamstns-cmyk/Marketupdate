import crypto from 'node:crypto';
import { json, body, db, DEMO, origin, smtpSend, SITE_NAME, emailLogo, isActive, latestReport, cleanShow } from '../util.js';
import { cleanClients } from '../../public/js/layout.js';
// S5 Ask about my neighbourhood (public). A client who can't pick their neighbourhood asks the agent about it.
// "Send it for me": a personal link with their neighbourhood is made and emailed to them from the agent, and the agent is told.
// "Just tell me": the agent gets an email and the request waits in Clients (P10).
const TXT = (v, n) => String(v || '').replace(/[<>]/g, '').trim().slice(0, n);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });
    const b = await body(req);
    const r = { name: TXT(b.name, 60), email: TXT(b.email, 120).toLowerCase(), city: TXT(b.city, 40), hood: TXT(b.hood, 60) };
    // A hidden field people never fill in: anything there is a robot. Answer as if it worked.
    if (b.website) return json(res, 200, { ok: true, mode: 'tell' });
    if (!r.name || !r.city || !r.hood) return json(res, 400, { error: 'Please choose your neighbourhood and add your name.' });
    if (!EMAIL.test(r.email)) return json(res, 400, { error: 'Please check your email address.' });
    if (DEMO) return json(res, 200, { ok: true, mode: 'send', url: '/r/demo?p=x', demo: true });

    const slug = TXT(b.slug, 80);
    const [p] = await db(`profiles?slug=eq.${encodeURIComponent(slug)}&select=id,name,email,contact_email,slug,plan,status,show`);
    if (!p || !isActive(p) || p.plan !== 'pro') return json(res, 404, { error: 'This report is not available right now.' });
    const C = cleanClients(cleanShow(p.show)?.clients);
    if (C.pick || !C.ask) return json(res, 400, { error: 'This report lets you pick your neighbourhood yourself.' });
    // The neighbourhood must be one we publish.
    const D = await latestReport();
    if (!D?.hoods?.[r.city]?.[r.hood]) return json(res, 400, { error: 'Please choose your neighbourhood from the list.' });

    // Keep it calm: the same person asking again within a day doesn't send another email, and at most 60 requests a day per agent.
    const day = new Date(Date.now() - 864e5).toISOString();
    const [same, today] = await Promise.all([db(`hood_requests?user_id=eq.${p.id}&email=eq.${encodeURIComponent(r.email)}&created_at=gte.${day}&select=id,mode,link_id`), db(`hood_requests?user_id=eq.${p.id}&created_at=gte.${day}&select=id&limit=61`)]);
    const site = origin(req), url = (id) => `${site}/r/${p.slug}?p=${id}`;
    if (same.length) return json(res, 200, { ok: true, mode: same[0].mode, url: same[0].link_id ? url(same[0].link_id) : null });
    if (today.length >= 60) return json(res, 429, { error: 'Please try again tomorrow.' });

    const agentFirst = (p.name || '').trim().split(/\s+/)[0] || 'Your agent', who = p.name || 'Your agent', place = `${r.hood}, ${r.city}`;
    let link = null;
    if (C.reply === 'send') {
      [link] = await db('personal_links', { method: 'POST', data: { id: crypto.randomBytes(6).toString('base64url'), user_id: p.id, name: r.name, city: r.city, hood: r.hood, type: 'd' } });
    }
    const [row] = await db('hood_requests', { method: 'POST', data: { id: crypto.randomBytes(6).toString('base64url'), user_id: p.id, ...r, mode: C.reply, status: link ? 'sent' : 'new', link_id: link?.id || null } });

    const agentTo = p.contact_email || p.email, wrap = (inner) => `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#1b2430;max-width:560px">${emailLogo(site)}${inner}<p style="color:#6b7380;font-size:13px">${SITE_NAME}</p></div>`;
    const msgs = [];
    if (link) {
      msgs.push({ to: r.email, replyTo: agentTo, subject: `Your ${r.hood} numbers from ${who}`,
        html: wrap(`<p>Hi ${esc(r.name.split(/\s+/)[0])},</p><p>Here is your own market report for <b>${esc(place)}</b>: the benchmark price and how it changed over 1, 5 and 10 years. It updates itself every month.</p><p><a href="${url(link.id)}" style="display:inline-block;background:#1d4fbf;color:#fff;text-decoration:none;font-weight:bold;border-radius:10px;padding:12px 20px">Open my ${esc(r.hood)} report</a></p><p>Questions? Just reply to this email.</p><p>${esc(who)}</p><p style="color:#6b7380;font-size:13px">You asked for this on ${esc(agentFirst)}'s market report. Reply "stop" and you won't hear about it again.</p>`),
        text: `Hi ${r.name.split(/\s+/)[0]},\n\nHere is your own market report for ${place}. It updates itself every month:\n${url(link.id)}\n\nQuestions? Just reply to this email.\n\n${who}\n\nYou asked for this on ${agentFirst}'s market report. Reply "stop" and you won't hear about it again.` });
    }
    if (agentTo) msgs.push({ to: agentTo, replyTo: r.email, subject: link ? `${r.name} asked about ${r.hood}. We sent their link.` : `${r.name} asked about ${r.hood}`,
      html: wrap(`<p><b>${esc(r.name)}</b> (${esc(r.email)}) asked about <b>${esc(place)}</b> on your market report.</p><p>${link ? `We sent them their own link from you: <a href="${url(link.id)}">${url(link.id)}</a>. You'll see when they open it in Clients.` : 'Reply to this email to send them their numbers, or make their personal link in Clients.'}</p><p><a href="${site}/app?tab=clients">Open Clients</a></p>`),
      text: `${r.name} (${r.email}) asked about ${place} on your market report.\n${link ? `We sent them their own link: ${url(link.id)}` : 'Reply to this email to send them their numbers.'}\n\n${site}/app?tab=clients` });
    if (msgs.length) await smtpSend(msgs).catch((e) => console.error('ask email', e));
    json(res, 200, { ok: true, mode: C.reply, url: link ? url(link.id) : null, id: row?.id });
  } catch (err) { console.error(err); json(res, 500, { error: 'Something went wrong. Please try again.' }); }
}
