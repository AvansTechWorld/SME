/* Receipts and the transaction detail sheet: share, print, return, edit, delete. */
const RT = { sale: 'Sales receipt', payment: 'Payment received', writeoff: 'Bad-debt write-off', expense: 'Expense voucher', draw: 'Money taken out by owner', refund: 'Return receipt', restock: 'Stock purchase', adjust: 'Stock count correction', cash: 'Money added or removed', move: 'Money moved', owed: 'Opening balance', loan: 'Loan received', loanpay: 'Loan repayment', lend: 'Loan given', lendpay: 'Loan payment received', lendwo: 'Loan written off' };
function balAt(t) {
  const i = S.txns.indexOf(t); let b = 0;
  S.txns.forEach((x, j) => { if (x.customerId === t.customerId && (x.ts < t.ts || (x.ts === t.ts && j <= i))) b += x.type === 'sale' ? x.total - x.paidNow : x.type === 'owed' ? x.amount : x.type === 'payment' || x.type === 'writeoff' ? -x.amount : x.type === 'refund' && x.refundTo === 'dinau' ? -x.total : 0; });
  return r2(b);
}
function rcData(t) {
  const c = t.customerId ? cu(t.customerId) : null, d = new Date(t.ts), R = [['No.', nm(t)], ['Date', t.date + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())]], I = [], T = [];
  if (t.type === 'sale') R.push(['Customer', c ? c.name + (c.phone ? ' · ' + c.phone : '') : 'Walk-in']); else if (c) R.push(['Customer', c.name + (c.phone ? ' · ' + c.phone : '')]);
  const meth = ML[mt(t)];
  if (t.type === 'sale') {
    t.lines.forEach(l => I.push([l.qty + ' × ' + l.name + ' @ ' + m(l.price), m(l.qty * l.price)]));
    const saved = r2(t.lines.reduce((s, l) => s + ((l.list || l.price) - l.price) * l.qty, 0));
    T.push(['Total', m(t.total), 1]); if (saved > 0) T.push(['You saved', m(saved)]);
    const mb = Math.min(t.mob || 0, t.paidNow);
    if (t.paidNow > 0) { if (mb > 0 && mb < t.paidNow) { T.push(['Paid cash', m(t.paidNow - mb)]); T.push(['Paid mobile', m(mb)]); } else T.push(['Paid (' + (mb > 0 ? ML.mobile : meth) + ')', m(t.paidNow)]); }
    const u = r2(t.total - t.paidNow); if (u > 0) T.push(['On dinau (unpaid)', m(u)]);
  } else if (t.type === 'refund') {
    t.lines.forEach(l => I.push([l.qty + ' × ' + l.name + ' @ ' + m(l.price), m(l.qty * l.price)]));
    T.push(['Refunded' + (t.refundTo === 'dinau' ? ' (off their dinau)' : ' (' + meth + ')'), m(t.total), 1]);
  } else if (t.type === 'restock') {
    t.lines.forEach(l => I.push([l.qty + ' × ' + l.name + ' @ ' + m(l.cost), m(l.qty * l.cost)]));
    T.push(['Total' + (t.note === 'Opening stock' ? ' (opening stock, not paid)' : ' paid (' + meth + ')'), m(t.total), 1]);
  } else if (t.type === 'adjust') {
    t.lines.forEach(l => I.push([l.name, (l.qty > 0 ? '+' : '') + fmtQ(l.qty)]));
  } else {
    const lab = { payment: 'Received', writeoff: 'Debt written off (no money received)', expense: 'Expense · ' + (t.cat || 'Other'), draw: 'Taken out', cash: t.amount < 0 ? 'Removed' : 'Added', move: t.note || 'Moved', loan: 'Loan from ' + (t.lender || ''), loanpay: 'Repaid to ' + (t.lender || ''), lend: 'Lent to ' + (t.borrower || ''), lendpay: 'Received from ' + (t.borrower || ''), lendwo: 'Written off: ' + (t.borrower || ''), owed: 'Owed from before' }[t.type] || t.type;
    T.push([lab + (['writeoff', 'lendwo', 'move', 'owed'].includes(t.type) ? '' : ' (' + meth + ')'), m(t.amount), 1]); if (t.note && t.type !== 'move') R.push(['Note', t.note]);
  }
  if (c && ['sale', 'payment', 'writeoff', 'refund', 'owed'].includes(t.type)) T.push(['Balance owed after this', m(balAt(t))]);
  return { title: RT[t.type] || t.type, R, I, T };
}
function rcHTML(t) {
  const x = rcData(t), row = (a, b, s) => `<div class="rr${s ? ' rb' : ''}"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;
  return `<div class="rc"><h2>${esc(S.cfg.store)}</h2><div class="rt">${esc(x.title)}</div>${x.R.map(r => row(...r)).join('')}${x.I.length ? '<hr>' + x.I.map(r => row(...r)).join('') : ''}<hr>${x.T.map(r => row(...r)).join('')}<div class="rf">Thank you</div></div>`;
}
A.rc = d => {
  const t = S.txns.find(x => x.id === d.id); if (!t) return;
  const canRet = t.type === 'sale', canEdit = !['lend', 'loan', 'move'].includes(t.type);
  openSheet({
    title: nm(t), body: rcHTML(t) + `<div class="acts no-print"><button class="btn" data-a="rsh" data-id="${t.id}">${ic('share')}Share</button><button class="btn" data-a="prt">${ic('print')}Print / PDF</button>${canRet ? `<button class="btn wide" data-a="ret" data-id="${t.id}">Customer returns something</button>` : ''}${canEdit ? `<button class="btn" data-a="et" data-id="${t.id}">${ic('edit')}Edit</button>` : ''}<button class="btn btn-danger${canEdit ? '' : ' wide'}" data-a="dt" data-id="${t.id}">${ic('trash')}Delete</button></div>`
  });
};
A.prt = () => window.print();
A.rsh = d => { const t = S.txns.find(x => x.id === d.id); if (!t) return; const x = rcData(t); shareText([S.cfg.store, x.title, ...x.R.map(r => r[0] + ': ' + r[1]), ...x.I.map(r => r.join('  ')), ...x.T.map(r => r[0] + ': ' + r[1])].join('\n'), x.title); };

/* ---- delete ---- */
async function removeTxn(id, o = {}) {
  const t = S.txns.find(x => x.id === id); if (!t) return false;
  if (o.confirm && !await ask('Delete this ' + (RT[t.type] || 'entry').toLowerCase() + '?', 'Stock, money and balances are recalculated.', 'Delete')) return false;
  const dep = (ty, key) => S.txns.some(x => x.type === ty && x[key] === t.id);
  if (t.type === 'lend' && (dep('lendpay', 'lendId') || dep('lendwo', 'lendId'))) { toast('Delete the payments first, then the loan'); return false; }
  if (t.type === 'sale' && dep('refund', 'saleId')) { toast('Delete the return first, then the sale'); return false; }
  if (t.type === 'loan' && dep('loanpay', 'loanId')) { toast('Delete the repayments first, then the loan'); return false; }
  const old = S.txns; S.txns = old.filter(x => x.id !== id); C = calc();
  const bad = (t.lines || []).map(l => S.items.find(i => i.id === l.itemId)).find(i => i && qty(i.id) < 0);
  if (bad) { S.txns = old; C = calc(); toast('Cannot delete: ' + bad.name + ' stock would go negative'); return false; }
  L('DELETED', sum(t)); return true;
}
A.dt = async d => { if (await removeTxn(d.id, { confirm: true })) { closeAllSheets(); commit(); toast('Deleted'); } };

/* ---- returns ---- */
A.ret = async d => {
  const t = S.txns.find(x => x.id === d.id); if (!t || t.type !== 'sale') return;
  const dn = {}; for (const x of S.txns) if (x.type === 'refund' && x.saleId === t.id) for (const l of x.lines) { const k = l.itemId || l.name; dn[k] = (dn[k] || 0) + l.qty; }
  const R = t.lines.map(l => ({ l, max: l.qty - (dn[l.itemId || l.name] || 0) })).filter(x => x.max > 0);
  if (!R.length) return toast('Everything on this sale was already returned');
  const c = t.customerId && cu(t.customerId);
  const v = await form({ title: 'Return items', msg: 'Enter how many are coming back. They go back on the shelf and your sales and profit go down.', ok: 'Save return', fields: [...R.map((x, i) => ({ k: 'r' + i, label: `${x.l.name}: returning (max ${fmtQ(x.max)})`, type: 'int', value: 0 })), { k: 'to', label: 'Give the money back as', type: 'select', opts: [['cash', 'Cash'], ['mobile', 'Mobile banking'], ...(c ? [['dinau', 'Take it off what they owe']] : [])], value: 'cash' }],
    check: v => R.some((x, i) => (int(v['r' + i]) || 0) < 0 || (int(v['r' + i]) || 0) > x.max) ? 'A number is higher than what was sold.' : R.every((x, i) => !(int(v['r' + i]) > 0)) ? 'Enter at least one item.' : '' });
  if (!v) return; const L2 = [];
  R.forEach((x, i) => { const q = int(v['r' + i]) || 0; if (q > 0) L2.push({ itemId: x.l.itemId, name: x.l.name, qty: q, price: x.l.price, cost: x.l.cost }); });
  const val = r2(L2.reduce((a, l) => a + l.qty * l.price, 0));
  add(base('refund', { saleId: t.id, customerId: t.customerId || null, lines: L2, total: val, amount: val, refundTo: v.to, method: v.to === 'mobile' ? 'mobile' : 'cash', note: 'Return of ' + nm(t) }));
  closeAllSheets(); commit(); toast(m(val) + ' returned');
};

/* ---- edit ---- */
A.et = async d => {
  const t = S.txns.find(x => x.id === d.id); if (!t) return; const ty = t.type, tl = ty === 'sale' || ty === 'restock', F = [{ k: 'd', label: 'Date', type: 'date', value: t.date }];
  if (ty === 'sale') F.push({ k: 'pn', label: 'Paid now', type: 'number', value: t.paidNow }, { k: 'cu', label: 'Customer', type: 'select', opts: [['', 'Walk-in'], ...S.customers.map(c => [c.id, c.name])], value: t.customerId || '' });
  if (tl) t.lines.forEach((l, i) => F.push([{ k: 'q' + i, label: l.name + ': quantity', type: 'int', value: l.qty }, { k: 'p' + i, label: ty === 'sale' ? 'Price each' : 'Cost each', type: 'number', value: ty === 'sale' ? l.price : l.cost }]));
  else if (ty === 'adjust') t.lines.forEach((l, i) => F.push({ k: 'q' + i, label: l.name + ': change (+/−)', type: 'int', value: l.qty }));
  else { F.push({ k: 'a', label: 'Amount', type: 'number', value: t.amount }); if (ty !== 'payment') F.push({ k: 'n', label: 'Note', value: t.note || '' }); if (ty === 'expense') F.push({ k: 'c', label: 'Category', type: 'select', opts: CATS.map(c => [c, c]), value: t.cat || 'Other' }); }
  const v = await form({ title: 'Edit ' + nm(t), msg: 'Stock, balances and money recalculate automatically.', ok: 'Save changes', fields: F, check: v => !isYmd(v.d) ? 'Pick a date.' : '' }); if (!v) return;
  const n = JSON.parse(JSON.stringify(t)); n.date = v.d; const bad = () => toast('Check the numbers you entered');
  if (tl) {
    const Ls = []; for (let i = 0; i < t.lines.length; i++) { const q = int(v['q' + i]), p = num(v['p' + i]); if (q === null || p === null || q < 0 || p < 0) return bad(); if (q > 0) Ls.push({ ...t.lines[i], qty: q, [ty === 'sale' ? 'price' : 'cost']: p }); }
    if (!Ls.length) return toast('No items left. Delete it instead.');
    n.lines = Ls; n.total = r2(Ls.reduce((s, l) => s + l.qty * (ty === 'sale' ? l.price : l.cost), 0));
    if (ty === 'sale') { const pd = num(v.pn); if (pd === null || pd < 0) return bad(); n.paidNow = Math.min(r2(pd), n.total); n.customerId = v.cu || null; if (n.mob > n.paidNow) n.mob = n.paidNow; if (n.total - n.paidNow > 0 && !n.customerId) return toast('Pick a customer for the unpaid part'); }
  } else if (ty === 'adjust') {
    const Ls = []; for (let i = 0; i < t.lines.length; i++) { const q = int(v['q' + i]); if (q === null) return bad(); if (q) Ls.push({ ...t.lines[i], qty: q }); } if (!Ls.length) return toast('No change left. Delete it instead.'); n.lines = Ls;
  } else { const a = num(v.a); if (a === null || a === 0 || (ty !== 'cash' && a < 0)) return bad(); n.amount = r2(a); if (ty !== 'payment') n.note = v.n.trim(); if (ty === 'expense') n.cat = v.c; }
  const old = S.txns; S.txns = old.map(x => x.id === t.id ? n : x); C = calc();
  const hitI = [...t.lines, ...n.lines].map(l => S.items.find(i => i.id === l.itemId)).find(i => i && qty(i.id) < 0);
  if (hitI) { S.txns = old; C = calc(); return toast('Not enough stock of ' + hitI.name); }
  L('EDITED', sum(t) + '  →  ' + sum(n) + (t.date !== n.date ? '  (date ' + t.date + ' → ' + n.date + ')' : '')); closeAllSheets(); commit(); toast('Updated');
};
