// The interactive market report: a page of cards (sections) the agent chooses and orders.
// mountReport(root, D, A, opts) draws it with the agent's branding (A) and layout (A.show).
import { get, money, esc, slug, areasOf, themeVars, palette, mix, lum, phoneFmt, roleLabel, askCopy, first, sourceLine, market, monthKey, TN } from './report.js';
import { salesGroup } from './charts.js';

/* ---------- sections and layout ---------- */
export const SECTIONS = [
  ['numbers', 'Key numbers', 'Price, homes sold, homes for sale, days on market'],
  ['trend', 'Typical price over 12 months', 'Line graph, one line per area'],
  ['market', "Buyer's or seller's market?", 'Where each area sits on the scale'],
  ['types', 'Prices by home type', 'Detached, townhouse and condo, with pictures'],
  ['growth', 'Long-term price growth', 'Growth over 3, 5 and 10 years'],
  ['summary', 'Summary', 'The key points in plain words'],
  ['sold', 'Homes sold each month', 'Bar chart of the last 12 months'],
  ['compare', 'How areas compare', 'Every area ranked by price'],
  ['contact', 'Contact me', 'Your photo and a message box for clients'],
];
const SEC_IDS = SECTIONS.map((s) => s[0]);
export const MAX_AREAS = 6;
// One calm look for every report: white cards on soft grey, blue accent, Inter.
export const CALM = { style: 'calm', ac: '#1d4fbf', bg: '#ffffff', font: 'modern' };
export const DEFAULT_LAYOUT = { sections: SEC_IDS.filter((k) => k !== 'compare'), areas: ['Greater Vancouver'], agentTop: true, clientAreas: true, view: 'side', conf: {} };
// The agent's saved layout, cleaned against this month's data.
export function layoutOf(A, D) {
  const s = (A && A.show) || {}, all = D ? areasOf(D) : null;
  const sections = Array.isArray(s.sections) ? s.sections.filter((k, i, a) => SEC_IDS.includes(k) && a.indexOf(k) === i) : [...DEFAULT_LAYOUT.sections];
  let areas = Array.isArray(s.areas) ? s.areas.filter((a, i, x) => typeof a === 'string' && x.indexOf(a) === i && (!all || all.includes(a))).slice(0, MAX_AREAS) : [];
  if (!areas.length) areas = ['Greater Vancouver'];
  return { sections, areas, agentTop: s.agentTop !== false, clientAreas: s.clientAreas !== false, view: s.view === 'one' ? 'one' : 'side', conf: cleanConf(s.conf, all) };
}
// Per-section choices: title, its own areas, home types, line under the title, explanation, width.
export const TYPE_KEYS = ['detached', 'townhome', 'condo'];
export function cleanConf(c, all) {
  const o = {}; if (!c || typeof c !== 'object') return o;
  for (const k of SEC_IDS) { const x = c[k]; if (!x || typeof x !== 'object') continue; const y = {};
    if (typeof x.title === 'string' && x.title.trim()) y.title = x.title.trim().slice(0, 70);
    if (Array.isArray(x.areas)) { const a = x.areas.filter((v, i, z) => typeof v === 'string' && z.indexOf(v) === i && (!all || all.includes(v))).slice(0, MAX_AREAS); if (a.length) y.areas = a; }
    if (Array.isArray(x.types)) { const t = x.types.filter((v) => TYPE_KEYS.includes(v)); if (t.length && t.length < 3) y.types = t; }
    for (const f of ['sub', 'note']) if (x[f] === false) y[f] = false;
    if (x.size === 'full') y.size = 'full';
    if (Object.keys(y).length) o[k] = y; }
  return o;
}
export const sameLayout = (a, b) => JSON.stringify([a.sections, a.agentTop, a.clientAreas, a.view, a.conf || {}]) === JSON.stringify([b.sections, b.agentTop, b.clientAreas, b.view, b.conf || {}]);
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
  : `<span class="ch ${v < 0 ? 'dn' : v > 0 ? 'up' : ''}"><i>${v < 0 ? '▼' : v > 0 ? '▲' : '●'}</i>${Math.abs(v).toFixed(1)}%${tail ? ` <span>${tail}</span>` : ''}</span>`);
