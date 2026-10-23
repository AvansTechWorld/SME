/* Customers and dinau (credit). Walk-ins are not customers; a customer exists only when someone has a name or owes money. */
const PP = { q: '', f: 'all', open: null };
function makeCustomer(name, phone) {
  name = (name || '').trim();
  const c = { id: uid(), name: name || nextQuickName(), phone: phone || '', limit: 0, created: today() };
  if (!name) c.quick = true;
  S.customers.push(c); L('CUSTOMER ADDED', c.name + (c.quick ? ' (no name given)' : '')); save(); return c;
}
const lastTxns = id => S.txns.filter(t => t.customerId === id && ['sale', 'payment', 'writeoff', 'refund', 'owed'].includes(t.type)).slice(-12).reverse();

V.people = {
  html() {
    const owed = r2(outstanding()), od = overdue(), nq = S.customers.filter(isQuick).length, owing = S.customers.filter(c => bal(c.id) > 0).length;
    return `<div class="page-h"><h2>Customers</h2><button class="btn btn-sm" data-a="bulkc">Add many</button><button class="btn btn-primary" data-a="newc">${ic('plus')}Add</button></div>
      <div class="stats"><div class="stat hero"><small>Customers owe you</small><b>${m(owed)}</b></div><div class="stat"><small>Overdue ${S.cfg.remindDays || 7}+ days</small><b class="${od.length ? 'warn' : ''}">${od.length}</b></div></div>
      ${S.customers.length ? `<div class="searchbar"><span class="si">${ic('search')}</span><input id="cq" type="search" placeholder="Search customers" autocomplete="off" data-in="cq" value="${esc(PP.q)}"></div>
      <div class="chips" style="margin-bottom:8px">${[['all', 'All ' + S.customers.length], ['owing', 'Owing ' + owing], ['over', 'Overdue ' + od.length], ...(nq ? [['quick', 'No name ' + nq]] : [])].map(x => `<button class="chip" data-a="cf" data-id="${x[0]}" aria-pressed="${PP.f === x[0]}">${x[1]}</button>`).join('')}</div><div id="pl"></div>` :
      `<div class="empty"><h3>No customers yet</h3><p>You do not need one for a normal sale. A customer is saved when someone buys on dinau, or when you add them here.</p><button class="btn btn-primary" data-a="newc">${ic('plus')}Add a customer</button></div>`}`;
  },
  after() { drawPeople(); }
};
IN.cq = t => { PP.q = t.value; drawPeople(); };
A.cf = d => { PP.f = d.id; render(); };
function drawPeople() {
  const el = $('pl'); if (!el) return; const k = PP.q.trim();
  const L = S.customers.map(c => ({ c, b: bal(c.id), d: idle(c.id) })).filter(x => (!k || hit(x.c.name + ' ' + (x.c.phone || ''), k)) && (PP.f === 'all' || (PP.f === 'owing' && x.b > 0) || (PP.f === 'over' && x.b > 0 && x.d >= (S.cfg.remindDays || 7)) || (PP.f === 'quick' && isQuick(x.c))))
    .sort((a, b) => (b.b > 0) - (a.b > 0) || b.d - a.d || b.b - a.b || a.c.name.localeCompare(b.c.name));
  el.innerHTML = L.map(x => custCard(x.c, x.b, x.d)).join('') || '<div class="empty"><p>No customers match.</p></div>';
}
function custCard(c, b, d) {
  const open = PP.open === c.id, cls = b > 0 ? ageCls(d) : '';
  let det = '';
  if (open) {
    const H = lastTxns(c.id), accts = S.cfg.accts || [];
    det = `<div class="detail">
      ${c.phone ? `<div class="kv"><span>Phone</span><b><a href="tel:${esc(c.phone)}" style="color:inherit">${esc(c.phone)}</a></b></div>` : ''}
      <div class="kv"><span>${b < 0 ? 'Credit they have with you' : 'Owes you'}</span><b class="${b > 0 ? cls : ''}">${m(Math.abs(b))}</b></div>
      ${b > 0 ? `<div class="kv"><span>Oldest unpaid sale</span><b>${d} day${d === 1 ? '' : 's'} ago</b></div>` : ''}
      ${C.lastPay[c.id] ? `<div class="kv"><span>Last payment</span><b>${esc(C.lastPay[c.id])}</b></div>` : ''}
      ${c.limit > 0 ? `<div class="kv"><span>Credit limit</span><b>${m(c.limit)}</b></div>` : ''}
      ${b > 0 && accts[0] ? `<div class="acct-mini"><span class="grow small muted">They can pay to<br><b>${esc(acctFull(accts[0]))}</b> <code>${esc(accts[0].num)}</code></span><button class="btn btn-sm" data-a="copy" data-id="${accts[0].id}">${ic('copy')}Copy</button></div>` : ''}
      <div class="acts">${b > 0 ? `<button class="btn btn-primary" data-a="pay" data-id="${c.id}">Take payment</button>` : ''}<button class="btn ${b > 0 ? '' : 'btn-primary'}" data-a="nsale" data-id="${c.id}">New sale</button>
      ${b > 0 ? `<button class="btn" data-a="remind" data-id="${c.id}">${ic('share')}Send reminder</button><button class="btn" data-a="wo" data-id="${c.id}">Write off</button>` : ''}
      <button class="btn" data-a="editc" data-id="${c.id}">${ic('edit')}${isQuick(c) ? 'Add name' : 'Edit'}</button><button class="btn btn-danger" data-a="delc" data-id="${c.id}">${ic('trash')}Delete</button></div>
      ${H.length ? `<div class="hist">${H.map(t => `<div data-a="rc" data-id="${t.id}" style="cursor:pointer"><span>${esc(t.date)} · ${t.type === 'sale' ? 'Sale ' + m(t.total) + (t.total > t.paidNow ? ' (' + m(t.total - t.paidNow) + ' unpaid)' : '') : t.type === 'payment' ? 'Payment' : t.type === 'writeoff' ? 'Written off' : t.type === 'owed' ? 'Owed from before' : 'Return'}</span><b>${t.type === 'owed' ? '+' + m(t.amount) : t.type === 'sale' ? '+' + m(t.total - t.paidNow) : '-' + m(t.type === 'refund' ? t.total : t.amount)}</b></div>`).join('')}</div>` : ''}</div>`;
  }
  return `<div class="item-row${open ? ' open' : ''}"><button class="row-main" data-a="ctog" data-id="${c.id}" aria-expanded="${open}"><span class="grow"><b>${esc(c.name)}</b>${isQuick(c) ? ' <span class="tag warn">no name yet</span>' : ''}<span class="meta" style="display:block">${b > 0 ? 'owing ' + d + ' day' + (d === 1 ? '' : 's') : b < 0 ? 'has credit' : 'all paid up'}</span></span><b class="${b > 0 ? cls : b < 0 ? 'pos' : 'muted'}">${b === 0 ? m(0) : m(Math.abs(b))}</b></button>${det}</div>`;
}
A.ctog = d => { PP.open = PP.open === d.id ? null : d.id; drawPeople(); };
A.newc = async () => {
  const v = await form({ title: 'Add customer', ok: 'Save customer', fields: [{ k: 'n', label: 'Name', max: 40 }, [{ k: 'p', label: 'Phone (optional)', type: 'tel', max: 20 }, { k: 'l', label: 'Credit limit', type: 'number', ph: '0 = none' }], [{ k: 'o', label: 'Already owes you', type: 'number', ph: '0', value: '' }, { k: 'od', label: 'Owed since', type: 'date', value: today() }]], extra: '<p class="hint">Moving over from a notebook? Enter what they owe from before. It is not counted as a sale or profit. An older date makes it show as overdue sooner.</p>', check: v => !v.n.trim() ? 'Enter a name. For a no-name credit sale, use Sell and it is named for you.' : (v.o.trim() && !(num(v.o) >= 0)) ? 'Enter the amount they owe as a number.' : !isYmd(v.od) ? 'Pick a date.' : '' });
  if (!v) return; const n = v.n.trim();
  if (dupName(n) && !await ask('Name already used', `You already have “${n}”. Add a second one anyway?`, 'Add anyway', false)) return;
  const c = makeCustomer(n, v.p.trim()); c.limit = Math.max(0, num(v.l) || 0); if (num(v.o) > 0) add(base('owed', { customerId: c.id, amount: r2(num(v.o)), date: v.od, note: 'Owed from before' })); PP.open = c.id; commit(); toast(n + ' added');
};
A.editc = async d => {
  const c = cu(d.id); if (!c) return;
  const v = await form({ title: isQuick(c) ? 'Add a name' : 'Edit customer', ok: 'Save', fields: [{ k: 'n', label: 'Name', value: isQuick(c) ? '' : c.name, ph: c.name, max: 40 }, [{ k: 'p', label: 'Phone', type: 'tel', value: c.phone, max: 20 }, { k: 'l', label: 'Credit limit (0 = none)', type: 'number', value: c.limit || 0 }]], check: v => !v.n.trim() && !isQuick(c) ? 'Enter a name.' : '' });
  if (!v) return; const n = v.n.trim();
  if (n && dupName(n, c.id) && !await ask('Name already used', `Another customer is called “${n}”. Keep this name anyway?`, 'Keep', false)) return;
  if (n && n !== c.name) { L('CUSTOMER RENAMED', c.name + ' → ' + n); c.name = n; delete c.quick; }
  c.phone = v.p.trim(); c.limit = Math.max(0, num(v.l) || 0); commit();
};
A.delc = async d => {
  const c = cu(d.id); if (!c) return; const b = bal(c.id), T = S.txns.filter(t => t.customerId === c.id);
  const cashIn = T.reduce((s, t) => s + (t.type === 'sale' ? t.paidNow : t.type === 'payment' ? t.amount : 0), 0);
  if (!await ask('Delete ' + c.name + '?', (b > 0 ? `They owe you ${m(b)}. ` : '') + `This also erases their ${plural(T.length, 'transaction')}: money in hand drops by ${m(cashIn)}, sales shrink and sold stock comes back. Only for test or duplicate customers.`, 'Delete')) return;
  L('CUSTOMER DELETED', c.name + ' (owed ' + m(b) + '; ' + T.length + ' transactions erased)');
  S.customers = S.customers.filter(x => x.id !== c.id); S.txns = S.txns.filter(t => t.customerId !== c.id); if (SL.ck.cust === c.id) SL.ck.cust = ''; PP.open = null; commit();
};
A.pay = async d => {
  const c = cu(d.id); if (!c) return; const b = bal(c.id);
  const v = await form({ title: 'Payment from ' + c.name, msg: 'They owe ' + m(Math.max(b, 0)) + '.', ok: 'Save payment', fields: [{ k: 'a', label: 'Amount', type: 'number', value: b > 0 ? b : '' }, [{ k: 'd', label: 'Date', type: 'date', value: today() }, { k: 'm', label: 'Received as', type: 'select', opts: MS.map(k => [k, ML[k]]), value: 'cash' }]], check: v => !(num(v.a) > 0) ? 'Enter the amount.' : !isYmd(v.d) ? 'Pick a date.' : '' });
  if (!v) return; const a = num(v.a);
  if (a > Math.max(b, 0) + .005 && !await ask('More than they owe', `${m(a)} is more than ${m(Math.max(b, 0))}. Keep the extra as advance credit?`, 'Keep as credit', false)) return;
  const t = add(base('payment', { customerId: c.id, amount: r2(a), date: v.d, method: v.m })); commit();
  toast(bal(c.id) > 0 ? `${m(a)} received · ${m(bal(c.id))} still owed` : `${m(a)} received · all paid up`, { label: 'Receipt', fn: () => A.rc({ id: t.id }) });
};
A.wo = async d => {
  const c = cu(d.id), b = c && bal(c.id); if (!c || b <= 0) return;
  const v = await form({ title: 'Write off ' + c.name + '?', msg: `Forgive ${m(b)} as a bad debt. It is recorded as a loss and lowers your profit. No money moves.`, ok: 'Write off', danger: true, fields: [{ k: 'r', label: 'Reason (optional)' }] }); if (!v) return;
  add(base('writeoff', { customerId: c.id, amount: b, note: v.r.trim() })); commit(); toast(m(b) + ' written off');
};
A.nsale = d => { SL.ck.cust = d.id; saveCart(); go('sell'); toast('Selling to ' + (cu(d.id) || {}).name); };
A.remind = d => {
  const c = cu(d.id); if (!c) return; const b = bal(c.id), ac = (S.cfg.accts || [])[0], fn = c.name.split(' ')[0];
  shareText(`Hi ${isQuick(c) ? 'there' : fn}, a reminder from ${S.cfg.store}: you owe ${m(b)}.${ac ? ` You can pay to ${acctFull(ac)}: ${ac.num}.` : ''} Thank you.`, 'Reminder');
};

