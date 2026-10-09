// Sends email through Google Workspace (or any SMTP server with SSL on port 465). No extra packages.
// Settings (Vercel environment variables):
//   SMTP_USER  the Google account that signs in, e.g. info@ellasoltani.ca
//   SMTP_PASS  an app password for that account (Google Account > Security > App passwords)
//   EMAIL_FROM who it's from, e.g.  The Market Update <hello@themarketupdate.ca>
//   SMTP_HOST  optional, default smtp.gmail.com
import tls from 'node:tls';
import crypto from 'node:crypto';

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const wrap = (s) => s.replace(/.{1,76}/g, '$&\r\n');
const encWord = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
const addr = (s) => (/<([^>]+)>/.exec(s) || [, s])[1].trim();
const named = (s) => { const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(s); return m ? `${encWord(m[1])} <${m[2]}>` : s; };

export function buildMessage({ from, to, subject, text, html, replyTo, headers = {} }) {
  const bnd = 'b' + crypto.randomBytes(12).toString('hex'), domain = addr(from).split('@')[1] || 'localhost';
  const head = { From: named(from), To: to, Subject: encWord(subject), Date: new Date().toUTCString(), 'Message-ID': `<${crypto.randomUUID()}@${domain}>`,
    'MIME-Version': '1.0', ...(replyTo ? { 'Reply-To': named(replyTo) } : {}), ...headers, 'Content-Type': `multipart/alternative; boundary="${bnd}"` };
  const part = (type, body) => `--${bnd}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap(b64(body))}`;
  return Object.entries(head).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n' + part('text/plain', text || '') + (html ? part('text/html', html) : '') + `--${bnd}--\r\n`;
}

// Opens one connection and sends every message in `list`. Returns how many were accepted.
export async function smtpSend(list, { host = process.env.SMTP_HOST || 'smtp.gmail.com', port = 465, user = process.env.SMTP_USER, pass = process.env.SMTP_PASS, from = process.env.EMAIL_FROM, rejectUnauthorized = true } = {}) {
  if (!user || !pass || !from) return 0;
  const sock = tls.connect({ host, port, servername: host, rejectUnauthorized });
  sock.setEncoding('utf8'); sock.setTimeout(20000, () => sock.destroy(new Error('SMTP timeout')));
  let buf = '', waiting = null;
  const take = () => { const lines = buf.split('\r\n'); for (let i = 0; i < lines.length - 1; i++) if (/^\d{3} /.test(lines[i])) { const res = lines.slice(0, i + 1).join('\n'); buf = lines.slice(i + 1).join('\r\n'); const w = waiting; waiting = null; w.ok(res); return; } };
  sock.on('data', (d) => { buf += d; if (waiting) take(); });
  sock.on('error', (e) => { if (waiting) { const w = waiting; waiting = null; w.no(e); } });
  const read = () => new Promise((ok, no) => { waiting = { ok, no }; take(); });
  const cmd = async (line, want) => { if (line != null) sock.write(line + '\r\n'); const r = await read(); if (!want.includes(+r.slice(0, 3))) throw new Error(`SMTP: ${r.split('\n').pop()}`); return r; };
  let sent = 0;
  try {
    await new Promise((ok, no) => { sock.once('secureConnect', ok); sock.once('error', no); });
    await cmd(null, [220]); await cmd('EHLO ' + (addr(from).split('@')[1] || 'localhost'), [250]);
    await cmd('AUTH LOGIN', [334]); await cmd(b64(user), [334]); await cmd(b64(pass), [235]);
    for (const m of list) {
      try {
        await cmd(`MAIL FROM:<${user}>`, [250]); await cmd(`RCPT TO:<${addr(m.to)}>`, [250, 251]); await cmd('DATA', [354]);
        await cmd(buildMessage({ from, ...m }).replace(/\r\n\./g, '\r\n..') + '\r\n.', [250]); sent++;
      } catch (e) { console.error('email to', m.to, 'failed:', e.message); await cmd('RSET', [250]).catch(() => {}); }
    }
    await cmd('QUIT', [221]).catch(() => {});
  } catch (e) { console.error(e.message); } finally { sock.end(); }
  return sent;
}
