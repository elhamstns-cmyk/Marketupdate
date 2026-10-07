import { esc, areasOf, mountReport, STYLES, FONTS, BASIC_THEME } from './report.js';
import { reportLink, emailDraft, caption, socialImage, download } from './exports.js';

const $ = (s) => document.querySelector(s), main = $('#main');
const cfg = await (await fetch('/api/config')).json();
const qs = new URLSearchParams(location.search);
if (qs.get('plan')) sessionStorage.setItem('mup_want', JSON.stringify({ plan: qs.get('plan'), cycle: qs.get('cycle') || 'yearly' }));
if (qs.get('role')) sessionStorage.setItem('mup_role', qs.get('role'));
const want = JSON.parse(sessionStorage.getItem('mup_want') || 'null');

/* ---------- sign-in: emailed code or link, no password ---------- */
const SB = cfg.supabaseUrl, H = { apikey: cfg.supabaseAnonKey, 'content-type': 'application/json' };
let session = JSON.parse(localStorage.getItem('mup_session') || 'null');
const keep = (s) => { session = s ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: Date.now() + (s.expires_in || 3600) * 1000 } : null;
  session ? localStorage.setItem('mup_session', JSON.stringify(session)) : localStorage.removeItem('mup_session'); };
if (location.hash.includes('access_token=')) { const h = new URLSearchParams(location.hash.slice(1));
  keep({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_in: Number(h.get('expires_in')) }); history.replaceState(null, '', '/app'); }
