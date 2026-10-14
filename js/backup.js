/* Encrypted backups (AES-256-GCM, key from a passphrase via PBKDF2), restore, and plain exports.
   File format and keys are unchanged, so earlier .smebak files still restore. */
const BK = 'sme.tracker.bk', AAD = 'SME-TRACKER-BACKUP-1', VAD = 'SME-TRACKER-VERIFY-1', ITER = 600000, te = new TextEncoder(), td = new TextDecoder();
const jget = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (x) { return null; } };
const backupMeta = () => jget(BK);
const b64 = u => { u = new Uint8Array(u); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const derive = async (p, salt, it) => crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, await crypto.subtle.importKey('raw', te.encode(p.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
const seal = async (k, o, aad) => { const iv = crypto.getRandomValues(new Uint8Array(12)); return { iv: b64(iv), ct: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: te.encode(aad) }, k, te.encode(JSON.stringify(o)))) }; };
const unseal = async (k, o, aad) => JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv), additionalData: te.encode(aad) }, k, unb64(o.ct))));
/* The derived key (not the passphrase) is kept in IndexedDB so daily backups need no typing. */
const kdb = () => new Promise((ok, no) => { const r = indexedDB.open('sme-keys', 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const kop = async (mode, fn) => { try { const d = await kdb(); return await new Promise((ok, no) => { const q = fn(d.transaction('k', mode).objectStore('k')); q.onsuccess = () => ok(q.result || null); q.onerror = () => no(q.error); }); } catch (x) { return null; } };
const kget = () => kop('readonly', s => s.get('main')), kset = k => kop('readwrite', s => s.put(k, 'main'));
const backupDue = () => { const mm = backupMeta(); return !!mm && mm.auto !== false && mm.last !== today(); };

async function passKey(p) { const mm = backupMeta(); if (!mm) return null; try { const k = await derive(p, unb64(mm.salt), mm.iter); await unseal(k, mm.ver, VAD); return k; } catch (x) { return null; } }
async function getKey() {
  let k = await kget(); if (k) return k;
  const v = await form({ title: 'Backup passphrase', ok: 'Continue', fields: [{ k: 'p', label: 'Passphrase', type: 'password' }], check: v => !v.p ? 'Enter your passphrase.' : '' }); if (!v) return null;
  k = await passKey(v.p); if (!k) { toast('Wrong passphrase'); return null; } kset(k); return k;
}
async function bkFile() {
  const mm = backupMeta(), k = await getKey(); if (!k) return null;
  const o = await seal(k, { app: 'SME Tracker', version: 1, exportedAt: new Date().toISOString(), ...S }, AAD);
  return new File([JSON.stringify({ format: 'smebak', v: 1, kdf: 'PBKDF2-SHA256', iter: mm.iter, salt: mm.salt, ...o })], 'sme-tracker-' + today() + '.smebak', { type: 'application/octet-stream' });
}
/* Cloud upload hook: when a provider offers a supported upload API, set CLOUD.upload = async file => {...}. Until then the file goes out through the share sheet. */
const CLOUD = { upload: null };
async function deliver(f, title) {
  if (CLOUD.upload) { try { await CLOUD.upload(f); return true; } catch (x) {} }
  if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title }); return true; } catch (x) { if (x.name === 'AbortError') return false; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); return true;
}
function markBk(enc) { const mm = backupMeta(); if (enc && mm) { mm.last = today(); localStorage.setItem(BK, JSON.stringify(mm)); } S.cfg.backedUp = today(); save(); render(); }

