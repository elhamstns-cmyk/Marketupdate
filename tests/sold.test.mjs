// "Homes sold each month" with several areas: the numbers per area and the one-line story above the chart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salesByArea, soldStory } from '../public/js/charts.js';

// Sales history in the same shape as data/history.js, all in one home type to keep it short.
const months = (from, vals) => Object.fromEntries(vals.map((v, i) => { const m = from + i, y = 2025 + Math.floor((m - 1) / 12); return [`${y}-${String(((m - 1) % 12) + 1).padStart(2, '0')}`, v]; }));
const H = { sales: { condo: {
  'Grand Totals': months(9, [1862, 1700, 1600, 1525, 1100, 1638, 1977, 2063, 2132, 2377, 2045, 1859, 1709]),
  Coquitlam: months(9, [165, 150, 140, 149, 89, 162, 191, 182, 164, 254, 186, 150, 141]),
  Burnaby: months(9, [267, 250, 240, 213, 156, 201, 237, 257, 232, 297, 272, 234, 207]),
  'Port Moody/Belcarra': months(9, [46, 40, 41, 50, 26, 36, 58, 54, 48, 45, 56, 50, 46]),
} } };
const AREAS = [{ name: 'Greater Vancouver', g: 'Grand Totals' }, { name: 'Coquitlam', g: 'Coquitlam' }, { name: 'Burnaby North', g: 'Burnaby' }, { name: 'Port Moody', g: 'Port Moody/Belcarra' }];

test('each area gets its months, this month, the same month last year and the change', () => {
  const { keys, list } = salesByArea(H, AREAS, ['condo'], '2026-09');
  assert.equal(keys.length, 12);
  assert.equal(keys.at(-1), '2026-09');
  assert.deepEqual(list.map((x) => [x.now, x.ly, x.pct]), [[1709, 1862, -8], [141, 165, -15], [207, 267, -22], [46, 46, 0]]);
});

test('months with a missing number are left out, keeping the run that ends this month', () => {
  const H2 = structuredClone(H); delete H2.sales.condo.Coquitlam['2025-12'];
  const { keys } = salesByArea(H2, AREAS, ['condo'], '2026-09');
  assert.equal(keys[0], '2026-01');
});

test('the story names who sold fewer, who held steady, and each busiest month', () => {
  const { keys, list } = salesByArea(H, AREAS, ['condo'], '2026-09');
  const st = soldStory(list, list.slice(1), keys, 'September');
  assert.equal(st.lead, 'Fewer homes sold than last September');
  assert.equal(st.rest, " in Greater Vancouver, Coquitlam and Burnaby North. Port Moody held steady. June was the busiest month for Coquitlam and Burnaby North; Port Moody's was March.");
});

test('the story reads naturally when everyone moved the same way', () => {
  const up = (pct, name) => ({ name, pct, v: [1, 5, 2, 2, 2, 2] });
  const keys = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  const st = soldStory([up(4, 'A'), up(9, 'B')], [up(4, 'A'), up(9, 'B')], keys, 'September');
  assert.equal(st.lead, 'More homes sold than last September');
  assert.equal(st.rest, ' in A and B. May was the busiest month for both areas.');
  assert.doesNotMatch(st.rest, /\b2 of 2\b/);
  // No busiest month when the chart shows only a few months.
  assert.equal(soldStory([up(4, 'A'), up(9, 'B')], [up(4, 'A'), up(9, 'B')], keys.slice(3), 'September').rest, ' in A and B.');
});