const dot = (c) => `<i class="dt" style="background:${c}"></i>`;
const mkt = (r) => (r == null ? null : r < 12 ? "Buyer's" : r <= 20 ? 'Balanced' : "Seller's");
const TYPE_ROWS = [['detached', 'Detached'], ['townhome', 'Townhouse'], ['condo', 'Condo']];
const HOUSE = {
  detached: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  townhome: '<path d="M2 11 6 7l4 4 4-4 4 4 4-4"/><path d="M3 10v9h18v-9"/><path d="M6 19v-4M12 19v-4M18 19v-4"/>',
  condo: '<path d="M5 20V9h5v11"/><path d="M10 20V4h9v16"/><path d="M13 8h3M13 12h3M13 16h3"/><path d="M3 20h18"/>',
  composite: '<path d="M3 12 9 7l6 5"/><path d="M5 11v8h8v-8"/><path d="M14 9l3-2 4 3v9h-6"/>',
};
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
  const S = { areas: [...start], focus: opts.area && start.includes(opts.area) ? opts.area : start[0], view: L.view, soldArea: null, gType: 'composite', gYears: 2, intent: null };
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

  /* ----- section renderers: each returns [html, after-draw hook] ----- */
  const card = (id, h, sub, body, extra = '', raw) => { const c = raw ? {} : CF(id); if (c.title) h = esc(c.title); if (c.sub === false) sub = '';
    return `<section class="cd cd-${id}" data-sec="${id}"><div class="ch-h"><div><h3>${h}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${extra}</div>${body}</section>`; };
  const note = (k, t) => (CF(k).note === false ? '' : `<p class="note">${t}</p>`);
  const R = {};
  R.numbers = () => {
    const sh = areasFor('numbers');
    if (sh.length === 1) {
      const a = sh[0], o = all(a), dd = o.dom != null && o.domLy != null ? o.dom - o.domLy : null;
      const k = (lab, val, chg) => `<div class="kpi"><span class="kl">${lab}</span><b class="kv">${val}</b><span class="kc">${chg}</span></div>`;
      return `<div class="kpis" data-sec="numbers">${[
        k('Typical home price', o.price ? money(o.price) : '—', o.price ? `${arrow(o.yoy)} vs ${lastYear}` : '<span class="na">not published</span>'),
        k(`Homes sold in ${mon}`, o.sales != null ? N(o.sales) : '—', o.salesLy ? `${arrow(pctOf(o.sales, o.salesLy))} vs ${lastYear}` : '<span class="na">no comparison published</span>'),
        k('Homes for sale now', o.active != null ? N(o.active) : '—', o.activeLy ? `${arrow(pctOf(o.active, o.activeLy))} vs ${lastYear}` : '<span class="na">no comparison published</span>'),
        k('Days on market (average)', o.dom != null ? `${o.dom} days` : '—', dd == null ? (o.dom == null ? '<span class="na">not published</span>' : '') : dd === 0 ? `Same as ${lastYear}` : `${Math.abs(dd)} day${Math.abs(dd) === 1 ? '' : 's'} ${dd > 0 ? 'longer' : 'shorter'} than ${lastYear}`),
      ].join('')}</div>`;
    }
    const t = (h, sub, c2, c3, row) => card('numbers', h, sub, `<table class="tb"><thead><tr><th>Area</th><th>${c2}</th><th>${c3}</th></tr></thead><tbody>${sh.map((a) => `<tr><td><span class="ma">${dot(colour(a))}${esc(a)}</span></td>${row(all(a))}</tr>`).join('')}</tbody></table>`, '', true);
    return `<div class="trio" data-sec="numbers">${[
      t('Typical home price', `${mon}, and the change from ${lastYear}`, 'Typical price', 'Change in 1 year', (o) => `<td class="n">${o.price ? money(o.price) : '—'}</td><td>${arrow(o.yoy)}</td>`),
      t('Homes sold', `In ${mon}, and the change from ${lastYear}`, 'Homes sold', 'Change in 1 year', (o) => `<td class="n">${o.sales != null ? N(o.sales) : '—'}</td><td>${arrow(pctOf(o.sales, o.salesLy))}</td>`),
      t('Homes for sale', 'Listed now, and how long homes take to sell', 'For sale', 'Days on market', (o) => `<td class="n">${o.active != null ? N(o.active) : '—'}</td><td>${o.dom != null ? `${o.dom} days` : '<span class="na">not published</span>'}</td>`),
    ].join('')}</div>`;
  };
  R.trend = () => { const sh = areasFor('trend'), one = sh.length === 1;
    return card('trend', 'Typical price over 12 months', one ? `${esc(sh[0])}, MLS® HPI benchmark price` : `Change since ${mName(addM(endKey, -11))} ${addM(endKey, -11).slice(0, 4)}, so areas with very different prices are easy to compare`,
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
  R.types = () => { const sh = areasFor('types'), TR = typesFor('types');
    if (sh.length === 1) { const a = sh[0];
      return card('types', 'Prices by home type', `${esc(a)}, typical price and the change since ${lastYear}`, `<div class="tiles" style="--tc:${TR.length}">${TR.map(([t, l]) => { const o = get(D, a, t);
        return `<div class="tile">${house(t, 38)}<div><span class="kl">${l}</span><b class="kv sm">${o.price ? money(o.price) : '—'}</b>${o.price ? arrow(o.yoy, 'in 1 year') : '<span class="na">not published</span>'}</div></div>`; }).join('')}</div>`); }
    return card('types', 'Prices by home type', `Typical price, and the change since ${lastYear}`, `<div class="scroll"><table class="tb ht"><thead><tr><th>Home type</th>${sh.map((a) => `<th>${dot(colour(a))}${esc(a)}</th>`).join('')}</tr></thead><tbody>${TR.map(([t, l]) => `<tr><td><span class="hn">${house(t)}${l}</span></td>${sh.map((a) => { const o = get(D, a, t); return `<td><b class="n">${o.price ? money(o.price) : '—'}</b>${o.price ? arrow(o.yoy, 'in 1 year') : '<span class="na">not published</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`); };
  R.growth = () => { const ts = typesFor('growth').map(([t]) => t), tabs = [['composite', 'All homes'], ['detached', 'Detached'], ['townhome', 'Townhouses'], ['condo', 'Condos']].filter(([k]) => (k === 'composite' ? ts.length === 3 : ts.includes(k)));
    if (!tabs.some(([k]) => k === S.gType)) S.gType = tabs[0][0];
    return card('growth', 'Long-term price growth', 'How much the typical price changed over the years', `<div class="gt">${tabs.length > 1 ? tabs.map(([k, l]) => `<button type="button" class="tab" data-gt="${k}" aria-pressed="${S.gType === k}">${house(k, 22)}${l}</button>`).join('') : ''}</div><div class="gb" data-chart="growth"></div>`,
    areasFor('growth').length === 1 ? '' : `<div class="seg" role="group" aria-label="Years">${[3, 5, 10].map((y, i) => `<button type="button" data-gy="${i}" aria-pressed="${S.gYears === i}">${y} years</button>`).join('')}</div>`); };
  R.summary = () => { const sh = areasFor('summary'); return card('summary', 'Summary', sh.length > 1 ? `Across your ${sh.length} areas` : esc(sh[0]), `<ol class="sum">${summaryPoints(sh).map((t, i) => `<li><em>${i + 1}</em><span>${t}</span></li>`).join('')}</ol>`); };
  R.sold = () => { const sh = areasFor('sold'); if (!sh.includes(S.soldArea)) S.soldArea = sh[0];
    return card('sold', 'Homes sold each month', `<span data-id="soldsub"></span>`, `${CF('sold').areas && sh.length > 1 ? `<div class="mini">${sh.map((a) => `<button type="button" data-sa="${esc(a)}" aria-pressed="${a === S.soldArea}">${dot(colour(a))}${esc(a)}</button>`).join('')}</div>` : ''}<div data-chart="sold"></div>`); };
  R.compare = () => card('compare', 'How areas compare', `Typical home price in every area, with the change from ${lastYear}.${canEdit ? ' Tap an area to add it.' : ''}`, `<div class="rank" data-chart="rank"></div>`);
  R.contact = () => `<section class="cd cd-contact" data-sec="contact"><div class="crow">${A.photo ? `<img class="av" src="${esc(A.photo)}" alt="">` : ''}<div class="cx"><h3>Questions about your area?</h3><p class="sub">${esc([A.name, roleLabel(A), A.brokerage, A.phone].filter(Boolean).join(' · '))}</p></div><button type="button" class="btn" data-id="ctog">Contact ${F}</button></div>
    <div class="cbox" data-id="cbox" hidden><div class="cgrid"><label class="fl">${ask.lab}<input type="text" data-id="where" placeholder="${ask.ph}"></label>
    <div><span class="fl">I am</span><div class="chips" data-id="intent" role="group" aria-label="I am">${ask.chips.map((c) => `<button type="button" aria-pressed="false">${esc(c)}</button>`).join('')}</div></div></div>
    <div><span class="fl">Your message to ${F}</span><p class="msg" data-id="msg"></p></div>
    <div class="btns">${A.contact_email ? `<a class="btn" data-id="mail" href="#">Email ${F}</a>` : ''}${A.phone ? `<a class="btn alt" data-id="sms" href="#">Text ${F}</a>` : ''}<button class="btn alt" type="button" data-id="copy">Copy message</button></div></div></section>`;

  function summaryPoints(sh) {
    const o = Object.fromEntries(sh.map((a) => [a, all(a)])), out = [];
    if (sh.length === 1) { const a = sh[0], x = o[a];
      if (x.price) out.push(`The typical home in ${esc(a)} is <b>${money(x.price)}</b>${x.yoy ? `, <b>${x.yoy < 0 ? 'down' : 'up'} ${Math.abs(x.yoy).toFixed(1)}%</b> from a year ago` : ''}.`);
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
  C.trend = (el) => {
    const sh = areasFor('trend'), one = sh.length === 1, keys = Array.from({ length: 12 }, (_, i) => addM(endKey, i - 11));
    const ser = sh.map((a) => { const h = D.history?.price?.composite?.[a] || {}, base = h[keys.find((k) => h[k])];
      return { a, c: one ? 'var(--ac)' : colour(a), v: keys.map((k) => (h[k] ? (one ? h[k] : (h[k] / base - 1) * 100) : null)) }; }).filter((s) => s.v.filter((x) => x != null).length > 1);
    if (!ser.length) { el.innerHTML = '<p class="na">Not enough history for this area yet.</p>'; return; }
    const W = Math.max(280, el.clientWidth || 600), H = W < 480 ? 200 : 236, l = 6, r = one ? 62 : 48, t = 12, b = 28, vals = ser.flatMap((s) => s.v.filter((x) => x != null));
    let lo = Math.min(...vals), hi = Math.max(...vals); if (!one) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); } const pad = (hi - lo || Math.abs(hi) * 0.05 || 1) * 0.12; lo -= pad; hi += pad;
    const st = niceStep(hi - lo, 4), x = (i) => l + (i * (W - l - r)) / 11, y = (v) => t + ((hi - v) / (hi - lo)) * (H - t - b);
    let g = '';
    for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) g += `<line x1="${l}" x2="${W - r + 4}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${W - r + 12}" y="${y(v) + 4}" class="ax">${one ? short(v) : (Math.abs(v) < 1e-9 ? '0' : (v > 0 ? '+' : '−') + Math.abs(+v.toFixed(1))) + '%'}</text>`;
    keys.forEach((k, i) => { if ((11 - i) % 2 === 0) g += `<text x="${x(i)}" y="${H - 8}" class="ax" text-anchor="${i === 11 ? 'end' : 'middle'}">${mName(k)}${i === 1 ? ' ’' + k.slice(2, 4) : ''}</text>`; });
    const path = (s) => s.v.map((v, i) => (v == null ? '' : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(' ');
    if (one) { const s = ser[0], pts = s.v.map((v, i) => [i, v]).filter((q) => q[1] != null); g += `<path d="M${pts.map(([i, v]) => `${x(i)},${y(v)}`).join('L')}L${x(pts[pts.length - 1][0])},${H - b}L${x(pts[0][0])},${H - b}Z" fill="var(--ac)" opacity=".07"/>`; }
    g += ser.map((s) => `<polyline fill="none" stroke="${s.c}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" points="${path(s)}"/>${s.v[11] != null ? `<circle cx="${x(11)}" cy="${y(s.v[11])}" r="4" fill="${s.c}"/>` : ''}`).join('');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Typical price over the last 12 months">${g}<line class="hx" y1="${t}" y2="${H - b}" opacity="0"/><g class="hd"></g><rect width="${W}" height="${H}" fill="transparent"/></svg><div class="ctip"></div>`;
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
  C.growth = (el) => {
    const G = D.growth?.[S.gType] || {}, p = S.gYears, yrs = [3, 5, 10][p], tn = { composite: '', detached: 'detached homes', townhome: 'townhouses', condo: 'condos' }[S.gType];
    const sh = areasFor('growth'), have = sh.filter((a) => G[a]), miss = sh.filter((a) => !G[a]);
    if (!have.length) { el.innerHTML = '<p class="na">Long-term numbers are not published for this home type here.</p>'; return; }
    if (sh.length === 1) return growthOne(el, sh[0], G, tn);
    const vals = have.map((a) => G[a][p]), lo = Math.min(0, ...vals), hi = Math.max(0, ...vals), span = hi - lo || 1, L0 = lo - span * 0.22, H0 = hi + span * 0.3, X = (v) => ((v - L0) / (H0 - L0)) * 100;
    const sorted = [...have].sort((a, b) => G[b][p] - G[a][p]), best = sorted[0], worst = sorted[sorted.length - 1], st = niceStep(H0 - L0, 4), ticks = [];
    for (let v = Math.ceil(L0 / st) * st; v <= H0; v += st) ticks.push(Math.round(v * 10) / 10);
    const what = tn ? ` ${tn}` : '';
    const lines = [have.length > 1 ? `Over ${yrs} years, <b>${esc(best)}</b>${what} grew the most of these areas: <b>${signed(G[best][p])}</b>.` : `Over ${yrs} years, the typical price of${tn ? ` ${tn} in` : ' a home in'} <b>${esc(best)}</b> changed by <b>${signed(G[best][p])}</b>.`];
    if (have.length > 1) lines.push(G[worst][p] < 0 ? `<b>${esc(worst)}</b>${what} ${tn ? 'are' : 'prices are'} ${Math.abs(G[worst][p]).toFixed(1)}% lower than ${yrs} years ago.` : `Every area is higher than ${yrs} years ago.`);
    el.innerHTML = `<div class="gg"><div>${sorted.map((a) => { const v = G[a][p], x0 = X(0), x1 = X(v);
      return `<div class="hb"><span class="ma">${dot(colour(a))}${esc(a)}</span><div class="trk"><span class="z" style="left:${x0}%"></span><span class="f" style="left:${Math.min(x0, x1)}%;width:${Math.abs(x1 - x0)}%;background:${colour(a)}"></span><span class="v ${v < 0 ? 'dn' : 'up'}" style="${v >= 0 ? `left:calc(${x1}% + 8px)` : `right:calc(${100 - x1}% + 8px)`}">${signed(v)}</span></div></div>`; }).join('')}
      ${miss.map((a) => `<div class="hb"><span class="ma">${dot(colour(a))}${esc(a)}</span><span class="na">not published</span></div>`).join('')}
      <div class="hb axis"><span></span><div class="trk">${ticks.map((t) => `<span style="left:${X(t)}%">${t > 0 ? '+' : ''}${t}%</span>`).join('')}</div></div></div>
      <div class="ins">${lines.map((t) => `<p>${t}</p>`).join('')}<p class="note">Change in the MLS® Home Price Index benchmark price. Past growth doesn't guarantee future growth.</p></div></div>`;
  };
  function growthOne(el, a, G, tn) {
    const v3 = G[a], what = tn || 'homes', X0 = Math.min(0, ...v3), X1 = Math.max(0, ...v3), sp = X1 - X0 || 1, L0 = X0 - sp * 0.22, H0 = X1 + sp * 0.3, X = (v) => ((v - L0) / (H0 - L0)) * 100;
    const st = niceStep(H0 - L0, 4), ticks = []; for (let v = Math.ceil(L0 / st) * st; v <= H0; v += st) ticks.push(Math.round(v * 10) / 10);
    const line = (i) => `${['3', '5', '10'][i]} years: <b>${signed(v3[i])}</b>`;
    el.innerHTML = `<div class="gg"><div>${[0, 1, 2].map((i) => { const v = v3[i], x0 = X(0), x1 = X(v);
      return `<div class="hb"><span class="ma">Over ${[3, 5, 10][i]} years</span><div class="trk"><span class="z" style="left:${x0}%"></span><span class="f" style="left:${Math.min(x0, x1)}%;width:${Math.abs(x1 - x0)}%;background:var(--ac);opacity:${0.45 + i * 0.27}"></span><span class="v ${v < 0 ? 'dn' : 'up'}" style="${v >= 0 ? `left:calc(${x1}% + 8px)` : `right:calc(${100 - x1}% + 8px)`}">${signed(v)}</span></div></div>`; }).join('')}
      <div class="hb axis"><span></span><div class="trk">${ticks.map((t) => `<span style="left:${X(t)}%">${t > 0 ? '+' : ''}${t}%</span>`).join('')}</div></div></div>
      <div class="ins"><p>Typical price of ${esc(what)} in <b>${esc(a)}</b>.</p><p>${[2, 1, 0].map(line).join('<br>')}</p><p class="note">Change in the MLS® Home Price Index benchmark price. Past growth doesn't guarantee future growth.</p></div></div>`;
  }
  C.rank = (el) => {
    const rows = ALL.map((a) => ({ a, ...all(a) })).filter((r) => r.price).sort((x, y) => y.price - x.price), max = rows[0]?.price || 1;
    const cut = 8, list = S.rankAll ? rows : rows.filter((r, i) => i < cut || S.areas.includes(r.a));
    el.innerHTML = list.map((r) => { const on = S.areas.includes(r.a);
      return `<${canEdit ? 'button type="button"' : 'div'} class="rr${on ? ' on' : ''}" data-add="${esc(r.a)}"><span class="ma">${on ? dot(colour(r.a)) : '<i class="dt off"></i>'}${esc(r.a)}</span><span class="rb"><i style="width:${((r.price / max) * 100).toFixed(1)}%${on ? `;background:${colour(r.a)}` : ''}"></i></span><b class="n">${money(r.price)}</b>${arrow(r.yoy)}</${canEdit ? 'button' : 'div'}>`; }).join('') + (rows.length > list.length || S.rankAll ? `<button type="button" class="more" data-more>${S.rankAll ? 'Show fewer' : `Show all ${rows.length} areas`}</button>` : '');
  };

  /* ----- page ----- */
  const PAIR = { trend: 7, market: 5, summary: 6, sold: 6 };
  const pairs = (k) => PAIR[k] && CF(k).size !== 'full';
  function rows(secs) { const out = []; for (let i = 0; i < secs.length; i++) { const a = secs[i], b = secs[i + 1]; if (pairs(a) && pairs(b)) { out.push([a, b]); i++; } else out.push([a]); } return out; }
  function areaBar() {
    if (!canEdit && S.areas.length < 2) return '';
    const free = ALL.filter((a) => !S.areas.includes(a)), one = S.view === 'one' && S.areas.length > 1;
    return `<div class="abar"><span class="al">Areas</span><div class="chs">${S.areas.map((a) => `<span class="chip tabby${one && a === S.focus ? ' on' : ''}" ${one ? `data-focus="${esc(a)}"` : `data-sa="${esc(a)}"`} role="button" tabindex="0">${dot(colour(a))}${esc(a)}${canEdit && S.areas.length > 1 ? `<button type="button" class="x" data-rm="${esc(a)}" aria-label="Remove ${esc(a)}">✕</button>` : ''}</span>`).join('')}
      ${canEdit && S.areas.length < MAX_AREAS && free.length ? `<label class="add">+ Add area<select data-id="add" aria-label="Add an area"><option value="">Add an area</option>${free.map((a) => `<option>${esc(a)}</option>`).join('')}</select></label>` : ''}</div>
      ${S.areas.length > 1 ? `<div class="seg" role="group" aria-label="How to show several areas"><button type="button" data-view="side" aria-pressed="${S.view === 'side'}">Side by side</button><button type="button" data-view="one" aria-pressed="${S.view === 'one'}">One at a time</button></div>` : ''}</div>`;
  }
  const NAME = Object.fromEntries(SECTIONS.map(([k, l]) => [k, l]));
  // Agent view: click a section to edit it (outlined, with an "Editing" tag); "+ Add a section" at the end.
  function sec(k) { const h = R[k](); return ED ? `<div class="sx${opts.selected === k ? ' ed' : ''}" data-k="${k}">${h}</div>` : h; }
  const addBox = () => `<button type="button" class="addsec2${opts.adding ? ' on' : ''}" data-addsec>+ Add a section</button>`;
  root._select = (k) => root.querySelectorAll('.sx').forEach((x) => x.classList.toggle('ed', x.dataset.k === k));
  root._adding = (on) => root.querySelector('.addsec2')?.classList.toggle('on', !!on);
  function saveLayout(patch) { Object.assign(L, patch); if (ED) opts.edit({ ...L }); }
  function draw() {
    const sh = shown(), secs = L.sections.filter((k) => k !== 'growth' || D.growth).filter((k) => k !== 'compare' || ALL.length > 1);
    const head = sh.length === 1 ? `${esc(sh[0])} Market Report` : `Market Report: ${sh.length} areas`;
    root.innerHTML = `<div class="bw"><header class="top"><div><h1>${head}</h1><p class="sub">${esc(D.month)} · Source: Greater Vancouver REALTORS®</p></div>
      ${L.agentTop && A.name ? `<div class="agent">${A.photo ? `<img class="av" src="${esc(A.photo)}" alt="">` : ''}<div><b>${esc(A.name)}</b><span>${esc([roleLabel(A), A.brokerage].filter(Boolean).join(' · '))}</span>${A.phone ? `<span>${esc(A.phone)}</span>` : ''}</div>${A.logo ? `<img class="lg" src="${esc(A.logo)}" alt="">` : ''}</div>` : ''}</header>
      ${areaBar()}${rows(secs).map((r) => (r.length === 2 ? `<div class="pair" style="grid-template-columns:${PAIR[r[0]]}fr ${PAIR[r[1]]}fr">${sec(r[0])}${sec(r[1])}</div>` : sec(r[0]))).join('')}${ED ? addBox() : ''}
      <footer>${esc(sourceLine(D))}</footer></div>`;
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
    if (ED && b('.sx') && !b('button,a,input,select,label,.mrow,[data-chart="trend"]')) { const k = b('.sx').dataset.k; root._select(k); opts.onSelect?.(k); }
    if (b('[data-rm]')) { e.stopPropagation(); const a = b('[data-rm]').dataset.rm; return setAreas(S.areas.filter((x) => x !== a)); }
    if (b('[data-focus]')) { S.focus = b('[data-focus]').dataset.focus; return draw(); }
    if (b('[data-view]')) { S.view = b('[data-view]').dataset.view; if (ED) saveLayout({ view: S.view }); return draw(); }
    if (b('[data-id="ctog"]')) { const x = q('cbox'); x.hidden = !x.hidden; if (!x.hidden) q('where')?.focus(); return; }
    if (b('[data-mv]')) { const x = b('[data-mv]'), s2 = [...L.sections], i = s2.indexOf(x.dataset.k), j = i + +x.dataset.mv; if (j < 0 || j >= s2.length) return; [s2[i], s2[j]] = [s2[j], s2[i]]; saveLayout({ sections: s2 }); return draw(); }
    if (b('[data-hide]')) { saveLayout({ sections: L.sections.filter((k) => k !== b('[data-hide]').dataset.hide) }); return draw(); }
    if (b('[data-show]')) { saveLayout({ sections: [...L.sections, b('[data-show]').dataset.show] }); draw(); return root.querySelector('.addsec')?.previousElementSibling?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    if (b('[data-add]') && canEdit) { const a = b('[data-add]').dataset.add; if (S.areas.includes(a)) { if (S.view === 'one') { S.focus = a; draw(); } return; }
      if (S.areas.length >= MAX_AREAS) return; setAreas([...S.areas, a], a); return root.querySelector('.abar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (b('[data-more]')) { S.rankAll = !S.rankAll; return C.rank(root.querySelector('[data-chart="rank"]')); }
    if (b('[data-gt]')) { S.gType = b('[data-gt]').dataset.gt; root.querySelectorAll('[data-gt]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.gt === S.gType)); return C.growth(root.querySelector('[data-chart="growth"]')); }
    if (b('[data-gy]')) { S.gYears = +b('[data-gy]').dataset.gy; root.querySelectorAll('[data-gy]').forEach((x) => x.setAttribute('aria-pressed', +x.dataset.gy === S.gYears)); return C.growth(root.querySelector('[data-chart="growth"]')); }
    if (b('[data-sa]')) { S.soldArea = b('[data-sa]').dataset.sa; const el = root.querySelector('[data-chart="sold"]'); if (el) { C.sold(el); el.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
    if (b('.mrow')) { const r = b('.mrow'), on = !r.classList.contains('h'); root.querySelectorAll('.mrow').forEach((x) => x.classList.remove('h')); r.classList.toggle('h', on); return; }
    if (b('[data-id="intent"] button')) { const x = b('button'), on = x.getAttribute('aria-pressed') === 'true'; q('intent').querySelectorAll('button').forEach((y) => y.setAttribute('aria-pressed', 'false')); x.setAttribute('aria-pressed', String(!on)); S.intent = on ? null : x.textContent; return msg(); }
    if (b('[data-id="copy"]')) { navigator.clipboard?.writeText(text()).then(() => { q('copy').textContent = 'Copied'; setTimeout(() => q('copy') && (q('copy').textContent = 'Copy message'), 1800); }).catch(() => {}); }
  };
  root.onchange = (e) => { if (e.target.dataset.id === 'add' && e.target.value) setAreas([...S.areas, e.target.value], e.target.value); };
  root.onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-focus],[data-sa]')) { e.preventDefault(); e.target.click(); } };
  draw();
  if (root._ro) root._ro.disconnect();
  if (window.ResizeObserver) { let w = root.clientWidth, tm; root._ro = new ResizeObserver(() => { const cw = root.clientWidth; if (Math.abs(cw - w) > 24) { w = cw; clearTimeout(tm); tm = setTimeout(charts, 120); } }); root._ro.observe(root); }
}
