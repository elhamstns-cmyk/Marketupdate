// Ready-to-send formats: client email, social images.
import { TYPES, T1, money, get, market, regionSummary, readout, first, areasOf, slug, palette, roleLabel } from './report.js';

export const reportLink = (base, A, area) => `${base}/r/${A.slug}` + (area && area !== 'Greater Vancouver' ? `#${slug(area)}` : '');
const sign = (A) => [A.name, A.brokerage, A.contact_email, A.phone].filter(Boolean);
const pct = (v) => (v == null ? '' : `${v > 0 ? 'up' : 'down'} ${Math.abs(v).toFixed(1)}% from last year`);

export function emailDraft(D, A, area, link) {
  const subject = `${area} market update: ${D.month}`;
  const lines = TYPES.map((t) => { const o = get(D, area, t); return o.price ? `${T1[t]}: ${money(o.price)} (${pct(o.yoy)})` : null; }).filter(Boolean);
  const intro = area === 'Greater Vancouver' ? regionSummary(D) : readout(D, area, 'detached') || regionSummary(D);
  const text = `Hi,\n\nHere is the ${D.month} market update for ${area}.\n\n${intro}\n\nBenchmark prices:\n${lines.join('\n')}\n\nSee the full interactive report, including every city and home type:\n${link}\n\n${A.role === 'broker' ? 'If you would like to know what this means for your pre-approval, renewal or refinance, just reply and I will walk you through it.' : 'If you would like the numbers for your own neighbourhood or building, just reply and I will send them.'}\n\n${sign(A).join('\n')}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#181614;max-width:560px">${A.logo ? `<p><img src="${A.logo}" alt="" style="max-height:60px"></p>` : ''}<p>Hi,</p><p>Here is the <strong>${D.month}</strong> market update for ${area}.</p><p>${intro}</p><table style="border-collapse:collapse;margin:8px 0">${TYPES.map((t) => { const o = get(D, area, t); return o.price ? `<tr><td style="padding:6px 18px 6px 0;color:#6b635a">${T1[t]}</td><td style="padding:6px 18px 6px 0;font-weight:bold">${money(o.price)}</td><td style="padding:6px 0;color:${o.yoy < 0 ? '#a24a33' : '#3f6b45'}">${pct(o.yoy)}</td></tr>` : ''; }).join('')}</table><p><a href="${link}" style="display:inline-block;background:${palette(A.theme).ac};color:${palette(A.theme).bt};padding:12px 20px;border-radius:8px;text-decoration:none">Open the interactive report</a></p><p>${A.role === 'broker' ? 'If you would like to know what this means for your pre-approval, renewal or refinance, just reply and I will walk you through it.' : 'If you would like the numbers for your own neighbourhood or building, just reply and I will send them.'}</p><p>${sign(A).join('<br>')}</p></div>`;
  return { subject, text, html };
}
export const caption = (D, A, area, link) =>
  `${area} market update, ${D.month}\n\n${TYPES.map((t) => { const o = get(D, area, t); return o.price ? `${T1[t]}: ${money(o.price)}, ${pct(o.yoy)}` : null; }).filter(Boolean).join('\n')}\n\nFull interactive report: ${link}\n\n${sign(A).join(' | ')}`;

