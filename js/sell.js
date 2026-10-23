/* Sell: item grid, basket, checkout sheet, walk-in and credit-sale rules. */
const CART_KEY = 'sme.tracker.cart';
const SL = { cart: [], q: '', cat: 'all', ck: { recv: '', meth: 'cash', sp: { mob: '', cash: '' }, cust: '' }, last: null, snap: null };
try { const c = JSON.parse(localStorage.getItem(CART_KEY)); if (c && Array.isArray(c.cart)) { SL.cart = c.cart; SL.ck = { ...SL.ck, ...(c.ck || {}) }; } } catch (x) {}
const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify({ cart: SL.cart, ck: SL.ck })); } catch (x) {} };
const cartTot = (c = SL.cart) => r2(c.reduce((s, l) => s + l.qty * l.price, 0));
const cartCount = (c = SL.cart) => c.reduce((s, l) => s + l.qty, 0);
const inCart = id => [...SL.cart, ...held.flatMap(h => h.cart)].filter(l => l.itemId === id).reduce((s, l) => s + l.qty, 0);
const resetCk = () => { SL.ck = { recv: '', meth: 'cash', sp: { mob: '', cash: '' }, cust: '' }; };
const notes = () => (S.cfg.notes || '5,10,20,50,100').split(',').map(x => num(x)).filter(x => x > 0).slice(0, 6);

V.sell = {
  html() {
    return `<div class="sell"><div class="sell-main">${startCard()}
      <div class="sticky-tools">
        <div class="searchbar"><span class="si">${ic('search')}</span><input id="q" type="search" enterkeyhint="search" placeholder="Search or type a price" autocomplete="off" data-in="sq" value="${esc(SL.q)}"><button class="btn" data-a="custom">${ic('plus')}<span>Other</span></button></div>
        <div class="chips" id="cats"></div><div id="heldrow"></div>
      </div>
      <div class="grid" id="grid"></div></div>
      <aside class="basket-pane" id="bp"></aside></div>`;
  },
  after() { drawCats(); drawGrid(); drawBasket(); drawHeld(); }
};

function drawCats() {
  const el = $('cats'); if (!el) return;
  const cs = catList(), fav = S.items.some(i => i.fav);
  if (SL.cat !== 'all' && !(SL.cat === 'fav' ? fav : cs.includes(SL.cat))) SL.cat = 'all';
  const chip = (id, t) => `<button class="chip" data-a="cat" data-id="${esc(id)}" aria-pressed="${SL.cat === id}">${esc(t)}</button>`;
  el.innerHTML = cs.length || fav ? chip('all', 'All') + (fav ? chip('fav', '★ Favourites') : '') + cs.map(c => chip(c, c)).join('') : '';
}
A.cat = d => { SL.cat = d.id; SL.q = ''; if ($('q')) $('q').value = ''; drawCats(); drawGrid(); };
IN.sq = t => { SL.q = t.value; drawGrid(); };

