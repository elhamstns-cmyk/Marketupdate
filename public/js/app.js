import { esc, areasOf, mountReport, STYLES, FONTS, BASIC_THEME, loadFonts, SHOW_NUMBERS, SHOW_SECTIONS, DEFAULT_SHOW, TYPES, T1, showOf, monthKey, COVERS } from './report.js';
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
// Email links (verify email, reset password) come to our own site with a one-time code, never to the sign-in provider's address.
let notice = '', noticeOk = '';
// Ask for a "Confirm your email" link. It doesn't block anything; it unlocks sending to clients later.
const sendConfirm = (email) => fetch(`${SB}/auth/v1/otp`, { method: 'POST', headers: H, body: JSON.stringify({ email, create_user: false }) }).then((r) => r.ok).catch(() => false);
if (qs.get('confirm')) {
  const r = await fetch('/api/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token_hash: qs.get('confirm') }) });
  const j = await r.json().catch(() => ({}));
  if (r.ok && j.session) { keep(j.session); noticeOk = 'Thanks, your email is confirmed.'; } else notice = j.error || 'That link has expired. You can ask for a new one from your dashboard.';
  history.replaceState(null, '', '/app');
}
if (qs.get('token_hash')) {
  const type = ['email', 'signup', 'recovery', 'email_change', 'invite', 'magiclink'].includes(qs.get('type')) ? qs.get('type') : 'email';
  const r = await fetch(`${SB}/auth/v1/verify`, { method: 'POST', headers: H, body: JSON.stringify({ type, token_hash: qs.get('token_hash') }) });
  if (r.ok) { keep(await r.json()); recovering = type === 'recovery'; } else notice = 'That link has expired or was already used. Log in, or ask for a new link.';
  history.replaceState(null, '', '/app');
}
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
const STEPS = ['Account', 'Your report', 'Plan', 'Payment'];
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
  wireEyes(); (pre ? $('#pw') : $('#em')).focus(); if (notice) { $('#lerr').textContent = notice; notice = ''; }
  $('#swap').onclick = (e) => { e.preventDefault(); showLogin(signup ? 'login' : 'signup'); };
  if ($('#forgot')) $('#forgot').onclick = (e) => { e.preventDefault(); showForgot($('#em').value.trim()); };
  $('#f1').onsubmit = async (e) => { e.preventDefault(); const email = $('#em').value.trim(), password = $('#pw').value, btn = $('#f1 .btn'); $('#lerr').textContent = '';
    if (password.length < 8) { $('#lerr').textContent = 'Your password needs at least 8 characters.'; return; }
    btn.disabled = true;
    if (signup) {
      const r = await fetch(`${SB}/auth/v1/signup?redirect_to=${encodeURIComponent(location.origin + '/app')}`, { method: 'POST', headers: H, body: JSON.stringify({ email, password }) });
      if (r.ok) { const j = await r.json(); if (j.access_token) { keep(j); sendConfirm(email); start(); } else showVerify(email); return; }
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
  main.innerHTML = `<div class="c">${steps(0)}<div class="box"><h3 style="font-size:1.6rem">Verify your email</h3>
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
  const mine = P.name ? `<div class="mine">${P.photo ? `<img src="${P.photo}" alt="">` : ''}<div><b>${esc(P.name)}'s market report</b><span>Share it the moment you subscribe. Your link, PDF and posts are waiting.</span></div><a href="#" data-back style="margin-left:auto">Edit</a></div>` : '';
  const paint = () => { main.innerHTML = `<div class="c">${steps(2)}<h2>${P.name ? 'Your report is ready. Unlock it.' : 'Choose your plan'}</h2>${mine}
    <div class="tog" role="group" aria-label="Billing"><button type="button" data-c="monthly" aria-pressed="${cycle === 'monthly'}">Monthly</button><button type="button" data-c="yearly" aria-pressed="${cycle === 'yearly'}">Yearly<span class="save">2 months free</span></button></div>
    <div class="plans">
      <div class="card plan"><h3>${pl.basic.name}</h3><div class="pr">$${pl.basic[cycle]}<small> / ${cycle === 'yearly' ? 'year' : 'month'}</small></div><p class="muted">Greater Vancouver report with your name, photo and logo, in a clean white and blue design.</p><button class="btn ghost wide" data-p="basic">Choose ${pl.basic.name}</button></div>
      <div class="card plan rec"><h3>${pl.pro.name}</h3><div class="pr">$${pl.pro[cycle]}<small> / ${cycle === 'yearly' ? 'year' : 'month'}</small></div><p class="muted">Your own colours, fonts and styles, every city, PDF and social images.</p><button class="btn wide" data-p="pro">Choose ${pl.pro.name}</button></div>
    </div><p class="err" id="plerr" role="status"></p><p class="small muted">Prices in Canadian dollars, plus GST. Have a promo code? Enter it at checkout.</p></div>`; };
  paint();
  main.onclick = (e) => { if (e.target.closest('[data-back]')) { e.preventDefault(); return showPreview(); } const c = e.target.closest('[data-c]'), p = e.target.closest('[data-p]'); if (c) { cycle = c.dataset.c; paint(); } if (p) checkout(p.dataset.p, p); };
  // Came from the pricing page with a plan already chosen: go straight to payment, once.
  if (want && ['basic', 'pro'].includes(want.plan) && !sessionStorage.getItem('mup_went')) { sessionStorage.setItem('mup_went', '1'); checkout(want.plan, $(`[data-p=${want.plan}]`)); }
}

/* ---------- your report, before paying ---------- */
function showPreview() {
  main.onclick = null;
  main.innerHTML = `<div class="c" style="padding-bottom:0">${steps(1)}</div><div class="pvlay"><div class="pvpanel"><h2>Let's make it yours</h2><p class="muted small">Add your details and watch your report update. This is exactly what your clients will see.</p>
    ${[['name', 'Your name', 'text', 'Jane Smith', 'name'], ['brokerage', 'Brokerage', 'text', 'Your brokerage', 'organization'], ['phone', 'Phone', 'tel', '604-555-0100', 'tel']].map(([k, l, t, ph, ac]) => `<div class="field"><label for="pv-${k}">${l}</label><input id="pv-${k}" type="${t}" data-k="${k}" value="${esc(P[k] || '')}" placeholder="${ph}" autocomplete="${ac}"></div>`).join('')}
    <div class="two">${['photo', 'logo'].map((k) => `<div class="upw"><label class="up"><span id="ph-${k}"></span><span>Your ${k}<br><b id="lb-${k}"></b></span><input type="file" accept="image/*" data-img="${k}"></label><button type="button" class="rm" data-rm="${k}" aria-label="Remove your ${k}" hidden><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div>`).join('')}</div>
    <a href="#" class="pvsee" id="pvsee">See your report preview ↓</a><button class="btn wide" id="pvgo">Looks great. Choose my plan</button><p class="err small" id="pverr" role="status"></p><p class="small muted center" style="margin-top:-6px">You can change everything later.</p></div>
    <div class="pvframe"><div id="rp"></div><div class="wm" aria-hidden="true"><span>PREVIEW</span></div><span class="ptag">Your report · preview</span></div></div>`;
  thumbs(); loadFonts(['modern']);
  const draw = () => mountReport($('#rp'), D, { ...P, theme: { style: 'modern', ...STYLES.modern } }, { embedded: true });
  if (D) draw(); else $('#rp').innerHTML = '<p class="muted" style="padding:40px;text-align:center">Your first report is on its way.</p>';
  const panel = $('.pvpanel'); let t;
  panel.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; P[k] = e.target.value.trim(); touch(k); clearTimeout(t); t = setTimeout(() => D && draw(), 150); });
  panel.addEventListener('change', async (e) => { const k = e.target.dataset.img; if (!k || !e.target.files[0]) return;
    try { P[k] = await shrink(e.target.files[0], k === 'logo' ? 520 : 400, k === 'logo' ? 'image/png' : 'image/jpeg'); touch(k); thumbs(); D && draw(); } catch { alertMsg('That image could not be read. Try a JPG or PNG.', true); } e.target.value = ''; });
  panel.addEventListener('click', async (e) => { const r = e.target.closest('[data-rm]'); if (r) { P[r.dataset.rm] = ''; touch(r.dataset.rm); thumbs(); D && draw(); return; }
    if (e.target.id === 'pvsee') { e.preventDefault(); return $('.pvframe').scrollIntoView({ behavior: 'smooth' }); }
    if (e.target.id !== 'pvgo') return;
    if (!P.name) { $('#pverr').textContent = 'Add your name so it shows on your report.'; return $('#pv-name').focus(); }
    e.target.disabled = true; await saveNow(); sessionStorage.setItem('mup_previewed', '1'); showPlans(); });
  if (!P.name) $('#pv-name').focus();
}

