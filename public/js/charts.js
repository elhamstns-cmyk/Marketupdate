// Small, calm charts drawn as SVG. One series per chart (never two y-axes).
// Colours come from the report's CSS variables, so every agent's theme applies.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SPAN = (k) => MON[+k.slice(5) - 1];
const monthLong = (k) => `${SPAN(k)} ${k.slice(0, 4)}`;
const money = (v) => '$' + Math.round(v).toLocaleString('en-CA');
const short = (v) => (v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : '$' + Math.round(v / 1000) + 'K');
const uid = () => 'c' + Math.random().toString(36).slice(2, 8);

/* ---------- history helpers ---------- */
export const salesGroup = (area) => ({ 'Greater Vancouver': 'Grand Totals', 'Burnaby East': 'Burnaby', 'Burnaby North': 'Burnaby', 'Burnaby South': 'Burnaby', 'Maple Ridge': 'Maple Ridge/Pitt Meadows',
  'Pitt Meadows': 'Maple Ridge/Pitt Meadows', 'Port Moody': 'Port Moody/Belcarra', 'West Vancouver': 'West Vancouver/Howe Sound', Whistler: 'Whistler/Pemberton', Ladner: 'Delta', Tsawwassen: 'Delta' }[area] || area);
const addM = (k, n) => { let [y, m] = k.split('-').map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return `${y}-${String(m).padStart(2, '0')}`; };
// The last 12 months of benchmark prices, ending at `end` (e.g. "2026-09"). Missing months are skipped.
export function priceSeries(H, area, type, end) {
  const s = H?.price?.[type]?.[area]; if (!s || !end) return [];
  return Array.from({ length: 12 }, (_, i) => addM(end, i - 11)).filter((k) => s[k]).map((k) => [k, s[k]]);
}
// Monthly sales this calendar year (and back to a full 12 months when available).
export function salesSeries(H, area, types, end) {
  const g = salesGroup(area), keys = Array.from({ length: 12 }, (_, i) => addM(end, i - 11));
  const out = keys.map((k) => [k, types.reduce((n, t) => (n == null || H?.sales?.[t]?.[g]?.[k] == null ? null : n + H.sales[t][g][k]), 0)]);
  // keep the longest run of months with data that ends at the latest month
  let i = out.length - 1; while (i >= 0 && out[i][1] != null) i--;
  return { rows: out.slice(i + 1), group: g };
}
// Monthly sales for several areas, for "Homes sold each month" with more than one area.
// areas: [{name, g}] (g = sales group). Areas that share a sales group (Burnaby North and South) are counted once.
// Returns {keys, list: [{name, g, v:[…], now, ly, pct}]}: keys is the longest run of months ending at `end`
// where every area has a number; ly is the same month a year earlier; pct is the whole-number change (null if not published).
export function salesByArea(H, areas, types, end) {
  const sum = (g, k) => types.reduce((n, t) => (n == null || H?.sales?.[t]?.[g]?.[k] == null ? null : n + H.sales[t][g][k]), 0);
  const all = Array.from({ length: 12 }, (_, i) => addM(end, i - 11));
  let i = all.length - 1; while (i >= 0 && areas.every((a) => sum(a.g, all[i]) != null)) i--;
  const keys = all.slice(i + 1);
  const list = areas.map((a) => { const v = keys.map((k) => sum(a.g, k)), now = sum(a.g, end), ly = sum(a.g, addM(end, -12));
    return { ...a, v, now, ly, pct: now != null && ly ? Math.round(((now - ly) / ly) * 100) : null }; });
  return { keys, list };
}
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const and = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
// The one-line story above the chart, in plain words. Text only (escape it before use).
// list: from salesByArea (whole region included, if shown); cities: the ones drawn in the chart; month: "September".
// Returns {lead, rest}: lead is the bold start ("Fewer homes sold than last September"), rest finishes the thought.
export function soldStory(list, cities, keys, month) {
  const has = list.filter((x) => x.pct != null), fewer = has.filter((x) => x.pct < 0), more = has.filter((x) => x.pct > 0), same = has.filter((x) => x.pct === 0);
  const names = (xs) => and(xs.map((x) => x.name)), out = [];
  let lead = '';
  if (fewer.length) { lead = `Fewer homes sold than last ${month}`; out.push(` in ${names(fewer)}.`); if (more.length) out.push(` More sold in ${names(more)}.`); }
  else if (more.length) { lead = `More homes sold than last ${month}`; out.push(` in ${names(more)}.`); }
  if (same.length) out.push(lead ? ` ${names(same)} held steady.` : '');
  if (!lead && same.length) lead = `${names(same)} sold about as many homes as last ${month}.`;
  // Busiest month, only when the chart shows at least 6 months and more than one city.
  if (keys.length >= 6 && cities.length > 1) {
    const peak = new Map(); cities.forEach((x) => { const k = keys[x.v.indexOf(Math.max(...x.v))], m = FULL[+k.slice(5) - 1]; peak.set(m, [...(peak.get(m) || []), x.name]); });
    const groups = [...peak].sort((a, b) => b[1].length - a[1].length), [m1, n1] = groups[0];
    const head = n1.length === cities.length ? `${m1} was the busiest month for ${cities.length === 2 ? 'both areas' : `all ${cities.length} areas`}` : n1.length > 1 ? `${m1} was the busiest month for ${and(n1)}` : `${n1[0]}'s busiest month was ${m1}`;
    const tail = groups.slice(1).flatMap(([m, ns]) => ns.map((n) => `${n}'s was ${m}`));
    out.push(` ${head}${tail.length ? `; ${tail.join(', ')}` : ''}.`);
  }
  return { lead, rest: out.join('') };
}
/* ----- "Prices by home type" (S4) ----- */
// The change in dollars from a year ago, from today's price and the % change, rounded to $100. null when not published.
export function dollarChange(price, yoy) {
  if (!price || yoy == null) return null;
  return Math.round((price - price / (1 + yoy / 100)) / 100) * 100;
}
const TYPE_WORDS = { detached: ['a detached home', 'detached homes'], townhome: ['a townhouse', 'townhouses'], condo: ['a condo', 'condos'] };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
// Rounded to $1,000 for the story sentence (it says "about").
const usd = (n) => '$' + (Math.round(Math.abs(n) / 1000) * 1000).toLocaleString('en-CA');
// "about 2½ times" from 2.48
const times = (r) => { const h = Math.round(r * 2) / 2; return `about ${Math.floor(h)}${h % 1 ? '½' : ''} times`; };
// One city: rows are home types [{type, price, yoy}]. Returns {lead, rest}; the lead is shown in bold.
export function typesStoryOne(rows) {
  const has = rows.filter((x) => x.price && x.yoy != null), dn = has.filter((x) => x.yoy < 0), up = has.filter((x) => x.yoy > 0);
  const pl = (xs) => and(xs.map((x) => TYPE_WORDS[x.type][1]));
  let lead = '';
  if (has.length && dn.length === has.length) lead = has.length === 1 ? `${cap(pl(has))} cost less than a year ago.` : (has.length === 2 ? 'Both home types cost' : 'Every home type costs') + ' less than a year ago.';
  else if (has.length && up.length === has.length) lead = has.length === 1 ? `${cap(pl(has))} cost more than a year ago.` : (has.length === 2 ? 'Both home types cost' : 'Every home type costs') + ' more than a year ago.';
  else if (dn.length || up.length) lead = [dn.length && `${cap(pl(dn))} cost less than a year ago`, up.length && `${dn.length ? pl(up) : cap(pl(up))} cost more`].filter(Boolean).join('; ') + '.';
  const pr = rows.filter((x) => x.price).sort((a, b) => b.price - a.price);
  let rest = '';
  if (pr.length > 1) { const hi = pr[0], lo = pr[pr.length - 1], r = hi.price / lo.price;
    rest = r >= 1.5 ? `${cap(TYPE_WORDS[hi.type][0])} costs ${times(r)} ${TYPE_WORDS[lo.type][0]}.` : `${cap(TYPE_WORDS[hi.type][0])} costs about ${usd(hi.price - lo.price)} more than ${TYPE_WORDS[lo.type][0]}.`; }
  return { lead, rest: rest && lead ? ` ${rest}` : rest };
}
// Several areas, one home type: rows are areas [{name, price, yoy}]; the region (Greater Vancouver) is the yardstick, not ranked.
export function typesStoryAreas(rows, type, region = 'Greater Vancouver') {
  const w = TYPE_WORDS[type][1], cities = rows.filter((x) => x.price && x.name !== region).sort((a, b) => b.price - a.price), reg = rows.find((x) => x.name === region && x.price);
  let lead = '', rest = '';
  if (cities.length > 1) { const hi = cities[0], lo = cities[cities.length - 1];
    lead = `${hi.name} has the priciest ${w}.`; rest = ` ${lo.name} is the most affordable, about ${usd(hi.price - lo.price)} less.`; }
  else if (cities.length === 1 && reg) { const c = cities[0], d = c.price - reg.price;
    lead = `${c.name}'s ${w} cost about ${usd(d)} ${d < 0 ? 'less' : 'more'} than across Greater Vancouver.`; }
  const has = rows.filter((x) => x.price && x.yoy != null), dn = has.filter((x) => x.yoy < 0), up = has.filter((x) => x.yoy > 0);
  const every = has.length === 2 ? 'both areas' : `every area`;
  const move = has.length < 2 ? '' : dn.length === has.length ? `Prices are lower than a year ago in ${every}.` : up.length === has.length ? `Prices are higher than a year ago in ${every}.`
    : [up.length && `Prices rose in ${and(up.map((x) => x.name))}`, dn.length && `${up.length ? 'fell' : 'Prices fell'} in ${and(dn.map((x) => x.name))}`].filter(Boolean).join(' and ') + ' over the past year.';
  if (move) { if (lead) rest += ` ${move}`; else lead = move; }
  return { lead, rest };
}
// Plain facts people notice: streaks, since January, over 12 months.
export function trendFacts(series) {
  if (series.length < 3) return [];
  const v = series.map((r) => r[1]), last = v[v.length - 1], out = [];
  let n = 0; const dir = Math.sign(last - v[v.length - 2]);
  for (let i = v.length - 1; i > 0 && dir && Math.sign(v[i] - v[i - 1]) === dir; i--) n++;
  if (n >= 2) out.push([`${n} months`, `of price ${dir < 0 ? 'drops' : 'rises'} in a row`]);
  else if (n === 1 && v.length > 2 && Math.sign(v[v.length - 2] - v[v.length - 3]) === -dir) out.push(['First', `${dir < 0 ? 'drop' : 'rise'} after ${dir < 0 ? 'a rise' : 'a drop'}`]);
  const yr = series[series.length - 1][0].slice(0, 4), jan = series.find((r) => r[0] === `${yr}-01`);
  const pct = (a, b) => { const p = ((a - b) / b) * 100; return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(1)}%`; };
  if (jan && series[series.length - 1][0] !== jan[0]) out.push([pct(last, jan[1]), 'since January']);
  if (series.length === 12) out.push([pct(last, v[0]), 'over 12 months']);
  return out;
}

/* ---------- charts ---------- */
// Line chart. interactive=false for print.
export function lineChart(el, series, { label = '', interactive = true, width, height } = {}) {
  if (series.length < 2) { el.innerHTML = ''; return; }
  const W = Math.max(300, width || el.clientWidth || 640), H = height || (W < 500 ? 190 : 210), l = 4, r = 58, t = 24, b = 26, P = series.map((s) => s[1]);
  const mn = Math.min(...P), mxv = Math.max(...P), rg = (mxv - mn) || mxv * 0.02, lo = mn - rg * 0.45, hi = mxv + rg * 0.15, n = P.length;
  const x = (i) => l + (i * (W - l - r)) / (n - 1), y = (v) => t + ((hi - v) / (hi - lo)) * (H - t - b), id = uid();
  let g = ''; for (let i = 0; i < 3; i++) { const v = lo + ((hi - lo) * (i + 0.5)) / 3; g += `<line x1="${l}" x2="${W - r + 6}" y1="${y(v)}" y2="${y(v)}" stroke="var(--ln)"/><text x="${W - 2}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--mut)">${short(v)}</text>`; }
  const d = P.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join('');
  const step = W < 500 ? 3 : 2, labs = series.map(([k], i) => ((n - 1 - i) % step === 0 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--mut)">${SPAN(k)}</text>` : '')).join('');
  const last = P[n - 1];
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}"${width ? ` width="${width}"` : ''} role="img" aria-label="${label}: ${money(P[0])} in ${monthLong(series[0][0])}, ${money(last)} in ${monthLong(series[n - 1][0])}">
    <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".12"/><stop offset="1" stop-color="var(--ac)" stop-opacity="0"/></linearGradient></defs>
    ${g}<path d="${d}L${x(n - 1)},${H - b}L${x(0)},${H - b}Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="var(--ac)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(n - 1)}" cy="${y(last)}" r="5" fill="var(--ac)" stroke="var(--bg)" stroke-width="2"/>
    <text x="${x(n - 1) - 8}" y="${y(last) + (y(last) > (t + H - b) / 2 ? 20 : -12)}" text-anchor="end" font-size="12" font-weight="600" fill="var(--ink)">${money(last)}</text>${labs}
    ${interactive ? `<line class="hx" y1="${t}" y2="${H - b}" stroke="var(--mut)" stroke-dasharray="3 3" opacity="0"/><circle class="hd" r="5" fill="var(--ac)" stroke="var(--bg)" stroke-width="2" opacity="0"/><rect width="${W}" height="${H}" fill="transparent"/>` : ''}</svg>${interactive ? '<div class="ctip"></div>' : ''}`;
  if (!interactive) return;
  const sv = el.querySelector('svg'), tip = el.querySelector('.ctip'), hx = sv.querySelector('.hx'), hd = sv.querySelector('.hd');
  const show = (e) => { const bb = sv.getBoundingClientRect(), px = ((e.clientX - bb.left) / bb.width) * W, i = Math.max(0, Math.min(n - 1, Math.round(((px - l) / (W - l - r)) * (n - 1))));
    for (const [a, v] of [['x1', x(i)], ['x2', x(i)], ['opacity', 1]]) hx.setAttribute(a, v);
    for (const [a, v] of [['cx', x(i)], ['cy', y(P[i])], ['opacity', 1]]) hd.setAttribute(a, v);
    tip.innerHTML = `<b>${monthLong(series[i][0])}</b> · ${money(P[i])}`; tip.style.left = (x(i) / W) * 100 + '%'; tip.style.top = (y(P[i]) / H) * bb.height + 'px'; tip.style.opacity = 1; };
  sv.addEventListener('pointermove', show); sv.addEventListener('pointerdown', show);
  sv.addEventListener('pointerleave', () => { tip.style.opacity = 0; hx.setAttribute('opacity', 0); hd.setAttribute('opacity', 0); });
}
// Bar chart of counts; the latest month is solid, the busiest month is labelled.
export function barChart(el, rows, { label = '', interactive = true, width, height, unit = 'sold' } = {}) {
  if (rows.length < 2) { el.innerHTML = ''; return; }
  const W = Math.max(300, width || el.clientWidth || 640), H = height || (W < 500 ? 150 : 170), t = 20, b = 24, top = Math.max(...rows.map((r) => r[1])), mx = top * 1.12 || 1;
  const bw = (W - 16) / rows.length, y = (v) => t + (1 - v / mx) * (H - t - b);
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}"${width ? ` width="${width}"` : ''} role="img" aria-label="${label}: ${rows.map(([k, v]) => `${SPAN(k)} ${v}`).join(', ')}">${rows.map(([k, v], i) => {
    const X = 8 + i * bw + bw * 0.2, w = bw * 0.6, last = i === rows.length - 1, h = Math.max(0, H - b - y(v)), rad = Math.min(4, h / 2, w / 2);
    return `<g class="cb" data-i="${i}"><rect x="${X - 6}" y="${t}" width="${w + 12}" height="${H - t - b}" fill="transparent"/><path d="M${X},${H - b}V${y(v) + rad}q0,-${rad} ${rad},-${rad}h${w - 2 * rad}q${rad},0 ${rad},${rad}V${H - b}Z" class="bb" fill="var(--ac)" opacity="${last ? 1 : 0.32}"/>
      <text class="bv" x="${X + w / 2}" y="${y(v) - 6}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink)" opacity="${last ? 1 : 0}">${v.toLocaleString()}</text><text x="${X + w / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--mut)">${SPAN(k)}</text></g>`; }).join('')}
    <line x1="8" x2="${W - 8}" y1="${H - b}" y2="${H - b}" stroke="var(--ln)"/></svg>${interactive ? '<div class="ctip"></div>' : ''}`;
  if (!interactive) return;
  const tip = el.querySelector('.ctip');
  const gs = [...el.querySelectorAll('.cb')], n = gs.length;
  const focus = (j) => gs.forEach((g, i) => { const on = j == null ? i === n - 1 : i === j; g.querySelector('.bb').setAttribute('opacity', on ? 1 : 0.32); g.querySelector('.bv').setAttribute('opacity', on ? 1 : 0); });
  el.addEventListener('pointerleave', () => focus(null));
  gs.forEach((g) => { const i = +g.dataset.i, on = () => { focus(i); tip.innerHTML = `<b>${monthLong(rows[i][0])}</b> · ${rows[i][1].toLocaleString()} ${unit}`; tip.style.left = ((8 + i * bw + bw / 2) / W) * 100 + '%'; tip.style.top = (y(rows[i][1]) / H) * el.offsetHeight + 'px'; tip.style.opacity = 1; };
    g.addEventListener('pointerenter', on); g.addEventListener('pointerdown', on); g.addEventListener('pointerleave', () => (tip.style.opacity = 0)); });
}
export { monthLong };
