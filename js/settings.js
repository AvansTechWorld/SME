/* Settings: shop details, look, backup, data, notifications, install, activity log, erase. */
V.settings = {
  html() {
    const mm = backupMeta(), on = mm && mm.auto !== false, t = S.cfg.theme || 'auto';
    const pals = [['lagoon', 'Mint', '#059669', '#FBBF24'], ['ocean', 'Indigo', '#4F46E5', '#F97316'], ['orchid', 'Violet', '#9333EA', '#FACC15'], ['slate', 'Graphite', '#1F2937', '#22C55E'], ['coral', 'Coral', '#E11D48', '#FBBF24']];
    return `<div class="page-h"><button class="icon-btn" style="color:var(--ink)" data-a="sback" aria-label="Back">${ic('x')}</button><h2>Settings</h2></div>
    <div class="card"><div class="card-h"><h3>Shop</h3><button class="btn btn-sm" data-a="shopedit">${ic('edit')}Edit</button></div>${kv('Name', esc(S.cfg.store))}${kv('Currency symbol', esc(cur()))}${kv('Dinau reminder after', (S.cfg.remindDays || 7) + ' days')}${kv('Quick cash buttons', esc(notes().join(', ')))}</div>
    <div class="card"><h3>Look</h3><div class="seg" role="group" aria-label="Light or dark">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(x => `<button data-a="mode" data-id="${x[0]}" aria-pressed="${t === x[0]}">${x[1]}</button>`).join('')}</div>
      <div class="chips" style="margin-top:10px">${pals.map(p => `<button class="chip" data-a="pal" data-id="${p[0]}" aria-pressed="${S.cfg.pal === p[0]}"><span style="display:inline-block;width:12px;height:12px;border-radius:6px;background:${p[2]};border:2px solid ${p[3]};vertical-align:-1px;margin-right:6px"></span>${p[1]}</button>`).join('')}</div></div>
    <div class="card"><h3>Backup</h3>${mm ? `<p class="muted">Last backup: ${esc(mm.last || 'never')} · daily reminder ${on ? 'on' : 'off'}.<br>Saved as a locked .smebak file. Send it somewhere safe, like Proton Drive.</p><div class="acts"><button class="btn btn-primary wide" data-a="backup">Back up now</button><button class="btn" data-a="bkauto">Reminder: ${on ? 'on' : 'off'}</button><button class="btn" data-a="restore">Restore</button></div>` : `<p class="muted">Your records only live on this device. A passphrase locks a backup file so it can be stored safely off the device.</p><div class="acts"><button class="btn btn-primary wide" data-a="bkset">Set up locked backup</button><button class="btn wide" data-a="restore">Restore from a backup</button></div>`}</div>
    <div class="card"><h3>Your data</h3><div class="acts" style="margin-top:0"><button class="btn" data-a="csv">Export spreadsheet</button><button class="btn" data-a="exp">Export all (plain)</button><button class="btn wide" data-a="log">Activity log</button></div></div>
    <div class="card"><h3>This device</h3><div class="acts" style="margin-top:0"><button class="btn" data-a="notif">Phone alerts: ${S.cfg.notify ? 'on' : 'off'}</button>${ST.installable ? `<button class="btn btn-primary" data-a="install">Install app</button>` : `<button class="btn" data-a="instalhelp">How to install</button>`}<button class="btn wide" data-a="showstart">Show the setup checklist</button></div></div>
    <div class="card"><h3>Erase</h3><p class="muted">Deletes every item, customer and record on this device.</p><button class="btn btn-danger btn-block" data-a="erase">Erase all data</button></div>
    <p class="hint" style="text-align:center">SME Tracker · works offline · v${APP_VER}</p>`;
  }
};
const APP_VER = 25;
A.sback = () => go(ST.prev && ST.prev !== 'settings' ? ST.prev : 'sell');
const _settings = A.settings; A.settings = () => { ST.prev = ST.tab; _settings(); };
A.mode = d => { S.cfg.theme = d.id; save(); theme(); render(); };
A.pal = d => { S.cfg.pal = d.id; save(); theme(); render(); };
A.shopedit = async () => {
  const v = await form({ title: 'Shop details', fields: [{ k: 's', label: 'Shop name', value: S.cfg.store, max: 40 }, [{ k: 'c', label: 'Currency symbol', value: cur(), max: 5 }, { k: 'r', label: 'Remind after (days)', type: 'int', value: S.cfg.remindDays || 7 }], { k: 'n', label: 'Quick cash buttons', value: notes().join(','), hint: 'Notes you often get, separated by commas. Shown at checkout.' }], check: v => !v.s.trim() ? 'Enter the shop name.' : !v.c.trim() ? 'Enter a currency symbol.' : !(int(v.r) >= 1) ? 'Days should be 1 or more.' : '' });
  if (!v) return; S.cfg.store = v.s.trim(); S.cfg.currency = v.c.trim(); S.cfg.remindDays = int(v.r); S.cfg.notes = v.n.split(',').map(x => num(x)).filter(x => x > 0).join(',') || '5,10,20,50,100'; commit();
};
A.log = () => {
  const bad = logBad(), R = (S.log || []).map((x, i) => `<div style="display:block"><b>${esc(new Date(x.ts).toLocaleString())}</b>${bad.has(i) ? ' <span class="neg">altered or out of order</span>' : ''}<br><span class="${/DELETED|EDITED/.test(x.act) ? 'warn' : 'muted'}">${esc(x.act)}</span> ${esc(x.txt)}</div>`).slice(-300).reverse().join('');
  openSheet({ title: 'Activity log', body: `<p class="${bad.size ? 'neg' : 'pos'}">${bad.size ? bad.size + ' entries look altered or out of time order.' : 'No edits, gaps or clock changes found in this log.'}</p><div class="hist" style="max-height:60vh">${R || '<p class="muted">Nothing yet.</p>'}</div>`, foot: '<button class="btn" data-sx>Close</button>' });
};
A.erase = async () => {
  if (!await ask('Erase all data?', 'Every item, customer and record on this device will be deleted.', 'Continue')) return;
  if (!await ask('Really erase everything?', 'This cannot be undone. Make a backup first if you are unsure.', 'Erase all')) return;
  S = fresh(); localStorage.removeItem(KEY); held = []; saveHeld(); SL.cart = []; resetCk(); saveCart(); theme(); go('sell'); toast('All data erased'); setTimeout(onboard, 300);
};
/* ---- phone alerts ---- */
function notifyDue() {
  const Ls = overdue(); if (!Ls.length || !S.cfg.notify || !('Notification' in window) || Notification.permission !== 'granted' || S.cfg.lastNotify === today()) return;
  S.cfg.lastNotify = today(); save();
  const t = r2(Ls.reduce((s, x) => s + x.b, 0));
  try { navigator.serviceWorker.ready.then(r => r.showNotification(S.cfg.store, { body: `${plural(Ls.length, 'customer')} owing ${S.cfg.remindDays || 7}+ days (${m(t)})`, icon: 'icon-192.png', tag: 'dinau' })); } catch (x) {}
}
A.notif = async () => {
  if (S.cfg.notify) { S.cfg.notify = false; save(); render(); return toast('Phone alerts off'); }
  if (!('Notification' in window)) return toast('This browser does not support alerts');
  if (await Notification.requestPermission() !== 'granted') return toast('Allow notifications in your browser settings');
  S.cfg.notify = true; S.cfg.lastNotify = ''; save(); render(); toast('Phone alerts on'); notifyDue();
};
/* ---- first run ---- */
async function onboard() {
  if (S.cfg.setup) return;
  const v = await form({ title: 'Welcome. Set up your shop', msg: 'Two minutes. You can change all of this later in Settings.', ok: 'Start selling', cancel: 'Skip', fields: [{ k: 's', label: 'Shop name', value: S.cfg.store === 'My Store' ? '' : S.cfg.store, ph: 'e.g. Kila Trading', max: 40 }, { k: 'c', label: 'Currency symbol', value: 'K', max: 5 }, [{ k: 'cash', label: 'Cash in the till now', type: 'number', ph: '0' }, { k: 'mob', label: 'Mobile banking balance', type: 'number', ph: '0' }]], check: v => !v.c.trim() ? 'Enter a currency symbol.' : (v.cash.trim() && num(v.cash) === null) || (v.mob.trim() && num(v.mob) === null) ? 'Starting amounts should be numbers.' : '' });
  S.cfg.setup = true;
  if (v) {
    if (v.s.trim()) S.cfg.store = v.s.trim(); S.cfg.currency = v.c.trim() || 'K';
    if (num(v.cash) > 0) add(base('cash', { amount: r2(num(v.cash)), method: 'cash', note: 'Starting cash' }));
    if (num(v.mob) > 0) add(base('cash', { amount: r2(num(v.mob)), method: 'mobile', note: 'Starting mobile balance' }));
  }
  commit();
}
