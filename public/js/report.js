// The interactive market report. mountReport(root, D, A) draws it with the agent's branding (A).
export const TN = { detached: 'detached homes', townhome: 'townhomes', condo: 'condos' };
export const T1 = { detached: 'Detached', townhome: 'Townhome', condo: 'Condo' };
export const TYPES = ['detached', 'townhome', 'condo'];
export const money = (n) => '$' + Math.round(n).toLocaleString('en-CA');
export const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const first = (A) => (A.name || 'me').trim().split(/\s+/)[0];
export const areasOf = (D) => ['Greater Vancouver', ...Object.keys(D.areas || {}).sort()];
export const market = (r) => (r == null ? null : r < 12 ? "Buyer's market" : r <= 20 ? 'Balanced market' : "Seller's market");

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

export function brandMark(A) {
  return A.logo ? `<img class="brandlogo" src="${esc(A.logo)}" alt="${esc(A.name)}">`
    : `<div class="wm" role="img" aria-label="${esc(A.name)}"><span class="wm-n">${esc(A.name || 'Your Name')}</span>${A.tagline ? `<span class="wm-s"><i></i>${esc(A.tagline)}<i></i></span>` : ''}</div>`;
}

export function mountReport(root, D, A, opts = {}) {
  const AREAS = areasOf(D), multi = AREAS.length > 1, F = esc(first(A));
  const S = { area: AREAS.includes(opts.area) ? opts.area : 'Greater Vancouver', type: 'detached', intent: null };
  const email = A.contact_email || '', phone = A.phone || '';
  const av = A.photo ? `<img class="av" src="${esc(A.photo)}" alt="${esc(A.name)}">` : '';
  root.innerHTML = `<div class="wrap">
<div class="mast">${brandMark(A)}<div class="me"><span>${esc(A.brokerage || '')}</span>${av}</div></div>
<header class="title"><p class="eyebrow">${esc(D.month)}</p><h1>Greater Vancouver Market Report</h1><span class="orn"></span>
  <p class="lede">${regionSummary(D)}${multi ? ' Choose your city below to see where it stands.' : ''}</p></header>
<section><h2>Greater Vancouver at a glance</h2><div class="metro">${TYPES.map((t) => { const m = D.cities['Greater Vancouver'][t]; return `<div><span class="lab">${T1[t]}</span><span class="num">${money(m.price.now)}</span><span>${chg(m.price.yoy, 'in a year')}</span></div>`; }).join('')}</div>
  <p class="small muted">Benchmark price is the MLS® HPI price of a typical home, compared with the same month last year.</p></section>
<section><h2 data-id="h-city">${multi ? 'Pick your city' : 'A closer look'}</h2>
  <div class="controls">${multi ? `<div class="field"><label>Area<select data-id="area" style="margin-top:5px">${AREAS.map((a) => `<option>${a}</option>`).join('')}</select></label></div>` : ''}
    <div class="field"><span class="lab">Home type</span><div class="seg" data-id="types" role="group" aria-label="Home type">${TYPES.map((t) => `<button type="button" data-t="${t}">${T1[t]}</button>`).join('')}</div></div></div>
  <div class="panel" aria-live="polite">
    <div><p class="eyebrow" data-id="p-title"></p><div class="big" data-id="p-price"></div><p data-id="p-chg" style="margin-top:8px"></p></div>
    <div class="gauge"><p><strong data-id="p-market"></strong> <span class="muted small" data-id="p-ratio"></span></p>
      <div class="track"><span class="b1"></span><span class="b2"></span><span class="b3"></span><i class="pin" data-id="pin"></i></div>
      <div class="bands"><span>Buyer's</span><span>Balanced</span><span>Seller's</span></div>
      <p class="small muted">Share of listed homes that sold this month. Under 12% favours buyers, over 20% favours sellers.</p></div>
    <div class="stats" data-id="p-stats"></div><p data-id="p-read"></p></div></section>
${multi ? `<section><h2>How the areas compare</h2><p class="muted small" data-id="rank-sub"></p><div class="rank" data-id="rank"></div></section>` : ''}
<section class="ask"><h2>Want the numbers for your own neighbourhood?</h2>
  <p>City averages hide a lot. I can send you recent sales, price ranges and days on market for your street, building or neighbourhood, at no cost.</p>
  <div class="field"><label>Your city or neighbourhood<input type="text" data-id="where" style="margin-top:5px" placeholder="e.g. your neighbourhood or building name"></label></div>
  <div><span class="lab">I am</span><div class="chips" data-id="intent" role="group" aria-label="I am" style="margin-top:6px">
    <button type="button">thinking of selling</button><button type="button">looking to buy</button><button type="button">just curious about my home's value</button></div></div>
  <div><span class="lab">Your message to ${F}</span><p class="msg" data-id="msg" style="margin-top:6px"></p></div>
  <div class="btns">${email ? `<a class="btn" data-id="mail" href="#">Email ${F}</a>` : ''}${phone ? `<a class="btn" data-id="sms" href="#">Text ${F}</a>` : ''}<button class="btn ghost" type="button" data-id="copy">Copy message</button></div>
  <div class="contact">${email ? `<span>${esc(email)}</span>` : ''}${phone ? `<span>${esc(phone)}</span>` : ''}${A.website ? `<span>${esc(A.website.replace(/^https?:\/\//, ''))}</span>` : ''}</div></section>
<div class="sign">${A.photo ? `<img class="av" src="${esc(A.photo)}" alt="">` : ''}${brandMark(A)}<p class="muted small">${esc(A.brokerage || '')}</p></div>
<footer>${esc(sourceLine(D))}</footer></div>`;
  const $ = (id) => root.querySelector(`[data-id="${id}"]`);

  function text() {
    const w = $('where').value.trim() || (S.area === 'Greater Vancouver' ? 'my area' : S.area);
    return `Hi ${first(A)}, could you send me the latest market numbers for ${w} (${TN[S.type]})?` + (S.intent ? ` I'm ${S.intent}.` : '');
  }
  function msg() {
    const t = text(); $('msg').textContent = t;
    if ($('mail')) $('mail').href = `mailto:${email}?subject=${encodeURIComponent('Market numbers for my area')}&body=${encodeURIComponent(t)}`;
    if ($('sms')) $('sms').href = `sms:+1${phone.replace(/\D/g, '')}?&body=${encodeURIComponent(t)}`;
  }
  function render() {
    const { area, type } = S, o = get(D, area, type);
    if ($('area')) $('area').value = area;
    $('types').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.t === type));
    $('p-title').textContent = `${area} · ${T1[type]} benchmark price`;
    $('p-price').textContent = o.price ? money(o.price) : 'No benchmark';
    let c = o.price ? chg(o.yoy, 'vs. ' + D.month.replace(/\d+$/, (y) => y - 1)) : '<span class="muted small">Too few sales here for a reliable benchmark.</span>';
    if (o.prev && o.price) { const m = ((o.price - o.prev) / o.prev) * 100; c += ` &nbsp; ${chg(Math.round(m * 10) / 10, 'vs. last month')}`; }
    $('p-chg').innerHTML = c;
    const mk = market(o.ratio);
    $('p-market').textContent = mk || 'Not enough activity to call';
    $('p-ratio').textContent = o.ratio != null ? `${o.ratio.toFixed(1)}% sales-to-active ratio` : '';
    $('pin').hidden = o.ratio == null; $('pin').style.left = (Math.min(o.ratio || 0, 40) / 40) * 100 + '%';
    const st = [['Homes sold', o.sales.toLocaleString(), o.salesLy != null ? `${o.salesLy.toLocaleString()} a year ago` : ''],
      ['Homes for sale', o.active.toLocaleString(), o.activeLy != null ? `${o.activeLy.toLocaleString()} a year ago` : ''],
      ['Average days to sell', o.dom != null ? o.dom : `Ask ${F}`, o.dom != null ? `${o.domLy} a year ago` : "Not in this month's summary"]];
    $('p-stats').innerHTML = st.map((s) => `<div><span class="lab">${s[0]}</span><span class="num">${s[1]}</span><span class="small muted">${s[2]}</span></div>`).join('');
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
  if ($('rank')) $('rank').addEventListener('click', (e) => { const b = e.target.closest('.row'); if (b) setArea(b.dataset.a, true); });
  $('where').addEventListener('input', msg);
  $('intent').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const on = b.getAttribute('aria-pressed') === 'true';
    $('intent').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', String(!on)); S.intent = on ? null : b.textContent; msg(); });
  $('copy').addEventListener('click', () => { navigator.clipboard.writeText(text()).then(() => { $('copy').textContent = 'Copied'; setTimeout(() => ($('copy').textContent = 'Copy message'), 1800); }).catch(() => {}); });
  render();
}
