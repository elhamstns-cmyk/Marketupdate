// Past months and Client activity: the month rules, what a visit may store, and the plain-language activity per client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanMonths, monthsAllowed, cleanShow, layoutOf } from '../public/js/layout.js';
import { activity, times, mins } from '../public/js/activity.js';
import { cleanVisit } from '../lib/routes/track.js';
import { weeklyLines } from '../lib/routes/weekly.js';
import { call } from './helpers.mjs';

const KEYS = Array.from({ length: 130 }, (_, i) => { const n = 2026 * 12 + 8 - i; return `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`; }); // Sep 2026 back to Aug 2016

test('past months start on, 3 years back, with month links off', () => {
  assert.deepEqual(cleanMonths(undefined), { on: true, back: 36, links: false });
  assert.deepEqual(cleanMonths({ on: false, back: 7, links: 'yes' }), { on: false, back: 36, links: false });
  assert.deepEqual(layoutOf({}).months, { on: true, back: 36, links: false });
  assert.deepEqual(cleanShow({ months: { back: 0, links: true } }).months, { on: true, back: 0, links: true });
});

test('clients may pick only the months the agent allows', () => {
  assert.equal(monthsAllowed(KEYS, { back: 12 }).length, 12);
  assert.equal(monthsAllowed(KEYS, { back: 12 }).at(-1), '2025-10');
  assert.equal(monthsAllowed(KEYS, { back: 36 }).at(-1), '2023-10');
  assert.equal(monthsAllowed(KEYS, { back: 0 }).length, 130);
  assert.deepEqual(monthsAllowed(KEYS, { on: false }), ['2026-09']);
  assert.deepEqual(monthsAllowed(['2026-08', 'junk', '2026-09'], {}), ['2026-09', '2026-08']);
  assert.deepEqual(monthsAllowed([], {}), []);
});

test('the report says which months a client may pick', async () => {
  const r = await call('/api/report?slug=demo');
  assert.equal(r.status, 200); assert.deepEqual(r.json.months, ['2026-09']); assert.equal(r.json.latest, '2026-09');
});

test('a visit keeps only known sections and taps, with numbers capped', () => {
  const v = cleanVisit({ sec: 99999, end: true, dev: 'phone', m: '2024-03', parts: { hoods: 30.4, bogus: 5, trend: -2 }, acts: ['contact', 'type:c', 'month:2021-03', 'area:Burnaby North', '<script>', 'type:x'] });
  assert.equal(v.seconds, 7200); assert.equal(v.reached_end, true); assert.equal(v.device, 'phone'); assert.equal(v.month, '2024-03');
  assert.deepEqual(v.parts, { hoods: 30 });
  assert.deepEqual(v.acts, ['contact', 'type:c', 'month:2021-03', 'area:Burnaby North']);
  assert.equal(cleanVisit({ m: 'nope' }).month, null);
});

test('visit tracking always answers OK (never breaks the report)', async () => {
  for (const body of [{ kind: 'visit', id: 'abcDEF123456', slug: 'demo', sec: 5 }, { kind: 'visit', id: 'x', slug: 'demo' }, { kind: 'visit' }]) {
    const r = await call('/api/track', { method: 'POST', body }); assert.equal(r.status, 200); assert.equal(r.json.ok, true); }
});

const NOW = Date.parse('2026-10-15T19:00:00Z'), DAY = 864e5;
const at = (d) => new Date(NOW - d * DAY).toISOString();
const link = { id: 'L1', name: 'the Chen family', city: 'Coquitlam', hood: 'Burke Mountain', type: 'd', opens: 5 };
const visit = (d, s, extra = {}) => ({ started_at: at(d), updated_at: at(d), seconds: s, parts: { hoods: s / 2, trend: s / 4 }, acts: [], reached_end: true, device: 'phone', month: '2026-09', ...extra });

