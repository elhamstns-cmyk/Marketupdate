// The layout rules are shared by the browser and the server. These tests pin down what agents can save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../public/js/layout.js';
import * as board from '../public/js/board.js';
import { BLOCKS } from '../public/js/hoods.js';
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
  const c = L.cleanConf({ hoods: { city: 'Coquitlam', home: 'Burke Mountain', type: 't', off: ['rank', 'zzz', 'rank'], take: 'own', text: '  hi  ', evil: 1 } }).hoods;
  assert.deepEqual(c, { city: 'Coquitlam', home: 'Burke Mountain', type: 't', off: ['rank'], take: 'own', text: 'hi' });
  assert.deepEqual(L.cleanHoods({ type: 'x', take: 'maybe', text: 'a'.repeat(900) }).text.length, 600);
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
