/* Stock: items, cartons, restock, count, bulk add, order list. Stock is always counted in single units. */
const SK = { q: '', f: 'all', open: null };
const margin = i => i.price ? Math.round((i.price - i.cost) / i.price * 100) : 0;

V.stock = {
  html() {
    const sv = stockValue();
    const low = S.items.filter(i => stockStatus(i) === 'low').length, out = S.items.filter(i => stockStatus(i) === 'out').length;
    return `<div class="page-h"><h2>Stock</h2><div class="row" style="gap:8px"><button class="btn" data-a="tools">Tools</button><button class="btn btn-primary" data-a="newitem">${ic('plus')}Add item</button></div></div>
      ${S.items.length ? `<div class="tools"><button class="btn btn-sm" data-a="bulk">Add many</button><button class="btn btn-sm" data-a="count">Count stock</button><button class="btn btn-sm" data-a="shop">Order list${low + out ? ` <span class="tag warn">${low + out}</span>` : ''}</button></div>
      <div class="stats s3 compact"><div class="stat"><small>At cost</small><b>${m(sv.cost)}</b></div><div class="stat"><small>Worth if sold</small><b>${m(sv.retail)}</b></div><div class="stat"><small>Profit waiting</small><b class="${sv.profit < 0 ? 'neg' : 'pos'}">${m(sv.profit)}</b><small>${sv.margin}% margin</small></div></div>
      <div class="searchbar"><span class="si">${ic('search')}</span><input id="sq" type="search" placeholder="Search stock" autocomplete="off" data-in="stq" value="${esc(SK.q)}"></div>
      <div class="chips" style="margin-bottom:8px">${[['all', 'All ' + S.items.length], ['low', 'Running low ' + low], ['out', 'Out ' + out]].map(x => `<button class="chip" data-a="skf" data-id="${x[0]}" aria-pressed="${SK.f === x[0]}">${x[1]}</button>`).join('')}</div>
      <div id="sk-list"></div>` : `<div class="empty"><h3>Nothing in stock yet</h3><p>Add items one by one, or paste a whole list at once.</p><button class="btn btn-primary" data-a="newitem">${ic('plus')}Add your first item</button> <button class="btn" data-a="bulk">Add many at once</button></div>`}`;
  },
  after() { drawStock(); }
};
IN.stq = t => { SK.q = t.value; drawStock(); };
A.skf = d => { SK.f = d.id; render(); };
function drawStock() {
  const el = $('sk-list'); if (!el) return; const k = SK.q.trim();
  const L = S.items.filter(i => (!k || hit(i.name + ' ' + (i.cat || ''), k)) && (SK.f === 'all' || stockStatus(i) === SK.f || (SK.f === 'low' && stockStatus(i) === 'low')))
    .sort((a, b) => ({ out: 0, low: 1, ok: 2 }[stockStatus(a)] - { out: 0, low: 1, ok: 2 }[stockStatus(b)]) || a.name.localeCompare(b.name));
  el.innerHTML = L.map(stockRow).join('') || '<div class="empty"><p>No items match.</p></div>';
}
function stockRow(i) {
  const n = qty(i.id), st = stockStatus(i), open = SK.open === i.id, mg = r2(i.price - i.cost);
  let d = '';
  if (open) {
    const worth = r2(Math.max(0, n) * i.cost), pot = r2(Math.max(0, n) * mg);
    const hist = S.txns.filter(t => (t.type === 'restock' || t.type === 'adjust') && t.lines.some(l => l.itemId === i.id)).slice(-8).reverse();
    d = `<div class="detail">
      <div class="kv"><span>Cost per unit</span><b>${m(i.cost)}</b></div>
      <div class="kv"><span>Sells for</span><b>${m(i.price)}</b></div>
      <div class="kv"><span>Profit each</span><b class="${mg < 0 ? 'neg' : 'pos'}">${m(mg)} · ${margin(i)}%</b></div>
      ${hasCtn(i) ? `<div class="kv"><span>Carton of ${i.ctn}</span><b>${m(r2(i.cost * i.ctn))} cost · ${m(ctnSellPrice(i))} sells</b></div>` : ''}
      <div class="kv"><span>On shelf</span><b>${fmtQ(Math.max(0, n))} units${hasCtn(i) ? ' · ' + stockText(i, n) : ''}</b></div>
      <div class="kv"><span>Worth at cost</span><b>${m(worth)}</b></div>
      <div class="kv"><span>Potential profit</span><b class="${pot < 0 ? 'neg' : 'pos'}">${m(pot)}</b></div>
      <div class="acts"><button class="btn btn-primary" data-a="rs" data-id="${i.id}">${ic('plus')}Restock</button><button class="btn" data-a="adjq" data-id="${i.id}">Fix count</button><button class="btn" data-a="edititem" data-id="${i.id}">${ic('edit')}Edit</button><button class="btn" data-a="fav" data-id="${i.id}">${i.fav ? 'Unpin' : '★ Pin to top'}</button><button class="btn btn-danger wide" data-a="delitem" data-id="${i.id}">${ic('trash')}Delete item</button></div>
      ${hist.length ? `<div class="hist">${hist.map(t => { const l = t.lines.find(x => x.itemId === i.id); return `<div><span>${esc(t.date)} · ${t.type === 'restock' ? (t.note === 'Opening stock' ? 'Opening stock' : 'Restocked') : 'Count fixed'}</span><b>${l.qty > 0 ? '+' : ''}${fmtQ(l.qty)}</b></div>`; }).join('')}</div>` : ''}</div>`;
  }
  return `<div class="item-row${open ? ' open' : ''}"><button class="row-main" data-a="stog" data-id="${i.id}" aria-expanded="${open}"><span class="grow"><b>${i.fav ? '★ ' : ''}${esc(i.name)}</b><span class="meta" style="display:block">${m(i.price)} each${i.cat ? ' · ' + esc(i.cat) : ''}${hasCtn(i) ? ' · ' + i.ctn + '/ctn' : ''}</span></span><span class="pill ${st}">${stockText(i, n)}</span></button>${d}</div>`;
}
A.stog = d => { SK.open = SK.open === d.id ? null : d.id; drawStock(); };
A.fav = d => { const it = S.items.find(x => x.id === d.id); if (!it) return; it.fav = !it.fav; save(); drawStock(); toast(it.fav ? it.name + ' pinned to the top of Sell' : 'Unpinned'); };

