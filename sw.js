// מאפשר לאפליקציה לעבוד גם בלי אינטרנט
const CACHE = 'jobhunt-v4';
const FILES = ['./', 'index.html', 'styles.css', 'engine.js', 'app.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// קודם רשת (כדי לקבל עדכונים), ואם אין חיבור, מהמטמון
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

// לחיצה על התראה פותחת את האפליקציה על המשרה
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const job = e.notification.data && e.notification.data.job;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const client = list.find(c => c.url.startsWith(self.registration.scope));
    const url = e.notification.data && e.notification.data.url;
    if (client) { client.focus(); if (job) client.postMessage({ openJob: job }); if (url) client.postMessage({ openJobUrl: url }); return; }
    return self.clients.openWindow(self.registration.scope + (job ? '?job=' + job : url ? '?jobUrl=' + encodeURIComponent(url) : ''));
  }));
});

// התראת Push מ-GitHub (נשלחת כשנמצאת משרה חדשה עם התאמה גבוהה)
self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (err) { m = { title: e.data ? e.data.text() : 'משרה חדשה' }; }
  e.waitUntil(self.registration.showNotification(m.title || 'משרה חדשה שמתאימה לך', {
    body: m.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: m.url || 'job', data: { url: m.url || '' },
  }));
});
