// A small QR code maker (byte mode, medium error correction, versions 1 to 10). No outside code.
// qrSvg(text) returns an <svg> string; dark squares use currentColor.
const ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26], BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const rawModules = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
const dataBytes = (v) => Math.floor(rawModules(v) / 8) - ECC[v] * BLOCKS[v];
const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z; };
function divisor(d) { const r = new Array(d).fill(0); r[d - 1] = 1; let root = 1;
  for (let i = 0; i < d; i++) { for (let j = 0; j < d; j++) { r[j] = mul(r[j], root); if (j + 1 < d) r[j] ^= r[j + 1]; } root = mul(root, 2); } return r; }
function remainder(data, div) { const r = div.map(() => 0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => (r[i] ^= mul(c, f))); } return r; }
const alignPos = (v, size) => { if (v === 1) return []; const n = Math.floor(v / 7) + 2, step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, out = [6];
  for (let p = size - 7; out.length < n; p -= step) out.splice(1, 0, p); return out; };
const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0, (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];

export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  let v = 1; while (v <= 10 && dataBytes(v) * 8 < 4 + (v < 10 ? 8 : 16) + bytes.length * 8) v++;
  if (v > 10) throw new Error('Too long for a QR code');
  // bits: mode, length, data, terminator, padding
  const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach((b) => put(b, 8));
  const cap = dataBytes(v) * 8; put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let p = 0xec; data.length < dataBytes(v); p ^= 0xec ^ 0x11) data.push(p);
  // error correction, split in blocks and interleaved
  const nb = BLOCKS[v], el = ECC[v], raw = Math.floor(rawModules(v) / 8), short = nb - (raw % nb), sl = Math.floor(raw / nb), div = divisor(el), blocks = [];
  for (let i = 0, k = 0; i < nb; i++) { const d = data.slice(k, k + sl - el + (i < short ? 0 : 1)); k += d.length; const e = remainder(d, div); if (i < short) d.push(0); blocks.push(d.concat(e)); }
  const cw = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== sl - el || j >= short) cw.push(b[i]); });
  // the grid
  const size = v * 4 + 17, M = [...Array(size)].map(() => Array(size).fill(false)), F = [...Array(size)].map(() => Array(size).fill(false));
  const set = (x, y, dark) => { M[y][x] = dark; F[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4); }
  const ap = alignPos(v, size), L = ap.length - 1;
  ap.forEach((ax, i) => ap.forEach((ay, j) => { if ((i === 0 && j === 0) || (i === 0 && j === L) || (i === L && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
  const format = (mask) => { const d = mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); const b = ((d << 10) | r) ^ 0x5412, g = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, g(i)); set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, g(i)); set(8, size - 8, true); };
  format(0);
  if (v >= 7) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25); const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const bit = ((b >>> i) & 1) === 1, a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, bit); set(c, a, bit); } }
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!F[y][x] && i < cw.length * 8) { M[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; } } }
  // try each mask, keep the easiest to scan
  let best = null, bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    const G = M.map((row, y) => row.map((d, x) => (F[y][x] ? d : d !== MASKS[m](x, y))));
    const keep = M.map((r) => r.slice()); for (let y = 0; y < size; y++) M[y] = G[y]; format(m); const out = M.map((r) => r.slice()); for (let y = 0; y < size; y++) M[y] = keep[y];
    const s = penalty(out, size); if (s < bestScore) { bestScore = s; best = out; }
  }
  return best;
}
function penalty(G, n) {
  let s = 0, dark = 0; const line = (get) => { for (let a = 0; a < n; a++) { let run = 1; for (let b = 1; b <= n; b++) { if (b < n && get(a, b) === get(a, b - 1)) run++; else { if (run >= 5) s += run - 2; run = 1; } }
    const str = Array.from({ length: n }, (_, b) => (get(a, b) ? 1 : 0)).join(''); s += 40 * ((str.match(/(?=10111010000|00001011101)/g) || []).length); } };
  line((a, b) => G[a][b]); line((a, b) => G[b][a]);
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = G[y][x]; if (c === G[y][x + 1] && c === G[y + 1][x] && c === G[y + 1][x + 1]) s += 3; }
  G.forEach((r) => r.forEach((d) => (dark += d))); s += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
  return s;
}
export function qrSvg(text, px = 200) {
  const G = qrMatrix(text), n = G.length, q = 4; let d = '';
  G.forEach((r, y) => r.forEach((on, x) => { if (on) d += `M${x + q},${y + q}h1v1h-1z`; }));
  return `<svg width="${px}" height="${px}" viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="currentColor"/></svg>`;
}
