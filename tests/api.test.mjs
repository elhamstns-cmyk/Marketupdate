// The API in sample mode: every address answers, private ones ask for a sign-in or a password.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call } from './helpers.mjs';

test('public settings', async () => {
  const r = await call('/api/config');
  assert.equal(r.status, 200); assert.equal(r.json.demo, true); assert.ok(r.json.plans.pro);
});

test('the sample report has neighbourhoods and full history', async () => {
  const r = await call('/api/report?slug=demo');
  assert.equal(r.status, 200);
  assert.ok(r.json.report.hoods.Coquitlam['Burke Mountain']);
  assert.ok(Object.keys(r.json.report.history.price.composite).length >= 20);
  assert.equal(r.json.personal, null);
});

test('a personal link brings the client name and neighbourhood', async () => {
  const r = await call('/api/report?slug=demo&p=abc');
  assert.equal(r.json.personal.hood, 'Burke Mountain'); assert.ok(r.json.personal.name);
});

test('view tracking always answers OK (never breaks the report)', async () => {
  for (const body of [{ slug: 'demo', kind: 'peek', hood: 'Cape Horn' }, 'not json', { kind: 'nope' }]) {
    const r = await call('/api/track', { method: 'POST', body }); assert.equal(r.status, 200); assert.equal(r.json.ok, true);
  }
});

test('the weekly email needs the cron password', async () => {
  assert.equal((await call('/api/weekly')).status, 401);
  process.env.CRON_SECRET = 'test-secret';
  const r = await call('/api/weekly', { headers: { authorization: 'Bearer test-secret' } });
  assert.equal(r.status, 200); assert.equal(r.json.emailed, 0);
});

test('admin addresses need the admin password', async () => {
  for (const p of ['/api/admin-publish', '/api/admin-agents', '/api/leads']) assert.equal((await call(p, { method: 'POST', body: {} })).status, 401, p);
});

test('unknown addresses are 404', async () => {
  assert.equal((await call('/api/nope')).status, 404);
});
