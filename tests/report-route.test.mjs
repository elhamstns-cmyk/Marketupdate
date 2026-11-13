// The report link (?v=) must still open a month the client picks (?m=). Bug Nov 13: with ?v=, picking September kept showing October.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'http://db.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
process.env.SUPABASE_ANON_KEY = 'x';

const rows = {
  profiles: [{ id: 'u1', slug: 'ella', plan: 'pro', status: 'active', subscription_status: 'active', name: 'Ella', show: { months: { on: true, back: 24 } } }],
  exports: [{ id: 'V1', user_id: 'u1', kind: 'link', area: 'Greater Vancouver', month: 'October 2026', month_key: '2026-10', settings: {} }],
  reports: [{ key: '2026-10', data: { month: 'October 2026', cities: {}, areas: {} } }, { key: '2026-09', data: { month: 'September 2026', cities: {}, areas: {} } }],
};
globalThis.fetch = async (u) => {
  const url = new URL(u), t = url.pathname.split('/').pop(), p = url.searchParams;
  let r = rows[t] || [];
  if (t === 'reports' && p.get('key')) r = r.filter((x) => x.key === p.get('key').replace('eq.', ''));
  if (t === 'reports' && p.get('select') === 'key') r = r.map((x) => ({ key: x.key }));
  return new Response(JSON.stringify(r), { status: 200, headers: { 'content-type': 'application/json' } });
};
const { default: handler } = await import('../lib/routes/report.js');
const call = (qs) => new Promise((done) => {
  const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; },
    end(b) { done(JSON.parse(b)); }, json(o) { done(o); }, send(b) { done(typeof b === 'string' ? JSON.parse(b) : b); } };
  handler({ url: '/api/report?' + qs, query: Object.fromEntries(new URLSearchParams(qs)), headers: {} }, res);
});

test('a report link (?v=) opens on the newest month', async () => {
  const j = await call('slug=ella&v=V1');
  assert.equal(j.report?.month, 'October 2026', JSON.stringify(j).slice(0, 200));
});
test('a report link (?v=) loads the month the client picks', async () => {
  const j = await call('slug=ella&v=V1&m=2026-09&sw=1');
  assert.ok(j.months.includes('2026-09'), 'September can be picked: ' + j.months);
  assert.equal(j.report.month, 'September 2026');
});