/* ---------- dashboard ---------- */
let P = {}, D = null, active = false, area = 'Greater Vancouver', tab = 'report', view = 'create', HIST = [], filter = 'all';
const DETAILS = [['name', 'Your name', 'text', 'Jane Smith'], ['brokerage', 'Brokerage', 'text', 'Your brokerage'], ['phone', 'Phone', 'tel', '604-555-0100'], ['contact_email', 'Email for clients', 'email', 'you@email.com'], ['website', 'Website (optional)', 'text', 'yourname.ca']];
const ACCENTS = ['#0f6b4f', '#14233f', '#1d4f9c', '#b3202e', '#d0a94a', '#6b3fa0', '#111312'], BGS = ['#ffffff', '#f7f4ee', '#eef3fb', '#111312'];
const isPro = () => P.plan === 'pro';
const theme = () => (isPro() ? { style: 'modern', ...STYLES.modern, ...(P.theme || {}) } : BASIC_THEME);
const agent = () => ({ ...P, theme: theme(), show: isPro() ? P.show || null : null });
const current = () => (isPro() ? { theme: theme(), show: showOf(P) } : {});
function shrink(file, max, type) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => { const k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas');
  c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); ok(c.toDataURL(type, 0.88)); }; i.onerror = no; i.src = URL.createObjectURL(file); }); }