function shown() {
  const k = SL.q.trim();
  return S.items.filter(i => k ? hit(i.name + ' ' + (i.cat || ''), k) : SL.cat === 'fav' ? i.fav : SL.cat === 'all' || i.cat === SL.cat)
    .sort((a, b) => (SL.cat === 'all' && !k ? (b.fav ? 1 : 0) - (a.fav ? 1 : 0) : 0) || (C.sold[b.id] || 0) - (C.sold[a.id] || 0) || a.name.localeCompare(b.name));
}
function drawGrid() {
  const g = $('grid'); if (!g) return;
  const k = SL.q.trim(), L = shown(), qn = /^[\d.,]+$/.test(k) ? num(k) : null;
  if (!S.items.length) { g.className = ''; g.innerHTML = `<div class="empty"><h3>No items yet</h3><p>Add what you sell once, then tap to sell it in a second.</p><button class="btn btn-primary" data-a="newitem">${ic('plus')}Add your first item</button> <button class="btn" data-a="bulk">Add many at once</button></div>`; return; }
  g.className = 'grid';
  const quick = qn > 0 ? `<div class="tile quick"><button class="tile-main" data-a="quick" data-p="${qn}"><span class="t-name">Quick sale</span><span class="t-price">${m(qn)}</span><span class="t-left">item not in stock list</span></button></div>` : '';
  g.innerHTML = quick + L.map(i => {
    const n = qty(i.id), left = n - inCart(i.id), st = stockStatus(i), cn = SL.cart.filter(l => l.itemId === i.id).reduce((s, l) => s + l.qty, 0);
    const ctnBtn = hasCtn(i) ? `<button class="tile-ctn" data-a="addctn" data-id="${i.id}"${left < i.ctn ? ' disabled' : ''}>+ ctn · ${m(ctnSellPrice(i))}</button>` : '';
    return `<div class="tile ${st === 'out' ? 'out' : st === 'low' ? 'low' : ''}"><button class="tile-main" data-a="add" data-id="${i.id}"><span class="t-name">${i.fav ? '★ ' : ''}${esc(i.name)}</span><span class="t-price">${m(i.price)}</span><span class="t-left">${st === 'out' ? 'Out of stock' : stockText(i, n) + ' left'}</span></button>${ctnBtn}${cn ? `<span class="t-badge">${fmtQ(cn)}</span>` : ''}</div>`;
  }).join('') || (quick ? '' : `<div class="empty" style="grid-column:1/-1"><h3>No match</h3><p>Nothing called “${esc(k)}”.</p><button class="btn btn-primary" data-a="newitem">${ic('plus')}Add it as a new item</button></div>`);
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'q') { e.preventDefault(); const k = SL.q.trim(), qn = /^[\d.,]+$/.test(k) ? num(k) : null, L = shown(); if (L.length === 1) A.add({ id: L[0].id }); else if (!L.length && qn > 0) A.quick({ p: qn }); }
});

