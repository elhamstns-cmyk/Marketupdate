import { esc, areasOf } from './report.js';
import { reportLink, emailDraft, caption, socialImage, download } from './exports.js';

const $ = (s) => document.querySelector(s), main = $('#main');
const cfg = await (await fetch('/api/config')).json();
$('#site').textContent = cfg.siteName;
const qs = new URLSearchParams(location.search);
if (qs.get('plan')) sessionStorage.setItem('mup_want', JSON.stringify({ plan: qs.get('plan'), cycle: qs.get('cycle') || 'monthly' }));
const want = JSON.parse(sessionStorage.getItem('mup_want') || 'null');

/* ---------- sign-in (email code or link, no password) ---------- */
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

function showLogin() {
  main.innerHTML = `<div class="card" style="max-width:460px;margin:30px auto"><h2>Log in or sign up</h2>
    <p class="muted">Enter your email and we will send you a sign-in link and code. No password to remember.</p>
    <form id="f1" class="field"><label for="em">Email</label><input type="email" id="em" required autocomplete="email" placeholder="you@yourbrokerage.com"><button class="btn" style="margin-top:8px">Email me a sign-in code</button></form>
    <form id="f2" class="field" hidden><p class="ok">Check your inbox. Click the link in the email, or type the code here.</p><label for="code">Code from the email</label><input type="text" id="code" inputmode="numeric" autocomplete="one-time-code"><button class="btn" style="margin-top:8px">Continue</button></form>
    <p class="err" id="lerr"></p></div>`;
  let email;
  $('#f1').onsubmit = async (e) => { e.preventDefault(); email = $('#em').value.trim(); $('#lerr').textContent = '';
    const r = await fetch(`${SB}/auth/v1/otp?redirect_to=${encodeURIComponent(location.origin + '/app')}`, { method: 'POST', headers: H, body: JSON.stringify({ email, create_user: true }) });
    if (r.ok) { $('#f2').hidden = false; $('#code').focus(); } else $('#lerr').textContent = 'We could not send the email. Please check the address and try again in a minute.'; };
  $('#f2').onsubmit = async (e) => { e.preventDefault();
    const r = await fetch(`${SB}/auth/v1/verify`, { method: 'POST', headers: H, body: JSON.stringify({ type: 'email', email, token: $('#code').value.trim() }) });
    if (r.ok) { keep(await r.json()); start(); } else $('#lerr').textContent = 'That code did not work. Please check it or request a new one.'; };
}

/* ---------- dashboard ---------- */
let P = {}, D = null, active = false;
const FIELDS = [['name', 'Your name', 'text', 'Jane Smith'], ['brokerage', 'Brokerage', 'text', 'RE/MAX, Royal LePage, Oakwyn…'], ['phone', 'Phone', 'tel', '604-555-0100'],
  ['contact_email', 'Email clients should use', 'email', ''], ['website', 'Website (optional)', 'text', 'yourname.ca'], ['tagline', 'Line under your name (optional)', 'text', 'Vancouver Real Estate'], ['licence', 'Licence number (optional)', 'text', '']];

function shrink(file, max, type) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => { const k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas');
  c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); ok(c.toDataURL(type, 0.86)); }; i.onerror = no; i.src = URL.createObjectURL(file); }); }

