// --- FIREBASE CLOUD MESSAGING (FCM) KURULUMU ---
// Bildirimlerin arka planda çalışması için gerekli kütüphaneler
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

// Sizin Firebase Proje Ayarlarınız
firebase.initializeApp({
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
});

// Arka plan mesajlarını dinle
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[NetKoç SW] Arka plan bildirimi alındı:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/public/icon-192.png', // Bildirim ikonu
    badge: '/public/icon-192.png' // Android durum çubuğu ikonu
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- PWA ÖNBELLEKLEME (CACHING) ---
const CACHE_NAME = 'netkoc-v3'; // FCM eklendiği için versiyonu artırdık
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/student-login.html',      // Eklendi
  '/coach-dashboard.html',    // Eklendi
  '/student-dashboard.html',  // Eklendi
  '/manifest.json',
  '/public/favicon.png',
  '/public/logo.png',
  '/public/icon-192.png',
  '/public/icon-512.png',
  '/public/mockup-phone.jpg',
  '/public/mockup-pc.jpg',
  // Dış kaynaklar (Fontlar ve İkonlar)
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. KURULUM (INSTALL): Dosyaları önbelleğe al
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Yeni service worker'ı beklemeden aktif et
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[NetKoç SW] Dosyalar önbelleğe alınıyor...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. AKTİFLEŞTİRME (ACTIVATE): Eski önbellekleri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[NetKoç SW] Eski önbellek siliniyor:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. İSTEKLERİ YAKALAMA (FETCH): Strateji Belirleme
self.addEventListener('fetch', (event) => {
  // Sadece http/https isteklerini işle
  if (!event.request.url.startsWith('http')) return;

  // ÖNEMLİ: Firebase ve API isteklerini asla önbelleğe alma (Network Only)
  // Bu sayede veritabanı her zaman canlı kalır.
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis.com') || // FCM ve diğer Google API'leri için
      event.request.method !== 'GET') {
    return; 
  }

  // Diğer her şey için: Önce Cache, Yoksa Network (Stale-While-Revalidate benzeri)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Cache'de varsa hemen göster
      if (cachedResponse) {
        return cachedResponse;
      }
      // Yoksa internetten indir
      return fetch(event.request).then((networkResponse) => {
        // İndirdiğini bir sonraki sefer için cache'e at (Opsiyonel, dinamik cache)
        return networkResponse;
      });
    })
  );
});
