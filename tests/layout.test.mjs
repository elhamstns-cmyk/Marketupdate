// The layout rules are shared by the browser and the server. These tests pin down what agents can save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../public/js/layout.js';
import * as board from '../public/js/board.js';
import { BLOCKS, defaultCity, PERIODS } from '../public/js/hoods.js';
import SEED from '../data/seed-report.js';
import { cleanShow } from '../lib/util.js';

test('browser and server use the very same rules', () => {
  assert.equal(board.cleanConf, L.cleanConf);
  assert.equal(cleanShow, L.cleanShow);
  assert.deepEqual(board.SECTIONS, L.SECTIONS);
});

test('unknown sections and repeats are dropped', () => {
  assert.deepEqual(L.cleanLayout({ sections: ['numbers', 'bogus', 'trend', 'trend'] }).sections, ['numbers', 'trend']);
});

test('areas: no repeats, real names only, at most 6', () => {
  assert.deepEqual(L.cleanAreas(['Coquitlam', 'Coquitlam', '<b>x</b>', 'Richmond']), ['Coquitlam', 'Richmond']);
  assert.equal(L.cleanAreas(Array.from({ length: 9 }, (_, i) => 'Area ' + 'abcdefghi'[i])).length, L.MAX_AREAS);
  assert.deepEqual(L.cleanAreas(['Coquitlam', 'Atlantis'], ['Coquitlam']), ['Coquitlam']);
});

test('a layout saved before a new section existed gets it once, after "Prices by home type"', () => {
  const old = L.layoutOf({ sections: ['numbers', 'types', 'summary'] }, null);
  for (const k of L.NEW_SECTIONS) assert.ok(old.sections.includes(k));
  assert.equal(old.sections[old.sections.indexOf('types') + 1], L.NEW_SECTIONS[0]);
  // Once the agent saves (known list present), removing the section sticks.
  const removed = L.layoutOf({ sections: ['numbers', 'types', 'summary'], known: L.SEC_IDS }, null);
  assert.ok(!removed.sections.includes('hoods'));
});

test('the default layout has every section except "How areas compare"', () => {
  assert.deepEqual(L.DEFAULT_LAYOUT.sections, L.SEC_IDS.filter((k) => k !== 'compare'));
  assert.deepEqual(L.layoutOf(null, null).sections, L.DEFAULT_LAYOUT.sections);
});

test('Neighbourhoods settings: only known fields and values are kept', () => {
  const c = L.cleanConf({ hoods: { city: 'Coquitlam', home: 'Burke Mountain', type: 't', off: ['tiles', 'zzz', 'tiles', 'rank'], take: 'own', text: '  hi  ', evil: 1 } }).hoods;
  assert.deepEqual(c, { city: 'Coquitlam', home: 'Burke Mountain', type: 't', off: ['tiles'], take: 'own', text: 'hi' });
  assert.deepEqual(L.cleanHoods({ type: 'x', take: 'maybe', text: 'a'.repeat(900) }).text.length, 600);
});

test('Neighbourhoods only open on a city picked at the top', () => {
  const four = ['Greater Vancouver', 'Coquitlam', 'West Vancouver', 'North Vancouver'];
  // The agent's city is used only when it is one of the report's areas.
  assert.equal(defaultCity(SEED, { city: 'Port Moody' }, four), 'Coquitlam');
  assert.equal(defaultCity(SEED, { city: 'North Vancouver' }, four), 'North Vancouver');
  // Greater Vancouver alone: the agent's city, else Vancouver West.
  assert.equal(defaultCity(SEED, { city: 'Port Moody' }, ['Greater Vancouver']), 'Port Moody');
  assert.equal(defaultCity(SEED, {}, ['Greater Vancouver']), 'Vancouver West');
});

test('the time buttons are Since January, 1, 3, 5 and 10 years, and every neighbourhood has those numbers', () => {
  assert.deepEqual(PERIODS.map((p) => p[0]), ['sj', 'y1', 'y3', 'y5', 'y10']);
  let n = 0;
  for (const c of Object.values(SEED.hoods)) for (const h of Object.values(c)) for (const r of Object.values(h)) { n++; for (const i of [4, 5, 6, 7, 8]) assert.equal(typeof r[i], 'number'); }
  assert.ok(n > 400);
});

test('every Neighbourhoods block the server accepts has a label in the dashboard', () => {
  assert.deepEqual(BLOCKS.map((b) => b[0]), L.HOOD_BLOCK_KEYS);
  for (const b of BLOCKS) assert.ok(b[1] && b[2]);
});

test('cleanShow keeps the template, mode and Instagram image switches, and nothing else', () => {
  const s = cleanShow({ sections: ['numbers'], mode: 'template', template: { sections: ['contact', 'x'] }, img: { post: { price: false, junk: 1 }, story: 5 }, hacker: true });
  assert.equal(s.mode, 'template');
  assert.deepEqual(s.template.sections, ['contact']);
  assert.deepEqual(s.img, { post: { price: false } });
  assert.equal(s.hacker, undefined);
  assert.equal(cleanShow('nope'), null);
});
