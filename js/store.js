/* Storage. Same key and shape as every earlier version, so old data and old .smebak files still load. */
const KEY = 'sme.tracker.v1', HELD_KEY = 'sme.tracker.held';
const fresh = () => ({ cfg: { store: 'My Store', currency: 'K', remindDays: 7, rcpt: 0, theme: 'auto', pal: 'lagoon', accts: [], setup: false }, items: [], customers: [], txns: [], log: [] });

function migrate(s) {
  const f = fresh(), cfg = { ...f.cfg, ...(s.cfg || {}) };
  if (!s.cfg || !s.cfg.theme) cfg.theme = s.cfg && s.cfg.light ? 'light' : (s.cfg && 'light' in s.cfg ? 'dark' : 'auto');
  if (!['lagoon', 'ocean', 'orchid', 'slate', 'coral'].includes(cfg.pal)) cfg.pal = 'lagoon';
  delete cfg.staff; delete cfg.accent; delete cfg.light;
  /* Older versions kept the holder in "note". Now the holder is its own field and shown first. */
  cfg.accts = (cfg.accts || []).map(a => { const b = { kind: 'bank', ...a }; if (b.holder === undefined) { b.holder = b.note || ''; b.note = ''; } return b; });
  const d = { cfg, items: s.items || [], customers: s.customers || [], txns: s.txns || [], log: s.log || [] };
  d.items.forEach(i => {
    i.ctn = Math.max(0, Math.floor(+i.ctn || 0)); i.ctnPrice = +i.ctnPrice > 0 ? +i.ctnPrice : 0;
    i.low = Math.max(0, Math.floor(+i.low || 0)); i.cat = i.cat || '';
  });
  if (d.items.length || d.txns.length) cfg.setup = true;
  let n = Math.max(cfg.rcpt || 0, 0, ...d.txns.map(t => t.no || 0));
  for (const t of [...d.txns].sort((a, b) => a.ts - b.ts)) if (!t.no) t.no = ++n;
  cfg.rcpt = n;
  return d;
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.items) && Array.isArray(s.txns)) return migrate(s); } catch (x) {}
  return fresh();
}
let S = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (x) { toast('Could not save. Storage is blocked or full.'); return false; } };

/* Tamper-evident activity log. Each entry's hash includes the one before it. (The "by" field is kept empty now; old entries keep theirs so their hashes still check out.) */
const hsh = s => { let a = 0xdeadbeef, b = 0x41c6ce57; for (let i = 0, c; i < s.length; i++) { c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); } a = Math.imul(a ^ a >>> 16, 2246822507) ^ Math.imul(b ^ b >>> 13, 3266489909); b = Math.imul(b ^ b >>> 16, 2246822507) ^ Math.imul(a ^ a >>> 13, 3266489909); return (4294967296 * (2097151 & b) + (a >>> 0)).toString(16); };
const lh = (p, o) => hsh(p + '|' + o.ts + '|' + o.by + '|' + o.act + '|' + o.txt);
const L = (act, txt) => { const g = S.log || (S.log = []), o = { ts: Date.now(), by: '', act, txt: txt || '' }; o.h = lh(g.length ? g[g.length - 1].h : '', o); g.push(o); };
function logBad() { const g = S.log || [], bad = new Set(); let p = ''; g.forEach((o, i) => { if (o.h !== lh(p, o) || (i && o.ts < g[i - 1].ts - 6e4)) bad.add(i); p = o.h; }); return bad; }

const nm = t => 'R-' + String(t.no || 0).padStart(5, '0');
const MS = ['cash', 'mobile'], ML = { cash: 'Cash', mobile: 'Mobile banking' };
const mt = t => (t.method && t.method !== 'cash' ? 'mobile' : 'cash');
const CATS = ['Transport', 'Airtime', 'Packaging', 'Rent', 'Other'];
const ACT = { lend: 'LOAN GIVEN', lendpay: 'LOAN PAYMENT RECEIVED', lendwo: 'LOAN WRITTEN OFF', refund: 'RETURN', loan: 'LOAN TAKEN', loanpay: 'LOAN REPAYMENT', sale: 'SALE', payment: 'PAYMENT', restock: 'RESTOCK', adjust: 'STOCK COUNT FIXED', expense: 'EXPENSE', draw: 'OWNER DRAWING', writeoff: 'DEBT WRITTEN OFF', cash: 'CASH ADDED/REMOVED', move: 'MONEY MOVED', owed: 'OPENING DINAU' };
const cu = id => S.customers.find(c => c.id === id);
const custName = t => { const c = t.customerId && cu(t.customerId); return c ? c.name : 'Walk-in'; };
const sum = t => {
  const c = t.customerId && cu(t.customerId);
  return nm(t) + ' ' + t.type + ' ' + (t.type === 'sale' ? m(t.total) + ' (' + t.lines.map(l => l.qty + '×' + l.name).join(', ') + ')' : t.lines && t.lines.length ? t.lines.map(l => l.qty + '× ' + l.name).join(', ') : m(t.amount)) + (c ? ' · ' + c.name : '') + (t.note ? ' · ' + t.note : '');
};
/* Every change to the books goes through add(): numbered, logged, appended. Nothing else writes to S.txns. */
const add = t => { t.no = ++S.cfg.rcpt; S.txns.push(t); L(ACT[t.type] || t.type, sum(t)); return t; };
const base = (type, o = {}) => ({ id: uid(), ts: Date.now(), date: today(), type, customerId: null, lines: [], total: 0, paidNow: 0, amount: 0, note: '', ...o });

let held = (() => { try { const h = JSON.parse(localStorage.getItem(HELD_KEY)); return Array.isArray(h) ? h : []; } catch (x) { return []; } })();
const saveHeld = () => { try { localStorage.setItem(HELD_KEY, JSON.stringify(held)); } catch (x) {} };