/* ---------- history: everything the agent creates ---------- */
const KIND = { link: ['Report link', 'Copy link'], email: ['Client email', 'Copy email'], pdf: ['PDF report', 'Open PDF'], post: ['Instagram post', 'Download'], story: ['Instagram story', 'Download'], caption: ['Caption', 'Copy caption'] };
const ICON = { link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  pdf: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>', post: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="12" r="3.5"/>', story: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>', caption: '<path d="M5 6h14M5 10h14M5 14h9M5 18h6"/>' };
const icon = (k) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const HIDE_NAMES = { prices: 'prices', changes: 'price changes', sold: 'homes sold', forsale: 'homes for sale', days: 'days to sell', market: 'market type', detached: 'detached', townhome: 'townhomes', condo: 'condos', summary: 'written summary', compare: 'area comparison' };
const demoKey = 'mup_demo_exports';
async function loadHistory() {
  if (cfg.demo) { try { HIST = JSON.parse(localStorage.getItem(demoKey) || '[]'); } catch { HIST = []; } return; }
  try { HIST = (await api('/api/exports')).items || []; } catch { HIST = []; }
}
async function record(kind, a = area) {
  const body = { kind, area: isPro() ? a : 'Greater Vancouver', month: D.month, settings: current() };
  let it;
  if (cfg.demo) { const sig = JSON.stringify([body.kind, body.area, body.month, body.settings]);
    it = HIST.find((x) => x.sig === sig) || { id: Math.random().toString(36).slice(2, 10), ...body, month_key: monthKey(body.month), sig };
    it.created_at = new Date().toISOString(); try { localStorage.setItem(demoKey, JSON.stringify([it, ...HIST.filter((x) => x.id !== it.id)])); } catch {} }
  else it = (await api('/api/exports', body)).item;
  HIST = [it, ...HIST.filter((x) => x.id !== it.id)]; drawNav(); return it;
}
const linkOf = (it) => reportLink(location.origin, P, it.area, it.id);
const printOf = (it, extra = '') => `/r/${P.slug}/print?v=${it.id}&area=${encodeURIComponent(it.area)}${extra}`;
const agentOf = (it) => (isPro() ? { ...P, theme: it.settings?.theme || theme(), show: it.settings?.show || null } : agent());
async function dataOf(it) { if (it.month === D.month) return D; try { const j = await (await fetch(`/api/report?slug=${encodeURIComponent(P.slug)}&v=${it.id}`)).json(); return j.report || D; } catch { return D; } }
// Copies text that is still being prepared, without losing the click (needed by Safari).
function copy(textP, htmlP) {
  if (window.ClipboardItem && navigator.clipboard?.write) {
    const items = { 'text/plain': textP.then((t) => new Blob([t], { type: 'text/plain' })) };
    if (htmlP) items['text/html'] = htmlP.then((h) => new Blob([h], { type: 'text/html' }));
    return navigator.clipboard.write([new ClipboardItem(items)]).catch(async () => navigator.clipboard.writeText(await textP));
  }
  return textP.then((t) => navigator.clipboard.writeText(t));
}
const fname = (it) => `${it.area.replace(/\s+/g, '-')}-${it.month.replace(' ', '-')}-${it.kind}.png`;
// Runs one action for a saved item (or one being made right now).
function act(kind, itP, verb) {
  if (verb === 'open' || kind === 'pdf') { const w = window.open('', '_blank'); itP.then((it) => { w.location = verb === 'open' ? linkOf(it) : printOf(it); }).catch((e) => { w.close(); alertMsg(e.message, true); }); return; }
  if (kind === 'post' || kind === 'story') { itP.then(async (it) => { download(await socialImage(await dataOf(it), agentOf(it), it.area, kind), fname(it)); alertMsg('Image downloaded.'); }).catch((e) => alertMsg(e.message, true)); return; }
  const mail = itP.then((it) => emailDraft(D, agentOf(it), it.area, linkOf(it)));
  const text = kind === 'email' ? mail.then((d) => `Subject: ${d.subject}\n\n${d.text}`) : itP.then((it) => (kind === 'link' ? linkOf(it) : caption(D, agentOf(it), it.area, linkOf(it))));
  copy(text, kind === 'email' ? mail.then((d) => d.html) : null).then(() => mail.then((d) => alertMsg(kind === 'email' ? `Email copied. Suggested subject: ${d.subject}` : kind === 'link' ? 'Link copied.' : 'Caption copied.')))
    .catch((e) => alertMsg(e.message === 'signed out' ? '' : 'Copying was blocked by the browser. Please try again.', true));
}
async function start() {
  if (!cfg.demo && !session) return showLogin();
  if (recovering) { recovering = false; return showNewPassword(); }
  try {
    let j = await api('/api/me');
    if (cfg.demo) { P = { plan: qs.get('plan') === 'basic' ? 'basic' : 'pro', slug: 'demo', ...JSON.parse(localStorage.getItem('mup_demo_profile') || '{}') }; if (qs.get('plan')) P.plan = qs.get('plan') === 'basic' ? 'basic' : 'pro'; D = j.report; active = !qs.has('newuser'); $('#logout').hidden = false; }
    else {
      for (let i = 0; qs.has('welcome') && !j.active && i < 8; i++) { main.innerHTML = `<div class="c">${steps(3)}<p class="lead">Confirming your payment…</p></div>`; await new Promise((r) => setTimeout(r, 1500)); j = await api('/api/me'); }
      P = j.profile; D = j.report; active = j.active; $('#logout').hidden = false;
    }
  } catch (e) { if (e.message !== 'signed out') main.innerHTML = `<div class="c"><p class="err">${esc(e.message)}</p></div>`; return; }
  if (!P.role && sessionStorage.getItem('mup_role')) { P.role = sessionStorage.getItem('mup_role') === 'broker' ? 'broker' : 'realtor'; dirty.add('role'); }
  if (!active) return sessionStorage.getItem('mup_previewed') && P.name ? showPlans() : showPreview();
  sessionStorage.removeItem('mup_want'); sessionStorage.removeItem('mup_went'); sessionStorage.removeItem('mup_previewed');
  await loadHistory(); show(qs.get('view') || 'create');
}
$('#logout').onclick = () => { keep(null); location.href = '/'; };
const portal = async () => { try { location.href = (await api('/api/portal', {})).url; } catch (e) { alertMsg(e.message, true); } };
let toastT; const alertMsg = (t, bad) => { if (!t) return; let m = $('#toast'); if (!m) { m = document.createElement('div'); m.id = 'toast'; m.setAttribute('role', 'status'); document.body.appendChild(m); }
  m.textContent = t; m.className = bad ? 'bad on' : 'on'; clearTimeout(toastT); toastT = setTimeout(() => (m.className = bad ? 'bad' : ''), 3200); };

/* ---------- the three pages: Create, My reports, Account ---------- */
function drawNav() { const n = $('#subnav'); if (!n) return;
  n.innerHTML = `<div class="sn" role="tablist">${[['create', 'Create'], ['history', `My reports${HIST.length ? ` <span class="cnt">${HIST.length}</span>` : ''}`], ['account', 'Account']].map(([k, l]) => `<button type="button" role="tab" data-view="${k}" aria-selected="${view === k}">${l}</button>`).join('')}</div>`; }
function show(v) {
  view = ['create', 'history', 'account'].includes(v) ? v : 'create'; saveNow();
  main.innerHTML = `<div class="subnav" id="subnav"></div><div id="page"></div>`; drawNav();
  $('#subnav').onclick = (e) => { const b = e.target.closest('[data-view]'); if (b && b.dataset.view !== view) show(b.dataset.view); };
  if (view === 'history') drawHistory(); else if (view === 'account') drawAccount(); else dashboard();
  window.scrollTo(0, 0);
}
/* saving: only what changed, shortly after the last change */
const dirty = new Set(); let saveT, saving = null;
function touch(k) { dirty.add(k); if ($('#saved')) $('#saved').textContent = 'Saving…'; clearTimeout(saveT); saveT = setTimeout(saveNow, 900); }
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
  const pg = $('#page');
  if (!D) { pg.innerHTML = `<div class="c">${steps(4)}<h2>Your first report is on its way</h2><p class="lead">We will email you as soon as this month's report is published.</p></div>`; return; }
  loadFonts(Object.keys(FONTS));
  pg.innerHTML = `<div class="app"><div class="side">
    ${cfg.demo ? '<p class="note">Preview mode: nothing is saved to a server and no payment is taken.</p>' : ''}${noticeOk ? `<p class="note ok">${esc(noticeOk)}</p>` : ''}${!cfg.demo && P.email_verified === false ? `<p class="note warn" id="cfm">Please confirm your email. We sent a link to <b>${esc(P.email || '')}</b>. <a href="#" id="cfmagain">Send it again</a></p>` : ''}${qs.has('welcome') ? `<p class="note ok">You are subscribed${P.name ? ', ' + esc(P.name.trim().split(/\s+/)[0]) : ''}. Welcome aboard.</p>` : ''}
    <div class="sec"><div class="hd"><h3>1 · Your details</h3><span class="ok small" id="saved"></span></div>
      <div class="two">${DETAILS.map(([k, l, t, ph]) => `<input type="${t}" data-k="${k}" value="${esc(P[k] || '')}" placeholder="${ph}" aria-label="${l}">`).join('')}
        <select data-k="role" aria-label="I am a"><option value="realtor"${P.role !== 'broker' ? ' selected' : ''}>I'm a REALTOR®</option><option value="broker"${P.role === 'broker' ? ' selected' : ''}>I'm a mortgage broker</option></select></div>
      <div class="two">${['photo', 'logo'].map((k) => `<div class="upw"><label class="up"><span id="ph-${k}"></span><span>Your ${k}<br><b id="lb-${k}"></b></span><input type="file" accept="image/*" data-img="${k}"></label><button type="button" class="rm" data-rm="${k}" aria-label="Remove your ${k}" title="Remove" hidden><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div>`).join('')}</div></div>
    <div class="sec" id="look"></div>
    <div class="sec" id="showsec"></div>
    <div class="sec" id="send"></div></div>
    <div class="main"><div class="hd"><div><h3 style="font-size:1.35rem">Your ${esc(D.month)} report</h3><span class="live">Live preview. Changes show instantly.</span></div>
      <div class="seg" id="tabs" role="group" aria-label="Preview">${[['report', 'Report'], ['phone', 'Phone'], ['post', 'Post'], ['story', 'Story'], ['pdf', 'PDF']].map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join('')}</div></div>
      <div id="pv"></div></div></div>`;
  thumbs(); drawLook(); drawShow(); drawSend(); preview(); noticeOk = '';
  if ($('#cfmagain')) $('#cfmagain').onclick = async (e) => { e.preventDefault(); const ok = await sendConfirm(P.email); alertMsg(ok ? 'Sent. Check your inbox.' : 'Please wait a minute and try again.', !ok); };
  const side = $('.side');
  side.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; let v = e.target.value.trim();
    if (k === 'website' && v && !/^https?:\/\//.test(v)) v = 'https://' + v; P[k] = v; touch(k); later(); if (k === 'name') drawSend(); });
  side.addEventListener('change', async (e) => { const k = e.target.dataset.img; if (!k || !e.target.files[0]) return;
    try { P[k] = await shrink(e.target.files[0], k === 'logo' ? 520 : 400, k === 'logo' ? 'image/png' : 'image/jpeg'); touch(k); thumbs(); preview(); } catch { alertMsg('That image could not be read. Try a JPG or PNG.', true); } e.target.value = ''; });
  side.addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (!b) return; const k = b.dataset.rm; P[k] = ''; touch(k); thumbs(); preview(); alertMsg(`Your ${k} was removed.`); });
  $('#tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; $('#tabs').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); preview(); };
  if (dirty.size) touch([...dirty][0]);
}
const thumbs = () => { for (const k of ['photo', 'logo']) { $('#lb-' + k).textContent = P[k] ? 'Change' : 'Add';
  $('#ph-' + k).innerHTML = P[k] ? `<img${k === 'photo' ? ' class="round"' : ''} src="${P[k]}" alt="">` : '<span class="ph">+</span>'; $(`[data-rm="${k}"]`).hidden = !P[k]; } };