/* ---- the bell: everything that needs chasing ---- */
A.bell = () => {
  const L1 = overdue(), L2 = lendOver(), t = r2(L1.reduce((s, x) => s + x.b, 0));
  openSheet({
    title: 'Reminders',
    body: (L1.length ? `<p class="muted">${plural(L1.length, 'customer')} owing ${S.cfg.remindDays || 7}+ days · ${m(t)} in total.</p>` + L1.map(x => `<button class="custrow" style="width:100%;margin-bottom:6px;background:none;text-align:left;cursor:pointer" data-a="gocust" data-id="${x.c.id}"><span class="who"><b>${esc(x.c.name)}</b><span class="muted small">${x.d} days owed</span></span><b class="warn">${m(x.b)}</b></button>`).join('') : '') +
      (L2.length ? `<h3>Loan payments late</h3>` + L2.map(x => `<button class="custrow" style="width:100%;margin-bottom:6px;background:none;text-align:left;cursor:pointer" data-a="golend" data-id="${x.l.id}"><span class="who"><b>${esc(x.l.who)}</b><span class="muted small">${x.days} days late</span></span><b class="warn">${m(x.over)}</b></button>`).join('') : '') +
      (!L1.length && !L2.length ? '<div class="empty"><h3>Nobody is overdue</h3><p>Dinau and loan payments are all on time.</p></div>' : ''),
    foot: '<button class="btn" data-sx>Close</button>'
  });
};
A.gocust = d => { closeAllSheets(); PP.open = d.id; PP.q = ''; PP.f = 'all'; go('people'); };
A.golend = d => { closeAllSheets(); AC.seg = 'loans'; AC.openL = d.id; go('accounts'); };