/* ---- cart ---- */
function pushLine(it, units, price) {
  const l = SL.cart.find(x => x.itemId === it.id && x.price === price);
  l ? l.qty += units : SL.cart.push({ itemId: it.id, name: it.name, qty: units, price, cost: it.cost });
}
function afterCart() { saveCart(); drawGrid(); drawBasket(); drawBar(); ckUpdate(); }
A.add = d => {
  const it = S.items.find(x => x.id === d.id); if (!it) return;
  if (qty(it.id) - inCart(it.id) <= 0) return toast(qty(it.id) <= 0 ? it.name + ' is out of stock' : 'No more ' + it.name + ' left to add');
  pushLine(it, 1, it.price); if (SL.q) { SL.q = ''; $('q').value = ''; } vibe(12); afterCart();
};
A.addctn = d => {
  const it = S.items.find(x => x.id === d.id); if (!it || !hasCtn(it)) return;
  const left = qty(it.id) - inCart(it.id); if (left < it.ctn) return toast(`Only ${left} ${it.name} left, less than a carton`);
  pushLine(it, it.ctn, unitFromCtn(it, ctnSellPrice(it))); vibe(12); afterCart(); toast('Added 1 carton · ' + it.ctn + ' pcs');
};
A.quick = d => { SL.cart.push({ itemId: null, name: 'Quick sale', qty: 1, price: +d.p, cost: 0 }); SL.q = ''; $('q').value = ''; afterCart(); };
A.custom = async () => {
  const v = await form({ title: 'Other item', msg: 'A one-off sale that is not tracked in stock.', ok: 'Add to basket', fields: [{ k: 'n', label: 'What is it?', ph: 'e.g. Phone charging' }, [{ k: 'p', label: 'Price', type: 'number' }, { k: 'c', label: 'Your cost (optional)', type: 'number' }]], check: v => !v.n.trim() ? 'Enter a name.' : (num(v.p) === null || num(v.p) < 0) ? 'Enter the price.' : '' });
  if (!v) return; SL.cart.push({ itemId: null, name: v.n.trim(), qty: 1, price: num(v.p), cost: Math.max(0, num(v.c) || 0) }); afterCart();
};
A.inc = d => { const l = SL.cart[+d.i]; if (!l) return; if (l.itemId && qty(l.itemId) - inCart(l.itemId) <= 0) return toast('No more in stock'); l.qty++; afterCart(); };
A.dec = d => { const l = SL.cart[+d.i]; if (!l) return; if (--l.qty <= 0) SL.cart.splice(+d.i, 1); afterCart(); if (!SL.cart.length) closeCheckout(); };
A.rm = d => { SL.cart.splice(+d.i, 1); afterCart(); if (!SL.cart.length) closeCheckout(); };
A.qty = async d => {
  const l = SL.cart[+d.i]; if (!l) return;
  const v = await form({ title: l.name, ok: 'Set quantity', fields: [{ k: 'q', label: 'Quantity', type: 'int', value: l.qty }], check: v => { const n = int(v.q); if (n === null || n < 0) return 'Enter a whole number.'; const it = l.itemId && S.items.find(i => i.id === l.itemId); if (it && n - l.qty > qty(it.id) - inCart(it.id)) return `Only ${qty(it.id) - inCart(it.id) + l.qty} in stock.`; return ''; } });
  if (!v) return; const n = int(v.q); if (n === 0) SL.cart.splice(+d.i, 1); else l.qty = n; afterCart(); if (!SL.cart.length) closeCheckout();
};
A.pr = async d => {
  const l = SL.cart[+d.i]; if (!l) return;
  const v = await form({ title: 'Price for ' + l.name, msg: 'Changes this sale only.', ok: 'Set price', fields: [{ k: 'p', label: 'Price each', type: 'number', value: l.price }], check: v => num(v.p) === null || num(v.p) < 0 ? 'Enter a price.' : '' });
  if (!v) return; l.list = l.list ?? l.price; l.price = num(v.p); afterCart();
};
A.clear = () => {
  if (!SL.cart.length) return; SL.snap = { cart: SL.cart, ck: SL.ck }; SL.cart = []; resetCk(); afterCart(); closeCheckout();
  toast('Basket cleared', { label: 'Undo', fn: () => { if (SL.snap) { SL.cart = SL.snap.cart; SL.ck = SL.snap.ck; SL.snap = null; afterCart(); } } });
};
A.disc = async () => {
  if (!SL.cart.length) return; const t = cartTot();
  const v = await form({ title: 'Discount', msg: `Total is ${m(t)}. Give a percentage or an amount off the whole sale.`, ok: 'Apply', fields: [[{ k: 'pc', label: 'Percent off', type: 'number', ph: 'e.g. 10' }, { k: 'am', label: 'Or amount off', type: 'number' }]], check: v => { const p = num(v.pc) || 0, a = num(v.am) || 0; return (p > 0 && p <= 100) || (a > 0 && a < t) ? '' : 'Enter a percent from 1 to 100, or an amount smaller than the total.'; } });
  if (!v) return; const p = num(v.pc) || 0, a = num(v.am) || 0, f = p > 0 && p <= 100 ? 1 - p / 100 : (t - a) / t;
  SL.cart.forEach(l => { l.list = l.list ?? l.price; l.price = r4(l.price * f); });
  /* Fix rounding so the total is exact: put any cent difference on the last line. */
  const want = p > 0 ? r2(t * f) : r2(t - a), diff = r2(want - cartTot());
  if (diff && SL.cart.length) { const l = SL.cart[SL.cart.length - 1]; l.price = r4(l.price + diff / l.qty); }
  afterCart(); toast('Discount applied');
};