async function token() {
  if (!session) return null;
  if (session.expires_at - Date.now() < 60000) {
    const r = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: H, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    keep(r.ok ? await r.json() : null);
  }
  return session?.access_token;
}
async function api(path, data) {
  const t = cfg.demo ? null : await token();
  const r = await fetch(path, { method: data ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { keep(null); showLogin(); throw new Error('signed out'); }
  if (!r.ok) throw new Error(j.error || 'Something went wrong.');
  return j;
}
const STEPS = ['Email', 'Confirm', 'Plan', 'Payment', 'Your report'];
const steps = (n) => `<div class="steps">${STEPS.map((s, i) => `${i ? '<i></i>' : ''}<span class="${i < n ? 'dn' : i === n ? 'on' : ''}"><b>${i < n ? '✓' : i + 1}</b>${s}</span>`).join('')}</div>`;
const sendCode = (email) => fetch(`${SB}/auth/v1/otp?redirect_to=${encodeURIComponent(location.origin + '/app')}`, { method: 'POST', headers: H, body: JSON.stringify({ email, create_user: true }) });

function showLogin() {
  main.innerHTML = `<div class="c">${steps(0)}<form class="box" id="f1"><h3 style="font-size:1.6rem">Log in or sign up</h3>
    <p class="muted">Enter your email and we will send you a sign-in code. No password needed.</p>
    <div class="field"><label for="em">Email</label><input type="email" id="em" required autocomplete="email" placeholder="you@yourbrokerage.com"></div>
    <button class="btn wide">Email me a code</button><p class="err" id="lerr" role="status"></p></form></div>`;
  const go = async (email) => { $('#lerr').textContent = ''; const r = await sendCode(email);
    if (r.ok) showConfirm(email); else $('#lerr').textContent = 'We could not send the email. Please check the address and try again in a minute.'; };
  $('#f1').onsubmit = (e) => { e.preventDefault(); go($('#em').value.trim()); };
  if (qs.get('email')) { $('#em').value = qs.get('email'); history.replaceState(null, '', '/app'); go($('#em').value); }
}
function showConfirm(email) {
  main.innerHTML = `<div class="c">${steps(1)}<form class="box" id="f2"><h3 style="font-size:1.6rem">Check your email</h3>
    <p class="muted">We sent a code to <b style="color:var(--ink)">${esc(email)}</b>. Enter it below, or click the link in the email.</p>
    <input class="codein" type="text" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" aria-label="Code from the email" placeholder="······">
    <button class="btn wide">Continue</button><p class="err" id="lerr" role="status"></p>
    <p class="small muted center">Didn't get it? Check spam, or <a href="#" id="again" style="color:var(--p);font-weight:700">send a new code</a>.</p></form></div>`;
  $('#code').focus();
  $('#f2').onsubmit = async (e) => { e.preventDefault();
    const r = await fetch(`${SB}/auth/v1/verify`, { method: 'POST', headers: H, body: JSON.stringify({ type: 'email', email, token: $('#code').value.replace(/\D/g, '') }) });
    if (r.ok) { keep(await r.json()); start(); } else $('#lerr').textContent = 'That code did not work. Please check it or request a new one.'; };
  $('#again').onclick = async (e) => { e.preventDefault(); const r = await sendCode(email); $('#lerr').className = r.ok ? 'ok' : 'err'; $('#lerr').textContent = r.ok ? 'New code sent.' : 'Please wait a minute before requesting another code.'; };
}

/* ---------- plan ---------- */
function showPlans() {
  let cycle = want?.cycle || 'yearly'; const pl = cfg.plans;
  const checkout = async (plan, btn) => { if (btn) { btn.disabled = true; btn.textContent = 'Opening secure checkout…'; }
    try { location.href = (await api('/api/checkout', { plan, cycle })).url; } catch (err) { paint(); $('#plerr').textContent = err.message; } };
  const paint = () => { main.innerHTML = `<div class="c">${steps(2)}<h2>Choose your plan</h2>
    <div class="tog" role="group" aria-label="Billing"><button type="button" data-c="monthly" aria-pressed="${cycle === 'monthly'}">Monthly</button><button type="button" data-c="yearly" aria-pressed="${cycle === 'yearly'}">Yearly<span class="save">2 months free</span></button></div>
    <div class="plans">
      <div class="card plan"><h3>${pl.basic.name}</h3><div class="pr">$${pl.basic[cycle]}<small> / ${cycle === 'yearly' ? 'year' : 'month'}</small></div><p class="muted">Greater Vancouver report with your name, photo and logo, in a clean white and blue design.</p><button class="btn ghost wide" data-p="basic">Choose ${pl.basic.name}</button></div>
      <div class="card plan rec"><h3>${pl.pro.name}</h3><div class="pr">$${pl.pro[cycle]}<small> / ${cycle === 'yearly' ? 'year' : 'month'}</small></div><p class="muted">Your own colours, fonts and styles, every city, PDF and social images.</p><button class="btn wide" data-p="pro">Choose ${pl.pro.name}</button></div>
    </div><p class="err" id="plerr" role="status"></p><p class="small muted">Prices in Canadian dollars, plus GST. Have a promo code? Enter it at checkout.</p></div>`; };
  paint();
  main.onclick = (e) => { const c = e.target.closest('[data-c]'), p = e.target.closest('[data-p]'); if (c) { cycle = c.dataset.c; paint(); } if (p) checkout(p.dataset.p, p); };
  // Came from the pricing page with a plan already chosen: go straight to payment, once.
  if (want && ['basic', 'pro'].includes(want.plan) && !sessionStorage.getItem('mup_went')) { sessionStorage.setItem('mup_went', '1'); checkout(want.plan, $(`[data-p=${want.plan}]`)); }
}

/* ---------- dashboard ---------- */
let P = {}, D = null, active = false, area = 'Greater Vancouver', tab = 'report';
const DETAILS = [['name', 'Your name', 'text', 'Jane Smith'], ['brokerage', 'Brokerage', 'text', 'Your brokerage'], ['phone', 'Phone', 'tel', '604-555-0100'], ['contact_email', 'Email for clients', 'email', 'you@email.com'], ['website', 'Website (optional)', 'text', 'yourname.ca']];
const ACCENTS = ['#0f6b4f', '#14233f', '#1d4f9c', '#b3202e', '#d0a94a', '#6b3fa0', '#111312'], BGS = ['#ffffff', '#f7f4ee', '#eef3fb', '#111312'];
const isPro = () => P.plan === 'pro';
const theme = () => (isPro() ? { style: 'modern', ...STYLES.modern, ...(P.theme || {}) } : BASIC_THEME);
const agent = () => ({ ...P, theme: theme() });
function shrink(file, max, type) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => { const k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas');
  c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); ok(c.toDataURL(type, 0.88)); }; i.onerror = no; i.src = URL.createObjectURL(file); }); }

