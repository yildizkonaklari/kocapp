// =================================================================
// 1. FİREBASE & IMPORTLAR
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, collection, query, where, orderBy, onSnapshot, limit 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 

import { cleanUpListeners, populateStudentSelect, renderDersSecimi, renderPlaceholderSayfasi } from './modules/helpers.js';
import { renderAnaSayfa } from './modules/anasayfa.js';
import { renderOgrenciSayfasi, renderOgrenciDetaySayfasi, saveNewStudent, saveStudentChanges } from './modules/ogrencilerim.js';
import { renderAjandaSayfasi, saveNewRandevu } from './modules/ajanda.js';
import { renderMuhasebeSayfasi, saveNewBorc, saveNewTahsilat } from './modules/muhasebe.js';
import { renderMesajlarSayfasi } from './modules/mesajlar.js';
import { renderDenemelerSayfasi, saveGlobalDeneme, renderDenemeNetInputs } from './modules/denemeler.js';
import { renderSoruTakibiSayfasi, saveGlobalSoru } from './modules/sorutakibi.js';
import { renderHedeflerSayfasi, saveGlobalHedef } from './modules/hedefler.js';
import { renderOdevlerSayfasi, saveGlobalOdev } from './modules/odevler.js';

// --- AYARLAR ---
const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "kocluk-sistemi";

let currentUserId = null;
let notificationUnsubscribe = null;

// =================================================================
// 2. BAŞLATMA VE NAVİGASYON
// =================================================================

async function main() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('appContainer').classList.remove('hidden');
            
            updateUIForLoggedInUser(user);
            navigateToPage('anasayfa');
            
            // Bildirimleri ve Mesajları Dinlemeye Başla
            loadCoachNotifications();
            listenUnreadMessages();
        } else {
            window.location.href = 'login.html';
        }
    });
}

function updateUIForLoggedInUser(user) {
    const displayName = user.displayName || "Koç";
    document.getElementById("userName").textContent = displayName;
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("userAvatar").textContent = displayName.substring(0, 2).toUpperCase();

    // Profil Modalı
    const profileArea = document.getElementById("userProfileArea");
    if(profileArea) profileArea.onclick = () => showProfileModal(user);

    // Çıkış Butonları (Masaüstü ve Mobil)
    const handleLogout = () => signOut(auth).then(() => window.location.href = 'login.html');
    document.getElementById("logoutButton").onclick = handleLogout;
    document.getElementById("btnMobileLogout").onclick = handleLogout;

    // Navigasyon Linkleri
    document.querySelectorAll('.nav-link, .bottom-nav-btn, .mobile-drawer-link').forEach(link => {
        link.addEventListener('click', (e) => {
            // Menü açma butonu hariç hepsi sayfa değiştirir
            if(link.id === 'btnToggleMobileMenu') return; 
            
            e.preventDefault();
            const pageId = link.dataset.page || (link.id ? link.id.split('-')[1] : null);
            if(pageId) {
                navigateToPage(pageId);
                closeMobileMenu(); // Mobildeysek menüyü kapat
            }
        });
    });
}

function navigateToPage(pageId) {
    cleanUpListeners();
    // Bildirim listenerını temizleme, her zaman açık kalsın
    
    // Stiller (Sidebar)
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'font-semibold'));
    const sideLink = document.getElementById(`nav-${pageId}`);
    if(sideLink) sideLink.classList.add('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
    
    // Stiller (Bottom Nav)
    document.querySelectorAll('.bottom-nav-btn').forEach(l => {
        l.classList.remove('active', 'text-purple-600');
        l.classList.add('text-gray-500');
        const icon = l.querySelector('.bottom-nav-center-btn');
        if(icon) icon.classList.replace('bg-purple-600', 'bg-indigo-600'); // Reset center button color
    });
    const bottomLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if(bottomLink) {
        bottomLink.classList.add('active', 'text-purple-600');
        bottomLink.classList.remove('text-gray-500');
        // Eğer ortadaki butonsa rengini aç
        const icon = bottomLink.querySelector('.bottom-nav-center-btn');
        if(icon) icon.classList.replace('bg-indigo-600', 'bg-purple-600');
    }

    switch(pageId) {
        case 'anasayfa': renderAnaSayfa(db, currentUserId, appId); break;
        case 'ogrencilerim': renderOgrenciSayfasi(db, currentUserId, appId); break;
        case 'ajandam': renderAjandaSayfasi(db, currentUserId, appId); break;
        case 'muhasebe': renderMuhasebeSayfasi(db, currentUserId, appId); break;
        case 'mesajlar': renderMesajlarSayfasi(db, currentUserId, appId); break;
        case 'denemeler': renderDenemelerSayfasi(db, currentUserId, appId); break;
        case 'sorutakibi': renderSoruTakibiSayfasi(db, currentUserId, appId); break;
        case 'hedefler': renderHedeflerSayfasi(db, currentUserId, appId); break;
        case 'odevler': renderOdevlerSayfasi(db, currentUserId, appId); break;
        default: renderPlaceholderSayfasi("Sayfa"); break;
    }
}

