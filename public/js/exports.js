// Ready-to-send formats: client email, social images.
import { TYPES, T1, money, get, market, regionSummary, readout, first, areasOf, slug } from './report.js';

export const reportLink = (base, A, area) => `${base}/r/${A.slug}` + (area && area !== 'Greater Vancouver' ? `#${slug(area)}` : '');
const sign = (A) => [A.name, A.brokerage, A.contact_email, A.phone].filter(Boolean);
const pct = (v) => (v == null ? '' : `${v > 0 ? 'up' : 'down'} ${Math.abs(v).toFixed(1)}% from last year`);

export function emailDraft(D, A, area, link) {
  const subject = `${area} market update: ${D.month}`;
  const lines = TYPES.map((t) => { const o = get(D, area, t); return o.price ? `${T1[t]}: ${money(o.price)} (${pct(o.yoy)})` : null; }).filter(Boolean);
  const intro = area === 'Greater Vancouver' ? regionSummary(D) : readout(D, area, 'detached') || regionSummary(D);
  const text = `Hi,\n\nHere is the ${D.month} market update for ${area}.\n\n${intro}\n\nBenchmark prices:\n${lines.join('\n')}\n\nSee the full interactive report, including every city and home type:\n${link}\n\nIf you would like the numbers for your own neighbourhood or building, just reply and I will send them.\n\n${sign(A).join('\n')}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#181614;max-width:560px">${A.logo ? `<p><img src="${A.logo}" alt="" style="max-height:60px"></p>` : ''}<p>Hi,</p><p>Here is the <strong>${D.month}</strong> market update for ${area}.</p><p>${intro}</p><table style="border-collapse:collapse;margin:8px 0">${TYPES.map((t) => { const o = get(D, area, t); return o.price ? `<tr><td style="padding:6px 18px 6px 0;color:#6b635a">${T1[t]}</td><td style="padding:6px 18px 6px 0;font-weight:bold">${money(o.price)}</td><td style="padding:6px 0;color:${o.yoy < 0 ? '#a24a33' : '#3f6b45'}">${pct(o.yoy)}</td></tr>` : ''; }).join('')}</table><p><a href="${link}" style="display:inline-block;background:#181614;color:#fbf8f4;padding:12px 20px;border-radius:8px;text-decoration:none">Open the interactive report</a></p><p>If you would like the numbers for your own neighbourhood or building, just reply and I will send them.</p><p>${sign(A).join('<br>')}</p></div>`;
  return { subject, text, html };
}
export const caption = (D, A, area, link) =>
  `${area} market update, ${D.month}\n\n${TYPES.map((t) => { const o = get(D, area, t); return o.price ? `${T1[t]}: ${money(o.price)}, ${pct(o.yoy)}` : null; }).filter(Boolean).join('\n')}\n\nFull interactive report: ${link}\n\n${sign(A).join(' | ')}`;

const loadImg = (src) => new Promise((ok) => { if (!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

// kind: 'post' (1080x1350) or 'story' (1080x1920)
export async function socialImage(D, A, area, kind = 'post') {
  await (document.fonts?.ready || Promise.resolve());
  const W = 1080, H = kind === 'story' ? 1920 : 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), serif = '"Cormorant Garamond", Georgia, serif', sans = 'Jost, "Avenir Next", "Segoe UI", sans-serif';
  const pad = 90, top = kind === 'story' ? 250 : 90;
  x.fillStyle = '#efe8df'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#c6a252'; x.lineWidth = 3; x.strokeRect(40, 40, W - 80, H - 80);
  x.textAlign = 'center'; x.fillStyle = '#8a6a22'; x.font = `600 30px ${sans}`;
  x.fillText(D.month.toUpperCase().split('').join(' '), W / 2, top + 50);
  x.fillStyle = '#181614'; x.font = `600 ${area.length > 16 ? 84 : 104}px ${serif}`; x.fillText(area, W / 2, top + 165);
  x.font = `500 46px ${serif}`; x.fillText('Market Report', W / 2, top + 230);
  x.fillStyle = '#c6a252'; x.fillRect(W / 2 - 40, top + 262, 80, 2);
  const o0 = get(D, area, 'detached'), mk = market(o0.ratio);
  let y = top + 330; const rowH = kind === 'story' ? 215 : 190;
  x.textAlign = 'left';
  for (const t of TYPES) {
    const o = get(D, area, t); if (!o.price) continue;
    x.fillStyle = '#fbf8f4'; x.beginPath(); x.roundRect(pad, y, W - pad * 2, rowH - 28, 18); x.fill();
    x.fillStyle = '#6b635a'; x.font = `600 28px ${sans}`; x.fillText(`${T1[t].toUpperCase()} BENCHMARK`, pad + 40, y + 58);
    x.fillStyle = '#181614'; x.font = `600 76px ${serif}`; x.fillText(money(o.price), pad + 40, y + 130);
    if (o.yoy != null) { x.textAlign = 'right'; x.fillStyle = o.yoy < 0 ? '#a24a33' : '#3f6b45'; x.font = `600 44px ${sans}`;
      x.fillText(`${o.yoy < 0 ? '▼' : '▲'} ${Math.abs(o.yoy).toFixed(1)}%`, W - pad - 40, y + 100);
      x.fillStyle = '#6b635a'; x.font = `400 24px ${sans}`; x.fillText('vs. last year', W - pad - 40, y + 136); x.textAlign = 'left'; }
    y += rowH;
  }
  x.textAlign = 'center';
  if (mk) { x.fillStyle = '#5b6347'; x.font = `600 34px ${sans}`; x.fillText(`Detached: ${mk.toLowerCase()} (${o0.ratio.toFixed(1)}% of listings sold)`, W / 2, y + 30); }
  // agent block
  const by = H - (kind === 'story' ? 400 : 250);
  x.fillStyle = '#d9cfc2'; x.fillRect(pad, by, W - pad * 2, 2);
  const [logo, photo] = await Promise.all([loadImg(A.logo), loadImg(A.photo)]);
  let ty = by + 70;
  if (logo) { const h = 80, w = Math.min(360, (logo.width / logo.height) * h); x.drawImage(logo, W / 2 - w / 2, by + 24, w, h); ty = by + 140; }
  else { x.fillStyle = '#181614'; x.font = `600 54px ${serif}`; x.fillText(A.name || '', W / 2, ty); ty += 44; }
  x.fillStyle = '#6b635a'; x.font = `500 28px ${sans}`;
  x.fillText([logo ? A.name : null, A.brokerage].filter(Boolean).join('  ·  '), W / 2, ty);
  x.fillStyle = '#181614'; x.font = `500 30px ${sans}`; x.fillText([A.phone, A.contact_email].filter(Boolean).join('  ·  '), W / 2, ty + 44);
  x.fillStyle = '#6b635a'; x.font = `400 19px ${sans}`;
  x.fillText(`Source: Greater Vancouver REALTORS®, ${D.month}. MLS® HPI benchmark prices.`, W / 2, H - 64);
  return c;
}
export function download(canvas, name) { const a = document.createElement('a'); a.download = name; a.href = canvas.toDataURL('image/png'); a.click(); }
export { areasOf, first };
