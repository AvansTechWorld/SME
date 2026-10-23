/* Reports: profit for a period, what the business is worth, stock potential, best sellers, history. */
const RP = { seg: 'sum', per: 7, hf: 'all', n: 60 };
const PERIODS = [[1, 'Today'], [7, '7 days'], [30, '30 days'], [0, 'All time']];
V.report = {
  html() {
    return `<div class="page-h"><h2>Reports</h2></div><div class="seg" style="margin-bottom:12px" role="group">${[['sum', 'Summary'], ['hist', 'History']].map(x => `<button data-a="rseg" data-id="${x[0]}" aria-pressed="${RP.seg === x[0]}">${x[1]}</button>`).join('')}</div>${RP.seg === 'sum' ? summary() : historyView()}`;
  }
};
A.rseg = d => { RP.seg = d.id; render(); };
A.rper = d => { RP.per = +d.d; render(); };
const kv = (a, b, cls = '', sub = '') => `<div class="kv"><span>${a}${sub ? `<span class="sub">${sub}</span>` : ''}</span><b class="${cls}">${b}</b></div>`;

function summary() {
  const p = pst(RP.per), sv = stockValue(), np = netPosition();
  const rows = [kv('Sales', m(p.s)), kv('Gross profit', m(p.g), 'pos', 'sales minus what the items cost you'), kv('Expenses', m(p.x), 'neg'), kv('Stock lost or miscounted', m(p.lo), p.lo ? 'neg' : ''), kv('Bad debts written off', m(p.wo), p.wo ? 'neg' : ''),
    ...(p.li > 0 ? [kv('Interest on loans I took', m(p.li), 'neg')] : []), ...(p.lie > 0 ? [kv('Interest earned on loans I gave', m(p.lie), 'pos')] : []), ...(p.ll > 0 ? [kv('Loans I gave, written off', m(p.ll), 'neg')] : [])];
  const cats = Object.entries(p.cat).sort((a, b) => b[1] - a[1]), mx = cats.length ? cats[0][1] : 1;
  const byCat = {}; for (const x of sv.L) { const k = (x.i.cat || '').trim() || 'No category', g = byCat[k] = byCat[k] || { n: 0, c: 0, r: 0 }; g.n += x.n; g.c += x.n * x.i.cost; g.r += x.n * x.i.price; }
  const cl = Object.entries(byCat).map(([k, g]) => ({ k, ...g, p: g.r - g.c })).sort((a, b) => b.p - a.p), cmx = cl.length ? Math.max(...cl.map(x => x.p), 1) : 1;
  const top = [...sv.L].map(x => ({ ...x, p: x.n * (x.i.price - x.i.cost) })).sort((a, b) => b.p - a.p).slice(0, 5);
  return `<div class="chips" style="margin-bottom:10px">${PERIODS.map(x => `<button class="chip" data-a="rper" data-d="${x[0]}" aria-pressed="${RP.per === x[0]}">${x[1]}</button>`).join('')}</div>
    <div class="stats"><div class="stat hero full"><small>Profit ${RP.per === 1 ? 'today' : RP.per ? 'in the last ' + RP.per + ' days' : 'so far'}</small><b>${m(p.net)}</b></div>
      <div class="stat"><small>Sales (${p.n})</small><b>${m(p.s)}</b></div><div class="stat"><small>Money received</small><b>${m(p.rc.cash + p.rc.mobile)}</b></div></div>
    <div class="card"><h3>Profit working</h3>${rows.join('')}${kv('Net profit', m(p.net), p.net < 0 ? 'neg' : 'pos').replace('class="kv"', 'class="kv total"')}</div>
    <div class="card"><h3>Money in and out</h3>${kv('Received in cash', m(p.rc.cash))}${kv('Received by mobile', m(p.rc.mobile))}${kv('Spent on stock', m(p.st), '', 'not an expense, it becomes stock on your shelf')}${kv('Taken out by you', m(p.dr), '', 'not an expense and not profit')}${p.lb > 0 ? kv('Loans taken', m(p.lb)) : ''}${p.lp > 0 ? kv('Loan repayments', m(p.lp)) : ''}${p.lg > 0 ? kv('Loans I gave out', m(p.lg)) : ''}${p.lr > 0 ? kv('Loan payments received', m(p.lr)) : ''}${p.rf > 0 ? kv('Returns refunded', m(p.rf)) : ''}${p.dc > 0 ? kv('Discounts given', m(p.dc)) : ''}</div>
    ${cats.length ? `<div class="card"><h3>Expenses by type</h3>${cats.map(([k, v]) => `<div class="kv"><span>${esc(k)}<div class="bar warn"><i style="width:${Math.max(4, v / mx * 100)}%"></i></div></span><b>${m(v)}</b></div>`).join('')}</div>` : ''}
    ${S.items.length ? `<div class="card"><h3>Profit sitting on your shelf</h3>
      <div class="stats" style="margin:0 0 6px"><div class="stat"><small>Stock at cost</small><b>${m(sv.cost)}</b></div><div class="stat"><small>Worth if all sold</small><b>${m(sv.retail)}</b></div><div class="stat"><small>Potential profit</small><b class="${sv.profit < 0 ? 'neg' : 'pos'}">${m(sv.profit)}</b></div><div class="stat"><small>Profit margin</small><b>${sv.margin}%</b></div></div>
      ${cl.length > 1 || (cl[0] && cl[0].k !== 'No category') ? cl.map(x => `<div class="kv"><span>${esc(x.k)}<span class="sub">${fmtQ(x.n)} pcs · cost ${m(x.c)} · worth ${m(x.r)}</span><div class="bar pos"><i style="width:${Math.max(4, x.p / cmx * 100)}%"></i></div></span><b class="${x.p < 0 ? 'neg' : 'pos'}">${m(x.p)}</b></div>`).join('') : ''}
      ${top.length ? `<h3 style="font-size:14px;color:var(--muted)">Biggest profit waiting</h3>${top.map(x => kv(esc(x.i.name), m(x.p), x.p < 0 ? 'neg' : 'pos', stockText(x.i, x.n) + ' left · ' + margin(x.i) + '% margin')).join('')}` : ''}</div>` : ''}
    <div class="card"><h3>What the business is worth</h3>${kv('Cash', m(np.cash))}${kv('Mobile banking', m(np.mobile))}${kv('Owed by customers (dinau)', m(np.dinau))}${kv('Stock at cost', m(np.stock))}${np.lent ? kv('Loans I gave, still owed to me', m(np.lent)) : ''}${np.loans ? kv('Loans I owe', m(np.loans), 'neg') : ''}${kv('Total', m(np.total), np.total < 0 ? 'neg' : '').replace('class="kv"', 'class="kv total"')}</div>
    ${best(p)}`;
}
function best(p) {
  const lim = RP.per ? daysAgo(RP.per - 1) : '0000', R = {};
  for (const t of S.txns) { if (t.date < lim) continue; if (t.type === 'sale' || t.type === 'refund') { const s = t.type === 'sale' ? 1 : -1; for (const l of t.lines) { const k = l.itemId || ('x:' + l.name), r = R[k] = R[k] || { n: l.name, q: 0, p: 0 }; r.q += s * l.qty; r.p += s * (l.price - l.cost) * l.qty; } } }
  const L = Object.values(R).filter(x => x.q > 0).sort((a, b) => b.q - a.q).slice(0, 8);
  return L.length ? `<div class="card"><h3>Best sellers</h3>${L.map((x, i) => kv(esc(x.n), fmtQ(x.q) + ' sold', '', 'profit ' + m(x.p))).join('')}</div>` : '';
}

