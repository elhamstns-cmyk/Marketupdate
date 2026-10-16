import { mountReport, SECTIONS, SEC_IDS, layoutOf, DEFAULT_LAYOUT, MAX_AREAS, sameLayout, PAIRABLE, USES_TYPES, USES_AREAS, TYPE_KEYS, sizeOf } from './board.js';
import { esc, areasOf, STYLES, FONTS, BASIC_THEME, loadFonts, SHOW_NUMBERS, SHOW_SECTIONS, DEFAULT_SHOW, TYPES, T1, showOf, monthKey, COVERS } from './report.js';
import { reportLink, emailDraft, caption, socialImage, download } from './exports.js';
import { calmImage, calmCaption, imgOpts, IMG_PARTS } from './social2.js';
import { hoodCities, hoodNames, defaultCity, BLOCKS, HTYPES } from './hoods.js';
import { activity, times as timesW, mins } from './activity.js';
import { sv, isPhone, canShareFiles, toFile, shareMenu, closeMenu, qrModal } from './share.js';

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
      <div class="card plan"><h3>${pl.basic.name}</h3><div class="pr">$${pl.basic[cycle]}<small> / ${cycle === 'yearly' ? 'year' : 'month'}</small></div><p class="muted">Greater Vancouver report with your name, photo and logo, your own link and a client email.</p><button class="btn ghost wide" data-p="basic">Choose ${pl.basic.name}</button></div>
      <div class="card plan rec"><h3>${pl.pro.name}</h3><div class="pr">$${pl.pro[cycle]}<small> / ${cycle === 'yearly' ? 'year' : 'month'}</small></div><p class="muted">Every city and neighbourhood, PDF, Instagram images and personal links for clients.</p><button class="btn wide" data-p="pro">Choose ${pl.pro.name}</button></div>
    </div><p class="err" id="plerr" role="status"></p><p class="small muted">Prices in Canadian dollars, plus GST. Have a promo code? Enter it at checkout.</p></div>`; };
  paint();
  main.onclick = (e) => { if (e.target.closest('[data-back]')) { e.preventDefault(); return showPreview(); } const c = e.target.closest('[data-c]'), p = e.target.closest('[data-p]'); if (c) { cycle = c.dataset.c; paint(); } if (p) checkout(p.dataset.p, p); };
  // Came from the pricing page with a plan already chosen: go straight to payment, once.
  if (want && ['basic', 'pro'].includes(want.plan) && !sessionStorage.getItem('mup_went')) { sessionStorage.setItem('mup_went', '1'); checkout(want.plan, $(`[data-p=${want.plan}]`)); }
}


/* ---------- phone, licence, photo and logo helpers ---------- */
const localPhone = (v) => { let d = String(v || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d; };
const fullPhone = (v) => { const l = localPhone(v); return l ? `+1 ${l}` : ''; };
const phoneField = (id) => `<div class="field"><label for="${id}">Phone</label><div class="phonef"><span>+1</span><input id="${id}" type="tel" data-k="phone" value="${esc(localPhone(P.phone))}" placeholder="604-555-0100" autocomplete="tel-national"></div></div>`;
const licLabel = () => (P.role === 'broker' ? 'BCFSA licence number' : 'Your V number (licence)');
const licOk = (v) => (P.role === 'broker' ? /^[A-Z0-9-]{4,20}$/i.test(v || '') : /^V\d{4,8}$/i.test(String(v || '').trim()));
const licStatus = () => (P.licence_status === 'verified' ? '<span class="lic ok">✓ Verified</span>' : P.licence_status === 'rejected' ? '<span class="lic bad">Not found. Please check your number.</span>' : P.licence ? '<span class="lic">Checking, usually within 1 business day</span>' : '');
const licFields = (pre) => `<div class="field"><label for="${pre}-lic">${licLabel()}</label><input id="${pre}-lic" type="text" data-k="licence" value="${esc(P.licence || '')}" placeholder="${P.role === 'broker' ? 'Your BCFSA number' : 'V123456'}" autocomplete="off" style="text-transform:uppercase">${licStatus()}</div>
  <label class="attest"><input type="checkbox" data-k="gvr_member"${P.gvr_member ? ' checked' : ''}><span>${P.role === 'broker' ? 'I confirm I am a licensed mortgage broker in British Columbia.' : 'I confirm I am a licensed REALTOR® in British Columbia and a member of Greater Vancouver REALTORS®.'}</span></label>`;
// Reads the photo with a zoom-and-move step, or checks the logo is a transparent PNG.
async function pickImage(kind, file) {
  if (kind === 'logo') {
    if (file.type !== 'image/png') throw new Error('Please upload your logo as a PNG with a transparent background.');
    const img = await loadImage(URL.createObjectURL(file)), c = document.createElement('canvas'), k = Math.min(1, 200 / Math.max(img.width, img.height));
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    const a = x.getImageData(0, 0, c.width, c.height).data; let clear = 0; for (let i = 3; i < a.length; i += 4) if (a[i] < 250) clear++;
    if (clear < (a.length / 4) * 0.02) throw new Error('This logo has a solid background. Please upload the transparent PNG version (ask your brokerage for it).');
    return shrink(file, 520, 'image/png');
  }
  return cropPhoto(file);
}
const loadImage = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('That image could not be read. Try a JPG or PNG.')); i.src = src; });
function cropPhoto(file) {
  return loadImage(URL.createObjectURL(file)).then((img) => new Promise((done) => {
    const S = 280, box = document.createElement('div'); box.className = 'crop';
    box.innerHTML = `<div class="cropin" role="dialog" aria-label="Adjust your photo"><h3>Adjust your photo</h3><p class="small muted">Drag to move. Use the slider to zoom.</p>
      <div class="cstage"><canvas width="${S * 2}" height="${S * 2}" style="width:${S}px;height:${S}px"></canvas><i></i></div>
      <label class="zoom"><span>−</span><input type="range" min="1" max="3" step="0.01" value="1" aria-label="Zoom"><span>+</span></label>
      <div class="cbtns"><button class="btn ghost" data-x>Cancel</button><button class="btn" data-ok>Use this photo</button></div></div>`;
    document.body.appendChild(box);
    const cv = box.querySelector('canvas'), x = cv.getContext('2d'), base = Math.max((S * 2) / img.width, (S * 2) / img.height);
    let z = 1, ox = 0, oy = 0, drag = null;
    const clamp = () => { const w = img.width * base * z, h = img.height * base * z; ox = Math.min(0, Math.max(S * 2 - w, ox)); oy = Math.min(0, Math.max(S * 2 - h, oy)); };
    const draw = () => { clamp(); x.fillStyle = '#fff'; x.fillRect(0, 0, S * 2, S * 2); x.drawImage(img, ox, oy, img.width * base * z, img.height * base * z); };
    ox = (S * 2 - img.width * base) / 2; oy = (S * 2 - img.height * base) / 2; draw();
    box.querySelector('input').oninput = (e) => { const c = S, nz = +e.target.value; ox = c - ((c - ox) / z) * nz; oy = c - ((c - oy) / z) * nz; z = nz; draw(); };
    cv.onpointerdown = (e) => { drag = [e.clientX, e.clientY, ox, oy]; cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = (e) => { if (!drag) return; ox = drag[2] + (e.clientX - drag[0]) * 2; oy = drag[3] + (e.clientY - drag[1]) * 2; draw(); };
    cv.onpointerup = () => (drag = null);
    const close = (v) => { box.remove(); done(v); };
    box.querySelector('[data-x]').onclick = () => close(null);
    box.querySelector('[data-ok]').onclick = () => { const o = document.createElement('canvas'); o.width = o.height = 400; o.getContext('2d').drawImage(cv, 0, 0, 400, 400); close(o.toDataURL('image/jpeg', 0.9)); };
  }));
}

/* ---------- your report, before paying ---------- */
function showPreview() {
  main.onclick = null;
  main.innerHTML = `<div class="c" style="padding-bottom:0">${steps(1)}</div><div class="pvlay"><div class="pvpanel"><h2>Let's make it yours</h2><p class="muted small">Add your details and watch your report update. This is exactly what your clients will see.</p>
    <div class="field"><label for="pv-role">I am a</label><select id="pv-role" data-k="role"><option value="realtor"${P.role !== 'broker' ? ' selected' : ''}>REALTOR®</option><option value="broker"${P.role === 'broker' ? ' selected' : ''}>Mortgage broker</option></select></div>
    ${[['name', 'Your name', 'text', 'Jane Smith', 'name'], ['brokerage', 'Brokerage', 'text', 'Your brokerage', 'organization']].map(([k, l, t, ph, ac]) => `<div class="field"><label for="pv-${k}">${l}</label><input id="pv-${k}" type="${t}" data-k="${k}" value="${esc(P[k] || '')}" placeholder="${ph}" autocomplete="${ac}"></div>`).join('')}
    ${phoneField('pv-phone')}<div id="pvlic">${licFields('pv')}</div>
    <div class="two">${['photo', 'logo'].map((k) => `<div class="upw"><label class="up"><span id="ph-${k}"></span><span>Your ${k}<br><b id="lb-${k}"></b></span><input type="file" accept="image/*" data-img="${k}"></label><button type="button" class="rm" data-rm="${k}" aria-label="Remove your ${k}" hidden><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div>`).join('')}</div>
    <a href="#" class="pvsee" id="pvsee">See your report preview ↓</a><button class="btn wide" id="pvgo">Looks great. Choose my plan</button><p class="err small" id="pverr" role="status"></p><p class="small muted center" style="margin-top:-6px">You can change everything later.</p></div>
    <div class="pvframe"><div id="rp"></div><div class="wm" aria-hidden="true"><span>PREVIEW</span></div><span class="ptag">Your report · preview</span></div></div>`;
  thumbs(); loadFonts(['modern']);
  const draw = () => mountReport($('#rp'), D, { ...P, theme: { style: 'modern', ...STYLES.modern } }, { embedded: true });
  if (D) draw(); else $('#rp').innerHTML = '<p class="muted" style="padding:40px;text-align:center">Your first report is on its way.</p>';
  const panel = $('.pvpanel'); let t;
  panel.addEventListener('input', (e) => { if ($('#pverr')) $('#pverr').textContent = ''; const k = e.target.dataset.k; if (!k || k === 'role' || k === 'gvr_member') return; P[k] = k === 'phone' ? fullPhone(e.target.value) : e.target.value.trim(); touch(k); clearTimeout(t); t = setTimeout(() => D && draw(), 150); });
  panel.addEventListener('change', async (e) => { const k = e.target.dataset.k;
    if (k === 'role') { P.role = e.target.value; touch('role'); $('#pvlic').innerHTML = licFields('pv'); return D && draw(); }
    if (k === 'gvr_member') { P.gvr_member = e.target.checked; return touch('gvr_member'); }
    if (k === 'phone') e.target.value = localPhone(e.target.value);
    const im = e.target.dataset.img; if (!im || !e.target.files[0]) return;
    try { const v = await pickImage(im, e.target.files[0]); if (v) { P[im] = v; touch(im); thumbs(); D && draw(); } } catch (err) { alertMsg(err.message, true); } e.target.value = ''; });
  panel.addEventListener('click', async (e) => { const r = e.target.closest('[data-rm]'); if (r) { P[r.dataset.rm] = ''; touch(r.dataset.rm); thumbs(); D && draw(); return; }
    if (e.target.id === 'pvsee') { e.preventDefault(); return $('.pvframe').scrollIntoView({ behavior: 'smooth' }); }
    if (e.target.id !== 'pvgo') return;
    if (!P.name) { $('#pverr').textContent = 'Add your name so it shows on your report.'; return $('#pv-name').focus(); }
    if (!licOk(P.licence)) { $('#pverr').textContent = P.role === 'broker' ? 'Add your BCFSA licence number.' : 'Add your V number. It looks like V123456.'; return $('#pv-lic').focus(); }
    if (!P.gvr_member) { $('#pverr').textContent = 'Please tick the box to confirm your licence.'; return; }
    e.target.disabled = true; await saveNow(); sessionStorage.setItem('mup_previewed', '1'); showPlans(); });
  if (!P.name) $('#pv-name').focus();
}

/* ---------- dashboard ---------- */
let P = {}, D = null, MK = [], active = false, area = 'Greater Vancouver', tab = 'report', view = 'create', HIST = [], filter = 'all';
const DETAILS = [['name', 'Your name', 'text', 'Jane Smith'], ['brokerage', 'Brokerage', 'text', 'Your brokerage'], ['contact_email', 'Email for clients', 'email', 'you@email.com'], ['website', 'Website (optional)', 'text', 'Website (optional)']];
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
async function record(kind, a = kind === 'link' || kind === 'email' ? 'Greater Vancouver' : area) {
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
  const mail = itP.then((it) => emailDraft(D, agentOf(it), (it.kind === 'link' || it.kind === 'email') && it.area === 'Greater Vancouver' ? layoutOf(agentOf(it), D).areas[0] : it.area, linkOf(it)));
  const text = kind === 'email' ? mail.then((d) => `Subject: ${d.subject}\n\n${d.text}`) : itP.then((it) => (kind === 'link' ? linkOf(it) : caption(D, agentOf(it), it.area, linkOf(it))));
  copy(text, kind === 'email' ? mail.then((d) => d.html) : null).then(() => mail.then((d) => alertMsg(kind === 'email' ? `Email copied. Suggested subject: ${d.subject}` : kind === 'link' ? 'Link copied.' : 'Caption copied.')))
    .catch((e) => alertMsg(e.message === 'signed out' ? '' : 'Copying was blocked by the browser. Please try again.', true));
}
async function start() {
  if (!cfg.demo && !session) return showLogin();
  if (recovering) { recovering = false; return showNewPassword(); }
  try {
    let j = await api('/api/me');
    if (cfg.demo) { P = { plan: qs.get('plan') === 'basic' ? 'basic' : 'pro', slug: 'demo', ...JSON.parse(localStorage.getItem('mup_demo_profile') || '{}') }; if (qs.get('plan')) P.plan = qs.get('plan') === 'basic' ? 'basic' : 'pro'; D = j.report; MK = j.months || []; active = !qs.has('newuser'); $('#logout').hidden = false; }
    else {
      for (let i = 0; qs.has('welcome') && !j.active && i < 8; i++) { main.innerHTML = `<div class="c">${steps(3)}<p class="lead">Confirming your payment…</p></div>`; await new Promise((r) => setTimeout(r, 1500)); j = await api('/api/me'); }
      P = j.profile; D = j.report; MK = j.months || []; active = j.active; $('#logout').hidden = false;
    }
  } catch (e) { if (e.message !== 'signed out') main.innerHTML = `<div class="c"><p class="err">${esc(e.message)}</p></div>`; return; }
  if (!P.role && sessionStorage.getItem('mup_role')) { P.role = sessionStorage.getItem('mup_role') === 'broker' ? 'broker' : 'realtor'; dirty.add('role'); }
  if (!active) return sessionStorage.getItem('mup_previewed') && P.name ? showPlans() : showPreview();
  sessionStorage.removeItem('mup_want'); sessionStorage.removeItem('mup_went'); sessionStorage.removeItem('mup_previewed');
  await loadHistory(); show(qs.get('view') || 'create'); loadReqN();
  const igs = qs.get('ig'); if (igs) { alertMsg({ connected: 'Instagram connected.', cancelled: 'Instagram was not connected.', failed: 'We could not connect Instagram. Please try again.' }[igs] || '', igs !== 'connected'); history.replaceState(null, '', '/app?view=account'); }
}
$('#logout').onclick = () => { keep(null); location.href = '/'; };
const portal = async () => { try { location.href = (await api('/api/portal', {})).url; } catch (e) { alertMsg(e.message, true); } };
let toastT; const alertMsg = (t, bad) => { if (!t) return; let m = $('#toast'); if (!m) { m = document.createElement('div'); m.id = 'toast'; m.setAttribute('role', 'status'); document.body.appendChild(m); }
  m.textContent = t; m.className = bad ? 'bad on' : 'on'; clearTimeout(toastT); toastT = setTimeout(() => (m.className = bad ? 'bad' : ''), 3200); };

/* ---------- the three pages: Create, My reports, Account ---------- */
// The three tabs at the top of every page: Create report · Clients · Saved reports (Account is under the agent's photo).
let REQN = 0;
const tabsHtml = () => (isPro() ? [['create', 'Create report'], ['clients', `Clients${REQN ? ` <span class="rqn">${REQN}</span>` : ''}`], ['saved', 'Saved reports']] : [['create', 'Create report'], ['saved', 'Saved reports']])
  .map(([k, l]) => `<button type="button" role="tab" data-view="${k}" aria-selected="${view === k}">${l}</button>`).join('');
function drawNav() { const n = $('#subnav'); if (n) n.innerHTML = `<div class="sn" role="tablist">${tabsHtml()}${view === 'account' ? '<button type="button" role="tab" data-view="account" aria-selected="true">Account</button>' : ''}</div>`;
  const t = $('#dtabs'); if (t) t.innerHTML = tabsHtml(); }
// How many clients asked about their neighbourhood and are waiting (the red count on Clients).
async function loadReqN() { if (cfg.demo || !isPro()) return; try { REQN = ((await api('/api/links?only=requests')).requests || []).length; drawNav(); } catch {} }
function show(v) {
  if (v === 'history') v = 'saved';
  view = ['create', 'clients', 'saved', 'account'].includes(v) ? v : 'create'; if (view === 'clients' && !isPro()) view = 'create'; saveNow();
  try { history.replaceState(null, '', view === 'create' ? '/app' : `/app?view=${view}`); } catch {}
  main.innerHTML = `<div class="subnav" id="subnav"></div><div id="page" class="pg-${view}"></div>`; drawNav();
  $('#subnav').onclick = (e) => { const b = e.target.closest('[data-view]'); if (b && b.dataset.view !== view) show(b.dataset.view); };
  document.body.classList.toggle('oncreate', view === 'create');
  if (view === 'saved') drawSaved(); else if (view === 'clients') drawClients(); else if (view === 'account') drawAccount(); else dashboard();
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

/* ---------- Create: the report on the left, the sections panel on the right ---------- */
// The agent sees exactly what clients see. They select, drag, remove and add sections right on the report,
// switch sections on and off in the panel, and save it all as their template for every new month.
const firstArea = () => layoutOf(agent(), D).areas[0];
const layoutName = () => { const a = layoutOf(agent(), D).areas; return a.length === 1 ? a[0] : a.length === 2 ? a.join(' and ') : `${a.length} cities`; };
const shareText = (link) => { const n = layoutName(); return { url: link, subject: `${n} market update: ${D.month}`, short: `Here is the ${D.month} market update for ${n}: ${link}`, body: emailDraft(D, agent(), firstArea(), link).text }; };
const avatar = () => (P.photo ? `<img src="${esc(P.photo)}" alt="">` : `<span class="ini">${esc((P.name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase())}</span>`);
const SEC = Object.fromEntries(SECTIONS.map(([k, l, d]) => [k, { l, d }]));
// A small line icon for each section, like the icons in iPhone Settings.
const SIC = {
  numbers: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="16" rx="1.5"/><rect x="16" y="4" width="5" height="16" rx="1.5"/>',
  trend: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-6"/>',
  market: '<path d="M4 18a8 8 0 0 1 16 0"/><path d="m12 18 4-5"/><circle cx="12" cy="18" r="1.4"/>',
  types: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  hoods: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  growth: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  summary: '<path d="M8 6h13M8 12h13M8 18h9"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  sold: '<path d="M3 21h18"/><rect x="5" y="11" width="3" height="7"/><rect x="10.5" y="6" width="3" height="12"/><rect x="16" y="9" width="3" height="9"/>',
  compare: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 6h1v4M4 10h2M4 14h2l-2 4h2"/>',
  contact: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
};
const sic = (k) => `<span class="ipi" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SIC[k] || ''}</svg></span>`;
const TYPE_NAME = { detached: 'Detached', townhome: 'Townhouse', condo: 'Condo' };
const EYE = '<svg class="ico" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
// Panel state: m 'list' or 'details'; k = the picked section; open = its settings are showing under its row (after tapping its gear).
const GEAR = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>', BIN2 = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
let PS = { m: 'list', k: null }, ZOOM = 0.85, IGS = null;
const cur = () => layoutOf(agent(), D);
const snap = (L) => ({ sections: L.sections, known: SEC_IDS, areas: L.areas, agentTop: L.agentTop, clientAreas: L.clientAreas, view: L.view, conf: L.conf, months: L.months, clients: L.clients });
const mode = () => (P.show?.mode === 'template' && P.show?.template ? 'template' : 'default');
// Every layout change goes through here. On "My template", the template follows along.
function setLayout(patch, redraw = true) {
  const L = { ...cur(), ...patch }, sh = { ...showOf(P), ...snap(L) };
  if (sh.mode === 'template') sh.template = snap(L);
  P.show = sh; touch('show'); drawTop(); if (redraw) preview(); drawPanel();
}
const setConf = (k, patch) => { const c = { ...cur().conf }, x = { ...(c[k] || {}), ...patch }; Object.keys(x).forEach((f) => x[f] === undefined && delete x[f]); c[k] = x; setLayout({ conf: c }); };

function dashboard() {
  const pg = $('#page');
  if (!D) { pg.innerHTML = `<div class="c">${steps(4)}<h2>Your first report is on its way</h2><p class="lead">We will email you as soon as this month's report is published.</p></div>`; return; }
  $('#subnav').hidden = true; PS = { m: P.name ? 'list' : 'details', k: null };
  const notes = [cfg.demo ? 'Preview mode: nothing is saved to a server and no payment is taken.' : '', noticeOk, qs.has('welcome') ? `You are subscribed${P.name ? ', ' + P.name.trim().split(/\s+/)[0] : ''}. Welcome aboard.` : ''].filter(Boolean);
  pg.innerHTML = `<div class="dbar"><div class="crumb"><nav class="dtabs" id="dtabs" role="tablist"></nav><span class="ok small" id="saved"></span></div>
    <div class="dact"><span id="laysel"></span>${isPro() ? '<button type="button" class="btn sm ghost" id="savebtn" title="Save this report in Saved reports">Save</button>' : ''}<span class="shwrap"><button type="button" class="btn sm ghost" id="sharebtn">${sv('share')}Share</button></span><button type="button" class="btn sm" id="pvbtn">${EYE}Preview</button>
    <span class="mewrap"><button type="button" class="me" id="mebtn" aria-haspopup="menu"><span class="av">${avatar()}</span><span class="who"><b>${esc(P.name || 'Add your name')}</b><small>${esc(P.brokerage || '')}</small></span><span class="car">⌄</span></button></span></div></div>
    <div class="dwrap"><div class="dleft" id="dleft">${notes.map((n) => `<p class="dnote">${esc(n)}</p>`).join('')}${!cfg.demo && P.email_verified === false ? `<p class="dnote warn">Please confirm your email. We sent a link to <b>${esc(P.email || '')}</b>. <a href="#" id="cfmagain">Send it again</a></p>` : ''}
      <div id="rp"></div><div class="zoomc" role="group" aria-label="Zoom"><button type="button" data-z="-" aria-label="Zoom out">−</button><span id="zv">85%</span><button type="button" data-z="+" aria-label="Zoom in">+</button><button type="button" data-z="fit" title="Back to 85%" aria-label="Reset zoom">⤢</button></div></div>
    <aside class="dpanel" id="dpanel"></aside></div>`;
  noticeOk = ''; drawNav(); drawTop(); preview(); setZoom(ZOOM); wirePanel(); drawPanel(); wireZoom();
  pg.onclick = (e) => { const g = e.target.closest('[data-go]'); if (g) return show(g.dataset.go);
    if (e.target.id === 'cfmagain') { e.preventDefault(); return sendConfirm(P.email).then((ok) => alertMsg(ok ? 'Sent. Check your inbox.' : 'Please wait a minute and try again.', !ok)); }
    const z = e.target.closest('[data-z]'); if (z) return setZoom(z.dataset.z === 'fit' ? 0.85 : ZOOM + (z.dataset.z === '+' ? 0.1 : -0.1));
    if (e.target.closest('#pvbtn')) { if (!ready()) return; saveNow(); return act('link', record('link'), 'open'); }
    if (e.target.closest('[data-view]')) { const v = e.target.closest('[data-view]').dataset.view; if (v !== view) show(v); return; }
    if (e.target.closest('#savebtn')) return saveReport();
    if (e.target.closest('#sharebtn')) return shareDrop(e.target.closest('#sharebtn'));
    if (e.target.closest('#mebtn')) return meMenu(e.target.closest('#mebtn')); };
  pg.onchange = (e) => { if (e.target.id !== 'layout') return; const t = P.show?.template;
    if (e.target.value === 'template' && t) P.show = { ...showOf(P), ...t, mode: 'template' };
    else P.show = { ...showOf(P), ...snap({ ...DEFAULT_LAYOUT, areas: cur().areas }), mode: 'default' };
    touch('show'); PS = { m: 'list' }; drawTop(); preview(); drawPanel(); };
  if (dirty.size) touch([...dirty][0]);
}
// Zoom only changes how big the report looks here. Pinch on a trackpad, or use − and +.
function setZoom(z) { ZOOM = Math.round(Math.min(1.5, Math.max(0.5, z)) * 100) / 100; const rp = $('#rp'); if (rp) rp.style.zoom = ZOOM; if ($('#zv')) $('#zv').textContent = Math.round(ZOOM * 100) + '%'; }
function wireZoom() {
  const el = $('#dleft'); if (!el) return; let base = ZOOM;
  el.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(ZOOM * Math.exp(-Math.max(-50, Math.min(50, e.deltaY)) * 0.006)); }, { passive: false });
  el.addEventListener('gesturestart', (e) => { e.preventDefault(); base = ZOOM; });
  el.addEventListener('gesturechange', (e) => { e.preventDefault(); setZoom(base * e.scale); });
  try { if (!sessionStorage.getItem('mup_zoomtip')) { sessionStorage.setItem('mup_zoomtip', '1'); const t = document.createElement('div'); t.className = 'ztip'; t.textContent = 'Pinch on your trackpad to zoom in or out. It only changes how it looks here.'; el.appendChild(t); setTimeout(() => t.remove(), 5000); } } catch {}
}
// Top bar: the layout picker shows only once there are two layouts to choose from.
function drawTop() {
  const ls = $('#laysel'); if (!ls) return; const w = $('.dbar .who b'); if (w) w.textContent = P.name || 'Add your name'; const a = $('.dbar .me .av'); if (a) a.innerHTML = avatar();
  const t = isPro() && P.show?.template, m = mode();
  ls.innerHTML = t ? `<label class="lay">Layout: <select id="layout" aria-label="Layout"><option value="default"${m === 'default' ? ' selected' : ''}>Default</option><option value="template"${m === 'template' ? ' selected' : ''}>My template</option></select></label>` : '';
}
function drawSend() { drawTop(); }
const ready = () => { if (P.name && P.slug) return true; alertMsg('Add your name first.', true); PS = { m: 'details' }; drawPanel(); return false; };
function preview() {
  const rp = $('#rp'); if (!rp) return;
  mountReport(rp, D, agent(), { embedded: true, ...(isPro() ? { edit: (patch) => setLayout(patch, false), selected: PS.k,
    // Clicking a section on the report opens its settings in the panel.
    onSelect: (k) => { PS = { m: 'list', k: k || null, open: !!k && PS.open && PS.k === k }; drawPanel(); if (k) panelTo(k); },
    onAdd: showAddable, onRemove: (k) => removeSec(k) } : {}) });
  rp.style.zoom = ZOOM;
}
let pvT; const later = () => { clearTimeout(pvT); pvT = setTimeout(() => { preview(); drawTop(); }, 160); };
const thumbs = () => { for (const k of ['photo', 'logo']) { if (!$('#lb-' + k)) continue; $('#lb-' + k).textContent = P[k] ? 'Change' : 'Add';
  $('#ph-' + k).innerHTML = P[k] ? `<img${k === 'photo' ? ' class="round"' : ''} src="${P[k]}" alt="">` : '<span class="ph">+</span>'; $(`[data-rm="${k}"]`).hidden = !P[k]; } };
