// The interactive market report: a page of cards (sections) the agent chooses and orders.
// mountReport(root, D, A, opts) draws it with the agent's branding (A) and layout (A.show).
import { get, money, esc, slug, areasOf, themeVars, palette, mix, lum, phoneFmt, roleLabel, askCopy, first, sourceLine, market, monthKey, TN } from './report.js';
import { salesGroup, salesByArea, soldStory, monthLong, typesStoryOne, typesStoryAreas, dollarChange, NUM_PERIODS, periodMonth, numbersChange, typeChange } from './charts.js';
import { makeHoods } from './hoods.js';

/* ---------- sections and layout ---------- */
// The section list and layout rules live in layout.js (shared with the server). Re-exported here for app.js.
import { SECTIONS, SEC_IDS, MAX_AREAS, TYPE_KEYS, DEFAULT_LAYOUT, cleanConf, cleanHoods, sameLayout, layoutOf as layoutFrom } from './layout.js';
export { SECTIONS, SEC_IDS, MAX_AREAS, TYPE_KEYS, DEFAULT_LAYOUT, cleanConf, cleanHoods, sameLayout };
// One calm look for every report: white cards on soft grey, blue accent, Inter.
export const CALM = { style: 'calm', ac: '#1d4fbf', bg: '#ffffff', font: 'modern' };
// The agent's saved layout, cleaned against this month's data.
export const layoutOf = (A, D) => layoutFrom(A && A.show, D ? areasOf(D) : null);
// Which sections can be set to half or full width, and which use areas or home types.
export const PAIRABLE = ['trend', 'market', 'summary', 'sold'];
export const USES_TYPES = ['market', 'types', 'growth', 'sold'];
export const USES_AREAS = ['numbers', 'trend', 'market', 'types', 'growth', 'summary', 'sold'];

