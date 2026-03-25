// ═══ NYT Explorer — Service Worker ═══
const CACHE_NAME = 'nyt-explorer-v1';

// Archivos estáticos que forman la "app shell"
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/config.js',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ═══ INSTALL ═══
// Pre-cache de los assets estáticos al instalar el SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activar inmediatamente sin esperar a que cierren las pestañas
  self.skipWaiting();
});

// ═══ ACTIVATE ═══
// Limpiar caches antiguos al activar una versión nueva del SW
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Eliminando caché antiguo:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Tomar control de todas las páginas abiertas inmediatamente
  self.clients.claim();
});

// ═══ FETCH ═══
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones que no sean GET
  if (request.method !== 'GET') return;

  // Estrategia para llamadas a la API del NYT → Network First
  if (url.hostname === 'api.nytimes.com') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Estrategia para el archivo .env → Network Only (no cachear credenciales)
  if (url.pathname.endsWith('.env')) {
    event.respondWith(fetch(request));
    return;
  }

  // Estrategia para assets estáticos → Cache First
  event.respondWith(cacheFirst(request));
});

// ═══ ESTRATEGIAS DE CACHÉ ═══

/**
 * Cache First: intenta servir desde caché, si no existe va a la red.
 * Ideal para assets estáticos que cambian poco.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    // Guardar en caché para futuras peticiones
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Si estamos offline y no hay caché, devolver página offline genérica
    return new Response(
      `<html>
        <head><meta charset="UTF-8"><title>Offline</title>
        <style>
          body { background: #0a0a0a; color: #f5f5dc; font-family: serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; text-align: center; }
          h1 { color: #c8102e; }
        </style></head>
        <body><div><h1>NYT Explorer</h1><p>No hay conexión a internet.<br>Reconecta e intenta de nuevo.</p></div></body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/**
 * Network First: intenta la red primero, si falla sirve desde caché.
 * Ideal para datos dinámicos de API que queremos siempre frescos.
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Guardar respuesta exitosa en caché como fallback
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Sin red: intentar servir desde caché
    const cached = await caches.match(request);
    if (cached) return cached;

    // Si tampoco hay caché, devolver error JSON
    return new Response(
      JSON.stringify({ error: 'Sin conexión y sin datos en caché.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
