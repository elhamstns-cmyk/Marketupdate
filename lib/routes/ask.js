import crypto from 'node:crypto';
import { json, body, db, DEMO, origin, smtpSend, SITE_NAME, emailLogo, isActive, latestReport, cleanShow } from '../util.js';
import { cleanClients } from '../../public/js/layout.js';
// S5 Ask about my neighbourhood (public), when the agent turned off "Pick their neighbourhood".
// A personal link (p): we know who they are, so they only pick the neighbourhood. Anyone else leaves an email or phone (contact).
// "Show it right away": a personal link for that neighbourhood is made and opened for them at once (and emailed when they gave an email).
// "Just tell me": the agent is told and replies. Either way the agent gets an email and the request shows in Clients (P10).
const TXT = (v, n) => String(v || '').replace(/[<>]/g, '').trim().slice(0, n);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isPhone = (v) => /^[+\d][\d\s().-]{8,}$/.test(v) && v.replace(/\D/g, '').length >= 10;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const wrapEmail = (site) => (inner) => `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#1b2430;max-width:560px">${emailLogo(site)}${inner}<p style="color:#6b7380;font-size:13px">${SITE_NAME}</p></div>`;
// The email someone gets with their own link, from the agent (replies go to the agent).
export function clientEmail(site, p, to, place, hood, link) {
  const url = `${site}/r/${p.slug}?p=${link.id}`, who = p.name || 'Your agent', agentFirst = who.trim().split(/\s+/)[0];
  return { to, replyTo: p.contact_email || p.email, subject: `Your ${hood} numbers from ${who}`,
    html: wrapEmail(site)(`<p>Hi,</p><p>Here is your own market report for <b>${esc(place)}</b>: the benchmark price and how it changed over 1, 5 and 10 years. It updates itself every month.</p><p><a href="${url}" style="display:inline-block;background:#1d4fbf;color:#fff;text-decoration:none;font-weight:bold;border-radius:10px;padding:12px 20px">Open my ${esc(hood)} report</a></p><p>Questions? Just reply to this email.</p><p>${esc(who)}</p><p style="color:#6b7380;font-size:13px">You asked for this on ${esc(agentFirst)}'s market report. Reply "stop" and you won't hear about it again.</p>`),
    text: `Hi,\n\nHere is your own market report for ${place}. It updates itself every month:\n${url}\n\nQuestions? Just reply to this email.\n\n${who}\n\nYou asked for this on ${agentFirst}'s market report. Reply "stop" and you won't hear about it again.` };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });
    const b = await body(req);
    // A hidden field people never fill in: anything there is a robot. Answer as if it worked.
    if (b.website) return json(res, 200, { ok: true, mode: 'tell' });
    const city = TXT(b.city, 40), hood = TXT(b.hood, 60), from = TXT(b.p, 20), contact = TXT(b.contact, 120);
    if (!city || !hood) return json(res, 400, { error: 'Please choose a neighbourhood.' });
    if (!from && !(EMAIL.test(contact) || isPhone(contact))) return json(res, 400, { error: 'Please add your email or phone number.' });
    if (DEMO) return json(res, 200, { ok: true, mode: 'show', url: `/r/demo?p=x`, demo: true });

    const [p] = await db(`profiles?slug=eq.${encodeURIComponent(TXT(b.slug, 80))}&select=id,name,email,contact_email,slug,plan,status,show`);
    if (!p || !isActive(p) || p.plan !== 'pro') return json(res, 404, { error: 'This report is not available right now.' });
    const C = cleanClients(cleanShow(p.show)?.clients);
    if (C.pick || !C.ask) return json(res, 400, { error: 'This report lets you pick your neighbourhood yourself.' });
    const D = await latestReport();
    if (!D?.hoods?.[city]?.[hood]) return json(res, 400, { error: 'Please choose a neighbourhood from the list.' });
    // A personal link: the client is known by the name the agent gave it.
    const known = from ? (await db(`personal_links?id=eq.${encodeURIComponent(from)}&user_id=eq.${p.id}&select=id,name,type`))[0] : null;
    if (from && !known) return json(res, 400, { error: 'Please ask from your own link.' });

    // Keep it calm: the same person asking about the same neighbourhood within a day gets the same answer, and at most 60 requests a day per agent.
    const site = origin(req), url = (id) => `${site}/r/${p.slug}?p=${id}`, day = new Date(Date.now() - 864e5).toISOString();
    const who = known ? `from_link=eq.${known.id}` : `contact=eq.${encodeURIComponent(contact.toLowerCase())}`;
    const [same, today] = await Promise.all([db(`hood_requests?user_id=eq.${p.id}&${who}&hood=eq.${encodeURIComponent(hood)}&created_at=gte.${day}&select=mode,link_id`), db(`hood_requests?user_id=eq.${p.id}&created_at=gte.${day}&select=id&limit=61`)]);
    if (same.length) return json(res, 200, { ok: true, mode: same[0].mode, url: same[0].link_id ? url(same[0].link_id) : null });
    if (today.length >= 60) return json(res, 429, { error: 'Please try again tomorrow.' });

    const place = `${hood}, ${city}`, name = known?.name || '', email = EMAIL.test(contact) ? contact.toLowerCase() : null;
    let link = null;
    if (C.reply === 'show') [link] = await db('personal_links', { method: 'POST', data: { id: crypto.randomBytes(6).toString('base64url'), user_id: p.id, name, city, hood, type: known?.type || 'd' } });
    await db('hood_requests', { method: 'POST', prefer: 'return=minimal', data: { id: crypto.randomBytes(6).toString('base64url'), user_id: p.id, name, contact: known ? null : contact.toLowerCase(), city, hood, mode: C.reply, status: link ? 'sent' : 'new', link_id: link?.id || null, from_link: known?.id || null } });

    const agentTo = p.contact_email || p.email, wrap = wrapEmail(site), label = known ? known.name : `Someone (${contact})`, msgs = [];
    if (link && email) msgs.push(clientEmail(site, p, email, place, hood, link));
    if (agentTo) msgs.push({ to: agentTo, ...(email ? { replyTo: email } : {}), subject: `${label} asked about ${hood}`,
      html: wrap(`<p><b>${esc(label)}</b> asked about <b>${esc(place)}</b> on ${known ? 'their personal link' : 'your market report'}.</p><p>${link ? `It opened for them right away: <a href="${url(link.id)}">${url(link.id)}</a>. You'll see when they come back in Clients.` : known ? 'Send them their numbers when you can.' : `Reach them at ${esc(contact)}.`}</p><p><a href="${site}/app?view=clients">Open Clients</a></p>`),
      text: `${label} asked about ${place}.\n${link ? `It opened for them right away: ${url(link.id)}` : known ? 'Send them their numbers when you can.' : `Reach them at ${contact}.`}\n\n${site}/app?view=clients` });
    if (msgs.length) await smtpSend(msgs).catch((e) => console.error('ask email', e));
    json(res, 200, { ok: true, mode: C.reply, url: link ? url(link.id) : null });
  } catch (err) { console.error(err); json(res, 500, { error: 'Something went wrong. Please try again.' }); }
}
