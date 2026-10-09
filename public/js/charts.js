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

// Several areas on one chart, one coloured line each. mode 'pct' starts every line at 0% (fair to compare
// areas with very different prices); mode 'price' shows dollars. list: [{ name, color, rows: [[month, value]] }]
export function multiChart(el, list, { mode = 'pct', interactive = true, width, height, label = '' } = {}) {
  list = list.filter((s) => s.rows.length > 1);
  if (!list.length) { el.innerHTML = ''; return; }
  const keys = [...new Set(list.flatMap((s) => s.rows.map((r) => r[0])))].sort(), n = keys.length;
  const ser = list.map((s) => { const m = Object.fromEntries(s.rows), base = s.rows[0][1];
    return { ...s, v: keys.map((k) => (m[k] == null ? null : mode === 'pct' ? ((m[k] - base) / base) * 100 : m[k])) }; });
  const all = ser.flatMap((s) => s.v.filter((v) => v != null)), mn = Math.min(...all, mode === 'pct' ? 0 : Infinity), mx = Math.max(...all, mode === 'pct' ? 0 : -Infinity);
  const W = Math.max(300, width || el.clientWidth || 640), H = height || (W < 500 ? 210 : 250), l = 4, r = 58, t = 18, b = 26, pad = (mx - mn || 1) * 0.12, lo = mn - pad, hi = mx + pad;
  const x = (i) => l + (i * (W - l - r)) / Math.max(1, n - 1), y = (v) => t + ((hi - v) / (hi - lo)) * (H - t - b);
  const dp = Math.abs(hi - lo) < 6 ? 1 : 0, fmt = (v) => { if (mode !== 'pct') return short(v); const t = Math.abs(v).toFixed(dp); return +t === 0 ? '0%' : `${v > 0 ? '+' : '−'}${t}%`; };
  let g = ''; for (let i = 0; i < 4; i++) { const v = lo + ((hi - lo) * (i + 0.5)) / 4; g += `<line x1="${l}" x2="${W - r + 6}" y1="${y(v)}" y2="${y(v)}" stroke="var(--ln)"/><text x="${W - 2}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--mut)">${fmt(v)}</text>`; }
  if (mode === 'pct') g += `<line x1="${l}" x2="${W - r + 6}" y1="${y(0)}" y2="${y(0)}" stroke="var(--mut)" stroke-dasharray="4 4" opacity=".6"/>`;
  const step = W < 500 ? 3 : 2; g += keys.map((k, i) => ((n - 1 - i) % step === 0 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--mut)">${SPAN(k)}</text>` : '')).join('');
  ser.forEach((s, j) => { let d = '', pen = false; s.v.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); pen = true; });
    g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${j ? 2.3 : 3}" stroke-linejoin="round" stroke-linecap="round"/>`;
    const li = s.v.length - 1 - [...s.v].reverse().findIndex((v) => v != null); g += `<circle cx="${x(li)}" cy="${y(s.v[li])}" r="4.5" fill="${s.color}" stroke="var(--bg)" stroke-width="2"/>`; });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}"${width ? ` width="${width}"` : ''} role="img" aria-label="${label}">${g}${interactive ? `<line class="hx" y1="${t}" y2="${H - b}" stroke="var(--mut)" stroke-dasharray="3 3" opacity="0"/><rect width="${W}" height="${H}" fill="transparent"/>` : ''}</svg>${interactive ? '<div class="ctip mtip"></div>' : ''}`;
  if (!interactive) return;
  const sv = el.querySelector('svg'), tip = el.querySelector('.ctip'), hx = sv.querySelector('.hx');
  const show = (e) => { const bb = sv.getBoundingClientRect(), px = ((e.clientX - bb.left) / bb.width) * W, i = Math.max(0, Math.min(n - 1, Math.round(((px - l) / (W - l - r)) * (n - 1))));
    hx.setAttribute('x1', x(i)); hx.setAttribute('x2', x(i)); hx.setAttribute('opacity', 1);
    tip.innerHTML = `<b>${monthLong(keys[i])}</b>` + ser.map((s) => (s.v[i] == null ? '' : `<span><i style="background:${s.color}"></i>${s.name}: ${mode === 'pct' ? fmt(s.v[i]) : money(s.v[i])}</span>`)).join('');
    tip.style.left = Math.min(Math.max((x(i) / W) * 100, 18), 82) + '%'; tip.style.top = '8px'; tip.style.opacity = 1; };
  sv.addEventListener('pointermove', show); sv.addEventListener('pointerdown', show);
  sv.addEventListener('pointerleave', () => { tip.style.opacity = 0; hx.setAttribute('opacity', 0); });
}
// Colours for compared areas: the agent's colour first, then ones that stand apart from it.
export function areaColours(ac) {
  const h = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : [0, 0, 0]; };
  const far = (a, b) => { const p = h(a), q = h(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 110; };
  return [ac, ...['#e0882f', '#3b6fd8', '#9b4fc4', '#2a9d8f', '#c2452d'].filter((c) => far(c, ac))].slice(0, 4);
}
