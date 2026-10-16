// The "Neighbourhoods" section: one card per city picked at the top, the client's own neighbourhood first,
// every neighbourhood in the open city as one ranked list, two neighbourhoods side by side (any city), and the agent's take.
// Data: D.hoods (see scripts/hoods-from-gvr.py).
import { esc, money, first } from './report.js';
import { HOOD_BLOCK_KEYS } from './layout.js';

// Positions in each neighbourhood's numbers: [price, 1m, 3m, 6m, 1y, 3y, 5y, 10y, since January]
const I = { p: 0, m1: 1, m3: 2, m6: 3, y1: 4, y3: 5, y5: 6, y10: 7, sj: 8 };
export const HTYPES = [['d', 'Detached', 'detached homes'], ['t', 'Townhouse', 'townhouses'], ['c', 'Condo', 'condos']];
// The time buttons: full words on a computer, short words on a phone. "Last month" is left out on purpose:
// small neighbourhoods have few sales, so one month jumps around too much.
export const PERIODS = [['sj', 'Since January', 'Since Jan'], ['y1', '1 year', '1 yr'], ['y3', '3 years', '3 yrs'], ['y5', '5 years', '5 yrs'], ['y10', '10 years', '10 yrs']];
const WHEN = { sj: 'since January', y1: 'in 1 year', y3: 'in 3 years', y5: 'in 5 years', y10: 'in 10 years' };
const START_PER = 'y5';
// Labels for the parts an agent can switch off. The keys come from layout.js, so the server accepts exactly these.
const BLOCK_LABELS = { hero: ['Their neighbourhood', 'Big price, and the change in dollars'], tiles: ['Every neighbourhood', 'One ranked list with prices and bars'],
  compare: ['Compare two', 'Side by side, any city'], take: ['Your take', 'A short note with your photo'] };
export const BLOCKS = HOOD_BLOCK_KEYS.map((k) => [k, ...BLOCK_LABELS[k]]);
const CITY = '*';

export const hoodCities = (D) => Object.keys(D.hoods || {}).sort();
export const hoodNames = (D, city) => Object.keys(D.hoods?.[city] || {}).filter((n) => n !== CITY).sort();
// The city the section opens on for the agent: their own choice when it is one of the report's areas,
// else the first report area with neighbourhoods. Only when no area has any (Greater Vancouver alone) does
// their choice apply on its own.
export function defaultCity(D, conf, areas) {
  const H = D.hoods || {}, withH = (areas || []).filter((a) => H[a]);
  if (conf.city && withH.includes(conf.city)) return conf.city;
  if (withH.length) return withH[0];
  if (conf.city && H[conf.city]) return conf.city;
  return H['Vancouver West'] ? 'Vancouver West' : hoodCities(D)[0];
}

const pc = (v) => (v == null ? '<span class="na">—</span>' : `<span class="nb-v ${v < 0 ? 'dn' : v > 0 ? 'upv' : ''}">${v < 0 ? '▼' : v > 0 ? '▲' : '●'} ${Math.abs(v).toFixed(1)}%</span>`);
const pill = (v) => (v == null ? '' : `<i class="nb-pill ${v < 0 ? 'dn' : 'upv'}">${v < 0 ? '▼' : '▲'} ${Math.abs(v).toFixed(1)}%</i>`);
const short = (v) => (v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : '$' + Math.round(v / 1000) + 'K');
const round100 = (v) => Math.round(v / 100) * 100;
const then = (p, v) => p / (1 + v / 100);
const dollars = (p, v) => (v == null ? null : round100(p - then(p, v)));
// How many of a group, in plain words: "3 of 9 neighbourhoods have", "all 9 neighbourhoods have", "both neighbourhoods have",
// "no neighbourhood has", "the only neighbourhood has". Never "9 of 9". Use it for every count in a sentence.
export function countPhrase(k, n, noun = 'neighbourhood') {
  const pl = `${noun}s`;
  if (n === 1) return k ? `the only ${noun} has` : `the only ${noun} doesn't have`;
  if (k === 0) return `no ${noun} has`;
  if (k === n) return n === 2 ? `both ${pl} have` : `all ${n} ${pl} have`;
  return `${k} of ${n} ${k === 1 ? `${pl} has` : `${pl} have`}`;
}
// The message when someone taps a city that has no neighbourhoods. [title, text, offer to ask the agent]
const NO_HOODS = (c) => (c === 'Greater Vancouver'
  ? ["Greater Vancouver isn't split into neighbourhoods", "It's the whole region, made up of cities. Its numbers are in the rest of the report. Tap a city here to see its neighbourhoods.", false]
  : [`${c} isn't split into neighbourhoods`, `It's a smaller market, so prices are shown for ${c} as a whole in the rest of the report. Want to know about a specific street?`, true]);

