// Client activity (D9 and the Monday email): turns visits and Neighbourhoods views into plain facts per client.
// Shared by the browser (app.js) and the server (links, weekly). No DOM, no imports. Tested in tests/activity.test.mjs.
// No guessing: every line is something the client did.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (k) => `${MONTHS[+k.slice(5) - 1]} ${k.slice(0, 4)}`;
const TYPE = { d: 'detached homes', t: 'townhouses', c: 'condos' }, TYPE1 = { d: 'Detached', t: 'Townhouse', c: 'Condo' };
// Section names as agents know them.
export const PART = { numbers: 'Key numbers', trend: '12-month price', market: "Buyer's or seller's", types: 'Prices by home type', hoods: 'Neighbourhoods', growth: 'Long-term growth', summary: 'Summary', sold: 'Homes sold', compare: 'How areas compare', contact: 'Contact me' };
export const LEVEL = { hot: 'Very active', some: 'Some interest', quiet: 'Quiet lately', none: 'Not opened yet' };
export const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
export const mins = (s) => (s < 60 ? (s < 10 ? 'a few seconds' : `${Math.round(s)} sec`) : `${Math.round(s / 60)} min`);
const DAY = 864e5;

// link: a personal_links row. visits: its visits rows (any order). views: its hood_views rows. days: the period shown (7, 30 or 365).
export function activity(link, visits = [], views = [], { days = 30, now = Date.now(), latest = null } = {}) {
  const t = (v) => new Date(v.started_at).getTime(), since = now - days * DAY;
  const all = [...visits].sort((a, b) => t(b) - t(a)), V = all.filter((v) => t(v) >= since), prev = all.filter((v) => t(v) < since && t(v) >= since - days * DAY);
  const week = all.filter((v) => t(v) >= now - 7 * DAY), weekSec = week.reduce((s, v) => s + (v.seconds || 0), 0);
  const seconds = V.reduce((s, v) => s + (v.seconds || 0), 0), ends = V.filter((v) => v.reached_end).length;
  const lastAt = all[0]?.started_at || link.last_opened_at || null;
  const level = !all.length && !link.opens ? 'none' : week.length >= 3 || (week.length >= 2 && weekSec >= 300) ? 'hot' : all.some((v) => t(v) >= now - 30 * DAY) || (link.last_opened_at && new Date(link.last_opened_at).getTime() >= now - 30 * DAY) ? 'some' : 'quiet';
  // Seconds per section, most read first.
  const parts = {}; for (const v of V) for (const [k, s] of Object.entries(v.parts || {})) parts[k] = (parts[k] || 0) + s;
  // Visits per week, oldest first (8 weeks).
  const weeks = Array.from({ length: 8 }, (_, i) => all.filter((v) => t(v) <= now - (7 - i) * 7 * DAY && t(v) > now - (8 - i) * 7 * DAY).length);
  // Taps in the period.
  const acts = V.flatMap((v) => v.acts || []), months = [...new Set(acts.filter((a) => a.startsWith('month:')).map((a) => a.slice(6)).concat(latest ? V.map((v) => v.month) : []).filter((k) => k && k !== latest))].sort();
  const types = [...new Set(acts.filter((a) => a.startsWith('type:')).map((a) => a.slice(5)).filter((x) => x !== link.type))];
  const contact = acts.filter((a) => ['contact', 'email', 'text', 'copy'].includes(a)).length;
  // Neighbourhoods other than their own, most looked at first.
  const vw = views.filter((v) => new Date(v.created_at).getTime() >= since), looked = {};
  for (const v of vw) if (v.kind !== 'pick' && v.hood !== link.hood) looked[v.hood] = (looked[v.hood] || 0) + 1;
  const top = Object.entries(looked).sort((a, b) => b[1] - a[1]);
  const recent = all.slice(0, 5).map((v) => ({ at: v.started_at, seconds: v.seconds || 0, device: v.device, did: did(v, views, link) }));
  return { id: link.id, level, label: LEVEL[level], visits: V.length, prevVisits: prev.length, week: week.length, seconds, ends, lastAt,
    parts: Object.entries(parts).sort((a, b) => b[1] - a[1]).map(([k, s]) => [k, PART[k] || k, s]), weeks, months, types, contact, looked: top.slice(0, 4), recent, why: why({ level, top, types, months, contact, link }) };
}

// What happened in one visit, in plain words.
function did(v, views, link) {
  const a = new Date(v.started_at).getTime(), b = new Date(v.updated_at || v.started_at).getTime() + 60e3, out = [];
  const vs = views.filter((x) => { const c = new Date(x.created_at).getTime(); return c >= a - 5e3 && c <= b && x.hood !== link.hood; });
  const cmp = vs.find((x) => x.kind === 'compare'), pk = [...new Set(vs.filter((x) => x.kind === 'peek').map((x) => x.hood))];
  if (cmp) out.push(`compared ${cmp.hood} with ${link.hood}`); else if (pk.length) out.push(`looked at ${pk.slice(0, 2).join(' and ')}`);
  for (const x of [...new Set(v.acts || [])]) {
    if (x.startsWith('type:') && x.slice(5) !== link.type) out.push(`switched to ${TYPE1[x.slice(5)]}`);
    else if (x.startsWith('month:')) out.push(`looked back at ${monthName(x.slice(6))}`);
    else if (x.startsWith('area:')) out.push(`added ${x.slice(5)}`);
    else if (x === 'contact') out.push('opened Contact me');
    else if (x === 'email' || x === 'text') out.push(`tapped ${x === 'email' ? 'Email' : 'Text'} you`);
  }
  if (!out.length && v.reached_end) out.push('read to the end');
  return out.slice(0, 3);
}

// "Why it matters": only facts, then a nudge when they are active.
function why({ level, top, types, months, contact, link }) {
  const bits = [];
  if (top.length) bits.push(`They're comparing ${top[0][0]}${top[1] ? ` and ${top[1][0]}` : ''} with ${link.hood}${types.length ? `, and checking ${types.map((x) => TYPE[x]).join(' and ')}` : ''}.`);
  else if (types.length) bits.push(`They're checking ${types.map((x) => TYPE[x]).join(' and ')}, not only ${TYPE[link.type] || 'their home type'}.`);
  if (months.length) bits.push(`They looked back at ${months.slice(0, 2).map(monthName).join(' and ')}.`);
  if (contact) bits.push(`They opened your contact box${contact > 1 ? ` ${times(contact)}` : ''}.`);
  if (!bits.length && level !== 'hot') return null;
  if (level === 'hot') bits.push('A good time to reach out.');
  else if (level === 'some') bits.push('Worth a friendly check-in.');
  return bits.join(' ');
}
