/* App shell: sheets (with working Android Back), confirm box, form builder, toast, router, header, nav, banners. */
const A = {}, V = {}, IN = {};
const ST = { tab: 'sell', update: false, installable: false };
const TABS = [['stock', 'Stock', 'stock'], ['people', 'Customers', 'people'], ['sell', 'Sell', 'sell'], ['accounts', 'Accounts', 'accounts'], ['report', 'Reports', 'report']];
const VIEWS = [...TABS.map(t => t[0]), 'settings'];

/* ---------- sheets ----------
   Several sheets can be open at once (checkout, then a customer picker on top). One history entry is held
   while any sheet is open, so the phone's Back button closes the top sheet instead of leaving the app. */
const stack = []; let sentinel = false, pendingBack = 0, needPush = false, backTimer = null;
/* history.back() is asynchronous. If a new sheet opens while one is still in flight, pushing right away races with it, so the push waits until the back has landed. */
function settleBack(timedOut) {
  clearTimeout(backTimer); pendingBack = timedOut ? 0 : Math.max(0, pendingBack - 1);
  if (pendingBack > 0) return;
  history.replaceState({ tab: ST.tab }, '', '#/' + ST.tab);
  if (needPush && stack.length) { history.pushState({ sh: 1 }, ''); sentinel = true; }
  needPush = false;
}
function openSheet({ title, body, foot, wide, mount, onClose }) {
  const el = document.createElement('div'); el.className = 'sheet show';
  el.innerHTML = `<div class="sheet-panel${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-sx aria-label="Close">${ic('x')}</button></div><div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}</div>`;
  $('sheets').appendChild(el); $('toast').classList.remove('show');
  const h = { el, panel: el.firstChild, onClose, close: v => closeSheet(h, v), body: () => el.querySelector('.sheet-body') };
  stack.push(h);
  if (!sentinel) { if (pendingBack > 0) needPush = true; else { history.pushState({ sh: 1 }, ''); sentinel = true; } }
  el.addEventListener('mousedown', e => { if (e.target === el) h.close(); });
  el.addEventListener('click', e => { if (e.target.closest('[data-sx]')) h.close(); });
  document.body.classList.add('sheet-open');
  if (mount) mount(h);
  return h;
}
function closeSheet(h, v, fromPop) {
  const i = stack.indexOf(h); if (i < 0) return;
  stack.splice(i, 1); h.el.remove();
  if (!stack.length) {
    document.body.classList.remove('sheet-open');
    if (needPush) needPush = false;
    else if (sentinel && !fromPop) { pendingBack++; sentinel = false; history.back(); backTimer = setTimeout(() => settleBack(true), 900); }
  }
  if (h.onClose) h.onClose(v);
}
const closeAllSheets = () => { while (stack.length) closeSheet(stack[stack.length - 1]); };
addEventListener('popstate', () => {
  if (pendingBack > 0) { settleBack(); return; }
  if (cfRes) { closeConfirm(false); if (stack.length) { history.pushState({ sh: 1 }, ''); sentinel = true; } else sentinel = false; return; }
  if (stack.length) {
    sentinel = false; closeSheet(stack[stack.length - 1], undefined, true);
    if (stack.length) { history.pushState({ sh: 1 }, ''); sentinel = true; } else document.body.classList.remove('sheet-open');
    return;
  }
  route();
});
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (cfRes) closeConfirm(false); else if (stack.length) stack[stack.length - 1].close();
});

/* ---------- confirm box (sits above sheets) ---------- */
let cfRes = null;
function ask(title, msg, ok = 'OK', danger = true) {
  return new Promise(res => {
    if (cfRes) closeConfirm(false);
    cfRes = res;
    $('cf').innerHTML = `<div class="box" role="alertdialog" aria-modal="true"><h2>${esc(title)}</h2><p class="muted">${esc(msg)}</p><div class="row"><button type="button" class="btn" data-cf="0">Cancel</button><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-cf="1">${esc(ok)}</button></div></div>`;
    $('cf').classList.add('show'); $('cf').querySelector('[data-cf="0"]').focus();
  });
}
function closeConfirm(v) { $('cf').classList.remove('show'); const r = cfRes; cfRes = null; if (r) r(v); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cf]'); if (b) return closeConfirm(b.dataset.cf === '1');
  if (e.target === $('cf')) closeConfirm(false);
});

/* ---------- form builder ----------
   fields: [{k,label,type,value,opts,hint,ph}] ; an inner array puts fields side by side.
   Returns the typed values, or null if cancelled. check(v) may return a message to show instead of closing. */