/* ---------- small helpers ---------- */
const COL = ['#2f6fe0', '#e5892c', '#1f9a55', '#8e4fd0', '#d64f7a', '#1a9fb0'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const addM = (k, n) => { let [y, m] = k.split('-').map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return `${y}-${String(m).padStart(2, '0')}`; };
const mName = (k) => MON[+k.slice(5) - 1];
const N = (n) => Number(n).toLocaleString('en-CA');
const pctOf = (now, then) => (now != null && then ? Math.round(((now - then) / then) * 1000) / 10 : null);
const signed = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%';
const arrow = (v, tail = '') => (v == null ? '<span class="na">not published</span>'
  : `<span class="ch ${v < 0 ? 'dn' : v > 0 ? 'upv' : ''}"><i>${v < 0 ? '▼' : v > 0 ? '▲' : '●'}</i>${Math.abs(v).toFixed(1)}%${tail ? ` <span>${tail}</span>` : ''}</span>`);
const dot = (c) => `<i class="dt" style="background:${c}"></i>`;
const mkt = (r) => (r == null ? null : r < 12 ? "Buyer's" : r <= 20 ? 'Balanced' : "Seller's");
const TYPE_ROWS = [['detached', 'Detached'], ['townhome', 'Townhouse'], ['condo', 'Condo']];
const HOUSE = {
  detached: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  townhome: '<path d="M2 11 6 7l4 4 4-4 4 4 4-4"/><path d="M3 10v9h18v-9"/><path d="M6 19v-4M12 19v-4M18 19v-4"/>',
  condo: '<path d="M5 20V9h5v11"/><path d="M10 20V4h9v16"/><path d="M13 8h3M13 12h3M13 16h3"/><path d="M3 20h18"/>',
  composite: '<path d="M3 12 9 7l6 5"/><path d="M5 11v8h8v-8"/><path d="M14 9l3-2 4 3v9h-6"/>',
};
// Small line icons for Key numbers (S1).
const KN_IC = { price: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  sold: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>', dom: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  sale: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-6h6v6"/>', all: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' };
const knIc = (k) => `<svg class="kn-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${KN_IC[k]}</svg>`;
const house = (k, s = 30) => `<svg class="hs" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${HOUSE[k]}</svg>`;
const short = (v) => (v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : '$' + Math.round(v / 1000) + 'K');
function niceStep(range, n) { const raw = range / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }

/* ---------- the report ---------- */
// opts.area: open on this area. opts.areas: open with these areas. opts.embedded: inside the dashboard.
export function mountReport(root, D, A, opts = {}) {
  A = A && A.phone ? { ...A, phone: phoneFmt(A.phone) } : A || {};
  const L = layoutOf(A, D), ED = typeof opts.edit === 'function', ALL = areasOf(D), endKey = monthKey(D.month), mon = D.month.split(' ')[0];
  const lastYear = D.month.replace(/\d+$/, (y) => y - 1), F = esc(first(A)), ask = askCopy(A);
  let start = L.areas;
  if (opts.areas?.length) { const x = opts.areas.filter((a) => ALL.includes(a)); if (x.length) start = x.slice(0, MAX_AREAS); }
  else if (opts.area && ALL.includes(opts.area) && opts.area !== 'Greater Vancouver') start = L.areas.includes(opts.area) ? L.areas : [opts.area];
  const S = { areas: [...start], focus: opts.area && start.includes(opts.area) ? opts.area : start[0], view: L.view, soldArea: null, soldView: 'bars', gType: 'composite', gYears: 2, tType: null, tPer: 'y1', intent: null, nPer: 'y1' };
  const canEdit = (ED || L.clientAreas) && ALL.length > 1;
  const XTRA = [], colour = (a) => { let i = S.areas.indexOf(a); if (i < 0) { if (!XTRA.includes(a)) XTRA.push(a); i = S.areas.length + XTRA.indexOf(a); } return COL[i % COL.length]; };
  const CF = (k) => L.conf[k] || {};
  const areasFor = (k) => CF(k).areas || shown();
  const typesFor = (k) => TYPE_ROWS.filter(([t]) => !CF(k).types || CF(k).types.includes(t));
  const shown = () => (S.view === 'one' && S.areas.length > 1 ? [S.focus] : S.areas);
  const all = (a) => get(D, a, 'all');

  const TH = CALM, p = palette(TH), dark = lum(p.bg) < 0.35;
  root.classList.add('bd'); root.classList.toggle('dark', dark);
  root.style.cssText = themeVars(TH) + `;--ink:#1b2430;--mut:#6b7380;--ln:#e6e8ee;--pg:${dark ? p.bg : '#f3f4f7'};--card:${dark ? mix(p.ink, p.bg, 0.07) : p.bg};--dn:${dark ? '#ff7d6b' : '#d6452f'};--up:${dark ? '#4fc98b' : '#1a8f4e'};--hl:${mix(p.fill, p.bg, 0.1)};--soft:${mix(p.fill, p.bg, 0.28)};--bar:#4f86e8`;
  // Neighbourhoods keep their own state (the client's area, what they looked at) while the rest of the report redraws.
  const HO = D.hoods && Object.keys(D.hoods).length ? makeHoods({ D, A, conf: CF('hoods'), areas: start, colour, edit: ED || !!opts.embedded, personal: opts.personal, vars: root.style.cssText,
    track: ED || opts.embedded ? null : opts.track, onCity: ED ? (c) => saveLayout({ conf: { ...L.conf, hoods: { ...CF('hoods'), city: c, home: undefined, cmp: undefined } } }) : null }) : null;

  /* ----- section renderers: each returns [html, after-draw hook] ----- */
  const card = (id, h, sub, body, extra = '', raw) => { const c = raw ? {} : CF(id); if (c.title) h = esc(c.title); if (c.sub === false) sub = '';
    return `<section class="cd cd-${id}" data-sec="${id}"><div class="ch-h"><div><h3>${h}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${extra}</div>${body}</section>`; };
  const note = (k, t) => (CF(k).note === false ? '' : `<p class="note">${t}</p>`);
  const R = {};
  R.numbers = () => {
    const sh = areasFor('numbers'), per = S.nPer, since = periodMonth(endKey, per), old = !['m1', 'y1'].includes(per);
    // The blue "since Sep 2025" words are a menu: picking another time changes every change in this section.
    const pick = (pre) => `<span class="kn-sel">${pre}${since}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      <select data-nper aria-label="Show the change since">${NUM_PERIODS.map(([k, l]) => `<option value="${k}"${k === per ? ' selected' : ''}>${l === 'last month' ? 'Last month' : l + ' ago'}</option>`).join('')}</select></span>`;
    const none = (v) => `<span class="na">${v}</span>`, miss = (isPrice) => none(isPrice ? 'not published' : old ? 'No number yet for' : 'no comparison published');
    const days = (d) => `<span class="ch ${d < 0 ? 'dn' : d > 0 ? 'upv' : ''}"><i>${d < 0 ? '▼' : d > 0 ? '▲' : '●'}</i>${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'}</span>`;
    const chOf = (a) => numbersChange(all(a), per, D.growth?.composite?.[a]);
    if (sh.length === 1) {
      const a = sh[0], o = all(a), c = chOf(a), line = (v, isPrice) => (v == null ? `${miss(isPrice)} ${pick('')}` : `${arrow(v)} ${pick('since ')}`);
      const k = (ic, lab, val, chg, say, cls = '') => `<div class="kpi ${cls}"><span class="kl">${knIc(ic)}${lab}</span><b class="kv">${val}</b><span class="kc">${chg}</span><span class="kn-s">${say}</span></div>`;
      const h = CF('numbers').title ? esc(CF('numbers').title) : `Key numbers · ${esc(a)}`;
      return `<section class="kn" data-sec="numbers"><h3 class="kn-h">${knIc('all')}${h}</h3><div class="kn-k">
        ${k('price', 'Benchmark price', o.price ? money(o.price) : '—', line(c.price, true), 'The price of a standard home here (MLS® HPI)', 'kn-p')}
        <div class="kn-pr"><span class="kn-tag">Sold in ${mon}</span>
          ${k('sold', 'Homes sold', o.sales != null ? N(o.sales) : '—', line(c.sales), `Sales that closed in ${mon}`)}
          ${k('dom', 'Average days on market', o.dom != null ? `${o.dom} days` : '—', o.dom == null ? none('not published') : c.dom == null ? `${miss()} ${pick('')}` : `${days(c.dom)} ${pick('since ')}`, 'How long those homes were listed before they sold')}</div>
        ${k('sale', 'Homes for sale', o.active != null ? N(o.active) : '—', line(c.active), `Listed at the end of ${mon}`, 'kn-f')}
      </div></section>`;
    }
    // Several areas: one panel, a title on top of each column, one row per area with a small bar or little houses.
    const pill = (v, tail = '%') => (v == null ? `<span class="kn-pl kn-na">${old ? 'No number yet' : 'not published'}</span>`
      : `<span class="kn-pl ${v < 0 ? 'kn-dn' : v > 0 ? 'kn-up' : ''}"><i>${v < 0 ? '▼' : v > 0 ? '▲' : '●'}</i>${tail === '%' ? Math.abs(v).toFixed(1) + '%' : `${Math.abs(v)} day${Math.abs(v) === 1 ? '' : 's'}`}</span>`);
    const GV = 'Greater Vancouver', rows = [...sh.filter((a) => a === GV), ...sh.filter((a) => a !== GV)];
    const R1 = rows.map((a) => ({ a, gv: a === GV, o: all(a), c: chOf(a) })), cities = R1.filter((r) => !r.gv);
    const max = (k) => Math.max(1, ...cities.map((r) => r.o[k] || 0));
    // One house stands for 10, 20, 50 or 100 homes sold (100 to 1,000 for sale), so the longest row stays short.
    const unit = (m, steps) => steps.find((x) => m / x <= 16) || steps[steps.length - 1];
    const perS = unit(max('sales'), [10, 20, 50, 100, 200]), perA = unit(max('active'), [100, 200, 500, 1000, 2000]);
    const H = 'M3 10.5 12 3l9 7.5V21H3z', home = (f) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${H}" fill="#dfe8f8"/>${f > 0 ? `<svg width="${(f * 24).toFixed(1)}" height="24" viewBox="0 0 ${(f * 24).toFixed(1)} 24"><path d="${H}" fill="#4f86e8"/></svg>` : ''}</svg>`;
    const homes = (n, k) => { if (n == null) return ''; const full = Math.floor(n / k), part = (n % k) / k; return `<span class="kn-hs">${home(1).repeat(full)}${part > 0.05 ? home(part) : ''}</span>`; };
    const bar = (v, m) => `<span class="kn-bar">${v ? `<span style="width:${Math.min(100, (v / m) * 100).toFixed(0)}%"></span>` : ''}</span>`;
    const mP = max('price') * 1.12, mD = Math.max(60, max('dom') * 1.2);
    const cols = [
      ['price', 'Benchmark price', 'Price of a standard home', (r) => [bar(r.o.price, mP), r.o.price ? money(r.o.price) : '—', r.c.price == null ? `<span class="kn-pl kn-na">not published</span>` : pill(r.c.price)]],
      ['sold', 'Homes sold', 'How many sold', (r) => [homes(r.o.sales, perS), r.o.sales != null ? N(r.o.sales) : '—', pill(r.c.sales)]],
      ['dom', 'Days on market', 'Average, for homes sold', (r) => [bar(r.o.dom, mD), r.o.dom != null ? `${r.o.dom} days` : '—', r.o.dom == null ? `<span class="kn-pl kn-na">not published</span>` : pill(r.c.dom, 'd')]],
      ['sale', 'Homes for sale', `At the end of ${mon}`, (r) => [homes(r.o.active, perA), r.o.active != null ? N(r.o.active) : '—', pill(r.c.active)]],
    ];
    const ttl = (ic, h, s2) => `<div class="kn-th"><span class="kn-tt">${knIc(ic)}${h}</span><span class="kn-ts">${s2}</span></div>`;
    const name = (r) => `<span class="kn-an">${dot(colour(r.a))}${esc(r.a)}</span>`;
    // Greater Vancouver is the whole region (about 20 times a city), so it shows numbers only.
    const val = (r, f) => { const [vis, v, ch] = f(r); return `${r.gv ? '' : vis}<span class="kn-ln"><b>${v}</b>${ch}</span>`; };
    const grid = `<div class="kn-g"><div class="kn-gs"></div><div class="kn-gs"></div><div class="kn-gh">Sold in ${mon}</div><div class="kn-gs"></div>
      <div class="kn-th kn-ta"><span class="kn-ts">Area</span></div>${cols.map(([ic, h, s2]) => ttl(ic, h, s2)).join('')}
      ${R1.map((r) => `<div class="kn-c${r.gv ? ' kn-gv' : ''}">${name(r)}</div>${cols.map((c) => `<div class="kn-c kn-sp${r.gv ? ' kn-gv' : ''}">${val(r, c[3])}</div>`).join('')}`).join('')}</div>`;
    // On a phone each column becomes its own block, title on top.
    const blocks = cols.map(([ic, h, s2, f]) => `<div class="kn-b">${ttl(ic, h, ic === 'sold' || ic === 'dom' ? `${s2}, ${mon}` : s2)}${R1.map((r) => { const [vis, v, ch] = f(r);
      return `<div class="kn-br${r.gv ? ' kn-gv' : ''}">${name(r)}<span class="kn-ln"><b>${v}</b>${ch}</span>${r.gv ? '' : `<span class="kn-bv">${vis}</span>`}</div>`; }).join('')}</div>`).join('');
    const key = `<p class="kn-key"><span>${home(1)} = ${perS} homes sold</span><span>${home(1)} = ${N(perA)} homes for sale</span>${R1.some((r) => r.gv) ? '<span>Greater Vancouver is the whole region, so it shows numbers only.</span>' : ''}</p>`;
    const h = CF('numbers').title ? esc(CF('numbers').title) : 'Key numbers';
    return `<section class="kn kn-m" data-sec="numbers"><div class="kn-mh"><h3 class="kn-h">${knIc('all')}${h}</h3><span class="kn-since">Every change is since ${pick('')}</span></div>
      <div class="kn-pan">${grid}<div class="kn-bs">${blocks}</div>${key}</div></section>`;
  };
  R.trend = () => { const sh = areasFor('trend'), one = sh.length === 1;
    return card('trend', 'Benchmark price over 12 months', one ? `${esc(sh[0])}, MLS® HPI benchmark price` : `Change since ${mName(addM(endKey, -11))} ${addM(endKey, -11).slice(0, 4)}, so areas with very different prices are easy to compare`,
      `${one ? '' : `<div class="leg">${sh.map((a) => `<span><i style="background:${colour(a)}"></i>${esc(a)}</span>`).join('')}</div>`}<div class="lc" data-chart="trend"></div>`); };
  R.market = () => { const sh = areasFor('market'), pos = (r) => (Math.min(r, 36) / 36) * 100;
    if (sh.length === 1) { const a = sh[0], o = all(a), r = o.ratio, m = mkt(r);
      const rows = typesFor('market').map(([t, l]) => [l, get(D, a, t).ratio]).filter((x) => x[1] != null);
      return card('market', "Buyer's or seller's market?", `${esc(a)}: homes for sale that sold this month`,
        `${r == null ? '<p class="na">Not enough sales to call it.</p>' : `<div class="big"><span class="pin" style="left:${pos(r)}%">${Math.round(r)}% · ${m === 'Balanced' ? 'Balanced market' : m + ' market'}</span><div class="mbar lg"><i style="left:${pos(r)}%;background:var(--ink)"></i></div>
        <div class="bscale"><span style="width:33.3%">Buyer's</span><span style="width:22.2%">Balanced</span><span class="r">Seller's</span></div></div>`}
        ${rows.length ? `<div class="mtr sm">${rows.map(([l, x]) => `<div class="mrow" tabindex="0"><span class="ma">${l}</span><div class="mbar"><i style="left:${pos(x)}%;background:var(--ink)"></i><span class="tip" style="left:${pos(x)}%">${x.toFixed(1)}% sold</span></div><b class="mk">${mkt(x)}</b></div>`).join('')}</div>` : ''}
        ${note('market', 'Under 12% sold: buyers have more choice and time to negotiate. Over 20% sold: homes go fast and sellers have the edge.')}`); }
    return card('market', "Buyer's or seller's market?", 'Based on how many homes for sale sold this month',
    `<div class="mtr">${sh.map((a) => { const r = all(a).ratio, x = r == null ? null : pos(r);
      return `<div class="mrow" tabindex="0"><span class="ma">${dot(colour(a))}${esc(a)}</span><div class="mbar">${x == null ? '' : `<i style="left:${x}%;background:${colour(a)}"></i><span class="tip" style="left:${x}%">${r.toFixed(1)}% sold</span>`}</div><b class="mk">${mkt(r) || '—'}</b></div>`; }).join('')}
      <div class="mscale"><span></span><div><span style="width:33.3%">Buyer's</span><span style="width:22.2%">Balanced</span><span class="r">Seller's</span></div><span></span></div></div>
      ${note('market', 'Under 12% sold: buyers have more choice and time to negotiate. Over 20% sold: homes go fast and sellers have the edge.')}`); };
  // S4: one layout for one city (rows are home types) and several (tap a home type, rows are areas, highest price first).
  R.types = () => { const sh = areasFor('types'), TR = typesFor('types'), one = sh.length === 1;
    if (!TR.some(([t]) => t === S.tType)) S.tType = TR[0][0];
    const tabs = one || TR.length < 2 ? '' : `<div class="gt ty-tabs" role="group" aria-label="Home type">${TR.map(([t, l]) => `<button type="button" class="tab" data-tt="${t}" aria-pressed="${S.tType === t}">${house(t, 22)}${l}</button>`).join('')}</div>`;
    return card('types', 'Prices by home type', one ? `${esc(sh[0])} · ${esc(D.month)}` : `${esc(D.month)}${tabs ? ' · tap a home type' : ` · ${TR[0][1].toLowerCase()}`}`, `${tabs}<div data-chart="types"></div>`); };
  R.growth = () => { const ts = typesFor('growth').map(([t]) => t), tabs = [['composite', 'All homes'], ['detached', 'Detached'], ['townhome', 'Townhouses'], ['condo', 'Condos']].filter(([k]) => (k === 'composite' ? ts.length === 3 : ts.includes(k)));
    if (!tabs.some(([k]) => k === S.gType)) S.gType = tabs[0][0];
    return card('growth', 'Long-term price growth', 'How much the benchmark price changed over the years', `<div class="gt">${tabs.length > 1 ? tabs.map(([k, l]) => `<button type="button" class="tab" data-gt="${k}" aria-pressed="${S.gType === k}">${house(k, 22)}${l}</button>`).join('') : ''}</div><div class="gb" data-chart="growth"></div>`,
    areasFor('growth').length === 1 ? '' : `<div class="seg" role="group" aria-label="Years">${[3, 5, 10].map((y, i) => `<button type="button" data-gy="${i}" aria-pressed="${S.gYears === i}">${y} years</button>`).join('')}</div>`); };
  R.hoods = () => card('hoods', HO ? esc(HO.title()) : 'Neighbourhoods', 'Benchmark prices by neighbourhood, and how they changed', '<div data-chart="hoods"></div>');
  R.summary = () => { const sh = areasFor('summary'); return card('summary', 'Summary', sh.length > 1 ? `Across your ${sh.length} areas` : esc(sh[0]), `<ol class="sum">${summaryPoints(sh).map((t, i) => `<li><em>${i + 1}</em><span>${t}</span></li>`).join('')}</ol>`); };
  R.sold = () => { const sh = areasFor('sold'); if (!sh.includes(S.soldArea)) S.soldArea = sh[0];
    // Several areas: every area at once (bars or lines), drawn by C.soldm.
    if (sh.length > 1) return card('sold', 'Homes sold each month', `<span data-id="soldsub"></span>`, '<div data-chart="soldm"></div>');
    return card('sold', 'Homes sold each month', `<span data-id="soldsub"></span>`, `${CF('sold').areas && sh.length > 1 ? `<div class="mini">${sh.map((a) => `<button type="button" data-sa="${esc(a)}" aria-pressed="${a === S.soldArea}">${dot(colour(a))}${esc(a)}</button>`).join('')}</div>` : ''}<div data-chart="sold"></div>`); };
  R.compare = () => card('compare', 'How areas compare', `Benchmark price in every area, with the change from ${lastYear}.${canEdit ? ' Tap an area to add it to the report.' : ''}`, `<div class="rank" data-chart="rank"></div>`);
  R.contact = () => `<section class="cd cd-contact" data-sec="contact"><div class="crow">${A.photo ? `<img class="av" src="${esc(A.photo)}" alt="">` : ''}<div class="cx"><h3>Questions about your area?</h3><p class="sub">${esc([A.name, roleLabel(A), A.brokerage, A.phone].filter(Boolean).join(' · '))}</p></div><button type="button" class="btn" data-id="ctog">Contact ${F}</button></div>
    <div class="cbox" data-id="cbox" hidden><div class="cgrid"><label class="fl">${ask.lab}<input type="text" data-id="where" placeholder="${ask.ph}"></label>
    <div><span class="fl">I am</span><div class="chips" data-id="intent" role="group" aria-label="I am">${ask.chips.map((c) => `<button type="button" aria-pressed="false">${esc(c)}</button>`).join('')}</div></div></div>
    <div><span class="fl">Your message to ${F}</span><p class="msg" data-id="msg"></p></div>
    <div class="btns">${A.contact_email ? `<a class="btn" data-id="mail" href="#">Email ${F}</a>` : ''}${A.phone ? `<a class="btn alt" data-id="sms" href="#">Text ${F}</a>` : ''}<button class="btn alt" type="button" data-id="copy">Copy message</button></div></div></section>`;

  function summaryPoints(sh) {
    const o = Object.fromEntries(sh.map((a) => [a, all(a)])), out = [];
    if (sh.length === 1) { const a = sh[0], x = o[a];
      if (x.price) out.push(`The benchmark price in ${esc(a)} is <b>${money(x.price)}</b>${x.yoy ? `, <b>${x.yoy < 0 ? 'down' : 'up'} ${Math.abs(x.yoy).toFixed(1)}%</b> from a year ago` : ''}.`);
      if (x.sales != null) { const c = pctOf(x.sales, x.salesLy); out.push(`<b>${N(x.sales)} homes sold</b> in ${mon}${c ? `, ${Math.abs(c).toFixed(0)}% ${c < 0 ? 'fewer' : 'more'} than a year ago` : ''}.`); }
      const m = mkt(x.ratio); if (m) out.push(m === "Buyer's" ? "It's a <b>buyer's market</b>: buyers have more choice and room to negotiate." : m === 'Balanced' ? "It's a <b>balanced market</b>: neither buyers nor sellers have a clear edge." : "It's a <b>seller's market</b>: homes sell quickly and sellers have the edge.");
      return out; }
    const pr = sh.filter((a) => o[a].price && o[a].yoy != null), dn = pr.filter((a) => o[a].yoy < 0), up = pr.filter((a) => o[a].yoy > 0);
    if (pr.length) { const lo = [...pr].sort((a, b) => o[a].yoy - o[b].yoy)[0], hi = [...pr].sort((a, b) => o[b].yoy - o[a].yoy)[0];
      out.push(dn.length === pr.length ? `Prices are down in every area. <b>${esc(lo)} fell the most</b>, ${Math.abs(o[lo].yoy).toFixed(1)}% in a year.`
        : up.length === pr.length ? `Prices are up in every area. <b>${esc(hi)} rose the most</b>, ${o[hi].yoy.toFixed(1)}% in a year.`
        : `Prices rose in ${up.map(esc).join(', ')} and fell in ${dn.map(esc).join(', ')} over the past year.`);
      const ex = [...pr].sort((a, b) => o[b].price - o[a].price);
      out.push(`<b>${esc(ex[0])} is the most expensive</b> at ${money(o[ex[0]].price)}. ${esc(ex[ex.length - 1])} is the most affordable at ${money(o[ex[ex.length - 1]].price)}.`); }
    const ms = sh.map((a) => mkt(o[a].ratio)).filter(Boolean);
    if (ms.length === sh.length && ms.every((m) => m === ms[0])) out.push(`${sh.length === 2 ? 'Both' : `All ${sh.length}`} are <b>${ms[0] === 'Balanced' ? 'balanced markets' : ms[0].toLowerCase() + ' markets'}</b>${ms[0] === "Buyer's" ? ': buyers have more choice and room to negotiate.' : ms[0] === "Seller's" ? ': homes sell quickly and sellers have the edge.' : ': neither side has a clear edge.'}`);
    else if (ms.length) { const g = {}; sh.forEach((a) => { const m = mkt(o[a].ratio); if (m) (g[m] = g[m] || []).push(esc(a)); });
      out.push(Object.entries(g).map(([m, as]) => `${as.join(', ')} ${as.length > 1 ? 'are' : 'is'} a <b>${m === 'Balanced' ? 'balanced' : m.toLowerCase()} market</b>`).join('; ') + '.'); }
    return out;
  }

  /* ----- charts, drawn after the cards are on the page ----- */
  const C = {};
  C.hoods = (el) => HO && HO.mount(el);
  // S4 rows: today's price and the change over the time picked under "Change since" (S.tPer).
  const pick = (a, t) => { const o = get(D, a, t), prev = o.prev || D.history?.price?.[t]?.[a]?.[addM(endKey, -1)] || null;
    return { price: o.price || null, yoy: typeChange({ price: o.price, yoy: o.yoy, prev }, S.tPer, D.growth?.[t]?.[a]) }; };
  C.types = (el) => {
    const sh = areasFor('types'), TR = typesFor('types'), one = sh.length === 1, region = 'Greater Vancouver';
    // One row per home type (one area), or one row per area for the chosen home type.
    let rows = one ? TR.map(([t, l]) => ({ ...pick(sh[0], t), type: t, label: l, icon: house(t, 22) }))
      : sh.map((a) => ({ ...pick(a, S.tType), name: a, label: esc(a), icon: dot(colour(a)), gv: a === region && sh.length > 1 }));
    const sinceM = periodMonth(endKey, S.tPer), when = `in ${sinceM}`;
    const st = one ? typesStoryOne(rows, when) : typesStoryAreas(rows, S.tType, region, when, `since ${sinceM}`);
    if (!one) rows = [...rows.filter((x) => !x.gv && x.price).sort((a, b) => b.price - a.price), ...rows.filter((x) => !x.gv && !x.price), ...rows.filter((x) => x.gv)];
    const max = Math.max(...rows.map((x) => x.price || 0)) || 1;
    const chg = (x) => { if (!x.price) return '<span class="ty-c"></span>'; if (x.yoy == null) return '<span class="ty-c"><span class="na">no change published</span></span>';
      const d = dollarChange(x.price, x.yoy), cls = x.yoy < 0 ? 'dn' : x.yoy > 0 ? 'upv' : '';
      return `<span class="ty-c ${cls}"><b><i>${x.yoy < 0 ? '▼' : x.yoy > 0 ? '▲' : '●'}</i>${Math.abs(x.yoy).toFixed(1)}%</b><span>${d ? `${money(Math.abs(d))} ${d < 0 ? 'less' : 'more'}` : 'about the same'}</span></span>`; };
    const row = (x) => `<div class="ty-r${x.gv ? ' ty-gv' : ''}"><span class="ty-n">${one ? `<span class="ty-i">${x.icon}</span>` : x.icon}${x.label}</span>
      <span class="ty-b">${x.price ? `<i style="width:${Math.max(8, (x.price / max) * 100).toFixed(1)}%"><b>${money(x.price)}</b></i>` : '<span class="na">Not enough sales to publish a price</span>'}</span>${chg(x)}</div>`;
    // The blue "Sep 2025 ⌄" words are a menu, the same as in Key numbers: picking another time changes every change in S4.
    const since = `Change since<span class="kn-sel ty-sel">${sinceM}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      <select data-tper aria-label="Show the price change since">${NUM_PERIODS.map(([k, l]) => `<option value="${k}"${k === S.tPer ? ' selected' : ''}>${periodMonth(endKey, k)} (${l === 'last month' ? 'last month' : l + ' ago'})</option>`).join('')}</select></span>`;
    el.innerHTML = `${st.lead || st.rest ? `<p class="ty-story"><b>${esc(st.lead)}</b>${esc(st.rest)}</p>` : ''}
      <div class="ty-h"><span><span class="ty-l">${one ? 'Home type' : 'Area, highest price first'}</span><span class="ty-s">${one ? 'Home type' : 'Area'} · benchmark price today</span></span><span class="ty-l">Benchmark price today</span><span class="ty-ch">${since}</span></div>
      <div class="ty-list">${rows.map(row).join('')}</div>
      <p class="ty-key"><span>Longer bar = higher price</span><span><b class="ch upv"><i>▲</i>green</b> = higher than ${when}</span><span><b class="ch dn"><i>▼</i>red</b> = lower than ${when}</span></p>`; };

  C.trend = (el) => {
    const sh = areasFor('trend'), one = sh.length === 1, keys = Array.from({ length: 12 }, (_, i) => addM(endKey, i - 11));
    const ser = sh.map((a) => { const h = D.history?.price?.composite?.[a] || {}, base = h[keys.find((k) => h[k])];
      return { a, c: one ? 'var(--ac)' : colour(a), v: keys.map((k) => (h[k] ? (one ? h[k] : (h[k] / base - 1) * 100) : null)) }; }).filter((s) => s.v.filter((x) => x != null).length > 1);
    if (!ser.length) { el.innerHTML = '<p class="na">Not enough history for this area yet.</p>'; return; }
    const miss = sh.filter((a) => !ser.some((x) => x.a === a));
    const W = Math.max(280, el.clientWidth || 600), H = W < 480 ? 200 : 236, l = 6, r = one ? 62 : 48, t = 12, b = 28, vals = ser.flatMap((s) => s.v.filter((x) => x != null));
    let lo = Math.min(...vals), hi = Math.max(...vals); if (!one) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); } const pad = (hi - lo || Math.abs(hi) * 0.05 || 1) * 0.12; lo -= pad; hi += pad;
    const st = niceStep(hi - lo, 4), x = (i) => l + (i * (W - l - r)) / 11, y = (v) => t + ((hi - v) / (hi - lo)) * (H - t - b);
    let g = '';
    for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) g += `<line x1="${l}" x2="${W - r + 4}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${W - r + 12}" y="${y(v) + 4}" class="ax">${one ? short(v) : (Math.abs(v) < 1e-9 ? '0' : (v > 0 ? '+' : '−') + Math.abs(+v.toFixed(1))) + '%'}</text>`;
    keys.forEach((k, i) => { if ((11 - i) % 2 === 0) g += `<text x="${x(i)}" y="${H - 8}" class="ax" text-anchor="${i === 11 ? 'end' : 'middle'}">${mName(k)}${i === 1 ? ' ’' + k.slice(2, 4) : ''}</text>`; });
    const path = (s) => s.v.map((v, i) => (v == null ? '' : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(' ');
    if (one) { const s = ser[0], pts = s.v.map((v, i) => [i, v]).filter((q) => q[1] != null); g += `<path d="M${pts.map(([i, v]) => `${x(i)},${y(v)}`).join('L')}L${x(pts[pts.length - 1][0])},${H - b}L${x(pts[0][0])},${H - b}Z" fill="var(--ac)" opacity=".07"/>`; }
    g += ser.map((s) => `<polyline fill="none" stroke="${s.c}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" points="${path(s)}"/>${s.v[11] != null ? `<circle cx="${x(11)}" cy="${y(s.v[11])}" r="4" fill="${s.c}"/>` : ''}`).join('');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Benchmark price over the last 12 months">${g}<line class="hx" y1="${t}" y2="${H - b}" opacity="0"/><g class="hd"></g><rect width="${W}" height="${H}" fill="transparent"/></svg><div class="ctip"></div>${miss.length ? `<p class="na">No 12-month history is published for ${miss.map(esc).join(', ')}.</p>` : ''}`;
    const sv = el.querySelector('svg'), tip = el.querySelector('.ctip'), hx = sv.querySelector('.hx'), hd = sv.querySelector('.hd');
    const fmt = (v) => (one ? money(v) : signed(v));
    const move = (e) => { const bb = sv.getBoundingClientRect(), px = ((e.clientX - bb.left) / bb.width) * W, i = Math.max(0, Math.min(11, Math.round(((px - l) / (W - l - r)) * 11)));
      hx.setAttribute('x1', x(i)); hx.setAttribute('x2', x(i)); hx.setAttribute('opacity', 1);
      hd.innerHTML = ser.filter((s) => s.v[i] != null).map((s) => `<circle cx="${x(i)}" cy="${y(s.v[i])}" r="4.5" fill="${s.c}" stroke="var(--card)" stroke-width="2"/>`).join('');
      tip.innerHTML = `<b>${mName(keys[i])} ${keys[i].slice(0, 4)}</b>${ser.filter((s) => s.v[i] != null).map((s) => `<span>${one ? '' : dot(s.c)}${one ? '' : esc(s.a) + ' '}<b>${fmt(s.v[i])}</b></span>`).join('')}`;
      const left = (x(i) / W) * 100; tip.style.left = left + '%'; tip.style.transform = `translateX(${left > 60 ? 'calc(-100% - 14px)' : '14px'})`; tip.style.opacity = 1; };
    sv.addEventListener('pointermove', move); sv.addEventListener('pointerdown', move);
    sv.addEventListener('pointerleave', () => { tip.style.opacity = 0; hx.setAttribute('opacity', 0); hd.innerHTML = ''; });
  };
  C.sold = (el) => {
    const a = S.soldArea, g = salesGroup(a), keys = Array.from({ length: 12 }, (_, i) => addM(endKey, i - 11));
    const rows = keys.map((k) => [k, typesFor('sold').map(([t]) => t).reduce((n, t) => (n == null || D.history?.sales?.[t]?.[g]?.[k] == null ? null : n + D.history.sales[t][g][k]), 0)]);
    let i0 = rows.length - 1; while (i0 >= 0 && rows[i0][1] != null) i0--; const rs = rows.slice(i0 + 1);
    const sub = root.querySelector('[data-id="soldsub"]');
    if (rs.length < 2) { el.innerHTML = '<p class="na">Monthly sales are not published for this area.</p>'; if (sub) sub.textContent = a; return; }
    const name = g === 'Grand Totals' ? 'Greater Vancouver' : g, mx = Math.max(...rs.map((r) => r[1])) * 1.16;
    if (sub) sub.textContent = `${name === a ? a : `${name} (whole area)`}${areasFor('sold').length > 1 && !CF('sold').areas ? ' · tap an area above to see its own' : ''}${CF('sold').types ? ' · ' + typesFor('sold').map(([, l]) => l.toLowerCase() + 's').join(' and ') : ''}`;
    el.innerHTML = `<div class="bars">${rs.map(([k, v], i) => `<div class="bc${i === rs.length - 1 ? ' now' : ''}"><div class="bp"><div class="bb" style="height:${(v / mx) * 100}%"></div><span class="bn" style="bottom:calc(${(v / mx) * 100}% + 4px)">${N(v)}</span></div><span class="bm">${mName(k)}</span></div>`).join('')}</div><p class="yr">${mName(rs[0][0])} ${rs[0][0].slice(0, 4)} to ${mName(endKey)} ${endKey.slice(0, 4)}</p>`;
    const box = el.querySelector('.bars'), bcs = [...box.children];
    bcs.forEach((b) => { const on = () => { bcs.forEach((x) => x.classList.toggle('h', x === b)); box.classList.add('hov'); };
      b.addEventListener('pointerenter', on); b.addEventListener('pointerdown', on); });
    box.addEventListener('pointerleave', () => { bcs.forEach((x) => x.classList.remove('h')); box.classList.remove('hov'); });
  };
  // Homes sold with several areas: a one-line story, the whole region on its own row, every city's bars (or lines)
  // side by side, and each city's number and change from a year ago under the chart.
  C.soldm = (el) => {
    const groups = []; areasFor('sold').forEach((a) => { const g = salesGroup(a), x = groups.find((y) => y.g === g); if (x) x.areas.push(a); else groups.push({ g, areas: [a], c: colour(a) }); });
    // An area that shares GVR's sales count with another (Burnaby North and South) is named by the whole group.
    const label = (g) => (g === 'Grand Totals' ? 'Greater Vancouver' : g.replace('/', ' and '));
    groups.forEach((x) => { x.name = x.areas.length > 1 ? label(x.g) : x.areas[0]; });
    const { keys, list } = salesByArea(D.history, groups, typesFor('sold').map(([t]) => t), endKey);
    const sub = root.querySelector('[data-id="soldsub"]'), tyNote = CF('sold').types ? ' · ' + typesFor('sold').map(([, l]) => l.toLowerCase() + 's').join(' and ') : ' · All home types';
    if (keys.length < 2) { el.innerHTML = '<p class="na">Monthly sales are not published for these areas.</p>'; if (sub) sub.textContent = ''; return; }
    const gv = list.find((x) => x.g === 'Grand Totals'), cities = list.filter((x) => x !== gv);
    // On a phone (or a half-width card) show the last 6 months so the bars stay wide enough to tap.
    const narrow = el.clientWidth < 520, from = narrow ? Math.max(0, keys.length - 6) : 0, ks = keys.slice(from), last = ks.length - 1;
    if (sub) sub.textContent = `${narrow && from ? 'Last 6 months' : `${monthLong(keys[0])} to ${monthLong(endKey)}`}${tyNote}`.replace(/^ · /, '');
    const ly = `${mon} ${endKey.slice(0, 4) - 1}`;
    const chg = (x, long) => (x.pct == null ? '<span class="na">no comparison</span>' : x.pct === 0 ? `<span class="sd-fl">same${long ? ` as ${ly}` : ''}</span>`
      : `<span class="${x.pct < 0 ? 'sd-dn' : 'sd-up'}">${x.pct < 0 ? '▼' : '▲'} ${Math.abs(x.pct)}% ${x.pct < 0 ? 'fewer' : 'more'}${long ? ` than ${ly}` : ''}</span>`);
    const st = soldStory(list, cities, keys, mon);
    const gvMax = gv ? Math.max(...gv.v) : 0;
    el.innerHTML = `${st.lead ? `<p class="sd-take"><b>${esc(st.lead)}</b>${esc(st.rest)}</p>` : ''}
      ${gv && cities.length ? (() => { const sp = `<div class="sd-sp">${gv.v.slice(from).map((v, i) => `<i${i === last ? ' class="now"' : ''} style="height:${(v / gvMax) * 100}%"></i>`).join('')}</div>`;
        // On a phone: name and number on one line, the small bars under them, then the change.
        return narrow ? `<div class="sd-gv nar"><div class="sd-r1">${dot(gv.c)}<b>Greater Vancouver</b><span class="sd-v"><b>${N(gv.now)}</b> sold</span></div>${sp}<div class="sd-v">${chg(gv, true)}</div></div>`
          : `<div class="sd-gv">${dot(gv.c)}<b>Greater Vancouver</b>${sp}<span class="sd-v"><b>${N(gv.now)}</b> sold<br>${chg(gv, true)}</span></div>`; })() : ''}
      <div class="sd-top"><div class="sd-leg">${cities.map((x) => `<span>${dot(x.c)}${esc(x.name)}</span>`).join('')}</div>
      <div class="seg" role="group" aria-label="Chart type"><button type="button" data-sv="bars" aria-pressed="${S.soldView === 'bars'}">Bars</button><button type="button" data-sv="lines" aria-pressed="${S.soldView === 'lines'}">Lines</button></div></div>
      <div class="sd-plot"></div><div class="ctip"></div>
      <div class="sd-chg">${cities.map((x) => `<span>${dot(x.c)}<b>${x.now != null ? N(x.now) : '—'}</b> ${chg(x)}</span>`).join('')}<span class="sd-fl">vs ${ly}</span></div>
      ${(() => { const sh2 = cities.filter((x) => x.areas.length === 1 && !x.g.startsWith(x.name)); return sh2.length ? `<p class="yr">${sh2.map((x) => `${esc(x.name)} counts all of ${esc(label(x.g))}`).join('. ')}, as GVR reports it.</p>` : ''; })()}`;
    const plot = el.querySelector('.sd-plot'), tip = el.querySelector('.ctip'), W = plot.clientWidth || 600, H = narrow ? 200 : 220;
    const mx = Math.max(...cities.flatMap((x) => x.v.slice(from))) || 1;
    // The tooltip: the month and every city's number, for the month tapped or hovered.
    const show = (j, xPx) => { tip.innerHTML = `<b>${monthLong(ks[j])}</b>${cities.map((x) => `<span>${dot(x.c)}${esc(x.name)} ${N(x.v[from + j])} sold</span>`).join('')}`;
      tip.style.top = plot.offsetTop + 'px'; tip.style.left = Math.max(0, Math.min(xPx > W / 2 ? xPx - tip.offsetWidth - 12 : xPx + 12, W - tip.offsetWidth)) + 'px'; tip.style.opacity = 1; };
    if (S.soldView === 'lines') {
      const step = niceStep(mx, 3), top = Math.ceil(mx / step) * step, l = 34, r = 48, t = 10, b = 24, X = (j) => l + (j * (W - l - r)) / Math.max(1, last), Y = (v) => t + (1 - v / top) * (H - t - b);
      let g = ''; for (let v = 0; v <= top + 0.1; v += step) g += `<line x1="${l}" x2="${W - r + 6}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--ln)"/><text x="${l - 7}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="var(--mut)">${N(v)}</text>`;
      g += `<line class="sd-gd" x1="0" x2="0" y1="${t}" y2="${H - b}" stroke="var(--mut)" stroke-dasharray="3 3" opacity="0"/>`;
      cities.forEach((x) => { const v = x.v.slice(from); g += `<polyline points="${v.map((y, j) => `${X(j)},${Y(y)}`).join(' ')}" fill="none" stroke="${x.c}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(last)}" cy="${Y(v[last])}" r="5" fill="${x.c}" stroke="var(--card)" stroke-width="2"/>`; });
      // Numbers at the end of each line, nudged apart so they never overlap.
      const ends = cities.map((x) => ({ x, y: Y(x.v[from + last]) })).sort((a, b2) => a.y - b2.y); for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
      g += ends.map((o) => `<text x="${X(last) + 10}" y="${o.y + 4}" font-size="12.5" font-weight="700" fill="${o.x.c}">${N(o.x.v[from + last])}</text>`).join('');
      g += ks.map((k, j) => `<text x="${X(j)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="${j === last ? 'var(--ink)' : 'var(--mut)'}" font-weight="${j === last ? 650 : 400}">${mName(k)}</text>`).join('');
      g += ks.map((k, j) => `<rect class="sd-hit" data-j="${j}" x="${X(j) - (W - l - r) / Math.max(1, last) / 2}" y="0" width="${(W - l - r) / Math.max(1, last)}" height="${H}" fill="transparent"/>`).join('');
      plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Homes sold each month: ${cities.map((x) => `${esc(x.name)} ${N(x.now)} in ${mon}`).join(', ')}">${g}</svg>`;
      const gd = plot.querySelector('.sd-gd');
      plot.querySelectorAll('.sd-hit').forEach((h) => { const on = () => { const j = +h.dataset.j; gd.setAttribute('x1', X(j)); gd.setAttribute('x2', X(j)); gd.setAttribute('opacity', 1); show(j, X(j)); };
        h.addEventListener('pointerenter', on); h.addEventListener('pointerdown', on); });
      plot.addEventListener('pointerleave', () => { gd.setAttribute('opacity', 0); tip.style.opacity = 0; });
    } else {
      plot.innerHTML = `<div class="sd-gb" style="height:${H - 24}px">${ks.map((k, j) => `<div class="sd-m${j === last ? ' now' : ''}" data-j="${j}">${cities.map((x) => `<i style="height:${(x.v[from + j] / mx) * 100}%;background:${x.c}"></i>`).join('')}</div>`).join('')}</div>
        <div class="sd-mo">${ks.map((k, j) => `<span${j === last ? ' class="now"' : ''}>${mName(k)}</span>`).join('')}</div>`;
      const box = plot.querySelector('.sd-gb'), ms = [...box.children];
      ms.forEach((m) => { const on = () => { ms.forEach((y) => y.classList.toggle('h', y === m)); box.classList.add('hov'); show(+m.dataset.j, m.offsetLeft + m.offsetWidth / 2); };
        m.addEventListener('pointerenter', on); m.addEventListener('pointerdown', on); });
      box.addEventListener('pointerleave', () => { ms.forEach((y) => y.classList.remove('h')); box.classList.remove('hov'); tip.style.opacity = 0; });
    }
  };
  C.growth = (el) => {
    const G = D.growth?.[S.gType] || {}, p = S.gYears, yrs = [3, 5, 10][p], tn = { composite: '', detached: 'detached homes', townhome: 'townhouses', condo: 'condos' }[S.gType];
    const sh = areasFor('growth'), have = sh.filter((a) => G[a]), miss = sh.filter((a) => !G[a]);
    if (!have.length) { el.innerHTML = '<p class="na">Long-term numbers are not published for this home type here.</p>'; return; }
    if (sh.length === 1) return growthOne(el, sh[0], G, tn);
    const vals = have.map((a) => G[a][p]), lo = Math.min(0, ...vals), hi = Math.max(0, ...vals), span = hi - lo || 1, L0 = lo - span * 0.22, H0 = hi + span * 0.3, X = (v) => ((v - L0) / (H0 - L0)) * 100;
    const sorted = [...have].sort((a, b) => G[b][p] - G[a][p]), best = sorted[0], worst = sorted[sorted.length - 1], st = niceStep(H0 - L0, 4), ticks = [];
    for (let v = Math.ceil(L0 / st) * st; v <= H0; v += st) ticks.push(Math.round(v * 10) / 10);
    const what = tn ? ` ${tn}` : '';
    const lines = [have.length > 1 ? `Over ${yrs} years, <b>${esc(best)}</b>${what} grew the most of these areas: <b>${signed(G[best][p])}</b>.` : `Over ${yrs} years, the benchmark price of${tn ? ` ${tn} in` : ' a home in'} <b>${esc(best)}</b> changed by <b>${signed(G[best][p])}</b>.`];
    if (have.length > 1) lines.push(G[worst][p] < 0 ? `<b>${esc(worst)}</b>${what} ${tn ? 'are' : 'prices are'} ${Math.abs(G[worst][p]).toFixed(1)}% lower than ${yrs} years ago.` : `Every area is higher than ${yrs} years ago.`);
    el.innerHTML = `<div class="gg"><div>${sorted.map((a) => { const v = G[a][p], x0 = X(0), x1 = X(v);
      return `<div class="hb"><span class="ma">${dot(colour(a))}${esc(a)}</span><div class="trk"><span class="z" style="left:${x0}%"></span><span class="f" style="left:${Math.min(x0, x1)}%;width:${Math.abs(x1 - x0)}%;background:${colour(a)}"></span><span class="v ${v < 0 ? 'dn' : 'upv'}" style="${v >= 0 ? `left:calc(${x1}% + 8px)` : `right:calc(${100 - x1}% + 8px)`}">${signed(v)}</span></div></div>`; }).join('')}
      ${miss.map((a) => `<div class="hb"><span class="ma">${dot(colour(a))}${esc(a)}</span><span class="na">not published</span></div>`).join('')}
      <div class="hb axis"><span></span><div class="trk">${ticks.map((t) => `<span style="left:${X(t)}%">${t > 0 ? '+' : ''}${t}%</span>`).join('')}</div></div></div>
      <div class="ins">${lines.map((t) => `<p>${t}</p>`).join('')}<p class="note">Change in the MLS® Home Price Index benchmark price. Past growth doesn't guarantee future growth.</p></div></div>`;
  };
  function growthOne(el, a, G, tn) {
    const v3 = G[a], what = tn || 'homes', X0 = Math.min(0, ...v3), X1 = Math.max(0, ...v3), sp = X1 - X0 || 1, L0 = X0 - sp * 0.22, H0 = X1 + sp * 0.3, X = (v) => ((v - L0) / (H0 - L0)) * 100;
    const st = niceStep(H0 - L0, 4), ticks = []; for (let v = Math.ceil(L0 / st) * st; v <= H0; v += st) ticks.push(Math.round(v * 10) / 10);
    const line = (i) => `${['3', '5', '10'][i]} years: <b>${signed(v3[i])}</b>`;
    el.innerHTML = `<div class="gg"><div>${[0, 1, 2].map((i) => { const v = v3[i], x0 = X(0), x1 = X(v);
      return `<div class="hb"><span class="ma">Over ${[3, 5, 10][i]} years</span><div class="trk"><span class="z" style="left:${x0}%"></span><span class="f" style="left:${Math.min(x0, x1)}%;width:${Math.abs(x1 - x0)}%;background:var(--ac);opacity:${0.45 + i * 0.27}"></span><span class="v ${v < 0 ? 'dn' : 'upv'}" style="${v >= 0 ? `left:calc(${x1}% + 8px)` : `right:calc(${100 - x1}% + 8px)`}">${signed(v)}</span></div></div>`; }).join('')}
      <div class="hb axis"><span></span><div class="trk">${ticks.map((t) => `<span style="left:${X(t)}%">${t > 0 ? '+' : ''}${t}%</span>`).join('')}</div></div></div>
      <div class="ins"><p>Benchmark price of ${esc(what)} in <b>${esc(a)}</b>.</p><p>${[2, 1, 0].map(line).join('<br>')}</p><p class="note">Change in the MLS® Home Price Index benchmark price. Past growth doesn't guarantee future growth.</p></div></div>`;
  }
  const IC = { pin: '<path d="M12 21s-6-5.6-6-10a6 6 0 1 1 12 0c0 4.4-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>', home: HOUSE.detached, tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.4"/>', ud: '<path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/>' };
  const ic = (k) => `<i class="hi"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg></i>`;
  C.rank = (el) => {
    const rows = ALL.map((a) => ({ a, ...all(a) })).filter((r) => r.price).sort((x, y) => y.price - x.price), max = rows[0]?.price || 1;
    const cut = 8, list = S.rankAll ? rows : rows.filter((r, i) => i < cut || S.areas.includes(r.a)), tag = canEdit ? 'button type="button"' : 'div', end = canEdit ? 'button' : 'div';
    // Column titles with small pictures, so everyone can tell what each part means.
    const head = `<div class="rr rh${canEdit ? ' ed' : ''}" aria-hidden="true"><span>${ic('pin')}Area</span><span>${ic('home')}Benchmark price <em>· longer bar = higher price</em></span><span class="r">${ic('tag')}Price</span><span class="r">${ic('ud')}In 1 year</span>${canEdit ? '<span></span>' : ''}</div>`;
    el.innerHTML = head + list.map((r) => { const on = S.areas.includes(r.a);
      return `<${tag} class="rr${on ? ' on' : ''}${canEdit ? ' ed' : ''}${S.flash === r.a ? ' flash' : ''}" data-add="${esc(r.a)}"${canEdit ? ` aria-pressed="${on}" title="${on ? 'On your report. Tap to remove.' : 'Tap to add to the report'}"` : ''} style="${on ? `--ac2:${colour(r.a)}` : ''}"><span class="ma">${on ? dot(colour(r.a)) : '<i class="dt off"></i>'}${esc(r.a)}</span><span class="rb"><i style="width:${((r.price / max) * 100).toFixed(1)}%${on ? `;background:${colour(r.a)}` : ''}"></i></span><b class="n">${money(r.price)}</b>${arrow(r.yoy)}${canEdit ? `<span class="tk">${on ? '✓' : '+'}</span>` : ''}</${end}>`; }).join('')
      + (rows.length > list.length || S.rankAll ? `<button type="button" class="more" data-more>${S.rankAll ? 'Show fewer' : `Show all ${rows.length} areas`}</button>` : '');
    S.flash = null;
  };
  // A short message at the bottom of the screen, with an Undo.
  function toast(msg, undo) { document.querySelector('.bdtoast')?.remove(); const t = document.createElement('div'); t.className = 'bdtoast'; t.setAttribute('role', 'status');
    t.innerHTML = `<span>${msg}</span>${undo ? '<button type="button">Undo</button>' : ''}`; document.body.appendChild(t);
    if (undo) t.querySelector('button').onclick = () => { t.remove(); undo(); };
    clearTimeout(toast.t); toast.t = setTimeout(() => t.remove(), 4000); }
  // Change the areas without the page jumping: keep the section you tapped in the same place.
  function keepPlace(sel, fn) { const a = root.querySelector(sel), y0 = a ? a.getBoundingClientRect().top : null; fn(); const b2 = root.querySelector(sel); if (y0 != null && b2) scrollBy(0, b2.getBoundingClientRect().top - y0); }

  /* ----- page ----- */
  const PAIR = { trend: 7, market: 5, summary: 6, sold: 6 };
  const pairs = (k) => PAIR[k] && CF(k).size !== 'full';
  function rows(secs) { const out = []; for (let i = 0; i < secs.length; i++) { const a = secs[i], b = secs[i + 1]; if (pairs(a) && pairs(b)) { out.push([a, b]); i++; } else out.push([a]); } return out; }
  // R2: "Show me: Both areas · Coquitlam · Burnaby North · + Add area", and a line saying what the report below shows.
  const ALLIC = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/></svg>';
  const EYE = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const PIN = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  const allLabel = () => (S.areas.length === 2 ? 'Both areas' : `All ${S.areas.length} areas`);
  function areaBar() {
    if (!canEdit && S.areas.length < 2) return '';
    const free = ALL.filter((a) => !S.areas.includes(a)), many = S.areas.length > 1, one = S.view === 'one' && many;
    const tabs = many ? `<button type="button" class="chip tabby aall${one ? '' : ' on'}" data-all aria-pressed="${!one}">${ALLIC}${allLabel()}</button>` : '';
    const say = !many ? '' : one ? `<p class="asay">${PIN}<span>Every section below is <b>about ${esc(S.focus)} only</b>. Tap <b>${allLabel()}</b> to compare.</span></p>`
      : `<p class="asay">${EYE}<span>Every section below <b>compares ${S.areas.length === 2 ? `${esc(S.areas[0])} and ${esc(S.areas[1])}` : `all ${S.areas.length} areas`}</b>.</span></p>`;
    return `<div class="abar"><span class="al">Show me:</span><div class="chs">${tabs}${S.areas.map((a) => `<span class="chip${many ? ' tabby' : ''}${one && a === S.focus ? ' on' : ''}"${many ? ` data-focus="${esc(a)}" role="button" tabindex="0" aria-pressed="${one && a === S.focus}"` : ''}>${dot(colour(a))}${esc(a)}${canEdit && many ? `<button type="button" class="x" data-rm="${esc(a)}" aria-label="Remove ${esc(a)}">✕</button>` : ''}</span>`).join('')}
      ${canEdit && S.areas.length < MAX_AREAS && free.length ? `<label class="add">+ Add area<select data-id="add" aria-label="Add an area"><option value="">Add an area</option>${free.map((a) => `<option>${esc(a)}</option>`).join('')}</select></label>` : ''}</div>${say}</div>`;
  }
  const NAME = Object.fromEntries(SECTIONS.map(([k, l]) => [k, l]));
  // Agent view: click a section to edit it (outlined, with an "Editing" tag); "+ Add a section" at the end.
  let SEL = opts.selected || null;
  const BIN = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
  // Agent view: each section has a "Drag to move" handle (shown on hover and when selected) and, when selected, a bin to remove it.
  function sec(k) { const h = R[k](); return ED ? `<div class="sx${SEL === k ? ' ed' : ''}" data-k="${k}">${h}<button type="button" class="dragh" data-drag="${k}" aria-label="Drag ${NAME[k]} to move it">⠿ Drag to move</button><button type="button" class="bin" data-bin="${k}" title="Remove this section" aria-label="Remove ${NAME[k]}">${BIN}</button></div>` : h; }
  const addBox = () => `<button type="button" class="addsec2${opts.adding ? ' on' : ''}" data-addsec>+ Add a section</button>`;
  root._select = (k) => { SEL = k; root.querySelectorAll('.sx').forEach((x) => x.classList.toggle('ed', x.dataset.k === k)); };
  root._adding = (on) => root.querySelector('.addsec2')?.classList.toggle('on', !!on);
  function saveLayout(patch) { Object.assign(L, patch); if (ED) opts.edit(patch); }
  // Drag a section by its handle; a blue line shows where it will land.
  function startDrag(e, k) {
    const src = root.querySelector(`.sx[data-k="${k}"]`); if (!src) return; e.preventDefault();
    const card = src.firstElementChild, r0 = card.getBoundingClientRect(), z = r0.width / (card.offsetWidth || r0.width) || 1;
    const ghost = document.createElement('div'); ghost.className = 'bd dgw'; ghost.style.cssText = root.style.cssText; ghost.appendChild(card.cloneNode(true)); ghost.firstElementChild.classList.add('dghost');
    Object.assign(ghost.style, { position: 'fixed', left: r0.left + 'px', top: r0.top + 'px', width: card.offsetWidth + 'px', transform: `scale(${z})`, transformOrigin: '0 0', zIndex: 60, pointerEvents: 'none', background: 'transparent' });
    const line = document.createElement('div'); line.className = 'dline'; line.style.display = 'none'; document.body.append(ghost, line);
    src.classList.add('lift'); const dx = e.clientX - r0.left, dy = e.clientY - r0.top; let drop = null, raf;
    const move = (ev) => { ghost.style.left = ev.clientX - dx + 'px'; ghost.style.top = ev.clientY - dy + 'px';
      const t = document.elementsFromPoint(ev.clientX, ev.clientY).map((el) => el.closest && el.closest('.sx')).find((el) => el && el !== src && root.contains(el));
      if (t) { const r = t.getBoundingClientRect(), before = ev.clientY < r.top + r.height / 2; drop = { k: t.dataset.k, before };
        Object.assign(line.style, { display: 'block', left: r.left + 'px', width: r.width + 'px', top: (before ? r.top - 9 : r.bottom + 3) + 'px' }); }
      cancelAnimationFrame(raf); const edge = ev.clientY < 90 ? -14 : ev.clientY > innerHeight - 70 ? 14 : 0; if (edge) { const step = () => { scrollBy(0, edge); raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); } };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); cancelAnimationFrame(raf); ghost.remove(); line.remove(); src.classList.remove('lift');
      if (!drop || drop.k === k) return; const s2 = L.sections.filter((x) => x !== k); s2.splice(s2.indexOf(drop.k) + (drop.before ? 0 : 1), 0, k); saveLayout({ sections: s2 }); SEL = k; draw();
      setTimeout(() => root.querySelector(`.sx[data-k="${k}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 30); };
    addEventListener('pointermove', move); addEventListener('pointerup', up); move(e);
  }
  if (ED) root.onpointerdown = (e) => { const h = e.target.closest('[data-drag]'); if (h && e.button === 0) startDrag(e, h.dataset.drag); };
  // R1.1 Month button and R1.2 older-month line. opts.months = { list: ['2026-09', …] newest first, latest, onPick(key) }.
  const MO = { list: (!ED && opts.months?.list) || [], latest: opts.months?.latest || endKey };
  const MONTHL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mLong = (k) => `${MONTHL[+k.slice(5) - 1]} ${k.slice(0, 4)}`;
  const CLOCK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  S.moYear = S.moYear || +endKey.slice(0, 4);
  function monthPop() {
    const yrs = [...new Set(MO.list.map((k) => +k.slice(0, 4)))].sort(), y = S.moYear, i = yrs.indexOf(y), last = MO.list[MO.list.length - 1];
    return `<div class="mo-pop" role="dialog" aria-label="Choose a month"><div class="mo-hd"><b>Choose a month</b><button type="button" class="mo-x" data-mclose aria-label="Close">✕</button></div>
      <div class="mo-yr"><button type="button" data-myr="${yrs[i - 1] || ''}" aria-label="Year before"${i > 0 ? '' : ' disabled'}>‹</button><b>${y}</b><button type="button" data-myr="${yrs[i + 1] || ''}" aria-label="Year after"${i < yrs.length - 1 ? '' : ' disabled'}>›</button></div>
      <div class="mo-grid">${MON.map((m, j) => { const k = `${y}-${String(j + 1).padStart(2, '0')}`, has = MO.list.includes(k);
        return `<button type="button" class="${k === endKey ? 'on' : ''}"${has ? ` data-mo="${k}"` : ' disabled'} aria-pressed="${k === endKey}" aria-label="${MONTHL[j]} ${y}${has ? '' : ', not available'}">${m}</button>`; }).join('')}</div>
      <p class="mo-note">Every month from ${mLong(last)} to ${mLong(MO.latest)}.${MO.list.length < 3 ? '' : ' Greyed-out months are not available.'}</p>
      ${endKey !== MO.latest ? `<button type="button" class="mo-new" data-mo="${MO.latest}">Show the newest month</button>` : ''}</div>`;
  }
  const oldLine = () => (MO.list.length && endKey !== MO.latest ? `<div class="mo-old">${CLOCK}<span>You're looking at <b>${esc(D.month)}</b>. Changes compare with ${esc(lastYear)}.</span><button type="button" data-mo="${MO.latest}">See the newest month (${mLong(MO.latest)}) →</button></div>` : '');
  function pickMonth(k) { S.moOpen = false; if (k && k !== endKey) opts.months?.onPick?.(k); else draw(); }
  // Escape or a tap outside closes the month list. Listeners from an earlier mount of this root are removed first.
  root._moOff?.(); root._moOff = null;
  if (MO.list.length > 1) { const key = (e) => { if (e.key === 'Escape' && S.moOpen) { S.moOpen = false; draw(); root.querySelector('[data-mopen]')?.focus(); } },
    out = (e) => { if (S.moOpen && !e.target.closest('.mo-pop,[data-mopen]')) { S.moOpen = false; draw(); } };
    document.addEventListener('keydown', key); document.addEventListener('click', out);
    root._moOff = () => { document.removeEventListener('keydown', key); document.removeEventListener('click', out); }; }
  function draw() {
    // Neighbourhoods follow the areas at the top, and the area tapped there when one area is picked ("Show me: <area>").
    HO?.sync(S.areas, S.view === 'one' && S.areas.length > 1 ? S.focus : null);
    const sh = shown(), secs = L.sections.filter((k) => k !== 'growth' || D.growth).filter((k) => k !== 'compare' || ALL.length > 1).filter((k) => k !== 'hoods' || HO);
    const head = sh.length === 1 ? `${esc(sh[0])} Market Report` : `Market Report: ${sh.length} areas`;
    root.innerHTML = `<div class="bw"><header class="top"><div><h1>${head}</h1>${MO.list.length > 1 ? `<div class="mo-row"><button type="button" class="mo-btn" data-mopen aria-haspopup="dialog" aria-expanded="${!!S.moOpen}">${esc(D.month)}<i aria-hidden="true">▾</i></button><span class="sub">Source: Greater Vancouver REALTORS®</span>${S.moOpen ? monthPop() : ''}</div>` : `<p class="sub">${esc(D.month)} · Source: Greater Vancouver REALTORS®</p>`}</div>
      ${L.agentTop && A.name ? `<div class="agent">${A.photo ? `<img class="av" src="${esc(A.photo)}" alt="">` : ''}<div><b>${esc(A.name)}</b><span>${esc([roleLabel(A), A.brokerage].filter(Boolean).join(' · '))}</span>${A.phone ? `<span>${esc(A.phone)}</span>` : ''}</div>${A.logo ? `<img class="lg" src="${esc(A.logo)}" alt="">` : ''}</div>` : ''}</header>
      ${oldLine()}${areaBar()}${rows(secs).map((r) => (r.length === 2 ? `<div class="pair" style="grid-template-columns:${PAIR[r[0]]}fr ${PAIR[r[1]]}fr">${sec(r[0])}${sec(r[1])}</div>` : sec(r[0]))).join('')}${ED ? addBox() : ''}
      <footer>${esc(sourceLine(D))}${opts.personal && !ED ? `<span class="mo-priv">${EYE}${esc(A.name ? first(A) : 'Your agent')} can see when you open this report and which parts you read.</span>` : ''}</footer></div>`;
    charts(); wire();
  }
  function charts() { root.querySelectorAll('[data-chart]').forEach((el) => C[el.dataset.chart](el)); }
  const q = (id) => root.querySelector(`[data-id="${id}"]`);
  function text() { const w = q('where')?.value.trim() || (shown().length === 1 && shown()[0] !== 'Greater Vancouver' ? shown()[0] : 'my area'); return ask.msg(w, 'all', S.intent).replace(' (homes)', ''); }
  function msg() { if (!q('msg')) return; const t = text(); q('msg').textContent = t;
    if (q('mail')) q('mail').href = `mailto:${A.contact_email}?subject=${encodeURIComponent(ask.subj)}&body=${encodeURIComponent(t)}`;
    if (q('sms')) { const d = String(A.phone).replace(/\D/g, ''); q('sms').href = `sms:+${d.length === 11 && d[0] === '1' ? d : '1' + d}?&body=${encodeURIComponent(t)}`; } }
  function remember() { if (opts.embedded || ED) return; try { const u = new URL(location.href); u.searchParams.set('areas', S.areas.map(slug).join(',')); u.hash = ''; history.replaceState(null, '', u.toString().replace(/%2C/g, ',')); } catch {} }
  function setAreas(next, focus) { S.areas = next.slice(0, MAX_AREAS); if (ED) saveLayout({ areas: [...S.areas] }); if (!S.areas.includes(S.focus)) S.focus = S.areas[0]; if (focus) S.focus = focus; remember(); draw(); }
  function wire() {
    if (q('where')) { q('where').addEventListener('input', msg); msg(); }
  }
  root.onclick = (e) => {
    const t = e.target, b = (s) => t.closest(s);
    if (ED && b('[data-addsec]')) return opts.onAdd?.();
    if (ED && b('[data-drag]')) return;
    if (ED && b('[data-bin]')) { const k = b('[data-bin]').dataset.bin; if (L.sections.length < 2) return; if (opts.onRemove) return opts.onRemove(k); saveLayout({ sections: L.sections.filter((x) => x !== k) }); SEL = null; draw(); return opts.onSelect?.(null); }
    if (ED && b('.sx') && !b('button,a,input,select,label,.mrow,[data-chart="trend"]')) { const k = b('.sx').dataset.k; root._select(k); opts.onSelect?.(k); }
    if (b('[data-rm]')) { e.stopPropagation(); const a = b('[data-rm]').dataset.rm; return setAreas(S.areas.filter((x) => x !== a)); }
    // Tapping an area shows the whole report for that area; "Both areas" / "All 3 areas" compares them again.
    if (b('[data-focus]')) { S.focus = b('[data-focus]').dataset.focus; S.view = 'one'; return draw(); }
    if (b('[data-all]')) { S.view = 'side'; return draw(); }
    if (b('[data-mopen]')) { S.moOpen = !S.moOpen; S.moYear = +endKey.slice(0, 4); draw(); return root.querySelector('.mo-grid .on,.mo-grid button:not([disabled])')?.focus(); }
    if (b('[data-mclose]')) { S.moOpen = false; return draw(); }
    if (b('[data-myr]')) { const y = +b('[data-myr]').dataset.myr; if (y) { S.moYear = y; draw(); root.querySelector('.mo-yr b')?.focus?.(); } return; }
    if (b('[data-mo]')) return pickMonth(b('[data-mo]').dataset.mo);
    if (b('[data-id="ctog"]')) { const x = q('cbox'); x.hidden = !x.hidden; if (!x.hidden) q('where')?.focus(); return; }
    if (b('[data-mv]')) { const x = b('[data-mv]'), s2 = [...L.sections], i = s2.indexOf(x.dataset.k), j = i + +x.dataset.mv; if (j < 0 || j >= s2.length) return; [s2[i], s2[j]] = [s2[j], s2[i]]; saveLayout({ sections: s2 }); return draw(); }
    if (b('[data-hide]')) { saveLayout({ sections: L.sections.filter((k) => k !== b('[data-hide]').dataset.hide) }); return draw(); }
    if (b('[data-show]')) { saveLayout({ sections: [...L.sections, b('[data-show]').dataset.show] }); draw(); return root.querySelector('.addsec')?.previousElementSibling?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    if (b('[data-add]') && canEdit) { const a = b('[data-add]').dataset.add, before = [...S.areas], undo = () => keepPlace('.cd-compare', () => setAreas(before));
      if (S.areas.includes(a)) { if (S.areas.length < 2) return toast('Your report needs at least one area.');
        keepPlace('.cd-compare', () => setAreas(S.areas.filter((x) => x !== a))); return toast(`<b>${esc(a)}</b> removed from the report`, undo); }
      if (S.areas.length >= MAX_AREAS) return toast(`You can compare up to ${MAX_AREAS} areas. Remove one first.`);
      S.flash = a; keepPlace('.cd-compare', () => setAreas([...S.areas, a])); return toast(`✓ <b>${esc(a)}</b> added to the report`, undo); }
    if (b('[data-more]')) { S.rankAll = !S.rankAll; return C.rank(root.querySelector('[data-chart="rank"]')); }
    if (b('[data-tt]')) { S.tType = b('[data-tt]').dataset.tt; root.querySelectorAll('[data-tt]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.tt === S.tType)); return C.types(root.querySelector('[data-chart="types"]')); }
    if (b('[data-gt]')) { S.gType = b('[data-gt]').dataset.gt; root.querySelectorAll('[data-gt]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.gt === S.gType)); return C.growth(root.querySelector('[data-chart="growth"]')); }
    if (b('[data-gy]')) { S.gYears = +b('[data-gy]').dataset.gy; root.querySelectorAll('[data-gy]').forEach((x) => x.setAttribute('aria-pressed', +x.dataset.gy === S.gYears)); return C.growth(root.querySelector('[data-chart="growth"]')); }
    if (b('[data-sv]')) { S.soldView = b('[data-sv]').dataset.sv; const el = root.querySelector('[data-chart="soldm"]'); if (el) C.soldm(el); return; }
    // Area chips pick the area for "Homes sold" when it shows one area at a time; with several areas it shows them all.
    if (b('[data-sa]') && !root.querySelector('[data-chart="soldm"]')) { S.soldArea = b('[data-sa]').dataset.sa; const el = root.querySelector('[data-chart="sold"]'); if (el) { C.sold(el); el.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
    if (b('.mrow')) { const r = b('.mrow'), on = !r.classList.contains('h'); root.querySelectorAll('.mrow').forEach((x) => x.classList.remove('h')); r.classList.toggle('h', on); return; }
    if (b('[data-id="intent"] button')) { const x = b('button'), on = x.getAttribute('aria-pressed') === 'true'; q('intent').querySelectorAll('button').forEach((y) => y.setAttribute('aria-pressed', 'false')); x.setAttribute('aria-pressed', String(!on)); S.intent = on ? null : x.textContent; return msg(); }
    if (b('[data-id="copy"]')) { navigator.clipboard?.writeText(text()).then(() => { q('copy').textContent = 'Copied'; setTimeout(() => q('copy') && (q('copy').textContent = 'Copy message'), 1800); }).catch(() => {}); }
  };
  root.onchange = (e) => { if (e.target.matches('[data-nper]')) { S.nPer = e.target.value; return keepPlace('[data-sec="numbers"]', draw); }
    if (e.target.matches('[data-tper]')) { S.tPer = e.target.value; return keepPlace('[data-sec="types"]', () => C.types(root.querySelector('[data-chart="types"]'))); }
    if (e.target.dataset.id === 'add' && e.target.value) setAreas([...S.areas, e.target.value], e.target.value); };
  root.onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-focus]')) { e.preventDefault(); e.target.click(); } };
  draw();
  if (root._ro) root._ro.disconnect();
  if (window.ResizeObserver) { let w = root.clientWidth, tm; root._ro = new ResizeObserver(() => { const cw = root.clientWidth; if (Math.abs(cw - w) > 24) { w = cw; clearTimeout(tm); tm = setTimeout(charts, 120); } }); root._ro.observe(root); }
}