const loadImg = (src) => new Promise((ok) => { if (!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

// kind: 'post' (1080x1350) or 'story' (1080x1920). Uses the agent's theme colours and fonts.
export async function socialImage(D, A, area, kind = 'post') {
  await (document.fonts?.ready || Promise.resolve());
  const P = palette(A.theme), W = 1080, H = kind === 'story' ? 1920 : 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), hf = P.hf, bf = P.bf, pad = 80, top = kind === 'story' ? 230 : 70;
  x.fillStyle = P.bg; x.fillRect(0, 0, W, H);
  const [logo, photo] = await Promise.all([loadImg(A.logo || A.mark), loadImg(A.photo)]);
  // agent header
  let hx = pad; const hy = top + 20;
  if (photo) { x.save(); x.beginPath(); x.arc(pad + 70, hy + 70, 70, 0, Math.PI * 2); x.clip(); const s = Math.max(140 / photo.width, 140 / photo.height); x.drawImage(photo, pad + 70 - photo.width * s / 2, hy + 70 - photo.height * s / 2, photo.width * s, photo.height * s); x.restore();
    x.strokeStyle = P.ac; x.lineWidth = 4; x.beginPath(); x.arc(pad + 70, hy + 70, 70, 0, Math.PI * 2); x.stroke(); hx = pad + 170; }
  x.textAlign = 'left'; x.fillStyle = P.ink; x.font = `700 52px ${hf}`; x.fillText(A.name || '', hx, hy + 62);
  x.fillStyle = P.mut; x.font = `500 30px ${bf}`; x.fillText([roleLabel(A), A.brokerage].filter(Boolean).join('  ·  '), hx, hy + 108);
  if (logo) { const h = 70, w = Math.min(240, (logo.width / logo.height) * h); x.drawImage(logo, W - pad - w, hy + 35, w, h); }
  x.fillStyle = P.ln; x.fillRect(pad, hy + 170, W - pad * 2, 2);
  // title
  let y = hy + 240;
  x.fillStyle = P.act; x.font = `700 28px ${bf}`; x.fillText(D.month.toUpperCase().split('').join(' '), pad, y);
  x.fillStyle = P.ink; x.font = `700 ${area.length > 16 ? 76 : 92}px ${hf}`; x.fillText(area, pad, y + 100);
  x.font = `600 44px ${hf}`; x.fillStyle = P.mut; x.fillText('Market Report', pad, y + 160);
  y += 210; const rowH = kind === 'story' ? 205 : 170;
  for (const t of TYPES) {
    const o = get(D, area, t); if (!o.price) continue;
    x.fillStyle = P.tn; x.beginPath(); x.roundRect(pad, y, W - pad * 2, rowH - 24, 20); x.fill();
    x.textAlign = 'left'; x.fillStyle = P.mut; x.font = `600 26px ${bf}`; x.fillText(`${T1[t].toUpperCase()} BENCHMARK`, pad + 36, y + 52);
    x.fillStyle = P.ink; x.font = `700 70px ${hf}`; x.fillText(money(o.price), pad + 36, y + 122);
    if (o.yoy != null) { x.textAlign = 'right'; x.fillStyle = o.yoy < 0 ? '#d2553b' : '#2f9e68'; x.font = `700 42px ${bf}`;
      x.fillText(`${o.yoy < 0 ? '▼' : '▲'} ${Math.abs(o.yoy).toFixed(1)}%`, W - pad - 36, y + 92);
      x.fillStyle = P.mut; x.font = `400 24px ${bf}`; x.fillText('vs. last year', W - pad - 36, y + 126); }
    y += rowH;
  }
  const o0 = get(D, area, 'detached'), mk = market(o0.ratio);
  x.textAlign = 'left';
  if (mk) { x.fillStyle = P.ink; x.font = `700 34px ${bf}`; x.fillText(`Detached: ${mk.toLowerCase()}`, pad, y + 36); x.fillStyle = P.mut; x.font = `400 28px ${bf}`; x.fillText(`${o0.ratio.toFixed(1)}% of listings sold this month`, pad, y + 78); }
  // contact bar
  const by = H - (kind === 'story' ? 330 : 170);
  x.fillStyle = P.ac; x.beginPath(); x.roundRect(pad, by, W - pad * 2, 84, 18); x.fill();
  x.fillStyle = P.bt; x.textAlign = 'center'; x.font = `700 32px ${bf}`; x.fillText([A.phone, A.contact_email].filter(Boolean).join('   ·   '), W / 2, by + 54);
  x.fillStyle = P.mut; x.font = `400 19px ${bf}`;
  x.fillText(`Source: Greater Vancouver REALTORS®, ${D.month}. MLS® HPI benchmark prices.`, W / 2, by + 122);
  return c;
}
export function download(canvas, name) { const a = document.createElement('a'); a.download = name; a.href = canvas.toDataURL('image/png'); a.click(); }
export { areasOf, first };
