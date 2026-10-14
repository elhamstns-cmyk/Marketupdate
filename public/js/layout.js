// The rules for an agent's report layout, shared by the browser (board.js, app.js) and the server (lib/util.js).
// Keep this file free of DOM code and imports, so Node can load it too. Change section ids and settings HERE only.

/* ---------- sections ---------- */
// [id, name, one-line description]. The order here is the order in the "Add a section" list.
export const SECTIONS = [
  ['numbers', 'Key numbers', 'Price, homes sold, homes for sale, days on market'],
  ['trend', 'Typical price over 12 months', 'Line graph, one line per area'],
  ['market', "Buyer's or seller's market?", 'Where each area sits on the scale'],
  ['types', 'Prices by home type', 'Detached, townhouse and condo, with pictures'],
  ['hoods', 'Neighbourhoods', "Your client's neighbourhood, every neighbourhood at a glance, who grew most"],
  ['growth', 'Long-term price growth', 'Growth over 3, 5 and 10 years'],
  ['summary', 'Summary', 'The key points in plain words'],
  ['sold', 'Homes sold each month', 'Bar chart of the last 12 months'],
  ['compare', 'How areas compare', 'Every area ranked by price'],
  ['contact', 'Contact me', 'Your photo and a message box for clients'],
];
export const SEC_IDS = SECTIONS.map((s) => s[0]);
// Sections added after agents started saving layouts. A layout saved before one existed gets it once (see layoutOf).
export const NEW_SECTIONS = ['hoods'];
export const MAX_AREAS = 6;
export const TYPE_KEYS = ['detached', 'townhome', 'condo'];
// The parts of the Neighbourhoods section an agent can switch off (labels live in hoods.js → BLOCKS).
// 'tiles' is the ranked list of every neighbourhood (it replaced the coloured tiles and "Who grew the most").
export const HOOD_BLOCK_KEYS = ['hero', 'tiles', 'compare', 'take'];
export const DEFAULT_LAYOUT = { sections: SEC_IDS.filter((k) => k !== 'compare'), areas: ['Greater Vancouver'], agentTop: true, clientAreas: true, view: 'side', conf: {} };
// The older on/off switches (before sections). Still saved so old reports keep working.
const SHOW_KEYS = ['prices', 'changes', 'sold', 'forsale', 'days', 'market', 'detached', 'townhome', 'condo', 'summary', 'trend', 'compare', 'picker'];
const IMG_KEYS = ['price', 'forsale', 'market', 'sold', 'photo'];

/* ---------- small checks ---------- */
const AREA = /^[A-Za-z .'-]{2,40}$/;
const NAME_OK = (v) => typeof v === 'string' && v.length > 1 && v.length < 60;
const uniq = (list, ok) => list.filter((v, i, a) => ok(v) && a.indexOf(v) === i);
// Areas: text, no repeats, at most MAX_AREAS. With `all` (this month's area names) only real areas are kept.
export const cleanAreas = (a, all) => (Array.isArray(a) ? uniq(a, (x) => typeof x === 'string' && (all ? all.includes(x) : AREA.test(x))).slice(0, MAX_AREAS) : undefined);

// Neighbourhoods: city, neighbourhood shown first, compare with, home type, blocks switched off, the agent's take.
export function cleanHoods(x) {
  const y = {};
  for (const f of ['city', 'home', 'cmp']) if (NAME_OK(x[f])) y[f] = x[f];
  if (['d', 't', 'c'].includes(x.type)) y.type = x.type;
  if (Array.isArray(x.off)) { const o = uniq(x.off, (b) => HOOD_BLOCK_KEYS.includes(b)); if (o.length) y.off = o; }
  if (x.take === 'off' || x.take === 'own') y.take = x.take;
  if (typeof x.text === 'string' && x.text.trim()) y.text = x.text.trim().slice(0, 600);
  return y;
}
// Per-section choices: title, own areas, home types, line under the title, explanation, width (+ Neighbourhoods settings).
export function cleanConf(c, all) {
  const o = {}; if (!c || typeof c !== 'object') return o;
  for (const k of SEC_IDS) {
    const x = c[k]; if (!x || typeof x !== 'object') continue; const y = {};
    if (typeof x.title === 'string' && x.title.trim()) y.title = x.title.trim().slice(0, 70);
    const a = cleanAreas(x.areas, all); if (a?.length) y.areas = a;
    if (Array.isArray(x.types)) { const t = x.types.filter((v) => TYPE_KEYS.includes(v)); if (t.length && t.length < 3) y.types = t; }
    for (const f of ['sub', 'note']) if (x[f] === false) y[f] = false;
    if (x.size === 'full') y.size = 'full';
    if (k === 'hoods') Object.assign(y, cleanHoods(x));
    if (Object.keys(y).length) o[k] = y;
  }
  return o;
}

/* ---------- saving (server) ---------- */
// A layout as it is stored: only the keys the agent actually set.
export function cleanLayout(s) {
  const o = {}; if (!s || typeof s !== 'object') return o;
  if (Array.isArray(s.sections)) o.sections = uniq(s.sections, (k) => SEC_IDS.includes(k));
  if (Array.isArray(s.known)) o.known = uniq(s.known, (k) => SEC_IDS.includes(k));
  const a = cleanAreas(s.areas); if (a) o.areas = a;
  for (const k of ['agentTop', 'clientAreas']) if (k in s) o[k] = s[k] !== false;
  if (s.view === 'one' || s.view === 'side') o.view = s.view;
  if (s.conf) o.conf = cleanConf(s.conf);
  return o;
}
// Everything in profiles.show: the older switches, the current layout, the saved template, and what's on the Instagram images.
export function cleanShow(s) {
  if (!s || typeof s !== 'object') return null;
  const o = { ...Object.fromEntries(SHOW_KEYS.map((k) => [k, s[k] !== false])), ...cleanLayout(s) };
  if (s.template && typeof s.template === 'object') o.template = cleanLayout(s.template);
  if (s.mode === 'template' || s.mode === 'default') o.mode = s.mode;
  if (s.img && typeof s.img === 'object') { o.img = {};
    for (const k of ['post', 'story']) { const x = s.img[k]; if (x && typeof x === 'object') o.img[k] = Object.fromEntries(IMG_KEYS.filter((f) => f in x).map((f) => [f, x[f] !== false])); } }
  return o;
}

/* ---------- drawing (browser) ---------- */
// The layout to draw: the agent's saved choices with defaults filled in, checked against this month's areas (`all`).
export function layoutOf(show, all) {
  const s = show || {};
  const sections = Array.isArray(s.sections) ? uniq(s.sections, (k) => SEC_IDS.includes(k)) : [...DEFAULT_LAYOUT.sections];
  // Saved before a new section existed (no `known` list): add it once, after "Prices by home type". Removing it later sticks.
  if (Array.isArray(s.sections) && !Array.isArray(s.known)) for (const k of NEW_SECTIONS) if (!sections.includes(k)) { const i = sections.indexOf('types'); sections.splice(i < 0 ? Math.max(0, sections.length - 1) : i + 1, 0, k); }
  let areas = cleanAreas(s.areas, all) || [];
  if (!areas.length) areas = ['Greater Vancouver'];
  return { sections, areas, agentTop: s.agentTop !== false, clientAreas: s.clientAreas !== false, view: s.view === 'one' ? 'one' : 'side', conf: cleanConf(s.conf, all) };
}
export const sameLayout = (a, b) => JSON.stringify([a.sections, a.agentTop, a.clientAreas, a.view, a.conf || {}]) === JSON.stringify([b.sections, b.agentTop, b.clientAreas, b.view, b.conf || {}]);
