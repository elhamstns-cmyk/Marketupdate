// The monthly report data: the built-in month must pass the publish checks, and broken data must not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../lib/routes/admin-publish.js';
import { SEED, latestReport } from '../lib/util.js';
import { areasOf, monthKey } from '../public/js/report.js';
import { clone } from './helpers.mjs';

test('the built-in month passes the publish checks', () => {
  assert.deepEqual(validate(SEED).errs, []);
});

test('every area has 12 months of price history up to the report month (the 12-month chart)', async () => {
  const D = await latestReport(), end = monthKey(D.month), [y, m] = end.split('-').map(Number);
  const start = `${m === 12 ? y : y - 1}-${String((m % 12) + 1).padStart(2, '0')}`;
  for (const a of areasOf(D)) {
    const h = D.history.price.composite[a];
    assert.ok(h, `${a} has no price history`);
    assert.ok(h[end] && h[start], `${a} is missing ${start} or ${end}`);
  }
});

test('neighbourhood data is complete and well formed', () => {
  const H = SEED.hoods; let n = 0;
  for (const [city, hs] of Object.entries(H)) {
    assert.ok(hs['*'], `${city} has no whole-city row`);
    for (const row of Object.values(hs)) for (const v of Object.values(row)) { assert.equal(v.length, 9); assert.ok(v[0] > 100000); n++; }
  }
  assert.ok(n > 400, `only ${n} neighbourhood prices`);
  for (const city of Object.keys(H)) assert.ok(areasOf(SEED).includes(city), `${city} is not a report area`);
});

test('the publish checks catch broken data', () => {
  const bad = (f) => { const D = clone(SEED); f(D); return validate(D).errs; };
  assert.ok(bad((D) => { D.month = 'Sept 2026'; }).length);
  assert.ok(bad((D) => { delete D.cities['Greater Vancouver']; }).length);
  assert.ok(bad((D) => { D.cities.Coquitlam.condo.price.now = '1,000'; }).length);
  assert.ok(bad((D) => { D.hoods.Coquitlam['Burke Mountain'].d = [0]; }).length);
  assert.ok(bad((D) => { D.growth.detached.Coquitlam = [1, 2]; }).length);
  assert.ok(bad((D) => { D.hoods = { Coquitlam: { '*': { d: [1, 0, 0, 0, 0, 0, 0, 0, 0] } } }; }).length, 'a nearly empty hoods table');
});
