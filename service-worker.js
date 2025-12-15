// --- FIREBASE CLOUD MESSAGING (FCM) KURULUMU ---
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

// Firebase Proje Ayarlarınız
firebase.initializeApp({
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[NetKoç SW] Arka plan bildirimi:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/public/icon-192.png',
    badge: '/public/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- PWA ÖNBELLEKLEME (GÜNCELLENMİŞ STRATEJİ) ---
const CACHE_NAME = 'netkoc-v4-network-first'; // Versiyonu artırdık
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/student-login.html',
  '/coach-dashboard.html',
  '/student-dashboard.html',
  '/manifest.json',
  '/style.css',
  '/public/favicon.png',
  '/public/logo.png',
  '/public/icon-192.png',
  '/public/icon-512.png',
  '/public/mockup-phone.jpg',
  '/public/mockup-pc.jpg',
  // Dış kaynaklar
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. KURULUM (INSTALL)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Ön belleğe alınıyor...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. AKTİFLEŞTİRME (ACTIVATE) - Eski Cache'leri Temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eski önbellek siliniyor:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. İSTEKLERİ YAKALAMA (FETCH) - NETWORK FIRST STRATEJİSİ
self.addEventListener('fetch', (event) => {
  // Sadece http/https istekleri
  if (!event.request.url.startsWith('http')) return;

  // Firebase ve API isteklerini pas geç (Network Only)
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis.com')) {
    return; 
  }

  // HTML ve Ana Dosyalar için: Network First (Önce Ağ, Yoksa Cache)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Ağdan başarılı yanıt gelirse cache'i güncelle ve yanıtı dön
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      })
      .catch(() => {
        // Ağ hatası varsa cache'e bak
        console.log('[SW] Ağ yok, cache kullanılıyor:', event.request.url);
        return caches.match(event.request);
      })
  );
});