/* ---- add / edit item ---- */
function itemFields(it) {
  const c = it || {};
  const f = [
    { k: 'n', label: 'Item name', value: c.name || '', max: 60, ph: 'e.g. Rice 1kg' },
    { k: 'k', label: 'Category (optional)', value: c.cat || '', list: catList(), max: 30, ph: 'e.g. Groceries' },
    { k: 'ctn', label: 'Pieces in one carton (optional)', type: 'int', value: c.ctn > 1 ? c.ctn : '', ph: 'e.g. 24', hint: 'Fill this in if you buy or sell this item by the carton.' },
    [{ k: 'cu', label: 'Cost per piece', type: 'number', value: c.cost ?? '' }, { k: 'p', label: 'Sell price per piece', type: 'number', value: c.price ?? '' }],
    [{ k: 'cc', label: 'Cost per carton', type: 'number', value: c.ctn > 1 ? r2(c.cost * c.ctn) : '' }, { k: 'cp', label: 'Carton sell price', type: 'number', value: c.ctnPrice || '', ph: 'optional' }],
    { k: 'low', label: 'Warn me when this many pieces are left', type: 'int', value: c.low ?? 3 }
  ];
  if (!it) f.push([{ k: 'os', label: 'Stock you have now', type: 'number', ph: '0' }, { k: 'osu', label: 'Counted in', type: 'select', opts: [['u', 'Pieces'], ['c', 'Cartons']], value: 'u' }]);
  return f;
}
function itemMount(h, f) {
  const el = k => f.elements[k], ctn = () => Math.max(0, int(el('ctn').value) || 0), v = k => num(el(k).value);
  const row = f.elements.cc.closest('.two'), osu = f.elements.osu;
  const sync = src => {
    const n = ctn(), on = n > 1; row.hidden = !on; if (osu) osu.querySelector('[value=c]').hidden = !on;
    if (!on) { if (osu && osu.value === 'c') osu.value = 'u'; }
    else if (src === 'cu' && v('cu') !== null) el('cc').value = r2(v('cu') * n);
    else if (src === 'cc' && v('cc') !== null) el('cu').value = r4(v('cc') / n);
    else if (src === 'ctn' && v('cu') !== null) el('cc').value = r2(v('cu') * n);
    if (on && src === 'ctn' && v('p') !== null && !v('cp')) el('cp').placeholder = fmtN(v('p') * n) + ' (pieces × price)';
    const c = v('cu'), p = v('p'), r = $('im');
    r.innerHTML = c !== null && p !== null ? (p < c ? `<span class="warn">Selling below cost: you lose ${m(c - p)} on each piece.</span>` : `Profit ${m(p - c)} each · ${p ? Math.round((p - c) / p * 100) : 0}% margin`) : '';
  };
  ['ctn', 'cu', 'cc', 'p'].forEach(k => el(k).addEventListener('input', () => sync(k)));
  sync();
}
function itemCheck(v) {
  const c = num(v.cu), p = num(v.p), n = int(v.ctn);
  if (!v.n.trim()) return 'Enter the item name.';
  if (v.ctn.trim() && (n === null || n === 1 || n < 0)) return 'Pieces per carton should be 2 or more, or leave it empty.';
  if (c === null || c < 0) return 'Enter what one piece costs you.';
  if (p === null || p < 0) return 'Enter the price you sell one piece for.';
  if (v.os && v.os.trim() && (num(v.os) === null || num(v.os) < 0)) return 'Stock you have now should be a number.';
  return '';
}
A.newitem = async () => {
  const v = await form({ title: 'Add item', ok: 'Save item', fields: itemFields(), extra: '<div id="im" class="hint"></div>', check: itemCheck, mount: itemMount }); if (!v) return;
  const ctn = Math.max(0, int(v.ctn) || 0), it = { id: uid(), name: v.n.trim(), cat: v.k.trim(), cost: r4(num(v.cu)), price: r2(num(v.p)), low: Math.max(0, int(v.low) || 0), ctn: ctn > 1 ? ctn : 0, ctnPrice: ctn > 1 && num(v.cp) > 0 ? r2(num(v.cp)) : 0, created: today() };
  if (S.items.some(x => x.name.trim().toLowerCase() === it.name.toLowerCase()) && !await ask('Item already exists', `You already have “${it.name}”. Add another one with the same name?`, 'Add anyway', false)) return;
  S.items.push(it); L('ITEM ADDED', it.name + ' cost ' + it.cost + ', price ' + it.price);
  const k = Math.floor((num(v.os) || 0) * (v.osu === 'c' && it.ctn ? it.ctn : 1));
  if (k > 0) add(base('restock', { lines: [{ itemId: it.id, name: it.name, qty: k, cost: it.cost }], total: r2(k * it.cost), note: 'Opening stock' }));
  SK.open = it.id; commit(); toast(it.price < it.cost ? 'Saved. Careful: sell price is below cost.' : 'Item saved');
};
A.edititem = async d => {
  const it = S.items.find(x => x.id === d.id); if (!it) return;
  const v = await form({ title: 'Edit ' + it.name, ok: 'Save changes', fields: itemFields(it), extra: '<div id="im" class="hint"></div>', check: itemCheck, mount: itemMount }); if (!v) return;
  const ctn = Math.max(0, int(v.ctn) || 0), n = { name: v.n.trim(), cat: v.k.trim(), cost: r4(num(v.cu)), price: r2(num(v.p)), low: Math.max(0, int(v.low) || 0), ctn: ctn > 1 ? ctn : 0, ctnPrice: ctn > 1 && num(v.cp) > 0 ? r2(num(v.cp)) : 0 };
  const ch = ['name', 'cost', 'price', 'low', 'ctn', 'ctnPrice'].filter(k => it[k] !== n[k]).map(k => `${k} ${it[k]}→${n[k]}`);
  if (ch.length) L('ITEM EDITED', it.name + ': ' + ch.join(', '));
  Object.assign(it, n); SL.cart.forEach(l => { if (l.itemId === it.id) l.name = it.name; }); commit(); toast('Item updated');
};
A.delitem = async d => {
  const it = S.items.find(x => x.id === d.id); if (!it) return;
  if (!await ask('Delete ' + it.name + '?', 'Past sales stay in your history. The item disappears from Sell and Stock.', 'Delete')) return;
  L('ITEM DELETED', it.name + ' (cost ' + it.cost + ', price ' + it.price + ', ' + qty(it.id) + ' in stock)');
  S.items = S.items.filter(x => x.id !== it.id); SL.cart = SL.cart.filter(l => l.itemId !== it.id); saveCart(); SK.open = null; commit();
};