let pvT; const later = () => { clearTimeout(pvT); pvT = setTimeout(preview, 140); };

function drawLook() {
  const el = $('#look');
  if (!isPro()) { el.innerHTML = `<h3>2 · Make it yours</h3><div class="lockbox"><span>Essentials uses one clean white and blue design. With Pro you choose your own colours, background and font, and start from three report styles.</span><button class="btn sm" id="up1">Upgrade to Pro</button></div>`; $('#up1').onclick = portal; return; }
  const t = theme();
  el.innerHTML = `<h3>2 · Make it yours</h3>
    <span class="lbl">Start from a style</span><div class="three">${Object.entries(STYLES).map(([k, s]) => `<button type="button" class="opt" data-style="${k}" aria-pressed="${t.style === k}"><i style="background:linear-gradient(135deg,${s.bg} 60%,${s.ac} 60%)"></i>${s.label}</button>`).join('')}</div>
    <span class="lbl">Theme colour</span><div class="sw">${ACCENTS.map((c) => `<button type="button" data-ac="${c}" style="background:${c}" aria-label="Colour ${c}" aria-pressed="${t.ac.toLowerCase() === c}"></button>`).join('')}<label class="pick" title="Any colour"><input type="color" data-pick="ac" value="${t.ac}" aria-label="Choose any theme colour"></label></div>
    <span class="lbl">Background</span><div class="sw">${BGS.map((c) => `<button type="button" data-bg="${c}" style="background:${c}" aria-label="Background ${c}" aria-pressed="${t.bg.toLowerCase() === c}"></button>`).join('')}<label class="pick" title="Any colour"><input type="color" data-pick="bg" value="${t.bg}" aria-label="Choose any background colour"></label></div>
    <span class="lbl">Font</span><div class="fonts">${Object.entries(FONTS).map(([k, f]) => `<button type="button" class="opt f" data-font="${k}" style="font-family:${f.hf.replaceAll('"', "'")}" aria-pressed="${t.font === k}">${f.label}</button>`).join('')}</div>
    <span class="lbl">PDF cover</span><div class="three">${Object.entries(COVERS).map(([k, l]) => `<button type="button" class="opt cvopt" data-cover="${k}" aria-pressed="${(t.cover || 'b') === k}"><i class="cvp cvp-${k}" style="--a:${t.ac}"><b></b><em></em></i>${l}</button>`).join('')}</div>`;
  const set = (patch) => { P.theme = { ...theme(), ...patch }; touch('theme'); drawLook(); preview(); };
  el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.style) set({ style: b.dataset.style, ...STYLES[b.dataset.style] }); else if (b.dataset.ac) set({ ac: b.dataset.ac }); else if (b.dataset.bg) set({ bg: b.dataset.bg }); else if (b.dataset.font) set({ font: b.dataset.font }); else if (b.dataset.cover) { set({ cover: b.dataset.cover }); tab = 'pdf'; $('#tabs').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x.dataset.tab === 'pdf')); preview(); } };
  el.oninput = (e) => { const k = e.target.dataset.pick; if (!k) return; P.theme = { ...theme(), [k]: e.target.value }; touch('theme'); later(); };
}


