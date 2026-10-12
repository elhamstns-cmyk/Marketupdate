// The "Neighbourhoods" section: the client's own neighbourhood first, every neighbourhood in the city as coloured tiles,
// who grew the most, two neighbourhoods side by side, and the agent's take. Data: D.hoods (see scripts/hoods-from-gvr.py).
import { esc, money, first } from './report.js';

// Positions in each neighbourhood's numbers: [price, 1m, 3m, 6m, 1y, 3y, 5y, 10y, since January]
const I = { p: 0, m1: 1, m3: 2, m6: 3, y1: 4, y3: 5, y5: 6, y10: 7, sj: 8 };
export const HTYPES = [['d', 'Detached', 'detached homes'], ['t', 'Townhouse', 'townhouses'], ['c', 'Condo', 'condos']];
const PERIODS = [['m1', 'Last month'], ['sj', 'Since January'], ['y1', '1 year'], ['y10', '10 years']];
const SCALE = { m1: 5, sj: 10, y1: 15, y5: 30, y10: 60 };
export const BLOCKS = [['hero', 'Their neighbourhood', 'Big price, and the change in dollars'], ['tiles', 'Tiles at a glance', 'Every neighbourhood, coloured'],
  ['rank', 'Who grew the most', 'Ranked bars'], ['compare', 'Compare two', 'Side by side'], ['take', 'Your take', 'A short note with your photo']];
const CITY = '*';

export const hoodCities = (D) => Object.keys(D.hoods || {}).sort();
export const hoodNames = (D, city) => Object.keys(D.hoods?.[city] || {}).filter((n) => n !== CITY).sort();
// The city the section opens on: the agent's choice, else the first report area that has neighbourhoods.
export function defaultCity(D, conf, areas) {
  const H = D.hoods || {};
  if (conf.city && H[conf.city]) return conf.city;
  return (areas || []).find((a) => H[a]) || (H['Vancouver West'] ? 'Vancouver West' : hoodCities(D)[0]);
}

const pc = (v) => (v == null ? '<span class="na">—</span>' : `<span class="nb-v ${v < 0 ? 'dn' : v > 0 ? 'upv' : ''}">${v < 0 ? '▼' : v > 0 ? '▲' : '●'} ${Math.abs(v).toFixed(1)}%</span>`);
const pill = (v) => (v == null ? '' : `<i class="nb-pill ${v < 0 ? 'dn' : 'upv'}">${v < 0 ? '▼' : '▲'} ${Math.abs(v).toFixed(1)}%</i>`);
const short = (v) => (v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : '$' + Math.round(v / 1000) + 'K');
const round100 = (v) => Math.round(v / 100) * 100;
const then = (p, v) => p / (1 + v / 100);
const dollars = (p, v) => (v == null ? null : round100(p - then(p, v)));
const tint = (v, per) => { if (v == null) return '#f1f3f6'; const k = Math.min(1, Math.abs(v) / (SCALE[per] || 20));
  return v < 0 ? `rgba(214,69,47,${(0.1 + 0.32 * k).toFixed(3)})` : `rgba(26,143,78,${(0.08 + 0.45 * k).toFixed(3)})`; };

