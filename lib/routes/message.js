import { json, body, db, DEMO, origin, smtpSend, isActive } from '../util.js';
import { wrapEmail } from './ask.js';
// S9 Contact me (public): the client writes a message and taps one button; we email it to the agent.
// A personal link (p): we know who they are, so the message is all we need.
// Any other link: no email or phone box (Ella, Nov 2026); the agent is told it came from their report link.
const TXT = (v, n) => String(v || '').replace(/[<>]/g, '').trim().slice(0, n);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// Keep it calm: at most 30 messages a day per agent from one server (a robot can't flood an inbox).
const SENT = new Map();
const tooMany = (slug) => { const day = new Date().toISOString().slice(0, 10), k = `${slug}|${day}`, n = (SENT.get(k) || 0) + 1;
  if (SENT.size > 5000) SENT.clear(); SENT.set(k, n); return n > 30; };

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });
    const b = await body(req);
    // A hidden field people never fill in: anything there is a robot. Answer as if it worked.
    if (b.website) return json(res, 200, { ok: true });
    const slug = TXT(b.slug, 80), from = TXT(b.p, 20), message = String(b.message || '').trim().slice(0, 2000);
    const city = TXT(b.city, 60), month = TXT(b.month, 30);
    if (message.length < 2) return json(res, 400, { error: 'Please write a message.' });
    if (DEMO) return json(res, 200, { ok: true, demo: true });

    const [p] = await db(`profiles?slug=eq.${encodeURIComponent(slug)}&select=id,name,email,contact_email,slug,status`);
    if (!p || !isActive(p)) return json(res, 404, { error: 'This report is not available right now.' });
    const known = from ? (await db(`personal_links?id=eq.${encodeURIComponent(from)}&user_id=eq.${p.id}&select=id,name`))[0] : null;
    if (from && !known) return json(res, 400, { error: 'Please send it from your own link.' });
    if (tooMany(p.slug)) return json(res, 429, { error: 'Please try again tomorrow.' });

    const agentTo = p.contact_email || p.email;
    if (!agentTo) return json(res, 400, { error: 'This agent can’t get messages right now.' });
    const site = origin(req), label = known ? known.name : 'Someone', where = known ? 'their personal link' : 'your market report link';
    const report = [month, city].filter(Boolean).join(' · ');
    // The client may have written their name, email or phone in the message itself.
    const reach = known ? '' : `<p>They didn't use a personal link, so check the message for their name or number.</p>`;
    const sent = await smtpSend([{ to: agentTo, subject: `New message from ${known ? known.name : 'your market report'}`,
      html: wrapEmail(site)(`<p><b>${esc(label)}</b> sent you a message from ${where}${report ? ` (${esc(report)} report)` : ''}:</p>
        <blockquote style="margin:16px 0;padding:14px 18px;background:#f2f4f8;border-radius:10px;white-space:pre-wrap">${esc(message)}</blockquote>${reach}
        ${known ? `<p><a href="${site}/app?view=clients">Open Clients</a></p>` : ''}`),
      text: `${label} sent you a message from ${where}${report ? ` (${report} report)` : ''}:\n\n${message}\n\n${known ? `${site}/app?view=clients` : `They didn't use a personal link, so check the message for their name or number.`}` }]);
    if (!sent) return json(res, 502, { error: 'That didn’t send. Please try again.' });
    json(res, 200, { ok: true });
  } catch (err) { console.error(err); json(res, 500, { error: 'That didn’t send. Please try again.' }); }
}