/* What appears on the report, PDF, images and email (Pro). */
function drawShow() {
  const el = $('#showsec');
  if (!isPro()) { el.innerHTML = `<h3>3 · What to show</h3><div class="lockbox"><span>With Pro you choose exactly what appears: hide price changes, show only condos, leave out the area comparison, and more.</span><button class="btn sm" id="up3">Upgrade to Pro</button></div>`; $('#up3').onclick = portal; return; }
  const sh = showOf(P), all = Object.keys(DEFAULT_SHOW).every((k) => sh[k]);
  const nums = SHOW_NUMBERS.filter(([k]) => sh[k]).length, noPrice = !sh.prices && !sh.changes;
  // Locked: the last two numbers can't be turned off, and the comparison needs prices or price changes.
  const lock = (k) => (SHOW_NUMBERS.some(([n]) => n === k) && sh[k] && nums <= 2) || (k === 'compare' && noPrice);
  const tg = (k, l) => `<label class="tg${lock(k) ? ' dis' : ''}"${lock(k) ? ` title="${k === 'compare' ? 'Needs prices or price changes' : 'Keep at least two numbers'}"` : ''}><input type="checkbox" data-sh="${k}"${sh[k] && !(k === 'compare' && noPrice) ? ' checked' : ''}${lock(k) ? ' disabled' : ''}><span class="sw2" aria-hidden="true"></span><span>${l}</span></label>`;
  el.innerHTML = `<div class="hd"><h3>3 · What to show</h3>${all ? '<span class="small muted">Showing everything</span>' : '<button type="button" class="linkbtn" id="showall">Show everything</button>'}</div>
    <p class="small muted" style="margin-top:-4px">Applies to your report, PDF, images and email.</p>
    <span class="lbl">Numbers <span class="hint">· keep at least two</span></span><div class="tgs">${SHOW_NUMBERS.map(([k, l]) => tg(k, l)).join('')}</div>
    <span class="lbl">Home types</span><div class="pills">${TYPES.map((t) => `<label class="pill"><input type="checkbox" data-sh="${t}"${sh[t] ? ' checked' : ''}><span>${{ detached: 'Detached', townhome: 'Townhomes', condo: 'Condos' }[t]}</span></label>`).join('')}</div>
    <span class="lbl">Sections</span><div class="tgs">${SHOW_SECTIONS.map(([k, l]) => tg(k, l)).join('')}</div>
    ${noPrice ? '<p class="small muted">Area comparison needs prices or price changes, so it is hidden.</p>' : ''}`;
  el.onchange = (e) => { const k = e.target.dataset.sh; if (!k) return; const next = { ...showOf(P), [k]: e.target.checked };
    if (!TYPES.some((t) => next[t])) { e.target.checked = true; return alertMsg('Keep at least one home type.', true); }
    if (SHOW_NUMBERS.filter(([n]) => next[n]).length < 2) { e.target.checked = true; return alertMsg('Keep at least two numbers so the report makes sense.', true); }
    P.show = next; touch('show'); drawShow(); later(); };
  if ($('#showall')) $('#showall').onclick = () => { P.show = { ...DEFAULT_SHOW }; touch('show'); drawShow(); preview(); };
}

