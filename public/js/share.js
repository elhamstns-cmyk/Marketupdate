// Sharing: the share menu, QR codes and the phone's own share sheet.
import { qrSvg } from './qr.js';

const IC = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>', sms: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  wa: '<path d="M20.5 12a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.1-4.3A8.5 8.5 0 1 1 20.5 12z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5"/>', fb: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
  in: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4"/>', qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', share: '<path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  cap: '<path d="M5 6h14M5 10h14M5 14h9M5 18h6"/>' };
export const sv = (k, s = 17) => `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// A phone or tablet with its own share sheet.
export const isPhone = () => !!navigator.share && matchMedia('(pointer: coarse)').matches;
export const canShareFiles = (f) => { try { return !!(navigator.canShare && f && navigator.canShare({ files: [f] })); } catch { return false; } };
export const toFile = (canvas, name) => new Promise((ok) => canvas.toBlob((b) => ok(b ? new File([b], name, { type: 'image/png' }) : null), 'image/png'));

// The menu under the Share button. o = { url, subject, body, short }
export function shareMenu(anchor, o, { onCopy, onQr } = {}) {
  closeMenu(); const e = encodeURIComponent, m = document.createElement('div'); m.className = 'shmenu'; m.setAttribute('role', 'menu');
  const items = [['mail', 'Email', `mailto:?subject=${e(o.subject)}&body=${e(o.body)}`], ['sms', 'Text message', `sms:?&body=${e(o.short)}`], ['wa', 'WhatsApp', `https://wa.me/?text=${e(o.short)}`],
    ['fb', 'Facebook', `https://www.facebook.com/sharer/sharer.php?u=${e(o.url)}`], ['in', 'LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${e(o.url)}`]];
  m.innerHTML = items.map(([k, l, h]) => `<a role="menuitem" href="${esc(h)}"${k === 'mail' || k === 'sms' ? '' : ' target="_blank" rel="noopener"'}><span class="i">${sv(k)}</span>${l}</a>`).join('')
    + `<hr><button type="button" role="menuitem" data-m="qr"><span class="i">${sv('qr')}</span>Show QR code</button><button type="button" role="menuitem" data-m="copy"><span class="i">${sv('link')}</span>Copy link</button>`
    + '<p class="shnote">On a phone, Share opens your phone\'s own share menu.</p>';
  anchor.appendChild(m); m.querySelector('a').focus({ preventScroll: true });
  m.onclick = (ev) => { const b = ev.target.closest('[role=menuitem]'); if (!b) return; if (b.dataset.m === 'copy') onCopy?.(); if (b.dataset.m === 'qr') onQr?.(); closeMenu(); };
  setTimeout(() => { document.addEventListener('click', outside, true); document.addEventListener('keydown', escKey); });
}
const outside = (e) => { if (!e.target.closest('.shmenu') && !e.target.closest('[data-share]')) closeMenu(); };
const escKey = (e) => { if (e.key === 'Escape') closeMenu(); };
export function closeMenu() { document.querySelectorAll('.shmenu').forEach((x) => x.remove()); document.removeEventListener('click', outside, true); document.removeEventListener('keydown', escKey); }

// A window with a QR code. o = { title, text, url, steps, file }
export function qrModal(o) {
  const m = document.createElement('div'); m.className = 'qrm'; m.innerHTML = `<div class="qrbox" role="dialog" aria-modal="true" aria-labelledby="qrt"><h3 id="qrt">${esc(o.title)}</h3><p class="muted small">${esc(o.text)}</p>
    <div class="qrimg">${qrSvg(o.url, 210)}</div>${o.steps ? `<ol>${o.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
    <div class="qrbtns">${o.file ? `<button type="button" class="btn ghost" data-q="dl">${sv('dl')}Download QR code</button>` : ''}<button type="button" class="btn" data-q="x">Done</button></div></div>`;
  document.body.appendChild(m); m.querySelector('[data-q=x]').focus();
  const close = () => { m.remove(); document.removeEventListener('keydown', k); }, k = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', k);
  m.onclick = (e) => { if (e.target === m || e.target.closest('[data-q=x]')) return close(); if (e.target.closest('[data-q=dl]')) qrPng(o.url, o.file); };
}
// Saves the QR code as a PNG (for flyers and open-house signs).
function qrPng(url, name) {
  const img = new Image(), s = qrSvg(url, 1000).replace('fill="currentColor"', 'fill="#000"');
  img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 1000; c.getContext('2d').drawImage(img, 0, 0, 1000, 1000);
    const a = document.createElement('a'); a.download = name; a.href = c.toDataURL('image/png'); a.click(); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
}
