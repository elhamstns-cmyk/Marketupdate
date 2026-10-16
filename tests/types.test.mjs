// "Prices by home type" (S4): the change in dollars and the one-line story, for one city and for several.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dollarChange, typesStoryOne, typesStoryAreas, typeChange } from '../public/js/charts.js';

test('the change in dollars comes from the price and the % change, rounded to $100', () => {
  assert.equal(dollarChange(1584400, -6.6), -112000);
  assert.equal(dollarChange(976600, -6.4), -66800);
  assert.equal(dollarChange(1000000, null), null);
  assert.equal(dollarChange(null, -3), null);
});

test('one city: every type down, and how the priciest compares with the cheapest', () => {
  const st = typesStoryOne([{ type: 'detached', price: 1584400, yoy: -6.6 }, { type: 'townhome', price: 976600, yoy: -6.4 }, { type: 'condo', price: 640100, yoy: -7.3 }]);
  assert.equal(st.lead, 'Every home type costs less than a year ago.');
  assert.equal(st.rest, ' A detached home costs about 2½ times a condo.');
});

test('one city: mixed directions and two types read naturally', () => {
  const st = typesStoryOne([{ type: 'detached', price: 1500000, yoy: -2 }, { type: 'condo', price: 1100000, yoy: 3 }]);
  assert.equal(st.lead, 'Detached homes cost less than a year ago; condos cost more.');
  assert.equal(st.rest, ' A detached home costs about $400,000 more than a condo.');
  assert.equal(typesStoryOne([{ type: 'townhome', price: 9e5, yoy: -1 }, { type: 'condo', price: 6e5, yoy: -2 }]).lead, 'Both home types cost less than a year ago.');
});

test('several areas: priciest and most affordable city, Greater Vancouver is the yardstick, not ranked', () => {
  const rows = [{ name: 'Greater Vancouver', price: 1784700, yoy: -7.3 }, { name: 'Coquitlam', price: 1584400, yoy: -6.6 }, { name: 'Port Moody', price: 1903500, yoy: -8.4 }, { name: 'Burnaby North', price: 1808500, yoy: -9.2 }];
  const st = typesStoryAreas(rows, 'detached');
  assert.equal(st.lead, 'Port Moody has the priciest detached homes.');
  assert.equal(st.rest, ' Coquitlam is the most affordable, about $319,000 less. Prices are lower than a year ago in every area.');
});

test('several areas: one city with Greater Vancouver, and areas without a price are left out', () => {
  const st = typesStoryAreas([{ name: 'Greater Vancouver', price: 1016700, yoy: -4.7 }, { name: 'Coquitlam', price: 976600, yoy: 2 }, { name: 'West Vancouver', price: null, yoy: null }], 'townhome');
  assert.equal(st.lead, "Coquitlam's townhouses cost about $40,000 less than across Greater Vancouver.");
  assert.equal(st.rest, ' Prices rose in Coquitlam and fell in Greater Vancouver over the past year.');
});

test('the change follows the time picked: last month, 1 year, or 3, 5 and 10 years from GVR', () => {
  const o = { price: 1584400, yoy: -6.6, prev: 1599100 }, g = [-11, -0.6, 31.7];
  assert.equal(typeChange(o, 'm1', g), -0.9);
  assert.equal(typeChange(o, 'y1', g), -6.6);
  assert.equal(typeChange(o, 'y5', g), -0.6);
  assert.equal(typeChange(o, 'y10', g), 31.7);
  assert.equal(typeChange({ ...o, prev: null }, 'm1', g), null);
  assert.equal(typeChange(o, 'y3', null), null);
});

test('the sentence names the time picked', () => {
  const one = typesStoryOne([{ type: 'detached', price: 1584400, yoy: -0.6 }, { type: 'townhome', price: 976600, yoy: 6.7 }, { type: 'condo', price: 640100, yoy: 1.7 }], 'in Sep 2021');
  assert.equal(one.lead, 'Detached homes cost less than in Sep 2021; townhouses and condos cost more.');
  const rows = [{ name: 'Greater Vancouver', price: 1784700, yoy: 4.5 }, { name: 'Coquitlam', price: 1584400, yoy: 31.7 }, { name: 'Port Moody', price: 1903500, yoy: 37.1 }];
  assert.equal(typesStoryAreas(rows, 'detached', 'Greater Vancouver', 'in Sep 2016', 'since Sep 2016').rest, ' Coquitlam is the most affordable, about $319,000 less. Prices are higher than in Sep 2016 in every area.');
  const mixed = [{ name: 'A', price: 1e6, yoy: 2 }, { name: 'B', price: 9e5, yoy: -1 }];
  assert.match(typesStoryAreas(mixed, 'condo', 'Greater Vancouver', 'in Aug 2026', 'since Aug 2026').rest, /Prices rose in A and fell in B since Aug 2026\./);
});
