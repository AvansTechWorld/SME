// Bump CACHE whenever you change any file, so installed copies update.
const CACHE = 'sme-tracker-v30';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
  'js/util.js', 'js/store.js', 'js/calc.js', 'js/ui.js', 'js/sell.js', 'js/stock.js', 'js/people.js', 'js/money.js', 'js/receipt.js', 'js/report.js', 'js/backup.js', 'js/settings.js', 'js/register.js', 'js/tools.js', 'js/boot.js'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(caches.match(ev.request, { ignoreSearch: true }).then(hit => hit || fetch(ev.request).catch(() => caches.match('index.html'))));
});
self.addEventListener('notificationclick', ev => {
  ev.notification.close();
  ev.waitUntil(clients.matchAll({ type: 'window' }).then(l => l.length ? l[0].focus() : clients.openWindow('./')));
});