/* ---- restock ---- */
A.rs = async d => {
  const it = S.items.find(x => x.id === d.id); if (!it) return; const ct = hasCtn(it);
  const f = [[{ k: 'q', label: 'How many did you buy?', type: 'int' }, ...(ct ? [{ k: 'qu', label: 'Counted in', type: 'select', opts: [['c', 'Cartons of ' + it.ctn], ['u', 'Pieces']], value: 'c' }] : [])],
    [{ k: 'cu', label: 'Cost per piece', type: 'number', value: it.cost }, ...(ct ? [{ k: 'cc', label: 'Cost per carton', type: 'number', value: r2(it.cost * it.ctn) }] : [])],
    { k: 'from', label: 'Paid from', type: 'select', opts: MS.map(k => [k, ML[k]]), value: 'cash' }];
  const units = f1 => (int(f1.q) || 0) * (ct && f1.qu === 'c' ? it.ctn : 1);
  const v = await form({
    title: 'Restock ' + it.name, ok: 'Save restock', fields: f, extra: '<div id="rt" class="result"></div>',
    check: v => !(int(v.q) > 0) ? 'Enter how many you bought.' : (num(v.cu) === null || num(v.cu) < 0) ? 'Enter the cost.' : '',
    mount: (h, fm) => {
      const g = k => fm.elements[k] && fm.elements[k].value;
      const upd = src => {
        if (ct) { if (src === 'cu' && num(g('cu')) !== null) fm.elements.cc.value = r2(num(g('cu')) * it.ctn); if (src === 'cc' && num(g('cc')) !== null) fm.elements.cu.value = r4(num(g('cc')) / it.ctn); }
        const k = units({ q: g('q'), qu: g('qu') }), c = num(g('cu')), n0 = Math.max(0, qty(it.id)), r = $('rt');
        r.innerHTML = k > 0 && c !== null ? `${fmtQ(k)} pieces${ct ? ' (' + stockText(it, k) + ')' : ''} · total <b>${m(k * c)}</b><br><span class="muted small">Average cost becomes ${m(n0 > 0 ? (n0 * it.cost + k * c) / (n0 + k) : c)} per piece</span>` : '<span class="muted small">Enter how many you bought.</span>';
      };
      ['q', 'qu', 'cu', 'cc'].forEach(k => fm.elements[k] && fm.elements[k].addEventListener('input', () => upd(k))); upd();
    }
  });
  if (!v) return; const k = units(v), c = r4(num(v.cu)), n0 = Math.max(0, qty(it.id));
  it.cost = n0 > 0 ? r4((n0 * it.cost + k * c) / (n0 + k)) : c;
  add(base('restock', { lines: [{ itemId: it.id, name: it.name, qty: k, cost: c }], total: r2(k * c), method: v.from, note: 'Restock' }));
  commit(); toast(`+${fmtQ(k)} ${it.name}`);
};