function fieldHTML(f) {
  const id = 'f_' + f.k, v = f.value ?? '';
  let inp;
  if (f.type === 'select') inp = `<select id="${id}" name="${f.k}">${f.opts.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(v) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  else if (f.type === 'textarea') inp = `<textarea id="${id}" name="${f.k}" placeholder="${esc(f.ph || '')}" rows="${f.rows || 5}">${esc(v)}</textarea>`;
  else {
    const t = f.type === 'number' || f.type === 'int' ? 'text' : (f.type || 'text'), im = f.type === 'number' ? ' inputmode="decimal"' : f.type === 'int' ? ' inputmode="numeric"' : f.type === 'tel' ? ' inputmode="tel"' : '';
    inp = `<input id="${id}" name="${f.k}" type="${t}"${im} value="${esc(v)}" placeholder="${esc(f.ph || '')}" autocomplete="${f.type === 'password' ? 'new-password' : 'off'}"${f.list ? ` list="${id}_l"` : ''}${f.max ? ` maxlength="${f.max}"` : ''}>${f.list ? `<datalist id="${id}_l">${f.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}`;
  }
  return `<div class="fld"><label class="f" for="${id}">${esc(f.label)}</label>${inp}${f.hint ? `<div class="hint" id="${id}_h">${f.hint}</div>` : ''}</div>`;
}
function form({ title, msg, fields, ok = 'Save', cancel = 'Cancel', danger, check, wide, extra = '', mount }) {
  return new Promise(res => {
    const fid = 'frm' + uid(), flat = fields.flat();
    const body = `<form id="${fid}" novalidate>${msg ? `<p class="muted">${msg}</p>` : ''}${fields.map(f => Array.isArray(f) ? `<div class="two">${f.map(fieldHTML).join('')}</div>` : fieldHTML(f)).join('')}${extra}<p class="err" role="alert" hidden></p></form>`;
    let out = null;
    const h = openSheet({
      title, body, wide, onClose: v => res(out),
      foot: `<button type="button" class="btn" data-sx>${esc(cancel)}</button><button type="submit" form="${fid}" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(ok)}</button>`,
      mount: hh => {
        const f = hh.el.querySelector('form');
        f.onsubmit = e => {
          e.preventDefault();
          const v = {}; flat.forEach(x => { v[x.k] = f.elements[x.k].value; });
          const msg = check ? check(v) : '';
          if (msg) { const p = f.querySelector('.err'); p.textContent = msg; p.hidden = false; vibe(40); return; }
          out = v; hh.close(v);
        };
        if (mount) mount(hh, f);
        const first = flat.find(x => x.type !== 'select' && x.type !== 'date');
        if (first && !matchMedia('(pointer: coarse)').matches) setTimeout(() => { const el = f.elements[first.k]; el && el.focus(); }, 50);
      }
    });
  });
}
document.addEventListener('focusin', e => { const t = e.target; if (t.tagName === 'INPUT' && (t.inputMode === 'decimal' || t.inputMode === 'numeric')) setTimeout(() => t.select && t.select(), 0); });

/* ---------- toast and pop ---------- */
let tt, pt;
function toast(msg, act) {
  const t = $('toast'); t.innerHTML = `<span>${esc(msg)}</span>` + (act ? `<button type="button">${esc(act.label)}</button>` : '');
  if (act) t.querySelector('button').onclick = () => { t.classList.remove('show'); act.fn(); };
  t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), act ? (act.ms || 7000) : 2600);
}
function pop(a, b, ms) {
  const o = $('pop'); o.innerHTML = `<div>${esc(a)}</div><b>${esc(b)}</b>`; o.classList.remove('show'); void o.offsetWidth; o.classList.add('show');
  clearTimeout(pt); pt = setTimeout(() => o.classList.remove('show'), ms); vibe(30);
}
$('pop').onclick = () => $('pop').classList.remove('show');

/* ---------- theme ---------- */
function theme() {
  const t = S.cfg.theme || 'auto', dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches), r = document.documentElement;
  r.dataset.mode = dark ? 'dark' : 'light'; r.dataset.pal = S.cfg.pal || 'lagoon';
  const c = getComputedStyle(r).getPropertyValue('--bg').trim(); if (c) document.querySelector('meta[name=theme-color]').content = c;
}
matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', theme);

