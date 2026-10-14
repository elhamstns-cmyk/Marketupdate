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

test('adding a city adds a line to the 12-month chart', { skip }, () => page('/r/demo?areas=coquitlam,burnaby-north', async (p) => {
  const legend = await p.$$eval('.cd-trend .leg span', (x) => x.map((e) => e.textContent));
  assert.deepEqual(legend, ['Coquitlam', 'Burnaby North']);
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
  assert.match(await p.textContent('.nb-cityrow'), /West Vancouver overall/);
}));

test('Neighbourhoods follow the area tapped at the top, and your area stays in view in another city', { skip }, () => page('/r/demo?areas=coquitlam,port-moody', async (p) => {
  await p.selectOption('[data-hpick]', 'Burke Mountain');
  await p.click('[data-view="one"]'); await p.click('[data-focus="Port Moody"]');
  assert.match(await p.textContent('.cd-hoods .nb-cd[aria-pressed="true"]'), /Port Moody/);
  assert.match(await p.textContent('.nb-hint'), /the area you picked at the top/);
  assert.match(await p.textContent('.nb-away'), /Burke Mountain/);
  // Peeking across cities still compares with your own area.
  await p.click('.nb-li[data-hpeek="Heritage Woods"]');
  assert.match(await p.textContent('.nb-sheet'), /Burke Mountain \(Coquitlam\)/);
}));

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
