/* Everything on screen is derived from S.txns by calc(). Nothing else holds a balance. */
let C = null;
function calc() {
  const c = { bought: {}, sold: {}, adj: {}, bal: {}, lastPay: {}, cr: {}, pay: {}, oldest: {}, gp: 0, sales: 0, spent: 0, exp: 0, m: { cash: 0, mobile: 0 }, wo: 0, draw: 0, loans: {}, loanInt: 0, loanPaid: 0, lends: {}, lendInt: 0, lendLoss: 0 };
  for (const t of S.txns) {
    const k = t.customerId;
    if (t.type === 'sale') {
      const mb = Math.min(t.mob || 0, t.paidNow);
      if (mb > 0) { c.m.mobile += mb; c.m.cash += t.paidNow - mb; } else c.m[mt(t)] += t.paidNow;
      c.sales += t.total;
      for (const l of t.lines) { if (l.itemId) c.sold[l.itemId] = (c.sold[l.itemId] || 0) + l.qty; c.gp += (l.price - l.cost) * l.qty; }
      if (k) { c.bal[k] = (c.bal[k] || 0) + t.total - t.paidNow; if (t.total > t.paidNow) (c.cr[k] = c.cr[k] || []).push({ d: t.date, a: t.total - t.paidNow }); }
    }
    else if (t.type === 'payment') { c.m[mt(t)] += t.amount; c.pay[k] = (c.pay[k] || 0) + t.amount; c.bal[k] = (c.bal[k] || 0) - t.amount; if (!(c.lastPay[k] >= t.date)) c.lastPay[k] = t.date; }
    else if (t.type === 'owed') { c.bal[k] = (c.bal[k] || 0) + t.amount; (c.cr[k] = c.cr[k] || []).push({ d: t.date, a: t.amount }); }  /* money owed from before the app: not a sale, no profit, no cash */
    else if (t.type === 'cash') c.m[mt(t)] += t.amount;
    else if (t.type === 'move') { const to = t.method === 'mobile' ? 'mobile' : 'cash', from = to === 'cash' ? 'mobile' : 'cash'; c.m[from] -= t.amount; c.m[to] += t.amount; }
    else if (t.type === 'expense') { c.m[mt(t)] -= t.amount; c.exp += t.amount; }
    else if (t.type === 'writeoff') { c.bal[k] = (c.bal[k] || 0) - t.amount; c.pay[k] = (c.pay[k] || 0) + t.amount; c.wo += t.amount; }
    else if (t.type === 'draw') { c.m[mt(t)] -= t.amount; c.draw += t.amount; }
    else if (t.type === 'lend') { c.m[mt(t)] -= t.amount; c.lends[t.id] = { id: t.id, who: t.borrower || 'Borrower', wid: t.borrowerId || null, principal: t.amount, owe: t.owe || t.amount, inst: t.inst || t.owe || t.amount, n: t.n || 1, freq: t.freq || 'month', lm: t.lm || 'flat', rate: t.rate || 0, date: t.date, note: t.note || '', paid: 0, wo: 0 }; }
    else if (t.type === 'lendpay') { c.m[mt(t)] += t.amount; const l = c.lends[t.lendId]; if (l) { l.paid += t.amount; c.lendInt += t.amount * (l.owe - l.principal) / l.owe; } }
    else if (t.type === 'lendwo') { const l = c.lends[t.lendId]; if (l) { l.wo += t.amount; c.lendLoss += t.amount * l.principal / l.owe; } }
    else if (t.type === 'loan') { c.m[mt(t)] += t.amount; c.loans[t.id] = { lender: t.lender || 'Lender', principal: t.amount, owe: t.owe || t.amount, paid: 0, due: t.due || '', date: t.date }; }
    else if (t.type === 'loanpay') { c.m[mt(t)] -= t.amount; const l = c.loans[t.loanId]; if (l) { l.paid += t.amount; c.loanPaid += t.amount; c.loanInt += t.amount * (l.owe - l.principal) / l.owe; } }
    else if (t.type === 'refund') {
      c.sales -= t.total;
      for (const l of t.lines) { if (l.itemId) c.sold[l.itemId] = (c.sold[l.itemId] || 0) - l.qty; c.gp -= (l.price - l.cost) * l.qty; }
      if (t.refundTo === 'dinau' && k) { c.bal[k] = (c.bal[k] || 0) - t.total; c.pay[k] = (c.pay[k] || 0) + t.total; } else c.m[mt(t)] -= t.total;
    }
    else if (t.type === 'restock') { if (t.note !== 'Opening stock') { c.m[mt(t)] -= t.total; c.spent += t.total; } for (const l of t.lines) c.bought[l.itemId] = (c.bought[l.itemId] || 0) + l.qty; }
    else if (t.type === 'adjust') for (const l of t.lines) c.adj[l.itemId] = (c.adj[l.itemId] || 0) + l.qty;
  }
  /* First-in-first-out: payments clear the oldest credit first, so "days owing" counts from the oldest unpaid sale. */
  for (const k in c.cr) { let p = c.pay[k] || 0; for (const x of c.cr[k].sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0)) { if (p >= x.a - .005) p -= x.a; else { c.oldest[k] = x.d; break; } } }
  c.cash = r2(c.m.cash); c.mobile = r2(c.m.mobile); c.money = r2(c.m.cash + c.m.mobile);
  c.loanInt = r2(c.loanInt); c.lendInt = r2(c.lendInt); c.lendLoss = r2(c.lendLoss);
  c.loanOwed = r2(Object.values(c.loans).reduce((a, l) => a + Math.max(0, l.owe - l.paid), 0));
  let lo = 0, lw = 0;
  for (const l of Object.values(c.lends)) { l.rem = r2(Math.max(0, l.owe - l.paid - l.wo)); lo += l.rem * l.principal / l.owe; lw += l.rem; }
  c.lendOut = r2(lo); c.lendOwed = r2(lw);
  return c;
}

