import { priceSeries, salesSeries, trendFacts, lineChart, barChart } from './charts.js';
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
export const roleLabel = (A) => (A.role === 'broker' ? 'Mortgage broker' : 'REALTOR®');

/* ---------- what the agent chooses to show (Pro) ---------- */
export const SHOW_NUMBERS = [['prices', 'Benchmark prices'], ['changes', 'Price changes'], ['sold', 'Homes sold'], ['forsale', 'Homes for sale'], ['days', 'Days to sell'], ['market', 'Market type']];
export const SHOW_SECTIONS = [['summary', 'Written summary'], ['trend', '12-month trend'], ['compare', 'Area comparison'], ['picker', 'Clients can pick a city']];
export const DEFAULT_SHOW = { prices: true, changes: true, sold: true, forsale: true, days: true, market: true, detached: true, townhome: true, condo: true, summary: true, trend: true, compare: true, picker: true };
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
export const STYLES = {
  modern: { label: 'Modern', ac: '#0f6b4f', bg: '#ffffff', font: 'modern' },
  classic: { label: 'Classic', ac: '#14233f', bg: '#f7f4ee', font: 'classic' },
  bold: { label: 'Bold', ac: '#d0a94a', bg: '#111312', font: 'modern' },
};
export const BASIC_THEME = { style: 'basic', ac: '#1d4f9c', bg: '#ffffff', font: 'modern', cover: 'b' };
export const COVERS = { b: 'Portrait', a: 'Round photo', c: 'Agent on top' };
// When some home types are hidden, totals only count the ones shown, so say which.
export const typesNote = (sh) => { const ts = TYPES.filter((t) => sh[t]); return ts.length < 3 ? `${ts.map((t) => ({ detached: 'Detached homes', townhome: 'townhomes', condo: 'condos' })[t]).join(' and ').replace(/^./, (c) => c.toUpperCase())} only` : ''; };
const hex = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
export const lum = (h) => { const c = hex(h) || [255, 255, 255]; const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
export const mix = (a, b, t) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join(''); };
// Turns a saved theme into the full set of colours the report uses.
export function palette(theme) {
  const t = { ...STYLES.modern, ...(theme || {}) };
  const bg = hex(t.bg) ? t.bg : '#ffffff', ac = hex(t.ac) ? t.ac : '#0f6b4f', f = FONTS[t.font] || FONTS.modern;
  const ink = lum(bg) < 0.35 ? '#f4f2ec' : '#10201a';
  const act = contrast(ac, bg) < 2.6 ? ink : ac; // accent used as text must stay readable
  const fill = contrast(ac, bg) < 1.4 ? ink : ac; // accent used as a button must be visible
  return { bg, ac, ink, act, fill, bt: contrast(fill, '#111312') > contrast(fill, '#ffffff') ? '#111312' : '#ffffff', tn: mix(fill, bg, 0.09), ln: mix(ink, bg, 0.15), mut: mix(ink, bg, 0.62), hf: f.hf, bf: f.bf };
}
export const themeVars = (theme) => { const p = palette(theme); return `--bg:${p.bg};--ink:${p.ink};--ac:${p.fill};--act:${p.act};--bt:${p.bt};--tn:${p.tn};--ln:${p.ln};--mut:${p.mut};--hf:${p.hf};--bf:${p.bf}`; };

