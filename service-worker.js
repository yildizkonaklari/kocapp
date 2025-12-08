const CACHE_NAME = 'netkoc-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/admin.html',
  '/manifest.json',
  '/public/favicon.png',
  '/public/logo.png',
  '/public/icon-192.png',
  '/public/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. Kurulum (Install) - Dosyaları Önbelleğe Al
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Dosyalar önbelleğe alınıyor');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Yeni service worker'ı hemen aktif et
});

// 2. Aktifleştirme (Activate) - Eski Önbellekleri Temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Eski önbellek siliniyor:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. İstekleri Yakalama (Fetch) - Önbellekten veya Ağdan Getir
self.addEventListener('fetch', (event) => {
  // Sadece http ve https isteklerini işle (chrome-extension vb. hariç)
  if (!event.request.url.startsWith('http')) return;

  // Firebase / API istekleri için Network-First (Önce internete bak, yoksa hata ver)
  if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) {
    return; // Firebase isteklerini Service Worker'a takılmadan direkt geçir
  }

  // Diğer statik dosyalar için Stale-While-Revalidate stratejisi
  // (Önbellekten göster ama arkada yenisini indirip güncelle)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request).then((response) => {
        // Yanıt geçerli değilse işlem yapma
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Yeni versiyonu önbelleğe at
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // İnternet yoksa ve önbellekte de yoksa yapılacak işlem (opsiyonel)
        // Genelde offline.html gösterilebilir ama şimdilik gerek yok.
      });

      // Önbellekte varsa onu döndür, yoksa ağ isteğini bekle
      return cachedResponse || networkFetch;
    })
  );
});
