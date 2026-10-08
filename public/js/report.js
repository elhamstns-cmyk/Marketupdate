// The interactive market report. mountReport(root, D, A) draws it with the agent's branding (A) and theme (A.theme).
export const TN = { detached: 'detached homes', townhome: 'townhomes', condo: 'condos' };
export const T1 = { detached: 'Detached', townhome: 'Townhome', condo: 'Condo' };
export const TYPES = ['detached', 'townhome', 'condo'];
export const money = (n) => '$' + Math.round(n).toLocaleString('en-CA');
export const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const first = (A) => (A.name || 'me').trim().split(/\s+/)[0];
export const areasOf = (D) => ['Greater Vancouver', ...Object.keys(D.areas || {}).sort()];
export const market = (r) => (r == null ? null : r < 12 ? "Buyer's market" : r <= 20 ? 'Balanced market' : "Seller's market");
export const roleLabel = (A) => (A.role === 'broker' ? 'Mortgage broker' : 'REALTOR®');

/* ---------- themes ---------- */
// label, heading font, body font, Google Fonts families to load
const F = (label, h, b, g) => ({ label, hf: `"${h}", ${/Playfair|Lora|Cormorant|DM Serif|Baskerville/.test(h) ? 'Georgia, serif' : 'system-ui, sans-serif'}`, bf: `"${b}", system-ui, sans-serif`, g });
export const FONTS = {
  modern: F('Inter', 'Inter', 'Inter', ['Inter:wght@400;500;600;700;800']),
  classic: F('Playfair', 'Playfair Display', 'DM Sans', ['Playfair+Display:wght@600;700', 'DM+Sans:wght@400;500;700']),
  friendly: F('Nunito', 'Nunito', 'Nunito', ['Nunito:wght@400;600;700;800']),
  montserrat: F('Montserrat', 'Montserrat', 'Montserrat', ['Montserrat:wght@400;500;600;700']),
  poppins: F('Poppins', 'Poppins', 'Poppins', ['Poppins:wght@400;500;600;700']),
  manrope: F('Manrope', 'Manrope', 'Manrope', ['Manrope:wght@400;500;700;800']),
  worksans: F('Work Sans', 'Work Sans', 'Work Sans', ['Work+Sans:wght@400;500;600;700']),
  raleway: F('Raleway', 'Raleway', 'Raleway', ['Raleway:wght@400;500;600;700']),
  lora: F('Lora', 'Lora', 'Inter', ['Lora:wght@500;600;700', 'Inter:wght@400;500;600;700']),
  cormorant: F('Cormorant', 'Cormorant Garamond', 'Jost', ['Cormorant+Garamond:wght@500;600;700', 'Jost:wght@400;500;600']),
  dmserif: F('DM Serif', 'DM Serif Display', 'DM Sans', ['DM+Serif+Display', 'DM+Sans:wght@400;500;700']),
  baskerville: F('Baskerville', 'Libre Baskerville', 'Source Sans 3', ['Libre+Baskerville:wght@400;700', 'Source+Sans+3:wght@400;600;700']),
};
export const fontHref = (keys) => 'https://fonts.googleapis.com/css2?' + [...new Set(keys.flatMap((k) => (FONTS[k] || FONTS.modern).g))].map((g) => 'family=' + g).join('&') + '&display=swap';
// Loads the fonts a page needs (one theme's font on a report, all of them in the dashboard).
export function loadFonts(keys) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = fontHref(keys); document.head.appendChild(l); }
export const STYLES = {
  modern: { label: 'Modern', ac: '#0f6b4f', bg: '#ffffff', font: 'modern' },
  classic: { label: 'Classic', ac: '#14233f', bg: '#f7f4ee', font: 'classic' },
  bold: { label: 'Bold', ac: '#d0a94a', bg: '#111312', font: 'modern' },
};
export const BASIC_THEME = { style: 'basic', ac: '#1d4f9c', bg: '#ffffff', font: 'modern' };
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
  const c = D.cities[area] && D.cities[area][type], a = area === 'Greater Vancouver' ? null : D.areas[area][type];
  const o = c ? { price: c.price.now, yoy: c.price.yoy, prev: c.price.prev, sales: c.sales.now, salesLy: c.sales.ly, active: c.active.now, activeLy: c.active.ly, dom: c.dom.now, domLy: c.dom.ly, ratio: c.ratio }
    : { price: a.price, yoy: a.yoy, sales: a.sales, active: a.active };
  if (o.ratio == null) o.ratio = o.active ? (o.sales / o.active) * 100 : null;
  return o;
}
export function chg(v, suffix) {
  if (v == null) return '<span class="muted small">n/a</span>';
  const c = v > 0 ? 'up' : v < 0 ? 'down' : '';
  return `<span class="chg ${c}">${v > 0 ? '▲' : v < 0 ? '▼' : '●'} ${Math.abs(v).toFixed(1)}%</span>${suffix ? ` <span class="muted small">${suffix}</span>` : ''}`;
}
export function regionSummary(D) {
  const M = D.cities['Greater Vancouver'];
  const all = TYPES.reduce((s, t) => ({ n: s.n + M[t].sales.now, l: s.l + M[t].sales.ly, a: s.a + M[t].active.now, al: s.al + M[t].active.ly }), { n: 0, l: 0, a: 0, al: 0 });
  const ys = TYPES.map((t) => M[t].price.yoy);
  const pw = ys.every((y) => y < 0) ? 'benchmark prices are lower than a year ago for every home type' : ys.every((y) => y > 0) ? 'benchmark prices are higher than a year ago for every home type' : 'price changes are mixed across home types';
  return `${all.n.toLocaleString()} homes sold across the region in ${D.month.split(' ')[0]}, compared with ${all.l.toLocaleString()} a year earlier. There are ${all.a.toLocaleString()} homes for sale, ${Math.abs(((all.a - all.al) / all.al) * 100).toFixed(0)}% ${all.a < all.al ? 'fewer' : 'more'} than last year, and ${pw}.`;
}
export function readout(D, area, type) {
  const o = get(D, area, type), mk = market(o.ratio);
  if (!o.price || !mk) return '';
  const dir = o.yoy < 0 ? `down ${Math.abs(o.yoy)}%` : o.yoy > 0 ? `up ${o.yoy}%` : 'unchanged';
  return `In ${area}, the typical ${type === 'detached' ? 'detached home' : T1[type].toLowerCase()} is ${dir} from a year ago, and ${o.sales.toLocaleString()} of ${o.active.toLocaleString()} listed ${TN[type]} sold in ${D.month.split(' ')[0]}. ` +
    (o.ratio < 12 ? 'Buyers have room to negotiate, and sellers need sharp pricing to stand out.' : o.ratio <= 20 ? 'Neither side has a clear advantage, so well-priced homes still sell.' : 'Sellers have the advantage, and buyers should be ready to move quickly.');
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

export function mountReport(root, D, A, opts = {}) {
  const AREAS = areasOf(D), multi = AREAS.length > 1, F = esc(first(A)), ask = askCopy(A);
  const S = { area: AREAS.includes(opts.area) ? opts.area : 'Greater Vancouver', type: 'detached', intent: null };
  const email = A.contact_email || '', phone = A.phone || '';
  root.classList.add('rpt'); root.style.cssText = themeVars(A.theme);
  root.innerHTML = `<div class="wrap">
<div class="mast">${whoBlock(A)}</div>
<header class="title"><p class="eyebrow">${esc(D.month)}</p><h1>Greater Vancouver Market Report</h1>
  <p class="lede">${regionSummary(D)}${multi ? ' Choose your city below to see where it stands.' : ''}</p></header>
<section><div class="metro">${TYPES.map((t) => { const m = D.cities['Greater Vancouver'][t]; return `<div><span class="lab">${T1[t]}</span><span class="num">${money(m.price.now)}</span><span>${chg(m.price.yoy, 'in a year')}</span></div>`; }).join('')}</div>
  <p class="small muted">Benchmark price is the MLS® HPI price of a typical home, compared with the same month last year.</p></section>
<section><h2 data-id="h-city">${multi ? 'Pick your city' : 'A closer look'}</h2>
  <div class="controls">${multi ? `<div class="field"><label>Area<select data-id="area">${AREAS.map((a) => `<option>${a}</option>`).join('')}</select></label></div>` : ''}
    <div class="field"><span class="lab">Home type</span><div class="seg" data-id="types" role="group" aria-label="Home type">${TYPES.map((t) => `<button type="button" data-t="${t}">${T1[t]}</button>`).join('')}</div></div></div>
  <div class="panel" aria-live="polite">
    <div class="phead"><p class="eyebrow" data-id="p-title"></p><div class="big" data-id="p-price"></div><p class="muted small" data-id="p-sub"></p><p class="chgs" data-id="p-chg"></p></div>
    <div class="gauge"><div class="ghead"><strong data-id="p-market"></strong><span class="muted small" data-id="p-ratio"></span></div>
      <div class="track"><span class="b1"></span><span class="b2"></span><span class="b3"></span><i class="pin" data-id="pin"></i></div>
      <div class="bands"><span>Buyer's</span><span>Balanced</span><span>Seller's</span></div>
      <p class="small muted">The share of listed homes that sold this month. Under 12% favours buyers, over 20% favours sellers.</p></div>
    <div class="stats" data-id="p-stats"></div><p data-id="p-read"></p></div></section>
${multi ? `<section><h2>How the areas compare</h2><p class="muted small" data-id="rank-sub"></p><div class="rank" data-id="rank"></div></section>` : ''}
<section class="ask"><div class="askwho">${A.photo ? `<img class="av" src="${esc(A.photo)}" alt="">` : ''}<div><div class="nm">${esc(A.name || '')}</div><div class="rl">${[roleLabel(A), A.brokerage].filter(Boolean).map(esc).join(' · ')}</div></div></div><h2>${ask.h}</h2><p>${ask.p}</p>
  <div class="field"><label>${ask.lab}<input type="text" data-id="where" placeholder="${ask.ph}"></label></div>
  <div><span class="lab">I am</span><div class="chips" data-id="intent" role="group" aria-label="I am">${ask.chips.map((c) => `<button type="button">${esc(c)}</button>`).join('')}</div></div>
  <div><span class="lab">Your message to ${F}</span><p class="msg" data-id="msg"></p></div>
  <div class="btns">${email ? `<a class="btn" data-id="mail" href="#">Email ${F}</a>` : ''}${phone ? `<a class="btn alt" data-id="sms" href="#">Text ${F}</a>` : ''}<button class="btn alt" type="button" data-id="copy">Copy message</button></div>
  <div class="contact">${email ? `<span>${esc(email)}</span>` : ''}${phone ? `<span>${esc(phone)}</span>` : ''}${A.website ? `<span>${esc(A.website.replace(/^https?:\/\//, ''))}</span>` : ''}</div></section>
<div class="sign">${whoBlock(A)}</div>
<footer>${esc(sourceLine(D))}</footer></div>`;
  const $ = (id) => root.querySelector(`[data-id="${id}"]`);

  function text() {
    const w = $('where').value.trim() || (S.area === 'Greater Vancouver' ? 'my area' : S.area);
    return ask.msg(w, S.type, S.intent);
  }
  function msg() {
    const t = text(); $('msg').textContent = t;
    if ($('mail')) $('mail').href = `mailto:${email}?subject=${encodeURIComponent(ask.subj)}&body=${encodeURIComponent(t)}`;
    if ($('sms')) $('sms').href = `sms:+1${phone.replace(/\D/g, '')}?&body=${encodeURIComponent(t)}`;
  }
  function render() {
    const { area, type } = S, o = get(D, area, type);
    if ($('area')) $('area').value = area;
    $('types').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.t === type));
    $('p-title').textContent = area; $('p-sub').textContent = `${T1[type]} benchmark price`;
    $('p-price').textContent = o.price ? money(o.price) : 'No benchmark';
    let c = o.price ? chg(o.yoy, 'vs. ' + D.month.replace(/\d+$/, (y) => y - 1)) : '<span class="muted small">Too few sales here for a reliable benchmark.</span>';
    if (o.prev && o.price) { const m = ((o.price - o.prev) / o.prev) * 100; c = `<span>${c}</span><span>${chg(Math.round(m * 10) / 10, 'vs. last month')}</span>`; }
    $('p-chg').innerHTML = c;
    const mk = market(o.ratio);
    $('p-market').textContent = mk || 'Not enough activity to call';
    $('p-ratio').textContent = o.ratio != null ? `${o.ratio.toFixed(1)}% of listings sold` : '';
    $('pin').hidden = o.ratio == null; $('pin').style.left = (Math.min(o.ratio || 0, 40) / 40) * 100 + '%';
    const st = [['Homes sold', o.sales.toLocaleString(), o.salesLy != null ? `${o.salesLy.toLocaleString()} a year ago` : ''],
      ['Homes for sale', o.active.toLocaleString(), o.activeLy != null ? `${o.activeLy.toLocaleString()} a year ago` : ''],
      ['Average days to sell', o.dom != null ? o.dom : `Ask ${F}`, o.dom != null ? `${o.domLy} a year ago` : "Not in this month's summary"]];
    $('p-stats').innerHTML = st.map((s) => `<div><span class="lab">${s[0]}</span><span class="num">${s[1]}</span><span class="sub">${s[2]}</span></div>`).join('');
    $('p-read').textContent = readout(D, area, type);
    if (multi) {
      const rows = Object.keys(D.areas).map((a) => ({ a, ...D.areas[a][type] })).filter((r) => r.price > 0).sort((x, y) => y.price - x.price);
      const max = rows[0].price;
      $('rank-sub').textContent = `${T1[type]} benchmark price by area, with the change from a year ago. Tap an area to see its details.`;
      $('rank').innerHTML = rows.map((r) => `<button type="button" class="row${r.a === area ? ' on' : ''}" data-a="${r.a}"><span class="nm">${r.a}</span><span><span class="bar" style="display:block;width:${((r.price / max) * 100).toFixed(1)}%"></span></span><span class="v">${money(r.price)}<small>${chg(r.yoy)}</small></span></button>`).join('');
    }
    msg();
  }
  function setArea(a, scroll) { S.area = a; render(); if (scroll) $('h-city').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  if ($('area')) $('area').addEventListener('change', (e) => setArea(e.target.value));
  $('types').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { S.type = b.dataset.t; render(); } });
  if ($('rank')) $('rank').addEventListener('click', (e) => { const b = e.target.closest('.row'); if (b) setArea(b.dataset.a, !opts.embedded); });
  $('where').addEventListener('input', msg);
  $('intent').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const on = b.getAttribute('aria-pressed') === 'true';
    $('intent').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', String(!on)); S.intent = on ? null : b.textContent; msg(); });
  $('copy').addEventListener('click', () => { navigator.clipboard.writeText(text()).then(() => { $('copy').textContent = 'Copied'; setTimeout(() => ($('copy').textContent = 'Copy message'), 1800); }).catch(() => {}); });
  render();
}