function drawSend() {
  const el = $('#send'); if (!el) return; const pro = isPro(), areas = areasOf(D), ok = !!(P.name && P.slug);
  if (!areas.includes(area)) area = 'Greater Vancouver';
  el.innerHTML = `<h3>4 · Create and send</h3>${ok ? '' : '<p class="small muted">Add your name above and these unlock.</p>'}
    <span class="lbl">Area</span><select id="area" ${pro ? '' : 'disabled'}>${areas.map((a) => `<option${a === area ? ' selected' : ''}>${a}</option>`).join('')}</select>
    <div class="acts">${[['link', 'Report link', 'Interactive report to text, email or share.', 1], ['email', 'Email for your clients', 'A finished message to paste into Gmail or your CRM.', 1],
      ['pdf', 'PDF', 'A three-page report to print or attach.', pro], ['post', 'Instagram post', 'Square image with your branding.', pro], ['story', 'Instagram story', 'Tall image for stories.', pro], ['caption', 'Caption', 'Words to paste under your post.', pro]]
      .map(([k, t, d, on]) => `<div class="act${on ? '' : ' off'}"><span class="ic">${icon(k)}</span><div><b>${t}</b><span>${d}</span></div><div class="ab">${k === 'link' && on ? `<button class="btn sm ghost" data-do="link" data-verb="open" ${ok ? '' : 'disabled'}>Open</button>` : ''}<button class="btn sm ${k === 'link' ? '' : 'ghost'}" data-do="${k}" ${ok && on ? '' : 'disabled'}>${on ? KIND[k][1] : 'Pro'}</button></div></div>`).join('')}</div>
    <p class="small muted">${pro ? 'Everything you create is saved in <a href="#" data-go="history">My reports</a>, so you can find it again.' : 'Individual cities, PDF and social images are part of Pro. <a href="#" id="up2">Upgrade</a>'}</p>`;
  $('#area').onchange = (e) => { area = e.target.value; preview(); };
  if ($('#up2')) $('#up2').onclick = (e) => { e.preventDefault(); portal(); };
  el.onclick = (e) => { const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); return show(g.dataset.go); }
    const b = e.target.closest('[data-do]'); if (!b || b.disabled) return; saveNow(); act(b.dataset.do, record(b.dataset.do), b.dataset.verb); };
}

