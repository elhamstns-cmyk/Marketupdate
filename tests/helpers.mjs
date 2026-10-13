// Small helpers for the tests: call an API route the way Vercel does, without a server.
import { Readable } from 'node:stream';
delete process.env.SUPABASE_URL; // always test in sample (demo) mode: no real database, no emails
export async function call(path, { method = 'GET', body, headers = {} } = {}) {
  const { default: handler } = await import('../api/[fn].js');
  const req = Readable.from(body == null ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
  Object.assign(req, { url: path, method, headers: { host: 'localhost', ...headers } });
  return new Promise((done) => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(s = '') { let json = null; try { json = JSON.parse(s); } catch {} done({ status: this.statusCode, json, text: String(s), headers: this.headers }); } };
    handler(req, res);
  });
}
export const clone = (o) => JSON.parse(JSON.stringify(o));