test('three visits in a week is "Very active", with the facts that make it so', () => {
  const vs = [visit(0, 240, { acts: ['type:c'] }), visit(1, 180), visit(3, 120, { acts: ['contact'], reached_end: false }), visit(20, 60, { month: '2021-03', acts: ['month:2021-03'] })];
  const hv = [{ hood: 'Westwood Plateau', kind: 'compare', created_at: at(0) }, { hood: 'Westwood Plateau', kind: 'peek', created_at: at(1) }, { hood: 'Burke Mountain', kind: 'pick', created_at: at(1) }];
  const a = activity(link, vs, hv, { days: 30, now: NOW, latest: '2026-09' });
  assert.equal(a.level, 'hot'); assert.equal(a.label, 'Very active'); assert.equal(a.visits, 4); assert.equal(a.week, 3); assert.equal(a.seconds, 600); assert.equal(a.ends, 3);
  assert.deepEqual(a.looked, [['Westwood Plateau', 2]]); assert.deepEqual(a.types, ['c']); assert.deepEqual(a.months, ['2021-03']); assert.equal(a.contact, 1);
  assert.equal(a.parts[0][0], 'hoods'); assert.equal(a.parts[0][1], 'Neighbourhoods');
  assert.equal(a.weeks.length, 8); assert.equal(a.weeks[7], 3); assert.equal(a.weeks.reduce((s, n) => s + n, 0), 4);
  assert.match(a.why, /^They're comparing Westwood Plateau with Burke Mountain, and checking condos\. They looked back at March 2021\. They opened your contact box\. A good time to reach out\.$/);
  assert.deepEqual(a.recent[0].did, ['compared Westwood Plateau with Burke Mountain', 'switched to Condo']);
});

test('the other activity levels', () => {
  assert.equal(activity({ ...link, opens: 0 }, [], [], { now: NOW }).level, 'none');
  assert.equal(activity({ ...link, opens: 0 }, [], [], { now: NOW }).why, null);
  assert.equal(activity(link, [visit(10, 30)], [], { now: NOW }).level, 'some');
  assert.equal(activity(link, [visit(2, 200), visit(3, 200)], [], { now: NOW }).level, 'hot');
  assert.equal(activity(link, [visit(2, 30), visit(3, 30)], [], { now: NOW }).level, 'some');
  assert.equal(activity(link, [visit(50, 30)], [], { now: NOW }).level, 'quiet');
  // Only their own area, nothing else: no "why" line unless they're very active.
  assert.equal(activity(link, [visit(10, 30)], [], { now: NOW }).why, null);
});

test('counts and times read like a person wrote them', () => {
  assert.equal(times(1), 'once'); assert.equal(times(2), 'twice'); assert.equal(times(7), '7 times');
  assert.equal(mins(5), 'a few seconds'); assert.equal(mins(40), '40 sec'); assert.equal(mins(600), '10 min');
});

test('the Monday email puts very active clients first and names links never opened', () => {
  const links = [{ ...link, created_at: at(30) }, { id: 'L2', name: 'Maria Lopez', hood: 'Burnaby North', type: 'c', opens: 1, created_at: at(20) }, { id: 'L3', name: 'Gary Thompson', hood: 'Coquitlam', type: 'd', opens: 0, created_at: at(10) }];
  const vs = [visit(0, 240, { link_id: 'L1' }), visit(1, 180, { link_id: 'L1' }), visit(3, 120, { link_id: 'L1' }), visit(2, 60, { link_id: 'L2', month: '2024-03', acts: ['month:2024-03'] })];
  const { lines, hot, quiet } = weeklyLines(links, vs, [], { now: NOW, latest: '2026-09' });
  assert.equal(hot, 1); assert.equal(lines.length, 2);
  assert.match(lines[0].t, /^🔥 <b>the Chen family<\/b> \(Burke Mountain\) opened your report 3 times and read for 9 min, mostly Neighbourhoods\.$/);
  assert.match(lines[1].t, /looked back at <b>March 2024<\/b>/);
  assert.deepEqual(quiet, ['Gary Thompson']);
});