/* ---- basket display (desktop side panel, mobile docked bar) ---- */
function linesHTML() {
  return SL.cart.map((l, i) => {
    const it = l.itemId && S.items.find(x => x.id === l.itemId), cn = it && hasCtn(it) && l.qty >= it.ctn ? ` · ${stockText(it, l.qty)}` : '';
    return `<div class="line"><button type="button" class="nm" data-a="pr" data-i="${i}">${esc(l.name)}<small>${m(l.price)} each${l.list && l.list > l.price ? ' (was ' + m(l.list) + ')' : ''}${cn}</small></button><div class="step"><button type="button" data-a="dec" data-i="${i}" aria-label="One less">${ic('minus')}</button><button type="button" class="qn" data-a="qty" data-i="${i}" aria-label="Change quantity">${fmtQ(l.qty)}</button><button type="button" data-a="inc" data-i="${i}" aria-label="One more">${ic('plus')}</button></div><span class="amt">${m(l.qty * l.price)}</span></div>`;
  }).join('');
}
function drawBasket() {
  const el = $('bp'); if (!el) return;
  el.innerHTML = SL.cart.length ? `<div class="card-h"><h3>Basket</h3><button class="link" data-a="clear">Clear</button></div>${linesHTML()}<div class="co-total"><span>Total</span><b>${m(cartTot())}</b></div><div class="acts"><button class="btn" data-a="hold">${ic('hold')}Hold</button><button class="btn" data-a="disc">Discount</button><button class="btn btn-cta wide" data-a="checkout">Charge ${m(cartTot())}</button></div>` : `<div class="empty"><h3>Basket is empty</h3><p>Tap an item to add it.</p></div>`;
}
function drawBar() {
  const on = ST.tab === 'sell' && SL.cart.length > 0 && !stack.length;
  document.body.classList.toggle('has-bar', on);
  $('bar').innerHTML = on ? `<button type="button" class="sum" data-a="checkout"><small>${plural(cartCount(), 'item')} · tap to review</small><b>${m(cartTot())}</b></button><button class="btn btn-quiet" data-a="hold" aria-label="Hold this order">${ic('hold')}</button><button class="btn btn-cta" data-a="checkout">Charge</button>` : '';
}
function drawHeld() {
  const el = $('heldrow'); if (!el) return;
  const last = SL.last && S.txns.find(x => x.id === SL.last && Date.now() - x.ts < 18e5);
  el.innerHTML = (held.length ? `<div class="chips">${held.map(h => `<button class="chip" data-a="resume" data-id="${h.id}">${ic('hold')} ${esc(h.label)} · ${m(h.t)}</button>`).join('')}</div>` : '') +
    (last ? `<div class="banner" style="margin-top:6px"><span class="grow">Last sale ${m(last.total)}</span><button class="btn btn-sm" data-a="again">Same again</button><button class="btn btn-sm" data-a="rc" data-id="${last.id}">Receipt</button><button class="btn btn-sm btn-danger" data-a="undo">Undo</button></div>` : '') + todayHTML() + owedHTML();
}
A.hold = () => {
  if (!SL.cart.length) return; const c = SL.ck.cust && cu(SL.ck.cust);
  let n = 1; const used = new Set(held.map(h => h.label)); while (used.has('Order ' + n)) n++;
  held.push({ id: uid(), cart: SL.cart, ck: SL.ck, label: c ? c.name.split(' ')[0] : 'Order ' + n, t: cartTot() });
  SL.cart = []; resetCk(); saveHeld(); closeCheckout(); afterCart(); drawHeld(); toast('Order held. Serve the next customer.');
};
A.resume = d => {
  const h = held.find(x => x.id === d.id); if (!h) return; held = held.filter(x => x !== h);
  if (SL.cart.length) { let n = 1; const used = new Set(held.map(x => x.label)); while (used.has('Order ' + n)) n++; held.push({ id: uid(), cart: SL.cart, ck: SL.ck, label: 'Order ' + n, t: cartTot() }); }
  SL.cart = h.cart; SL.ck = { ...SL.ck, ...h.ck }; if (SL.ck.cust && !cu(SL.ck.cust)) SL.ck.cust = '';
  saveHeld(); afterCart(); drawHeld();
};