async function start() {
  if (!cfg.demo && !session) return showLogin();
  try {
    let j = await api('/api/me');
    if (cfg.demo) { P = { plan: qs.get('plan') === 'basic' ? 'basic' : 'pro', slug: 'demo', ...JSON.parse(localStorage.getItem('mup_demo_profile') || '{}') }; if (qs.get('plan')) P.plan = qs.get('plan') === 'basic' ? 'basic' : 'pro'; D = j.report; active = true; }
    else {
      for (let i = 0; qs.has('welcome') && !j.active && i < 8; i++) { main.innerHTML = `<div class="c">${steps(3)}<p class="lead">Confirming your payment…</p></div>`; await new Promise((r) => setTimeout(r, 1500)); j = await api('/api/me'); }
      P = j.profile; D = j.report; active = j.active; $('#logout').hidden = false; $('#billing').hidden = !P.stripe_customer_id;
    }
  } catch (e) { if (e.message !== 'signed out') main.innerHTML = `<div class="c"><p class="err">${esc(e.message)}</p></div>`; return; }
  if (!active) return showPlans();
  sessionStorage.removeItem('mup_want'); sessionStorage.removeItem('mup_went');
  if (!P.role && sessionStorage.getItem('mup_role')) { P.role = sessionStorage.getItem('mup_role') === 'broker' ? 'broker' : 'realtor'; dirty.add('role'); }
  dashboard();
}
$('#logout').onclick = () => { keep(null); location.href = '/'; };
const portal = async () => { try { location.href = (await api('/api/portal', {})).url; } catch (e) { alertMsg(e.message); } };
$('#billing').onclick = portal;
const alertMsg = (t) => { const m = $('#smsg'); if (m) { m.textContent = t; setTimeout(() => (m.textContent = ''), 3000); } };

/* saving: only what changed, shortly after the last change */
const dirty = new Set(); let saveT, saving = null;
function touch(k) { dirty.add(k); $('#saved').textContent = 'Saving…'; clearTimeout(saveT); saveT = setTimeout(saveNow, 900); }
async function saveNow() {
  clearTimeout(saveT); if (saving) await saving; if (!dirty.size) return;
  const data = {}; for (const k of dirty) data[k] = P[k]; dirty.clear();
  saving = (async () => { try {
    if (cfg.demo) localStorage.setItem('mup_demo_profile', JSON.stringify(P)); else { const j = await api('/api/me', data); if (j.profile.slug && !P.slug) { P.slug = j.profile.slug; drawSend(); } }
    if ($('#saved')) $('#saved').textContent = '✓ Saved';
  } catch (e) { if ($('#saved')) $('#saved').innerHTML = `<span class="err">Not saved: ${esc(e.message)}</span>`; } saving = null; })();
  return saving;
}

