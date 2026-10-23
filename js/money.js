/* Accounts tab: where the money is, account numbers to copy, money in and out, loans. */
const AC = { seg: 'numbers', openL: null, q: '', manage: false };
const acctWho = a => a.holder || a.label;
const acctFull = a => a.holder && a.label ? `${a.holder} (${a.label})` : acctWho(a);
const kindLbl = { bank: 'Bank', mobile: 'Mobile money', other: 'Other' };
const initials = s => (s || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

V.accounts = {
  html() {
    const late = lendOver().length;
    return `<div class="page-h"><h2>Accounts</h2><button class="btn" data-a="tools" data-tab="cash">Count till</button></div>
      <div class="bal-cards"><div class="bal"><small>${ic('cash')} Cash</small><b class="${C.cash < 0 ? 'neg' : ''}">${m(C.cash)}</b></div><div class="bal"><small>${ic('phone')} Mobile banking</small><b class="${C.mobile < 0 ? 'neg' : ''}">${m(C.mobile)}</b></div></div>
      <div class="seg" style="margin-bottom:12px" role="group">${[['numbers', 'Numbers'], ['money', 'Money'], ['loans', 'Loans']].map(x => `<button data-a="acseg" data-id="${x[0]}" aria-pressed="${AC.seg === x[0]}">${x[1]}${x[0] === 'loans' && late ? ' •' : ''}</button>`).join('')}</div>
      ${AC.seg === 'numbers' ? numbersPage() : AC.seg === 'money' ? moneyPage() : loansPage()}`;
  },
  after() { if (AC.seg === 'numbers') drawAccts(); }
};
A.acseg = d => { AC.seg = d.id; AC.manage = false; render(); };

const sortedAccts = () => [...(S.cfg.accts || [])].sort((a, b) => acctWho(a).localeCompare(acctWho(b), undefined, { sensitivity: 'base' }));
function numbersPage() {
  const n = (S.cfg.accts || []).length;
  if (!n) return `<div class="empty"><h3>No account numbers yet</h3><p>Save the bank and mobile-money numbers you pay or get paid on, then copy any of them in one tap.</p><button class="btn btn-primary" data-a="aadd">${ic('plus')}Add an account number</button></div>`;
  return `<div class="row" style="margin-bottom:10px">${n > 5 ? `<div class="searchbar grow" style="margin:0"><span class="si">${ic('search')}</span><input id="aq" type="search" placeholder="Search accounts" autocomplete="off" data-in="aq" value="${esc(AC.q)}"></div>` : '<span class="grow muted small">Tap a name to copy its number.</span>'}<button class="btn btn-sm" data-a="aadd" style="flex:none">${ic('plus')}Add</button><button class="btn btn-sm${AC.manage ? ' btn-primary' : ''}" data-a="amanage" style="flex:none">${AC.manage ? 'Done' : 'Edit'}</button></div><div id="alist"></div>`;
}
function acctRow(a) {
  const sub = (a.label || '') + (a.kind === 'mobile' ? ' · Mobile money' : a.kind === 'other' ? ' · Other' : '');
  const body = `<span class="av" aria-hidden="true">${esc(initials(acctWho(a)))}</span><span class="grow"><b>${esc(acctWho(a))}</b><span class="muted small" style="display:block">${esc(a.holder ? sub : (kindLbl[a.kind] || ''))}${a.note ? ' · ' + esc(a.note) : ''}</span><code>${esc(a.num)}</code></span>`;
  return AC.manage
    ? `<div class="acct2">${body}<button class="icon-btn" data-a="aedit" data-id="${a.id}" aria-label="Edit ${esc(acctWho(a))}">${ic('edit')}</button><button class="icon-btn" data-a="adel" data-id="${a.id}" aria-label="Delete ${esc(acctWho(a))}">${ic('trash')}</button></div>`
    : `<button class="acct2" data-a="copy" data-id="${a.id}">${body}<span class="cpy">${ic('copy')}</span></button>`;
}
function drawAccts() {
  const el = $('alist'); if (!el) return; const k = AC.q.trim();
  const L = sortedAccts().filter(a => !k || hit([a.holder, a.label, a.num, a.note].join(' '), k));
  el.innerHTML = L.map(acctRow).join('') || '<div class="empty"><p>No account matches.</p></div>';
}
IN.aq = t => { AC.q = t.value; drawAccts(); };
A.amanage = () => { AC.manage = !AC.manage; render(); };

function moneyPage() {
  return `<div class="card"><h3>Move money</h3><div class="acts" style="margin-top:0">
      <button class="btn" data-a="move">${ic('swap')}Cash ↔ mobile</button><button class="btn" data-a="cash">${ic('plus')}Add or remove</button>
      <button class="btn" data-a="spend">Record expense</button><button class="btn" data-a="draw">I took money out</button></div></div>
    <div class="card"><h3>End of day</h3><p class="muted small" style="margin-bottom:10px">Count the till and compare it with what the app expects.</p><button class="btn btn-primary btn-block" data-a="close">Close the day</button>${closeNote()}</div>`;
}
const closeNote = () => { const c = (S.cfg.closes || []).slice(-1)[0]; return c ? `<p class="hint">Last cash-up ${esc(c.date)}: counted ${m(c.counted)}, expected ${m(c.exp)} · ${c.diff ? (c.diff < 0 ? 'short ' : 'over ') + m(Math.abs(c.diff)) : 'balanced'}</p>` : ''; };

/* ---- account numbers ---- */
A.copy = async (d, el) => {
  const a = (S.cfg.accts || []).find(x => x.id === d.id); if (!a) return;
  /* No toast on success: Android already shows its own "copied" notice, and the button flashes a tick. */
  const ok = await copyText(a.num); if (!ok) toast('Could not copy. Select the number and copy it by hand.');
  if (ok && el) { const t = el.querySelector('.cpy') || el, h = t.innerHTML; t.classList.add('done'); t.innerHTML = ic('check') + (t === el || t.classList.contains('btn') ? 'Copied' : ''); setTimeout(() => { t.classList.remove('done'); t.innerHTML = h; }, 1500); }
};
const acctFields = a => [{ k: 'h', label: 'Account holder (whose account)', value: a ? a.holder || '' : '', ph: 'e.g. Kila Trading or Mary Kila', max: 40 }, { k: 'l', label: 'Bank or wallet', value: a ? a.label : '', ph: 'e.g. BSP Savings', max: 40 }, { k: 'kd', label: 'Type', type: 'select', opts: Object.entries(kindLbl), value: a ? a.kind : 'bank' }, { k: 'n', label: 'Account number', value: a ? a.num : '', max: 40, type: 'text' }, { k: 'o', label: 'Note (optional)', value: a ? a.note || '' : '', max: 60 }];
const acctCheck = v => !v.h.trim() ? 'Enter whose account it is.' : !v.l.trim() ? 'Enter the bank or wallet.' : !v.n.trim() ? 'Enter the account number.' : '';
A.aadd = async () => { const v = await form({ title: 'Add account number', fields: acctFields(), check: acctCheck }); if (!v) return; (S.cfg.accts = S.cfg.accts || []).push({ id: uid(), holder: v.h.trim(), label: v.l.trim(), num: v.n.trim(), kind: v.kd, note: v.o.trim() }); L('ACCOUNT ADDED', v.h.trim() + ' · ' + v.l.trim()); commit(); };
A.aedit = async d => { const a = (S.cfg.accts || []).find(x => x.id === d.id); if (!a) return; const v = await form({ title: 'Edit account number', fields: acctFields(a), check: acctCheck }); if (!v) return; Object.assign(a, { holder: v.h.trim(), label: v.l.trim(), num: v.n.trim(), kind: v.kd, note: v.o.trim() }); L('ACCOUNT EDITED', acctFull(a)); commit(); };
A.adel = async d => { const a = (S.cfg.accts || []).find(x => x.id === d.id); if (a && await ask('Delete ' + acctFull(a) + '?', 'This removes the saved number from this device.', 'Delete')) { S.cfg.accts = S.cfg.accts.filter(x => x.id !== a.id); L('ACCOUNT DELETED', acctFull(a)); commit(); } };

/* ---- money in and out ---- */
const fromSel = (k = 'from', label = 'Paid from') => ({ k, label, type: 'select', opts: MS.map(x => [x, ML[x]]), value: 'cash' });
A.spend = async () => {
  const v = await form({ title: 'Record expense', msg: 'Not stock. Stock purchases are recorded when you restock.', ok: 'Save expense', fields: [{ k: 'a', label: 'Amount', type: 'number' }, [{ k: 'c', label: 'Category', type: 'select', opts: CATS.map(c => [c, c]), value: 'Transport' }, fromSel()], { k: 'n', label: 'Note (optional)' }], check: v => !(num(v.a) > 0) ? 'Enter the amount.' : '' });
  if (!v) return; add(base('expense', { amount: r2(num(v.a)), note: v.n.trim(), cat: v.c, method: v.from })); commit(); toast(m(num(v.a)) + ' expense saved');
};
A.draw = async () => {
  const v = await form({ title: 'I took money out', msg: 'Money you took for yourself. It is not an expense and not profit, so it has its own line.', fields: [{ k: 'a', label: 'Amount', type: 'number' }, fromSel('from', 'Taken from'), { k: 'n', label: 'Note (optional)' }], check: v => !(num(v.a) > 0) ? 'Enter the amount.' : '' });
  if (!v) return; add(base('draw', { amount: r2(num(v.a)), note: v.n.trim(), method: v.from })); commit(); toast(m(num(v.a)) + ' recorded');
};
A.cash = async () => {
  const v = await form({ title: 'Add or remove money', msg: 'Starting float, a top-up, or a correction. Use a minus sign to take money out.', fields: [[{ k: 'a', label: 'Amount (+ or −)', type: 'number' }, fromSel('from', 'In')], { k: 'n', label: 'Note', value: 'Starting cash' }], check: v => { const a = num(v.a); return !a ? 'Enter an amount.' : ''; } });
  if (!v) return; add(base('cash', { amount: r2(num(v.a)), note: v.n.trim(), method: v.from })); commit(); toast('Saved');
};
A.move = async () => {
  const v = await form({ title: 'Move money', msg: `Cash ${m(C.cash)} · Mobile ${m(C.mobile)}`, ok: 'Move it', fields: [{ k: 'dir', label: 'Direction', type: 'select', opts: [['c2m', 'Cash → mobile banking (deposit)'], ['m2c', 'Mobile banking → cash (withdraw)']], value: 'c2m' }, { k: 'a', label: 'Amount', type: 'number' }],
    check: v => { const a = num(v.a); if (!(a > 0)) return 'Enter the amount.'; const have = v.dir === 'c2m' ? C.cash : C.mobile; return a > have + .005 ? `You only have ${m(have)} there.` : ''; } });
  if (!v) return; add(base('move', { amount: r2(num(v.a)), method: v.dir === 'c2m' ? 'mobile' : 'cash', note: v.dir === 'c2m' ? 'Cash to mobile' : 'Mobile to cash' })); commit(); toast(m(num(v.a)) + ' moved');
};
A.close = async () => {
  const p = pst(1), exp = C.cash;
  const v = await form({ title: 'Close the day', msg: `Today: ${m(p.s)} sales (${p.n}), ${m(p.g)} gross profit, ${m(p.x)} expenses. The app expects ${m(exp)} cash in the till. Count it and enter what is really there.`, ok: 'Save cash-up', fields: [{ k: 'a', label: 'Cash you counted', type: 'number' }, { k: 'n', label: 'Note (optional)' }], check: v => num(v.a) === null || num(v.a) < 0 ? 'Enter the cash you counted.' : '' });
  if (!v) return; const a = num(v.a), d = r2(a - exp);
  if (d) add(base('cash', { amount: d, method: 'cash', note: 'Cash-up ' + (d < 0 ? 'short' : 'over') + (v.n.trim() ? ' · ' + v.n.trim() : '') }));
  (S.cfg.closes = S.cfg.closes || []).push({ date: today(), exp, counted: r2(a), diff: d }); S.cfg.closes = S.cfg.closes.slice(-60); L('CASH-UP', 'counted ' + m(a) + ' expected ' + m(exp)); commit();
  const txt = `${S.cfg.store} ${today()}\nSales: ${m(p.s)} (${p.n})\nGross profit: ${m(p.g)}\nExpenses: ${m(p.x)}\nCash counted: ${m(a)}${d ? (d < 0 ? ' (short ' : ' (over ') + m(Math.abs(d)) + ')' : ' (balanced)'}`;
  if (await ask('Day closed', d ? (d < 0 ? 'The till is short by ' : 'The till is over by ') + m(Math.abs(d)) + '. It was recorded so your cash matches the count.' : 'The till balances.', 'Share summary', false)) shareText(txt, 'Day summary');
};

/* ---- loans ---- */
function loansPage() {
  const Ls = Object.values(C.lends).sort((a, b) => (b.rem > 0) - (a.rem > 0) || b.date.localeCompare(a.date));
  const Tk = Object.entries(C.loans).map(([id, l]) => ({ id, ...l, b: r2(l.owe - l.paid) })).sort((a, b) => (a.b > 0 ? 0 : 1) - (b.b > 0 ? 0 : 1) || (a.due || '9999').localeCompare(b.due || '9999'));
  return `<div class="card-h"><h3>Loans I gave</h3></div>
    <div class="acts" style="margin:0 0 10px"><button class="btn btn-primary" data-a="lend">${ic('plus')}Lend money</button><button class="btn" data-a="lcalc">Interest calculator</button></div>
    ${Ls.length ? `<div class="stats s3"><div class="stat"><small>Still owed</small><b class="warn">${m(C.lendOwed)}</b></div><div class="stat"><small>Interest earned</small><b class="pos">${m(C.lendInt)}</b></div><div class="stat"><small>Open loans</small><b>${Ls.filter(l => l.rem > 0).length}</b></div></div>` : ''}
    ${Ls.map(lendCard).join('') || '<p class="muted">No loans given out. When you lend money, the plan and every payment are tracked here.</p>'}
    <div class="card-h" style="margin-top:22px"><h3>Loans I owe</h3></div>
    <div class="acts" style="margin:0 0 10px"><button class="btn btn-primary wide" data-a="loan">${ic('plus')}Record a loan I took</button></div>
    ${Tk.map(l => `<div class="card"><div class="row"><b class="grow">${esc(l.lender)}</b><b class="${l.b > 0 ? 'neg' : 'pos'}">${l.b > 0 ? m(l.b) + ' left' : 'Paid off'}</b></div><div class="muted small">Borrowed ${m(l.principal)} on ${esc(l.date)}${l.owe > l.principal ? ` · pay back ${m(l.owe)} (interest ${m(l.owe - l.principal)})` : ''}${l.due ? ` · due ${esc(l.due)}${l.b > 0 && l.due < today() ? ' (overdue)' : ''}` : ''}</div><div class="bar pos"><i style="width:${Math.min(100, Math.round(l.paid / l.owe * 100))}%"></i></div>${l.b > 0 ? `<button class="btn btn-block gap" data-a="lpay" data-id="${l.id}">Make a repayment</button>` : ''}</div>`).join('') || '<p class="muted">No borrowed money recorded.</p>'}`;
}
function lendCard(l) {
  const open = AC.openL === l.id, live = l.rem > 0, st = lendState(l), pct = Math.min(100, Math.round((l.paid + l.wo) / l.owe * 100)), late = live && st.over > 0;
  const how = l.lm === 'flat' ? l.rate + '% flat' : l.rate + '% per ' + FU[l.freq] + (l.lm === 'reducing' ? ', reducing' : '');
  let det = '';
  if (open) {
    const H = S.txns.filter(t => t.lendId === l.id && t.type !== 'lend').sort((a, b) => b.ts - a.ts);
    det = `<p class="muted small" style="margin:10px 0 2px">Payment plan${l.note ? ' · ' + esc(l.note) : ''}</p>${st.s.rows.map(r => `<div class="line" style="padding:4px 0"><span class="nm ${r.st === 'paid' ? 'muted' : ''}">${r.k}. ${esc(r.due)}</span><span class="${r.st !== 'paid' && r.due < today() ? 'neg' : ''}">${m(r.a)}</span><span class="amt" style="min-width:44px">${r.st === 'paid' ? 'paid' : r.st === 'part' ? 'part' : r.due < today() ? 'late' : ''}</span></div>`).join('')}
      ${H.length ? `<p class="muted small" style="margin:10px 0 2px">Received so far</p><div class="hist">${H.map(t => `<div><span>${esc(t.date)} · ${t.type === 'lendpay' ? ML[mt(t)] : 'Written off'}</span><b class="${t.type === 'lendpay' ? 'pos' : 'neg'}">${t.type === 'lendpay' ? '+' : ''}${m(t.amount)}</b></div>`).join('')}</div>` : ''}
      ${live ? `<div class="acts"><button class="btn btn-primary" data-a="lrecv" data-id="${l.id}">Receive payment</button><button class="btn" data-a="lremind" data-id="${l.id}">${ic('share')}Reminder</button><button class="btn btn-danger wide" data-a="lwo" data-id="${l.id}">Write off the rest</button></div>` : ''}`;
  }
  return `<div class="card"><button class="row" style="width:100%;background:none;border:0;text-align:left;cursor:pointer;padding:0" data-a="ltog" data-id="${l.id}" aria-expanded="${open}"><span class="grow"><b>${esc(l.who)}</b><span class="muted small" style="display:block">Lent ${m(l.principal)} on ${esc(l.date)} · ${l.n} × ${m(l.inst)} ${FL[l.freq]} · ${how}</span></span><span class="right">${live ? `<b class="${late ? 'neg' : 'warn'}">${m(l.rem)}</b><span class="muted small" style="display:block">${late ? st.days + ' days late' : st.next ? 'next ' + esc(st.next.due) : ''}</span>` : `<b class="pos">${l.wo > 0 && l.paid < l.owe - .005 ? 'Closed' : 'Paid'}</b>`}</span></button><div class="bar pos"><i style="width:${pct}%"></i></div>${det}</div>`;
}
A.ltog = d => { AC.openL = AC.openL === d.id ? null : d.id; render(); };

function lendDlg(calcOnly) {
  const g = id => $(id);
  openSheet({
    title: calcOnly ? 'Interest calculator' : 'Lend money', wide: true,
    body: `<p class="muted">${calcOnly ? 'Try different amounts, rates and terms. Nothing is saved.' : 'Money you lend leaves your till now and comes back as payments. Only the interest is profit.'}</p>
    ${calcOnly ? '' : `<label class="f" for="lw">Who is borrowing?</label><select id="lw"><option value="">Someone else (type a name)</option>${S.customers.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><input id="ln" placeholder="Borrower name" maxlength="40" style="margin-top:8px">`}
    <div class="two"><div><label class="f" for="la">Amount</label><input id="la" inputmode="decimal" autocomplete="off"></div><div><label class="f" for="lt">Number of payments</label><input id="lt" inputmode="numeric" value="4" autocomplete="off"></div></div>
    <label class="f" for="lm">Interest type</label><select id="lm"><option value="flat">Flat fee: one % of the amount, added once</option><option value="simple">Simple: % of the amount for every period</option><option value="reducing">Reducing balance: % on what is still owed</option></select>
    <div class="two"><div><label class="f" id="lrl" for="lr">Interest %</label><input id="lr" inputmode="decimal" value="10" autocomplete="off"></div><div><label class="f" for="lf">Pay every</label><select id="lf"><option value="week">Week</option><option value="fortnight">Fortnight</option><option value="month" selected>Month</option></select></div></div>
    ${calcOnly ? '' : `<div class="two"><div><label class="f" for="lx">Paid out from</label><select id="lx">${MS.map(k => `<option value="${k}">${ML[k]}</option>`).join('')}</select></div><div><label class="f" for="ld">Loan date</label><input id="ld" type="date" value="${today()}"></div></div><label class="f" for="lo">Note (optional)</label><input id="lo" maxlength="60" autocomplete="off">`}
    <div id="lp" class="card" style="margin:14px 0 0"></div>`,
    foot: `<button class="btn" data-sx>${calcOnly ? 'Close' : 'Cancel'}</button>${calcOnly ? '' : '<button class="btn btn-primary" id="lsv">Lend it</button>'}`,
    mount: h => {
      const upd = () => {
        const P = num(g('la').value), n = int(g('lt').value) || 0, r = num(g('lr').value), lm = g('lm').value, f = g('lf').value, d = !calcOnly && isYmd(g('ld').value) ? g('ld').value : today();
        g('lrl').textContent = lm === 'flat' ? 'Interest % (one-off)' : 'Interest % per ' + FU[f];
        if (!(P > 0) || n < 1 || n > 520 || r === null || r < 0) { g('lp').innerHTML = '<span class="muted">Enter the amount, the number of payments and the interest.</span>'; return null; }
        const c = lendCalc(P, r, lm, n, f, d); let warn = '';
        if (!calcOnly) { const have = C.m[g('lx').value], w = g('lw').value; if (P > have) warn += `<p class="warn small">You only have ${m(have)} in ${ML[g('lx').value].toLowerCase()}.</p>`; if (w && bal(w) > 0) warn += `<p class="warn small">${esc(cu(w).name)} already owes you ${m(bal(w))} on dinau.</p>`; }
        g('lp').innerHTML = `<div class="stats" style="margin:0"><div class="stat"><small>Each payment</small><b>${m(c.inst)}</b></div><div class="stat"><small>Total paid back</small><b>${m(c.owe)}</b></div><div class="stat"><small>Interest you earn</small><b class="pos">${m(c.ti)}</b></div><div class="stat"><small>Same as per year</small><b>${Math.round(c.ann * 10) / 10}%</b></div></div>${warn}<p class="muted small" style="margin:10px 0 2px">Payment plan</p><div style="max-height:160px;overflow:auto">${c.rows.slice(0, 24).map(x => `<div class="line" style="padding:3px 0"><span class="nm muted">${x.k}. ${esc(x.due)}</span><span>${m(x.a)}</span></div>`).join('')}${c.rows.length > 24 ? `<div class="muted small">…and ${c.rows.length - 24} more</div>` : ''}</div>`;
        return { P, n, r, lm, f, d, c };
      };
      ['la', 'lt', 'lm', 'lf', 'lr', 'ld', 'lx'].forEach(id => { const x = g(id); if (x) { x.oninput = upd; x.onchange = upd; } });
      if (!calcOnly) {
        g('lw').onchange = () => { g('ln').style.display = g('lw').value ? 'none' : ''; upd(); };
        g('lsv').onclick = () => {
          const r = upd(); if (!r) return toast('Check the amount, payments and interest');
          const w = g('lw').value, who = w ? cu(w).name : g('ln').value.trim(); if (!who) return toast('Enter who is borrowing');
          const id = uid(); add(base('lend', { id, lendId: id, borrowerId: w || null, borrower: who.slice(0, 40), date: r.d, amount: r2(r.P), owe: r.c.owe, inst: r.c.inst, n: r.n, freq: r.f, lm: r.lm, rate: r.r, note: g('lo').value.trim(), method: g('lx').value }));
          h.close(); AC.seg = 'loans'; AC.openL = id; go('accounts'); commit(); toast(m(r.P) + ' lent to ' + who);
        };
      }
      upd();
    }
  });
}
A.lend = () => lendDlg(false); A.lcalc = () => lendDlg(true);
A.lrecv = async d => {
  const l = C.lends[d.id]; if (!l || l.rem <= 0) return; const st = lendState(l);
  const v = await form({ title: 'Payment from ' + l.who, msg: `Still owed ${m(l.rem)}.` + (st.over > 0 ? ` ${m(st.over)} of it is overdue.` : ''), ok: 'Save payment', fields: [{ k: 'a', label: 'Amount received', type: 'number', value: st.due }, [{ k: 'd', label: 'Date', type: 'date', value: today() }, { k: 'm', label: 'Received as', type: 'select', opts: MS.map(k => [k, ML[k]]), value: 'cash' }]], check: v => { const a = num(v.a); return !(a > 0) ? 'Enter the amount.' : a > l.rem + .005 ? `That is more than the ${m(l.rem)} still owed.` : !isYmd(v.d) ? 'Pick a date.' : ''; } });
  if (!v) return; const a = num(v.a);
  add(base('lendpay', { lendId: d.id, borrower: l.who, borrowerId: l.wid, amount: r2(a), date: v.d, method: v.m })); commit(); toast(a >= l.rem - .005 ? 'Loan fully repaid' : m(a) + ' received');
};
A.lwo = async d => {
  const l = C.lends[d.id]; if (!l || l.rem <= 0) return; const loss = r2(l.rem * l.principal / l.owe);
  if (!await ask('Write off ' + l.who + '?', `Forgive the remaining ${m(l.rem)}. The part that was your own money (${m(loss)}) is recorded as a loss. No money moves.`, 'Write off')) return;
  add(base('lendwo', { lendId: d.id, borrower: l.who, borrowerId: l.wid, amount: l.rem, note: 'Written off' })); commit(); toast(m(l.rem) + ' written off');
};
A.lremind = d => {
  const l = C.lends[d.id]; if (!l || l.rem <= 0) return; const st = lendState(l), fn = l.who.split(' ')[0];
  shareText(st.over > 0 ? `Hi ${fn}, a reminder from ${S.cfg.store}: you have ${m(st.over)} overdue on your loan (first due ${st.next.due}). Please pay when you can. Thank you.` : `Hi ${fn}, a reminder from ${S.cfg.store}: your next loan payment of ${m(st.due)} is due on ${st.next.due}. Thank you.`, 'Loan reminder');
};
A.loan = async () => {
  const v = await form({ title: 'Record a loan I took', msg: 'Money you borrowed from a bank, a person or a lender. It is not income. Any interest counts as a cost as you repay it.', ok: 'Save loan', fields: [{ k: 'w', label: 'Who lent it?' }, [{ k: 'a', label: 'Amount you received', type: 'number' }, { k: 'o', label: 'Total to pay back', type: 'number', ph: 'same if no interest' }], [{ k: 'du', label: 'Due date (optional)', type: 'date' }, fromSel('from', 'Received as')], { k: 'n', label: 'Note (optional)' }],
    check: v => { const a = num(v.a), o = v.o.trim() === '' ? a : num(v.o); return !v.w.trim() ? 'Enter who lent it.' : !(a > 0) ? 'Enter the amount you received.' : o === null || o < a ? 'The pay-back total cannot be less than what you received.' : ''; } });
  if (!v) return; const a = num(v.a), o = v.o.trim() === '' ? a : num(v.o), id = uid();
  add(base('loan', { id, loanId: id, lender: v.w.trim().slice(0, 40), amount: r2(a), owe: r2(o), due: isYmd(v.du) ? v.du : '', note: v.n.trim(), method: v.from })); AC.seg = 'loans'; commit(); toast(m(a) + ' loan recorded');
};
A.lpay = async d => {
  const l = C.loans[d.id]; if (!l) return; const b = r2(l.owe - l.paid); if (b <= 0) return;
  const v = await form({ title: 'Repay ' + l.lender, msg: 'Still owing ' + m(b) + '.', ok: 'Save repayment', fields: [{ k: 'a', label: 'Amount you are paying', type: 'number', value: b }, fromSel(), { k: 'n', label: 'Note (optional)' }], check: v => { const a = num(v.a); return !(a > 0) ? 'Enter the amount.' : a > b + .005 ? `That is more than the ${m(b)} still owing.` : ''; } });
  if (!v) return; const a = num(v.a); add(base('loanpay', { loanId: d.id, lender: l.lender, amount: r2(a), note: v.n.trim(), method: v.from })); commit(); toast(m(a) + ' repayment saved');
};