/* ---- checkout ---- */
let ckSheet = null;
const closeCheckout = () => { if (ckSheet) ckSheet.close(); };
function ckCalc() {
  const t = cartTot(), k = SL.ck, num0 = s => Math.max(0, num(s) || 0);
  let paid = 0, mob = 0, change = 0, method = 'cash';
  if (k.meth === 'cash') { const g = String(k.recv).trim() === '' ? t : num0(k.recv); paid = Math.min(g, t); change = r2(Math.max(0, g - t)); }
  else if (k.meth === 'mobile') { const g = String(k.recv).trim() === '' ? t : num0(k.recv); paid = Math.min(g, t); mob = paid; method = 'mobile'; }
  else if (k.meth === 'split') { const mi = num0(k.sp.mob), ci = String(k.sp.cash).trim() === '' ? Math.max(0, t - mi) : num0(k.sp.cash); paid = Math.min(mi + ci, t); mob = Math.min(mi, paid); change = r2(Math.max(0, mi + ci - t)); }
  paid = r2(paid); return { t, paid, mob: r2(mob), change, method, unpaid: r2(t - paid) };
}
A.checkout = () => {
  if (!SL.cart.length) return toast('Add something to the basket first');
  if (ckSheet) return;
  ckSheet = openSheet({ title: 'Checkout', body: '<div id="ckb"></div>', foot: `<button type="button" class="btn" data-a="hold">${ic('hold')}Hold</button><button type="button" class="btn btn-cta" id="ck-go" data-a="charge">Charge</button>`, onClose: () => { ckSheet = null; drawBar(); }, mount: h => { ckSheet = h; ckFull(); } });
  drawBar();
};
function ckFull() {
  const b = $('ckb'); if (!b) return;
  b.innerHTML = `<div id="ck-lines"></div>
    <div class="co-total"><span>Total</span><b id="ck-t"></b></div>
    <div class="row" style="justify-content:flex-end"><button class="link" data-a="disc">Discount</button><button class="link" data-a="clear">Clear basket</button></div>
    <h3>Payment</h3>
    <div class="seg" id="ck-meth" role="group" aria-label="How they pay">${[['cash', 'Cash'], ['mobile', 'Mobile'], ['split', 'Split'], ['later', 'Pay later']].map(x => `<button type="button" data-a="meth" data-id="${x[0]}" aria-pressed="${SL.ck.meth === x[0]}">${x[1]}</button>`).join('')}</div>
    <div id="ck-res"></div><div id="ck-pay"></div>
    <h3>Customer</h3><div id="ck-cust"></div>`;
  ckPay(); ckUpdate();
}
function ckPay() {
  const el = $('ck-pay'); if (!el) return; const k = SL.ck, t = cartTot();
  qa('#ck-meth button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === k.meth));
  if (k.meth === 'cash') el.innerHTML = `<label class="f" for="ck-recv">Cash received</label><input id="ck-recv" inputmode="none" autocomplete="off" data-in="recv" placeholder="${fmtN(t)}" value="${esc(k.recv)}"><div class="chips" style="margin-top:8px"><button class="chip" data-a="given" data-v="">Exact</button>${notes().filter(n => n >= t || true).map(n => `<button class="chip" data-a="given" data-v="${n}">${fmtN(n, 0)}</button>`).join('')}</div>${padHTML()}`;
  else if (k.meth === 'mobile') el.innerHTML = `<label class="f" for="ck-recv">Amount paid by mobile</label><input id="ck-recv" inputmode="none" autocomplete="off" data-in="recv" placeholder="${fmtN(t)}" value="${esc(k.recv)}"><div class="hint">Leave empty if they paid all of it.</div>${padHTML()}`;
  else if (k.meth === 'split') el.innerHTML = `<div class="two"><div><label class="f" for="ck-mob">By mobile</label><input id="ck-mob" inputmode="decimal" autocomplete="off" data-in="spm" value="${esc(k.sp.mob)}"></div><div><label class="f" for="ck-cash">In cash</label><input id="ck-cash" inputmode="decimal" autocomplete="off" data-in="spc" placeholder="the rest" value="${esc(k.sp.cash)}"></div></div>`;
  else el.innerHTML = `<p class="hint">Nothing is paid now. The whole ${m(t)} goes on dinau, so pick the customer who owes it.</p>`;
}
A.meth = d => { SL.ck.meth = d.id; saveCart(); ckPay(); ckUpdate(); };
A.given = d => { SL.ck.recv = d.v; const i = $('ck-recv'); if (i) i.value = d.v; saveCart(); ckUpdate(); };
IN.recv = t => { SL.ck.recv = t.value; saveCart(); ckUpdate(); };
IN.spm = t => { SL.ck.sp.mob = t.value; saveCart(); ckUpdate(); };
IN.spc = t => { SL.ck.sp.cash = t.value; saveCart(); ckUpdate(); };

function custRow() {
  const c = SL.ck.cust && cu(SL.ck.cust), u = ckCalc().unpaid;
  if (c) { const b = bal(c.id); return `<div class="custrow"><div class="who"><b>${esc(c.name)}${isQuick(c) ? ' <span class="tag warn">no name yet</span>' : ''}</b><span class="muted small">${b > 0 ? 'Owes ' + m(b) : b < 0 ? 'Has ' + m(-b) + ' credit' : 'Nothing owing'}${c.limit > 0 ? ' · limit ' + m(c.limit) : ''}</span></div><button class="btn btn-sm" data-a="pickc">Change</button><button class="btn btn-sm btn-quiet" data-a="walkin">Walk-in</button></div>`; }
  if (u > 0) return `<div class="custrow" style="border-color:var(--warn);background:var(--warn-soft)"><div class="who"><b class="warn">Who owes ${m(u)}?</b><span class="muted small">Unpaid sales need a customer so the dinau is not lost.</span></div><button class="btn btn-sm btn-primary" data-a="pickc">Choose</button></div>`;
  return `<div class="custrow"><div class="who"><b>Walk-in</b><span class="muted small">No name needed for a paid sale.</span></div><button class="btn btn-sm" data-a="pickc">Add customer</button></div>`;
}
function ckUpdate() {
  if (!ckSheet || !$('ck-lines')) return;
  if (!SL.cart.length) return;
  const c = ckCalc();
  $('ck-lines').innerHTML = linesHTML(); $('ck-t').textContent = m(c.t); $('ck-cust').innerHTML = custRow();
  const r = $('ck-res');
  r.className = 'result' + (c.change > 0 ? ' change' : c.unpaid > 0 ? ' owe' : '');
  r.innerHTML = c.change > 0 ? `Give change<b>${m(c.change)}</b>` : c.unpaid > 0 ? `<b>${m(c.unpaid)}</b> goes on dinau${c.paid > 0 ? ` · ${m(c.paid)} paid now` : ''}` : `Paid in full · ${m(c.paid)}`;
  $('ck-go').textContent = c.unpaid > 0 && !SL.ck.cust ? 'Choose customer' : 'Charge ' + m(c.t);
}
A.walkin = () => { SL.ck.cust = ''; saveCart(); ckUpdate(); };

/* Customer picker. Returns a customer id, or null. */
function pickCustomer({ owe = 0 } = {}) {
  return new Promise(res => {
    let out = null;
    const body = `<input id="pc-q" type="search" placeholder="Search customers" autocomplete="off"><div id="pc-list" style="margin-top:8px"></div>
      <h3>New customer</h3><div class="two"><div><label class="f" for="pc-n">Name</label><input id="pc-n" autocomplete="off" maxlength="40" placeholder="${esc(nextQuickName())}"></div><div><label class="f" for="pc-p">Phone (optional)</label><input id="pc-p" inputmode="tel" autocomplete="off" maxlength="20"></div></div>
      <p class="hint">No name? Leave it empty and it is saved as “${esc(nextQuickName())}”. You can rename them later in Customers.</p>`;
    openSheet({
      title: owe > 0 ? 'Who owes ' + m(owe) + '?' : 'Choose customer', body, onClose: () => res(out),
      foot: `<button type="button" class="btn" data-sx>Cancel</button><button type="button" class="btn btn-primary" id="pc-add">Add and use</button>`,
      mount: h => {
        const list = () => { const k = $('pc-q').value, L = S.customers.filter(c => !k || hit(c.name + ' ' + (c.phone || ''), k)).sort((a, b) => bal(b.id) - bal(a.id) || a.name.localeCompare(b.name)).slice(0, 40);
          $('pc-list').innerHTML = L.length ? L.map(c => `<button type="button" class="custrow" style="width:100%;margin-bottom:6px;background:none;text-align:left;cursor:pointer" data-cid="${c.id}"><div class="who"><b>${esc(c.name)}${isQuick(c) ? ' <span class="tag warn">no name yet</span>' : ''}</b><span class="muted small">${c.phone ? esc(c.phone) + ' · ' : ''}${bal(c.id) > 0 ? 'owes ' + m(bal(c.id)) : 'nothing owing'}</span></div></button>`).join('') : `<p class="muted small">${S.customers.length ? 'No match.' : 'No customers saved yet.'}</p>`; };
        list(); $('pc-q').oninput = list;
        h.el.addEventListener('click', e => { const b = e.target.closest('[data-cid]'); if (b) { out = b.dataset.cid; h.close(); } });
        $('pc-add').onclick = async () => {
          const n = $('pc-n').value.trim();
          if (n && dupName(n) && !await ask('Name already used', `You already have “${n}”. Pick them from the list, or add a second person with the same name?`, 'Add anyway', false)) return;
          out = makeCustomer(n, $('pc-p').value.trim()).id; h.close();
        };
        $('pc-n').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('pc-add').click(); } });
      }
    });
  });
}
A.pickc = async () => { const id = await pickCustomer({ owe: ckCalc().unpaid }); if (id) { SL.ck.cust = id; saveCart(); ckUpdate(); } };

