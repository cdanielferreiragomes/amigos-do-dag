/* Amigos do Dag: guarda o app no celular para abrir sem internet.
   Ao publicar uma versão nova, aumente VERSAO. */
const VERSAO = 'v17';
const CACHE = 'amigos-do-dag-' + VERSAO;
const ARQUIVOS = [
  './', './index.html', './avaliacao.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon-64.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('amigos-do-dag-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Páginas: tenta a internet por até 3 s (para pegar a versão nova) e cai no que está guardado.
   Demais arquivos: usa o guardado e atualiza por trás. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const net = await Promise.race([
          fetch(req),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        if (net && net.ok) cache.put(req, net.clone());
        return net;
      } catch (err) {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html'));
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const net = fetch(req).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});
