import { mountReport, SECTIONS, layoutOf, DEFAULT_LAYOUT, MAX_AREAS, sameLayout, PAIRABLE, USES_TYPES, USES_AREAS, TYPE_KEYS } from './board.js';
import { esc, areasOf, STYLES, FONTS, BASIC_THEME, loadFonts, SHOW_NUMBERS, SHOW_SECTIONS, DEFAULT_SHOW, TYPES, T1, showOf, monthKey, COVERS } from './report.js';
import { reportLink, emailDraft, caption, socialImage, download } from './exports.js';
import { calmImage, calmCaption, imgOpts, IMG_PARTS } from './social2.js';
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
      <div class="card plan"><h3>${pl.basic.name}</h3><div class="pr">$${pl.basic[cycle]}<small> / ${cycle === 'yearly' ? 'year' : 'month'}</small></div><p class="muted">Greater Vancouver report with your name, photo and logo, in a clean white and blue design.</p><button class="btn ghost wide" data-p="basic">Choose ${pl.basic.name}</button></div>
      <div class="card plan rec"><h3>${pl.pro.name}</h3><div class="pr">$${pl.pro[cycle]}<small> / ${cycle === 'yearly' ? 'year' : 'month'}</small></div><p class="muted">Your own colours, fonts and styles, every city, PDF and social images.</p><button class="btn wide" data-p="pro">Choose ${pl.pro.name}</button></div>
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
let P = {}, D = null, active = false, area = 'Greater Vancouver', tab = 'report', view = 'create', HIST = [], filter = 'all';
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
  const igs = qs.get('ig'); if (igs) { alertMsg({ connected: 'Instagram connected.', cancelled: 'Instagram was not connected.', failed: 'We could not connect Instagram. Please try again.' }[igs] || '', igs !== 'connected'); history.replaceState(null, '', '/app?view=account'); }
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
  main.innerHTML = `<div class="subnav" id="subnav"></div><div id="page" class="pg-${view}"></div>`; drawNav();
  $('#subnav').onclick = (e) => { const b = e.target.closest('[data-view]'); if (b && b.dataset.view !== view) show(b.dataset.view); };
  document.body.classList.toggle('oncreate', view === 'create');
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