// ctx: { D, A, conf, areas, edit (agent view), personal, card(id, title, sub, body, extra), track(kind, data) }
export function makeHoods(ctx) {
  const { D, A, conf } = ctx, H = D.hoods || {}, key = `mup_hood:${A.slug || 'x'}`;
  let saved = {};
  if (!ctx.edit) try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
  const P = ctx.personal && H[ctx.personal.city] ? ctx.personal : null;
  const S = { city: P?.city || (saved.city && H[saved.city] ? saved.city : defaultCity(D, conf, ctx.areas)), home: null, type: P?.type || saved.type || conf.type || 'd',
    per: 'y10', cmp: conf.cmp || CITY, peek: null, seen: Array.isArray(saved.seen) ? saved.seen : [], browse: false };
  const setHome = () => { const hs = H[S.city] || {}; S.home = [P?.hood, saved.city === S.city ? saved.home : null, conf.city === S.city || !conf.city ? conf.home : null].find((h) => h && hs[h]) || null; };
  setHome();
  const on = (b) => !(conf.off || []).includes(b);
  const save = () => { if (ctx.edit) return; try { localStorage.setItem(key, JSON.stringify({ city: S.city, home: S.home, type: S.type, seen: S.seen.slice(0, 6) })); } catch {} };
  const hs = () => H[S.city] || {};
  const typesHere = () => HTYPES.filter(([t]) => Object.values(hs()).some((x) => x[t]));
  const row = (n) => hs()[n]?.[S.type] || null;
  const label = (n) => (n === CITY ? `All of ${S.city}` : n);
  const tname = () => HTYPES.find(([t]) => t === S.type)[2];
  const tsing = () => ({ d: 'detached home', t: 'townhouse', c: 'condo' })[S.type];
  const inName = (n) => (n === CITY ? `${S.city} overall` : n);
  let el = null;

  function fixType() { const ts = typesHere().map(([t]) => t); if (!ts.includes(S.type)) S.type = ts[0] || 'd'; if (S.home && !row(S.home)) { const t2 = HTYPES.find(([t]) => hs()[S.home]?.[t]); if (t2) S.type = t2[0]; } }

  /* ----- blocks ----- */
  const citySel = () => `<label class="nb-city">City<select data-hcity aria-label="City">${hoodCities(D).map((c) => `<option${c === S.city ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`;
  function pin() {
    if (!S.home) return '';
    return `<div class="nb-pin"><span class="nb-dot"></span><span>Your area: <b>${esc(S.home)}</b></span><button type="button" class="nb-lk" data-hchange>Change</button></div>`;
  }
  function ask() {
    const names = hoodNames(D, S.city);
    return `<div class="nb-ask"><b>Which neighbourhood is yours?</b><p>See what homes like yours are worth and how prices changed.</p>
      <select data-hpick aria-label="Choose your neighbourhood"><option value="">Choose your neighbourhood</option>${names.map((n) => `<option>${esc(n)}</option>`).join('')}</select>
      <div class="nb-chips">${names.slice(0, 5).map((n) => `<button type="button" data-hhome="${esc(n)}">${esc(n)}</button>`).join('')}${names.length > 5 ? `<span>+ ${names.length - 5} more</span>` : ''}</div>
      <button type="button" class="nb-lk light" data-hbrowse>I'm just looking around</button></div>`;
  }
  function spark(x) {
    const p = x[I.p], pts = [[10, 'y10'], [5, 'y5'], [3, 'y3'], [1, 'y1'], [0.5, 'm6'], [0.25, 'm3'], [1 / 12, 'm1']].filter(([, k]) => x[I[k]] != null).map(([yr, k]) => [yr, then(p, x[I[k]])]).concat([[0, p]]);
    if (pts.length < 3) return '';
    const W = 420, Hh = 170, l = 6, r = 8, t = 12, b = 30, ys = pts.map((q) => q[1]), lo = Math.min(...ys), hi = Math.max(...ys), sp = hi - lo || hi * 0.1, x0 = pts[0][0];
    const X = (yr) => l + ((x0 - yr) / x0) * (W - l - r), Y = (v) => t + ((hi - v) / sp) * (Hh - t - b);
    const d = pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join(' '), a = pts[0], z = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${W} ${Hh}" class="nb-spark" role="img" aria-label="Typical price over ${Math.round(x0)} years"><path d="${d} L${X(0)},${Hh - b} L${X(x0)},${Hh - b}Z" fill="rgba(255,255,255,.14)"/><path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="${X(a[0])}" cy="${Y(a[1])}" r="4.5" fill="#fff"/><circle cx="${X(0)}" cy="${Y(z[1])}" r="5.5" fill="#fff"/>
      <text x="${l}" y="${Hh - 6}" class="nb-sa">${Math.round(x0)} years ago · <tspan class="nb-st">${short(a[1])}</tspan></text><text x="${W - r}" y="${Hh - 6}" class="nb-sa" text-anchor="end">Now · <tspan class="nb-st">${short(z[1])}</tspan></text></svg>`;
  }
  function hero() {
    const x = row(S.home);
    if (!x) return `<div class="nb-hero"><div><div class="nb-k">${P?.name ? `Prepared for ${esc(P.name)} · ` : ''}Your neighbourhood</div><h3>${esc(S.home)}</h3><p class="nb-k">No ${esc(tname())} price is published for this neighbourhood. Try another home type.</p></div></div>`;
    const p = x[I.p], d1 = dollars(p, x[I.y1]), d10 = dollars(p, x[I.y10]);
    const box = (lab, d, v) => (d == null ? '' : `<div><span>${lab}</span><b>${money(Math.abs(d))} ${d < 0 ? 'less' : 'more'} ${pill(v)}</b></div>`);
    return `<div class="nb-hero"><div>${P?.name ? `<div class="nb-prep">Prepared for ${esc(P.name)} · ${esc(D.month)}</div>` : ''}<div class="nb-k">Your neighbourhood · ${esc(HTYPES.find(([t]) => t === S.type)[1])}</div>
      <h3>${esc(S.home)}</h3><div class="nb-pv">${money(p)}</div><div class="nb-k">Typical ${esc(tsing())} price today</div>
      <div class="nb-hc">${box('Compared with a year ago', d1, x[I.y1])}${box('Compared with 10 years ago', d10, x[I.y10])}</div></div><div>${spark(x)}</div></div>`;
  }
  const typeTabs = () => { const ts = typesHere(); return ts.length > 1 ? `<div class="nb-seg" role="group" aria-label="Home type">${ts.map(([t, l]) => `<button type="button" data-htype="${t}" aria-pressed="${S.type === t}">${l}</button>`).join('')}</div>` : ''; };
  const perTabs = () => `<div class="nb-seg" role="group" aria-label="Time">${PERIODS.map(([k, l]) => `<button type="button" data-hper="${k}" aria-pressed="${S.per === k}">${l}</button>`).join('')}</div>`;
  function tiles() {
    const names = hoodNames(D, S.city).filter((n) => row(n));
    if (!names.length) return `<p class="na">No ${esc(tname())} prices are published for neighbourhoods in ${esc(S.city)}.</p>`;
    return `<div class="nb-tiles">${names.map((n) => { const x = row(n), v = x[I[S.per]];
      return `<button type="button" class="nb-t${n === S.home ? ' nb-me' : ''}${n === S.peek ? ' pk' : ''}" data-hpeek="${esc(n)}" style="background:${tint(v, S.per)}"><b>${esc(n)}</b><span>${short(x[I.p])}</span><em>${pc(v)}</em></button>`; }).join('')}</div>
      <div class="nb-key"><span>Down</span><i></i><span>Up a lot</span><span class="nb-tip">Tap a neighbourhood to take a look${S.home ? '. Your area stays the same.' : '.'}</span></div>`;
  }
  function rank() {
    const per = S.per === 'm1' ? 'y1' : S.per, pl = PERIODS.find(([k]) => k === per)?.[1] || '10 years';
    const names = hoodNames(D, S.city).filter((n) => row(n) && row(n)[I[per]] != null).sort((a, b) => row(b)[I[per]] - row(a)[I[per]]);
    if (names.length < 2) return '';
    const mx = Math.max(...names.map((n) => Math.abs(row(n)[I[per]])), 1), cityV = hs()[CITY]?.[S.type]?.[I[per]];
    const anyUp = names.some((n) => row(n)[I[per]] > 0), when = per === 'y10' ? 'over 10 years' : per === 'sj' ? 'since January' : 'over the past year';
    const title = anyUp ? `Who grew the most ${when}` : `Price change ${when}, smallest drop first`, line = cityV != null && cityV > 0;
    const list = S.rankAll || names.length <= 12 ? names : names.filter((n, i) => i < 10 || n === S.home);
    return `<div class="nb-blk"><h4>${title}</h4><p class="sub">${esc(HTYPES.find(([t]) => t === S.type)[1])}. ${esc(S.city)} overall: ${pc(cityV)}${line ? ' (the dark line)' : ''}.</p>
      <div class="nb-rank">${list.map((n) => { const v = row(n)[I[per]];
        return `<button type="button" class="nb-rk${n === S.home ? ' nb-me' : ''}" data-hpeek="${esc(n)}"><span class="nb-rn">${esc(n)}${n === S.home ? ' ★' : ''}</span><span class="nb-tr"><i class="${v < 0 ? 'dn' : 'upv'}" style="width:${((Math.abs(v) / mx) * 100).toFixed(1)}%"></i>${cityV != null && cityV > 0 && v >= 0 ? `<b class="nb-avg" style="left:${((cityV / mx) * 100).toFixed(1)}%"></b>` : ''}</span>${pc(v)}</button>`; }).join('')}</div>${names.length > list.length || S.rankAll ? `<button type="button" class="nb-more" data-hmore>${S.rankAll ? 'Show fewer' : `Show all ${names.length} neighbourhoods`}</button>` : ''}</div>`;
  }
  function compare() {
    if (!S.home || !row(S.home)) return '';
    const a = S.home, b = S.cmp === a || (S.cmp !== CITY && !row(S.cmp)) ? CITY : S.cmp, xa = row(a), xb = hs()[b]?.[S.type];
    if (!xb) return '';
    const names = hoodNames(D, S.city).filter((n) => row(n));
    const opt = (sel, keyA) => `<select data-hcmp="${keyA}" aria-label="Choose a neighbourhood">${(keyA === 'b' ? [CITY, ...names] : names).map((n) => `<option value="${esc(n)}"${n === sel ? ' selected' : ''}>${esc(label(n))}</option>`).join('')}</select>`;
    const win = (k, l) => { const va = xa[I[k]], vb = xb[I[k]]; return va == null || vb == null || va === vb ? [null, null] : va > vb ? [l, null] : [null, l]; };
    const g10 = win('y10', 'Grew more'), g1 = win('y1', 'Held up better');
    const rows = [['Last month', 'm1'], ['Since January', 'sj'], ['1 year', 'y1'], ['5 years', 'y5'], ['10 years', 'y10']];
    const col = (n, x, w, cls, keyA) => `<div class="nb-cc ${cls}">${opt(n, keyA)}<div class="nb-cp">${money(x[I.p])}</div>${rows.map(([l, k]) => `<div class="nb-cr"><span>${l}</span><b>${pc(x[I[k]])}${k === 'y10' && w[0] ? `<em>${w[0]}</em>` : ''}${k === 'y1' && w[1] ? `<em>${w[1]}</em>` : ''}</b></div>`).join('')}</div>`;
    const diff = xb[I.p] - xa[I.p];
    return `<div class="nb-blk" data-hcmpbox><h4>Your area vs ${esc(label(b))}</h4><p class="sub">Pick any neighbourhood on either side.</p>
      <div class="nb-cmp">${col(a, xa, [g10[0], g1[0]], 'nb-me', 'a')}<span class="nb-vs">vs</span>${col(b, xb, [g10[1], g1[1]], '', 'b')}</div>
      <p class="nb-line">A typical ${esc(tsing())} in ${esc(inName(b))} is about <b>${money(round100(Math.abs(diff)))} ${diff < 0 ? 'less' : 'more'}</b> than in ${esc(a)}.</p></div>`;
  }
  function seen() {
    const s = S.seen.filter((n) => n !== S.home && hs()[n]).slice(0, 6);
    return s.length ? `<div class="nb-seen"><span>You also looked at</span>${s.map((n) => `<button type="button" data-hpeek="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : '';
  }
  // The agent's take: their own words, or written from this month's numbers.
  function autoTake() {
    const per = (k) => (x) => x?.[I[k]];
    const names = hoodNames(D, S.city).filter((n) => row(n)), cx = hs()[CITY]?.[S.type];
    if (S.home && row(S.home)) { const x = row(S.home), y1 = per('y1')(x), y10 = per('y10')(x), c10 = per('y10')(cx);
      const r10 = names.filter((n) => per('y10')(row(n)) != null).sort((a, b) => row(b)[I.y10] - row(a)[I.y10]), pos = r10.indexOf(S.home) + 1;
      const s = [];
      if (y1 != null) s.push(`${S.home} ${tname()} are ${y1 < 0 ? 'down' : 'up'} ${Math.abs(y1).toFixed(1)}% from a year ago.`);
      if (y10 != null) s.push(`Over 10 years they grew ${y10.toFixed(1)}%${c10 != null ? `, ${y10 > c10 ? 'more' : 'less'} than ${S.city} overall (${c10.toFixed(1)}%)` : ''}${pos && r10.length > 3 ? `, number ${pos} of ${r10.length} neighbourhoods` : ''}.`);
      s.push(y1 != null && y1 < 0 ? 'With prices below last year, buyers have more room to negotiate. If you are thinking of moving, I can tell you what your home would sell for today.' : 'If you are thinking of moving, I can tell you what your home would sell for today.');
      return s.join(' '); }
    const r1 = names.filter((n) => row(n)[I.y1] != null), dn = r1.filter((n) => row(n)[I.y1] < 0).length, best = [...names].filter((n) => row(n)[I.y10] != null).sort((a, b) => row(b)[I.y10] - row(a)[I.y10])[0];
    return `In ${S.city}, ${dn} of ${r1.length} neighbourhoods have lower ${tsing()} prices than a year ago.${best ? ` Over 10 years, ${best} grew the most (${row(best)[I.y10].toFixed(1)}%).` : ''} Ask me what this means for your street.`;
  }
  function take() {
    if (conf.take === 'off' || !A.name) return '';
    const t = conf.take === 'own' && conf.text ? conf.text : autoTake();
    return `<div class="nb-take">${A.photo ? `<img src="${esc(A.photo)}" alt="">` : `<span class="nb-ini">${esc(first(A).slice(0, 1))}</span>`}<div><b>${esc(first(A))}'s take</b><p>${esc(t)}</p></div></div>`;
  }

  /* ----- the peek card: another neighbourhood, without losing your own ----- */
  function peek(n) {
    document.querySelector('.nb-sheet')?.remove(); S.peek = n;
    const x = row(n); if (!x) return;
    if (n !== S.home) { S.seen = [n, ...S.seen.filter((s) => s !== n)].slice(0, 8); save(); ctx.track?.('peek', { city: S.city, hood: n }); }
    const h = S.home && row(S.home), diff = h ? x[I.p] - h[I.p] : null;
    let line = '';
    if (h && n !== S.home) { const better1 = x[I.y1] != null && h[I.y1] != null ? x[I.y1] > h[I.y1] : null, more10 = x[I.y10] != null && h[I.y10] != null ? x[I.y10] > h[I.y10] : null;
      line = `Compared with <b>your area</b>: about <b>${money(round100(Math.abs(diff)))} ${diff < 0 ? 'less' : 'more'}</b> than ${esc(S.home)}.${better1 == null ? '' : ` It ${better1 ? 'held its price better' : 'dropped more'} this year`}${more10 == null ? '.' : `${better1 == null ? ' It' : ', and'} grew ${more10 ? 'more' : 'less'} over 10 years.`}`; }
    const w = document.createElement('div'); w.className = 'nb-sheet bd'; w.style.cssText = ctx.vars || '';
    w.innerHTML = `<div class="nb-shade" data-hclose></div><div class="nb-card" role="dialog" aria-modal="true" aria-label="${esc(n)}"><button type="button" class="nb-grab" data-hclose aria-label="Close"></button>
      <div class="nb-k">${n === S.home ? 'Your area' : 'Taking a look'} · ${esc(HTYPES.find(([t]) => t === S.type)[1])}</div><h3>${esc(n)}</h3><div class="nb-pv">${money(x[I.p])}</div>
      ${[['Last month', 'm1'], ['Since January', 'sj'], ['1 year', 'y1'], ['5 years', 'y5'], ['10 years', 'y10']].map(([l, k]) => `<div class="nb-cr"><span>${l}</span>${pc(x[I[k]])}</div>`).join('')}
      ${line ? `<p class="nb-vsl">${line}</p>` : ''}
      <div class="nb-btns">${h && n !== S.home ? `<button type="button" class="nb-b p" data-hcmpwith="${esc(n)}">Compare with my area</button>` : ''}${n !== S.home ? `<button type="button" class="nb-b${h ? '' : ' p'}" data-hhome="${esc(n)}">Make this my area</button>` : ''}<button type="button" class="nb-b" data-hclose>Close</button></div></div>`;
    document.body.appendChild(w); requestAnimationFrame(() => w.classList.add('in'));
    const close = () => { w.classList.remove('in'); S.peek = null; document.removeEventListener('keydown', esc1); setTimeout(() => w.remove(), 200); el?.querySelectorAll('.nb-t.pk').forEach((t) => t.classList.remove('pk')); };
    const esc1 = (e) => e.key === 'Escape' && close(); document.addEventListener('keydown', esc1);
    let y0 = null; const card = w.querySelector('.nb-card');
    card.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    card.addEventListener('touchend', (e) => { if (y0 != null && e.changedTouches[0].clientY - y0 > 70) close(); y0 = null; });
    w.onclick = (e) => { const b = e.target.closest('button,[data-hclose]'); if (!b) return;
      if (b.dataset.hclose != null) return close();
      if (b.dataset.hcmpwith) { S.cmp = b.dataset.hcmpwith; close(); render(); ctx.track?.('compare', { city: S.city, hood: S.cmp }); return setTimeout(() => el?.querySelector('[data-hcmpbox]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); }
      if (b.dataset.hhome) { close(); pickHome(b.dataset.hhome); } };
    el?.querySelectorAll('.nb-t').forEach((t) => t.classList.toggle('pk', t.dataset.hpeek === n));
  }
  function pickHome(n) { S.home = n; S.browse = false; if (S.cmp === n) S.cmp = CITY; fixType(); save(); ctx.track?.('pick', { city: S.city, hood: n }); render(); el?.querySelector('.nb-pin,.nb-hero')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }

  /* ----- draw ----- */
  function body() {
    fixType();
    if (!hoodNames(D, S.city).length) return '<p class="na">Neighbourhood prices are not published for this city.</p>';
    const asking = !S.home && !S.browse && on('hero');
    return `${pin()}${asking ? ask() : on('hero') && S.home ? hero() : ''}
      <h4 class="nb-h">${on('tiles') ? 'Every neighbourhood at a glance' : 'Neighbourhoods'}</h4><div class="nb-ctl">${typeTabs()}${on('tiles') ? perTabs() : ''}</div>
      ${on('tiles') ? tiles() : ''}${on('rank') ? rank() : ''}${on('compare') ? compare() : ''}${seen()}${on('take') ? take() : ''}
      <p class="note">Typical price is the MLS® Home Price Index benchmark price, ${esc(D.month)}. Small neighbourhoods have fewer sales, so their month-to-month numbers move more. The 1-year and 10-year numbers are steadier.</p>`;
  }
  function render() { if (el) el.innerHTML = body(); }
  function wire(node) {
    el = node; render();
    el.onclick = (e) => { const b = e.target.closest('button'); if (!b || !el.contains(b)) return; const d = b.dataset;
      if (d.hpeek) return peek(d.hpeek);
      if (d.hhome) return pickHome(d.hhome);
      if (d.htype) { S.type = d.htype; save(); return render(); }
      if (d.hper) { S.per = d.hper; return render(); }
      if (d.hmore != null) { S.rankAll = !S.rankAll; return render(); }
      if (d.hbrowse != null) { S.browse = true; return render(); }
      if (d.hchange != null) { S.home = null; S.browse = false; save(); render(); return el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
    el.onchange = (e) => { const t = e.target;
      if (t.matches('[data-hpick]') && t.value) return pickHome(t.value);
      if (t.matches('[data-hcmp]')) { if (t.dataset.hcmp === 'a') return pickHome(t.value); S.cmp = t.value; ctx.track?.('compare', { city: S.city, hood: t.value }); return render(); } };
  }
  // The city picker sits in the section's title row; it lives outside the body, so it is wired by the report.
  function setCity(c) { if (!H[c] || c === S.city) return; S.city = c; ctx.onCity?.(c); S.cmp = CITY; setHome(); fixType(); save(); render(); }
  return { extra: citySel, mount: wire, setCity, state: S };
}
