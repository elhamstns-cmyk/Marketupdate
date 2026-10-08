import { esc, areasOf, mountReport, STYLES, FONTS, BASIC_THEME, loadFonts } from './report.js';
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
let recovering = false;
if (location.hash.includes('access_token=')) { const h = new URLSearchParams(location.hash.slice(1)); recovering = h.get('type') === 'recovery';
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
const STEPS = ['Email', 'Verify', 'Plan', 'Payment', 'Your report'];
const steps = (n) => `<div class="steps">${STEPS.map((s, i) => `${i ? '<i></i>' : ''}<span class="${i < n ? 'dn' : i === n ? 'on' : ''}"><b>${i < n ? '✓' : i + 1}</b>${s}</span>`).join('')}</div>`;
const authPost = (path, body, tok) => fetch(`${SB}/auth/v1/${path}`, { method: path === 'user' ? 'PUT' : 'POST', headers: { ...H, ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify(body) });
const errText = async (r) => { const j = await r.json().catch(() => ({})); return (j.msg || j.error_description || j.message || '').toLowerCase(); };
const pwField = (id, label, auto) => `<div class="field"><label for="${id}">${label}</label><div class="pw"><input type="password" id="${id}" required minlength="8" autocomplete="${auto}"><button type="button" class="eye" data-eye="${id}">Show</button></div></div>`;
const wireEyes = () => main.querySelectorAll('[data-eye]').forEach((b) => (b.onclick = () => { const i = $('#' + b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Show' : 'Hide'; }));

function showLogin(mode) {
  const signup = mode ? mode === 'signup' : !!qs.get('email');
  const pre = qs.get('email') || ''; if (pre) history.replaceState(null, '', '/app');
  main.innerHTML = `<div class="c">${signup ? steps(0) : ''}<form class="box" id="f1"><h3 style="font-size:1.6rem">${signup ? 'Create your account' : 'Welcome back'}</h3>
    <p class="muted">${signup ? 'Choose a password. You will use it with your email to log in.' : 'Log in with your email and password.'}</p>
    <a class="btn ghost wide gbtn" href="${SB}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin + '/app')}"><svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continue with Google</a>
    <div class="or"><span>or use your email</span></div>
    <div class="field"><label for="em">Email</label><input type="email" id="em" required autocomplete="email" value="${esc(pre)}" placeholder="you@yourbrokerage.com"></div>
    ${pwField('pw', signup ? 'Create a password (at least 8 characters)' : 'Password', signup ? 'new-password' : 'current-password')}
    <button class="btn wide">${signup ? 'Create account' : 'Log in'}</button>
    ${signup ? '' : '<a href="#" id="forgot" class="small" style="color:var(--p);font-weight:700;justify-self:start">Forgot your password?</a>'}
    <p class="err" id="lerr" role="status"></p>
    <p class="small muted center">${signup ? 'Already have an account? <a href="#" id="swap" style="color:var(--p);font-weight:700">Log in</a>' : 'New here? <a href="#" id="swap" style="color:var(--p);font-weight:700">Create an account</a>'}</p></form></div>`;
  wireEyes(); (pre ? $('#pw') : $('#em')).focus();
  $('#swap').onclick = (e) => { e.preventDefault(); showLogin(signup ? 'login' : 'signup'); };
  if ($('#forgot')) $('#forgot').onclick = (e) => { e.preventDefault(); showForgot($('#em').value.trim()); };
  $('#f1').onsubmit = async (e) => { e.preventDefault(); const email = $('#em').value.trim(), password = $('#pw').value, btn = $('#f1 .btn'); $('#lerr').textContent = '';
    if (password.length < 8) { $('#lerr').textContent = 'Your password needs at least 8 characters.'; return; }
    btn.disabled = true;
    if (signup) {
      const r = await fetch(`${SB}/auth/v1/signup?redirect_to=${encodeURIComponent(location.origin + '/app')}`, { method: 'POST', headers: H, body: JSON.stringify({ email, password }) });
      if (r.ok) { const j = await r.json(); if (j.access_token) { keep(j); start(); } else showVerify(email); return; }
      const t = await errText(r); btn.disabled = false;
      $('#lerr').textContent = t.includes('already') ? 'There is already an account with this email. Log in instead.' : t.includes('password') ? 'Please choose a stronger password.' : 'We could not create your account. Please try again in a minute.';
    } else {
      const r = await authPost('token?grant_type=password', { email, password });
      if (r.ok) { keep(await r.json()); start(); return; }
      const t = await errText(r); btn.disabled = false;
      $('#lerr').textContent = t.includes('confirm') ? 'Please verify your email first. Check your inbox for our link.' : 'That email and password do not match. Try again, or reset your password.';
    } };
}
function showVerify(email) {
  main.innerHTML = `<div class="c">${steps(1)}<div class="box"><h3 style="font-size:1.6rem">Verify your email</h3>
    <p class="muted">We sent a link to <b style="color:var(--ink)">${esc(email)}</b>. Click it to verify your email and continue. You can close this tab.</p>
    <p class="small muted">Didn't get it? Check your spam folder, or <a href="#" id="again" style="color:var(--p);font-weight:700">send it again</a>.</p><p class="ok small" id="lerr" role="status"></p></div></div>`;
  $('#again').onclick = async (e) => { e.preventDefault(); const r = await authPost('resend', { type: 'signup', email }); $('#lerr').className = r.ok ? 'ok small' : 'err small'; $('#lerr').textContent = r.ok ? 'Sent again. Check your inbox.' : 'Please wait a minute before asking again.'; };
}
function showForgot(email) {
  main.innerHTML = `<div class="c"><form class="box" id="f3"><h3 style="font-size:1.6rem">Reset your password</h3><p class="muted">Enter your email and we will send you a link to choose a new password.</p>
    <div class="field"><label for="em">Email</label><input type="email" id="em" required autocomplete="email" value="${esc(email || '')}"></div>
    <button class="btn wide">Send reset link</button><p id="lerr" class="small" role="status"></p><a href="#" id="back" class="small" style="color:var(--p);font-weight:700">Back to log in</a></form></div>`;
  $('#back').onclick = (e) => { e.preventDefault(); showLogin('login'); };
  $('#f3').onsubmit = async (e) => { e.preventDefault(); const r = await fetch(`${SB}/auth/v1/recover?redirect_to=${encodeURIComponent(location.origin + '/app')}`, { method: 'POST', headers: H, body: JSON.stringify({ email: $('#em').value.trim() }) });
    $('#lerr').className = r.ok ? 'ok small' : 'err small'; $('#lerr').textContent = r.ok ? 'If there is an account with this email, a reset link is on its way.' : 'Please wait a minute and try again.'; };
}
function showNewPassword() {
  main.innerHTML = `<div class="c"><form class="box" id="f4"><h3 style="font-size:1.6rem">Choose a new password</h3>${pwField('pw', 'New password (at least 8 characters)', 'new-password')}
    <button class="btn wide">Save password</button><p class="err" id="lerr" role="status"></p></form></div>`;
  wireEyes(); $('#pw').focus();
  $('#f4').onsubmit = async (e) => { e.preventDefault(); if ($('#pw').value.length < 8) { $('#lerr').textContent = 'Your password needs at least 8 characters.'; return; }
    const r = await authPost('user', { password: $('#pw').value }, await token()); if (r.ok) start(); else $('#lerr').textContent = 'We could not save it. Please request a new reset link.'; };
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
  if (recovering) { recovering = false; return showNewPassword(); }
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
  main.onclick = null; loadFonts(Object.keys(FONTS));
  main.innerHTML = `<div class="app"><div class="side">
    ${cfg.demo ? '<p class="note">Preview mode: nothing is saved to a server and no payment is taken.</p>' : ''}${qs.has('welcome') ? `<p class="note ok">You are subscribed${P.name ? ', ' + esc(P.name.trim().split(/\s+/)[0]) : ''}. Welcome aboard.</p>` : ''}
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
    <span class="lbl">Font</span><div class="fonts">${Object.entries(FONTS).map(([k, f]) => `<button type="button" class="opt f" data-font="${k}" style="font-family:${f.hf.replaceAll('"', "'")}" aria-pressed="${t.font === k}">${f.label}</button>`).join('')}</div>`;
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
    <div class="acts">${[['link', 'Your report link', 'Text or email it, or put it in your bio.', 'Copy link', 1], ['email', 'Email for your clients', 'A finished message to paste into Gmail or your CRM.', 'Copy email', 1],
      ['pdf', 'PDF', 'A three-page report to print or attach.', 'Open PDF', pro], ['post', 'Instagram post', 'Square image with your branding.', 'Download', pro], ['story', 'Instagram story', 'Tall image for stories.', 'Download', pro], ['caption', 'Caption', 'Words to paste under your post.', 'Copy caption', pro]]
      .map(([k, t, d, b, on]) => `<div class="act${on ? '' : ' off'}"><div><b>${t}</b><span>${d}</span></div><button class="btn sm ${k === 'link' ? '' : 'ghost'}" data-do="${k}" ${ok && on ? '' : 'disabled'}>${on ? b : 'Pro'}</button></div>`).join('')}</div>
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
  if (tab === 'report' || tab === 'phone') { const top = pv.querySelector('.frame')?.scrollTop || 0;
    pv.innerHTML = tab === 'phone' ? '<div class="phonewrap"><div class="frame phone"><div id="rp"></div></div></div>' : '<div class="frame"><div id="rp"></div></div>';
    mountReport($('#rp'), D, A, { area, embedded: true }); pv.querySelector('.frame').scrollTop = top; }
  else if (tab === 'social') { if (!pro) return void (pv.innerHTML = locked('Social images')); pv.innerHTML = '<div class="frame pad"></div>'; const c = await socialImage(D, A, area, 'post'); if (tab === 'social') pv.firstElementChild.replaceChildren(c); }
  else { if (!pro) return void (pv.innerHTML = locked('PDF downloads')); if (!P.slug) return void (pv.innerHTML = '<div class="frame pad"><p class="muted">Add your name first.</p></div>');
    await saveNow(); pv.innerHTML = `<div class="frame"><iframe title="PDF preview" src="/r/${P.slug}/print?area=${encodeURIComponent(area)}"></iframe></div>`; }
}
start();
