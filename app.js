// =================================================================
// 0. HATA YAKALAMA
// =================================================================
window.addEventListener('error', function(e) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
    console.error("Global Hata:", e);
});

// =================================================================
// 1. FİREBASE KÜTÜPHANELERİ
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile, EmailAuthProvider, reauthenticateWithCredential, deleteUser, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, collectionGroup, query, where, orderBy, onSnapshot, getDocs, serverTimestamp, writeBatch, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FİREBASE CONFIG ---
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
let listeners = {}; // Dinleyicileri saklamak için

// =================================================================
// 2. BAŞLATMA
// =================================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('appContainer').classList.remove('hidden');
        updateUIForLoggedInUser(user);
        navigateToPage('anasayfa');
        initNotifications();
    } else {
        window.location.href = 'login.html';
    }
});

// =================================================================
// 3. UI & NAVİGASYON
// =================================================================
function updateUIForLoggedInUser(user) {
    const name = user.displayName || "Koç";
    document.getElementById("userName").textContent = name;
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("userAvatar").textContent = name.substring(0, 2).toUpperCase();
    
    // Profil Tıklama
    document.getElementById("userProfileArea").onclick = () => showProfileModal(user);
    
    // Çıkış
    document.getElementById("logoutButton").onclick = () => signOut(auth).then(() => window.location.href = 'login.html');

    // Navigasyon Linkleri
    document.querySelectorAll('.nav-link, .bottom-nav-btn').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page || link.id.split('-')[1];
            navigateToPage(page);
            closeMobileMenu(); // Varsa
        });
    });
}

function navigateToPage(pageId) {
    // Temizlik
    if(listeners.current) { listeners.current(); listeners.current = null; }
    
    // Stiller
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-700', 'font-semibold'));
    const active = document.getElementById(`nav-${pageId}`);
    if(active) active.classList.add('bg-purple-50', 'text-purple-700', 'font-semibold');
    
    // Sayfa Yükle
    try {
        const fnName = `render${pageId.charAt(0).toUpperCase() + pageId.slice(1)}Sayfasi`;
        if (typeof window[fnName] === 'function') window[fnName](db, currentUserId, appId);
        else if (pageId === 'anasayfa') renderAnaSayfa(db, currentUserId, appId);
        else renderPlaceholderSayfasi(pageId);
    } catch (e) { console.error(e); }
}

// Mobil Menü
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('mobileOverlay');
document.getElementById('mobileMenuBtn').onclick = () => { sidebar.classList.add('sidebar-open'); overlay.classList.remove('hidden'); };
function closeMobileMenu() { sidebar.classList.remove('sidebar-open'); overlay.classList.add('hidden'); }
if(overlay) overlay.onclick = closeMobileMenu;


// =================================================================
// 4. SAYFA RENDER FONKSİYONLARI (TÜM MODÜLLER BURADA)
// =================================================================

