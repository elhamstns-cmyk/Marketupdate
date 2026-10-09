import { priceSeries, salesSeries, trendFacts, lineChart, barChart, multiChart, areaColours } from './charts.js';
// The interactive market report. mountReport(root, D, A) draws it with the agent's branding (A) and theme (A.theme).
export const TN = { detached: 'detached homes', townhome: 'attached homes', condo: 'condos', all: 'homes' };
export const T1 = { detached: 'Detached', townhome: 'Attached', condo: 'Condo', all: 'All homes' };
export const SOLDLAB = { detached: 'Detached homes', townhome: 'Attached homes', condo: 'Condos', all: 'Homes' };
const addMonths = (k, n) => { let [y, m] = k.split('-').map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return `${y}-${String(m).padStart(2, '0')}`; };
export const TYPES = ['detached', 'townhome', 'condo'];
export const money = (n) => '$' + Math.round(n).toLocaleString('en-CA');
export const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const first = (A) => (A.name || 'me').trim().split(/\s+/)[0];
export const areasOf = (D) => ['Greater Vancouver', ...Object.keys(D.areas || {}).sort()];
export const market = (r) => (r == null ? null : r < 12 ? "Buyer's market" : r <= 20 ? 'Balanced market' : "Seller's market");
// Any saved phone shows as +1 604-555-0100.
export const phoneFmt = (v) => { let d = String(v || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? `+1 ${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : String(v || ''); };
const withPhone = (A) => (A && A.phone ? { ...A, phone: phoneFmt(A.phone) } : A);
export const roleLabel = (A) => (A.role === 'broker' ? 'Mortgage broker' : 'REALTOR®');

/* ---------- what the agent chooses to show (Pro) ---------- */
export const SHOW_NUMBERS = [['prices', 'Benchmark prices'], ['changes', 'Price changes'], ['sold', 'Homes sold'], ['forsale', 'Homes for sale'], ['days', 'Days on market'], ['market', 'Market type']];
export const SHOW_SECTIONS = [['summary', 'The short version'], ['meaning', 'What this means'], ['trend', '12-month trend'], ['compare', 'Area comparison'], ['picker', 'Clients can pick areas']];
export const DEFAULT_SHOW = { prices: true, changes: true, sold: true, forsale: true, days: true, market: true, detached: true, townhome: true, condo: true, summary: true, meaning: true, trend: true, compare: true, picker: true };
export function showOf(A) { const s = { ...DEFAULT_SHOW, ...((A && A.show) || {}) }; if (!TYPES.some((t) => s[t])) TYPES.forEach((t) => (s[t] = true)); return s; }
export const typesOf = (sh) => TYPES.filter((t) => sh[t]);
export const monthKey = (m) => { const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], x = /^(\w+) (\d{4})$/.exec(m || ''); return x ? `${x[2]}-${String(M.indexOf(x[1]) + 1).padStart(2, '0')}` : ''; };
const monthName = (k) => { const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return k ? `${M[+k.slice(5) - 1]} ${k.slice(0, 4)}` : ''; };
export const nounOf = (ts) => (ts.length === 3 ? 'homes' : ts.map((t) => TN[t]).join(' and '));

/* ---------- themes ---------- */
// Twelve pairings: a heading font with character, always a highly readable body font for numbers and text.
const F = (label, h, b, g) => ({ label, hf: `"${h}", ${/Playfair|Lora|DM Serif|Baskerville|Merriweather|Source Serif|Fraunces/.test(h) ? 'Georgia, serif' : 'system-ui, sans-serif'}`, bf: `"${b}", system-ui, sans-serif`, g });
export const FONTS = {
  modern: F('Inter', 'Inter', 'Inter', ['Inter:wght@400;500;600;700;800']),
  jakarta: F('Jakarta', 'Plus Jakarta Sans', 'Plus Jakarta Sans', ['Plus+Jakarta+Sans:wght@400;500;600;700;800']),
  manrope: F('Manrope', 'Manrope', 'Manrope', ['Manrope:wght@400;500;600;700;800']),
  montserrat: F('Montserrat', 'Montserrat', 'Inter', ['Montserrat:wght@600;700;800', 'Inter:wght@400;500;600;700']),
  poppins: F('Poppins', 'Poppins', 'Inter', ['Poppins:wght@600;700', 'Inter:wght@400;500;600;700']),
  friendly: F('Nunito', 'Nunito', 'Nunito', ['Nunito:wght@400;600;700;800']),
  classic: F('Playfair', 'Playfair Display', 'Inter', ['Playfair+Display:wght@600;700', 'Inter:wght@400;500;600;700']),
  dmserif: F('DM Serif', 'DM Serif Display', 'DM Sans', ['DM+Serif+Display', 'DM+Sans:wght@400;500;700']),
  lora: F('Lora', 'Lora', 'Inter', ['Lora:wght@500;600;700', 'Inter:wght@400;500;600;700']),
  sourceserif: F('Source Serif', 'Source Serif 4', 'Source Sans 3', ['Source+Serif+4:wght@600;700', 'Source+Sans+3:wght@400;600;700']),
  merriweather: F('Merriweather', 'Merriweather', 'Inter', ['Merriweather:wght@700', 'Inter:wght@400;500;600;700']),
  fraunces: F('Fraunces', 'Fraunces', 'Inter', ['Fraunces:opsz,wght@9..144,600;9..144,700', 'Inter:wght@400;500;600;700']),
};
export const fontHref = (keys) => 'https://fonts.googleapis.com/css2?' + [...new Set(keys.flatMap((k) => (FONTS[k] || FONTS.modern).g))].map((g) => 'family=' + g).join('&') + '&display=swap';
// Loads the fonts a page needs (one theme's font on a report, all of them in the dashboard).
export function loadFonts(keys) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = fontHref(keys); document.head.appendChild(l); }
// Four report styles. Each one is its own layout, not just a colour change.
export const STYLES = {
  highlights: { label: 'Highlights', note: 'Colour band, a row per home type', ac: '#14523d', ac2: '#c9e265', bg: '#ffffff', font: 'modern' },
  clean: { label: 'Clean', note: 'White, airy cards', ac: '#0f6b4f', bg: '#ffffff', font: 'modern' },
  classic: { label: 'Classic', note: 'Cream paper, reads like a letter', ac: '#1f3557', bg: '#fbf7ef', font: 'lora' },
  bold: { label: 'Bold', note: 'Black and gold, big numbers', ac: '#d6b25e', bg: '#0e0e0f', font: 'modern' },
};
export const layoutOf = (theme) => { const s = theme?.style; return STYLES[s] ? s : s === 'modern' ? 'clean' : 'highlights'; };
export const BASIC_THEME = { style: 'basic', ac: '#1d4f9c', ac2: '#a9c8f5', bg: '#ffffff', font: 'modern' };
// A second colour for the Highlights stripe, matched to each preset colour.
export const PAIR = { '#14523d': '#c9e265', '#0f6b4f': '#c9e265', '#1d4f9c': '#a9c8f5', '#14233f': '#d8c38a', '#1f3557': '#d8c38a', '#b3202e': '#f2c1a0', '#7a2e3b': '#e9c1a8', '#d0a94a': '#2a2a2a', '#d6b25e': '#2a2a2a', '#6b3fa0': '#d5c3f0', '#111312': '#d6b25e', '#2f6f7a': '#bfe3d9' };
// When some home types are hidden, totals only count the ones shown, so say which.
export const typesNote = (sh) => { const ts = TYPES.filter((t) => sh[t]); return ts.length < 3 ? `${ts.map((t) => ({ detached: 'Detached homes', townhome: 'townhomes', condo: 'condos' })[t]).join(' and ').replace(/^./, (c) => c.toUpperCase())} only` : ''; };
const hex = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
export const lum = (h) => { const c = hex(h) || [255, 255, 255]; const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
export const mix = (a, b, t) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join(''); };
// Turns a saved theme into the full set of colours the report uses.
export function palette(theme) {
  const t = { ...STYLES.highlights, ...(theme || {}) };
  const bg = hex(t.bg) ? t.bg : '#ffffff', ac = hex(t.ac) ? t.ac : '#0f6b4f', f = FONTS[t.font] || FONTS.modern;
  const ink = lum(bg) < 0.35 ? '#f4f2ec' : '#10201a';
  const act = contrast(ac, bg) < 2.6 ? ink : ac; // accent used as text must stay readable
  const fill = contrast(ac, bg) < 1.4 ? ink : ac; // accent used as a button must be visible
  const ac2 = hex(t.ac2) ? t.ac2 : PAIR[String(ac).toLowerCase()] || mix(fill, bg, 0.45);
  return { bg, ac, ac2, ink, act, fill, bt: contrast(fill, '#111312') > contrast(fill, '#ffffff') ? '#111312' : '#ffffff', tn: mix(fill, bg, 0.09), ln: mix(ink, bg, 0.15), mut: mix(ink, bg, 0.62), hf: f.hf, bf: f.bf };
}
export const themeVars = (theme) => { const p = palette(theme); return `--bg:${p.bg};--ink:${p.ink};--ac:${p.fill};--act:${p.act};--bt:${p.bt};--tn:${p.tn};--ln:${p.ln};--mut:${p.mut};--ac2:${p.ac2};--hf:${p.hf};--bf:${p.bf}`; };

/* ---------- sample agents shown on the landing page ---------- */
const svgLogo = (path, c) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">${path.replaceAll('CUR', c)}</svg>`);
export const SAMPLES = {
  sarah: { name: 'Sarah Mitchell', role: 'realtor', brokerage: 'Westbrook Realty', phone: '604-555-0104', contact_email: 'sarah@example.com', photo: '/img/sample-sarah.jpg', theme: { style: 'highlights', ...STYLES.highlights },
    mark: svgLogo('<path d="M3 14 14 4l11 10v10H3z" fill="none" stroke="CUR" stroke-width="2.4" stroke-linejoin="round"/><path d="M11 24v-7h6v7" fill="none" stroke="CUR" stroke-width="2.4"/>', '#0f6b4f') },
  marcus: { name: 'Marcus Bell', role: 'broker', brokerage: 'Harbourline Mortgage', phone: '604-555-0115', contact_email: 'marcus@example.com', photo: '/img/sample-marcus.jpg', theme: { style: 'classic', ...STYLES.classic },
    mark: svgLogo('<path d="M3 18c4-6 7-6 11 0s7 6 11 0" fill="none" stroke="CUR" stroke-width="2.4" stroke-linecap="round"/><path d="M3 11c4-6 7-6 11 0s7 6 11 0" fill="none" stroke="CUR" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>', '#14233f') },
  david: { name: 'David Hartley', role: 'realtor', brokerage: 'Northshore Homes', phone: '604-555-0126', contact_email: 'david@example.com', photo: '/img/sample-david.jpg', theme: { style: 'bold', ...STYLES.bold },
    mark: svgLogo('<path d="M2 23 10 8l5 8 3-5 8 12z" fill="CUR"/>', '#d0a94a') },
};

/* ---------- data helpers ---------- */
export function get(D, area, type) {
  if (type === 'all') { // every home type together: composite benchmark price, totals for counts
    const rs = TYPES.map((t) => get(D, area, t)), sum = (k) => (rs.every((r) => r[k] != null) ? rs.reduce((n, r) => n + r[k], 0) : null);
    const H = D.history?.price?.composite?.[area], k = monthKey(D.month), price = H?.[k] || null, ly = H?.[addMonths(k, -12)], prev = H?.[addMonths(k, -1)] || null;
    const wavg = (dk, sk) => (rs.every((r) => r[dk] != null && r[sk] != null) && sum(sk) ? Math.round(rs.reduce((n, r) => n + r[dk] * r[sk], 0) / sum(sk)) : null);
    const o = { price, yoy: price && ly ? Math.round(((price - ly) / ly) * 1000) / 10 : null, prev, sales: sum('sales'), salesLy: sum('salesLy'), active: sum('active'), activeLy: sum('activeLy'), dom: wavg('dom', 'sales'), domLy: wavg('domLy', 'salesLy') };
    o.ratio = o.active ? (o.sales / o.active) * 100 : null; return o;
  }
  const c = D.cities[area] && D.cities[area][type], a = area === 'Greater Vancouver' ? null : D.areas[area][type];
  const o = c ? { price: c.price.now, yoy: c.price.yoy, prev: c.price.prev, sales: c.sales.now, salesLy: c.sales.ly, active: c.active.now, activeLy: c.active.ly, dom: c.dom.now, domLy: c.dom.ly, ratio: c.ratio }
    : { price: a.price, yoy: a.yoy, sales: a.sales, active: a.active };
  if (o.ratio == null) o.ratio = o.active ? (o.sales / o.active) * 100 : null;
  return o;
}
// Neutral arrow for counts (more homes for sale isn't "good" or "bad" by itself).
export function chgN(v, suffix) { if (v == null || !isFinite(v)) return ''; return `<span class="chg neu">${v > 0 ? '▲' : v < 0 ? '▼' : '●'} ${Math.abs(v).toFixed(1)}%</span>${suffix ? ` <span class="muted small">${suffix}</span>` : ''}`; }
export function chg(v, suffix) {
  if (v == null) return '<span class="muted small">n/a</span>';
  const c = v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  return `<span class="chg ${c}">${v > 0 ? '▲' : v < 0 ? '▼' : '●'} ${Math.abs(v).toFixed(1)}%</span>${suffix ? ` <span class="muted small">${suffix}</span>` : ''}`;
}
// A plain-English summary of an area, using only what the agent chose to show.
export function summary(D, area = 'Greater Vancouver', sh = DEFAULT_SHOW) {
  const ts = typesOf(sh), rows = ts.map((t) => get(D, area, t)), noun = nounOf(ts), mon = D.month.split(' ')[0], where = area === 'Greater Vancouver' ? 'across the region' : `in ${area}`;
  const sum = (k) => (rows.every((r) => r[k] != null) ? rows.reduce((n, r) => n + r[k], 0) : null);
  const n = sum('sales'), l = sum('salesLy'), a = sum('active'), al = sum('activeLy'), out = [];
  if (sh.sold) out.push(`${n.toLocaleString()} ${noun} sold ${where} in ${mon}${l ? `, compared with ${l.toLocaleString()} a year earlier` : ''}.`);
  if (sh.forsale) out.push(`There ${a === 1 ? 'is' : 'are'} ${a.toLocaleString()} ${noun} for sale${al ? `, ${Math.abs(((a - al) / al) * 100).toFixed(0)}% ${a < al ? 'fewer' : 'more'} than last year` : ''}.`);
  if (sh.changes) { const ys = rows.filter((r) => r.price && r.yoy != null).map((r) => r.yoy);
    if (ys.length) out.push(ts.length === 1 ? `The benchmark price for ${noun} is ${ys[0] < 0 ? 'lower' : ys[0] > 0 ? 'higher' : 'unchanged'}${ys[0] ? ' than' : ' from'} a year ago.`
      : ys.every((y) => y < 0) ? 'Benchmark prices are lower than a year ago for every home type.' : ys.every((y) => y > 0) ? 'Benchmark prices are higher than a year ago for every home type.' : 'Price changes are mixed across home types.'); }
  if (!out.length && sh.market) { const r = n != null && a ? (n / a) * 100 : null; if (market(r)) out.push(`Overall, ${area} is a ${market(r).toLowerCase()} this month.`); }
  return out.join(' ');
}
export const regionSummary = (D, sh) => summary(D, 'Greater Vancouver', sh);
export function readout(D, area, type, sh = DEFAULT_SHOW) {
  const o = get(D, area, type), mk = market(o.ratio), mon = D.month.split(' ')[0], bits = [];
  if (sh.changes && o.price && o.yoy != null) bits.push(`the typical ${{ detached: 'detached home', townhome: 'attached home', condo: 'condo', all: 'home' }[type]} is ${o.yoy < 0 ? `down ${Math.abs(o.yoy)}%` : o.yoy > 0 ? `up ${o.yoy}%` : 'unchanged'} from a year ago`);
  if (sh.sold && sh.forsale) bits.push(`${o.sales.toLocaleString()} of ${o.active.toLocaleString()} listed ${TN[type]} sold in ${mon}`);
  else if (sh.sold) bits.push(`${o.sales.toLocaleString()} ${TN[type]} sold in ${mon}`);
  else if (sh.forsale) bits.push(`${o.active.toLocaleString()} ${TN[type]} are listed for sale`);
  let t = bits.length ? `In ${area}, ${bits.join(', and ')}. ` : '';
  if (sh.market && mk) t += o.ratio < 12 ? 'Buyers have room to negotiate, and sellers need sharp pricing to stand out.' : o.ratio <= 20 ? 'Neither side has a clear advantage, so well-priced homes still sell.' : 'Sellers have the advantage, and buyers should be ready to move quickly.';
  return t.trim();
}
export const sourceLine = (D) => `Source: Greater Vancouver REALTORS® monthly report, ${D.month}, current as of ${D.asof}. Benchmark prices are MLS® HPI figures. Ratios for areas without a detailed report are calculated from sales and active listings. This is not intended to solicit properties already listed for sale.`;

// Logo (or brokerage name) plus photo, name, role and phone.
export function whoBlock(A) {
  A = withPhone(A);
  const logo = A.logo ? `<img class="brandlogo" src="${esc(A.logo)}" alt="${esc(A.brokerage || '')}">`
    : A.brokerage ? `<div class="lgtxt">${A.mark ? `<img src="${esc(A.mark)}" alt="">` : ''}<span>${esc(A.brokerage)}</span></div>` : '';
  return `${logo}<div class="who">${A.photo ? `<img class="av" src="${esc(A.photo)}" alt="">` : ''}<div><div class="nm">${esc(A.name || 'Your Name')}</div><div class="rl">${[roleLabel(A), A.phone].filter(Boolean).map(esc).join(' · ')}</div>${A.logo && A.brokerage ? `<div class="rl">${esc(A.brokerage)}</div>` : ''}</div></div>`;
}
// What the closing section says. Mortgage brokers get mortgage wording.
export function askCopy(A) {
  return A.role === 'broker'
    ? { h: 'Wondering what this means for your mortgage?', p: 'Prices and rates move together. I can walk you through what this market means for your pre-approval, renewal or refinance, at no cost.', lab: 'Your city or neighbourhood', ph: 'e.g. your city or neighbourhood',
        chips: ['buying a home', 'renewing soon', 'thinking of refinancing'], subj: 'A question about my mortgage',
        msg: (w, type, intent) => `Hi ${first(A)}, could you tell me what the current market in ${w} means for my mortgage?` + (intent ? ` I'm ${intent}.` : '') }
    : { h: 'Want the numbers for your own neighbourhood?', p: 'City averages hide a lot. I can send you recent sales, price ranges and days on market for your street, building or neighbourhood, at no cost.', lab: 'Your city or neighbourhood', ph: 'e.g. your neighbourhood or building name',
        chips: ['thinking of selling', 'looking to buy', "just curious about my home's value"], subj: 'Market numbers for my area',
        msg: (w, type, intent) => `Hi ${first(A)}, could you send me the latest market numbers for ${w} (${TN[type]})?` + (intent ? ` I'm ${intent}.` : '') };
}

/* ---------- areas: one or more at a time ---------- */
export const MAX_AREAS = 4;
// "Greater Vancouver|Coquitlam" or an array -> a clean list of known areas (first one is the main area).
export function areaList(v, D) { const all = D ? areasOf(D) : null, raw = Array.isArray(v) ? v : String(v || '').split('|');
  const out = [...new Set(raw.map((a) => String(a).trim()).filter((a) => a && (!all || all.includes(a))))].slice(0, MAX_AREAS); return out.length ? out : ['Greater Vancouver']; }
export const areaHash = (list) => list.map(slug).join('+');
export const fromHash = (h, D) => areaList(String(h || '').replace(/^#/, '').split('+').map((x) => areasOf(D).find((a) => slug(a) === x)).filter(Boolean), D);

/* ---------- plain-English insights, written from the numbers each month ---------- */
const ONE = { detached: 'detached home', townhome: 'attached home', condo: 'condo', all: 'home' };
const pc = (v) => `${Math.abs(v).toFixed(1)}%`;
const listJoin = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const round1k = (v) => '$' + (Math.round(v / 1000) * 1000).toLocaleString('en-CA');
// Up to three short points about one area. Only uses what the agent chose to show.
export function shortVersion(D, area, sh = DEFAULT_SHOW) {
  const R = typesOf(sh).map((t) => ({ t, ...get(D, area, t) })), mon = D.month.split(' ')[0], out = [], where = area === 'Greater Vancouver' ? '' : ` in ${esc(area)}`;
  const P = R.filter((r) => r.price && r.yoy != null);
  if ((sh.changes || sh.prices) && P.length) {
    const ys = P.map((r) => r.yoy), lo = Math.min(...ys), hi = Math.max(...ys);
    let s = '';
    if (ys.every((y) => y < 0)) s = P.length > 1 ? `Prices are <b>${hi === lo ? pc(lo) : `${pc(hi)} to ${pc(lo)}`} lower</b> than a year ago for every home type${where}.` : `The typical ${ONE[P[0].t]} price${where} is <b>${pc(lo)} lower</b> than a year ago.`;
    else if (ys.every((y) => y > 0)) s = P.length > 1 ? `Prices are <b>${hi === lo ? pc(lo) : `${pc(lo)} to ${pc(hi)}`} higher</b> than a year ago for every home type${where}.` : `The typical ${ONE[P[0].t]} price${where} is <b>${pc(hi)} higher</b> than a year ago.`;
    else { const dn = P.filter((r) => r.yoy < 0).map((r) => SOLDLAB[r.t].toLowerCase()), up = P.filter((r) => r.yoy > 0).map((r) => SOLDLAB[r.t].toLowerCase());
      s = `Prices are mixed${where}: ${dn.length ? `<b>${listJoin(dn)} are down</b>` : ''}${dn.length && up.length ? ' while ' : ''}${up.length ? `<b>${listJoin(up)} are up</b>` : ''} from a year ago.`; }
    if (sh.prices) { const big = [...P].sort((a, b) => Math.abs(b.price - b.price / (1 + b.yoy / 100)) - Math.abs(a.price - a.price / (1 + a.yoy / 100)))[0], d = big.price - big.price / (1 + big.yoy / 100);
      if (Math.abs(d) >= 5000) s += ` A typical ${ONE[big.t]} costs about <b>${round1k(Math.abs(d))} ${d < 0 ? 'less' : 'more'}</b> than last ${mon}.`; }
    out.push(s);
  }
  if (sh.sold && R.length) {
    const ly = R.every((r) => r.salesLy), tot = R.reduce((n, r) => n + (r.sales || 0), 0);
    if (ly) { const up = R.filter((r) => r.sales > r.salesLy), ch = (r) => ((r.sales - r.salesLy) / r.salesLy) * 100;
      if (R.length === 1) out.push(`${SOLDLAB[R[0].t]} sales are <b>${ch(R[0]) >= 0 ? 'up' : 'down'} ${pc(ch(R[0]))}</b> from a year ago${where}: ${R[0].sales.toLocaleString()} sold in ${mon}.`);
      else if (up.length === 1) out.push(`<b>${SOLDLAB[up[0].t]} are the only type selling more</b> than last year (+${pc(ch(up[0]))}).${up[0].t === 'detached' && P.some((r) => r.t === 'detached' && r.yoy < 0) ? ' Buyers are coming back to houses as prices ease.' : ''}`);
      else if (!up.length) out.push(`<b>Fewer homes sold</b> than a year ago for every home type${where}: ${tot.toLocaleString()} in ${mon}.`);
      else if (up.length === R.length) out.push(`<b>More homes sold</b> than a year ago for every home type${where}: ${tot.toLocaleString()} in ${mon}.`);
      else out.push(`<b>${listJoin(up.map((r) => SOLDLAB[r.t].toLowerCase())).replace(/^./, (c) => c.toUpperCase())}</b> sold more than last year; ${listJoin(R.filter((r) => !up.includes(r)).map((r) => SOLDLAB[r.t].toLowerCase()))} sold less.`); }
    else out.push(`<b>${tot.toLocaleString()} ${nounOf(R.map((r) => r.t))} sold</b>${where} in ${mon}.`);
  }
  const DM = R.filter((r) => r.dom != null);
  if (sh.days && DM.length) { const ds = DM.map((r) => r.dom), lo = Math.min(...ds), hi = Math.max(...ds), df = DM.filter((r) => r.domLy != null).map((r) => r.dom - r.domLy), mx = df.length ? Math.max(...df) : null, mn = df.length ? Math.min(...df) : null;
    out.push(`Homes take <b>${lo === hi ? lo : `${lo} to ${hi}`} days on market</b>${mx == null ? '' : mx > 0 ? `, up to ${mx === 7 ? 'a week' : `${mx} days`} longer than last year` : mn < 0 ? `, up to ${-mn} days faster than last year` : ', about the same as last year'}.`); }
  else if (sh.market) { const a = R.reduce((n, r) => n + (r.active || 0), 0), s = R.reduce((n, r) => n + (r.sales || 0), 0), r = a ? (s / a) * 100 : null;
    if (market(r)) out.push(`About <b>${Math.round(r)} of every 100</b> listed homes sold this month: a <b>${market(r).toLowerCase()}</b>.`); }
  return out.slice(0, 3);
}
// What the numbers mean for someone buying, and someone selling.
export function meaning(D, area, sh = DEFAULT_SHOW, A = {}) {
  const R = typesOf(sh).map((t) => ({ t, ...get(D, area, t) })), mon = D.month.split(' ')[0];
  const a = R.reduce((n, r) => n + (r.active || 0), 0), s = R.reduce((n, r) => n + (r.sales || 0), 0), r = a ? (s / a) * 100 : null;
  if (r == null) return null;
  const doms = R.filter((x) => x.dom != null && x.sales), dom = doms.length && sh.days ? Math.round(doms.reduce((n, x) => n + x.dom * x.sales, 0) / doms.reduce((n, x) => n + x.sales, 0)) : null;
  const main = R.find((x) => x.price && x.prev), m = main ? ((main.price - main.prev) / main.prev) * 100 : null, per = Math.max(1, Math.round(r));
  const weak = R.filter((x) => x.ratio != null && x.ratio < 12).map((x) => SOLDLAB[x.t].toLowerCase()), broker = A.role === 'broker';
  let buy, sell;
  if (r < 12) {
    buy = `${sh.forsale ? `With ${a.toLocaleString()} homes for sale and only` : 'With only'} about ${per} of every 100 listings selling each month, you have time to compare and room to negotiate${weak.length && weak.length < R.length ? `, especially on ${listJoin(weak)}` : ''}.`;
    sell = `Price it right from day one.${dom ? ` Homes now take about ${dom} days to sell.` : ''}${sh.changes && m != null && m < -0.2 ? ` Prices slipped ${pc(m)} in the last month alone.` : ''}${sh.sold ? ` Well-priced homes still sell: ${s.toLocaleString()} did in ${mon}.` : ''}`;
  } else if (r <= 20) {
    buy = 'Neither side has a clear edge. Good homes still get attention, so be ready when the right one comes up.';
    sell = `Price close to recent sales and your home should sell in a reasonable time${dom ? `, about ${dom} days right now` : ''}.`;
  } else {
    buy = `Homes are moving fast: about ${per} of every 100 listings sold this month. Be ready to act quickly when you find the right one.`;
    sell = `Demand is strong. Good presentation and the right price can bring strong offers${dom ? `, with homes selling in about ${dom} days` : ''}.`;
  }
  if (broker) buy += ' A pre-approval holds your rate while you shop.';
  return { buy, sell };
}

/* ---------- small pieces ---------- */
export const ICONS = {
  detached: '<svg viewBox="0 0 120 92" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M14 44 60 10l46 34"/><path d="M24 37v45h72V37"/><path d="M50 82V60h20v22"/><rect x="32" y="48" width="12" height="12" rx="1.5"/><rect x="76" y="48" width="12" height="12" rx="1.5"/><path d="M82 22v-8h9v15"/><path d="M6 82h108"/></svg>',
  townhome: '<svg viewBox="0 0 130 92" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8 40 28 22l20 18 20-18 20 18 20-18 20 18"/><path d="M14 35v47M122 35v47M48 40v42M88 40v42"/><rect x="22" y="52" width="10" height="10"/><rect x="62" y="52" width="10" height="10"/><rect x="100" y="52" width="10" height="10"/><path d="M36 82V68h8v14M76 82V68h8v14"/><path d="M4 82h122"/></svg>',
  condo: '<svg viewBox="0 0 110 92" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="30" y="8" width="50" height="74" rx="2"/><path d="M40 20h8M62 20h8M40 32h8M62 32h8M40 44h8M62 44h8M40 56h8M62 56h8"/><path d="M48 82V68h14v14"/><path d="M10 82V46h20M100 82V54H80"/><path d="M4 82h102"/></svg>',
};
const arrow = (v, good = true) => (v == null || !isFinite(v) ? '' : `<span class="chg ${!good ? 'neu' : v > 0 ? 'pos' : v < 0 ? 'neg' : ''}"><i class="tri ${v > 0 ? 'u' : v < 0 ? 'd' : 'z'}"></i>${Math.abs(v).toFixed(1)}%</span>`);
const meterHTML = (r) => `<div class="meter"><span></span><span></span><span></span><i style="left:${(Math.min(r, 40) / 40) * 100}%"></i></div>`;
const MKS = { "Buyer's market": "Buyer's", 'Balanced market': 'Balanced', "Seller's market": "Seller's" };
// The numbers for one home type in one area, as label / value / note, in the order the agent sees them.
export function metrics(D, area, t, sh) {
  const o = get(D, area, t), out = [], ly = D.month.replace(/\d+$/, (y) => y - 1).split(' ')[0];
  if (sh.prices) out.push({ k: 'prices', l: 'Benchmark price', v: o.price ? money(o.price) : 'n/a', s: sh.changes && o.price ? `${arrow(o.yoy)} <span data-sh="changes">vs last year</span>` : !o.price ? 'Too few sales for a benchmark' : '' });
  else if (sh.changes) out.push({ k: 'changes', l: 'Price change', v: o.price ? arrow(o.yoy) : 'n/a', s: 'vs last year' });
  if (sh.sold) out.push({ k: 'sold', l: 'Homes sold', v: (o.sales ?? 0).toLocaleString(), s: o.salesLy ? `${arrow(((o.sales - o.salesLy) / o.salesLy) * 100)} vs last year` : `in ${D.month.split(' ')[0]}` });
  if (sh.forsale) out.push({ k: 'forsale', l: 'Homes for sale', v: (o.active ?? 0).toLocaleString(), s: o.activeLy ? `${arrow(((o.active - o.activeLy) / o.activeLy) * 100, false)} vs last year` : 'listed now' });
  if (sh.days && o.dom != null) out.push({ k: 'days', l: 'Days on market', v: String(o.dom), s: o.domLy == null ? 'average' : o.dom > o.domLy ? `${o.dom - o.domLy} days longer than last year` : o.dom < o.domLy ? `${o.domLy - o.dom} days faster than last year` : `same as last ${ly}` });
  if (sh.market && o.ratio != null && o.active) out.push({ k: 'market', l: 'Market', v: MKS[market(o.ratio)], meter: meterHTML(o.ratio), s: `${o.ratio.toFixed(1)}% of listings sold`, cls: 'mkt' });
  return { o, out };
}
const metHTML = (m) => `<div class="mt ${m.cls || ''}" data-sh="${m.k}"><span class="lab">${m.l}</span><span class="num">${m.v}</span>${m.meter || ''}${m.s ? `<span class="sub">${m.s}</span>` : ''}</div>`;

// The home-type block for one area, drawn differently by each style.
export function typesHTML(layout, D, area, sh) {
  const TS = typesOf(sh);
  if (layout === 'classic') {
    const cols = metrics(D, area, TS[0], sh).out.map((m) => [m.k, m.l]);
    return `<table class="cstbl"><thead><tr><th>Home type</th>${cols.map(([k, l]) => `<th data-sh="${k}">${l}</th>`).join('')}</tr></thead><tbody>${TS.map((t) => `<tr data-sh="${t}"><td>${T1[t]}</td>${metrics(D, area, t, sh).out.map((m) => `<td data-sh="${m.k}"><b>${m.v}</b>${m.s ? `<small>${m.s}</small>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  if (layout === 'highlights') return `<div class="hlrows">${TS.map((t) => `<div class="hlrow" data-sh="${t}"><div class="hlpic"><span class="hltag">${T1[t]}</span><div class="ill">${ICONS[t]}</div></div><div class="mts">${metrics(D, area, t, sh).out.map(metHTML).join('')}</div></div>`).join('')}</div>`;
  // clean and bold: one card or tile per home type
  return `<div class="tcards" style="--n:${TS.length}">${TS.map((t) => { const { out } = metrics(D, area, t, sh), [head, ...rest] = out;
    return `<div class="tcard" data-sh="${t}"><span class="tlab">${T1[t]}</span>${head ? `<div class="hd" data-sh="${head.k}"><span class="num big2">${head.v}</span>${head.s ? `<span class="sub">${head.s}</span>` : ''}</div>` : ''}${rest.map((m) => `<div class="kv" data-sh="${m.k}"><span>${m.l}</span><b>${m.v}</b>${m.meter || ''}</div>`).join('')}</div>`; }).join('')}</div>`;
}
export const shortHTML = (D, area, sh) => { const pts = shortVersion(D, area, sh); return pts.length ? `<ol class="svl">${pts.map((p, i) => `<li><i>${i + 1}</i><span>${p}</span></li>`).join('')}</ol>` : ''; };
export const meaningHTML = (D, area, sh, A) => { const m = meaning(D, area, sh, A); return m ? `<div class="mean"><div><h3><span class="mi">${ICON2.key}</span>If you're buying</h3><p>${m.buy}</p></div><div><h3><span class="mi">${ICON2.sign}</span>If you're selling</h3><p>${m.sell}</p></div></div>` : ''; };
const ICON2 = { key: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/></svg>', sign: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5M4 5h14v8H4"/><path d="M8 9h6"/></svg>' };
// A table of the chosen areas side by side, plus one sentence that says what stands out.
export function compareHTML(D, areas, type, sh, cols) {
  const rows = areas.map((a, i) => ({ a, c: cols[i], ...get(D, a, type) }));
  const th = [sh.prices && 'Benchmark price', sh.changes && '1 year', sh.sold && 'Homes sold', sh.days && 'Days on market', sh.market && 'Market'].filter(Boolean);
  const td = (r) => [sh.prices && (r.price ? money(r.price) : 'n/a'), sh.changes && (r.price ? arrow(r.yoy) : ''), sh.sold && (r.sales ?? 0).toLocaleString(), sh.days && (r.dom ?? '—'), sh.market && (market(r.ratio) ? `<span class="mpill m${r.ratio < 12 ? 'b' : r.ratio <= 20 ? 'n' : 's'}">${MKS[market(r.ratio)]}</span>` : '')].filter((x) => x !== false);
  const P = rows.filter((r) => r.price && r.yoy != null), words = [];
  if (sh.changes && P.length > 1) { const lo = [...P].sort((x, y) => x.yoy - y.yoy)[0], hi = [...P].sort((x, y) => y.yoy - x.yoy)[0];
    words.push(lo.yoy < 0 ? `${esc(lo.a)} fell the most this year (−${pc(lo.yoy)}).` : `${esc(hi.a)} rose the most this year (+${pc(hi.yoy)}).`); }
  if (sh.prices && P.length > 1) { const ch = [...P].sort((x, y) => x.price - y.price)[0], ref = rows[0]; if (ch.a !== ref.a && ref.price) words.push(`${esc(ch.a)} is the most affordable, about ${round1k(ref.price - ch.price)} below ${esc(ref.a)}.`);
    else { const ex = [...P].sort((x, y) => y.price - x.price)[0]; words.push(`${esc(ex.a)} is the most expensive, about ${round1k(ex.price - ch.price)} above ${esc(ch.a)}.`); } }
  const note = sh.days && rows.some((r) => r.dom == null) ? '<p class="small muted">— Days on market is only published for the larger areas.</p>' : '';
  return `<table class="ctbl"><thead><tr><th>Area</th>${th.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr><td><i style="background:${r.c}"></i>${esc(r.a)}</td>${td(r).map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>${words.length ? `<p class="plain"><b>In plain words:</b> ${words.join(' ')}</p>` : ''}${note}`;
}
// The top of the report, different for each style.
export function mastHTML(layout, A, D) {
  A = withPhone(A); const role = [roleLabel(A), A.brokerage].filter(Boolean).map(esc).join(' · '), ph = A.photo ? `<img class="av" src="${esc(A.photo)}" alt="">` : '';
  const logo = A.logo ? `<img class="brandlogo" src="${esc(A.logo)}" alt="${esc(A.brokerage || '')}">` : '';
  if (layout === 'highlights') return `<header class="hlhead"><div class="hlband"><div class="hlwho">${ph}<div><b class="nm">${esc(A.name || 'Your Name')}</b><span>${[roleLabel(A), A.brokerage, A.phone].filter(Boolean).map(esc).join(' · ')}</span></div></div>${logo ? `<span class="hllogo">${logo}</span>` : ''}<div class="hlttl"><b>Market Highlights</b><span><span data-id="aname"></span> · ${esc(D.month)}</span></div></div><div class="hlstripe"></div></header>`;
  if (layout === 'classic') return `<header class="csmast">${logo}<span class="eyebrow">The Market Letter · ${esc(D.month)}</span><h1 data-id="aname"></h1><p class="byline">Prepared for you by ${esc(A.name || 'Your Name')}, ${role}</p></header>`;
  if (layout === 'bold') return `<header class="bdmast"><div><span class="eyebrow">Market update</span><h1><span data-id="aname"></span><br><em>${esc(D.month.split(' ')[0])}.</em></h1></div>${logo}</header><div class="bdwho">${ph}<div><b class="nm">${esc(A.name || 'Your Name')}</b><span>${[roleLabel(A), A.brokerage, A.phone].filter(Boolean).map(esc).join(' · ')}</span></div></div>`;
  return `<div class="mast">${whoBlock(A)}</div><header class="title"><p class="monthpill"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>${esc(D.month)} report</p><h1><span data-id="aname"></span> Market Report</h1></header>`;
}

// opts.areas: the areas to open on (first is the main one). opts.city: lock to those areas (no picker).
// opts.onAreas(list): called when the reader adds or removes an area. opts.embedded: inside the dashboard.
export function mountReport(root, D, A, opts = {}) {
  A = withPhone(A);
  const AREAS = areasOf(D), F = esc(first(A)), ask = askCopy(A), sh = showOf(A), TS = typesOf(sh), layout = layoutOf(A.theme), pal = palette(A.theme);
  const S = { areas: areaList(opts.areas || opts.area, D), cur: 0, type: null, mode: 'pct', intent: null };
  const canPick = AREAS.length > 1 && !opts.city && sh.picker !== false, TX = TS.length > 1 ? ['all', ...TS] : TS; S.type = TX[0];
  const anyPrice = sh.prices || sh.changes, endKey = monthKey(D.month), hasHist = !!D.history;
  const email = A.contact_email || '', phone = A.phone || '';
  root.className = `rpt st-${layout}`; root.style.cssText = themeVars(A.theme);
  root.innerHTML = `<div class="wrap">
${mastHTML(layout, A, D)}
${canPick || TX.length > 1 ? `<section class="pick" data-sh="picker"><div class="pickrow">${canPick ? `<div class="chipsel"><span class="lab">${sh.picker ? 'Areas' : ''}</span><div class="achips" data-id="achips"></div><label class="addw"><span class="sr">Add an area</span><select data-id="add"></select></label></div>` : ''}
  ${TX.length > 1 ? `<label class="typew"><span class="lab">Home type</span><select data-id="htype">${TX.map((t) => `<option value="${t}">${t === 'all' ? 'All home types' : T1[t]}</option>`).join('')}</select></label>` : ''}</div></section>` : ''}
<div class="atabs" data-id="atabs" role="tablist" hidden></div>
${sh.summary ? `<section class="sv" data-sh="summary"><h2>The short version</h2><div data-id="sv"></div></section>` : ''}
<section class="types" data-sh="types"><h2 class="th" data-id="types-h"></h2><div data-id="types"></div>${anyPrice ? `<p class="small muted">Benchmark price is the MLS® HPI price of a typical home.${typesNote(sh) ? ' ' + typesNote(sh) + '.' : ''}</p>` : ''}</section>
${sh.meaning ? `<section class="meanw" data-sh="meaning"><h2>What this means</h2><div data-id="mean"></div></section>` : ''}
${sh.trend && hasHist && (anyPrice || sh.sold) ? `<section class="trend" data-sh="trend"><h2>The last 12 months</h2>
  ${anyPrice ? `<div class="tchart"><div class="tch"><b data-id="t1h"></b><span class="seg sm" data-id="mode" hidden><button type="button" data-m="pct" aria-pressed="true">% change</button><button type="button" data-m="price" aria-pressed="false">Price</button></span></div><div class="leg" data-id="leg"></div><div class="tfacts" data-id="tfacts"></div><div class="tcv" data-id="t1"></div><p class="small muted" data-id="t1s"></p></div>` : ''}
  ${sh.sold ? '<div class="tchart"><div class="tch"><b data-id="t2h"></b><span data-id="t2s"></span></div><div class="tcv" data-id="t2"></div></div>' : ''}</section>` : ''}
${sh.compare && anyPrice ? `<section class="cmp" data-sh="compare"><h2 data-id="cmp-h">How the areas compare</h2><p class="muted small" data-id="cmp-sub"></p><div data-id="cmp"></div></section>` : ''}
<section class="ask"><div class="askwho">${A.photo ? `<img class="av" src="${esc(A.photo)}" alt="">` : ''}<div><div class="nm">${esc(A.name || '')}</div><div class="rl">${[roleLabel(A), A.brokerage].filter(Boolean).map(esc).join(' · ')}</div></div></div><h2>${ask.h}</h2><p>${ask.p}</p>
  <div class="field"><label>${ask.lab}<input type="text" data-id="where" placeholder="${ask.ph}"></label></div>
  <div><span class="lab">I am</span><div class="chips" data-id="intent" role="group" aria-label="I am">${ask.chips.map((c) => `<button type="button">${esc(c)}</button>`).join('')}</div></div>
  <div><span class="lab">Your message to ${F}</span><p class="msg" data-id="msg"></p></div>
  <div class="btns">${email ? `<span class="mailw"><button type="button" class="btn" data-id="mail" aria-haspopup="true" aria-expanded="false">Email ${F}</button><span class="mailmenu" data-id="mailmenu" hidden></span></span>` : ''}${phone ? `<a class="btn alt" data-id="sms" href="#">Text ${F}</a>` : ''}<button class="btn alt" type="button" data-id="copy">Copy message</button></div>
  <div class="contact">${email ? `<span>${esc(email)}</span>` : ''}${phone ? `<span>${esc(phone)}</span>` : ''}${A.website ? `<span>${esc(A.website.replace(/^https?:\/\//, ''))}</span>` : ''}</div></section>
<div class="sign">${whoBlock(A)}</div>
<footer>${esc(sourceLine(D))}</footer></div>`;
  const $ = (id) => root.querySelector(`[data-id="${id}"]`), put = (id, v, html) => { const e = $(id); if (e) e[html ? 'innerHTML' : 'textContent'] = v; };
  const cols = () => areaColours(pal.fill);

  function text() { const cur = S.areas[S.cur]; const w = $('where').value.trim() || (cur === 'Greater Vancouver' ? 'my area' : cur); return ask.msg(w, S.type, S.intent); }
  function msg() {
    const t = text(); $('msg').textContent = t;
    if ($('sms')) { const d = phone.replace(/\D/g, ''); $('sms').href = `sms:+${d.length === 11 && d[0] === '1' ? d : '1' + d}?&body=${encodeURIComponent(t)}`; }
    if ($('mailmenu')) { const e = encodeURIComponent, su = e(ask.subj), bd = e(t);
      put('mailmenu', `<a href="https://mail.google.com/mail/?view=cm&fs=1&to=${e(email)}&su=${su}&body=${bd}" target="_blank" rel="noopener">Gmail</a><a href="https://outlook.office.com/mail/deeplink/compose?to=${e(email)}&subject=${su}&body=${bd}" target="_blank" rel="noopener">Outlook</a><a href="mailto:${esc(email)}?subject=${su}&body=${bd}">Email app</a><button type="button" data-copy-email>Copy email address</button>`, true); }
  }
  function drawPicker() {
    if ($('achips')) { const C = cols(); put('achips', S.areas.map((a, i) => `<span class="achip"><i style="background:${C[i]}"></i>${esc(a)}${S.areas.length > 1 ? `<button type="button" data-rm="${i}" aria-label="Remove ${esc(a)}">✕</button>` : ''}</span>`).join(''), true);
      const left = AREAS.filter((a) => !S.areas.includes(a)), full = S.areas.length >= MAX_AREAS;
      put('add', `<option value="">${full ? `Up to ${MAX_AREAS} areas` : S.areas.length > 1 ? '+ Add another area' : '+ Add an area to compare'}</option>${full ? '' : left.map((a) => `<option>${esc(a)}</option>`).join('')}`, true); $('add').disabled = full; }
    const tabs = $('atabs'); tabs.hidden = S.areas.length < 2;
    if (!tabs.hidden) { const C = cols(); tabs.innerHTML = S.areas.map((a, i) => `<button type="button" role="tab" aria-selected="${i === S.cur}" data-tab="${i}"><i style="background:${C[i]}"></i>${esc(a)}</button>`).join(''); }
  }
  function render() {
    if (S.cur >= S.areas.length) S.cur = 0;
    const area = S.areas[S.cur], type = S.type, multi = S.areas.length > 1;
    root.querySelectorAll('[data-id=aname]').forEach((e) => (e.textContent = area));
    if ($('htype')) $('htype').value = type;
    drawPicker();
    put('sv', shortHTML(D, area, sh), true);
    put('types-h', `${area} at a glance`);
    put('types', typesHTML(layout, D, area, sh), true);
    put('mean', meaningHTML(D, area, sh, A), true);
    drawTrend();
    if ($('cmp')) {
      if (multi) { put('cmp-h', 'How your areas compare'); put('cmp-sub', `${type === 'all' ? 'All home types' : T1[type]}, ${D.month}.`); put('cmp', compareHTML(D, S.areas, type, sh, cols()), true); }
      else { const rows = Object.keys(D.areas).map((a) => ({ a, ...(type === 'all' ? get(D, a, 'all') : D.areas[a][type]) })).filter((r) => r.price > 0).sort((x, y) => (sh.prices ? y.price - x.price : y.yoy - x.yoy));
        const max = sh.prices ? rows[0].price : Math.max(...rows.map((r) => Math.abs(r.yoy))) || 1;
        put('cmp-h', 'How the areas compare');
        put('cmp-sub', `${type === 'all' ? 'Overall' : T1[type]} ${sh.prices ? 'benchmark price by area' : 'price change by area over the past year'}.${canPick ? ' Tap an area to add it to your comparison.' : ''}`);
        put('cmp', `<div class="rank"><div class="row rh" aria-hidden="true"><span class="nm">Area</span><span></span><span class="v">${sh.prices ? `<span>${type === 'all' ? 'Benchmark' : T1[type]} price</span>` : ''}${sh.changes ? '<small>1-yr change</small>' : ''}</span></div>` + rows.map((r) => `<${canPick ? 'button type="button"' : 'div'} class="row${r.a === area ? ' on' : ''}" data-a="${esc(r.a)}"><span class="nm">${esc(r.a)}</span><span><span class="bar" style="display:block;width:${(((sh.prices ? r.price : Math.abs(r.yoy)) / max) * 100).toFixed(1)}%"></span></span><span class="v">${sh.prices ? money(r.price) : ''}${sh.changes ? (sh.prices ? `<small>${chg(r.yoy)}</small>` : chg(r.yoy)) : ''}</span></${canPick ? 'button' : 'div'}>`).join('') + '</div>', true); }
    }
    msg();
  }
  function drawTrend() {
    if (!$('t1') && !$('t2')) return;
    const area = S.areas[S.cur], type = S.type, pt = type === 'all' ? 'composite' : type, multi = S.areas.length > 1, C = cols();
    if ($('t1')) {
      const list = S.areas.map((a, i) => ({ name: a, color: C[i], rows: priceSeries(D.history, a, pt, endKey) })), have = list.filter((s) => s.rows.length > 1);
      $('mode').hidden = !multi || have.length < 2; put('leg', multi && have.length > 1 ? have.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('') : '', true);
      if (multi && have.length > 1) {
        put('t1h', `${type === 'all' ? 'Benchmark price, all home types' : `${T1[type]} benchmark price`}${S.mode === 'pct' ? ': change over 12 months' : ''}`);
        put('tfacts', ''); multiChart($('t1'), have, { mode: S.mode, label: `${T1[type]} price by area` });
        put('t1s', S.mode === 'pct' ? 'Every area starts at 0%, so you can see which is rising or falling faster, even when prices are very different.' + (have.length < list.length ? ` No 12-month history yet for ${list.filter((s) => s.rows.length < 2).map((s) => s.name).join(', ')}.` : '') : '');
        root.querySelectorAll('[data-m]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.m === S.mode));
      } else { const ps = priceSeries(D.history, area, pt, endKey);
        put('t1h', type === 'all' ? 'Benchmark price, all home types' : `${T1[type]} benchmark price`);
        put('t1s', ps.length ? `${area} · ${monthName(ps[0][0])} to ${monthName(endKey)}` : `${area} · not enough history yet`);
        put('tfacts', sh.changes ? trendFacts(ps).map(([b, t]) => `<span><b>${b}</b> ${t}</span>`).join('') : '', true); lineChart($('t1'), ps, { label: `${T1[type]} benchmark price in ${area}` }); }
    }
    if ($('t2')) { const ss = salesSeries(D.history, area, type === 'all' ? TS : [type], endKey);
      put('t2h', `${SOLDLAB[type]} sold each month`); put('t2s', ss.rows.length > 1 ? `${ss.group === 'Grand Totals' ? 'Greater Vancouver' : ss.group}${ss.group !== area && ss.group !== 'Grand Totals' ? ' (whole area)' : ''} · ${monthName(ss.rows[0][0])} to ${monthName(endKey)}` : 'Not enough history yet');
      barChart($('t2'), ss.rows, { label: `${T1[type]} sales in ${ss.group}` }); }
  }
  if (window.ResizeObserver && ($('t1') || $('t2'))) { let w = 0, tm; new ResizeObserver(() => { const cw = root.clientWidth; if (Math.abs(cw - w) > 20) { w = cw; clearTimeout(tm); tm = setTimeout(drawTrend, 120); } }).observe(root); }
  const changed = () => { render(); opts.onAreas?.(S.areas.slice()); if (!opts.embedded && canPick) try { history.replaceState(null, '', location.pathname + location.search + '#' + areaHash(S.areas)); } catch {} };
  root.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]'); if (rm) { S.areas.splice(+rm.dataset.rm, 1); S.cur = 0; return changed(); }
    const tb = e.target.closest('[data-tab]'); if (tb) { S.cur = +tb.dataset.tab; return render(); }
    const md = e.target.closest('[data-m]'); if (md) { S.mode = md.dataset.m; return drawTrend(); }
    const rw = e.target.closest('.rank button.row'); if (rw) { const a = rw.dataset.a; if (!S.areas.includes(a) && S.areas.length < MAX_AREAS) { S.areas.push(a); S.cur = S.areas.length - 1; changed(); } else if (S.areas.includes(a)) { S.cur = S.areas.indexOf(a); render(); } if (!opts.embedded) $('types-h').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (e.target.closest('[data-id=mail]')) { const m = $('mailmenu'), open = m.hidden; m.hidden = !open; $('mail').setAttribute('aria-expanded', String(open)); return; }
    if (e.target.closest('[data-copy-email]')) { navigator.clipboard?.writeText(email).then(() => { e.target.textContent = 'Copied'; }).catch(() => {}); return; }
    if ($('mailmenu') && !$('mailmenu').hidden && !e.target.closest('.mailw')) { $('mailmenu').hidden = true; $('mail').setAttribute('aria-expanded', 'false'); }
  });
  if ($('add')) $('add').addEventListener('change', (e) => { const a = e.target.value; if (a && !S.areas.includes(a) && S.areas.length < MAX_AREAS) { S.areas.push(a); S.cur = S.areas.length - 1; changed(); } });
  if ($('htype')) $('htype').addEventListener('change', (e) => { S.type = e.target.value; render(); });
  $('where').addEventListener('input', msg);
  $('intent').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const on = b.getAttribute('aria-pressed') === 'true';
    $('intent').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', String(!on)); S.intent = on ? null : b.textContent; msg(); });
  $('copy').addEventListener('click', () => { navigator.clipboard.writeText(text()).then(() => { $('copy').textContent = 'Copied'; setTimeout(() => ($('copy').textContent = 'Copy message'), 1800); }).catch(() => {}); });
  render();
  return { setAreas: (list) => { S.areas = areaList(list, D); S.cur = 0; render(); } };
}
