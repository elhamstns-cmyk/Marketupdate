// Instagram post (1080x1080) and story (1080x1920) images, drawn in the same calm blue look as the report.
// opts says what is on the image: { price, forsale, market, sold, photo } (true/false).
import { get, money, monthKey, phoneFmt } from './report.js';
import { salesSeries } from './charts.js';

const C = { bg: '#f3f4f7', card: '#ffffff', ink: '#1b2430', mut: '#6b7380', red: '#d6452f', green: '#1a8f4e', blue: '#1d4fbf', bar: '#4f86e8', light: '#c9d8f7', line: '#e6e8ee' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';
export const IMG_DEFAULTS = { post: { price: true, forsale: false, market: true, sold: true, photo: true }, story: { price: true, forsale: true, market: true, sold: true, photo: true } };
export const IMG_PARTS = [['price', 'Typical home price'], ['forsale', 'Homes for sale and days on market'], ['market', "Buyer's or seller's market"], ['sold', 'Homes sold each month'], ['photo', 'Your photo and details']];
export const imgOpts = (A, kind) => ({ ...IMG_DEFAULTS[kind], ...((A && A.show && A.show.img && A.show.img[kind]) || {}) });
const loadImg = (src) => new Promise((ok) => { if (!src) return ok(null); const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
const pct = (a, b) => (a != null && b ? ((a - b) / b) * 100 : null);

export async function calmImage(D, A, area, kind = 'post', opts) {
  await (document.fonts?.ready || Promise.resolve());
  const o = { ...IMG_DEFAULTS[kind], ...(opts || imgOpts(A, kind)) }, story = kind === 'story';
  const W = 1080, H = story ? 1920 : 1080, M = story ? 64 : 52, G = story ? 26 : 22, s = story ? 1 : 0.86;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const rr = (X, Y, w, h, r = 26, fill = C.card) => { x.beginPath(); x.roundRect(X, Y, w, h, r); x.fillStyle = fill; x.fill(); };
  const t = (str, X, Y, size, { w = 500, color = C.ink, align = 'left', max } = {}) => { x.font = `${w} ${Math.round(size)}px ${FONT}`; x.fillStyle = color; x.textAlign = align; x.textBaseline = 'alphabetic';
    let v = String(str); if (max) while (x.measureText(v).width > max && v.length > 3) v = v.slice(0, -2).trimEnd() + '…'; if (max && v !== String(str) && !v.endsWith('…')) v += '…'; x.fillText(v, X, Y); return x.measureText(v).width; };
  const chg = (v, X, Y, size, tail) => { if (v == null || !isFinite(v)) return 0; const col = v < 0 ? C.red : v > 0 ? C.green : C.mut;
    let w = t(`${v < 0 ? '▼' : v > 0 ? '▲' : '●'} ${Math.abs(v).toFixed(1)}%`, X, Y, size, { w: 650, color: col }); if (tail) w += t(' ' + tail, X + w, Y, size, { color: C.mut }); return w; };
  const d = get(D, area, 'all'), mk = monthKey(D.month), monLong = D.month.split(' ')[0], lastYr = D.month.replace(/\d+$/, (y) => y - 1);
  const shortLY = `${MONL.indexOf(monLong) >= 0 ? MON[MONL.indexOf(monLong)] : monLong} ${String(+D.month.slice(-4) - 1)}`;
  x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
  // header
  let y = M + 30 * s;
  t(`${D.month} market update`.toUpperCase(), M, y, 28 * s, { w: 650, color: C.mut }); y += 70 * s;
  t(area, M, y, 64 * s, { w: 750, max: W - 2 * M }); y += 40 * s;
  const CW = W - 2 * M, half = (CW - G) / 2;
  // which blocks, and how tall
  const photoImg = o.photo && A.photo ? await loadImg(A.photo) : null;
  const footH = o.photo ? 150 * s : 70 * s;
  const rows = [];
  const priceH = 230 * s, mktH = 225 * s, fsH = 200 * s;
  if (!story && o.price && o.market) rows.push({ k: 'pm', h: priceH });
  else { if (o.price) rows.push({ k: 'price', h: priceH }); if (o.market) rows.push({ k: 'market', h: mktH }); }
  if (o.forsale) rows.splice(story ? 1 : rows.length, 0, { k: 'forsale', h: fsH });
  const used = rows.reduce((n, r) => n + r.h + G, 0);
  const soldH = o.sold ? Math.max(story ? 420 : 250, H - M - footH - G - y - used - 4) : 0;
  if (o.sold) rows.push({ k: 'sold', h: soldH });
  // draw blocks
  const priceCard = (X, Y, w, h) => { rr(X, Y, w, h); t('Typical home price', X + 32, Y + 54 * s, 28 * s, { color: C.mut }); t(d.price ? money(d.price) : 'Not published', X + 32, Y + 140 * s, (w > 600 ? 84 : 66) * s, { w: 750, max: w - 64 });
    chg(d.yoy, X + 32, Y + 192 * s, 28 * s, `vs ${w > 600 ? lastYr : shortLY}`); };
  const marketCard = (X, Y, w, h) => { rr(X, Y, w, h); t("Buyer's or seller's market?", X + 32, Y + 54 * s, 28 * s, { color: C.mut, max: w - 64 });
    const r = d.ratio, bx = X + 32, bw = w - 64, by = Y + 140 * s, pos = r == null ? null : bx + (Math.min(r, 36) / 36) * bw;
    const z = [[0, 1 / 3, '#c9dbf9'], [1 / 3, 5 / 9, '#d5ecdc'], [5 / 9, 1, '#f6d6cc']]; z.forEach(([a, b, col], i) => { x.beginPath(); x.roundRect(bx + a * bw, by, (b - a) * bw, 16 * s, i === 0 ? [8, 0, 0, 8] : i === 2 ? [0, 8, 8, 0] : 0); x.fillStyle = col; x.fill(); });
    if (pos != null) { const lab = `${Math.round(r)}% · ${r < 12 ? "Buyer's" : r <= 20 ? 'Balanced' : "Seller's"} market`; x.font = `700 ${Math.round(24 * s)}px ${FONT}`; const lw = x.measureText(lab).width + 26, lx = Math.max(bx, Math.min(pos - lw / 2, bx + bw - lw));
      rr(lx, by - 56 * s, lw, 40 * s, 8, C.ink); t(lab, lx + lw / 2, by - 28 * s, 24 * s, { w: 700, color: '#fff', align: 'center' }); x.fillStyle = C.ink; x.fillRect(pos - 3, by - 14 * s, 6, 44 * s); }
    t("Buyer's", bx, by + 56 * s, 22 * s, { color: C.mut }); t('Balanced', bx + bw * 0.444, by + 56 * s, 22 * s, { color: C.mut, align: 'center' }); t("Seller's", bx + bw, by + 56 * s, 22 * s, { color: C.mut, align: 'right' }); };
  const fsCards = (Y, h) => { const dd = d.dom != null && d.domLy != null ? d.dom - d.domLy : null, w1 = d.dom != null ? half : CW;
    rr(M, Y, w1, h); t('Homes for sale', M + 32, Y + 52 * s, 28 * s, { color: C.mut }); t(d.active != null ? d.active.toLocaleString('en-CA') : '—', M + 32, Y + 120 * s, 54 * s, { w: 750 }); chg(pct(d.active, d.activeLy), M + 32, Y + 168 * s, 26 * s, 'vs last year');
    if (d.dom == null) return; const X2 = M + half + G; rr(X2, Y, half, h); t('Days on market', X2 + 32, Y + 52 * s, 28 * s, { color: C.mut }); t(d.dom != null ? `${d.dom} days` : '—', X2 + 32, Y + 120 * s, 54 * s, { w: 750 });
    if (dd != null) t(dd === 0 ? 'Same as last year' : `${Math.abs(dd)} days ${dd > 0 ? 'longer' : 'shorter'} than last year`, X2 + 32, Y + 168 * s, 26 * s, { color: C.mut, max: half - 64 }); };
  const soldCard = (Y, h) => { rr(M, Y, CW, h); const ss = salesSeries(D.history, area, ['detached', 'townhome', 'condo'], mk), R = ss.rows;
    const gname = ss.group === 'Grand Totals' ? 'Greater Vancouver' : ss.group;
    t(gname === area ? 'Homes sold each month' : `Homes sold each month in ${gname} (whole area)`, M + 32, Y + 52 * s, 28 * s, { color: C.mut, max: CW - 64 });
    const head = d.sales != null ? `${d.sales.toLocaleString('en-CA')} sold in ${monLong}` : 'Homes sold'; const hw = t(head, M + 32, Y + 104 * s, 40 * s, { w: 750 });
    chg(pct(d.sales, d.salesLy), M + 32 + hw + 22, Y + 104 * s, 26 * s, 'vs last year');
    if (R.length < 2) { t('Monthly sales are not published for this area.', M + 32, Y + 160 * s, 26 * s, { color: C.mut }); return; }
    const vals = R.map((r) => r[1]), mx = Math.max(...vals), peak = vals.indexOf(mx), last = vals.length - 1;
    let since = -1; for (let i = last - 1; i >= 0; i--) if (vals[i] < vals[last]) { since = i; break; }
    const nm = (k) => MONL[+k.slice(5) - 1];
    const insight = peak === last ? `${monLong} was the busiest month of the past year.` : `Busiest month: ${nm(R[peak][0])}. ${since < 0 ? `${monLong} was the slowest month of the past year.` : since < last - 1 ? `${monLong} was the slowest since ${nm(R[since][0])}.` : `${monLong} was up from ${nm(R[last - 1][0])}.`}`;
    const top = Y + 160 * s, bottom = Y + h - 96 * s, bh = bottom - top, n = R.length, gap = 12 * s, bw = (CW - 64 - gap * (n - 1)) / n;
    R.forEach(([k, v], i) => { const X = M + 32 + i * (bw + gap), hh = Math.max(6, (v / (mx * 1.12)) * bh), Y0 = bottom - hh;
      x.beginPath(); x.roundRect(X, Y0, bw, hh, [6, 6, 2, 2]); x.fillStyle = i === last ? C.blue : i === peak ? C.bar : C.light; x.fill();
      if (i === peak && i !== last) t(`${MON[+k.slice(5) - 1]} ${v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v}`, X + bw / 2, Y0 - 12 * s, 22 * s, { w: 700, align: 'center' });
      t(MON[+k.slice(5) - 1], X + bw / 2, bottom + 30 * s, 20 * s, { color: '#9aa1ab', align: 'center' }); });
    t(insight, M + 32, Y + h - 26 * s, 24 * s, { color: C.mut, max: CW - 64 }); };
  for (const r of rows) {
    if (r.k === 'pm') { priceCard(M, y, half, r.h); marketCard(M + half + G, y, half, r.h); }
    if (r.k === 'price') priceCard(M, y, CW, r.h);
    if (r.k === 'market') marketCard(M, y, CW, r.h);
    if (r.k === 'forsale') fsCards(y, r.h);
    if (r.k === 'sold') soldCard(y, r.h);
    y += r.h + G;
  }
  // footer: the agent, or just the link
  const fy = H - M - footH;
  if (o.photo) { rr(M, fy, CW, footH); let X = M + 28;
    if (photoImg) { const d0 = footH - 44; x.save(); x.beginPath(); x.arc(X + d0 / 2, fy + footH / 2, d0 / 2, 0, Math.PI * 2); x.clip(); const sc = Math.max(d0 / photoImg.width, d0 / photoImg.height);
      x.drawImage(photoImg, X + d0 / 2 - (photoImg.width * sc) / 2, fy + footH / 2 - (photoImg.height * sc) / 2, photoImg.width * sc, photoImg.height * sc); x.restore(); X += d0 + 26; }
    t(A.name || '', X, fy + footH / 2 - 4 * s, 38 * s, { w: 700, max: CW - (X - M) - 30 });
    t([A.role === 'broker' ? 'Mortgage broker' : 'REALTOR®', A.brokerage, phoneFmt(A.phone)].filter(Boolean).join(' · '), X, fy + footH / 2 + 38 * s, 25 * s, { color: C.mut, max: CW - (X - M) - 30 }); }
  else t(`Full report: ${location.host}/r/${A.slug || ''}`, W / 2, fy + footH / 2 + 10, 26 * s, { color: C.mut, align: 'center' });
  return c;
}

// The words under a post (stories have no caption).
export function calmCaption(D, A, area, link) {
  const d = get(D, area, 'all'), mon = D.month.split(' ')[0], r = d.ratio;
  const bits = [d.price ? `the typical home is ${money(d.price)}${d.yoy ? `, ${d.yoy < 0 ? 'down' : 'up'} ${Math.abs(d.yoy).toFixed(1)}% from last year` : ''}` : '', r != null ? `it's a ${r < 12 ? "buyer's" : r <= 20 ? 'balanced' : "seller's"} market` : ''].filter(Boolean);
  const ask = A.role === 'broker' ? 'Wondering what this means for your mortgage? Send me a message.' : 'Want the numbers for your street or building? Send me a message.';
  const sign = [A.name, A.brokerage, phoneFmt(A.phone), A.contact_email].filter(Boolean).join(' · ');
  return `The ${area} market in ${mon}: ${bits.join(', and ')}.\n\n${ask}\n\nFull report: ${link}${sign ? `\n\n${sign}` : ''}`;
}