async function preview() {
  const pv = $('#pv'); if (!pv) return; const A = agent(), pro = isPro(), city = area !== 'Greater Vancouver';
  const locked = (what) => `<div class="frame pad"><div class="lockbox" style="max-width:360px;text-align:center"><b>${what} are part of Pro</b><span>Upgrade to download them with your branding.</span></div></div>`;
  if (tab === 'report' || tab === 'phone') { const top = pv.querySelector('.frame')?.scrollTop || 0;
    pv.innerHTML = tab === 'phone' ? '<div class="phonewrap"><div class="frame phone"><div id="rp"></div></div></div>' : '<div class="frame"><div id="rp"></div></div>';
    mountReport($('#rp'), D, A, { area, city, embedded: true }); pv.querySelector('.frame').scrollTop = top; }
  else if (tab === 'post' || tab === 'story') { if (!pro) return void (pv.innerHTML = locked('Social images')); pv.innerHTML = `<div class="frame pad ${tab}"></div>`; const c = await socialImage(D, A, area, tab); if (tab === 'post' || tab === 'story') pv.firstElementChild.replaceChildren(c); }
  else { if (!pro) return void (pv.innerHTML = locked('PDF downloads')); if (!P.slug) return void (pv.innerHTML = '<div class="frame pad"><p class="muted">Add your name first.</p></div>');
    pv.innerHTML = `<div class="frame"><iframe title="PDF preview" src="/r/${P.slug}/print?area=${encodeURIComponent(area)}&preview=${encodeURIComponent(JSON.stringify(current()))}"></iframe></div>`; }
}

