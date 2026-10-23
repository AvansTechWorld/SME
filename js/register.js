/* Register feel: number keypad for cash/mobile entry, and a quick settle when switching tabs. */
const PAD = ['1','2','3','4','5','6','7','8','9','.','0','b'];
const padHTML = () => `<div class="pad" role="group" aria-label="Number pad">${PAD.map(k => k === 'b'
  ? `<button type="button" class="fn" data-a="key" data-k="b" aria-label="Delete">${ic('x')}</button>`
  : `<button type="button" data-a="key" data-k="${k}">${k}</button>`).join('')}</div>`;

A.key = d => {
  let v = String(SL.ck.recv || ''); const k = d.k;
  if (k === 'b') v = v.slice(0, -1);
  else if (k === '.') { if (v.includes('.')) return; v = (v || '0') + '.'; }
  else { if (/\.\d\d$/.test(v) || v.length >= 9) return; v = v === '0' ? k : v + k; }
  SL.ck.recv = v; const i = $('ck-recv'); if (i) i.value = v;
  saveCart(); ckUpdate(); vibe(8);
};

const _go = go;
go = function (tab, o) {
  const was = ST.tab; _go(tab, o);
  if (was !== ST.tab) { const v = $('view'); v.classList.remove('swap'); void v.offsetWidth; v.classList.add('swap'); }
};

/* swipe a basket line left to remove it (with undo) */
let _ln = null, _x0 = 0, _y0 = 0, _dx = 0, _on = false, _sw = false;
document.addEventListener('pointerdown', e => {
  _ln = e.target.closest('.line'); if (!_ln || e.target.closest('.step')) { _ln = null; return; }
  _x0 = e.clientX; _y0 = e.clientY; _dx = 0; _on = false;
});
document.addEventListener('pointermove', e => {
  if (!_ln) return; const mx = e.clientX - _x0, my = e.clientY - _y0;
  if (!_on) { if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.5) _on = true; else return; }
  _dx = Math.min(0, mx); _ln.style.transition = 'none'; _ln.style.transform = `translateX(${_dx}px)`; _ln.style.opacity = 1 + _dx / 420;
  _ln.parentElement.style.background = _dx < -90 ? 'var(--neg-soft)' : '';
});
const _swEnd = () => {
  if (!_ln) return; const l = _ln, p = l.parentElement; _ln = null; p.style.background = '';
  const k = l.querySelector('[data-i]'), i = k ? +k.dataset.i : -1;
  if (_on && _dx < -90 && SL.cart[i]) {
    _sw = true; const snap = JSON.stringify(SL.cart), nm = SL.cart[i].name; SL.cart.splice(i, 1); afterCart(); if (!SL.cart.length) closeCheckout(); vibe(12);
    toast(nm + ' removed', { label: 'Undo', fn: () => { SL.cart = JSON.parse(snap); afterCart(); } });
  } else { if (_on) _sw = true; l.style.transition = 'transform .2s var(--ease), opacity .2s'; l.style.transform = ''; l.style.opacity = ''; }
  _on = false; setTimeout(() => { _sw = false; }, 60);
};
document.addEventListener('pointerup', _swEnd); document.addEventListener('pointercancel', _swEnd);
document.addEventListener('click', e => { if (_sw) { e.stopPropagation(); e.preventDefault(); } }, true);

/* a dot flies from the tapped item to the basket; light haptic tick on keys */
document.addEventListener('click', e => {
  const t = e.target.closest('.tile-main'); if (!t || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = ['.basket-pane', '#bar .sum', 'nav#nav [data-t="sell"] svg'].map(s => document.querySelector(s)).find(n => n && n.getBoundingClientRect().width > 0); if (!el) return;
  const a = t.getBoundingClientRect(), b = el.getBoundingClientRect(), d = document.createElement('i'); d.className = 'fly';
  d.style.left = a.left + a.width / 2 - 9 + 'px'; d.style.top = a.top + a.height / 2 - 9 + 'px'; document.body.appendChild(d);
  d.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${b.left + b.width / 2 - a.left - a.width / 2}px,${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.3)`, opacity: .35 }], { duration: 420, easing: 'cubic-bezier(.5,0,.8,.4)' }).onfinish = () => d.remove();
});
document.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && e.target.closest('.tile-main,.pad button,.step button')) vibe(6); }, { passive: true });

/* repeat customers: put the last sale's items back in the basket in one tap */
A.again = () => {
  const t = S.txns.find(x => x.id === SL.last); if (!t) return;
  for (const l of t.lines) {
    if (l.itemId && (!S.items.find(i => i.id === l.itemId) || qty(l.itemId) - inCart(l.itemId) < l.qty)) { toast('Not enough ' + l.name + ' left'); continue; }
    SL.cart.push({ itemId: l.itemId, name: l.name, qty: l.qty, price: l.price, cost: l.cost, list: l.list });
  }
  afterCart(); vibe(10);
};

/* dinau owed: a slim strip on the Sell screen so credit is never forgotten */
const owedHTML = () => {
  const o = S.customers.map(c => bal(c.id)).filter(b => b > 0); if (!o.length) return '';
  return `<div class="banner owed"><span class="grow"><b>${m(o.reduce((a, b) => a + b, 0))}</b> owed by ${o.length} customer${o.length > 1 ? 's' : ''}</span><button class="btn btn-sm" data-a="tab" data-t="people">Collect</button></div>`;
};
/* '/' jumps to search on a keyboard; offline notice reassures that nothing is lost */
document.addEventListener('keydown', e => {
  if (e.key !== '/' || (e.target.closest && e.target.closest('input,textarea,select')) || e.ctrlKey || e.metaKey) return;
  const q = document.querySelector('#view input[type="search"], #view input[data-in="q"], #view input[placeholder^="Search"]'); if (q) { e.preventDefault(); q.focus(); q.select(); }
});
addEventListener('offline', () => toast('Offline · everything still works and is saved'));
addEventListener('online', () => toast('Back online'));