/* ---- add many customers (paste from Excel or a notebook) ---- */
function parseCustomers(text) {
  const seen = new Set(S.customers.map(c => c.name.trim().toLowerCase())), ok = [], bad = [], dup = [];
  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = raw.trim(); if (!line) return;
    const p = (line.includes('\t') ? line.split('\t') : line.split(',')).map(x => x.trim());
    if (idx === 0 && /^(name|customer)/i.test(p[0]) && !(num(p[2]) >= 0)) return;
    const owes = p[2] ? num(p[2]) : 0, since = p[3] || today();
    if (!p[0] || owes === null || owes < 0 || !isYmd(since)) return bad.push(idx + 1);
    const key = p[0].toLowerCase(); if (seen.has(key)) return dup.push(p[0]); seen.add(key);
    ok.push({ n: p[0].slice(0, 40), p: (p[1] || '').slice(0, 20), o: r2(owes), d: since });
  });
  return { ok, bad, dup };
}
A.bulkc = () => openSheet({
  title: 'Add many customers', wide: true,
  body: `<p class="muted">One customer per line: <b>name, phone, amount owed, date owed since</b>. Phone, amount and date are optional. You can paste straight from Excel.</p><p class="hint">The date is written year-month-day, like 2026-09-20. It decides how long they show as owing. Amounts owed from before are not counted as sales or profit.</p>
    <textarea id="bt" placeholder="Mary Kila, 7000 1111, 45, 2026-09-20&#10;John Pato, , 120"></textarea><div id="bp2" class="hint" style="margin-top:8px"></div>`,
  foot: `<button class="btn" data-sx>Cancel</button><button class="btn btn-primary" id="bok" disabled>Add customers</button>`,
  mount: h => {
    $('bt').oninput = () => { const P = parseCustomers($('bt').value); $('bok').disabled = !P.ok.length; $('bok').textContent = P.ok.length ? 'Add ' + plural(P.ok.length, 'customer') : 'Add customers';
      $('bp2').innerHTML = (P.ok.length ? `<b class="pos">${P.ok.length} ready</b> · owing ${m(P.ok.reduce((s, x) => s + x.o, 0))}` : '') + (P.dup.length ? ` · <span class="warn">${P.dup.length} already exist (skipped)</span>` : '') + (P.bad.length ? ` · <span class="neg">line ${P.bad.slice(0, 6).join(', ')} need fixing</span>` : ''); };
    $('bok').onclick = () => {
      const P = parseCustomers($('bt').value); if (!P.ok.length) return;
      for (const x of P.ok) { const c = makeCustomer(x.n, x.p); if (x.o > 0) add(base('owed', { customerId: c.id, amount: x.o, date: x.d, note: 'Owed from before' })); }
      L('CUSTOMERS ADDED', P.ok.length + ' (bulk)'); h.close(); commit(); toast(plural(P.ok.length, 'customer') + ' added');
    };
    setTimeout(() => $('bt').focus(), 60);
  }
});