// =================================================================
// 3. MOBİL MENÜ (DRAWER) YÖNETİMİ
// =================================================================

const btnToggleMenu = document.getElementById('btnToggleMobileMenu');
const drawer = document.getElementById('mobileMenuDrawer');
const overlay = document.getElementById('mobileMenuOverlay');
const btnCloseMenu = document.getElementById('btnCloseMobileMenu');

function openMobileMenu() {
    drawer.classList.remove('translate-x-full');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10); // Fade in
    document.body.classList.add('drawer-open');
}

function closeMobileMenu() {
    drawer.classList.add('translate-x-full');
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300); // Fade out wait
    document.body.classList.remove('drawer-open');
}

if(btnToggleMenu) btnToggleMenu.onclick = openMobileMenu;
if(btnCloseMenu) btnCloseMenu.onclick = closeMobileMenu;
if(overlay) overlay.onclick = closeMobileMenu;


// =================================================================
// 4. BİLDİRİMLER VE MESAJLAR
// =================================================================

// Bildirim Dropdown Toggle
const btnNotif = document.getElementById('btnHeaderNotifications');
const dropNotif = document.getElementById('notificationDropdown');
if(btnNotif && dropNotif) {
    btnNotif.onclick = (e) => {
        e.stopPropagation();
        dropNotif.classList.toggle('hidden');
        document.getElementById('headerNotificationDot').classList.add('hidden');
    };
    document.addEventListener('click', (e) => {
        if (!dropNotif.contains(e.target) && !btnNotif.contains(e.target)) dropNotif.classList.add('hidden');
    });
}

// Mesaj İkonu Toggle
document.getElementById('btnHeaderMessages').onclick = () => navigateToPage('mesajlar');

// Bildirimleri Yükle (Son 10 Bekleyen İşlem)
// Koç için bildirimler: "Onay Bekleyenler"dir.
function loadCoachNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;

    // Örnek: Bekleyen Denemeleri Dinle
    // Gerçek bir uygulamada birden fazla koleksiyonu dinleyip birleştirmek gerekir
    // veya cloud functions ile tek bir 'notifications' koleksiyonu yazılır.
    // Burada basitlik için 'denemeler'deki 'bekliyor' durumunu izliyoruz.
    
    // NOT: Collection Group query kullanıyoruz
    const q = query(
        collection(db, 'denemeler'), // collectionGroup yerine collection deneyin indeks yoksa
        // Aslında doğru olan collectionGroup(db, 'denemeler') ve where kocId.
        // Şimdilik basit bir demo verisi koyuyorum indeks hatası almayın diye.
        // İndeksleriniz tamsa aşağıdaki kodu açın:
        /*
        collectionGroup(db, 'denemeler'),
        where('kocId', '==', currentUserId),
        where('onayDurumu', '==', 'bekliyor'),
        orderBy('eklenmeTarihi', 'desc'),
        limit(5)
        */
    );

    // İndeks sorununu aşmak için şimdilik manuel bir placeholder ekliyorum.
    // İndeksleriniz tamamsa buraya gerçek onSnapshot listener'ı eklenir.
    list.innerHTML = '<p class="text-gray-400 text-xs text-center py-2">Yeni bildirim yok.</p>';
}

// Okunmamış Mesaj Sayısı
function listenUnreadMessages() {
    // İndeks gerektirir: mesalar (CollectionGroup) -> kocId, gonderen, okundu
    // Eğer indeks yoksa konsolda link çıkar.
    try {
        /*
        const q = query(
            collectionGroup(db, 'mesajlar'),
            where('kocId', '==', currentUserId),
            where('gonderen', '==', 'ogrenci'),
            where('okundu', '==', false)
        );
        onSnapshot(q, (snap) => {
            const count = snap.size;
            const badge = document.getElementById('headerUnreadMsgCount');
            if(count > 0) {
                badge.textContent = count;
                badge.classList.remove('hidden');
            } else badge.classList.add('hidden');
        });
        */
    } catch(e) { console.log("Mesaj dinleme hatası (İndeks eksik olabilir):", e); }
}


// =================================================================
// 5. MODAL İŞLEMLERİ (HELPERS)
// =================================================================
function addListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

// Profil
addListener('closeProfileModalButton', 'click', () => document.getElementById('profileModal').style.display = 'none');
window.showProfileModal = (user) => {
    const m = document.getElementById('profileModal');
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    m.style.display = 'block';
}
addListener('btnKopyala', 'click', () => {
    navigator.clipboard.writeText(document.getElementById('kocDavetKodu').value);
    alert('Kopyalandı');
});

// Diğer Modal Kapatıcılar
document.querySelectorAll('#closeModalButton, #cancelModalButton').forEach(b => b.onclick = () => document.getElementById('addStudentModal').style.display = 'none');
// ... (Diğer modalların kapatıcılarını buraya ekleyin) ...

// =================================================================
// 6. BAŞLAT
// =================================================================
main();
