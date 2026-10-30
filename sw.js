/* Masjid Subardi Al-Huda Kuwon — service worker */
const VERSION = 'alhuda-v1';
const SHELL = ['./', './index.html', './pwa.js', './logo-masjid.png', './masjid.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;

  // Audio/video (permintaan Range) langsung ke jaringan, tidak di-cache
  if (req.headers.has('range') || /\.(mp3|mp4|webm|aac|ogg)(\?|$)/i.test(url.pathname)) return;

  // Halaman utama: jaringan dulu, cadangan dari cache saat offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // File milik situs sendiri (gambar jadwal PAP, QRIS, logo): jaringan dulu supaya selalu yang terbaru
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Aset luar (Tailwind, font, ikon, API Al-Qur'an & hadis): cache dulu sambil memperbarui di latar belakang
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
