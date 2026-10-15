// Client activity (D9): how long a client reads the report, which sections, and what they tap.
// One visit = one page open. The page sends its running totals now and then, and when it's hidden or closed.
// The server keeps them only for Pro agents; with a personal link the agent sees them per client, otherwise only as totals.

const id = () => { const a = new Uint8Array(9); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_'); };
// Reading time only counts while the page is on screen and the client did something in the last 2 minutes (or just opened it).
const IDLE = 120;

export function startVisit({ slug, p, month, root }) {
  const V = { id: id(), slug, p: p || '', m: month || '', sec: 0, end: false, dev: innerWidth < 700 ? 'phone' : 'computer', parts: {}, acts: [] };
  let last = Date.now(), sent = '', seen = Date.now();
  const busy = () => { last = Date.now(); };
  ['scroll', 'pointerdown', 'keydown', 'touchstart', 'mousemove'].forEach((ev) => addEventListener(ev, busy, { passive: true }));
  // The section in the middle of the screen is the one being read.
  const middle = () => { const el = document.elementFromPoint(innerWidth / 2, innerHeight * 0.45); return el?.closest?.('[data-sec]')?.dataset.sec || null; };
  setInterval(() => {
    if (document.hidden || (Date.now() - last) / 1000 > IDLE) return;
    V.sec++; const k = middle(); if (k) V.parts[k] = (V.parts[k] || 0) + 1;
    const doc = document.documentElement; if (scrollY + innerHeight >= doc.scrollHeight - 200) V.end = true;
    if (Date.now() - seen > 30000) send();
  }, 1000);
  function send() {
    seen = Date.now(); const body = JSON.stringify({ kind: 'visit', ...V });
    if (body === sent) return; sent = body;
    try { navigator.sendBeacon('/api/track', new Blob([body], { type: 'text/plain' })); } catch {}
  }
  addEventListener('visibilitychange', () => document.hidden && send());
  addEventListener('pagehide', send);
  // What the client tapped: contact, email, text, copy, a home type in Neighbourhoods, an added area.
  root.addEventListener('click', (e) => { const t = e.target.closest('button,a'); if (!t) return; const d = t.dataset;
    if (d.id === 'ctog') act('contact'); else if (d.id === 'mail') act('email'); else if (d.id === 'sms') act('text'); else if (d.id === 'copy') act('copy');
    else if (d.htype) act('type:' + d.htype); }, true);
  root.addEventListener('change', (e) => { if (e.target.dataset?.id === 'add' && e.target.value) act('area:' + e.target.value); }, true);
  function act(a) { if (V.acts.length < 40 && V.acts[V.acts.length - 1] !== a) V.acts.push(a.slice(0, 50)); }
  setTimeout(send, 1500);
  return { act, month(k) { if (k) { V.m = k; act('month:' + k); } } };
}