A.charge = async () => {
  if (!SL.cart.length) return toast('Basket is empty');
  const c = ckCalc();
  const need = {}; for (const l of SL.cart) if (l.itemId) need[l.itemId] = (need[l.itemId] || 0) + l.qty;
  for (const id in need) { const it = S.items.find(i => i.id === id); if (!it || need[id] > qty(id)) return toast('Not enough ' + (it ? it.name : 'stock') + ' left');}
  if (c.unpaid > 0 && !SL.ck.cust) { await A.pickc(); if (!SL.ck.cust) return; }
  const cc = SL.ck.cust && cu(SL.ck.cust);
  if (c.unpaid > 0 && cc && cc.limit > 0 && bal(cc.id) + c.unpaid > cc.limit && !await ask('Over credit limit', `${cc.name} would owe ${m(bal(cc.id) + c.unpaid)} (limit ${m(cc.limit)}). Sell on dinau anyway?`, 'Sell anyway', false)) return;
  const lw = SL.cart.filter(l => l.price < l.cost);
  if (lw.length && !await ask('Selling below cost', lw.map(l => l.name).join(', ') + ' is priced below what you paid. Continue?', 'Continue', false)) return;
  const t = add(base('sale', { customerId: SL.ck.cust || null, lines: SL.cart.map(l => ({ itemId: l.itemId, name: l.name, qty: l.qty, price: l.price, cost: l.cost, list: l.list })), total: c.t, paidNow: c.paid, method: c.paid > 0 ? c.method : 'cash', mob: c.mob }));
  SL.last = t.id; SL.cart = []; resetCk(); saveCart(); closeCheckout(); commit();
  c.change > 0 ? pop('Give change', m(c.change), 6000) : pop('Sale done', c.unpaid > 0 ? m(c.unpaid) + ' on dinau' : m(c.paid) + ' in', 1600);
};
A.undo = async () => {
  const id = SL.last; if (!id) return;
  if (await removeTxn(id)) { SL.last = null; commit(); toast('Sale undone'); }
};