/* ---- stock, units and cartons ---- */
const qty = id => (C.bought[id] || 0) + (C.adj[id] || 0) - (C.sold[id] || 0);
const hasCtn = i => i && i.ctn > 1;
const ctnSplit = (i, n) => hasCtn(i) ? { c: Math.floor(Math.max(n, 0) / i.ctn), u: Math.max(n, 0) % i.ctn } : { c: 0, u: Math.max(n, 0) };
/* "3 ctn + 5" for items sold in cartons, plain count for the rest. */
const stockText = (i, n = qty(i.id)) => { if (n <= 0) return '0'; if (!hasCtn(i)) return fmtQ(n); const s = ctnSplit(i, n); return (s.c ? s.c + ' ctn' : '') + (s.c && s.u ? ' + ' : '') + (s.u || !s.c ? s.u : ''); };
const ctnSellPrice = i => hasCtn(i) ? (i.ctnPrice > 0 ? i.ctnPrice : r2(i.ctn * i.price)) : 0;
const unitFromCtn = (i, p) => r4(p / i.ctn);
const stockStatus = i => { const n = qty(i.id); return n <= 0 ? 'out' : n <= i.low ? 'low' : 'ok'; };

/* ---- customers ---- */
const bal = id => r2(C.bal[id] || 0);
function idle(id) { const ref = C.oldest[id]; if (!ref) return 0; return Math.max(0, dayDiff(ref, today())); }
const overdue = () => S.customers.map(c => ({ c, b: bal(c.id), d: idle(c.id) })).filter(x => x.b > 0 && x.d >= (S.cfg.remindDays || 7)).sort((a, b) => b.d - a.d);
const ageCls = d => d < 7 ? 'ok' : d < 21 ? 'warn' : 'neg';
const outstanding = () => S.customers.reduce((s, c) => s + Math.max(0, bal(c.id)), 0);
/* Quick customers: an unpaid walk-in gets "Customer 1", "Customer 2"... so the debt is never lost. Rename them later. */
const isQuick = c => !!c.quick;
function nextQuickName() { let n = 1; const used = new Set(S.customers.map(c => c.name.trim().toLowerCase())); while (used.has('customer ' + n)) n++; return 'Customer ' + n; }
const dupName = (n, skip) => S.customers.find(c => c.id !== skip && c.name.trim().toLowerCase() === n.trim().toLowerCase());

