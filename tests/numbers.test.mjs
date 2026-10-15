// Key numbers (S1): the change under each number follows the time picked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numbersChange, periodMonth, NUM_PERIODS } from '../public/js/charts.js';
import { get } from '../public/js/report.js';
import SEED from '../data/seed-report.js';
import HIST from '../data/history.js';

const D = { ...SEED, history: SEED.history || HIST };

test('period months count back from the report month', () => {
  assert.equal(periodMonth('2026-09', 'm1'), 'Aug 2026');
  assert.equal(periodMonth('2026-09', 'y1'), 'Sep 2025');
  assert.equal(periodMonth('2026-09', 'y10'), 'Sep 2016');
  assert.equal(periodMonth('2026-01', 'm1'), 'Dec 2025');
  assert.equal(NUM_PERIODS.length, 5);
});

test('last month and 1 year give every number', () => {
  const o = get(D, 'Greater Vancouver', 'all');
  const m = numbersChange(o, 'm1'), y = numbersChange(o, 'y1');
  for (const r of [m, y]) for (const k of ['price', 'sales', 'active', 'dom']) assert.equal(typeof r[k], 'number', k);
  assert.equal(y.price, o.yoy);
  assert.equal(y.dom, o.dom - o.domLy);
  assert.equal(m.dom, o.dom - o.domPrev);
});

test('3, 5 and 10 years give the price only', () => {
  const o = get(D, 'Coquitlam', 'all'), g = D.growth.composite.Coquitlam;
  assert.deepEqual(numbersChange(o, 'y5', g), { price: g[1], sales: null, active: null, dom: null });
  assert.equal(numbersChange(o, 'y10', g).price, g[2]);
  assert.equal(numbersChange(o, 'y3', undefined).price, null);
});