/* ---------- sample agents shown on the landing page ---------- */
const svgLogo = (path, c) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">${path.replaceAll('CUR', c)}</svg>`);
export const SAMPLES = {
  sarah: { name: 'Sarah Mitchell', role: 'realtor', brokerage: 'Westbrook Realty', phone: '604-555-0104', contact_email: 'sarah@example.com', photo: '/img/sample-sarah.jpg', theme: { style: 'modern', ...STYLES.modern },
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
  const c = v > 0 ? 'up' : v < 0 ? 'down' : '';
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

// opts.area: open on this area. opts.city: lock the report to that one city (a city report).
export function mountReport(root, D, A, opts = {}) {
  const AREAS = areasOf(D), F = esc(first(A)), ask = askCopy(A), sh = showOf(A), TS = typesOf(sh);
  const start = AREAS.includes(opts.area) ? opts.area : 'Greater Vancouver', city = opts.city && start !== 'Greater Vancouver';
  const multi = AREAS.length > 1 && !city && sh.picker !== false, TX = TS.length > 1 ? ['all', ...TS] : TS, S = { area: start, type: TX[0], intent: null };
  const anyPrice = sh.prices || sh.changes, stats = [['sold', 'Homes sold'], ['forsale', 'Homes for sale'], ['days', 'Average days to sell']].filter(([k]) => sh[k]);
  const showRank = AREAS.length > 1 && sh.compare && anyPrice;
  const email = A.contact_email || '', phone = A.phone || '', head = city ? start : 'Greater Vancouver';
  const endKey = monthKey(D.month), showTrend = sh.trend && D.history && (anyPrice || sh.sold);
  const lede = sh.summary ? summary(D, head, sh) + (multi ? ' Choose your city below to see where it stands.' : '') : (multi ? 'Choose your city below to see where it stands.' : '');
  root.classList.add('rpt'); root.style.cssText = themeVars(A.theme);
  root.innerHTML = `<div class="wrap">
<div class="mast">${whoBlock(A)}</div>
<header class="title"><p class="monthpill"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>${esc(D.month)} report</p><h1 data-id="h1">${esc(head)} Market Report</h1><p class="lede" data-id="lede"${lede ? '' : ' hidden'}>${esc(lede)}</p></header>
${anyPrice ? `<section><div class="metro" data-id="metro" style="--n:${TS.length}"></div>
  <p class="small muted">${sh.prices ? 'Benchmark price is the MLS® HPI price of a typical home' : 'Change in the MLS® HPI benchmark price of a typical home'}${sh.changes && sh.prices ? ', compared with the same month last year' : sh.changes ? ' over the past year' : ''}.</p></section>` : ''}
<section><h2 data-id="h-city">${multi ? 'Pick your city' : 'A closer look'}</h2>
  <div class="controls">${multi ? `<div class="field"><label>Area<select data-id="area">${AREAS.map((a) => `<option>${a}</option>`).join('')}</select></label></div>` : ''}
    ${TX.length > 1 ? `<div class="field"><span class="lab">Home type</span><div class="seg" data-id="types" role="group" aria-label="Home type">${TX.map((t) => `<button type="button" data-t="${t}">${t === 'all' ? 'All' : T1[t]}</button>`).join('')}</div></div>` : ''}</div>
  <div class="panel" aria-live="polite">
    <div class="phead"><p class="eyebrow" data-id="p-title"></p>${sh.prices ? '<div class="big" data-id="p-price"></div>' : ''}<p class="muted small" data-id="p-sub"></p>${sh.changes ? '<p class="chgs" data-id="p-chg"></p>' : ''}</div>
    ${sh.market ? `<div class="gauge"><div class="ghead"><strong data-id="p-market"></strong><span class="muted small" data-id="p-ratio"></span></div>
      <div class="track"><span class="b1"></span><span class="b2"></span><span class="b3"></span><i class="pin" data-id="pin"></i></div>
      <div class="bands"><span>Buyer's</span><span>Balanced</span><span>Seller's</span></div>
      <p class="small muted">The share of listed homes that sold this month. Under 12% favours buyers, over 20% favours sellers.</p></div>` : ''}
    ${stats.length ? `<div class="stats" data-id="p-stats" style="--n:${stats.length}"></div>` : ''}${sh.summary ? '<p data-id="p-read"></p>' : ''}</div></section>
${showTrend ? `<section class="trend"><h2>The last 12 months</h2>${sh.changes ? '<div class="tfacts" data-id="tfacts"></div>' : ''}
  ${anyPrice ? '<div class="tchart"><div class="tch"><b data-id="t1h"></b><span data-id="t1s"></span></div><div class="tcv" data-id="t1"></div></div>' : ''}
  ${sh.sold ? '<div class="tchart"><div class="tch"><b data-id="t2h"></b><span data-id="t2s"></span></div><div class="tcv" data-id="t2"></div></div>' : ''}</section>` : ''}
${showRank ? `<section><h2>How the areas compare</h2><p class="muted small" data-id="rank-sub"></p><div class="rank" data-id="rank"></div></section>` : ''}
<section class="ask"><div class="askwho">${A.photo ? `<img class="av" src="${esc(A.photo)}" alt="">` : ''}<div><div class="nm">${esc(A.name || '')}</div><div class="rl">${[roleLabel(A), A.brokerage].filter(Boolean).map(esc).join(' · ')}</div></div></div><h2>${ask.h}</h2><p>${ask.p}</p>
  <div class="field"><label>${ask.lab}<input type="text" data-id="where" placeholder="${ask.ph}"></label></div>
  <div><span class="lab">I am</span><div class="chips" data-id="intent" role="group" aria-label="I am">${ask.chips.map((c) => `<button type="button">${esc(c)}</button>`).join('')}</div></div>
  <div><span class="lab">Your message to ${F}</span><p class="msg" data-id="msg"></p></div>
  <div class="btns">${email ? `<a class="btn" data-id="mail" href="#">Email ${F}</a>` : ''}${phone ? `<a class="btn alt" data-id="sms" href="#">Text ${F}</a>` : ''}<button class="btn alt" type="button" data-id="copy">Copy message</button></div>
  <div class="contact">${email ? `<span>${esc(email)}</span>` : ''}${phone ? `<span>${esc(phone)}</span>` : ''}${A.website ? `<span>${esc(A.website.replace(/^https?:\/\//, ''))}</span>` : ''}</div></section>
<div class="sign">${whoBlock(A)}</div>
<footer>${esc(sourceLine(D))}</footer></div>`;
  const $ = (id) => root.querySelector(`[data-id="${id}"]`), put = (id, v, html) => { const e = $(id); if (e) e[html ? 'innerHTML' : 'textContent'] = v; };

  function text() {
    const w = $('where').value.trim() || (S.area === 'Greater Vancouver' ? 'my area' : S.area);
    return ask.msg(w, S.type, S.intent);
  }
  function msg() {
    const t = text(); $('msg').textContent = t;
    if ($('mail')) $('mail').href = `mailto:${email}?subject=${encodeURIComponent(ask.subj)}&body=${encodeURIComponent(t)}`;
    if ($('sms')) { const d = phone.replace(/\D/g, ''); $('sms').href = `sms:+${d.length === 11 && d[0] === '1' ? d : '1' + d}?&body=${encodeURIComponent(t)}`; }
  }
  function render() {
    const { area, type } = S, o = get(D, area, type);
    if ($('area')) $('area').value = area;
    if ($('types')) $('types').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.t === type));
    put('h1', `${area} Market Report`);
    if (sh.summary && area !== head) put('lede', summary(D, area, sh)); else if (sh.summary) put('lede', lede);
    if ($('metro')) put('metro', TS.map((t) => { const m = get(D, area, t); return `<div><span class="lab">${T1[t]}</span>${sh.prices ? `<span class="num">${m.price ? money(m.price) : 'n/a'}</span>` : ''}<span>${sh.changes && m.price ? chg(m.yoy, 'in a year') : ''}</span></div>`; }).join(''), true);
    put('p-title', area); put('p-sub', type === 'all' ? (anyPrice ? 'Benchmark price, all home types' : 'All home types') : anyPrice ? `${T1[type]} benchmark price` : T1[type]);
    put('p-price', o.price ? money(o.price) : 'No benchmark');
    let c = o.price ? chg(o.yoy, 'vs. ' + D.month.replace(/\d+$/, (y) => y - 1)) : '<span class="muted small">Too few sales here for a reliable benchmark.</span>';
    if (o.prev && o.price) { const m = ((o.price - o.prev) / o.prev) * 100; c = `<span>${c}</span><span>${chg(Math.round(m * 10) / 10, 'vs. last month')}</span>`; }
    put('p-chg', c, true);
    if (sh.market) { const mk = market(o.ratio); put('p-market', mk || 'Not enough activity to call'); put('p-ratio', o.ratio != null ? `${o.ratio.toFixed(1)}% of listings sold` : '');
      $('pin').hidden = o.ratio == null; $('pin').style.left = (Math.min(o.ratio || 0, 40) / 40) * 100 + '%'; }
    const yr = (now, ly) => (ly ? `${chgN(((now - ly) / ly) * 100)} <span class="muted">from ${ly.toLocaleString()} a year ago</span>` : '');
    const vals = { sold: [o.sales.toLocaleString(), yr(o.sales, o.salesLy)], forsale: [o.active.toLocaleString(), yr(o.active, o.activeLy)],
      days: [o.dom != null ? o.dom : `Ask ${F}`, o.dom != null ? yr(o.dom, o.domLy) : "Not in this month's summary"] };
    put('p-stats', stats.map(([k, l]) => `<div><span class="lab">${l}</span><span class="num">${vals[k][0]}</span><span class="sub">${vals[k][1]}</span></div>`).join(''), true);
    put('p-read', readout(D, area, type, sh));
    if (showTrend) drawTrend();
    if (showRank) {
      const rows = Object.keys(D.areas).map((a) => ({ a, ...(type === 'all' ? get(D, a, 'all') : D.areas[a][type]) })).filter((r) => r.price > 0).sort((x, y) => (sh.prices ? y.price - x.price : y.yoy - x.yoy));
      const max = sh.prices ? rows[0].price : Math.max(...rows.map((r) => Math.abs(r.yoy))) || 1;
      put('rank-sub', `${type === 'all' ? 'Overall' : T1[type]} ${sh.prices ? 'benchmark price by area' : 'price change by area over the past year'}${sh.prices && sh.changes ? ', with the change from a year ago' : ''}.${multi ? ' Tap an area to see its details.' : ''}`);
      const hdr = `<div class="row rh" aria-hidden="true"><span class="nm">Area</span><span></span><span class="v">${sh.prices ? `<span>${type === 'all' ? 'Benchmark' : T1[type]} price</span>` : ''}${sh.changes ? `<small>1-yr change</small>` : ''}</span></div>`;
      put('rank', hdr + rows.map((r) => `<${multi ? 'button type="button"' : 'div'} class="row${r.a === area ? ' on' : ''}" data-a="${r.a}"><span class="nm">${r.a}</span><span><span class="bar" style="display:block;width:${(((sh.prices ? r.price : Math.abs(r.yoy)) / max) * 100).toFixed(1)}%"></span></span><span class="v">${sh.prices ? money(r.price) : ''}${sh.changes ? (sh.prices ? `<small>${chg(r.yoy)}</small>` : chg(r.yoy)) : ''}</span></${multi ? 'button' : 'div'}>`).join(''), true);
    }
    msg();
  }
  function drawTrend() {
    const { area, type } = S, ps = priceSeries(D.history, area, type === 'all' ? 'composite' : type, endKey), first = ps[0]?.[0];
    if ($('t1')) { put('t1h', type === 'all' ? 'Benchmark price, all home types' : `${T1[type]} benchmark price`); put('t1s', ps.length ? `${area} · ${monthName(first)} to ${monthName(endKey)}` : `${area} · not enough history yet`); lineChart($('t1'), ps, { label: `${T1[type]} benchmark price in ${area}` }); }
    if ($('tfacts')) put('tfacts', trendFacts(ps).map(([b, t]) => `<span><b>${b}</b> ${t}</span>`).join(''), true);
    if ($('t2')) { const ss = salesSeries(D.history, area, type === 'all' ? TS : [type], endKey);
      put('t2h', `${SOLDLAB[type]} sold each month`); put('t2s', ss.rows.length > 1 ? `${ss.group === 'Grand Totals' ? 'Greater Vancouver' : ss.group}${ss.group !== area && ss.group !== 'Grand Totals' ? ' (whole area)' : ''} · ${monthName(ss.rows[0][0])} to ${monthName(endKey)}` : 'Not enough history yet');
      barChart($('t2'), ss.rows, { label: `${T1[type]} sales in ${ss.group}` }); }
  }
  if (showTrend && window.ResizeObserver) { let w = 0, tm; new ResizeObserver(() => { const cw = root.clientWidth; if (Math.abs(cw - w) > 20) { w = cw; clearTimeout(tm); tm = setTimeout(drawTrend, 120); } }).observe(root); }
  function setArea(a, scroll) { S.area = a; render(); if (scroll) $('h-city').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  if ($('area')) $('area').addEventListener('change', (e) => setArea(e.target.value));
  if ($('types')) $('types').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { S.type = b.dataset.t; render(); } });
  if ($('rank') && multi) $('rank').addEventListener('click', (e) => { const b = e.target.closest('.row'); if (b) setArea(b.dataset.a, !opts.embedded); });
  $('where').addEventListener('input', msg);
  $('intent').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const on = b.getAttribute('aria-pressed') === 'true';
    $('intent').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', String(!on)); S.intent = on ? null : b.textContent; msg(); });
  $('copy').addEventListener('click', () => { navigator.clipboard.writeText(text()).then(() => { $('copy').textContent = 'Copied'; setTimeout(() => ($('copy').textContent = 'Copy message'), 1800); }).catch(() => {}); });
  render();
}