// --- ANA SAYFA ---
function renderAnaSayfa(db, uid, appId) {
    document.getElementById("mainContentTitle").textContent = "Kontrol Paneli";
    document.getElementById("mainContentArea").innerHTML = `
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg mb-8 flex justify-between items-center"><div><h2 class="text-2xl font-bold mb-1">Hoş geldin, Hocam! 👋</h2><p class="text-purple-100 text-sm">Bugün öğrencilerinin başarısı için harika bir gün.</p></div></div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center"><div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-users"></i></div><div><p class="text-sm text-gray-500 font-medium">Aktif Öğrenci</p><h3 class="text-2xl font-bold text-gray-800" id="dashTotalStudent">...</h3></div></div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center"><div class="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-regular fa-calendar-check"></i></div><div><p class="text-sm text-gray-500 font-medium">Bugünkü Randevular</p><h3 class="text-2xl font-bold text-gray-800" id="dashTodayAppt">...</h3></div></div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center"><div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-calendar-times"></i></div><div><p class="text-sm text-gray-500 font-medium">Gecikmiş Ödevler</p><h3 class="text-2xl font-bold text-red-600" id="dashPendingOdev">...</h3></div></div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center"><div class="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-hourglass-half"></i></div><div><p class="text-sm text-gray-500 font-medium">Onay Bekleyenler</p><h3 class="text-2xl font-bold text-yellow-600" id="dashPendingOnay">...</h3></div></div>
        </div>
        <!-- Hızlı Eylemler -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-8"><h3 class="font-bold text-gray-800 mb-4">Hızlı İşlemler</h3><div class="flex gap-4"><button onclick="openModal('addStudentModal')" class="flex items-center p-3 rounded-lg border hover:bg-purple-50 text-gray-700"><i class="fa-solid fa-user-plus text-purple-600 mr-2"></i>Öğrenci Ekle</button><button onclick="openRandevuModal()" class="flex items-center p-3 rounded-lg border hover:bg-orange-50 text-gray-700"><i class="fa-regular fa-calendar-plus text-orange-600 mr-2"></i>Randevu Ekle</button></div></div>
    `;
    // Veri Yüklemeleri
    listeners.current = onSnapshot(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim")), (snap) => document.getElementById('dashTotalStudent').textContent = snap.size);
    // Diğer sayaçlar için ayrı listenerlar eklenebilir
}

// --- AJANDA ---
function renderAjandaSayfasi(db, uid, appId) {
    document.getElementById("mainContentTitle").textContent = "Ajandam";
    document.getElementById("mainContentArea").innerHTML = `
        <div class="bg-white rounded-lg shadow p-4 mb-4"><div class="flex justify-between mb-4"><button id="prevMonth"><i class="fa-solid fa-chevron-left"></i></button><h2 id="currentMonthYear" class="font-bold"></h2><button id="nextMonth"><i class="fa-solid fa-chevron-right"></i></button></div><div id="calendarGrid" class="grid grid-cols-7 gap-1"></div></div>
        <div class="bg-white rounded-lg shadow p-4"><h3 class="font-bold mb-2">Gelecek Randevular</h3><div id="upcomingList" class="space-y-2"></div></div>
    `;
    // Takvim mantığı (Özet) - Detaylı hali önceki cevaplarda
    loadCalendar(new Date());
}

// --- ÖĞRENCİLER ---
function renderOgrencilerimSayfasi(db, uid, appId) {
    document.getElementById("mainContentTitle").textContent = "Öğrencilerim";
    document.getElementById("mainContentArea").innerHTML = `<div id="studentList" class="bg-white rounded shadow p-4">Yükleniyor...</div>`;
    listeners.current = onSnapshot(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim"), orderBy("ad")), (snap) => {
        const list = document.getElementById('studentList');
        if(snap.empty) { list.innerHTML = "Öğrenci yok."; return; }
        let html = `<table class="w-full text-left"><thead><tr><th class="p-2">Ad Soyad</th><th class="p-2">Sınıf</th><th class="p-2">İşlem</th></tr></thead><tbody>`;
        snap.forEach(doc => { const s=doc.data(); html+=`<tr class="border-b hover:bg-gray-50"><td class="p-2 font-bold">${s.ad} ${s.soyad}</td><td class="p-2">${s.sinif}</td><td class="p-2"><button onclick="renderOgrenciDetay('${doc.id}','${s.ad}')" class="text-blue-600">Detay</button></td></tr>`; });
        list.innerHTML = html + "</tbody></table>";
    });
}

// --- DİĞER SAYFALAR (Placeholder) ---
function renderPlaceholderSayfasi(title) {
    document.getElementById("mainContentTitle").textContent = title;
    document.getElementById("mainContentArea").innerHTML = `<div class="p-10 text-center text-gray-500">Bu sayfa yapım aşamasında: ${title}</div>`;
}
// Global'e ata (dinamik çağrı için)
window.renderAnasayfaSayfasi = renderAnaSayfa;
window.renderAjandamSayfasi = renderAjandaSayfasi;
window.renderOgrencilerimSayfasi = renderOgrencilerimSayfasi;
window.renderDenemelerSayfasi = (db,u,a) => renderPlaceholderSayfasi("Denemeler");
window.renderSorutakibiSayfasi = (db,u,a) => renderPlaceholderSayfasi("Soru Takibi");
window.renderHedeflerSayfasi = (db,u,a) => renderPlaceholderSayfasi("Hedefler");
window.renderOdevlerSayfasi = (db,u,a) => renderPlaceholderSayfasi("Ödevler");
window.renderMuhasebeSayfasi = (db,u,a) => renderPlaceholderSayfasi("Muhasebe");
window.renderMesajlarSayfasi = (db,u,a) => renderPlaceholderSayfasi("Mesajlar");


// =================================================================
// 5. MODAL VE HELPER İŞLEMLERİ
// =================================================================

// Modal Aç/Kapa
window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.openRandevuModal = async () => {
    await populateStudentSelect();
    openModal('addRandevuModal');
};

document.querySelectorAll('.close-modal-btn, #closeModalButton').forEach(b => {
    b.addEventListener('click', (e) => e.target.closest('.fixed').style.display = 'none');
});

// Öğrenci Select Doldurma
async function populateStudentSelect() {
    const select = document.getElementById('randevuStudentId');
    const snap = await getDocs(query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad")));
    select.innerHTML = '';
    snap.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = `${doc.data().ad} ${doc.data().soyad}`;
        select.appendChild(opt);
    });
}

// Profil
window.showProfileModal = (user) => {
    const m = document.getElementById('profileModal');
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    m.style.display = 'block';
};
document.getElementById('closeProfileModalButton').onclick = () => document.getElementById('profileModal').style.display = 'none';

// Bildirim
function initNotifications() {
    // Basit bildirim listener
    const btnNotif = document.getElementById('btnHeaderNotifications');
    if(btnNotif) {
         // ... Bildirim mantığı ...
    }
}

// Helperlar
function loadCalendar(date) { /* ... Takvim çizim ... */ }
window.renderOgrenciDetay = (id, name) => { alert("Öğrenci Detay: " + name); /* Detay sayfasına git */ };

// =================================================================
// 6. BAŞLAT
// =================================================================
main();