/* ---- counting ---- */
function countCells(i, val) {
  return hasCtn(i) ? `<input class="cn" data-id="${i.id}" data-p="c" inputmode="numeric" placeholder="ctn" aria-label="${esc(i.name)} cartons" style="width:70px"><input class="cn" data-id="${i.id}" data-p="u" inputmode="numeric" placeholder="pcs" aria-label="${esc(i.name)} pieces" style="width:70px">` : `<input class="cn" data-id="${i.id}" data-p="u" inputmode="numeric" placeholder="pcs" aria-label="${esc(i.name)} count" style="width:90px">`;
}
function readCounts(root) {
  const ln = [];
  for (const i of S.items) {
    const ins = qa(`.cn[data-id="${i.id}"]`, root); if (!ins.length || ins.every(x => x.value.trim() === '')) continue;
    let tot = 0; for (const x of ins) { const n = int(x.value) || 0; tot += x.dataset.p === 'c' ? n * i.ctn : n; }
    const dlt = tot - qty(i.id); if (dlt) ln.push({ itemId: i.id, name: i.name, qty: dlt, cost: i.cost });
  }
  return ln;
}
A.count = () => {
  const Ls = [...S.items].sort((a, b) => a.name.localeCompare(b.name));
  openSheet({
    title: 'Count stock', wide: true, body: `<p class="muted">Count the shelf and type the real number. Leave blank anything you did not count.</p><input id="ck" type="search" placeholder="Search items" autocomplete="off"><div style="margin-top:6px">${Ls.map(i => `<div class="line" data-k="${esc((i.name + ' ' + (i.cat || '')).toLowerCase())}"><div class="nm">${esc(i.name)}<small>app says ${stockText(i)}${hasCtn(i) ? ' (' + fmtQ(Math.max(0, qty(i.id))) + ' pcs)' : ''}</small></div>${countCells(i)}</div>`).join('') || '<p class="muted">No items yet.</p>'}</div>`,
    foot: `<button class="btn" data-sx>Cancel</button><button class="btn btn-primary" id="cn-save">Save count</button>`,
    mount: h => {
      $('ck').oninput = ev => { const w = ev.target.value.toLowerCase().split(/\s+/).filter(Boolean); qa('[data-k]', h.el).forEach(r => { r.hidden = !w.every(x => r.dataset.k.includes(x)); }); };
      $('cn-save').onclick = () => {
        const ln = readCounts(h.el); if (!ln.length) { h.close(); return toast('Count matches. Nothing to fix.'); }
        add(base('adjust', { lines: ln, note: 'Stock count' })); h.close(); commit(); toast(plural(ln.length, 'item') + ' corrected');
      };
    }
  });
};
A.adjq = d => {
  const it = S.items.find(x => x.id === d.id); if (!it) return;
  openSheet({
    title: 'Fix count: ' + it.name, body: `<p class="muted">App says ${stockText(it)}${hasCtn(it) ? ' (' + fmtQ(Math.max(0, qty(it.id))) + ' pcs)' : ''}. Type what is really on the shelf (damaged, lost, miscounted).</p><div class="row">${countCells(it)}</div>`,
    foot: `<button class="btn" data-sx>Cancel</button><button class="btn btn-primary" id="cn-save">Update</button>`,
    mount: h => { $('cn-save').onclick = () => { const ln = readCounts(h.el); if (!ln.length) { h.close(); return toast('Nothing changed'); } add(base('adjust', { lines: ln, note: 'Stock count' })); h.close(); commit(); toast(it.name + ': ' + stockText(it) + ' in stock'); }; }
  });
};