/* ---------- My reports ---------- */
function drawHistory() {
  const pg = $('#page'), groups = { all: () => true, link: (k) => k === 'link', email: (k) => k === 'email', pdf: (k) => k === 'pdf', social: (k) => ['post', 'story', 'caption'].includes(k) };
  const list = HIST.filter((x) => groups[filter](x.kind)), day = (d) => { const t = new Date(d), n = new Date(), y = new Date(Date.now() - 864e5);
    return t.toDateString() === n.toDateString() ? 'Today' : t.toDateString() === y.toDateString() ? 'Yesterday' : t.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); };
  const time = (d) => new Date(d).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
  const hidden = (it) => { const sh = it.settings?.show; const off = sh ? Object.keys(HIDE_NAMES).filter((k) => sh[k] === false).map((k) => HIDE_NAMES[k]) : []; return off.length ? `Hiding ${off.join(', ')}` : 'Showing everything'; };
  let last = '', rows = '';
  for (const it of list) { const d = day(it.created_at); if (d !== last) { rows += `<h4 class="dayh">${d}</h4>`; last = d; }
    const live = ['link', 'email', 'caption'].includes(it.kind);
    rows += `<div class="hrow" data-id="${it.id}"><span class="ic">${icon(it.kind)}</span><div class="hi"><b>${esc(it.area)} · ${KIND[it.kind][0]}</b>
      <span>${time(it.created_at)} · ${live ? 'Always shows the newest numbers' : `${esc(it.month)} numbers`}</span>${isPro() ? `<span class="hid">${hidden(it)}</span>` : ''}</div>
      <div class="ab">${it.kind === 'link' ? '<button class="btn sm ghost" data-verb="open">Open</button>' : ''}<button class="btn sm${it.kind === 'link' ? '' : ' ghost'}" data-verb="go">${KIND[it.kind][1]}</button>
      <button class="rm2" data-verb="del" aria-label="Remove from My reports" title="Remove"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div></div>`; }
  pg.innerHTML = `<div class="hist"><div class="hhead"><div><h2>My reports</h2><p class="muted">Everything you have created, newest first. Links and emails always show the newest numbers. PDFs and images keep the month they were made from.</p></div>
      ${HIST.length ? '<button class="btn" data-go="create">Create new</button>' : ''}</div>
    ${HIST.length ? `<div class="chipsel" role="group" aria-label="Show">${[['all', 'All'], ['link', 'Links'], ['email', 'Emails'], ['pdf', 'PDFs'], ['social', 'Social']].map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${filter === k}">${l}</button>`).join('')}</div>` : ''}
    ${list.length ? `<div class="hlist">${rows}</div>` : `<div class="empty">${icon('pdf')}<b>${HIST.length ? 'Nothing of this type yet.' : 'Nothing here yet.'}</b><span>Create a link, email, PDF or image and it will be saved here with the date and time.</span><button class="btn" data-go="create">Create your first one</button></div>`}</div>`;
  pg.onclick = async (e) => { const g = e.target.closest('[data-go]'); if (g) return show(g.dataset.go);
    const f = e.target.closest('[data-f]'); if (f) { filter = f.dataset.f; return drawHistory(); }
    const b = e.target.closest('[data-verb]'); if (!b) return; const it = HIST.find((x) => x.id === b.closest('.hrow').dataset.id); if (!it) return;
    if (b.dataset.verb === 'del') { HIST = HIST.filter((x) => x.id !== it.id); if (cfg.demo) { try { localStorage.setItem(demoKey, JSON.stringify(HIST)); } catch {} } else fetch(`/api/exports?id=${encodeURIComponent(it.id)}`, { method: 'DELETE', headers: { authorization: `Bearer ${await token()}` } });
      drawNav(); drawHistory(); return alertMsg('Removed from My reports.'); }
    act(it.kind, Promise.resolve(it), b.dataset.verb === 'open' ? 'open' : null); };
}

/* ---------- Account: log in details, password, billing ---------- */
async function drawAccount() {
  const pg = $('#page'); pg.innerHTML = '<div class="acct"><p class="muted">Loading…</p></div>';
  let u = { email: P.email || 'you@example.com', app_metadata: { providers: ['email'] }, user_metadata: {} };
  if (!cfg.demo) try { const r = await fetch(`${SB}/auth/v1/user`, { headers: { ...H, authorization: `Bearer ${await token()}` } }); if (r.ok) u = await r.json(); } catch {}
  const prov = u.app_metadata?.providers || [], google = prov.includes('google'), hasPw = prov.includes('email') || !!u.user_metadata?.has_password;
  const plan = cfg.plans[P.plan]?.name || 'None', ends = P.period_end ? new Date(P.period_end).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  pg.innerHTML = `<div class="acct"><h2>Account</h2>
    <div class="card2"><h3>Log in</h3><div class="kv2"><span>Email</span><b>${esc(u.email)}</b></div><div class="kv2"><span>You log in with</span><b>${[google && 'Google', hasPw && 'Email and password'].filter(Boolean).join(' or ') || 'Email'}</b></div></div>
    <form class="card2" id="pwf"><h3>${hasPw ? 'Change your password' : 'Add a password'}</h3>
      <p class="small muted">${hasPw ? 'Enter your current password, then choose a new one.' : 'You signed up with Google. Add a password if you would also like to log in with your email.'}</p>
      ${hasPw ? pwField('cur', 'Current password', 'current-password') : ''}${pwField('npw', 'New password (at least 8 characters)', 'new-password')}
      <div class="row2"><button class="btn">Save password</button>${hasPw ? '<a href="#" id="fg" class="small">Forgot your current password?</a>' : ''}</div><p id="pmsg" class="small" role="status"></p></form>
    <div class="card2"><h3>Plan and billing</h3><div class="kv2"><span>Plan</span><b>${esc(plan)}</b></div>${ends ? `<div class="kv2"><span>${P.status === 'canceled' ? 'Ends' : 'Renews'}</span><b>${ends}</b></div>` : ''}
      <p class="small muted">Change plans, update your card, download receipts or cancel.</p><div><button class="btn ghost" id="bill"${P.stripe_customer_id || cfg.demo ? '' : ' disabled'}>Manage billing</button></div></div>
    <div><button class="btn ghost" id="lo">Log out</button></div></div>`;
  main.querySelectorAll('[data-eye]').forEach((b) => (b.onclick = () => { const i = $('#' + b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Show' : 'Hide'; }));
  $('#bill').onclick = portal; $('#lo').onclick = () => { keep(null); location.href = '/'; };
  const say = (t, ok) => { $('#pmsg').className = (ok ? 'ok' : 'err') + ' small'; $('#pmsg').textContent = t; };
  if ($('#fg')) $('#fg').onclick = async (e) => { e.preventDefault(); const r = await fetch(`${SB}/auth/v1/recover?redirect_to=${encodeURIComponent(location.origin + '/app')}`, { method: 'POST', headers: H, body: JSON.stringify({ email: u.email }) });
    say(r.ok ? `We sent a reset link to ${u.email}.` : 'Please wait a minute and try again.', r.ok); };
  $('#pwf').onsubmit = async (e) => { e.preventDefault(); const npw = $('#npw').value, btn = $('#pwf .btn');
    if (npw.length < 8) return say('Your new password needs at least 8 characters.');
    if (cfg.demo) return say('Preview mode: nothing is saved.', true);
    btn.disabled = true;
    if (hasPw) { const c = await authPost('token?grant_type=password', { email: u.email, password: $('#cur').value }); if (!c.ok) { btn.disabled = false; return say('Your current password is not right. Try again, or use the forgot link.'); } keep(await c.json()); }
    const r = await authPost('user', { password: npw, data: { has_password: true } }, await token()); btn.disabled = false;
    if (r.ok) { say('Saved. Use your new password next time you log in.', true); $('#pwf').reset(); return; }
    const t = await errText(r); say(t.includes('different') ? 'Your new password must be different from the old one.' : t.includes('weak') || t.includes('password') ? 'Please choose a stronger password.' : 'We could not save it. Please try again.'); };
}
start();