function selectSec(k, scroll) { PS.k = k; $('#rp')?._select?.(k); $('#dpanel').querySelectorAll('[data-li]').forEach((x) => x.classList.toggle('sel', x.dataset.li === k)); if (scroll) toSec(k); }
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Scroll the report so the section's top sits just under the top bar, with a soft blue glow.
function toSec(k, glow = true) { const el = $(`#rp .sx[data-k="${k}"]`); if (!el) return; el.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' }); if (glow) pulse(el); }
const pulse = (el) => { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); setTimeout(() => el.classList.remove('pulse'), 1500); };
// Scroll the panel (not the page) so a row is fully in view.
function panelTo(k, sel) { const pb = $('#dpanel .pbody'), li = sel ? $(sel) : $(`#dpanel [data-li="${k}"]`); if (!pb || !li) return;
  const a = pb.getBoundingClientRect(), r = li.getBoundingClientRect(); if (r.top < a.top + 8 || r.bottom > a.bottom - 8) pb.scrollBy({ top: r.top - a.top - 12, behavior: calm() ? 'auto' : 'smooth' }); }
// Redraw the report without the page jumping: the section on screen stays exactly where it was.
function holdPlace(fn, skip) {
  const rp = $('#rp'), box = $('#dleft'); if (!rp || !box) return fn();
  const anchor = [...rp.querySelectorAll('.sx')].find((x) => x.dataset.k !== skip && x.getBoundingClientRect().bottom > 90), key = anchor?.dataset.k, y0 = anchor?.getBoundingClientRect().top;
  box.style.minHeight = box.getBoundingClientRect().height + 'px'; fn();
  const a2 = key && rp.querySelector(`.sx[data-k="${key}"]`); if (a2) scrollBy(0, a2.getBoundingClientRect().top - y0);
  requestAnimationFrame(() => { box.style.minHeight = ''; });
}
// Removing: the section slides out to the right and fades, the space closes up, then it is gone. An Undo shows for a few seconds.
let BUSY = false;
const goneMs = () => (calm() ? 0 : 1);
function slideOut(el, ms) {
  if (!goneMs()) return Promise.resolve();
  el.style.overflow = 'hidden';
  return el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(56px) scale(.98)' }], { duration: ms, easing: 'ease-in', fill: 'forwards' }).finished
    .then(() => { const h = el.offsetHeight; return el.animate([{ height: h + 'px' }, { height: '0px', marginTop: '0px', marginBottom: '0px' }], { duration: Math.round(ms * 0.8), easing: 'ease-in-out', fill: 'forwards' }).finished; });
}
const reveal = (el) => new Promise((ok) => { if (!el || !goneMs()) return ok(); const r = el.getBoundingClientRect();
  if (r.top < innerHeight - 120 && r.bottom > 140) return ok();
  el.scrollIntoView({ behavior: 'smooth', block: r.height > innerHeight * 0.7 ? 'start' : 'center' }); let t; const done = () => { clearTimeout(t); removeEventListener('scrollend', done); setTimeout(ok, 120); };
  addEventListener('scrollend', done); t = setTimeout(done, 900); });