/* ---------- router ---------- */
function go(tab, o = {}) {
  if (!VIEWS.includes(tab)) tab = 'sell';
  ST.tab = tab; const url = '#/' + tab;
  if (o.push) history.pushState({ tab }, '', url); else history.replaceState({ tab }, '', url);
  render(true); scrollTo(0, 0);
}
function route() {
  const t = location.hash.replace('#/', '').split('?')[0];
  ST.tab = VIEWS.includes(t) ? t : (ST.tab || 'sell'); render(true); scrollTo(0, 0);
}
A.tab = d => go(d.t);
A.settings = () => go('settings', { push: true });

/* ---------- chrome ---------- */
function header() {
  $('store').textContent = S.cfg.store;
  $('cash').textContent = m(C.cash); $('cash').classList.toggle('neg', C.cash < 0);
  const n = alertCount(); $('bn').textContent = n; $('bn').hidden = !n;
}
function navUI() {
  const nav = $('nav');
  if (!nav.dataset.built) {
    nav.innerHTML = `<div class="brand"><img src="icon-192.png" alt="" width="34" height="34"><span id="brandn"></span></div>` + TABS.map(t => `<button type="button" data-a="tab" data-t="${t[0]}">${ic(t[2])}<span>${t[1]}</span></button>`).join('');
    nav.dataset.built = 1;
  }
  $('brandn').textContent = S.cfg.store;
  qa('button', nav).forEach(b => b.getAttribute('aria-current') !== null && b.removeAttribute('aria-current'));
  const cur = qa('button', nav).find(b => b.dataset.t === ST.tab); if (cur) cur.setAttribute('aria-current', 'page');
}
function banners() {
  const B = [], ss = k => { try { return sessionStorage.getItem(k); } catch (x) { return null; } };
  if (ST.update) B.push(`<div class="banner"><span class="grow"><b>Update ready.</b> Reload to get the newest version.</span><button class="btn btn-sm btn-primary" data-a="reload">Reload</button></div>`);
  if (typeof backupDue === 'function' && backupDue() && !ss('sme.bk')) B.push(`<div class="banner warn"><span class="grow"><b>Daily backup is due.</b></span><button class="btn btn-sm btn-primary" data-a="backup">Back up now</button></div>`);
  else if (typeof backupMeta === 'function' && S.txns.length > 15 && !backupMeta() && !ss('sme.bkn')) B.push(`<div class="banner warn"><span class="grow"><b>Your records only live on this device.</b> Set up a locked backup.</span><button class="btn btn-sm btn-primary" data-a="bkset">Set up</button><button class="icon-btn" data-a="hideb" data-k="sme.bkn" aria-label="Dismiss">${ic('x')}</button></div>`);
  if (C.cash < 0 && S.txns.length && !ss('sme.neg')) B.push(`<div class="banner warn"><span class="grow"><b>Your till shows less than zero.</b> Stock bought from cash comes out of it. Add the cash you started with.</span><button class="btn btn-sm btn-primary" data-a="cash">Add cash</button><button class="icon-btn" data-a="hideb" data-k="sme.neg" aria-label="Dismiss">${ic('x')}</button></div>`);
  if (ST.installable && !ss('sme.inst')) B.push(`<div class="banner"><span class="grow">Install SME Tracker for faster, offline use.</span><button class="btn btn-sm btn-primary" data-a="install">Install</button><button class="icon-btn" data-a="hideb" data-k="sme.inst" aria-label="Dismiss">${ic('x')}</button></div>`);
  else if (ST.iosHint && !ss('sme.inst')) B.push(`<div class="banner"><span class="grow">To install: tap Share, then “Add to Home Screen”.</span><button class="icon-btn" data-a="hideb" data-k="sme.inst" aria-label="Dismiss">${ic('x')}</button></div>`);
  $('banners').innerHTML = B.join('');
}
A.hideb = d => { try { sessionStorage.setItem(d.k, '1'); } catch (x) {} banners(); };
A.reload = () => location.reload();

function render(keep) {
  C = calc(); header(); navUI();
  const y = keep ? 0 : scrollY, v = V[ST.tab];
  $('view').innerHTML = v.html();
  if (v.after) v.after();
  banners();
  if (typeof drawBar === 'function') drawBar();
  if (!keep) scrollTo(0, y);
}
/* One place to finish any change: save, then redraw. */
const commit = () => { save(); render(); };

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const f = A[el.dataset.a]; if (f) { e.preventDefault(); f(el.dataset, el, e); }
});
document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.in && IN[t.dataset.in]) IN[t.dataset.in](t, e); });
