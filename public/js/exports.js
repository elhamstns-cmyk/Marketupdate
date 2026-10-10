// Ready-to-send formats: client email, social images.
import { calmImage, calmCaption } from './social2.js';
import { phoneFmt, typesNote, T1, money, get, market, summary, readout, first, areasOf, slug, palette, roleLabel, showOf, typesOf } from './report.js';

export const reportLink = (base, A, area, v) => `${base}/r/${A.slug}` + (v ? `?v=${v}` : area && area !== 'Greater Vancouver' ? `#${slug(area)}` : '');
const sign = (A) => [A.name, A.brokerage, A.contact_email, phoneFmt(A.phone)].filter(Boolean);
const pct = (v) => (v == null ? '' : `${v > 0 ? 'up' : 'down'} ${Math.abs(v).toFixed(1)}% from last year`);

const priceLines = (D, A, area) => { const sh = showOf(A); return sh.prices || sh.changes ? typesOf(sh).map((t) => { const o = get(D, area, t); if (!o.price) return null;
  return { t: T1[t], price: sh.prices ? money(o.price) : '', chg: sh.changes ? pct(o.yoy) : '', yoy: o.yoy }; }).filter(Boolean) : []; };
export function emailDraft(D, A, area, link) {
  const sh = showOf(A), subject = `${area} market update: ${D.month}`, lines = priceLines(D, A, area);
  const intro = summary(D, area, sh) || `Here are this month's numbers for ${area}.`;
  const more = A.role === 'broker' ? 'If you would like to know what this means for your pre-approval, renewal or refinance, just reply and I will walk you through it.' : 'If you would like the numbers for your own neighbourhood or building, just reply and I will send them.';
  const head = sh.prices ? 'Benchmark prices' : 'Price change over the past year';
  const text = `Hi,\n\nHere is the ${D.month} market update for ${area}.\n\n${intro}\n\n${lines.length ? `${head}:\n${lines.map((l) => `${l.t}: ${[l.price, l.price && l.chg ? `(${l.chg})` : l.chg].filter(Boolean).join(' ')}`).join('\n')}\n\n` : ''}See the full interactive report:\n${link}\n\n${more}\n\n${sign(A).join('\n')}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#181614;max-width:560px">${A.logo ? `<p><img src="${A.logo}" alt="" style="max-height:60px"></p>` : ''}<p>Hi,</p><p>Here is the <strong>${D.month}</strong> market update for ${area}.</p><p>${intro}</p>${lines.length ? `<table style="border-collapse:collapse;margin:8px 0">${lines.map((l) => `<tr><td style="padding:6px 18px 6px 0;color:#6b635a">${l.t}</td>${l.price ? `<td style="padding:6px 18px 6px 0;font-weight:bold">${l.price}</td>` : ''}${l.chg ? `<td style="padding:6px 0;color:${l.yoy < 0 ? '#a24a33' : '#3f6b45'}">${l.chg}</td>` : ''}</tr>`).join('')}</table>` : ''}<p><a href="${link}" style="display:inline-block;background:${palette(A.theme).ac};color:${palette(A.theme).bt};padding:12px 20px;border-radius:8px;text-decoration:none">Open the interactive report</a></p><p>${more}</p><p>${sign(A).join('<br>')}</p></div>`;
  return { subject, text, html };
}
export const captionOld = (D, A, area, link) => { const lines = priceLines(D, A, area), sh = showOf(A);
  return `${area} market update, ${D.month}\n\n${lines.length ? lines.map((l) => `${l.t}: ${[l.price, l.chg].filter(Boolean).join(', ')}`).join('\n') + '\n\n' : sh.summary ? summary(D, area, sh) + '\n\n' : ''}Full interactive report: ${link}\n\n${sign(A).join(' | ')}`; };

