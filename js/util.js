/* Small helpers shared by every screen. Plain scripts, no build step. */
const $ = id => document.getElementById(id);
const qa = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = n => Math.round(((+n || 0) + Number.EPSILON) * 100) / 100;
const r4 = n => Math.round(((+n || 0) + Number.EPSILON) * 10000) / 10000;
const pad = n => String(n).padStart(2, '0');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => ymd(new Date());
const isYmd = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
const daysAgo = n => ymd(new Date(Date.now() - n * 864e5));

/* Reads what people type: "1,250.50", "1 250", "4,5" (comma as decimal) all work. Empty or junk gives null. */
function num(s) {
  if (typeof s === 'number') return isFinite(s) ? s : null;
  let t = String(s ?? '').trim().replace(/\s+/g, '');
  if (!t) return null;
  if (t.includes(',') && t.includes('.')) t = t.replace(/,/g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, '');
  else t = t.replace(',', '.');
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(t)) return null;
  const n = parseFloat(t);
  return isFinite(n) ? n : null;
}
const int = s => { const n = num(s); return n === null ? null : Math.floor(n); };

/* Money with thousands separators. Currency comes from settings. */
const cur = () => (typeof S !== 'undefined' && S.cfg && S.cfg.currency) || 'K';
const fmtN = (n, d = 2) => Math.abs(+n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const m = n => (r2(n) < 0 ? '-' : '') + cur() + fmtN(r2(n), 2);
const fmtQ = n => (+n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const ICONS = {
  sell: '<path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  stock: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.4 3.4 0 0 1 0 6.6M18 14.8c2 .6 3.2 2.3 3.5 5.2"/>',
  accounts: '<path d="M3 7a2 2 0 0 1 2-2h12v4"/><path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  report: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  gear: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  share: '<circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="18" cy="18" r="2.3"/><path d="m8 11 8-4M8 13l8 4"/>',
  print: '<path d="M7 9V4h10v5M7 17H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-3"/><rect x="7" y="14" width="10" height="6"/>',
  hold: '<path d="M9 5v14M15 5v14"/>',
  swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  bank: '<path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4 3.7-6 7.5-6s6.8 2 7.5 6"/>'
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (x) {}
  try {
    const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok;
  } catch (x) { return false; }
}
/* Shares through the phone's share sheet when there is one, otherwise copies. Returns true if something happened. */
async function shareText(text, title) {
  try {
    if (navigator.share) { await navigator.share({ title, text }); return true; }
  } catch (x) { if (x.name === 'AbortError') return false; }
  const ok = await copyText(text); if (ok) toast('Copied'); return ok;
}
const vibe = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (x) {} };
const hit = (name, k) => { const h = name.toLowerCase(); return k.toLowerCase().split(/\s+/).filter(Boolean).every(w => h.includes(w)); };
const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b || a + 's');
