/* Tools: price & margin calculator, till cash count, restock list. Opens from Stock (Tools) or Accounts (Count till). */
const KDEN = [[100, 'K100'], [50, 'K50'], [20, 'K20'], [10, 'K10'], [5, 'K5'], [2, 'K2'], [1, 'K1'], [.5, '50t'], [.2, '20t'], [.1, '10t'], [.05, '5t']];
const tlField = (id, label, ph, v = '') => `<label class="tl-f"><span>${label}</span><input id="${id}" inputmode="decimal" autocomplete="off" placeholder="${ph}" value="${v}"></label>`;
const TL = {
  price: () => `<div class="tl-2">${tlField('tp-ct', 'Carton price', 'optional')}${tlField('tp-un', 'Items in carton', 'optional')}</div>
    ${tlField('tp-c', 'I pay for one item', 'e.g. 3.50')}
    <div class="chips" style="margin:0 0 10px">${[20, 30, 40, 50].map(p => `<button type="button" class="chip" data-mk="${p}">+${p}%</button>`).join('')}</div>
    <div class="tl-2">${tlField('tp-mk', 'Markup %', '30', '30')}${tlField('tp-p', 'I sell for', 'price')}</div>
    <button type="button" class="btn btn-sm" id="tp-round">Round up to K0.50</button><div class="tl-res" id="tp-r"></div>`,
  cash: () => `<p class="muted small" style="margin:0 0 10px">Type how many of each note or coin are in the till.</p><div class="tl-3">${KDEN.map(d => `<label class="tl-f"><span>${d[1]}</span><input inputmode="numeric" data-d="${d[0]}" placeholder="0"></label>`).join('')}</div><div class="tl-res" id="tc-r"></div>`,
  restock: () => { const L = restockItems(); return L.length ? `<div class="card" style="padding:4px 14px">${L.map(i => `<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line)"><b class="grow">${esc(i.name)}</b><span class="${qty(i.id) <= 0 ? 'neg' : 'muted'}">${qty(i.id) <= 0 ? 'Out' : fmtQ(qty(i.id)) + ' left'}</span></div>`).join('')}</div>
    <div class="row" style="gap:8px;margin-top:12px"><button type="button" class="btn btn-primary grow" id="tr-copy">Copy list</button>${navigator.share ? '<button type="button" class="btn grow" id="tr-share">Share</button>' : ''}</div>` : '<div class="tl-res"><div class="muted">Nothing is running low. Good stock.</div></div>'; }
};
const restockItems = () => S.items.filter(i => qty(i.id) <= (i.low ?? 3)).sort((a, b) => qty(a.id) - qty(b.id));
const restockText = () => `Restock list · ${S.cfg.store}\n` + restockItems().map(i => `• ${i.name} (${qty(i.id) <= 0 ? 'out' : fmtQ(qty(i.id)) + ' left'})`).join('\n');
A.tools = d => openSheet({ title: 'Tools', body: `<div class="seg" id="tl-seg">${[['price', 'Price'], ['cash', 'Count till'], ['restock', 'Restock']].map(t => `<button type="button" data-tt="${t[0]}">${t[1]}</button>`).join('')}</div><div id="tl-b" style="margin-top:14px"></div>`,
  mount: h => {
    const P = h.panel, g = id => P.querySelector('#' + id), val = id => +g(id).value || 0, box = g('tl-b');
    const priceUpd = src => {
      if ((src === 'ct' || src === 'un') && val('tp-ct') > 0 && val('tp-un') > 0) g('tp-c').value = r2(val('tp-ct') / val('tp-un'));
      const c = val('tp-c');
      if (src === 'p') { if (c > 0) g('tp-mk').value = r2((val('tp-p') - c) / c * 100); } else g('tp-p').value = c > 0 ? r2(c * (1 + val('tp-mk') / 100)) : '';
      const p = val('tp-p'), pr = p - c, sg = x => (x < 0 ? '-' : '') + fmtN(x, 1) + '%';
      g('tp-r').innerHTML = c > 0 && p > 0 ? `<div><small>Profit each</small><b class="${pr < 0 ? 'neg' : 'pos'}">${m(pr)}</b></div><div><small>Margin</small><b>${sg(pr / p * 100)}</b></div><div><small>Markup</small><b>${sg(pr / c * 100)}</b></div>` : '<div class="muted">Enter what you pay to see your price.</div>';
    };
    const cashUpd = () => {
      let t = 0; P.querySelectorAll('[data-d]').forEach(i => { t += (+i.dataset.d) * (parseInt(i.value) || 0); }); t = r2(t); const diff = r2(t - C.cash);
      g('tc-r').innerHTML = `<div><small>Counted</small><b>${m(t)}</b></div><div><small>Till should have</small><b>${m(C.cash)}</b></div><div class="${diff === 0 ? 'pos' : 'neg'}" style="grid-column:1/-1"><small>${t === 0 ? 'Count to compare' : diff === 0 ? 'Matches exactly' : diff > 0 ? 'Over by' : 'Short by'}</small><b>${t === 0 ? '' : diff === 0 ? 'All good' : m(Math.abs(diff))}</b></div>`;
    };
    const show = t => {
      P.querySelectorAll('[data-tt]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tt === t)); box.innerHTML = TL[t]();
      if (t === 'price') { ['ct', 'un', 'c', 'mk', 'p'].forEach(k => g('tp-' + k).addEventListener('input', () => priceUpd(k))); box.querySelectorAll('[data-mk]').forEach(b => b.onclick = () => { g('tp-mk').value = b.dataset.mk; priceUpd('mk'); vibe(6); }); g('tp-round').onclick = () => { if (val('tp-p') > 0) { g('tp-p').value = Math.ceil(val('tp-p') * 2) / 2; priceUpd('p'); } }; priceUpd('c'); }
      if (t === 'cash') { box.querySelectorAll('[data-d]').forEach(i => i.addEventListener('input', cashUpd)); cashUpd(); }
      if (t === 'restock') { const c = g('tr-copy'), s = g('tr-share'); if (c) c.onclick = async () => { try { await navigator.clipboard.writeText(restockText()); toast('List copied'); } catch (x) { toast('Could not copy'); } }; if (s) s.onclick = () => navigator.share({ text: restockText() }).catch(() => {}); }
    };
    P.querySelector('#tl-seg').addEventListener('click', e => { const b = e.target.closest('[data-tt]'); if (b) show(b.dataset.tt); });
    show((d && d.tab) || 'price');
  } });

/* Today strip on the Sell screen: sales, count and profit so far */
const todayHTML = () => {
  const t = S.txns.filter(x => x.type === 'sale' && x.date === today()); if (!t.length) return '';
  const tot = t.reduce((a, x) => a + x.total, 0), pr = t.reduce((a, x) => a + x.lines.reduce((b, l) => b + (l.price - l.cost) * l.qty, 0), 0);
  return `<div class="banner today"><span class="grow"><b>${m(tot)}</b> today · ${t.length} sale${t.length > 1 ? 's' : ''} · profit ${m(pr)}</span></div>`;
};