const loadImg = (src) => new Promise((ok) => { if (!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

// kind: 'post' (1080x1080, Instagram square) or 'story' (1080x1920).
// A compact header, three headline facts, then a small table of all three home types, then who to call.
const tiles0 = (sh) => sh.sold || sh.forsale || sh.market;
export async function socialImageOld(D, A, area, kind = 'post') {
  await (document.fonts?.ready || Promise.resolve());
  const sh = showOf(A), P = palette(A.theme), story = kind === 'story', W = 1080, H = story ? 1920 : 1080, M = 72, k = story ? 1.22 : 1;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), hf = P.hf, bf = P.bf, on = P.bt;
  const [logo, photo] = await Promise.all([loadImg(A.logo), loadImg(A.photo)]);
  const rr = (X, Y, w, h, r, fill) => { x.fillStyle = fill; x.beginPath(); x.roundRect(X, Y, w, h, r); x.fill(); };
  // draws one line with its top at `top`; shrinks to fit `max`; returns the y just below it
  const line = (t, top, size, { font = bf, weight = 600, color = P.ink, align = 'left', X = M, track = 0, max = W - M * 2 } = {}) => {
    size = Math.round(size * k); x.letterSpacing = track + 'px';
    do { x.font = `${weight} ${size}px ${font}`; if (x.measureText(t).width <= max) break; size -= 2; } while (size > 16);
    x.fillStyle = color; x.textAlign = align; x.textBaseline = 'alphabetic'; x.fillText(t, X, top + size * 0.8); x.letterSpacing = '0px';
    return top + size;
  };
  const dn = (v) => `${v < 0 ? '▼' : '▲'} ${Math.abs(v).toFixed(1)}%`, col = (v) => (v < 0 ? '#d2553b' : '#2f9e68'), S = (n) => Math.round(n * k);
  const rows = typesOf(sh).map((t) => ({ t, ...get(D, area, t) }));
  const sold = rows.reduce((n, r) => n + r.sales, 0), listed = rows.reduce((n, r) => n + r.active, 0);
  const soldLy = rows.every((r) => r.salesLy != null) ? rows.reduce((n, r) => n + r.salesLy, 0) : null, listedLy = rows.every((r) => r.activeLy != null) ? rows.reduce((n, r) => n + r.activeLy, 0) : null;
  const ratio = listed ? (sold / listed) * 100 : null, mk = market(ratio), pc = (a, b) => ((a - b) / b) * 100;

  /* header band in the agent's colour */
  x.fillStyle = P.bg; x.fillRect(0, 0, W, H);
  const bandH = story ? 520 : 236; let y = story ? 296 : 64;
  x.fillStyle = P.ac; x.fillRect(0, 0, W, bandH);
  if (logo) { const h = S(44), w = Math.min(240, (logo.width / logo.height) * h); rr(M, y - 10, w + 28, h + 20, 12, '#ffffff'); x.drawImage(logo, M + 14, y, w, h); }
  else if (A.brokerage) line(A.brokerage.toUpperCase(), y + 8, 21, { weight: 700, color: on, track: 2.5, max: 560 });
  line(D.month.toUpperCase(), y + 8, 21, { weight: 700, color: on, align: 'right', X: W - M, track: 2.5 });
  line(`${area} Market Update`, y + S(64), 56, { font: hf, weight: 700, color: on });
  if (typesNote(sh) && tiles0(sh)) line(typesNote(sh), y + S(64) + S(66), 22, { weight: 600, color: on });

  /* what goes in the middle: only what the agent chose to show */
  const tiles = [sh.sold && ['HOMES SOLD', sold.toLocaleString(), soldLy ? `${dn(pc(sold, soldLy))} vs. last year` : 'this month', soldLy ? col(pc(sold, soldLy)) : P.ink],
    sh.forsale && ['HOMES FOR SALE', listed.toLocaleString(), listedLy ? `${dn(pc(listed, listedLy))} vs. last year` : 'right now', P.ink],
    sh.market && ['MARKET', mk ? mk.replace(' market', '') : 'n/a', ratio != null ? `${ratio.toFixed(1)}% of listings sold` : '', P.ink]].filter(Boolean);
  const cols = [sh.prices && ['TYPICAL HOME', 'price'], sh.changes && ['1 YEAR', 'yoy'], sh.sold && ['SOLD', 'sales']].filter(Boolean);
  const gap = 18, th = S(168), rh = S(story ? 98 : 86), sp = story ? 70 : 44, gauge = story && sh.market && ratio != null;
  const blocks = [tiles.length && th, cols.length && S(19) + S(16) + rh * rows.length + 2, gauge && 150].filter(Boolean);
  const top = bandH + (story ? 56 : 36), bottom = story ? H - 470 - 34 - 40 : H - 196 - 24;
  y = Math.max(top, top + (bottom - top - (blocks.reduce((a, b) => a + b, 0) + sp * (blocks.length - 1))) / 2);

  if (tiles.length) { const tw = (W - M * 2 - gap * (tiles.length - 1)) / tiles.length;
    tiles.forEach(([l, v, sub, sc], i) => { const X = M + i * (tw + gap); rr(X, y, tw, th, 24, P.tn);
      let yy = line(l, y + S(26), 19, { weight: 700, track: 2, X: X + 24, max: tw - 48 }); yy = line(v, yy + S(14), 56, { font: hf, weight: 700, X: X + 24, max: tw - 48 }); line(sub, yy + S(12), 21, { weight: 600, color: sc, X: X + 24, max: tw - 48 }); });
    y += th + sp; }

  /* table: one row per home type, one column per number shown */
  if (cols.length) {
    const span = W - M * 2, xs = cols.length === 3 ? [0.62, 0.82, 1] : cols.length === 2 ? [0.72, 1] : [1];
    line(sh.prices ? 'BENCHMARK PRICE' : 'HOME TYPE', y, 19, { weight: 700, track: 2 });
    cols.forEach(([h], i) => line(h, y, 19, { weight: 700, track: 2, align: 'right', X: M + span * xs[i] }));
    y += S(19) + S(16);
    rows.forEach((r) => { x.fillStyle = P.ln; x.fillRect(M, y, span, 2); const t = y + (rh - S(38)) / 2;
      line(T1[r.t], t + S(4), 32, { weight: 600 });
      cols.forEach(([, k], i) => { const X = M + span * xs[i];
        if (k === 'price') line(r.price ? money(r.price) : 'n/a', t, 38, { font: hf, weight: 700, align: 'right', X });
        else if (k === 'yoy') { if (r.price && r.yoy != null) line(dn(r.yoy), t + S(6), 28, { weight: 700, color: col(r.yoy), align: 'right', X }); }
        else line(r.sales.toLocaleString(), t + S(4), 32, { weight: 600, align: 'right', X }); });
      y += rh; });
    x.fillStyle = P.ln; x.fillRect(M, y, span, 2); y += sp;
  }

  if (gauge) { // market balance gauge
    line(mk, y, 30, { font: hf, weight: 700 }); line(`${ratio.toFixed(1)}% of listings sold`, y + 6, 22, { weight: 600, align: 'right', X: W - M });
    const gy = y + 62, gw = W - M * 2; rr(M, gy, gw * 0.3, 22, [11, 0, 0, 11], '#9cc7b0'); rr(M + gw * 0.3, gy, gw * 0.2, 22, 0, '#ead9a6'); rr(M + gw * 0.5, gy, gw * 0.5, 22, [0, 11, 11, 0], '#e3a184');
    rr(M + (Math.min(ratio, 40) / 40) * gw - 5, gy - 10, 10, 42, 5, P.ink);
    line("Buyer's", gy + 40, 18, { weight: 600 }); line('Balanced', gy + 40, 18, { weight: 600, align: 'center', X: M + gw * 0.4 }); line("Seller's", gy + 40, 18, { weight: 600, align: 'right', X: W - M }); }
  /* who to call */
  const R = S(48), fy = story ? H - 470 : H - 196, cy = fy + R + S(28);
  if (story) { x.fillStyle = P.tn; x.fillRect(0, fy - 34, W, H - fy + 34); }
  let fx = M;
  if (photo) { x.save(); x.beginPath(); x.arc(M + R, cy, R, 0, Math.PI * 2); x.clip(); const s = Math.max((2 * R) / photo.width, (2 * R) / photo.height); x.drawImage(photo, M + R - (photo.width * s) / 2, cy - (photo.height * s) / 2, photo.width * s, photo.height * s); x.restore();
    x.strokeStyle = P.fill || P.ac; x.lineWidth = 4; x.beginPath(); x.arc(M + R, cy, R, 0, Math.PI * 2); x.stroke(); fx = M + R * 2 + 24; }
  line(A.name || '', cy - S(36), 34, { font: hf, weight: 700, X: fx, max: 470 }); line([roleLabel(A), A.brokerage].filter(Boolean).join(' · '), cy + S(8), 22, { weight: 500, X: fx, max: 470 });
  line(phoneFmt(A.phone), cy - S(34), 30, { weight: 700, align: 'right', X: W - M, max: 380 }); line(A.contact_email || '', cy + S(8), 22, { weight: 500, align: 'right', X: W - M, max: 400 });
  x.font = `400 15px ${bf}`; x.fillStyle = P.ink; x.textAlign = 'center'; x.fillText(`Source: Greater Vancouver REALTORS®, ${D.month}. Benchmark prices are MLS® HPI figures.`, W / 2, story ? H - 268 : H - 34);
  return c;
}
export function download(canvas, name) { const a = document.createElement('a'); a.download = name; a.href = canvas.toDataURL('image/png'); a.click(); }
export { areasOf, first };
// Current look: the calm blue images and the plain-words caption.
export const socialImage = (D, A, area, kind = 'post', opts) => calmImage(D, A, area, kind, opts);
export const caption = (D, A, area, link) => calmCaption(D, A, area, link);