function dashboard() {
  if (!D) { main.innerHTML = `<div class="c">${steps(4)}<h2>Your first report is on its way</h2><p class="lead">We will email you as soon as this month's report is published.</p></div>`; return; }
  main.onclick = null;
  main.innerHTML = `<div class="app"><div class="side">
    ${cfg.demo ? '<p class="note">Preview mode: nothing is saved to a server and no payment is taken.</p>' : ''}${qs.has('welcome') ? '<p class="note ok">You are subscribed. Welcome aboard.</p>' : ''}
    <div class="sec"><div class="hd"><h3>1 · Your details</h3><span class="ok small" id="saved"></span></div>
      <div class="two">${DETAILS.map(([k, l, t, ph]) => `<input type="${t}" data-k="${k}" value="${esc(P[k] || '')}" placeholder="${ph}" aria-label="${l}">`).join('')}
        <select data-k="role" aria-label="I am a"><option value="realtor"${P.role !== 'broker' ? ' selected' : ''}>I'm a REALTOR®</option><option value="broker"${P.role === 'broker' ? ' selected' : ''}>I'm a mortgage broker</option></select></div>
      <div class="two"><label class="up"><span id="ph-photo"></span><span>Your photo<br><b id="lb-photo"></b></span><input type="file" accept="image/*" data-img="photo"></label>
        <label class="up"><span id="ph-logo"></span><span>Your logo<br><b id="lb-logo"></b></span><input type="file" accept="image/*" data-img="logo"></label></div></div>
    <div class="sec" id="look"></div>
    <div class="sec" id="send"></div>
    <p id="smsg" class="ok small" role="status"></p></div>
    <div class="main"><div class="hd"><div><h3 style="font-size:1.35rem">Your ${esc(D.month)} report</h3><span class="live">Live preview. Changes show instantly.</span></div>
      <div class="seg" id="tabs" role="group" aria-label="Preview">${[['report', 'Report'], ['phone', 'Phone'], ['social', 'Social post'], ['pdf', 'PDF']].map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join('')}</div></div>
      <div id="pv"></div></div></div>`;
  thumbs(); drawLook(); drawSend(); preview();
  const side = $('.side');
  side.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; let v = e.target.value.trim();
    if (k === 'website' && v && !/^https?:\/\//.test(v)) v = 'https://' + v; P[k] = v; touch(k); later(); if (k === 'name') drawSend(); });
  side.addEventListener('change', async (e) => { const k = e.target.dataset.img; if (!k || !e.target.files[0]) return;
    try { P[k] = await shrink(e.target.files[0], k === 'logo' ? 520 : 400, k === 'logo' ? 'image/png' : 'image/jpeg'); touch(k); thumbs(); preview(); } catch { alertMsg('That image could not be read. Try a JPG or PNG.'); } });
  $('#tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; $('#tabs').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); preview(); };
  if (dirty.size) touch([...dirty][0]);
}
const thumbs = () => { $('#lb-photo').textContent = P.photo ? 'Change' : 'Add'; $('#lb-logo').textContent = P.logo ? 'Change' : 'Add'; $('#ph-photo').innerHTML = P.photo ? `<img class="round" src="${P.photo}" alt="">` : '<span class="ph">+</span>'; $('#ph-logo').innerHTML = P.logo ? `<img src="${P.logo}" alt="">` : '<span class="ph">+</span>'; };
let pvT; const later = () => { clearTimeout(pvT); pvT = setTimeout(preview, 140); };

function drawLook() {
  const el = $('#look');
  if (!isPro()) { el.innerHTML = `<h3>2 · Make it yours</h3><div class="lockbox"><span>Essentials uses one clean white and blue design. With Pro you choose your own colours, background and font, and start from three report styles.</span><button class="btn sm" id="up1">Upgrade to Pro</button></div>`; $('#up1').onclick = portal; return; }
  const t = theme();
  el.innerHTML = `<h3>2 · Make it yours</h3>
    <span class="lbl">Start from a style</span><div class="three">${Object.entries(STYLES).map(([k, s]) => `<button type="button" class="opt" data-style="${k}" aria-pressed="${t.style === k}"><i style="background:linear-gradient(135deg,${s.bg} 60%,${s.ac} 60%)"></i>${s.label}</button>`).join('')}</div>
    <span class="lbl">Theme colour</span><div class="sw">${ACCENTS.map((c) => `<button type="button" data-ac="${c}" style="background:${c}" aria-label="Colour ${c}" aria-pressed="${t.ac.toLowerCase() === c}"></button>`).join('')}<label class="pick" title="Any colour"><input type="color" data-pick="ac" value="${t.ac}" aria-label="Choose any theme colour"></label></div>
    <span class="lbl">Background</span><div class="sw">${BGS.map((c) => `<button type="button" data-bg="${c}" style="background:${c}" aria-label="Background ${c}" aria-pressed="${t.bg.toLowerCase() === c}"></button>`).join('')}<label class="pick" title="Any colour"><input type="color" data-pick="bg" value="${t.bg}" aria-label="Choose any background colour"></label></div>
    <span class="lbl">Font</span><div class="three">${Object.entries(FONTS).map(([k, f]) => `<button type="button" class="opt f" data-font="${k}" style="font-family:${f.hf.replaceAll('"', "'")}" aria-pressed="${t.font === k}">${f.label}</button>`).join('')}</div>`;
  const set = (patch) => { P.theme = { ...theme(), ...patch }; touch('theme'); drawLook(); preview(); };
  el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.style) set({ style: b.dataset.style, ...STYLES[b.dataset.style] }); else if (b.dataset.ac) set({ ac: b.dataset.ac }); else if (b.dataset.bg) set({ bg: b.dataset.bg }); else if (b.dataset.font) set({ font: b.dataset.font }); };
  el.oninput = (e) => { const k = e.target.dataset.pick; if (!k) return; P.theme = { ...theme(), [k]: e.target.value }; touch('theme'); later(); };
}