/* ---- bulk add ---- */
function parseBulk(text) {
  const seen = new Set(S.items.map(i => i.name.trim().toLowerCase())), ok = [], bad = [], dup = [];
  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = raw.trim(); if (!line) return;
    const p = (line.includes('\t') ? line.split('\t') : line.split(',')).map(x => x.trim());
    if (idx === 0 && /^(item|name)/i.test(p[0]) && num(p[1]) === null) return;
    const ctn = int(p[5]) || 0, cm = /^([\d.,]+)\s*\/\s*ctn$/i.exec(p[1] || ''), sm = /^([\d.,]+)\s*ctn$/i.exec(p[3] || '');
    let cost = cm ? num(cm[1]) : num(p[1]), price = num(p[2]), stock = sm ? num(sm[1]) : (p[3] ? num(p[3]) : 0);
    if (!p[0] || cost === null || price === null || cost < 0 || price < 0 || stock === null || (cm || sm) && ctn < 2 || (p[5] && ctn < 2)) return bad.push(idx + 1);
    if (cm) cost = r4(cost / ctn); if (sm) stock = stock * ctn;
    const key = p[0].toLowerCase(); if (seen.has(key)) return dup.push(p[0]); seen.add(key);
    ok.push({ n: p[0].slice(0, 60), c: r4(cost), p: r2(price), k: Math.floor(stock), g: (p[4] || '').slice(0, 30), ctn: ctn > 1 ? ctn : 0, cp: ctn > 1 && num(p[6]) > 0 ? r2(num(p[6])) : 0 });
  });
  return { ok, bad, dup };
}
A.bulk = () => {
  openSheet({
    title: 'Add many items', wide: true,
    body: `<p class="muted">One item per line: <b>name, cost, price, stock, category</b>. You can paste straight from Excel.</p>
      <p class="hint">Selling by the carton? Add two more columns: <b>pieces per carton</b> and <b>carton price</b>. Then write a cost as <b>48/ctn</b> and stock as <b>5ctn</b>.</p>
      <textarea id="bt" placeholder="Rice 1kg, 4.50, 6, 20, Groceries&#10;Cola 1.5L, 48/ctn, 7.50, 5ctn, Drinks, 12, 85"></textarea><label class="btn btn-sm" style="margin-top:8px">Or choose a spreadsheet file (.csv)<input type="file" id="bf" accept=".csv,.txt,text/csv,text/plain" hidden></label><div id="bp2" class="hint" style="margin-top:8px"></div>`,
    foot: `<button class="btn" data-sx>Cancel</button><button class="btn btn-primary" id="bok" disabled>Add items</button>`,
    mount: h => {
      $('bt').oninput = () => { const P = parseBulk($('bt').value); $('bok').disabled = !P.ok.length; $('bok').textContent = P.ok.length ? 'Add ' + plural(P.ok.length, 'item') : 'Add items';
        $('bp2').innerHTML = (P.ok.length ? `<b class="pos">${P.ok.length} ready</b>` : '') + (P.dup.length ? ` · <span class="warn">${P.dup.length} already exist (skipped)</span>` : '') + (P.bad.length ? ` · <span class="neg">line ${P.bad.slice(0, 6).join(', ')} need a name, cost and price${P.bad.length > 6 ? '…' : ''}</span>` : '') +
          (P.ok.length ? `<div class="hist" style="max-height:160px">${P.ok.slice(0, 12).map(x => `<div><span>${esc(x.n)}${x.ctn ? ' · ' + x.ctn + '/ctn' : ''}</span><span>${m(x.c)} → ${m(x.p)} · ${fmtQ(x.k)} pcs</span></div>`).join('')}</div>` : ''); };
      $('bf').onchange = async e => { const f = e.target.files[0]; if (f) { $('bt').value = (await f.text()).replace(/^\ufeff/, ''); $('bt').oninput(); } };
      $('bok').onclick = () => {
        const P = parseBulk($('bt').value); if (!P.ok.length) return; const lines = [];
        for (const x of P.ok) { const id = uid(); S.items.push({ id, name: x.n, cost: x.c, price: x.p, low: 3, cat: x.g, ctn: x.ctn, ctnPrice: x.cp, created: today() }); if (x.k > 0) lines.push({ itemId: id, name: x.n, qty: x.k, cost: x.c }); }
        L('ITEMS ADDED', P.ok.length + ' items (bulk)');
        if (lines.length) add(base('restock', { lines, total: r2(lines.reduce((a, l) => a + l.qty * l.cost, 0)), note: 'Opening stock' }));
        h.close(); commit(); toast(plural(P.ok.length, 'item') + ' added');
      };
      setTimeout(() => $('bt').focus(), 60);
    }
  });
};