/* ---- stock value ---- */
function stockValue() {
  const L = S.items.map(i => ({ i, n: Math.max(0, qty(i.id)) })).filter(x => x.n > 0);
  const cost = r2(L.reduce((a, x) => a + x.n * x.i.cost, 0)), retail = r2(L.reduce((a, x) => a + x.n * x.i.price, 0));
  const profit = r2(retail - cost);
  return { L, cost, retail, profit, margin: retail ? Math.round(profit / retail * 1000) / 10 : 0 };
}
const catList = () => [...new Set(S.items.map(i => (i.cat || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

/* ---- period report ---- */
function pst(per) {
  const lim = per ? daysAgo(per - 1) : '0000';
  const R = { s: 0, g: 0, x: 0, n: 0, lo: 0, wo: 0, dr: 0, st: 0, li: 0, lb: 0, lp: 0, dc: 0, rf: 0, lie: 0, ll: 0, lg: 0, lr: 0, rc: { cash: 0, mobile: 0 }, cat: {} };
  const LN = {}, LD = {};
  for (const t of S.txns) {
    if (t.type === 'loan') LN[t.id] = t; if (t.type === 'lend') LD[t.id] = t;
    if (t.date < lim) continue; const a = t.amount;
    if (t.type === 'sale') {
      R.s += t.total; R.n++;
      const mb = Math.min(t.mob || 0, t.paidNow); if (mb > 0) { R.rc.mobile += mb; R.rc.cash += t.paidNow - mb; } else R.rc[mt(t)] += t.paidNow;
      for (const l of t.lines) { R.g += (l.price - l.cost) * l.qty; R.dc += ((l.list || l.price) - l.price) * l.qty; }
    }
    else if (t.type === 'payment') R.rc[mt(t)] += a;
    else if (t.type === 'expense') { R.x += a; const k = CATS.includes(t.cat) ? t.cat : 'Other'; R.cat[k] = (R.cat[k] || 0) + a; }
    else if (t.type === 'writeoff') R.wo += a; else if (t.type === 'draw') R.dr += a;
    else if (t.type === 'refund') { R.s -= t.total; R.rf += t.total; for (const l of t.lines) R.g -= (l.price - l.cost) * l.qty; }
    else if (t.type === 'lend') R.lg += a;
    else if (t.type === 'lendpay') { R.lr += a; const l = LD[t.lendId]; if (l) R.lie += a * (l.owe - l.amount) / (l.owe || l.amount); }
    else if (t.type === 'lendwo') { const l = LD[t.lendId]; if (l) R.ll += a * l.amount / (l.owe || l.amount); }
    else if (t.type === 'loan') R.lb += a;
    else if (t.type === 'loanpay') { R.lp += a; const l = LN[t.loanId]; if (l) { const o = l.owe || l.amount; R.li += a * (o - l.amount) / o; } }
    else if (t.type === 'restock') { if (t.note !== 'Opening stock') R.st += t.total; }
    else if (t.type === 'adjust') for (const l of t.lines) R.lo -= l.qty * (l.cost ?? (S.items.find(i => i.id === l.itemId) || {}).cost ?? 0);
  }
  for (const k of ['s', 'g', 'x', 'lo', 'wo', 'dr', 'st', 'li', 'lb', 'lp', 'dc', 'rf', 'lie', 'll', 'lg', 'lr']) R[k] = r2(R[k]);
  R.net = r2(R.g - R.x - R.lo - R.wo - R.li + R.lie - R.ll);
  return R;
}
/* What the whole business is worth right now. */
function netPosition() {
  const sv = stockValue(), dinau = r2(outstanding());
  const parts = { cash: C.cash, mobile: C.mobile, dinau, stock: sv.cost, lent: C.lendOut, loans: -C.loanOwed };
  return { ...parts, total: r2(parts.cash + parts.mobile + dinau + sv.cost + C.lendOut - C.loanOwed) };
}

/* ---- loans given: interest calculator ---- */
const PPY = { week: 52, fortnight: 26, month: 12 }, FL = { week: 'weekly', fortnight: 'fortnightly', month: 'monthly' }, FU = { week: 'week', fortnight: 'fortnight', month: 'month' };
function addP(d, f, k) { const [y, mo, da] = d.split('-').map(Number); if (f === 'month') { const t = new Date(y, mo - 1 + k, 1), last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); t.setDate(Math.min(da, last)); return ymd(t); } return ymd(new Date(y, mo - 1, da + k * (f === 'week' ? 7 : 14))); }
function lendCalc(P, rate, lm, n, f, start) {
  P = +P; n = Math.max(1, Math.floor(n)); const i = Math.max(0, rate) / 100, R = [];
  if (lm === 'reducing') { const pm = i > 0 ? P * i / (1 - Math.pow(1 + i, -n)) : P / n; let b = P; for (let k = 1; k <= n; k++) { const it = b * i, a = k === n ? b + it : pm; b -= a - it; R.push({ k, a, it }); } }
  else { const ti = lm === 'flat' ? P * i : P * i * n; for (let k = 1; k <= n; k++) R.push({ k, a: (P + ti) / n, it: ti / n }); }
  const tot = r2(R.reduce((s, x) => s + x.a, 0)), ti = r2(tot - P); let si = 0, sa = 0;
  R.forEach((x, j) => { if (j < n - 1) { x.a = r2(x.a); x.it = r2(x.it); si = r2(si + x.it); sa = r2(sa + x.a); } else { x.a = r2(tot - sa); x.it = r2(ti - si); } x.pr = r2(x.a - x.it); x.due = addP(start, f, x.k); });
  return { rows: R, owe: tot, ti, inst: R[0].a, ann: P > 0 ? ti / P * (PPY[f] / n) * 100 : 0 };
}
function lendState(l) {
  const s = lendCalc(l.principal, l.rate, l.lm, l.n, l.freq, l.date), t = today(), done = l.paid + l.wo; let cum = 0, exp = 0, next = null;
  s.rows.forEach(r => { const pc = cum; cum = r2(cum + r.a); r.cum = cum; r.st = cum <= done + .005 ? 'paid' : pc < done - .005 ? 'part' : 'open'; if (r.due < t) exp = cum; if (!next && cum > done + .005) next = r; });
  const over = Math.max(0, r2(Math.min(exp, l.owe) - done)), days = over > 0 && next ? Math.max(1, dayDiff(next.due, t)) : 0;
  return { s, over, days, next, due: next ? r2(Math.min(l.rem, next.cum - done)) : 0 };
}
const lendOver = () => Object.values(C.lends || {}).filter(l => l.rem > 0).map(l => ({ l, ...lendState(l) })).filter(x => x.over > 0).sort((a, b) => b.days - a.days);
const alertCount = () => overdue().length + lendOver().length;