function drawSend() {
  const el = $('#send'); if (!el) return; const pro = isPro(), areas = areasOf(D), ok = !!(P.name && P.slug);
  if (!areas.includes(area)) area = 'Greater Vancouver';
  el.innerHTML = `<h3>3 · Send it</h3>${ok ? '' : '<p class="small muted">Add your name above and your sharing tools unlock.</p>'}
    <span class="lbl">What do you want to send?</span><select id="area" ${pro ? '' : 'disabled'}>${areas.map((a) => `<option${a === area ? ' selected' : ''}>${a}</option>`).join('')}</select>
    <div class="two"><button class="btn sm" data-do="link" ${ok ? '' : 'disabled'}>Copy my link</button><button class="btn sm ghost" data-do="email" ${ok ? '' : 'disabled'}>Copy client email</button>
      <button class="btn sm ghost" data-do="pdf" ${ok && pro ? '' : 'disabled'}>Download PDF</button><button class="btn sm ghost" data-do="post" ${ok && pro ? '' : 'disabled'}>Social post</button>
      <button class="btn sm ghost" data-do="story" ${ok && pro ? '' : 'disabled'}>Social story</button><button class="btn sm ghost" data-do="caption" ${ok && pro ? '' : 'disabled'}>Copy caption</button></div>
    ${pro ? '' : '<p class="small muted">Individual cities, PDF and social images are part of Pro. <a href="#" id="up2" style="color:var(--p);font-weight:700">Upgrade</a></p>'}
    ${ok ? `<a class="small" id="open" target="_blank" style="color:var(--p);font-weight:700">Open my live report ↗</a>` : ''}`;
  const link = () => reportLink(location.origin, P, area);
  if ($('#open')) $('#open').href = link();
  $('#area').onchange = (e) => { area = e.target.value; if ($('#open')) $('#open').href = link(); preview(); };
  if ($('#up2')) $('#up2').onclick = (e) => { e.preventDefault(); portal(); };
  el.onclick = async (e) => { const b = e.target.closest('[data-do]'); if (!b || b.disabled) return; const k = b.dataset.do, A = agent(); await saveNow();
    try {
      if (k === 'pdf') return void window.open(`/r/${P.slug}/print?area=${encodeURIComponent(area)}`, '_blank');
      if (k === 'post' || k === 'story') { download(await socialImage(D, A, area, k), `${area.replace(/\s+/g, '-')}-${D.month.replace(' ', '-')}-${k}.png`); return alertMsg('Image downloaded.'); }
      const d = emailDraft(D, A, area, link());
      if (k === 'email' && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([d.html], { type: 'text/html' }), 'text/plain': new Blob([`Subject: ${d.subject}\n\n${d.text}`], { type: 'text/plain' }) })]);
      else await navigator.clipboard.writeText(k === 'link' ? link() : k === 'caption' ? caption(D, A, area, link()) : d.text);
      alertMsg(k === 'email' ? `Copied. Suggested subject: ${d.subject}` : 'Copied. Paste it wherever you like.');
    } catch { alertMsg('Copying was blocked by the browser. Please try again.'); } };
}

async function preview() {
  const pv = $('#pv'); if (!pv) return; const A = agent(), pro = isPro();
  const locked = (what) => `<div class="frame pad"><div class="lockbox" style="max-width:360px;text-align:center"><b>${what} are part of Pro</b><span>Upgrade to download them with your branding.</span></div></div>`;
  if (tab === 'report' || tab === 'phone') { const top = pv.firstElementChild?.scrollTop || 0;
    pv.innerHTML = `<div class="frame${tab === 'phone' ? ' phone' : ''}"><div id="rp"></div></div>`; mountReport($('#rp'), D, A, { area, embedded: true }); pv.firstElementChild.scrollTop = top; }
  else if (tab === 'social') { if (!pro) return void (pv.innerHTML = locked('Social images')); pv.innerHTML = '<div class="frame pad"></div>'; const c = await socialImage(D, A, area, 'post'); if (tab === 'social') pv.firstElementChild.replaceChildren(c); }
  else { if (!pro) return void (pv.innerHTML = locked('PDF downloads')); if (!P.slug) return void (pv.innerHTML = '<div class="frame pad"><p class="muted">Add your name first.</p></div>');
    await saveNow(); pv.innerHTML = `<div class="frame"><iframe title="PDF preview" src="/r/${P.slug}/print?area=${encodeURIComponent(area)}"></iframe></div>`; }
}
start();