/* ---- order list ---- */
A.shop = () => {
  const Ls = S.items.filter(i => qty(i.id) <= i.low).map(i => {
    const n = Math.max(qty(i.id), 0), want = Math.max(i.low * 3, 5), k = want - n, ct = hasCtn(i) ? Math.ceil(k / i.ctn) : 0, units = ct ? ct * i.ctn : k;
    return { i, n, ct, units, c: units * i.cost };
  }), tot = r2(Ls.reduce((a, x) => a + x.c, 0));
  const lbl = x => x.ct ? `${x.ct} ctn (${x.units} pcs)` : fmtQ(x.units);
  const txt = S.cfg.store + ' order list ' + today() + '\n' + Ls.map(x => x.i.name + ' x ' + (x.ct ? x.ct + ' ctn' : x.units)).join('\n');
  openSheet({
    title: 'Order list',
    body: Ls.length ? `<p class="muted">Items at or below their warning level. Each is topped up to 3× its warning level (at least 5). Estimated cost ${m(tot)}.</p>${Ls.map(x => `<div class="line"><div class="nm">${esc(x.i.name)}<small>have ${stockText(x.i, x.n)}</small></div><b>buy ${lbl(x)}</b></div>`).join('')}` : '<div class="empty"><h3>Nothing is running low</h3></div>',
    foot: `<button class="btn" data-sx>Close</button>${Ls.length ? `<button class="btn btn-primary" id="shc">${ic('share')}Share list</button>` : ''}`,
    mount: () => { if ($('shc')) $('shc').onclick = () => shareText(txt, 'Order list'); }
  });
};
