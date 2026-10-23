/* Start-up: theme, install prompt, service worker, shortcuts, first run. */
let deferred = null;
ST.iosHint = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream && !(matchMedia('(display-mode: standalone)').matches || navigator.standalone);
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; ST.installable = true; banners(); if (ST.tab === 'settings') render(); });
addEventListener('appinstalled', () => { deferred = null; ST.installable = false; banners(); toast('Installed'); });
A.install = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; ST.installable = false; render(); };
$('file').addEventListener('change', importFile);
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) { ST.update = true; banners(); } });
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
(function start() {
  theme();
  const qt = new URLSearchParams(location.search).get('tab'), h = location.hash.replace('#/', '');
  const want = qt === 'dinau' ? 'people' : qt || h;
  ST.tab = VIEWS.includes(want) ? want : 'sell';
  if (!S.cfg.setup && (S.items.length || S.txns.length)) S.cfg.setup = true;
  history.replaceState({ tab: ST.tab }, '', '#/' + ST.tab);
  render(true);
  if (!S.cfg.setup) setTimeout(onboard, 250);
  setInterval(banners, 36e5);
  notifyDue();
  if (overdue().length && !sessionStorage.getItem('sme.nt')) { sessionStorage.setItem('sme.nt', '1'); toast(plural(overdue().length, 'customer') + ' overdue. Tap the bell.'); }
})();
