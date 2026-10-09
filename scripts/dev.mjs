// Local preview: node scripts/dev.mjs  (runs in sample mode when no keys are set)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('public'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer(async (req, res) => {
  let p = new URL(req.url, 'http://x').pathname;
  if (p.startsWith('/api/')) { const m = await import(path.resolve('api', '[fn].js')).catch(() => null);
    if (!m) { res.statusCode = 404; return res.end('not found'); } return m.default(req, res); }
  if (/^\/r\/[^/]+\/print$/.test(p)) p = '/print.html'; else if (/^\/r\/[^/]+$/.test(p)) p = '/report.html'; else if (/^\/s\/[^/]+$/.test(p)) p = '/share.html';
  else if (p === '/') p = '/index.html'; else if (!path.extname(p)) p += '.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
