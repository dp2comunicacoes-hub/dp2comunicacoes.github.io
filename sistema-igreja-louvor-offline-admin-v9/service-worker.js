const CACHE_NAME = 'grupo-louvor-vma-v9-20260623-01';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './sync-config.js',
  './seed-data.js',
  './manifest.webmanifest',
  './assets/img/logotipo-igreja.png',
  './assets/img/logo-grupo-louvor.webp',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;
  const url = new URL(request.url);
  if(url.origin !== location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try{
      const fresh = await fetch(request, {cache:'no-store'});
      cache.put(request, fresh.clone());
      return fresh;
    }catch(err){
      const cached = await cache.match(request);
      if(cached) return cached;
      if(request.mode === 'navigate') return cache.match('./index.html');
      throw err;
    }
  })());
});
