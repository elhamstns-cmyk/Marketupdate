// Opens the real pages in a browser (sample mode) and checks they draw without errors.
// Needs Playwright. Without it these tests are skipped, so `npm test` still runs everywhere.
// Locally: npm i -g playwright (or set PLAYWRIGHT_MODULE to its index.mjs path).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

let pw = null;
for (const m of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs'].filter(Boolean)) {
  try { pw = await import(m); break; } catch {}
}
const skip = pw ? false : 'Playwright is not installed';
const PORT = 4400 + Math.floor(Math.random() * 500), BASE = `http://localhost:${PORT}`;
let server, browser;

before(async () => {
  if (skip) return;
  server = spawn(process.execPath, ['scripts/dev.mjs'], { env: { ...process.env, PORT: String(PORT), SUPABASE_URL: '' }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/api/config')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
  browser = await pw.chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

// Opens a page, collects script errors (font loading failures are ignored), runs the checks.
async function page(path, check, { width = 1240, setup } = {}) {
  const p = await browser.newPage({ viewport: { width, height: 900 } }), errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  if (setup) { await p.goto(BASE + '/app'); await p.evaluate(setup); }
  await p.goto(BASE + path); await p.waitForTimeout(1200);
  try { await check(p); assert.deepEqual(errors, []); } finally { await p.close(); }
}

test('the public report draws every default section, including Neighbourhoods', { skip }, () => page('/r/demo?areas=coquitlam', async (p) => {
  const secs = await p.$$eval('[data-sec]', (x) => x.map((e) => e.dataset.sec));
  for (const k of ['numbers', 'trend', 'market', 'hoods', 'summary']) assert.ok(secs.includes(k), `missing ${k}`);
  assert.ok(await p.$('.nb-ask'), 'the neighbourhood picker shows');
}));

test('Key numbers: the "since" menu changes every change, and days to sell sits with homes sold', { skip }, () => page('/r/demo?areas=coquitlam', async (p) => {
  const kc = () => p.$$eval('[data-sec="numbers"] .kc', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  assert.match((await kc())[0], /since Sep 2025/);
  assert.ok(await p.$('[data-sec="numbers"] .kn-pr .kpi:nth-of-type(2) .kl >> text=Average days to sell'), 'days to sell is next to homes sold');
  await p.selectOption('[data-sec="numbers"] select[data-nper] >> nth=1', 'm1');
  for (const t of await kc()) assert.match(t, /Aug 2026/);
  await p.selectOption('[data-sec="numbers"] select[data-nper] >> nth=0', 'y10');
  const t10 = await kc();
  assert.match(t10[0], /%.*since Sep 2016/);
  assert.match(t10[1], /No number yet for Sep 2016/);
}));

test('Key numbers with several areas: the column title follows the menu', { skip }, () => page('/r/demo?areas=coquitlam,burnaby-south', async (p) => {
  await p.selectOption('[data-sec="numbers"] select[data-nper] >> nth=0', 'y3');
  const th = await p.$$eval('[data-sec="numbers"] th .kn-sel', (x) => x.map((e) => e.textContent.trim()));
  assert.equal(th.length, 2); for (const t of th) assert.match(t, /^since Sep 2023/);
}));

test('adding a city adds a line to the 12-month chart', { skip }, () => page('/r/demo?areas=coquitlam,burnaby-north', async (p) => {
  const legend = await p.$$eval('.cd-trend .leg span', (x) => x.map((e) => e.textContent));
  assert.deepEqual(legend, ['Coquitlam', 'Burnaby North']);
}));

test('Homes sold with several areas: every city side by side, Greater Vancouver on its own row, bars or lines', { skip }, () => page('/r/demo?areas=greater-vancouver,coquitlam,burnaby-north,port-moody', async (p) => {
  const legend = await p.$$eval('.cd-sold .sd-leg span', (x) => x.map((e) => e.textContent));
  assert.deepEqual(legend, ['Coquitlam', 'Burnaby North', 'Port Moody']);
  assert.match(await p.textContent('.cd-sold .sd-gv'), /Greater Vancouver/);
  assert.match(await p.textContent('.cd-sold .sd-take'), /than last/);
  assert.equal(await p.$$eval('.cd-sold .sd-m', (x) => x[0].children.length), 3, 'one bar per city each month');
  assert.equal(await p.$$eval('.cd-sold .sd-chg > span', (x) => x.length), 4, 'each city and "vs …"');
  await p.click('.cd-sold [data-sv="lines"]');
  assert.equal(await p.$$eval('.cd-sold svg polyline', (x) => x.length), 3, 'one line per city');
}));

test('Homes sold with one area keeps the single bar chart', { skip }, () => page('/r/demo?areas=coquitlam', async (p) => {
  assert.ok(await p.$('.cd-sold .bars'));
  assert.equal(await p.$('.cd-sold .sd-gb'), null);
}));

test('Prices by home type, one city: a row per home type, a change column title and a key', { skip }, () => page('/r/demo?areas=coquitlam', async (p) => {
  assert.equal(await p.$$eval('.cd-types .ty-r', (x) => x.length), 3);
  assert.equal(await p.$('.cd-types [data-tt]'), null, 'no home-type tabs for one city');
  assert.match(await p.textContent('.cd-types .ty-h'), /Change since/);
  assert.match(await p.textContent('.cd-types .ty-story'), /less than a year ago/);
  assert.ok(await p.$('.cd-types .ty-key'));
}));

test('Prices by home type, several areas: tap a home type, cities by price, Greater Vancouver last', { skip }, () => page('/r/demo?areas=greater-vancouver,coquitlam,port-moody,burnaby-north', async (p) => {
  const names = () => p.$$eval('.cd-types .ty-n', (x) => x.map((e) => e.textContent.trim()));
  assert.deepEqual(await names(), ['Port Moody', 'Burnaby North', 'Coquitlam', 'Greater Vancouver']);
  await p.click('.cd-types [data-tt="condo"]');
  assert.deepEqual(await names(), ['Port Moody', 'Burnaby North', 'Coquitlam', 'Greater Vancouver']);
  assert.match(await p.textContent('.cd-types .ty-story'), /condos/);
  assert.equal(await p.getAttribute('.cd-types [data-tt="condo"]', 'aria-pressed'), 'true');
}));

test('a personal link opens on the client\'s neighbourhood', { skip }, () => page('/r/demo?p=x', async (p) => {
  const hero = await p.textContent('.nb-hero');
  assert.match(hero, /Prepared for the Chen family/); assert.match(hero, /Burke Mountain/);
}, { width: 390 }));

test('picking a neighbourhood and peeking at another works', { skip }, () => page('/r/demo?areas=coquitlam', async (p) => {
  await p.selectOption('[data-hpick]', 'Burke Mountain');
  assert.ok(await p.$('.nb-hero'));
  await p.click('.nb-li[data-hpeek]:not(.nb-me)');
  assert.match(await p.textContent('.nb-sheet'), /Compared with your area/);
}));

test('with several areas, Neighbourhoods shows a card for each and opens on the first city that has neighbourhoods', { skip }, () => page('/r/demo?areas=greater-vancouver,coquitlam,west-vancouver,north-vancouver', async (p) => {
  const cards = await p.$$eval('.cd-hoods .nb-cd', (x) => x.map((e) => e.textContent));
  assert.equal(cards.length, 4);
  assert.match(cards[0], /No neighbourhoods/);
  assert.match(await p.textContent('.cd-hoods .nb-cd[aria-pressed="true"]'), /Coquitlam/);
  assert.equal(await p.$('[data-hcity]'), null, 'the old City box is gone');
  // A city with no neighbourhoods explains itself and keeps the open city.
  await p.click('[data-hno="Greater Vancouver"]');
  assert.match(await p.textContent('.nb-msg'), /isn't split into neighbourhoods/);
  assert.match(await p.textContent('.cd-hoods [data-hcard][aria-pressed="true"]'), /Coquitlam/);
  // Tapping another card switches the list; the city's own row is in it.
  await p.click('[data-hcard="West Vancouver"]');
  assert.match(await p.textContent('.nb-hd'), /Every West Vancouver neighbourhood/);
  assert.equal(await p.$('.nb-list .nb-cityrow'), null, 'the list has neighbourhoods only, not the city overall');
  assert.doesNotMatch(await p.textContent('.nb-list'), /overall/);
}));

test('Neighbourhoods follow the area tapped at the top, and your area stays in view in another city', { skip }, () => page('/r/demo?areas=coquitlam,port-moody', async (p) => {
  await p.selectOption('[data-hpick]', 'Burke Mountain');
  await p.click('[data-focus="Port Moody"]');
  assert.match(await p.textContent('.cd-hoods .nb-cd[aria-pressed="true"]'), /Port Moody/);
  assert.match(await p.textContent('.nb-hint'), /the area you picked at the top/);
  assert.match(await p.textContent('.nb-away'), /Burke Mountain/);
  // Peeking across cities still compares with your own area.
  await p.click('.nb-li[data-hpeek="Heritage Woods"]');
  assert.match(await p.textContent('.nb-sheet'), /Burke Mountain \(Coquitlam\)/);
}));

test('R2 says what the report shows: both areas, or one area only', { skip }, () => page('/r/demo?areas=coquitlam,port-moody', async (p) => {
  assert.match(await p.textContent('.abar'), /Show me:/);
  assert.doesNotMatch(await p.textContent('.abar'), /Side by side|One at a time/);
  assert.match(await p.textContent('[data-all]'), /Both areas/);
  assert.match(await p.textContent('.asay'), /compares Coquitlam and Port Moody/);
  await p.click('[data-focus="Coquitlam"]');
  assert.match(await p.textContent('.asay'), /about Coquitlam only/);
  assert.match(await p.textContent('.top h1'), /Coquitlam Market Report/);
  await p.click('[data-all]');
  assert.match(await p.textContent('.top h1'), /2 areas/);
}));

test('On a phone, the area row scrolls sideways and never makes the page wider than the screen', { skip }, () => page('/r/demo?areas=coquitlam,burnaby-north,north-vancouver', async (p) => {
  await p.click('[data-focus="Coquitlam"]');
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), 390);
}, { width: 390 }));

test('Greater Vancouver alone: clients choose a city', { skip }, () => page('/r/demo?areas=greater-vancouver', async (p) => {
  assert.match(await p.textContent('.nb-intro'), /Choose a city/);
  assert.equal(await p.textContent('.cd-hoods h3'), 'Neighbourhoods', 'the title does not name a city the client did not pick');
  assert.ok((await p.$$('.nb-grid button')).length >= 6);
  await p.click('[data-hall]');
  assert.equal((await p.$$('.nb-grid button')).length, 19);
}, { width: 390 }));

test('the Create page loads with the Sections panel and Neighbourhoods settings', { skip }, () => page('/app?plan=pro', async (p) => {
  const list = await p.$$eval('#dpanel [data-sk]', (x) => x.map((e) => e.dataset.sk));
  assert.ok(list.includes('hoods'));
  await p.hover('[data-sk="hoods"]'); await p.click('[data-ek="hoods"]'); await p.waitForTimeout(300);
  assert.ok(await p.$('[data-hc="city"]'), 'city setting shows');
}, { setup: () => { localStorage.clear(); localStorage.setItem('mup_demo_profile', JSON.stringify({ name: 'Test Agent', slug: 'demo', plan: 'pro' })); } }));

for (const width of [390, 1280]) test(`D2: the Share menu opens fully on screen (${width}px)`, { skip }, () => page('/app?plan=pro', async (p) => {
  await p.click('#sharebtn'); await p.waitForTimeout(200);
  const r = await p.$eval('.shmenu', (m) => { const x = m.getBoundingClientRect(); return { l: x.left, r: x.right, vw: document.documentElement.clientWidth }; });
  assert.ok(r.l >= 0 && r.r <= r.vw, `menu runs from ${Math.round(r.l)} to ${Math.round(r.r)} on a ${r.vw}px screen`);
}, { width, setup: () => { localStorage.clear(); localStorage.setItem('mup_demo_profile', JSON.stringify({ name: 'Test Agent', slug: 'demo', plan: 'pro' })); } }));
test('the first page shows the logo, this month\'s real report and three sample reports', { skip }, () => page('/', async (p) => {
  assert.ok(await p.$('.nav .dot'), 'logo in the top menu');
  assert.match(await p.textContent('#pill'), /report is ready/);
  assert.ok(await p.$('#prev.bd [data-sec="numbers"] .kpi'), 'the real report is drawn in the preview');
  assert.equal((await p.$$('#gal .lp-card')).length, 3);
  assert.ok(await p.$('#f #email') && await p.$('#consent'), 'sign-up form is there');
}, { width: 390 }));

// Ella: every page before logging in uses the report's white and blue, no green.
const GREENS = ['rgb(15, 107, 79)', 'rgb(31, 184, 134)', 'rgb(7, 16, 13)'];
for (const path of ['/', '/plans', '/privacy', '/terms']) {
  test(`${path} has no green left`, { skip }, () => page(path, async (p) => {
    const used = await p.$$eval('body *', (els) => [...new Set(els.flatMap((e) => { const s = getComputedStyle(e); return [s.color, s.backgroundColor, s.borderTopColor]; }))]);
    assert.deepEqual(used.filter((c) => GREENS.includes(c)), []);
  }));
}