async function start() {
  if (!cfg.demo && !session) return showLogin();
  try {
    const j = await api('/api/me');
    if (cfg.demo) { P = { plan: 'pro', slug: 'demo', ...JSON.parse(localStorage.getItem('mup_demo_profile') || '{}') }; D = j.report; active = true; }
    else { P = j.profile; D = j.report; active = j.active; $('#logout').hidden = false; $('#billing').hidden = !P.stripe_customer_id; }
  } catch (e) { if (e.message !== 'signed out') main.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  draw();
}
$('#logout').onclick = () => { keep(null); location.href = '/'; };
$('#billing').onclick = async () => { location.href = (await api('/api/portal', {})).url; };

function draw() {
  const ready = P.name && P.brokerage && P.phone;
  main.innerHTML = `${cfg.demo ? '<p class="note">Preview mode: nothing is saved to a server and no payment is taken. Your details stay in this browser.</p>' : ''}
    ${qs.has('welcome') ? '<p class="note ok">You are subscribed. Welcome aboard.</p>' : ''}
    <section class="card" id="profile"></section>
    ${!active ? '<section class="card" id="plans"></section>' : ''}
    <section class="card" id="send"></section>`;
  drawProfile(!ready); if (!active) drawPlans(); drawSend(ready);
}

function drawProfile(open) {
  const el = $('#profile');
  if (!open) { el.innerHTML = `<div class="h" style="justify-content:space-between"><div class="row">${P.logo ? `<img class="thumb" src="${P.logo}" alt="">` : ''}<div><strong>${esc(P.name)}</strong><br><span class="muted small">${esc(P.brokerage)} · ${esc(P.phone)}</span></div></div><button class="btn ghost sm" id="edit">Edit my details</button></div>`;
    $('#edit').onclick = () => drawProfile(true); return; }
  el.innerHTML = `<div><p class="eyebrow">Step 1</p><h2>Your details</h2><p class="muted">These appear on every report. Fill them in once.</p></div>
    <form id="pf"><div class="form">${FIELDS.map(([k, l, t, ph]) => `<div class="field"><label for="p-${k}">${l}</label><input type="${t}" id="p-${k}" value="${esc(P[k] || '')}" placeholder="${ph}" ${['name', 'brokerage', 'phone'].includes(k) ? 'required' : ''}></div>`).join('')}
      <div class="field"><label for="p-logo">Logo (optional)</label><input type="file" id="p-logo" accept="image/*"><div id="logoprev">${P.logo ? `<img class="thumb" src="${P.logo}" alt="">` : ''}</div></div>
      <div class="field"><label for="p-photo">Your photo (optional)</label><input type="file" id="p-photo" accept="image/*"><div id="photoprev">${P.photo ? `<img class="thumb" src="${P.photo}" alt="">` : ''}</div></div></div>
      <label style="display:flex;gap:10px;align-items:flex-start;margin:16px 0;font-weight:400;color:var(--ink);font-size:1rem"><input type="checkbox" id="p-gvr" ${P.gvr_member ? 'checked' : ''} required style="margin-top:6px"> I am a licensed REALTOR® and a member of Greater Vancouver REALTORS®.</label>
      <div class="row"><button class="btn">Save my details</button><span id="pmsg"></span></div></form>`;
  const imgs = { logo: P.logo || '', photo: P.photo || '' };
  for (const k of ['logo', 'photo']) $(`#p-${k}`).onchange = async (e) => { const f = e.target.files[0]; if (!f) return;
    try { imgs[k] = await shrink(f, k === 'logo' ? 480 : 320, k === 'logo' ? 'image/png' : 'image/jpeg'); $(`#${k}prev`).innerHTML = `<img class="thumb" src="${imgs[k]}" alt="">`; } catch { $('#pmsg').innerHTML = '<span class="err">That image could not be read. Try a JPG or PNG.</span>'; } };
  $('#pf').onsubmit = async (e) => { e.preventDefault(); const data = { ...imgs, gvr_member: $('#p-gvr').checked };
    for (const [k] of FIELDS) data[k] = $(`#p-${k}`).value.trim();
    if (data.website && !/^https?:\/\//.test(data.website)) data.website = 'https://' + data.website;
    $('#pmsg').textContent = 'Saving…';
    try { if (cfg.demo) { P = { ...P, ...data }; localStorage.setItem('mup_demo_profile', JSON.stringify(P)); } else P = (await api('/api/me', data)).profile; draw(); }
    catch (err) { $('#pmsg').innerHTML = `<span class="err">${esc(err.message)}</span>`; } };
}

function drawPlans() {
  let cycle = want?.cycle || 'monthly';
  const el = $('#plans'), pl = cfg.plans;
  const paint = () => { el.innerHTML = `<div><p class="eyebrow">Step 2</p><h2>Choose your plan</h2></div>
    <div class="toggle" role="group" style="align-self:flex-start;margin:0"><button type="button" data-c="monthly" aria-pressed="${cycle === 'monthly'}">Monthly</button><button type="button" data-c="yearly" aria-pressed="${cycle === 'yearly'}">Yearly, 2 months free</button></div>
    <div class="plans" style="margin:18px 0 0;max-width:none">
      <div class="card plan"><h3>${pl.basic.name}</h3><div class="price">$${pl.basic[cycle]}<small> / ${cycle === 'yearly' ? 'year' : 'month'}</small></div><p class="muted">Greater Vancouver report, your branded link and client email.</p><button class="btn ghost" data-p="basic">Choose ${pl.basic.name}</button></div>
      <div class="card plan rec"><span class="badge">Recommended</span><h3>${pl.pro.name}</h3><div class="price">$${pl.pro[cycle]}<small> / ${cycle === 'yearly' ? 'year' : 'month'}</small></div><p class="muted">Every city, plus PDF and social images.</p><button class="btn" data-p="pro">Choose ${pl.pro.name}</button></div>
    </div><p class="err" id="plerr"></p>`; };
  paint();
  el.onclick = async (e) => { const c = e.target.closest('[data-c]'), p = e.target.closest('[data-p]');
    if (c) { cycle = c.dataset.c; paint(); }
    if (p) { if (!(P.name && P.gvr_member)) { $('#plerr').textContent = 'Please save your details first (step 1).'; return; }
      p.disabled = true; p.textContent = 'Opening secure checkout…';
      try { location.href = (await api('/api/checkout', { plan: p.dataset.p, cycle })).url; } catch (err) { $('#plerr').textContent = err.message; paint(); } } };
}

function drawSend(ready) {
  const el = $('#send'), step = active ? 'Step 2' : 'Step 3';
  if (!active) { el.innerHTML = `<div class="locked"><p class="eyebrow">${step}</p><h2>Send this month's report</h2><p class="muted">Available as soon as you subscribe.</p></div><a class="btn ghost" href="/r/demo" target="_blank" style="align-self:flex-start">See a sample report</a>`; return; }
  if (!D) { el.innerHTML = `<p class="eyebrow">${step}</p><h2>Your first report is on its way</h2><p class="muted">We will email you as soon as this month's report is published.</p>`; return; }
  if (!ready) { el.innerHTML = `<div class="locked"><p class="eyebrow">${step}</p><h2>Send the ${esc(D.month)} report</h2><p class="muted">Save your details above and your report appears here.</p></div>`; return; }
  const pro = P.plan === 'pro', areas = areasOf(D), me = cfg.demo ? '?me' : '';
  let area = 'Greater Vancouver';
  el.innerHTML = `<div><p class="eyebrow">${step}</p><h2>Send the ${esc(D.month)} report</h2></div>
    <div class="field" style="max-width:420px"><label for="area">What do you want to send?</label><select id="area" ${pro ? '' : 'disabled'}>${areas.map((a) => `<option>${a}</option>`).join('')}</select>
      ${pro ? '' : '<span class="small muted">Individual cities, PDF and social images are part of Pro. <a href="#" id="up">Upgrade</a></span>'}</div>
    <div class="grid2">
      <div class="card"><h3>Share your link</h3><p class="muted small">Interactive report for text, email, your CRM or your bio. The link stays the same every month.</p>
        <div class="linkbox"><input type="text" id="link" readonly><button class="btn sm" data-copy="link">Copy link</button></div><a class="btn ghost sm" id="open" target="_blank" style="align-self:flex-start">Preview it</a></div>
      <div class="card"><h3>Client email</h3><p class="muted small">Written with this month's figures. Paste it into Gmail, Outlook or your CRM.</p>
        <div class="row"><button class="btn sm" data-copy="rich">Copy formatted email</button><button class="btn ghost sm" data-copy="text">Copy plain text</button><button class="btn ghost sm" data-copy="subject">Copy subject line</button></div></div>
      <div class="card ${pro ? '' : 'locked'}"><h3>PDF</h3><p class="muted small">A one-page summary to print or attach.</p><a class="btn sm" id="pdf" target="_blank" style="align-self:flex-start">Open PDF version</a></div>
      <div class="card ${pro ? '' : 'locked'}"><h3>Social images</h3><p class="muted small">With the key numbers and your branding.</p>
        <div class="row"><button class="btn sm" data-img="post" ${pro ? '' : 'disabled'}>Download post</button><button class="btn sm" data-img="story" ${pro ? '' : 'disabled'}>Download story</button><button class="btn ghost sm" data-copy="caption" ${pro ? '' : 'disabled'}>Copy caption</button></div></div>
    </div><p id="smsg" class="ok" role="status"></p>`;
  const link = () => reportLink(location.origin, P, area);
  const sync = () => { $('#link').value = link(); $('#open').href = `/r/${P.slug}${me}` + link().replace(/^[^#]*/, '');
    if (pro) $('#pdf').href = `/r/${P.slug}/print?area=${encodeURIComponent(area)}${me ? '&me' : ''}`; else $('#pdf').removeAttribute('href'); };
  sync();
  $('#area').onchange = (e) => { area = e.target.value; sync(); };
  if ($('#up')) $('#up').onclick = async (e) => { e.preventDefault(); location.href = (await api('/api/portal', {})).url; };
  const say = (t) => { $('#smsg').textContent = t; setTimeout(() => ($('#smsg').textContent = ''), 2500); };
  el.onclick = async (e) => { const c = e.target.closest('[data-copy]'), i = e.target.closest('[data-img]');
    if (c) { const d = emailDraft(D, P, area, link()), k = c.dataset.copy;
      try { if (k === 'rich' && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([d.html], { type: 'text/html' }), 'text/plain': new Blob([d.text], { type: 'text/plain' }) })]);
        else await navigator.clipboard.writeText(k === 'link' ? link() : k === 'subject' ? d.subject : k === 'caption' ? caption(D, P, area, link()) : d.text);
        say('Copied. Paste it wherever you like.'); } catch { say('Copying was blocked by the browser. Select the text and copy it manually.'); } }
    if (i) { download(await socialImage(D, P, area, i.dataset.img), `${area.replace(/\s+/g, '-')}-${D.month.replace(' ', '-')}-${i.dataset.img}.png`); say('Image downloaded.'); } };
}
start();