function removeSec(k) {
  const L = cur(); if (BUSY || !L.sections.includes(k)) return;
  if (L.sections.length < 2) return alertMsg('Your report needs at least one section.', true);
  BUSY = true; const before = [...L.sections], nm = L.conf[k]?.title || SEC[k].l, sx = $(`#rp .sx[data-k="${k}"]`), li = $(`#dpanel [data-li="${k}"]`);
  // In a pair (two sections side by side) only fade it; the other one stays put until the redraw.
  const inPair = !!sx?.parentElement?.classList.contains('pair');
  // If the section is off screen, glide to it first so the agent sees it go.
  reveal(sx).then(() => Promise.all([li && slideOut(li, 260), sx && (inPair ? sx.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(40px)' }], { duration: goneMs() * 360, easing: 'ease-in', fill: 'forwards' }).finished : slideOut(sx, 380))])
    ).catch(() => {}).then(() => {
      holdPlace(() => { if (PS.k === k) PS = { m: 'list', k: null }; setLayout({ sections: before.filter((x) => x !== k) }); }, k);
      BUSY = false; undoToast(`<b>${esc(nm)}</b> was taken off your report`, () => { holdPlace(() => setLayout({ sections: before })); slideIn(k); });
    });
}
// Adding: the report scrolls to the new section, which slides in from the left with a blue glow.
function slideIn(k) {
  const el = $(`#rp .sx[data-k="${k}"]`), li = $(`#dpanel [data-li="${k}"]`); if (!el) return;
  panelTo(k); if (li && goneMs()) li.animate([{ opacity: 0, transform: 'translateX(-28px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'ease-out' });
  if (!goneMs()) { toSec(k); return; }
  el.style.opacity = '0'; toSec(k, false);
  let played = false; const play = () => { if (played) return; played = true; io.disconnect(); el.style.opacity = '';
    el.animate([{ opacity: 0, transform: 'translateX(-56px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' }); pulse(el); };
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) setTimeout(play, 120); }, { threshold: 0.2 }); io.observe(el); setTimeout(play, 1400);
}
function addSec(k) {
  const L = cur(); if (BUSY || L.sections.includes(k)) return;
  holdPlace(() => { PS = { m: 'list', k }; setLayout({ sections: [...L.sections, k] }); });
  document.querySelector('.bdtoast')?.remove(); slideIn(k); alertMsg('Added to the end of your report. Drag its tag to move it.');
}
// "+ Add a section" on the report: show the sections that can be added, in the panel.
function showAddable() { PS = { m: 'list', k: PS.k }; drawPanel(); const g = $('#canadd');
  if (!g) return alertMsg('Every section is already on your report.'); panelTo(null, '#canadd'); document.querySelectorAll('#canadd + .ipg .ipr').forEach((x) => pulse(x)); }
function undoToast(msg, undo) { document.querySelector('.bdtoast')?.remove(); const t = document.createElement('div'); t.className = 'bdtoast'; t.setAttribute('role', 'status');
  t.innerHTML = `<span>${msg}</span><button type="button">Undo</button>`; document.body.appendChild(t);
  t.querySelector('button').onclick = () => { t.remove(); undo(); }; clearTimeout(undoToast.t); undoToast.t = setTimeout(() => t.remove(), 5000); }

/* ---------- the right panel ---------- */
const tgl = (attr, l, on) => `<label class="tgr"><span>${l}</span><input type="checkbox" ${attr}${on ? ' checked' : ''}><span class="sw2" aria-hidden="true"></span></label>`;
// Neighbourhoods: everything starts on a sensible choice, so agents don't have to touch it.
// Neighbourhoods settings, kept short: what clients see (a switch for each part), what it opens on, and personal links.
// "Neighbourhood shown first" and "Compare with" were taken out of the panel (Oct 2026); saved values still work.
function hoodsPanel(c, L) {
  // "Every neighbourhood" is always on, so the section is never empty. "Compare two" needs the client's own
  // neighbourhood, so it is greyed out while "Their neighbourhood" is off.
  const city = c.city && D.hoods?.[c.city] ? c.city : defaultCity(D, c, L.areas), off = c.off || [], own = c.take === 'own';
  const takeOn = !off.includes('take') && c.take !== 'off';
  const g = (label, body, foot) => `<div class="ipl">${label}</div><div class="ipg">${body}</div>${foot ? `<p class="ipf">${foot}</p>` : ''}`;
  // A row that shows its value and opens a plain dropdown when tapped.
  const pick = (attr, l, opts, cur) => `<label class="ipr ippick"><span class="ipn">${l}</span><span class="ipv">${esc((opts.find(([v]) => v === cur) || opts[0])[1])}</span><span class="ipchev" aria-hidden="true">›</span>
    <select class="ipsel" ${attr} aria-label="${l}">${opts.map(([v, x]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`;
  return g('What your clients see', `${iptg2('data-hb="hero"', 'hood', 'Their neighbourhood', 'Its price and how it changed', !off.includes('hero'))}
      ${iptg2('data-hb="tiles"', 'list', 'Every neighbourhood', 'Always shown. To hide the section, use the bin', true, true).replace('ipoff', 'ipoff ipkeep')}
      ${off.includes('hero') ? iptg2('data-hb="compare"', 'two', 'Compare two', 'Needs "Their neighbourhood" on', false, true) : iptg2('data-hb="compare"', 'two', 'Compare two', 'Their area next to another', !off.includes('compare'))}
      ${iptg2('data-htake', 'me', 'Your take', 'A short note with your photo', takeOn)}
      ${takeOn ? `<div class="ipad"><div class="seg2"><button type="button" data-htw="auto" aria-pressed="${!own}">Written for me</button><button type="button" data-htw="own" aria-pressed="${own}">In my own words</button></div>
        ${own ? `<textarea class="inp2" data-htext rows="4" maxlength="600" placeholder="A few lines for your clients about this month" style="margin-top:10px">${esc(c.text || '')}</textarea>` : ''}</div>` : ''}`)
    + g('It opens on', pick('data-hc="city"', 'City', hoodCities(D).map((x) => [x, x]), city) + pick('data-hc="type"', 'Home type', HTYPES.map(([t, l]) => [t, l]), c.type || 'd'), 'Clients can always pick another.')
    + g('Your clients', `<button type="button" class="ipr ip2" data-plinks><span class="ipn"><b>Personal links</b><small>One link per client, on their neighbourhood</small></span><span class="ipchev" aria-hidden="true">›</span></button>`);
}
// One section's settings page (the second tap), laid out like an iPhone settings page.
// A section's settings, shown right under its row after its gear is tapped.
function secSettings(k, L) {
  const c = L.conf[k] || {}, i = L.sections.indexOf(k), titled = !['numbers', 'contact'].includes(k), g = (label, body, foot) => `${label ? `<div class="ipl">${label}</div>` : ''}<div class="ipg">${body}</div>${foot ? `<p class="ipf">${foot}</p>` : ''}`;
  let what = '';
  if (k === 'hoods') what = hoodsPanel(c, L);
  else if (!USES_AREAS.includes(k)) what = `<p class="ipf ipf0">${k === 'compare' ? 'This section always shows every area, ranked by benchmark price.' : 'Your photo, your details and a message box for clients. Change your details from the menu under your photo.'}</p>`;
  else { const own = !!c.areas, ar = c.areas || L.areas, free = areasOf(D).filter((a) => !ar.includes(a));
    what = g('Areas', `<div class="ipad"><div class="seg2"><button type="button" data-own="0" aria-pressed="${!own}">Same as the report</button><button type="button" data-own="1" aria-pressed="${own}">Choose</button></div>
      ${own ? `<div class="chips2">${ar.map((a) => `<span class="chip2">${esc(a)}${ar.length > 1 ? `<button type="button" data-arm="${esc(a)}" aria-label="Remove ${esc(a)}">✕</button>` : ''}</span>`).join('')}</div>
        ${ar.length < MAX_AREAS ? `<label class="addl">+ Add a city (up to ${MAX_AREAS})<select data-aadd><option value="">Add a city</option>${free.map((a) => `<option>${esc(a)}</option>`).join('')}</select></label>` : ''}` : ''}</div>`, own ? '' : `Now: ${L.areas.map(esc).join(' and ')}`)
      + (USES_TYPES.includes(k) ? g('Home types', TYPE_KEYS.map((t) => { const on = !c.types || c.types.includes(t); return `<button type="button" class="ipr" data-ty="${t}" aria-pressed="${on}"><span class="ipn">${TYPE_NAME[t]}</span>${on ? '<span class="ipck" aria-hidden="true">✓</span>' : ''}</button>`; }).join('')) : ''); }
  const look = titled ? g('Title', `<label class="ipr"><input class="ipin" data-title value="${esc(c.title || '')}" placeholder="${esc(SEC[k].l)}" aria-label="Title"></label>${iptg('data-cf="sub"', 'Line under the title', c.sub !== false)}${k === 'market' ? iptg('data-cf="note"', 'One-line explanation', c.note !== false) : ''}${k === 'trend' ? iptg('data-cf="events"', 'What was happening (COVID-19, new taxes)', c.events !== false) : ''}`) : '';
  const size = PAIRABLE.includes(k) ? g('Size', `<div class="ipad"><div class="seg2"><button type="button" data-sz="half" aria-pressed="${sizeOf(k, c) === 'half'}">Half width</button><button type="button" data-sz="full" aria-pressed="${sizeOf(k, c) === 'full'}">Full width</button></div></div>`, 'Half width sits next to another half-width section.') : '';
  return `<div class="ipx">${what}${look}${size}${g('', `<button type="button" class="ipr ipb" data-mv="-1"${i ? '' : ' disabled'}>Move up</button><button type="button" class="ipr ipb" data-mv="1"${i < L.sections.length - 1 ? '' : ' disabled'}>Move down</button>`)}
    <p class="ipf ipf0">Updates by itself every month.</p><button type="button" class="ipdone" data-done>Done</button></div>`;
}
// An iPhone-style switch row.
const iptg = (attr, l, on) => `<label class="ipr"><span class="ipn">${l}</span><input type="checkbox" ${attr}${on ? ' checked' : ''}><span class="sw2" aria-hidden="true"></span></label>`;
let LASTM = 'list';
// D10 Month settings: clients may look at past months, how far back, and links that open on one month.
const MONTHL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const mLong = (k) => `${MONTHL[+k.slice(5) - 1]} ${k.slice(0, 4)}`;
// D11 What clients can do. "City" (Coquitlam, Burnaby North) and "neighbourhood" (Westwood Plateau) are never called "areas".
const DI = {
  city: '<path d="M3 21h18"/><path d="M5 21V8l6-3v16"/><path d="M11 21V3l8 4v14"/><path d="M8 11h.01M8 15h.01M15 10h.01M15 14h.01"/>',
  hood: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  ask: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  list: '<path d="M4 6h10M4 12h14M4 18h7"/>',
  two: '<path d="M7 4v16M17 4v16M3 9h8M13 15h8"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
};
const dic = (k) => `<span class="ipi" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${DI[k]}</svg></span>`;
// A switch row with an icon, a name and one short grey line.
const iptg2 = (attr, ic, l, sub, on, off) => `<label class="ipr ip2${off ? ' ipoff' : ''}">${dic(ic)}<span class="ipn"><b>${l}</b><small>${sub}</small></span><input type="checkbox" ${attr}${on ? ' checked' : ''}${off ? ' disabled' : ''}><span class="sw2" aria-hidden="true"></span></label>`;
function clientsPanel(L) {
  const C = L.clients, hoods = !!D.hoods && Object.keys(D.hoods).length > 0;
  return `<div class="ipl">What clients can do</div><div class="ipg">
    ${iptg2('data-lt="clientAreas"', 'city', 'Add other cities', 'For example Burnaby next to Coquitlam', L.clientAreas)}
    ${hoods ? iptg2('data-cl="pick"', 'hood', 'Pick their neighbourhood', 'For example Westwood Plateau in Coquitlam', C.pick) : ''}
    ${hoods ? iptg2('data-cl="ask"', 'ask', 'Ask you about their neighbourhood', C.pick ? "Shows a button when they can't pick one" : 'A button in place of Neighbourhoods', C.ask, C.pick) : ''}
    ${iptg2('data-mt="on"', 'cal', 'Look at past months', 'Up to 3 years back', L.months.on)}</div>
    ${hoods && !C.pick && C.ask ? `<div class="ipl">When a client asks</div><div class="ipg"><div class="ipad"><div class="seg2"><button type="button" data-reply="show" aria-pressed="${C.reply === 'show'}">Show it right away</button><button type="button" data-reply="tell" aria-pressed="${C.reply === 'tell'}">Just tell me</button></div></div></div>
    <p class="ipf">${C.reply === 'show' ? "Their neighbourhood's numbers open for them at once, and you're told." : "You're told, and you reply yourself."} People you don't know (your Instagram or website link) leave an email or phone either way.</p>` : ''}
    ${L.areas.length > 1 ? `<div class="ipl">Report opens on</div><div class="ipg"><div class="ipad"><div class="seg2"><button type="button" data-vw="side" aria-pressed="${L.view === 'side'}">All cities together</button><button type="button" data-vw="one" aria-pressed="${L.view === 'one'}">The first city</button></div></div></div>` : ''}`;
}
function drawPanel() {
  const el = $('#dpanel'); if (!el) return; const L = cur(), pro = isPro(), keep = el.querySelector('.pbody')?.scrollTop || 0;
  $('#rp')?._select?.(PS.m === 'list' ? PS.k : null); $('#rp')?._adding?.(false);
  const head = (t, back) => `<div class="ph">${back ? `<button type="button" class="back" data-p="list">‹ ${t}</button>` : `<h3>${t}</h3>`}${back ? '<button type="button" class="x" data-p="list" aria-label="Close">✕</button>' : ''}</div>`;
  let body = '', foot = '';
  if (PS.m === 'details') {
    body = `${head('Your details', !!P.name)}${P.name ? '' : '<p class="hint">Add your name, photo and contact details. They show on your report.</p>'}
      <div class="fl2">${DETAILS.map(([k, l, t, ph]) => `<label>${l}<input type="${t}" data-k="${k}" value="${esc(P[k] || '')}" placeholder="${ph}"></label>`).join('')}
      <label>Phone<div class="phonef"><span>+1</span><input type="tel" data-k="phone" value="${esc(localPhone(P.phone))}" placeholder="604-555-0100"></div></label>
      <label>I am a<select data-k="role"><option value="realtor"${P.role !== 'broker' ? ' selected' : ''}>REALTOR®</option><option value="broker"${P.role === 'broker' ? ' selected' : ''}>Mortgage broker</option></select></label></div>
      <div class="two">${['photo', 'logo'].map((k) => `<div class="upw"><label class="up"><span id="ph-${k}"></span><span>Your ${k}<br><b id="lb-${k}"></b></span><input type="file" accept="image/*" data-img="${k}"></label><button type="button" class="rm" data-rm="${k}" aria-label="Remove your ${k}" title="Remove" hidden>✕</button></div>`).join('')}</div>
      ${isPro() ? tgl('data-lt="agentTop"', 'Show my name and photo at the top of the report', cur().agentTop) : ''}
      <button type="button" class="btn wide" data-p="list">Done</button>`;
  } else if (!pro) {
    body = `${head('Sections')}<div class="lockbox"><span>With Pro you choose your areas and sections, move them around, and save your own template.</span><button type="button" class="btn sm" id="up4">Upgrade to Pro</button></div>`;
  } else {
    if (!L.sections.includes(PS.k)) PS = { m: 'list', k: null, open: false };
    const off = SECTIONS.filter(([k]) => !L.sections.includes(k) && (k !== 'growth' || D.growth));
    // Tap a row: it is picked and the report scrolls to it. Only the picked row shows its gear (settings) and bin (take it off).
    const row = (k) => { const nm = esc(L.conf[k]?.title || SEC[k].l), sel = PS.k === k, open = sel && PS.open;
      return `<div class="ipr ipsec${sel ? ' sel' : ''}${open ? ' open' : ''}" draggable="true" data-sk="${k}" data-li="${k}" role="button" tabindex="0" title="Tap to find it on your report. Drag to move it.">${sic(k)}<span class="ipn">${nm}</span>
        <button type="button" class="ipgear" data-gear="${k}" aria-pressed="${open}" aria-label="Settings for ${nm}" title="Settings">${GEAR}</button>${sel ? `<button type="button" class="ipbin" data-bin2="${k}"${L.sections.length > 1 ? '' : ' disabled'} aria-label="Take ${nm} off your report" title="Take it off your report">${BIN2}</button>` : ''}</div>${open ? secSettings(k, L) : ''}`; };
    body = `<h2 class="iph">Sections</h2><p class="ipsub">Tap a section to find it on your report. Tap ⚙ for its settings.</p>
      <div class="ipl">On your report</div><div class="ipg">${L.sections.map(row).join('')}</div>
      ${off.length ? `<div class="ipl" id="canadd">More sections</div><div class="ipg">${off.map(([k, l]) => `<div class="ipr" data-li="${k}">${sic(k)}<span class="ipn">${esc(l)}</span><button type="button" class="ipadd" data-addk="${k}">+ Add</button></div>`).join('')}</div>` : ''}
      ${clientsPanel(L)}`;
  }
  if (pro && PS.m !== 'details') { const m = mode(), isDef = sameLayout(L, { ...DEFAULT_LAYOUT, areas: L.areas });
    foot = m === 'template' ? `<span class="st"><i class="ok"></i>Using your template. Changes save to it.</span>${isDef ? '' : '<button type="button" class="linkbtn" id="ltreset">Back to the default layout</button>'}`
      : `<span class="st"><i></i>${isDef ? 'Using the default layout' : 'You changed the default layout'}</span><button type="button" class="btn wide" id="savetpl">Save as my template</button><span class="small muted center">Every new month opens with your template.</span>${isDef ? '' : '<button type="button" class="linkbtn" id="ltreset">Back to the default layout</button>'}`; }
  el.innerHTML = `<div class="pbody${pro && PS.m !== 'details' ? ' ip' : ''}">${body}</div>${foot ? `<div class="pfoot">${foot}</div>` : ''}`;
  // Redrawing keeps the panel where it was scrolled to.
  const pb = el.querySelector('.pbody'); if (pb) pb.scrollTop = PS.m === LASTM ? keep : 0; LASTM = PS.m;
  if (PS.m === 'details') thumbs();
}
// Tap a row: pick the section and scroll the report to it.
function tapRow(k) { if (PS.k !== k) { PS = { m: 'list', k, open: false }; drawPanel(); } selectSec(k, true); }
// The gear opens (or closes) the settings under that row.
function gear(k) { const open = !(PS.k === k && PS.open); PS = { m: 'list', k, open }; drawPanel(); selectSec(k, true); if (open) requestAnimationFrame(() => { const pb = $('#dpanel .pbody'), r = $(`#dpanel [data-li="${k}"]`); if (pb && r) pb.scrollBy({ top: r.getBoundingClientRect().top - pb.getBoundingClientRect().top - 12, behavior: calm() ? 'auto' : 'smooth' }); }); }
// One set of listeners for the panel, whatever it is showing.
function wirePanel() {
  const el = $('#dpanel'); if (!el || el._w) return; el._w = 1;
  el.addEventListener('click', (e) => { const t = e.target;
    if (t.closest('.swl') || (t.closest('label.ipr') && !t.closest('button'))) return; // switches are handled on change
    const b = t.closest('button');
    if (!b) { const h = t.closest('.ipsec[data-sk]'); if (h && !t.closest('label')) tapRow(h.dataset.sk); return; }
    if (b.disabled) return; const d = b.dataset, L = cur(), k = PS.k;
    if (d.p) { PS = { m: d.p, k: PS.k }; drawPanel(); if (d.p === 'list' && PS.k) panelTo(PS.k); return; }
    if (d.gear) return gear(d.gear);
    if (d.htw) return setConf('hoods', { take: d.htw === 'own' ? 'own' : undefined });
    if (d.bin2) return removeSec(d.bin2);
    if ('done' in d) { PS.open = false; drawPanel(); return panelTo(PS.k); }
    if (d.addk) return addSec(d.addk);
    if (d.sz) return setConf(k, { size: d.sz === sizeOf(k) ? undefined : d.sz });
    if (d.reply) return setLayout({ clients: { ...L.clients, reply: d.reply } }, false);
    if (d.own) return setConf(k, { areas: d.own === '1' ? [...L.areas] : undefined });
    if (d.arm) return setConf(k, { areas: (L.conf[k]?.areas || L.areas).filter((a) => a !== d.arm) });
    if (d.ty) { const on = L.conf[k]?.types || [...TYPE_KEYS], next = on.includes(d.ty) ? on.filter((x) => x !== d.ty) : [...on, d.ty];
      if (!next.length) return alertMsg('Keep at least one home type.', true); return setConf(k, { types: next.length === 3 ? undefined : TYPE_KEYS.filter((x) => next.includes(x)) }); }
    if (d.mv) { const s2 = [...L.sections], i = s2.indexOf(k), j = i + +d.mv; [s2[i], s2[j]] = [s2[j], s2[i]]; setLayout({ sections: s2 }); requestAnimationFrame(() => panelTo(k)); return setTimeout(() => selectSec(k, true), 60); }
    if ('hide' in d) return removeSec(k);
    if (d.vw) return setLayout({ view: d.vw });
    if (b.id === 'ltreset') { if (!confirm('Go back to the default sections and order?')) return; return setLayout({ ...DEFAULT_LAYOUT, areas: L.areas }); }
    if (b.id === 'savetpl') { P.show = { ...showOf(P), ...snap(cur()), mode: 'template', template: snap(cur()) }; touch('show'); drawTop(); drawPanel(); return alertMsg('Saved as your template. Every new month opens this way.'); }
    if ('plinks' in d) return show('clients');
    if (b.id === 'up4') return portal();
    if (d.rm) { P[d.rm] = ''; touch(d.rm); thumbs(); later(); return alertMsg(`Your ${d.rm} was removed.`); } });
  el.addEventListener('change', async (e) => { const t = e.target, k = PS.k, L = cur();
    if (t.dataset.on) { const s = t.dataset.on; if (t.checked) return addSec(s); if (L.sections.length < 2) { t.checked = true; return; } return removeSec(s); }
    if (t.dataset.hc) { const f = t.dataset.hc, v = t.value || undefined;
      if (f === 'city') return setConf('hoods', { city: v, home: undefined, cmp: undefined });
      if (f === 'take') return setConf('hoods', { take: v === 'auto' ? undefined : v });
      return setConf('hoods', { [f]: f === 'type' && v === 'd' ? undefined : v }); }
    // "Your take" on or off: one switch for what used to be a block switch and a "Don't show it" choice.
    if ('htake' in t.dataset) { const off = (L.conf.hoods?.off || []).filter((x) => x !== 'take'); return setConf('hoods', { off: off.length ? off : undefined, take: t.checked ? (L.conf.hoods?.take === 'own' ? 'own' : undefined) : 'off' }); }
    if (t.dataset.hb) { const off = (L.conf.hoods?.off || []).filter((x) => x !== t.dataset.hb); if (!t.checked) off.push(t.dataset.hb); return setConf('hoods', { off: off.length ? off : undefined }); }
    if (t.matches('[data-aadd]') && t.value) return setConf(k, { areas: [...(L.conf[k]?.areas || L.areas), t.value] });
    if (t.dataset.cf) return setConf(k, { [t.dataset.cf]: t.checked ? undefined : false });
    if (t.dataset.lt) return setLayout({ [t.dataset.lt]: t.checked });
    if (t.dataset.mt) return setLayout({ months: { ...L.months, [t.dataset.mt]: t.checked } }, false);
    if (t.dataset.cl) return setLayout({ clients: { ...L.clients, [t.dataset.cl]: t.checked } });
    if (t.dataset.k === 'role') { P.role = t.value; touch('role'); return later(); }
    if (t.dataset.k === 'phone') t.value = localPhone(t.value);
    const im = t.dataset.img; if (!im || !t.files[0]) return;
    try { const v = await pickImage(im, t.files[0]); if (v) { P[im] = v; touch(im); thumbs(); later(); } } catch (err) { alertMsg(err.message, true); } t.value = ''; });
  el.addEventListener('keydown', (e) => { const h = e.target.closest?.('.ipsec[data-sk]'); if (h && e.target === h && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tapRow(h.dataset.sk); } });
  let tT; el.addEventListener('input', (e) => { const t = e.target;
    if (t.matches('[data-htext]')) { clearTimeout(tT); tT = setTimeout(() => setConf('hoods', { text: t.value.trim() || undefined }), 450); return; }
    if (t.matches('[data-title]')) { clearTimeout(tT); tT = setTimeout(() => setConf(PS.k, { title: t.value.trim() || undefined }), 350); return; }
    const k = t.dataset.k; if (!k || k === 'role') return; let v = t.value.trim();
    if (k === 'website' && v && !/^https?:\/\//.test(v)) v = 'https://' + v; if (k === 'phone') v = fullPhone(v); P[k] = v; touch(k); later(); });
  // Drag to reorder the list.
  let drag = null;
  el.addEventListener('dragstart', (e) => { const li = e.target.closest('[data-sk]'); if (!li) return; drag = li.dataset.sk; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', drag); } catch {} });
  el.addEventListener('dragover', (e) => { const li = e.target.closest('[data-sk]'); if (!li || !drag) return; e.preventDefault(); el.querySelectorAll('[data-sk]').forEach((x) => x.classList.toggle('over', x === li && x.dataset.sk !== drag)); });
  el.addEventListener('dragend', () => { drag = null; el.querySelectorAll('[data-sk]').forEach((x) => x.classList.remove('dragging', 'over')); });
  el.addEventListener('drop', (e) => { const li = e.target.closest('[data-sk]'); if (!li || !drag) return; e.preventDefault(); const all = cur().sections, s2 = all.filter((x) => x !== drag), at = s2.indexOf(li.dataset.sk);
    s2.splice(all.indexOf(drag) < all.indexOf(li.dataset.sk) ? at + 1 : at, 0, drag); const k = drag; drag = null; setLayout({ sections: s2 }); setTimeout(() => selectSec(k, true), 60); });
}

/* Keep a top-bar menu fully on screen. On a phone it spans the screen width under the button; elsewhere it lines up with the button's right edge but never runs off either side. */
function fitMenu(m, btn) {
  const b = btn.getBoundingClientRect(), vw = document.documentElement.clientWidth, gap = 12;
  const w = vw <= 640 ? vw - gap * 2 : Math.min(m.offsetWidth, vw - gap * 2);
  Object.assign(m.style, { position: 'fixed', width: w + 'px', right: 'auto', top: b.bottom + 8 + 'px', left: Math.max(gap, Math.min(b.right - w, vw - w - gap)) + 'px', maxHeight: innerHeight - b.bottom - 8 - gap + 'px', overflowY: 'auto' });
  // Turning the phone or resizing the window closes the menu instead of leaving it in the wrong place.
  addEventListener('resize', function rz() { if (m.isConnected && document.documentElement.clientWidth === vw) return; removeEventListener('resize', rz); closeMenu(); });
}
/* Menu under the agent's photo. */
function meMenu(btn) {
  if (btn.parentElement.querySelector('.amenu')) return closeMenu(); closeMenu();
  const m = document.createElement('div'); m.className = 'shmenu amenu'; m.setAttribute('role', 'menu');
  m.innerHTML = [['details', 'Your details'], ['account', 'Account and billing'], ['saved', 'Saved reports'], ['logout', 'Log out']].map(([k, l]) => `${k === 'logout' ? '<hr>' : ''}<button type="button" role="menuitem" data-mm="${k}">${l}</button>`).join('');
  btn.parentElement.appendChild(m); fitMenu(m, btn);
  m.onclick = (e) => { const b = e.target.closest('[data-mm]'); if (!b) return; closeMenu(); const k = b.dataset.mm;
    if (k === 'details') { PS = { m: 'details', k: PS.k }; return drawPanel(); } if (k === 'logout') return $('#logout').click(); show(k); };
  setTimeout(() => document.addEventListener('click', function off(ev) { if (!ev.target.closest('.amenu') && !ev.target.closest('#mebtn')) { closeMenu(); document.removeEventListener('click', off, true); } }, true));
}

/* Share: send the report, or preview an image or the PDF before downloading or posting. */
function shareDrop(btn) {
  if (btn.parentElement.querySelector('.shmenu')) return closeMenu(); if (!ready()) return;
  saveNow(); closeMenu(); const pro = isPro(), m = document.createElement('div'); m.className = 'shmenu dmenu'; m.setAttribute('role', 'menu');
  const it = (k, ic, l, sub, off, pv) => `<button type="button" role="menuitem" data-s="${k}"${off ? ' disabled' : ''}><span class="i">${sv(ic)}</span><span><b>${l}</b>${sub ? `<small>${sub}</small>` : ''}</span>${pv ? `<em>${off ? 'Pro' : 'Preview ›'}</em>` : ''}</button>`;
  m.innerHTML = `<p class="mh">Send your report</p>${it('copy', 'link', 'Copy link', 'Paste it in a text, email or post')}${it('email', 'mail', 'Email for your clients', 'A finished message for Gmail or your CRM')}${it('qr', 'qr', 'QR code', 'For open houses, flyers and signs')}${it('plinks', 'link', 'Personal links', 'One link per client, with their name and neighbourhood', !pro)}${isPhone() ? it('native', 'share', 'Share from this phone') : ''}
    <hr><p class="mh">Images and PDF</p>${it('post', 'ig', 'Instagram post', 'Square image', !pro, 1)}${it('story', 'ig', 'Instagram story', 'Tall image', !pro, 1)}${it('pdf', 'dl', 'PDF', 'To print or attach', !pro, 1)}`;
  btn.parentElement.appendChild(m); fitMenu(m, btn);
  m.onclick = (e) => { const b = e.target.closest('[data-s]'); if (!b || b.disabled) return; const k = b.dataset.s; closeMenu();
    if (k === 'copy') return act('link', record('link'));
    if (k === 'email') return act('email', record('email'));
    if (k === 'native') { const t = shareText(reportLink(location.origin, P, 'Greater Vancouver')); navigator.share({ title: t.subject, text: t.short.replace(/: \S+$/, '.'), url: t.url }).catch(() => {}); return record('link').catch(() => {}); }
    if (k === 'plinks') return show('clients');
    if (k === 'qr') return record('link').then((x) => qrModal({ title: 'Your report QR code', text: 'Anyone who scans this with a phone camera opens your report.', url: linkOf(x), file: `${P.slug}-QR.png` })).catch((er) => alertMsg(er.message, true));
    openPreview(k); };
  setTimeout(() => document.addEventListener('click', function off(ev) { if (!ev.target.closest('.dmenu') && !ev.target.closest('#sharebtn')) { closeMenu(); document.removeEventListener('click', off, true); } }, true));
}
/* D9 Client activity: one personal link per client (their name and neighbourhood), and how active each client is. */
const PL_DEMO = 'mup_demo_plinks';
const plLink = (it) => `${location.origin}/r/${P.slug}?p=${it.id}`;
const ago = (d) => { if (!d) return ''; const m = (Date.now() - new Date(d)) / 6e4; return m < 60 ? 'just now' : m < 1440 ? `${Math.round(m / 60)} h ago` : m < 2880 ? 'yesterday' : `${Math.round(m / 1440)} days ago`; };
const when = (d) => { const x = new Date(d), t = new Date(), y = new Date(t - 864e5), hm = x.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?m\.?/i, (_, a) => a.toLowerCase() + 'm');
  return x.toDateString() === t.toDateString() ? `Today, ${hm}` : x.toDateString() === y.toDateString() ? `Yesterday, ${hm}` : x.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }); };
// The sample client in demo mode: made-up visits, marked "Sample" on screen.
function demoClient(now = Date.now()) {
  const at = (d, h) => new Date(now - d * 864e5 - h * 36e5).toISOString(), v = (d, h, s, parts, acts = [], end = true, dev = 'phone') => ({ started_at: at(d, h), updated_at: at(d, h - s / 3600), seconds: s, parts, acts, reached_end: end, device: dev, month: monthKey(D.month) });
  const visits = [v(0, 1, 240, { hoods: 170, trend: 40, market: 30 }), v(1, 3, 180, { hoods: 120, trend: 60 }, ['type:c']), v(3, 2, 120, { hoods: 60, market: 40, types: 20 }, ['contact'], false, 'computer'), v(9, 5, 200, { hoods: 110, trend: 60, market: 30 }), v(20, 4, 140, { hoods: 80, types: 60 }, [], false)];
  const views = [{ hood: 'Westwood Plateau', kind: 'compare', created_at: at(0, 1) }, { hood: 'Westwood Plateau', kind: 'peek', created_at: at(1, 3) }, { hood: 'Coquitlam West', kind: 'peek', created_at: at(1, 3) }, { hood: 'Westwood Plateau', kind: 'peek', created_at: at(9, 5) }];
  return { id: 'sample', name: 'the Chen family', city: 'Coquitlam', hood: 'Burke Mountain', type: 'd', opens: visits.length, last_opened_at: visits[0].started_at, sample: true, visits, views };
}
// host: draw it as the Clients page (P10) inside that element; without it, as a window.
async function personalLinks(host) {
  if (!isPro()) return alertMsg('Personal links are part of Pro.', true);
  if (!host && !ready()) return;
  let W = host; if (!host) { document.querySelector('.plm')?.remove(); W = document.createElement('div'); W.className = 'plm'; document.body.appendChild(W); }
  let data = { items: [], weekly: true, top: [], general: 0, requests: [] }, city = defaultCity(D, cur().conf.hoods || {}, cur().areas), err = '', days = 30, open = null, loading = true;
  const close = () => { if (host) return; W.remove(); document.removeEventListener('keydown', k1); }, k1 = (e) => e.key === 'Escape' && (open ? (open = null, draw()) : close()); if (!host) document.addEventListener('keydown', k1);
  async function load() {
    loading = true;
    if (cfg.demo) { let mine = []; try { mine = JSON.parse(localStorage.getItem(PL_DEMO) || '[]'); } catch {}
      const c = demoClient(); data.items = [c, ...mine].map((x) => ({ ...x, act: activity(x, x.visits || [], x.views || [], { days, latest: monthKey(D.month) }) }));
      data.top = [['Westwood Plateau', 9], ['Burke Mountain', 6], ['Coquitlam West', 4]]; data.general = 0; loading = false; return; }
    try { data = await api(`/api/links?days=${days}`); err = ''; } catch (e) { err = e.message; }
    loading = false;
  }
  const tname = (t) => (HTYPES.find(([k]) => k === t) || HTYPES[0])[1];
  const pill = (a) => `<span class="ca-pill ca-${a.level}"><i></i>${a.label}</span>`;
  const sub = (a) => (a.level === 'hot' ? `opened ${timesW(a.week)} this week` : a.level === 'none' ? '' : a.months.length ? 'looked at past months' : a.visits ? `opened ${timesW(a.visits)}` : a.lastAt ? `last opened ${ago(a.lastAt)}` : '');
  const most = (x, a) => (a.looked.length ? `${esc(a.looked[0][0])}<small>${timesW(a.looked[0][1])}${a.types.length ? ` · and ${a.types.map((t) => ({ d: 'detached', t: 'townhouses', c: 'condos' })[t]).join(', ')}` : ''}</small>`
    : a.months.length ? `${esc(mLong(a.months[a.months.length - 1]))}<small>an older month</small>` : a.visits ? `Their own area only<small>${esc(x.hood)}</small>` : '<span class="ca-dash">—</span>');
  const PER = [[30, 'Last 30 days'], [7, 'Last 7 days'], [365, 'All time']], perName = PER.find(([d]) => d === days)?.[1].toLowerCase();
  function row(x) { const a = x.act;
    return `<tr data-cao="${esc(x.id)}" tabindex="0"><td><b>${esc(x.name || 'Someone')}</b>${x.sample ? ' <span class="pltag2">Sample</span>' : ''}<small>${esc(x.hood)}${x.month ? ` · opens on ${esc(mLong(x.month))}` : ''}</small></td>
      <td>${pill(a)}<small>${sub(a)}</small></td>
      <td>${a.visits ? `<b>${timesW(a.visits)}</b><small>Last: ${esc(when(a.lastAt))}</small>` : a.lastAt ? `<span class="ca-dash">—</span><small>Last: ${esc(when(a.lastAt))}</small>` : '<span class="ca-dash">—</span>'}</td>
      <td>${a.visits ? `<b>${mins(a.seconds)}</b><small>${a.ends ? `read to the end ${timesW(a.ends)}` : a.visits > 1 ? `about ${mins(a.seconds / a.visits)} a visit` : 'one visit'}</small>` : '<span class="ca-dash">—</span>'}</td>
      <td>${most(x, a)}</td>
      <td class="ca-btns"><button type="button" class="linkbtn" data-plc="${esc(x.id)}">Copy link</button><button type="button" class="plx" data-pld="${esc(x.id)}" aria-label="Remove ${esc(x.name)}" title="Remove">✕</button></td></tr>`; }
  // One client's details: numbers, visits per week, time per section, recent visits, why it matters.
  function detail(x) { const a = x.act, mx = Math.max(1, ...a.weeks), ps = a.parts.slice(0, 5), pm = Math.max(1, ...ps.map((p) => p[2])), d = a.visits - a.prevVisits;
    const note = `Hi ${x.name.replace(/^the /i, '')}, here is this month's market report for ${x.hood}: ${plLink(x)}`;
    return `<button type="button" class="back ca-back" data-cab>‹ All clients</button>
      <div class="ca-dh"><h3>${esc(x.name || 'Someone')}</h3>${pill(a)}${x.sample ? '<span class="pltag2">Sample</span>' : ''}</div>
      <p class="muted small">Their area: ${esc(x.hood)}, ${esc(x.city)} · ${esc(tname(x.type))}${x.month ? ` · their link opens on ${esc(mLong(x.month))}` : ''}</p>
      ${a.level === 'none' ? `<p class="ca-empty">They haven't opened their link yet. Copy it and send it in a text or email.</p>` : `
      <div class="ca-stats"><div><small>Opened (${perName})</small><b>${a.visits ? timesW(a.visits) : 'not yet'}</b>${days < 365 && d ? `<span class="${d > 0 ? 'upv' : 'dnv'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)} ${d > 0 ? 'more' : 'fewer'} than the ${days} days before</span>` : ''}</div>
        <div><small>Time reading</small><b>${a.visits ? mins(a.seconds) : '—'}</b><span class="muted">in total</span></div>
        <div><small>Read to the end</small><b>${a.visits ? (a.ends === a.visits ? (a.visits === 1 ? 'yes' : a.visits === 2 ? 'both visits' : `all ${a.visits} visits`) : a.ends ? `${a.ends} of ${a.visits} visits` : 'not yet') : '—'}</b></div></div>
      <span class="lbl2">Visits per week</span><div class="ca-bars">${a.weeks.map((n, i) => `<div title="${n ? timesW(n) : 'no visits'}" style="height:${n ? Math.max(8, (n / mx) * 100) : 4}%" class="${n ? '' : 'z'}"></div>`).join('')}</div><div class="ca-wk"><span>8 weeks ago</span><span>this week</span></div>
      ${ps.length ? `<span class="lbl2">What they spent time on</span>${ps.map(([k, l, sec]) => `<div class="ca-sec"><span>${l}</span><div><i style="width:${(sec / pm) * 100}%"></i></div><b>${mins(sec)}</b></div>`).join('')}` : ''}
      ${a.recent.length ? `<span class="lbl2">Recent visits</span><ul class="ca-tl">${a.recent.map((r) => `<li><b>${esc(when(r.at))}</b> · ${mins(r.seconds)}${r.device ? ` on a ${r.device}` : ''}${r.did.length ? ` · ${r.did.map(esc).join(' · ')}` : ''}</li>`).join('')}</ul>` : ''}`}
      ${a.why ? `<div class="ca-why"><b>Why it matters:</b> ${esc(a.why)}</div>` : ''}
      <div class="ca-act"><a class="btn" href="mailto:?subject=${encodeURIComponent(`Your ${x.hood} market report`)}&body=${encodeURIComponent(note)}">✉ Send them a note</a><button type="button" class="btn ghost" data-plc="${esc(x.id)}">Copy their link</button></div>`; }
  // P10: clients who asked about their neighbourhood (S5 Ask), newest first.
  function reqHtml() {
    const rq = (data.requests || []).filter((r) => r.status !== 'done').slice(0, 20), done = (data.requests || []).filter((r) => r.status === 'done').length;
    return `<div class="cp-l">Asked about their neighbourhood ${rq.filter((r) => r.status === 'new').length ? `<span>${rq.filter((r) => r.status === 'new').length} new</span>` : ''}</div>
      <div class="cp-card">${rq.length ? rq.map((r) => { const who = r.name || 'Someone', c = r.contact || r.email || '', tel = c && !c.includes('@') ? c.replace(/[^\d+]/g, '') : '';
        const how = r.from_link ? 'Their personal link' : c ? esc(c) : '', what = r.status === 'sent' ? 'shown to them right away' : '';
        return `<div class="rq"><span class="rq-d${r.status === 'new' ? ' on' : ''}"></span><div class="rq-t"><b>${esc(who)}</b> asked about <b>${esc(r.hood)}</b>, ${esc(r.city)}<small>${[how, esc(when(r.created_at)), what].filter(Boolean).join(' · ')}</small></div>
        ${r.status === 'new' && c ? `<a class="btn sm" href="${tel ? `sms:${tel}` : `mailto:${esc(c)}?subject=${encodeURIComponent(`Your ${r.hood} numbers`)}`}">${tel ? 'Call or text' : 'Email'}</a>` : ''}${r.status === 'new' ? `<button type="button" class="btn sm ghost" data-rqd="${esc(r.id)}">Done</button>` : '<span class="rq-ok">✓</span>'}</div>`; }).join('')
        : `<p class="cp-empty">No one has asked yet. When "Pick their neighbourhood" is off, clients can ask you about a neighbourhood, and it shows here.</p>`}</div>${done ? `<p class="small muted cp-note">${done === 1 ? '1 request' : `${done} requests`} marked done.</p>` : ''}`;
  }
  // P10: what the agent sent this month and before (links, emails, PDFs, images), from their history.
  function sentHtml() {
    const list = HIST.filter((x) => x.kind !== 'save').slice(0, 10);
    return `<div class="cp-card">${list.length ? list.map((it) => `<div class="rq"><span class="rq-i">${icon(it.kind)}</span><div class="rq-t"><b>${esc(KIND[it.kind][0])}</b><small>${esc(it.area)} · ${esc(when(it.created_at))}</small></div></div>`).join('')
      : '<p class="cp-empty">Nothing sent yet. Use Share on Create report.</p>'}</div>`;
  }
  function draw() {
    const L = cur(), names = hoodNames(D, city), mOpt = MK.length > 1;
    const x = open && data.items.find((i) => i.id === open);
    const inner = x ? detail(x) : `<div class="plf${mOpt ? ' plf6' : ''}"><input type="text" id="pln" maxlength="60" placeholder="Client name, e.g. the Chen family">
        <select id="plcity" aria-label="City">${hoodCities(D).map((c) => `<option${c === city ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
        <select id="plh" aria-label="Neighbourhood"><option value="">Neighbourhood</option>${names.map((n) => `<option>${esc(n)}</option>`).join('')}</select>
        <select id="plt2" aria-label="Home type">${HTYPES.map(([t, l]) => `<option value="${t}">${l}</option>`).join('')}</select>
        ${mOpt ? `<select id="plm2" aria-label="Opens on"><option value="">Opens on the newest month</option>${MK.slice(1).map((k) => `<option value="${k}">Opens on ${esc(mLong(k))}</option>`).join('')}</select>` : ''}
        <button type="button" class="btn" data-plmake>Create link</button></div>
      ${err ? `<p class="err small">${esc(err)}</p>` : ''}
      <div class="ca-top"><b>Most active first</b><div class="seg2">${PER.map(([d, l]) => `<button type="button" data-cad="${d}" aria-pressed="${d === days}">${l}</button>`).join('')}</div></div>
      ${data.items.length ? `<div class="ca-wrap"><table class="ca-tb"><thead><tr><th>👤 Client</th><th>🔥 How active</th><th>👁 Opened</th><th>⏱ Time reading</th><th>📍 Looked at most</th><th></th></tr></thead><tbody>${data.items.map(row).join('')}</tbody></table></div>`
        : `<p class="muted small center">${loading ? 'Loading…' : 'No personal links yet. Add your first client above.'}</p>`}
      <p class="small muted">Tap a client to see what they read. ${data.general ? `Your general link (Instagram, your website) was opened ${timesW(data.general)} in the ${perName.replace('all time', 'last year')}. We can't tell who opened it.` : 'Your general link (Instagram, your website) is counted only as totals. We can’t tell who opened it.'}</p>
      ${data.top?.length ? `<p class="small muted">Most-viewed neighbourhoods (everyone who opened your report): ${data.top.map(([h, n]) => `${esc(h)} (${n})`).join(', ')}.</p>` : ''}
      <label class="tgr"><span>Email me every Monday with which clients were actively looking</span><input type="checkbox" data-plw${data.weekly !== false ? ' checked' : ''}><span class="sw2" aria-hidden="true"></span></label>
      <div class="plsoon"><b>Add many at once</b> <span class="pltag2">Later</span><br>Upload a contact list or connect your CRM (like Follow Up Boss) to make links for everyone automatically.</div>`;
    W.innerHTML = host ? `<div class="cp"><div class="cp-h"><h1>Clients</h1><p class="muted">Who asked about their neighbourhood, and who is reading what you sent.</p></div>
      <div class="cp-cols"><div class="cp-main">${x ? '' : reqHtml()}<div class="cp-l">Client activity</div><div class="plbox cabox capb">${inner}</div></div>${x ? '' : `<aside class="cp-side"><div class="cp-l">What you sent</div>${sentHtml()}</aside>`}</div></div>`
      : `<div class="plbox cabox" role="dialog" aria-modal="true" aria-labelledby="plt"><div class="plh"><div><h3 id="plt">Client activity</h3><p class="muted small">Each client gets their own link with their name and neighbourhood. It updates itself every month, so send it once. Then see who is actively looking.</p></div><button type="button" class="x" data-plx aria-label="Close">✕</button></div>${inner}</div>`;
  }
  W.onclick = async (e) => { if ((!host && e.target === W) || e.target.closest('[data-plx]')) return close(); const b = e.target.closest('button');
    if (b && b.dataset.rqd) { const id = b.dataset.rqd; b.disabled = true;
      try { const j = await api('/api/links', { action: 'request', id, do: 'done' });
        data.requests = data.requests.map((r) => (r.id === id ? j.request : r));
        REQN = data.requests.filter((r) => r.status === 'new').length; drawNav(); alertMsg('Marked done.'); }
      catch (er) { b.disabled = false; return alertMsg(er.message, true); } return draw(); }
    if (!b) { const r = e.target.closest('[data-cao]'); if (r && !e.target.closest('a')) { open = r.dataset.cao; draw(); W.querySelector('.plbox').scrollTop = 0; } return; }
    if ('cab' in b.dataset) { open = null; return draw(); }
    if (b.dataset.cad) { days = +b.dataset.cad; draw(); await load(); return draw(); }
    if (b.dataset.plc) { e.stopPropagation(); const x = data.items.find((i) => i.id === b.dataset.plc); return navigator.clipboard.writeText(plLink(x)).then(() => alertMsg(`Link for ${x.name} copied.`)).catch(() => alertMsg('Copying was blocked by the browser.', true)); }
    if (b.dataset.pld) { e.stopPropagation(); const x = data.items.find((i) => i.id === b.dataset.pld); if (!confirm(`Remove the personal link for ${x.name}? The link will stop showing their name.`)) return;
      data.items = data.items.filter((i) => i.id !== x.id); if (cfg.demo) { try { localStorage.setItem(PL_DEMO, JSON.stringify(data.items.filter((i) => !i.sample).map(({ act, ...r }) => r))); } catch {} } else api('/api/links', { action: 'delete', id: x.id }).catch((er) => alertMsg(er.message, true)); return draw(); }
    if ('plmake' in b.dataset) { const name = $('#pln').value.trim(), hood = $('#plh').value, type = $('#plt2').value, month = $('#plm2')?.value || null;
      if (!name || !hood) return alertMsg('Add the client name and pick their neighbourhood.', true);
      let x; b.disabled = true;
      try { if (cfg.demo) { x = { id: Math.random().toString(36).slice(2, 10), name, city, hood, type, month, opens: 0, looked: [] }; const mine = [x, ...data.items.filter((i) => !i.sample)].map(({ act, ...r }) => r); localStorage.setItem(PL_DEMO, JSON.stringify(mine)); x.act = activity(x, [], [], {}); data.items = [...data.items, x]; }
        else { x = (await api('/api/links', { name, city, hood, type, month })).item; data.items = [...data.items, x]; } }
      catch (er) { b.disabled = false; return alertMsg(er.message, true); }
      draw(); navigator.clipboard?.writeText(plLink(x)).then(() => alertMsg(`Link for ${name} created and copied. Paste it in a text or email to them.`)).catch(() => alertMsg(`Link for ${name} created.`)); } };
  W.onkeydown = (e) => { if (e.key === 'Enter' && e.target.matches('[data-cao]')) e.target.click(); };
  W.onchange = (e) => { const t = e.target;
    if (t.id === 'plcity') { city = t.value; const n = $('#pln').value; draw(); $('#pln').value = n; }
    if (t.matches('[data-plw]')) { data.weekly = t.checked; if (!cfg.demo) api('/api/links', { action: 'weekly', on: t.checked }).catch((er) => alertMsg(er.message, true)); alertMsg(t.checked ? 'Monday email is on.' : 'Monday email is off.'); } };
  draw(); await load(); if (host) { REQN = (data.requests || []).filter((r) => r.status === 'new').length; drawNav(); } draw(); if (!host) $('#pln')?.focus();
}
// The preview window: see the image (or PDF) first, choose what's on it, then download, post or send to a phone.
async function openPreview(kind) {
  document.querySelector('.pvm')?.remove(); const W = document.createElement('div'); W.className = 'pvm'; document.body.appendChild(W);
  let K = kind, A0 = areasOf(D).includes(firstArea()) ? firstArea() : 'Greater Vancouver', canvas = null;
  if (IGS === null) igApi({ action: 'status' }).then((c) => { IGS = c || { connected: false }; draw(); }).catch(() => { IGS = { connected: false }; draw(); });
  const close = () => { W.remove(); document.removeEventListener('keydown', esc1); }, esc1 = (e) => e.key === 'Escape' && close(); document.addEventListener('keydown', esc1);
  const linkP = () => record('link').then(linkOf);
  async function draw() {
    const img = K !== 'pdf', o = img ? imgOpts(agent(), K) : null, A = agent(), link = reportLink(location.origin, P, 'Greater Vancouver');
    const ig = IGS?.connected, igLbl = K === 'story' ? 'Post to my Instagram story' : 'Post to my Instagram';
    W.innerHTML = `<div class="pvbg"></div><div class="pvbox" role="dialog" aria-modal="true" aria-label="Preview"><button type="button" class="pvx" data-x aria-label="Close">✕</button>
      <div class="pvl" id="pvl">${img ? '<p class="muted">Making your image…</p>' : `<iframe title="PDF preview" src="/r/${P.slug}/print?area=${encodeURIComponent(A0)}&preview=${encodeURIComponent(JSON.stringify(current()))}"></iframe>`}</div>
      <div class="pvr"><div class="seg2 pvt">${[['post', 'Post'], ['story', 'Story'], ['pdf', 'PDF']].map(([k, l]) => `<button type="button" data-k2="${k}" aria-pressed="${K === k}">${l}</button>`).join('')}</div>
        <h3>${K === 'post' ? 'Instagram post' : K === 'story' ? 'Instagram story' : 'PDF report'}</h3>
        <label class="lbl2">City<select class="inp2" id="pvarea">${areasOf(D).map((a) => `<option${a === A0 ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
        ${img ? `<span class="lbl2">On the image</span>${IMG_PARTS.map(([k, l]) => tgl(`data-io="${k}"`, l, o[k])).join('')}` : '<p class="hint">A printable report for this area, with your name and photo.</p>'}
        ${K === 'post' ? `<span class="lbl2">Caption</span><textarea class="inp2 cap" id="pvcap" rows="4">${esc(calmCaption(D, A, A0, link))}</textarea>` : ''}
        ${K === 'story' ? `<div class="tipb">Stories don't have a caption. To let people open your full report, add a <b>link sticker</b> in Instagram. <button type="button" class="lk2" data-a="copylink">Copy my report link</button></div>` : ''}
        <div class="pvacts">${img ? `${ig ? `<button type="button" class="btn wide igb" data-a="ig">${sv('ig')}${igLbl}</button>` : `<button type="button" class="btn wide ghost" data-a="igc">${sv('ig')}Connect Instagram to post directly</button>`}
          <button type="button" class="btn wide ${ig ? 'ghost' : ''}" data-a="dl">${sv('dl')}Download</button>${K === 'post' ? `<button type="button" class="btn wide ghost" data-a="cap">${sv('cap')}Copy caption</button>` : ''}<button type="button" class="btn wide ghost" data-a="phone">${sv('share')}Send to my phone</button>
          ${ig ? `<span class="small muted center">Posting goes to @${esc(IGS.username || '')}</span>` : ''}` : `<button type="button" class="btn wide" data-a="pdf">${sv('dl')}Open PDF to save or print</button>`}</div></div></div>`;
    if (img) { canvas = await calmImage(D, A, A0, K, o); const l = $('#pvl'); if (l) { l.innerHTML = ''; canvas.className = 'pvimg ' + K; l.appendChild(canvas); } }
  }
  W.addEventListener('click', async (e) => { const b = e.target.closest('button'); if (e.target.classList.contains('pvbg')) return close(); if (!b) return; const d = b.dataset;
    if ('x' in d) return close();
    if (d.k2) { K = d.k2; return draw(); }
    const A = agent();
    if (d.a === 'copylink') return copy(linkP()).then(() => alertMsg('Report link copied.'));
    if (d.a === 'cap') return copy(linkP().then((l) => ($('#pvcap')?.value || calmCaption(D, A, A0, l)))).then(() => alertMsg('Caption copied.'));
    if (d.a === 'dl') { area = A0; download(canvas, `${A0.replace(/\s+/g, '-')}-${D.month.replace(' ', '-')}-${K}.png`); record(K, A0).catch(() => {}); return alertMsg('Image downloaded.'); }
    if (d.a === 'phone') { area = A0; return record(K, A0).then((it) => qrModal({ title: 'Send it to your phone', text: 'Scan this with your phone camera. The image opens there, ready to save or share to Instagram.', url: `${location.origin}/s/${P.slug}?v=${it.id}&k=${K}${cfg.demo ? `&area=${encodeURIComponent(A0)}` : ''}` })).catch((er) => alertMsg(er.message, true)); }
    if (d.a === 'pdf') { area = A0; return act('pdf', record('pdf', A0)); }
    if (d.a === 'igc') { close(); return show('account'); }
    if (d.a === 'ig') return confirmPost(W, K, () => ({ canvas, cap: $('#pvcap')?.value })); });
  W.addEventListener('change', (e) => { const t = e.target;
    if (t.id === 'pvarea') { A0 = t.value; return draw(); }
    if (t.dataset.io) { const all = showOf(P).img || {}, cur0 = imgOpts(agent(), K); P.show = { ...showOf(P), img: { ...all, [K]: { ...cur0, [t.dataset.io]: t.checked } } }; touch('show'); return draw(); } });
  draw();
}
// "Post this story now?" then post through the connected Instagram account.
function confirmPost(W, K, get) {
  const box = document.createElement('div'); box.className = 'pvconf';
  const ask = () => { box.innerHTML = `<div class="pvcbg"></div><div class="pvc"><h3>Post this ${K === 'story' ? 'story' : 'post'} now?</h3><div class="igwho"><span class="iglogo">${sv('ig', 18)}</span><div><b>@${esc(IGS.username || '')}</b><small>Your connected Instagram</small></div></div>
    <p>${K === 'story' ? 'It goes live on your story right away and stays for 24 hours.' : 'It goes live on your profile right away, with your caption.'} You can delete it in Instagram any time.</p><div class="row2"><button type="button" class="btn ghost" data-c="no">Cancel</button><button type="button" class="btn igb" data-c="yes">Post now</button></div></div>`; };
  ask(); W.appendChild(box);
  box.onclick = async (e) => { const b = e.target.closest('[data-c]'); if (!b && !e.target.classList.contains('pvcbg')) return; if (!b || b.dataset.c === 'no') return box.remove();
    if (b.dataset.c === 'done') return box.remove(); if (b.dataset.c === 'open') { window.open('https://www.instagram.com/' + (IGS.username || ''), '_blank'); return box.remove(); }
    b.disabled = true; b.textContent = 'Posting…';
    try { const { canvas, cap } = get(), jpg = canvas.toDataURL('image/jpeg', 0.92), link = await record('link').then(linkOf);
      await igApi({ action: 'post', [K]: jpg, caption: cap || calmCaption(D, agent(), firstArea(), link) }); record(K).catch(() => {});
      box.querySelector('.pvc').innerHTML = `<h3>Posted to your ${K === 'story' ? 'story' : 'profile'}</h3><div class="okb"><b>✓ Live on @${esc(IGS.username || '')}</b>Posted just now.${K === 'story' ? ' It stays up for 24 hours.' : ''}</div>
        ${K === 'story' ? '<p>Want people to tap through to your report? Open the story in Instagram and add a link sticker.</p>' : ''}<div class="row2"><button type="button" class="btn ghost" data-c="done">Done</button><button type="button" class="btn" data-c="open">Open Instagram</button></div>`;
    } catch (er) { b.disabled = false; b.textContent = 'Try again'; alertMsg(er.message, true); } };
}

/* ---------- My reports ---------- */
/* ---------- P11 Saved reports: reports the agent saved with Save on Create report ---------- */
// The name of a saved report: the cities it shows ("Coquitlam and Greater Vancouver"), or "<client> · <neighbourhood>".
const savedName = (it) => { const a = it.settings?.show?.areas || [it.area]; return a.length === 1 ? a[0] : a.length === 2 ? a.join(' and ') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; };
const savedWhen = (d) => { const x = new Date(d), t = new Date();
  return x.toDateString() === t.toDateString() ? `Saved today, ${x.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?m\.?/i, (_, m) => m.toLowerCase() + 'm')}`
    : `Saved ${x.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', ...(x.getFullYear() !== t.getFullYear() ? { year: 'numeric' } : {}) })}`; };
function drawSaved() {
  const pg = $('#page'), list = HIST.filter((x) => x.kind === 'save'), groups = [];
  for (const it of list) { const m = new Date(it.created_at).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }); let g = groups.find((x) => x.m === m); if (!g) groups.push((g = { m, items: [] })); g.items.push(it); }
  pg.innerHTML = `<div class="c sp"><h1>Saved reports</h1><p class="muted">Reports you saved. Tap one to open it.</p>
    ${groups.length ? groups.map((g) => `<div class="cp-l">${esc(g.m)}</div><div class="cp-card">${g.items.map((it) => `<button type="button" class="sr2" data-open="${esc(it.id)}"><span class="rq-t"><b>${esc(savedName(it))}</b><small>${esc(savedWhen(it.created_at))}</small></span><span class="sr2-o">Open</span><span class="sr2-c" aria-hidden="true">›</span></button>`).join('')}</div>`).join('')
      : `<div class="cp-card"><p class="cp-empty">Nothing saved yet. On Create report, tap <b>Save</b> and your report shows up here.</p></div>`}</div>`;
  pg.onclick = (e) => { const b = e.target.closest('[data-open]'); if (!b) return; const it = HIST.find((x) => x.id === b.dataset.open); if (it) window.open(linkOf(it), '_blank'); };
}
// Save on Create report: keeps the report as it is now (cities, sections, settings) in Saved reports. Saving the same report again just updates its time.
async function saveReport() {
  if (!ready()) return; saveNow(); const b = $('#savebtn'); if (b) b.disabled = true;
  try { await record('save', layoutOf(agent(), D).areas[0]);
    document.querySelector('.bdtoast')?.remove(); const t = document.createElement('div'); t.className = 'bdtoast'; t.setAttribute('role', 'status');
    t.innerHTML = '<span>✓ Saved. Find it any time in <b>Saved reports</b></span><button type="button">Open</button>'; document.body.appendChild(t);
    t.querySelector('button').onclick = () => { t.remove(); show('saved'); }; setTimeout(() => t.remove(), 5000);
  } catch (e) { alertMsg(e.message, true); } if (b) b.disabled = false;
}
/* ---------- P10 Clients: neighbourhood requests, client activity, what you sent ---------- */
function drawClients() { const pg = $('#page'); pg.innerHTML = '<div class="c cpw"></div>'; personalLinks(pg.firstElementChild); }

/* ---------- Account: log in details, password, billing ---------- */
async function drawAccount() {
  const pg = $('#page'); pg.innerHTML = '<div class="acct"><p class="muted">Loading…</p></div>';
  let u = { email: P.email || 'you@example.com', app_metadata: { providers: ['email'] }, user_metadata: {} };
  if (!cfg.demo) try { const r = await fetch(`${SB}/auth/v1/user`, { headers: { ...H, authorization: `Bearer ${await token()}` } }); if (r.ok) u = await r.json(); } catch {}
  const prov = u.app_metadata?.providers || [], google = prov.includes('google'), hasPw = prov.includes('email') || !!u.user_metadata?.has_password;
  const plan = cfg.plans[P.plan]?.name || 'None', ends = P.period_end ? new Date(P.period_end).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  pg.innerHTML = `<div class="acct"><h2>Account</h2>
    <div class="card2"><h3>Log in</h3><div class="kv2"><span>Email</span><b>${esc(u.email)}</b></div><div class="kv2"><span>You log in with</span><b>${[google && 'Google', hasPw && 'Email and password'].filter(Boolean).join(' or ') || 'Email'}</b></div>${P.licence ? `<div class="kv2"><span>${P.role === 'broker' ? 'BCFSA licence' : 'Licence (V number)'}</span><b>${esc(P.licence)} ${licStatus()}</b></div>` : ''}</div>
    <form class="card2" id="pwf"><h3>${hasPw ? 'Change your password' : 'Add a password'}</h3>
      <p class="small muted">${hasPw ? 'Enter your current password, then choose a new one.' : 'You signed up with Google. Add a password if you would also like to log in with your email.'}</p>
      ${hasPw ? pwField('cur', 'Current password', 'current-password') : ''}${pwField('npw', 'New password (at least 8 characters)', 'new-password')}
      <div class="row2"><button class="btn">Save password</button>${hasPw ? '<a href="#" id="fg" class="small">Forgot your current password?</a>' : ''}</div><p id="pmsg" class="small" role="status"></p></form>
    <div class="card2"><h3>Plan and billing</h3><div class="kv2"><span>Plan</span><b>${esc(plan)}</b></div>${ends ? `<div class="kv2"><span>${P.status === 'canceled' ? 'Ends' : 'Renews'}</span><b>${ends}</b></div>` : ''}
      <p class="small muted">Change plans, update your card, download receipts or cancel.</p><div><button class="btn ghost" id="bill"${P.stripe_customer_id || cfg.demo ? '' : ' disabled'}>Manage billing</button></div></div>
    <h3 class="acct-h">Connections</h3><div class="card2 igc" id="igc"><p class="muted small">Loading…</p></div>
    <div><button class="btn ghost" id="lo">Log out</button></div></div>`;
  drawIg();
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

/* ---------- Instagram: connect, auto-post every month, post now ---------- */
const IGDEMO = 'mup_demo_ig';
async function igApi(data) {
  if (cfg.demo) { let c = null; try { c = JSON.parse(localStorage.getItem(IGDEMO) || 'null'); } catch {}
    if (data.action === 'start') { c = { connected: true, username: (P.name || 'you').toLowerCase().replace(/[^a-z]+/g, '') + '.realty', auto: true, story: false, area: 'Greater Vancouver' }; }
    if (data.action === 'settings' && c) for (const k of ['auto', 'story', 'area']) if (k in data) c[k] = data[k];
    if (data.action === 'disconnect') c = null;
    if (data.action === 'post' && c) c.last_month = D.month;
    try { localStorage.setItem(IGDEMO, JSON.stringify(c)); } catch {}
    return { configured: true, ...(c || { connected: false }) };
  }
  return api('/api/instagram', data);
}
const igLogo = (s = 22) => `<span class="iglogo">${sv('ig', s)}</span>`;
async function drawIg(c) {
  const el = $('#igc'); if (!el) return;
  if (!isPro()) { el.innerHTML = `<div class="ighd">${igLogo()}<div><b>Instagram</b><div class="small muted">Post your report image to Instagram every month, automatically.</div></div></div><div class="lockbox"><span>Instagram posting is part of Pro.</span><button class="btn sm" id="upig">Upgrade to Pro</button></div>`; $('#upig').onclick = portal; return; }
  if (!c) try { c = await igApi({ action: 'status' }); } catch (e) { el.innerHTML = `<p class="err small">${esc(e.message)}</p>`; return; }
  if (!c.connected) {
    el.innerHTML = `<div class="ighd">${igLogo()}<div><b>Instagram</b><div class="small muted">We post your new image the day each report comes out. You can also post any time.</div></div></div>
      <div class="small muted">Needs an Instagram Business or Creator account. It is free to switch: in Instagram go to Settings, then Account type and tools.</div>
      <div><button class="btn sm" id="igcon"${c.configured === false ? ' disabled' : ''}>${sv('ig')}Connect Instagram</button>${c.configured === false ? ' <span class="small muted">Coming soon</span>' : ''}</div>`;
    $('#igcon').onclick = async () => { try { const j = await igApi({ action: 'start' }); if (j.url) location.href = j.url; else { alertMsg('Instagram connected.'); drawIg(j); } } catch (e) { alertMsg(e.message, true); } };
    return;
  }
  const areas = areasOf(D);
  el.innerHTML = `<div class="ighd">${igLogo()}<div><b>Instagram</b><div class="small muted">Connected as @${esc(c.username)}</div></div><span class="igok">Connected</span></div>
    <label class="tg"><input type="checkbox" id="igauto"${c.auto ? ' checked' : ''}><span class="sw2" aria-hidden="true"></span><span><b>Post it for me every month.</b> Your new post goes up the day the report comes out.</span></label>
    <label class="tg"><input type="checkbox" id="igstory"${c.story ? ' checked' : ''}><span class="sw2" aria-hidden="true"></span><span>Also post the story</span></label>
    <label class="igarea"><span class="lbl">Area to post</span><select id="igarea">${areas.map((a) => `<option${a === c.area ? ' selected' : ''}>${a}</option>`).join('')}</select></label>
    <p class="small muted">Uses your current what-to-show choices.${c.last_month ? ` Last posted: ${esc(c.last_month)}.` : ''}</p>
    <div class="igbtns" id="igbtns"><button class="btn sm" id="ignow">${sv('ig')}Post to Instagram now</button><button class="btn sm ghost" id="igoff">Disconnect</button></div>`;
  const set = async (patch) => { try { drawIg(await igApi({ action: 'settings', ...patch })); alertMsg('Saved.'); } catch (e) { alertMsg(e.message, true); } };
  $('#igauto').onchange = (e) => set({ auto: e.target.checked }); $('#igstory').onchange = (e) => set({ story: e.target.checked }); $('#igarea').onchange = (e) => set({ area: e.target.value });
  $('#igoff').onclick = async () => { try { drawIg(await igApi({ action: 'disconnect' })); alertMsg('Instagram disconnected.'); } catch (e) { alertMsg(e.message, true); } };
  $('#ignow').onclick = () => { const what = c.story ? 'post and story' : 'post';
    $('#igbtns').innerHTML = `<div class="igask"><span>Post your ${esc(c.area)} ${what} to <b>@${esc(c.username)}</b> now? Everyone who follows you will see it.</span><div><button class="btn sm" id="igyes">Post it</button><button class="btn sm ghost" id="igno">Cancel</button></div></div>`;
    $('#igno').onclick = () => drawIg(c);
    $('#igyes').onclick = async (ev) => { ev.target.disabled = true; ev.target.textContent = 'Posting…';
      try { await saveNow(); const A = agent(), jpg = async (k) => (await socialImage(D, A, c.area, k)).toDataURL('image/jpeg', 0.9);
        const n = await igApi({ action: 'post', post: await jpg('post'), story: c.story ? await jpg('story') : undefined, caption: caption(D, A, c.area, reportLink(location.origin, P, c.area)) });
        alertMsg('Posted to Instagram.'); drawIg(n); } catch (e) { alertMsg(e.message, true); drawIg(c); } }; };
}
start();