/* ---- history ---- */
const HF = { all: ['All', null], sales: ['Sales', ['sale', 'refund']], pay: ['Payments', ['payment', 'writeoff', 'lendpay', 'owed']], stock: ['Stock', ['restock', 'adjust']], money: ['Money', ['expense', 'draw', 'cash', 'move', 'loan', 'loanpay', 'lend', 'lendwo']] };
function feedRow(t) {
  const c = t.customerId && cu(t.customerId), tm = t.ts ? pad(new Date(t.ts).getHours()) + ':' + pad(new Date(t.ts).getMinutes()) : '';
  let lb, sub = '', amt, cls = '';
  switch (t.type) {
    case 'sale': lb = t.lines.map(l => l.qty + '× ' + l.name).join(', '); sub = custName(t) + (t.total > t.paidNow ? ' · ' + m(t.total - t.paidNow) + ' on dinau' : ''); amt = '+' + m(t.total); cls = 'pos'; break;
    case 'payment': lb = 'Payment received'; sub = custName(t); amt = '+' + m(t.amount); cls = 'pos'; break;
    case 'owed': lb = 'Owed from before'; sub = custName(t); amt = m(t.amount); cls = 'warn'; break;
    case 'refund': lb = 'Return: ' + t.lines.map(l => l.qty + '× ' + l.name).join(', '); sub = custName(t); amt = '-' + m(t.total); cls = 'neg'; break;
    case 'restock': lb = (t.note === 'Opening stock' ? 'Opening stock: ' : 'Restock: ') + t.lines.map(l => l.qty + '× ' + l.name).join(', '); amt = t.note === 'Opening stock' ? m(t.total) : '-' + m(t.total); break;
    case 'adjust': lb = 'Count fixed: ' + t.lines.map(l => (l.qty > 0 ? '+' : '') + l.qty + ' ' + l.name).join(', '); break;
    case 'expense': lb = 'Expense · ' + (t.cat || 'Other'); sub = t.note; amt = '-' + m(t.amount); cls = 'neg'; break;
    case 'draw': lb = 'Taken out'; sub = t.note; amt = '-' + m(t.amount); cls = 'neg'; break;
    case 'writeoff': lb = 'Written off'; sub = c ? c.name : ''; amt = m(t.amount); cls = 'warn'; break;
    case 'cash': lb = t.amount < 0 ? 'Money removed' : 'Money added'; sub = t.note; amt = (t.amount > 0 ? '+' : '') + m(t.amount); cls = t.amount < 0 ? 'neg' : 'pos'; break;
    case 'move': lb = t.note || 'Money moved'; amt = m(t.amount); break;
    case 'loan': lb = 'Loan from ' + t.lender; amt = '+' + m(t.amount); break;
    case 'loanpay': lb = 'Repaid ' + t.lender; amt = '-' + m(t.amount); cls = 'neg'; break;
    case 'lend': lb = 'Lent to ' + t.borrower; amt = '-' + m(t.amount); break;
    case 'lendpay': lb = 'Loan payment from ' + t.borrower; amt = '+' + m(t.amount); cls = 'pos'; break;
    case 'lendwo': lb = 'Loan written off: ' + t.borrower; amt = m(t.amount); cls = 'warn'; break;
    default: lb = t.type; amt = '';
  }
  return `<button class="item-row row-main" style="margin-bottom:8px;border:1px solid var(--line);width:100%" data-a="rc" data-id="${t.id}"><span class="grow"><b style="font-weight:600;display:block;overflow-wrap:anywhere">${esc(lb)}</b><span class="meta">${esc(t.date)} ${tm} · ${nm(t)}${sub ? ' · ' + esc(sub) : ''}</span></span><b class="${cls}">${amt}</b></button>`;
}
function historyView() {
  const types = HF[RP.hf][1], L = S.txns.filter(t => !types || types.includes(t.type)).sort((a, b) => b.ts - a.ts), shown = L.slice(0, RP.n);
  return `<div class="chips" style="margin-bottom:10px">${Object.entries(HF).map(([k, v]) => `<button class="chip" data-a="hf" data-id="${k}" aria-pressed="${RP.hf === k}">${v[0]}</button>`).join('')}</div>
    ${shown.map(feedRow).join('') || '<div class="empty"><h3>Nothing here yet</h3><p>Sales, payments and stock changes show up here.</p></div>'}
    ${L.length > shown.length ? `<button class="btn btn-block" data-a="more">Show more (${L.length - shown.length} older)</button>` : ''}`;
}
A.hf = d => { RP.hf = d.id; RP.n = 60; render(); };
A.more = () => { RP.n += 100; render(); };