// ctx: { D, A, conf, areas, colour(area), edit (agent view), personal, track(kind, data), onCity(city) }
export function makeHoods(ctx) {
  const { D, A, conf } = ctx, H = D.hoods || {}, key = `mup_hood:${A.slug || 'x'}`;
  let saved = {};
  if (!ctx.edit) try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
  const P = ctx.personal && H[ctx.personal.city]?.[ctx.personal.hood] ? ctx.personal : null;
  const S = { city: null, homeCity: null, home: null, type: P?.type || saved.type || conf.type || 'd', per: START_PER, cmp: null, note: null, peek: null,
    seen: Array.isArray(saved.seen) ? saved.seen.filter((s) => typeof s === 'string' && s.includes('|')) : [], browse: !!saved.looking, reopen: false, rankAll: false, allCities: false,
    areas: [], focus: null, fromTop: false, synced: false };
  // The client's own neighbourhood: a personal link, then what this phone remembers, then the agent's "shown first".
  const homeOf = (c, h) => (c && h && H[c]?.[h] ? [c, h] : null);
  const agentCity = conf.city && H[conf.city] ? conf.city : null;
  [S.homeCity, S.home] = homeOf(P?.city, P?.hood) || homeOf(saved.homeCity || saved.city, saved.home) || homeOf(agentCity || defaultCity(D, conf, ctx.areas), conf.home) || [null, null];
  if (conf.cmp && agentCity && H[agentCity][conf.cmp]) S.cmp = { c: agentCity, h: conf.cmp };

  const on = (b) => !(conf.off || []).includes(b);
  const save = () => { if (ctx.edit) return; try { localStorage.setItem(key, JSON.stringify({ homeCity: S.homeCity, home: S.home, type: S.type, seen: S.seen.slice(0, 6), looking: S.browse && !S.home })); } catch {} };
  const hs = () => H[S.city] || {};
  const row = (n, c = S.city) => H[c]?.[n]?.[S.type] || null;
  const homeRow = () => (S.home ? row(S.home, S.homeCity) : null);
  // Is the client's own neighbourhood in the city on screen?
  const here = () => !!S.home && S.homeCity === S.city;
  const typesHere = () => HTYPES.filter(([t]) => Object.values(hs()).some((x) => x[t]));
  const tname = () => HTYPES.find(([t]) => t === S.type)[2];
  const tlab = () => HTYPES.find(([t]) => t === S.type)[1];
  const tsing = () => ({ d: 'detached home', t: 'townhouse', c: 'condo' })[S.type];
  const nameIn = (c, h) => (h === CITY ? `${c} overall` : h);
  // The cities that get a card: every area picked at the top, plus the client's own city when it isn't one of them.
  const cardCities = () => (S.homeCity && !S.areas.includes(S.homeCity) ? [...S.areas, S.homeCity] : S.areas);
  const withHoods = () => cardCities().filter((c) => H[c]);
  let el = null;

  function fixType() {
    const ts = typesHere().map(([t]) => t); if (!ts.includes(S.type)) S.type = ts[0] || 'd';
    if (here() && !homeRow()) { const t2 = HTYPES.find(([t]) => hs()[S.home]?.[t]); if (t2) S.type = t2[0]; }
  }

  /* ----- which city is open -----
     Called by the report every time it redraws, with the areas at the top and the one tapped there (if any).
     The section only ever opens on a city that has a card. In order: a personal link's city, the client's own city
     (when it is one of the areas), a city tapped at the top, the agent's city (when it is one of the areas), the first
     area with neighbourhoods. With no such area (Greater Vancouver alone) the client chooses from every city. */
  function sync(areas, focus) {
    const was = S.focus, first = !S.synced; S.areas = [...areas]; S.focus = focus || null; S.synced = true;
    if (!first && S.focus && H[S.focus] && S.focus !== was) { S.city = S.focus; S.fromTop = true; S.note = null; return; }
    const top = S.areas.filter((a) => H[a]);
    if (S.city && withHoods().includes(S.city)) return;
    if (!top.length && S.city && H[S.city] && !first) return;
    S.fromTop = false; S.note = null;
    if (first && P) { S.city = P.city; return; }
    S.city = top.length ? [S.homeCity, agentCity].find((c) => c && top.includes(c)) || top[0] : [S.homeCity, agentCity].find((c) => c) || defaultCity(D, conf, []);
  }
  sync(ctx.areas || [], null);

  /* ----- the city cards ----- */
  function bestIn(c) {
    const k = S.per, ns = hoodNames(D, c).filter((n) => row(n, c)?.[I[k]] != null);
    if (ns.length < 2) return '';
    const b = ns.reduce((a, n) => (row(n, c)[I[k]] > row(a, c)[I[k]] ? n : a)), v = row(b, c)[I[k]];
    return `<small class="nb-best">${v > 0 ? 'Grew most' : 'Smallest drop'}: ${esc(b)} ${pc(v)}</small>`;
  }
  function cityCard(c) {
    const dot = `<i class="nb-cdot" style="background:${ctx.colour ? ctx.colour(c) : 'var(--ac)'}"></i>`;
    if (!H[c]) return `<button type="button" class="nb-cd nb-no" data-hno="${esc(c)}" aria-pressed="${S.note === c}"><b>${dot}${esc(c)}</b><span>ⓘ No neighbourhoods</span><span class="nb-cw">${c === 'Greater Vancouver' ? 'Whole region' : 'Whole area'}</span></button>`;
    const v = H[c][CITY]?.[S.type]?.[I[S.per]], mine = S.home && S.homeCity === c;
    return `<button type="button" class="nb-cd" data-hcard="${esc(c)}" aria-pressed="${c === S.city}"><b>${dot}<span>${esc(c)}${mine ? ' <em class="nb-star" title="Your area is here">★</em>' : ''}</span></b>
      <span>${(() => { const k = hoodNames(D, c).filter((n) => row(n, c)).length; return `${k} neighbourhood${k === 1 ? '' : 's'}`; })()}</span><strong>${pc(v)}</strong>${bestIn(c)}</button>`;
  }
  function note() {
    if (!S.note) return '';
    const [t, x, askMe] = NO_HOODS(S.note), contact = askMe && el?.closest('.bd')?.querySelector('[data-sec="contact"]');
    return `<div class="nb-msg" role="status"><span class="nb-mi">i</span><div><b>${esc(t)}</b>${esc(x)}${contact ? ' <button type="button" class="nb-lk in" data-hask>Ask me</button>' : ''}</div><button type="button" class="nb-mx" data-hnox aria-label="Close">✕</button></div>`;
  }
  function cards() {
    const cs = cardCities();
    if (cs.length < 2) return '';
    const hint = S.fromTop ? `Showing ${esc(S.city)}, the area you picked at the top.` : `Showing ${esc(S.city)}. Tap another city to switch.`;
    return `<div class="nb-cards" role="group" aria-label="Cities">${cs.map(cityCard).join('')}</div><p class="nb-hint">${hint} <span>${esc(tname()[0].toUpperCase() + tname().slice(1))}, change ${WHEN[S.per]}.</span></p>${note()}`;
  }
  // No area at the top has neighbourhoods (for example Greater Vancouver alone): the client chooses a city.
  function chooser() {
    const all = hoodCities(D), only = S.areas[0] || 'Greater Vancouver';
    const list = S.allCities ? all : [S.city, ...all.filter((c) => c !== S.city)].slice(0, 6);
    return `<p class="nb-intro">${esc(only)} ${only === 'Greater Vancouver' ? 'is the whole region' : "isn't split into neighbourhoods"}. Choose a city to see its neighbourhoods.</p>
      <div class="nb-grid">${list.map((c) => `<button type="button" data-hcard="${esc(c)}" aria-pressed="${c === S.city}">${esc(c)}<small>${hoodNames(D, c).length}</small></button>`).join('')}</div>
      <button type="button" class="nb-lk nb-all" data-hall>${S.allCities ? 'Show fewer cities' : `Show all ${all.length} cities`}</button>`;
  }

  /* ----- the client's own neighbourhood ----- */
  function pin() {
    if (!here()) return '';
    return `<div class="nb-pin"><span class="nb-dot"></span><span>Your area: <b>${esc(S.home)}</b></span><button type="button" class="nb-lk" data-hchange>Change</button></div>`;
  }
  // Their own area is in another city: a slim bar keeps it in view. Tapping it goes back to their city.
  function away() {
    if (!S.home || here()) return '';
    const x = homeRow();
    return `<button type="button" class="nb-away" data-hcard="${esc(S.homeCity)}"><span class="nb-sq">★</span><span class="nb-aw"><b>${esc(S.home)}</b>Your area · ${esc(S.homeCity)}</span>
      <span class="nb-ar">${x ? `<b>${short(x[I.p])}</b>${pc(x[I[S.per]])}` : ''}</span></button>`;
  }
  // "I'm just looking around" shrinks the picker to this slim bar, so they can still pick their own later.
  const look = () => `<div class="nb-look"><span class="nb-sq">?</span><span class="nb-aw"><b>Live in ${esc(S.city)}?</b>See how your neighbourhood compares.</span><button type="button" class="nb-go" data-hreopen>Pick mine</button></div>`;
  function ask() {
    const names = hoodNames(D, S.city);
    return `<div class="nb-ask">${S.reopen ? '<button type="button" class="nb-askx" data-hshrink aria-label="Close">✕</button>' : ''}<b>Which ${esc(S.city)} neighbourhood is yours?</b><p>See what homes like yours are worth and how prices changed.</p>
      <select data-hpick aria-label="Choose your neighbourhood"><option value="">Choose your neighbourhood</option>${names.map((n) => `<option>${esc(n)}</option>`).join('')}</select>
      <div class="nb-chips">${names.slice(0, 5).map((n) => `<button type="button" data-hhome="${esc(n)}">${esc(n)}</button>`).join('')}${names.length > 5 ? `<span>+ ${names.length - 5} more</span>` : ''}</div>
      ${S.reopen ? '' : '<button type="button" class="nb-lk light" data-hbrowse>I\'m just looking around</button>'}</div>`;
  }
  function spark(x) {
    const p = x[I.p], pts = [[10, 'y10'], [5, 'y5'], [3, 'y3'], [1, 'y1'], [0.5, 'm6'], [0.25, 'm3'], [1 / 12, 'm1']].filter(([, k]) => x[I[k]] != null).map(([yr, k]) => [yr, then(p, x[I[k]])]).concat([[0, p]]);
    if (pts.length < 3) return '';
    const W = 420, Hh = 170, l = 6, r = 8, t = 12, b = 30, ys = pts.map((q) => q[1]), lo = Math.min(...ys), hi = Math.max(...ys), sp = hi - lo || hi * 0.1, x0 = pts[0][0];
    const X = (yr) => l + ((x0 - yr) / x0) * (W - l - r), Y = (v) => t + ((hi - v) / sp) * (Hh - t - b);
    const d = pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join(' '), a = pts[0], z = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${W} ${Hh}" class="nb-spark" role="img" aria-label="Benchmark price over ${Math.round(x0)} years"><path d="${d} L${X(0)},${Hh - b} L${X(x0)},${Hh - b}Z" fill="rgba(255,255,255,.14)"/><path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="${X(a[0])}" cy="${Y(a[1])}" r="4.5" fill="#fff"/><circle cx="${X(0)}" cy="${Y(z[1])}" r="5.5" fill="#fff"/>
      <text x="${l}" y="${Hh - 6}" class="nb-sa">${Math.round(x0)} years ago · <tspan class="nb-st">${short(a[1])}</tspan></text><text x="${W - r}" y="${Hh - 6}" class="nb-sa" text-anchor="end">Now · <tspan class="nb-st">${short(z[1])}</tspan></text></svg>`;
  }
  function hero() {
    const x = homeRow();
    if (!x) return `<div class="nb-hero"><div><div class="nb-k">${P?.name ? `Prepared for ${esc(P.name)} · ` : ''}Your neighbourhood</div><h3>${esc(S.home)}</h3><p class="nb-k">No ${esc(tname())} price is published for this neighbourhood. Try another home type.</p></div></div>`;
    const p = x[I.p], d1 = dollars(p, x[I.y1]), d10 = dollars(p, x[I.y10]);
    const box = (lab, d, v) => (d == null ? '' : `<div><span>${lab}</span><b>${money(Math.abs(d))} ${d < 0 ? 'less' : 'more'} ${pill(v)}</b></div>`);
    return `<div class="nb-hero"><div>${P?.name ? `<div class="nb-prep">Prepared for ${esc(P.name)} · ${esc(D.month)}</div>` : ''}<div class="nb-k">Your neighbourhood · ${esc(S.homeCity)} · ${esc(tlab())}</div>
      <h3>${esc(S.home)}</h3><div class="nb-pv">${money(p)}</div><div class="nb-k">${esc(tsing()[0].toUpperCase() + tsing().slice(1))} benchmark price today</div>
      <div class="nb-hc">${box('Compared with a year ago', d1, x[I.y1])}${box('Compared with 10 years ago', d10, x[I.y10])}</div></div><div>${spark(x)}</div></div>`;
  }

  /* ----- every neighbourhood in the open city: one ranked list ----- */
  const typeTabs = () => { const ts = typesHere(); return ts.length > 1 ? `<div class="nb-seg" role="group" aria-label="Home type">${ts.map(([t, l]) => `<button type="button" data-htype="${t}" aria-pressed="${S.type === t}">${l}</button>`).join('')}</div>` : ''; };
  const perTabs = () => `<div class="nb-seg nb-per" role="group" aria-label="Time">${PERIODS.map(([k, l, s]) => `<button type="button" data-hper="${k}" aria-pressed="${S.per === k}"><span class="nb-long">${l}</span><span class="nb-short">${s}</span></button>`).join('')}</div>`;
  function ranked() {
    const k = S.per, names = hoodNames(D, S.city).filter((n) => row(n)?.[I[k]] != null).sort((a, b) => row(b)[I[k]] - row(a)[I[k]]);
    if (!names.length) return `<p class="na">No ${esc(tname())} prices are published for neighbourhoods in ${esc(S.city)}.</p>`;
    // Bars grow left (down, red) or right (up, green) from one zero line, so every row is measured the same way.
    // Only neighbourhoods are listed: the city as a whole is on its card and in the rest of the report.
    const vals = names.map((n) => row(n)[I[k]]), lo = Math.min(0, ...vals), hi = Math.max(0, ...vals), span = hi - lo || 1, z = (-lo / span) * 100;
    const bar = (v) => `<span class="nb-br">${v == null ? '' : `<i class="${v < 0 ? 'dn' : 'upv'}" style="left:${(v < 0 ? z + (v / span) * 100 : z).toFixed(1)}%;width:${((Math.abs(v) / span) * 100).toFixed(1)}%"></i>`}${lo < 0 && hi > 0 ? `<b class="nb-zero" style="left:${z.toFixed(1)}%"></b>` : ''}</span>`;
    const item = (n) => { const x = row(n), me = here() && n === S.home;
      return `<button type="button" class="nb-li${me ? ' nb-me' : ''}" data-hpeek="${esc(n)}"><span class="nb-ln">${me ? '★ ' : ''}${esc(n)}<small>Benchmark price ${short(x[I.p])}</small></span><span class="nb-pr">${short(x[I.p])}</span>${pc(x[I[k]])}${bar(x[I[k]])}</button>`; };
    const list = S.rankAll || names.length <= 12 ? names : names.filter((n, i) => i < 10 || (here() && n === S.home));
    const html = list.map(item).join('');
    // Column titles, so every number and bar says what it is.
    const shortWhen = { sj: 'since Jan', y1: 'in 1 yr', y3: 'in 3 yrs', y5: 'in 5 yrs', y10: 'in 10 yrs' }[k];
    return `<div class="nb-lh" aria-hidden="true"><span class="nb-ln">Neighbourhood<span class="nb-short"> · benchmark price</span></span><span class="nb-pr">Benchmark price today</span><span class="nb-bh">How much prices changed ${WHEN[k]}</span><span class="nb-vh"><span class="nb-long">Change</span><span class="nb-short">Change ${shortWhen}</span></span></div>
      <div class="nb-list">${html}</div>${names.length > list.length || S.rankAll ? `<button type="button" class="nb-more" data-hmore>${S.rankAll ? 'Show fewer' : `Show all ${names.length} neighbourhoods`}</button>` : ''}`;
  }

  /* ----- your area vs any neighbourhood, in any city with a card ----- */
  function compare() {
    const xa = homeRow(); if (!xa) return '';
    const cities = [...new Set([S.homeCity, ...withHoods()])];
    let b = S.cmp && H[S.cmp.c]?.[S.cmp.h] && !(S.cmp.c === S.homeCity && S.cmp.h === S.home) ? S.cmp : { c: S.homeCity, h: CITY };
    let xb = row(b.h, b.c); if (!xb) { b = { c: S.homeCity, h: CITY }; xb = row(CITY, S.homeCity); }
    if (!xb) return '';
    const selA = `<select data-hcmp="a" aria-label="Your neighbourhood">${hoodNames(D, S.homeCity).map((n) => `<option value="${esc(n)}"${n === S.home ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
    const selB = `<select data-hcmp="b" aria-label="Compare with">${cities.map((c) => `<optgroup label="${esc(c)}">${[CITY, ...hoodNames(D, c)].filter((n) => !(c === S.homeCity && n === S.home)).map((n) => `<option value="${esc(c + '|' + n)}"${c === b.c && n === b.h ? ' selected' : ''}>${esc(n === CITY ? `All of ${c}` : n)}</option>`).join('')}</optgroup>`).join('')}</select>`;
    const win = (k, l) => { const va = xa[I[k]], vb = xb[I[k]]; return va == null || vb == null || va === vb ? [null, null] : va > vb ? [l, null] : [null, l]; };
    const g10 = win('y10', 'Grew more'), g1 = win('y1', 'Held up better');
    const col = (sel, x, w, cls) => `<div class="nb-cc ${cls}">${sel}<div class="nb-cp">${money(x[I.p])}</div>${PERIODS.map(([k, l]) => `<div class="nb-cr"><span>${l}</span><b>${pc(x[I[k]])}${k === 'y10' && w[0] ? `<em>${w[0]}</em>` : ''}${k === 'y1' && w[1] ? `<em>${w[1]}</em>` : ''}</b></div>`).join('')}</div>`;
    const diff = xb[I.p] - xa[I.p], bn = nameIn(b.c, b.h) + (b.h !== CITY && b.c !== S.homeCity ? ` (${b.c})` : '');
    return `<div class="nb-blk" data-hcmpbox><h4>Your area vs ${esc(bn)}</h4><p class="sub">Pick any neighbourhood on either side, in any of these cities.</p>
      <div class="nb-cmp">${col(selA, xa, [g10[0], g1[0]], 'nb-me')}<span class="nb-vs">vs</span>${col(selB, xb, [g10[1], g1[1]], '')}</div>
      <p class="nb-line">The ${esc(tsing())} benchmark price in ${esc(bn)} is about <b>${money(round100(Math.abs(diff)))} ${diff < 0 ? 'less' : 'more'}</b> than in ${esc(S.home)}.</p></div>`;
  }
  function seen() {
    const s = S.seen.map((x) => x.split('|')).filter(([c, n]) => H[c]?.[n] && !(c === S.homeCity && n === S.home)).slice(0, 6);
    return s.length ? `<div class="nb-seen"><span>You also looked at</span>${s.map(([c, n]) => `<button type="button" data-hpeek="${esc(n)}" data-hpc="${esc(c)}">${esc(n)}${c !== S.city ? ` · ${esc(c)}` : ''}</button>`).join('')}</div>` : '';
  }
  // The agent's take: their own words, or written from this month's numbers.
  function autoTake() {
    const at = (k) => (x) => x?.[I[k]];
    const names = hoodNames(D, S.city).filter((n) => row(n)), cx = hs()[CITY]?.[S.type];
    if (here() && homeRow()) { const x = homeRow(), y1 = at('y1')(x), y10 = at('y10')(x), c10 = at('y10')(cx);
      const r10 = names.filter((n) => at('y10')(row(n)) != null).sort((a, b) => row(b)[I.y10] - row(a)[I.y10]), pos = r10.indexOf(S.home) + 1;
      const s = [];
      if (y1 != null) s.push(`${S.home} ${tname()} are ${y1 < 0 ? 'down' : 'up'} ${Math.abs(y1).toFixed(1)}% from a year ago.`);
      if (y10 != null) s.push(`Over 10 years they grew ${y10.toFixed(1)}%${c10 != null ? `, ${y10 > c10 ? 'more' : 'less'} than ${S.city} overall (${c10.toFixed(1)}%)` : ''}${pos && r10.length > 3 ? `, number ${pos} of ${r10.length} neighbourhoods` : ''}.`);
      s.push(y1 != null && y1 < 0 ? 'With prices below last year, buyers have more room to negotiate. If you are thinking of moving, I can tell you what your home would sell for today.' : 'If you are thinking of moving, I can tell you what your home would sell for today.');
      return s.join(' '); }
    const r1 = names.filter((n) => row(n)[I.y1] != null), dn = r1.filter((n) => row(n)[I.y1] < 0).length, best = [...names].filter((n) => row(n)[I.y10] != null).sort((a, b) => row(b)[I.y10] - row(a)[I.y10])[0];
    const lead = r1.length ? `In ${S.city}, ${countPhrase(dn, r1.length)} lower ${tsing()} prices than a year ago.` : '';
    return `${lead}${best ? ` Over 10 years, ${best} grew the most (${row(best)[I.y10].toFixed(1)}%).` : ''} Ask me what this means for your street.`.trim();
  }
  function take() {
    if (conf.take === 'off' || !A.name) return '';
    const t = conf.take === 'own' && conf.text ? conf.text : autoTake();
    return `<div class="nb-take">${A.photo ? `<img src="${esc(A.photo)}" alt="">` : `<span class="nb-ini">${esc(first(A).slice(0, 1))}</span>`}<div><b>${esc(first(A))}'s take</b><p>${esc(t)}</p></div></div>`;
  }

  /* ----- the peek card: another neighbourhood, compared with your own even across cities ----- */
  function peek(n, c = S.city) {
    document.querySelector('.nb-sheet')?.remove(); S.peek = n;
    const x = row(n, c); if (!x) return;
    const mine = c === S.homeCity && n === S.home;
    if (!mine) { S.seen = [`${c}|${n}`, ...S.seen.filter((s) => s !== `${c}|${n}`)].slice(0, 8); save(); ctx.track?.('peek', { city: c, hood: n }); }
    const h = homeRow(), diff = h ? x[I.p] - h[I.p] : null, homeName = S.home + (S.homeCity !== c ? ` (${S.homeCity})` : '');
    let line = '';
    if (h && !mine) { const better1 = x[I.y1] != null && h[I.y1] != null ? x[I.y1] > h[I.y1] : null, more10 = x[I.y10] != null && h[I.y10] != null ? x[I.y10] > h[I.y10] : null;
      line = `Compared with <b>your area</b>: about <b>${money(round100(Math.abs(diff)))} ${diff < 0 ? 'less' : 'more'}</b> than ${esc(homeName)}.${better1 == null ? '' : ` It ${better1 ? 'held its price better' : 'dropped more'} this year`}${more10 == null ? '.' : `${better1 == null ? ' It' : ', and'} grew ${more10 ? 'more' : 'less'} over 10 years.`}`; }
    const w = document.createElement('div'); w.className = 'nb-sheet bd'; w.style.cssText = ctx.vars || '';
    w.innerHTML = `<div class="nb-shade" data-hclose></div><div class="nb-card" role="dialog" aria-modal="true" aria-label="${esc(n)}"><button type="button" class="nb-grab" data-hclose aria-label="Close"></button>
      <div class="nb-k">${mine ? 'Your area' : 'Taking a look'} · ${esc(c)} · ${esc(tlab())}</div><h3>${esc(n)}</h3><div class="nb-pv">${money(x[I.p])}</div>
      ${PERIODS.map(([k, l]) => `<div class="nb-cr"><span>${l}</span>${pc(x[I[k]])}</div>`).join('')}
      ${line ? `<p class="nb-vsl">${line}</p>` : ''}
      <div class="nb-btns">${h && !mine ? `<button type="button" class="nb-b p" data-hcmpwith="${esc(n)}">Compare with my area</button>` : ''}${!mine ? `<button type="button" class="nb-b${h ? '' : ' p'}" data-hhome="${esc(n)}">Make this my area</button>` : ''}<button type="button" class="nb-b" data-hclose>Close</button></div></div>`;
    document.body.appendChild(w); requestAnimationFrame(() => w.classList.add('in'));
    const close = () => { w.classList.remove('in'); S.peek = null; document.removeEventListener('keydown', esc1); setTimeout(() => w.remove(), 200); };
    const esc1 = (e) => e.key === 'Escape' && close(); document.addEventListener('keydown', esc1);
    let y0 = null; const card = w.querySelector('.nb-card');
    card.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    card.addEventListener('touchend', (e) => { if (y0 != null && e.changedTouches[0].clientY - y0 > 70) close(); y0 = null; });
    w.onclick = (e) => { const b = e.target.closest('button,[data-hclose]'); if (!b) return;
      if (b.dataset.hclose != null) return close();
      if (b.dataset.hcmpwith) { S.cmp = { c, h: b.dataset.hcmpwith }; close(); render(); ctx.track?.('compare', { city: c, hood: S.cmp.h }); return setTimeout(() => el?.querySelector('[data-hcmpbox]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); }
      if (b.dataset.hhome) { close(); pickHome(b.dataset.hhome, c); } };
  }
  function pickHome(n, c = S.city) {
    S.home = n; S.homeCity = c; S.browse = false; S.reopen = false; if (S.cmp && S.cmp.c === c && S.cmp.h === n) S.cmp = null;
    if (S.city !== c && withHoods().includes(c)) S.city = c;
    fixType(); save(); ctx.track?.('pick', { city: c, hood: n }); render(); el?.querySelector('.nb-pin,.nb-hero')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function openCity(c) {
    if (!H[c]) return;
    S.city = c; S.fromTop = false; S.note = null; S.rankAll = false;
    ctx.onCity?.(c); fixType(); render();
  }

  /* ----- draw ----- */
  function body() {
    const top = cardCities(), none = !top.some((c) => H[c]);
    if (!S.city || !H[S.city]) return '<p class="na">Neighbourhood prices are not published for this city.</p>';
    fixType();
    const picker = !S.home && on('hero') ? (S.browse && !S.reopen ? look() : ask()) : '';
    return `${none ? chooser() : cards()}${pin()}${away()}${picker || (on('hero') && here() ? hero() : '')}
      ${on('tiles') ? `<div class="nb-hd"><h4 class="nb-h">Every ${esc(S.city)} neighbourhood</h4><div class="nb-ctl">${typeTabs()}${perTabs()}</div></div>${ranked()}` : `<div class="nb-ctl">${typeTabs()}</div>`}
      ${on('compare') ? compare() : ''}${seen()}${on('take') ? take() : ''}
      <p class="note">Benchmark price is the MLS® Home Price Index benchmark price, ${esc(D.month)}. Small neighbourhoods have fewer sales, so their numbers move more from month to month. The longer periods are steadier.</p>`;
  }
  function render() { if (el) el.innerHTML = body(); }
  function wire(node) {
    el = node; render();
    el.onclick = (e) => { const b = e.target.closest('button'); if (!b || !el.contains(b)) return; const d = b.dataset;
      if (d.hcard) return openCity(d.hcard);
      if (d.hno) { S.note = S.note === d.hno ? null : d.hno; return render(); }
      if (d.hnox != null) { S.note = null; return render(); }
      if (d.hask != null) return el.closest('.bd')?.querySelector('[data-sec="contact"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (d.hall != null) { S.allCities = !S.allCities; return render(); }
      if (d.hpeek) return peek(d.hpeek, d.hpc || S.city);
      if (d.hhome) return pickHome(d.hhome);
      if (d.htype) { S.type = d.htype; save(); return render(); }
      if (d.hper) { S.per = d.hper; return render(); }
      if (d.hmore != null) { S.rankAll = !S.rankAll; return render(); }
      if (d.hbrowse != null) { S.browse = true; S.reopen = false; save(); return render(); }
      if (d.hreopen != null) { S.reopen = true; return render(); }
      if (d.hshrink != null) { S.reopen = false; return render(); }
      if (d.hchange != null) { S.home = null; S.homeCity = null; S.browse = false; S.reopen = false; save(); render(); return el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
    el.onchange = (e) => { const t = e.target;
      if (t.matches('[data-hpick]') && t.value) return pickHome(t.value);
      if (t.matches('[data-hcmp="a"]')) return pickHome(t.value, S.homeCity);
      if (t.matches('[data-hcmp="b"]')) { const [c, h] = t.value.split('|'); S.cmp = { c, h }; ctx.track?.('compare', { city: c, hood: h }); return render(); } };
  }
  // The section title: with a single city and no cards, the title names it.
  const title = () => { const cs = cardCities(); return cs.length === 1 && cs[0] === S.city ? `Neighbourhoods in ${S.city}` : 'Neighbourhoods'; };
  return { title, mount: wire, sync, state: S };
}