/* ---- getting-started checklist: the way in for a shop moving over from paper or an older app ---- */
const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const startSteps = () => { const sk = S.cfg.skip || {}; return [
  { k: 'money', t: 'Enter the money you have now', s: 'Cash in the till and mobile banking', d: S.txns.some(x => x.type === 'cash'), a: 'cash' },
  { k: 'items', t: 'Add your items', s: 'Paste a whole list, or add them one by one', d: S.items.length > 0, a: 'bulk' },
  { k: 'owe', t: 'Add customers who owe you', s: 'Bring over your notebook of dinau', d: S.customers.length > 0 || S.txns.some(x => x.type === 'owed'), a: 'bulkc' },
  { k: 'acct', t: 'Save your account numbers', s: 'Copy them in one tap later', d: (S.cfg.accts || []).length > 0, a: 'goacct' },
  { k: 'bk', t: 'Set up a locked backup', s: 'So a lost phone does not lose the shop', d: !!backupMeta(), a: 'bkset' },
  { k: 'inst', t: 'Install it on your phone', s: 'Opens like an app and works offline', d: isInstalled(), a: 'instalhelp' }
].map(x => ({ ...x, done: x.d || !!sk[x.k], skipped: !x.d && !!sk[x.k] })); };
function startCard() {
  if (S.cfg.hideStart) return '';
  const st = startSteps(), n = st.filter(x => x.done).length; if (n === st.length) return '';
  const open = SL.startOpen ?? n < 3;
  return `<div class="card start"><button class="start-h" data-a="starttog" aria-expanded="${open}"><span class="grow"><b>Getting started</b><span class="muted small" style="display:block">${n} of ${st.length} done${open ? '' : ' · tap to open'}</span></span><span class="start-bar" aria-hidden="true"><i style="width:${Math.round(n / st.length * 100)}%"></i></span></button>
    ${open ? st.map(x => `<div class="start-row${x.done ? ' done' : ''}"><span class="tick" aria-hidden="true">${x.done ? ic('check') : ''}</span><span class="grow"><b>${esc(x.t)}</b><span class="muted small" style="display:block">${x.skipped ? 'Skipped' : esc(x.s)}</span></span>${x.done ? '' : `<button class="btn btn-sm btn-primary" data-a="${x.a}">Do it</button><button class="link" data-a="startskip" data-k="${x.k}">Skip</button>`}</div>`).join('') + `<div class="row" style="margin-top:8px"><button class="link" data-a="starthide">Hide this list</button></div>` : ''}</div>`;
}
A.starttog = () => { SL.startOpen = !(SL.startOpen ?? startSteps().filter(x => x.done).length < 3); render(); };
A.startskip = d => { (S.cfg.skip = S.cfg.skip || {})[d.k] = true; save(); render(); };
A.starthide = () => { S.cfg.hideStart = true; save(); render(); toast('Hidden. You can bring it back in Settings.'); };
A.showstart = () => { S.cfg.hideStart = false; S.cfg.skip = {}; SL.startOpen = true; save(); go('sell'); };
A.goacct = () => { AC.seg = 'numbers'; go('accounts'); A.aadd(); };
A.instalhelp = () => {
  if (typeof deferred !== 'undefined' && deferred) return A.install();
  openSheet({ title: 'Install on your phone', body: `<p class="muted">Installing puts SME Tracker on your home screen. It opens full screen and works with no internet.</p>
    <div class="card"><b>Android (Chrome)</b><p class="muted small">Tap the ⋮ menu at the top right, then <b>Install app</b> or <b>Add to Home screen</b>.</p></div>
    <div class="card"><b>iPhone (Safari)</b><p class="muted small">Tap the Share button, then <b>Add to Home Screen</b>.</p></div>
    <div class="card"><b>Computer (Chrome or Edge)</b><p class="muted small">Click the install icon at the right end of the address bar.</p></div>
    <p class="hint">Open the app once while you have internet, so it can save itself for offline use.</p>`, foot: '<button class="btn" data-sx>Close</button>' });
};