A.bkset = async () => {
  const v = await form({ title: 'Backup passphrase', msg: 'Pick one passphrase you will remember. It locks your backups on this device before they go anywhere. If you forget it, nobody can open them, so write it down somewhere safe.', ok: 'Set passphrase', fields: [{ k: 'a', label: 'Passphrase (8+ characters)', type: 'password' }, { k: 'b', label: 'Repeat passphrase', type: 'password' }], check: v => v.a.length < 8 ? 'Use at least 8 characters.' : v.a !== v.b ? 'The two passphrases do not match.' : '' });
  if (!v) return; toast('Setting up…');
  const salt = crypto.getRandomValues(new Uint8Array(16)), k = await derive(v.a, salt, ITER);
  localStorage.setItem(BK, JSON.stringify({ salt: b64(salt), iter: ITER, ver: await seal(k, 'ok', VAD), last: '', auto: true })); await kset(k); render(); toast('Passphrase set. Tap Back up now.');
};
A.backup = async () => {
  if (!backupMeta()) return A.bkset();
  const f = await bkFile(); if (!f) return;
  if (await deliver(f, 'SME Tracker backup')) { markBk(true); toast('Backup made. Save it somewhere safe, like Proton Drive.'); }
};
A.bkauto = () => { const mm = backupMeta(); mm.auto = mm.auto === false; localStorage.setItem(BK, JSON.stringify(mm)); render(); };
A.exp = async () => { const f = new File([JSON.stringify({ app: 'SME Tracker', version: 1, exportedAt: new Date().toISOString(), ...S }, null, 1)], 'sme-tracker-plain-' + today() + '.json', { type: 'application/json' }); if (await deliver(f, 'SME Tracker data (not encrypted)')) { markBk(false); toast('Saved. This file is NOT encrypted.'); } };
A.csv = async () => {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', R = [['Receipt', 'Date', 'Time', 'Type', 'Customer', 'Items', 'Total', 'Paid now', 'Amount', 'Method', 'Note']];
  for (const t of [...S.txns].sort((a, b) => a.ts - b.ts)) { const c = t.customerId && cu(t.customerId); R.push([t.no || '', t.date, t.ts ? new Date(t.ts).toTimeString().slice(0, 5) : '', t.type, c ? c.name : (t.type === 'sale' ? 'Walk-in' : ''), (t.lines || []).map(l => l.qty + 'x ' + l.name).join('; '), t.total || '', t.paidNow || '', t.amount || '', mt(t), t.note || '']); }
  if (await deliver(new File(['﻿' + R.map(r => r.map(q).join(',')).join('\r\n')], 'sme-transactions-' + today() + '.csv', { type: 'text/csv' }), 'SME Tracker transactions')) toast('Spreadsheet saved');
};
A.restore = () => $('file').click();
async function importFile(ev) {
  const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
  try {
    let d = JSON.parse(await f.text()), k = null, env = null;
    if (d.format === 'smebak') {
      env = d; const v = await form({ title: 'Encrypted backup', msg: 'Enter the passphrase you used for this backup.', ok: 'Open backup', fields: [{ k: 'p', label: 'Passphrase', type: 'password' }], check: v => !v.p ? 'Enter your passphrase.' : '' }); if (!v) return;
      try { k = await derive(v.p, unb64(env.salt), env.iter); d = await unseal(k, env, AAD); } catch (x) { return toast('Wrong passphrase, or the file is damaged'); }
    }
    if (!Array.isArray(d.items) || !Array.isArray(d.txns) || !Array.isArray(d.customers)) throw 0;
    if (!await ask('Restore this backup?', `It has ${plural(d.txns.length, 'transaction')} and ${plural(d.items.length, 'item')}. This replaces ALL current data on this device.`, 'Restore')) return;
    const keepLog = S.log.length ? S.log : (d.log || []);
    S = migrate({ cfg: d.cfg, items: d.items, customers: d.customers, txns: d.txns, log: keepLog }); L('BACKUP RESTORED', d.txns.length + ' transactions');
    if (k) { localStorage.setItem(BK, JSON.stringify({ salt: env.salt, iter: env.iter, ver: await seal(k, 'ok', VAD), last: today(), auto: true })); await kset(k); }
    SL.cart = []; resetCk(); saveCart(); theme(); commit(); toast('Backup restored');
  } catch (x) { toast('That is not a valid SME Tracker backup'); }
}