/* ---------- Create: the report on the left, the sections panel on the right ---------- */
// The agent sees exactly what clients see. They select, drag, remove and add sections right on the report,
// switch sections on and off in the panel, and save it all as their template for every new month.
const firstArea = () => layoutOf(agent(), D).areas[0];
const layoutName = () => { const a = layoutOf(agent(), D).areas; return a.length === 1 ? a[0] : a.length === 2 ? a.join(' and ') : `${a.length} areas`; };
const shareText = (link) => { const n = layoutName(); return { url: link, subject: `${n} market update: ${D.month}`, short: `Here is the ${D.month} market update for ${n}: ${link}`, body: emailDraft(D, agent(), firstArea(), link).text }; };
const avatar = () => (P.photo ? `<img src="${esc(P.photo)}" alt="">` : `<span class="ini">${esc((P.name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase())}</span>`);
const SEC = Object.fromEntries(SECTIONS.map(([k, l, d]) => [k, { l, d }]));
const SIC = { numbers: '#', trend: '∿', market: '⇆', types: '⌂', growth: '↗', summary: '≡', sold: '▮', compare: '☰', contact: '✉' };
const TYPE_NAME = { detached: 'Detached', townhome: 'Townhouse', condo: 'Condo' };
const EYE = '<svg class="ico" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
let PS = { m: 'list', k: null, tab: 'data' }, ZOOM = 0.85, IGS = null;
const cur = () => layoutOf(agent(), D);
const snap = (L) => ({ sections: L.sections, areas: L.areas, agentTop: L.agentTop, clientAreas: L.clientAreas, view: L.view, conf: L.conf });
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
  $('#subnav').hidden = true; PS = { m: P.name ? 'list' : 'details', k: null, tab: 'data' };
  const notes = [cfg.demo ? 'Preview mode: nothing is saved to a server and no payment is taken.' : '', noticeOk, qs.has('welcome') ? `You are subscribed${P.name ? ', ' + P.name.trim().split(/\s+/)[0] : ''}. Welcome aboard.` : ''].filter(Boolean);
  pg.innerHTML = `<div class="dbar"><div class="crumb"><button type="button" class="lk" data-go="history">Your reports</button><span>/</span><b>${esc(D.month)}</b><span class="ok small" id="saved"></span></div>
    <div class="dact"><span id="laysel"></span><span class="shwrap"><button type="button" class="btn sm ghost" id="sharebtn">${sv('share')}Share</button></span><button type="button" class="btn sm" id="pvbtn">${EYE}Preview</button>
    <span class="mewrap"><button type="button" class="me" id="mebtn" aria-haspopup="menu"><span class="av">${avatar()}</span><span class="who"><b>${esc(P.name || 'Add your name')}</b><small>${esc(P.brokerage || '')}</small></span><span class="car">⌄</span></button></span></div></div>
    <div class="dwrap"><div class="dleft" id="dleft">${notes.map((n) => `<p class="dnote">${esc(n)}</p>`).join('')}${!cfg.demo && P.email_verified === false ? `<p class="dnote warn">Please confirm your email. We sent a link to <b>${esc(P.email || '')}</b>. <a href="#" id="cfmagain">Send it again</a></p>` : ''}
      <div id="rp"></div><div class="zoomc" role="group" aria-label="Zoom"><button type="button" data-z="-" aria-label="Zoom out">−</button><span id="zv">85%</span><button type="button" data-z="+" aria-label="Zoom in">+</button><button type="button" data-z="fit" title="Back to 85%" aria-label="Reset zoom">⤢</button></div></div>
    <aside class="dpanel" id="dpanel"></aside></div>`;
  noticeOk = ''; drawTop(); preview(); setZoom(ZOOM); wirePanel(); drawPanel(); wireZoom();
  pg.onclick = (e) => { const g = e.target.closest('[data-go]'); if (g) return show(g.dataset.go);
    if (e.target.id === 'cfmagain') { e.preventDefault(); return sendConfirm(P.email).then((ok) => alertMsg(ok ? 'Sent. Check your inbox.' : 'Please wait a minute and try again.', !ok)); }
    const z = e.target.closest('[data-z]'); if (z) return setZoom(z.dataset.z === 'fit' ? 0.85 : ZOOM + (z.dataset.z === '+' ? 0.1 : -0.1));
    if (e.target.closest('#pvbtn')) { if (!ready()) return; saveNow(); return act('link', record('link'), 'open'); }
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
  mountReport(rp, D, agent(), { embedded: true, ...(isPro() ? { edit: (patch) => setLayout(patch, false), selected: PS.k, adding: PS.m === 'add',
    onSelect: (k) => { PS = PS.m === 'edit' && k ? { m: 'edit', k, tab: PS.tab } : { m: 'list', k }; drawPanel(); $(`#dpanel [data-sk="${k}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); },
    onAdd: () => { PS = { m: 'add' }; drawPanel(); } } : {}) });
  rp.style.zoom = ZOOM;
}
let pvT; const later = () => { clearTimeout(pvT); pvT = setTimeout(() => { preview(); drawTop(); }, 160); };
const thumbs = () => { for (const k of ['photo', 'logo']) { if (!$('#lb-' + k)) continue; $('#lb-' + k).textContent = P[k] ? 'Change' : 'Add';
  $('#ph-' + k).innerHTML = P[k] ? `<img${k === 'photo' ? ' class="round"' : ''} src="${P[k]}" alt="">` : '<span class="ph">+</span>'; $(`[data-rm="${k}"]`).hidden = !P[k]; } };
function selectSec(k, scroll) { PS.k = k; $('#rp')?._select?.(k); $('#dpanel').querySelectorAll('[data-sk]').forEach((x) => x.classList.toggle('sel', x.dataset.sk === k));
  if (scroll) $(`#rp .sx[data-k="${k}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

/* ---------- the right panel ---------- */
const tgl = (attr, l, on) => `<label class="tgr"><span>${l}</span><input type="checkbox" ${attr}${on ? ' checked' : ''}><span class="sw2" aria-hidden="true"></span></label>`;
function drawPanel() {
  const el = $('#dpanel'); if (!el) return; const L = cur(), pro = isPro();
  $('#rp')?._select?.(PS.m === 'list' || PS.m === 'edit' ? PS.k : null); $('#rp')?._adding?.(PS.m === 'add');
  const head = (t, back) => `<div class="ph">${back ? `<button type="button" class="back" data-p="list">‹ ${t}</button>` : `<h3>${t}</h3>`}${back ? '<button type="button" class="x" data-p="list" aria-label="Close">✕</button>' : ''}</div>`;
  let body = '', foot = '';
  if (PS.m === 'details') {
    body = `${head('Your details', !!P.name)}${P.name ? '' : '<p class="hint">Add your name, photo and contact details. They show on your report.</p>'}
      <div class="fl2">${DETAILS.map(([k, l, t, ph]) => `<label>${l}<input type="${t}" data-k="${k}" value="${esc(P[k] || '')}" placeholder="${ph}"></label>`).join('')}
      <label>Phone<div class="phonef"><span>+1</span><input type="tel" data-k="phone" value="${esc(localPhone(P.phone))}" placeholder="604-555-0100"></div></label>
      <label>I am a<select data-k="role"><option value="realtor"${P.role !== 'broker' ? ' selected' : ''}>REALTOR®</option><option value="broker"${P.role === 'broker' ? ' selected' : ''}>Mortgage broker</option></select></label></div>
      <div class="two">${['photo', 'logo'].map((k) => `<div class="upw"><label class="up"><span id="ph-${k}"></span><span>Your ${k}<br><b id="lb-${k}"></b></span><input type="file" accept="image/*" data-img="${k}"></label><button type="button" class="rm" data-rm="${k}" aria-label="Remove your ${k}" title="Remove" hidden>✕</button></div>`).join('')}</div>
      <button type="button" class="btn wide" data-p="list">Done</button>`;
  } else if (!pro) {
    body = `${head('Sections')}<div class="lockbox"><span>With Pro you choose your areas and sections, move them around, and save your own template.</span><button type="button" class="btn sm" id="up4">Upgrade to Pro</button></div>`;
  } else if (PS.m === 'add') {
    body = `${head('Add a section', true)}<p class="hint">Click one to add it to the end of your report. Then drag it where you want it.</p>
      <div class="lib">${SECTIONS.filter(([k]) => k !== 'growth' || D.growth).map(([k, l, d]) => { const has = L.sections.includes(k); return `<div class="it${has ? ' done' : ''}"><span class="ic">${SIC[k]}</span><div><b>${l}</b><small>${d}</small></div>${has ? '<span class="added">Added</span>' : `<button type="button" class="add" data-addk="${k}">+ Add</button>`}</div>`; }).join('')}</div>`;
  } else if (PS.m === 'edit' && L.sections.includes(PS.k)) {
    const k = PS.k, c = L.conf[k] || {}, i = L.sections.indexOf(k);
    let b = '';
    if (PS.tab === 'data') {
      if (!USES_AREAS.includes(k)) b = `<p class="hint">${k === 'compare' ? 'This section always shows every area, ranked by typical price.' : 'This section shows your photo, your details and a message box for clients. Change your details from the menu under your photo.'}</p>`;
      else { const own = !!c.areas, ar = c.areas || L.areas, free = areasOf(D).filter((a) => !ar.includes(a));
        b = `<span class="lbl2">Areas in this section</span><div class="seg2"><button type="button" data-own="0" aria-pressed="${!own}">Same as the report</button><button type="button" data-own="1" aria-pressed="${own}">Choose</button></div>
          ${own ? `<div class="chips2">${ar.map((a) => `<span class="chip2">${esc(a)}${ar.length > 1 ? `<button type="button" data-arm="${esc(a)}" aria-label="Remove ${esc(a)}">✕</button>` : ''}</span>`).join('')}</div>
            ${ar.length < MAX_AREAS ? `<label class="addl">+ Add an area (up to ${MAX_AREAS})<select data-aadd><option value="">Add an area</option>${free.map((a) => `<option>${esc(a)}</option>`).join('')}</select></label>` : ''}`
          : `<p class="hint">Uses the areas at the top of your report: ${L.areas.map(esc).join(', ')}.</p>`}
          ${USES_TYPES.includes(k) ? `<span class="lbl2">Home types</span><div class="chips2">${TYPE_KEYS.map((t) => { const on = !c.types || c.types.includes(t); return `<button type="button" class="pill2${on ? ' on' : ''}" data-ty="${t}" aria-pressed="${on}">${TYPE_NAME[t]}${on ? ' ✓' : ''}</button>`; }).join('')}</div>` : ''}
          <span class="lbl2">Compared with</span><div class="fake">Same month last year</div>`; }
    } else {
      const titled = !['numbers', 'contact'].includes(k);
      b = `${titled ? `<span class="lbl2">Title</span><input class="inp2" data-title value="${esc(c.title || '')}" placeholder="${esc(SEC[k].l)}">
        ${tgl('data-cf="sub"', 'Show the line under the title', c.sub !== false)}` : '<p class="hint">This section uses its own titles.</p>'}
        ${k === 'market' ? tgl('data-cf="note"', 'Show a one-line explanation', c.note !== false) : ''}
        ${PAIRABLE.includes(k) ? `<span class="lbl2">Size</span><select class="inp2" data-size><option value="half"${c.size !== 'full' ? ' selected' : ''}>Half width (sits next to another section)</option><option value="full"${c.size === 'full' ? ' selected' : ''}>Full width</option></select>` : ''}
        <span class="lbl2">Position</span><div class="mv2"><button type="button" data-mv="-1"${i ? '' : ' disabled'}>↑ Move up</button><button type="button" data-mv="1"${i < L.sections.length - 1 ? '' : ' disabled'}>↓ Move down</button></div>`;
    }
    body = `${head('Edit section', true)}<p class="secname">${esc(c.title || SEC[k].l)}</p><div class="tabs2"><button type="button" data-tab="data" aria-selected="${PS.tab === 'data'}">Data</button><button type="button" data-tab="settings" aria-selected="${PS.tab === 'settings'}">Settings</button></div>${b}
      <button type="button" class="rmsec" data-hide${L.sections.length > 1 ? '' : ' disabled'}>Remove this section</button>`;
  } else {
    if (PS.m !== 'list') PS = { m: 'list', k: PS.k };
    const off = SECTIONS.filter(([k]) => !L.sections.includes(k) && (k !== 'growth' || D.growth));
    body = `${head('Sections')}<p class="hint">Click a section to select it. Switch it off to take it off your report. Drag to reorder, here or on the report.</p>
      <div class="grp">On your report <span>${L.sections.length}</span></div>
      <ol class="slist">${L.sections.map((k) => `<li draggable="true" data-sk="${k}" class="${PS.k === k ? 'sel' : ''}"><span class="h" aria-hidden="true">⋮⋮</span><span class="ic">${SIC[k]}</span><b>${esc(L.conf[k]?.title || SEC[k].l)}</b><button type="button" class="e" data-ek="${k}">Edit</button><label class="swl" title="Show on your report"><input type="checkbox" data-on="${k}" checked${L.sections.length > 1 ? '' : ' disabled'}><span class="sw2" aria-hidden="true"></span></label></li>`).join('')}</ol>
      ${off.length ? `<div class="grp">Not on your report <span>${off.length}</span></div><ol class="slist off">${off.map(([k]) => `<li data-ok="${k}"><span class="ic">${SIC[k]}</span><b>${SEC[k].l}</b><label class="swl" title="Add to your report"><input type="checkbox" data-on="${k}"><span class="sw2" aria-hidden="true"></span></label></li>`).join('')}</ol>` : ''}
      <div class="grp" style="margin-top:14px">Options</div>${L.areas.length > 1 ? `<div class="seg2" style="margin-bottom:6px"><button type="button" data-vw="side" aria-pressed="${L.view === 'side'}">Side by side</button><button type="button" data-vw="one" aria-pressed="${L.view === 'one'}">One at a time</button></div>` : ''}
      ${tgl('data-lt="agentTop"', 'Show my name and photo at the top', L.agentTop)}${tgl('data-lt="clientAreas"', 'Clients can add or remove areas', L.clientAreas)}`;
  }
  if (pro && PS.m !== 'details') { const m = mode(), isDef = sameLayout(L, { ...DEFAULT_LAYOUT, areas: L.areas });
    foot = m === 'template' ? `<span class="st"><i class="ok"></i>Using your template. Changes save to it.</span>${isDef ? '' : '<button type="button" class="linkbtn" id="ltreset">Back to the default layout</button>'}`
      : `<span class="st"><i></i>${isDef ? 'Using the default layout' : 'You changed the default layout'}</span><button type="button" class="btn wide" id="savetpl">Save as my template</button><span class="small muted center">Every new month opens with your template.</span>${isDef ? '' : '<button type="button" class="linkbtn" id="ltreset">Back to the default layout</button>'}`; }
  el.innerHTML = `<div class="pbody">${body}</div>${foot ? `<div class="pfoot">${foot}</div>` : ''}`;
  if (PS.m === 'details') thumbs();
}
// One set of listeners for the panel, whatever it is showing.
function wirePanel() {
  const el = $('#dpanel'); if (!el || el._w) return; el._w = 1;
  el.addEventListener('click', (e) => { const t = e.target;
    if (t.closest('.swl')) return; // the on/off switches are handled on change
    const b = t.closest('button');
    if (!b) { const li = t.closest('[data-sk]'); if (li) selectSec(li.dataset.sk, true); return; }
    if (b.disabled) return; const d = b.dataset, L = cur(), k = PS.k;
    if (d.p) { PS = { m: d.p, k: PS.k }; return drawPanel(); }
    if (d.ek) { PS = { m: 'edit', k: d.ek, tab: 'data' }; drawPanel(); return selectSec(d.ek, true); }
    if (d.tab) { PS.tab = d.tab; return drawPanel(); }
    if (d.addk) { setLayout({ sections: [...L.sections, d.addk] }); PS = { m: 'list', k: d.addk }; drawPanel(); return setTimeout(() => selectSec(d.addk, true), 80); }
    if (d.own) return setConf(k, { areas: d.own === '1' ? [...L.areas] : undefined });
    if (d.arm) return setConf(k, { areas: (L.conf[k]?.areas || L.areas).filter((a) => a !== d.arm) });
    if (d.ty) { const on = L.conf[k]?.types || [...TYPE_KEYS], next = on.includes(d.ty) ? on.filter((x) => x !== d.ty) : [...on, d.ty];
      if (!next.length) return alertMsg('Keep at least one home type.', true); return setConf(k, { types: next.length === 3 ? undefined : TYPE_KEYS.filter((x) => next.includes(x)) }); }
    if (d.mv) { const s2 = [...L.sections], i = s2.indexOf(k), j = i + +d.mv; [s2[i], s2[j]] = [s2[j], s2[i]]; setLayout({ sections: s2 }); return setTimeout(() => selectSec(k, true), 80); }
    if ('hide' in d) { setLayout({ sections: L.sections.filter((x) => x !== k) }); PS = { m: 'list' }; return drawPanel(); }
    if (d.vw) return setLayout({ view: d.vw });
    if (b.id === 'ltreset') { if (!confirm('Go back to the default sections and order?')) return; return setLayout({ ...DEFAULT_LAYOUT, areas: L.areas }); }
    if (b.id === 'savetpl') { P.show = { ...showOf(P), ...snap(cur()), mode: 'template', template: snap(cur()) }; touch('show'); drawTop(); drawPanel(); return alertMsg('Saved as your template. Every new month opens this way.'); }
    if (b.id === 'up4') return portal();
    if (d.rm) { P[d.rm] = ''; touch(d.rm); thumbs(); later(); return alertMsg(`Your ${d.rm} was removed.`); } });
  el.addEventListener('change', async (e) => { const t = e.target, k = PS.k, L = cur();
    if (t.dataset.on) { const s = t.dataset.on; if (t.checked) { setLayout({ sections: [...L.sections, s] }); PS = { m: 'list', k: s }; drawPanel(); return setTimeout(() => selectSec(s, true), 80); }
      if (L.sections.length < 2) { t.checked = true; return; } if (PS.k === s) PS.k = null; return setLayout({ sections: L.sections.filter((x) => x !== s) }); }
    if (t.matches('[data-aadd]') && t.value) return setConf(k, { areas: [...(L.conf[k]?.areas || L.areas), t.value] });
    if (t.dataset.cf) return setConf(k, { [t.dataset.cf]: t.checked ? undefined : false });
    if (t.matches('[data-size]')) return setConf(k, { size: t.value === 'full' ? 'full' : undefined });
    if (t.dataset.lt) return setLayout({ [t.dataset.lt]: t.checked });
    if (t.dataset.k === 'role') { P.role = t.value; touch('role'); return later(); }
    if (t.dataset.k === 'phone') t.value = localPhone(t.value);
    const im = t.dataset.img; if (!im || !t.files[0]) return;
    try { const v = await pickImage(im, t.files[0]); if (v) { P[im] = v; touch(im); thumbs(); later(); } } catch (err) { alertMsg(err.message, true); } t.value = ''; });
  let tT; el.addEventListener('input', (e) => { const t = e.target;
    if (t.matches('[data-title]')) { clearTimeout(tT); tT = setTimeout(() => setConf(PS.k, { title: t.value.trim() || undefined }), 350); return; }
    const k = t.dataset.k; if (!k || k === 'role') return; let v = t.value.trim();
    if (k === 'website' && v && !/^https?:\/\//.test(v)) v = 'https://' + v; if (k === 'phone') v = fullPhone(v); P[k] = v; touch(k); later(); });
  // Drag to reorder the list.
  let drag = null;
  el.addEventListener('dragstart', (e) => { const li = e.target.closest('[data-sk]'); if (!li) return; drag = li.dataset.sk; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', drag); } catch {} });
  el.addEventListener('dragover', (e) => { const li = e.target.closest('[data-sk]'); if (!li || !drag) return; e.preventDefault(); el.querySelectorAll('[data-sk]').forEach((x) => x.classList.toggle('over', x === li && x.dataset.sk !== drag)); });
  el.addEventListener('dragend', () => { drag = null; el.querySelectorAll('[data-sk]').forEach((x) => x.classList.remove('dragging', 'over')); });
  el.addEventListener('drop', (e) => { const li = e.target.closest('[data-sk]'); if (!li || !drag) return; e.preventDefault(); const all = cur().sections, s2 = all.filter((x) => x !== drag), at = s2.indexOf(li.dataset.sk);
    s2.splice(all.indexOf(drag) < all.indexOf(li.dataset.sk) ? at + 1 : at, 0, drag); const k = drag; drag = null; setLayout({ sections: s2 }); setTimeout(() => selectSec(k, true), 80); });
}

/* Menu under the agent's photo. */
function meMenu(btn) {
  if (btn.parentElement.querySelector('.amenu')) return closeMenu(); closeMenu();
  const m = document.createElement('div'); m.className = 'shmenu amenu'; m.setAttribute('role', 'menu');
  m.innerHTML = [['details', 'Your details'], ['account', 'Account and billing'], ['history', 'Your reports'], ['logout', 'Log out']].map(([k, l]) => `${k === 'logout' ? '<hr>' : ''}<button type="button" role="menuitem" data-mm="${k}">${l}</button>`).join('');
  btn.parentElement.appendChild(m);
  m.onclick = (e) => { const b = e.target.closest('[data-mm]'); if (!b) return; closeMenu(); const k = b.dataset.mm;
    if (k === 'details') { PS = { m: 'details', k: PS.k }; return drawPanel(); } if (k === 'logout') return $('#logout').click(); show(k); };
  setTimeout(() => document.addEventListener('click', function off(ev) { if (!ev.target.closest('.amenu') && !ev.target.closest('#mebtn')) { closeMenu(); document.removeEventListener('click', off, true); } }, true));
}

/* Share: send the report, or preview an image or the PDF before downloading or posting. */
function shareDrop(btn) {
  if (btn.parentElement.querySelector('.shmenu')) return closeMenu(); if (!ready()) return;
  saveNow(); closeMenu(); const pro = isPro(), m = document.createElement('div'); m.className = 'shmenu dmenu'; m.setAttribute('role', 'menu');
  const it = (k, ic, l, sub, off, pv) => `<button type="button" role="menuitem" data-s="${k}"${off ? ' disabled' : ''}><span class="i">${sv(ic)}</span><span><b>${l}</b>${sub ? `<small>${sub}</small>` : ''}</span>${pv ? `<em>${off ? 'Pro' : 'Preview ›'}</em>` : ''}</button>`;
  m.innerHTML = `<p class="mh">Send your report</p>${it('copy', 'link', 'Copy link', 'Paste it in a text, email or post')}${it('email', 'mail', 'Email for your clients', 'A finished message for Gmail or your CRM')}${it('qr', 'qr', 'QR code', 'For open houses, flyers and signs')}${isPhone() ? it('native', 'share', 'Share from this phone') : ''}
    <hr><p class="mh">Images and PDF</p>${it('post', 'ig', 'Instagram post', 'Square image', !pro, 1)}${it('story', 'ig', 'Instagram story', 'Tall image', !pro, 1)}${it('pdf', 'dl', 'PDF', 'To print or attach', !pro, 1)}`;
  btn.parentElement.appendChild(m);
  m.onclick = (e) => { const b = e.target.closest('[data-s]'); if (!b || b.disabled) return; const k = b.dataset.s; closeMenu();
    if (k === 'copy') return act('link', record('link'));
    if (k === 'email') return act('email', record('email'));
    if (k === 'native') { const t = shareText(reportLink(location.origin, P, 'Greater Vancouver')); navigator.share({ title: t.subject, text: t.short.replace(/: \S+$/, '.'), url: t.url }).catch(() => {}); return record('link').catch(() => {}); }
    if (k === 'qr') return record('link').then((x) => qrModal({ title: 'Your report QR code', text: 'Anyone who scans this with a phone camera opens your report.', url: linkOf(x), file: `${P.slug}-QR.png` })).catch((er) => alertMsg(er.message, true));
    openPreview(k); };
  setTimeout(() => document.addEventListener('click', function off(ev) { if (!ev.target.closest('.dmenu') && !ev.target.closest('#sharebtn')) { closeMenu(); document.removeEventListener('click', off, true); } }, true));
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
        <label class="lbl2">Area<select class="inp2" id="pvarea">${areasOf(D).map((a) => `<option${a === A0 ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
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
    <p class="small muted">Uses your current colours, font and what-to-show choices.${c.last_month ? ` Last posted: ${esc(c.last_month)}.` : ''}</p>
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
