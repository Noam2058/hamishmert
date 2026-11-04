// Service Worker: שומר את קוד הלוח, הספריות והגופנים כדי שהלוח יעבוד גם בלי אינטרנט.
const VERSION = 'shulboard-v5';
const SHELL = [
  './', './index.html', './m.html', './config.js', './manifest.webmanifest',
  './css/board.css', './css/mobile.css',
  './js/board.js', './js/mobile.js', './js/jewish.js', './js/prayers.js', './js/screens.js',
  './js/store.js', './js/defaults.js', './js/lib.js', './js/art.js', './js/scenes.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // נתוני Supabase – תמיד מהרשת (הלוח שומר עותק משלו)
  if (url.hostname.endsWith('supabase.co')) return;

  const immutable = url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.gstatic.com';
  if (immutable) {
    // ספריות עם גרסה נעולה וקבצי גופן: מהמטמון קודם
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    })));
    return;
  }
  // קבצי האתר והגדרות הגופנים: מהרשת קודם, ומהמטמון כשאין חיבור
  // cache: 'no-cache' – בודק מול השרת אם יש גרסה חדשה (בקשה קטנה), כדי שעדכון קוד יגיע ללוח מיד
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((res) => {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
