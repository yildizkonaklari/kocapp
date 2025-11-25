// =================================================================
// 0. HATA YAKALAMA
// =================================================================
window.addEventListener('error', function(e) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
    console.error("Global Hata:", e);
});

// =================================================================
// 1. FİREBASE IMPORTLARI
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile, EmailAuthProvider, reauthenticateWithCredential, deleteUser, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, collectionGroup, query, where, orderBy, onSnapshot, getDocs, serverTimestamp, writeBatch, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 

// MODÜL İÇERİKLERİ (BİRLEŞTİRİLMİŞ)
// Helpers
let activeListeners = {};
function cleanUpListeners() { if(activeListeners.current) activeListeners.current(); activeListeners.current = null; }
async function populateStudentSelect(id) {
    const select = document.getElementById(id); if(!select) return;
    const snap = await getDocs(query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad")));
    select.innerHTML = ''; snap.forEach(doc => { const opt = document.createElement('option'); opt.value = doc.id; opt.textContent = `${doc.data().ad} ${doc.data().soyad}`; select.appendChild(opt); });
}
function renderDersSecimi(sinif, container, selected=[]) {
    container.innerHTML = '';
    const dersler = (['12. Sınıf','Mezun'].includes(sinif)) ? ["Matematik","Fizik","Kimya","Biyoloji","Türkçe","Tarih","Coğrafya","Felsefe"] : ["Matematik","Fen","Türkçe","Sosyal","İngilizce"];
    dersler.forEach(d => {
        const div = document.createElement('div'); div.className = "flex items-center";
        div.innerHTML = `<input type="checkbox" value="${d}" ${selected.includes(d)?'checked':''} class="mr-2"><span>${d}</span>`;
        container.appendChild(div);
    });
}
function renderPlaceholderSayfasi(title) { document.getElementById("mainContentTitle").textContent = title; document.getElementById("mainContentArea").innerHTML = `<div class="p-10 text-center text-gray-500">Sayfa: ${title}</div>`; }
function formatDateTR(d) { if(!d) return ''; const [y,m,da]=d.split('-'); return `${da}.${m}.${y}`; }

// --- CONFIG ---
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

// =================================================================
// 2. BAŞLATMA
// =================================================================
async function main() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('appContainer').classList.remove('hidden');
            updateUIForLoggedInUser(user);
            navigateToPage('anasayfa');
            initNotifications(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });
}

// =================================================================
// 3. UI & NAVİGASYON
// =================================================================
function updateUIForLoggedInUser(user) {
    const name = user.displayName || "Koç";
    const initials = name.substring(0, 2).toUpperCase();

    ['userName', 'drawerUserName', 'headerName'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).textContent = name; });
    ['userEmail', 'drawerUserEmail'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).textContent = user.email; });
    ['userAvatar', 'drawerUserAvatar', 'headerAvatar'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).textContent = initials; });

    const openProfile = (e) => { e.preventDefault(); closeMobileMenu(); showProfileModal(user); };
    ['userProfileArea', 'drawerProfileArea', 'headerCoachProfile'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).onclick = openProfile; });

    const logout = () => signOut(auth).then(() => window.location.href = 'login.html');
    ['logoutButton', 'btnMobileLogout'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).onclick = logout; });

    document.querySelectorAll('.nav-link, .bottom-nav-btn, .mobile-drawer-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.id !== 'mobileMenuBtn' && !link.classList.contains('mobile-menu-trigger')) {
                e.preventDefault();
                const page = link.dataset.page || (link.id ? link.id.split('-')[1] : null);
                if (page) { navigateToPage(page); closeMobileMenu(); }
            }
        });
    });
}

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('mobileOverlay');
const drawer = document.getElementById('mobileMenuDrawer');
const btnMenu = document.getElementById('mobileMenuBtn');
const btnToggle = document.getElementById('btnToggleMobileMenu');
const btnClose = document.getElementById('btnCloseMobileMenu');

const openMenu = () => { drawer.classList.remove('translate-x-full'); overlay.classList.remove('hidden'); };
const closeMobileMenu = () => { drawer.classList.add('translate-x-full'); overlay.classList.add('hidden'); };

if(btnMenu) btnMenu.onclick = openMenu;
if(btnToggle) btnToggle.onclick = openMenu;
if(btnClose) btnClose.onclick = closeMobileMenu;
if(overlay) overlay.onclick = closeMobileMenu;

function navigateToPage(pageId) {
    cleanUpListeners();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-700', 'font-semibold'));
    const active = document.getElementById(`nav-${pageId}`);
    if(active) active.classList.add('bg-purple-50', 'text-purple-700', 'font-semibold');
    
    document.querySelectorAll('.bottom-nav-btn').forEach(l => { l.classList.remove('active', 'text-purple-600'); l.classList.add('text-gray-500'); });
    const bLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if(bLink) { bLink.classList.add('active', 'text-purple-600'); bLink.classList.remove('text-gray-500'); }

    try {
        if(pageId === 'anasayfa') renderAnaSayfa();
        else if(pageId === 'ogrencilerim') renderOgrenciSayfasi();
        else if(pageId === 'ajandam') renderAjandaSayfasi();
        else if(pageId === 'muhasebe') renderMuhasebeSayfasi();
        else if(pageId === 'mesajlar') renderMesajlarSayfasi();
        else if(pageId === 'denemeler') renderDenemelerSayfasi();
        else if(pageId === 'sorutakibi') renderSoruTakibiSayfasi();
        else if(pageId === 'hedefler') renderHedeflerSayfasi();
        else if(pageId === 'odevler') renderOdevlerSayfasi();
        else renderPlaceholderSayfasi(pageId);
    } catch (e) { console.error(e); }
}


// =================================================================
// 4. RENDER FONKSİYONLARI (MODÜLLERDEN ENTEGRE)
// =================================================================

// ANA SAYFA
function renderAnaSayfa() {
    document.getElementById("mainContentTitle").textContent = "Kontrol Paneli";
    document.getElementById("mainContentArea").innerHTML = `
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg mb-8"><div><h2 class="text-2xl font-bold mb-1">Hoş geldin, Hocam! 👋</h2><p class="text-purple-100 text-sm">Öğrencilerin seni bekliyor.</p></div></div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100"><p class="text-sm text-gray-500">Aktif Öğrenci</p><h3 class="text-2xl font-bold text-gray-800" id="dashTotalStudent">...</h3></div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100"><p class="text-sm text-gray-500">Bugünkü Randevular</p><h3 class="text-2xl font-bold text-gray-800" id="dashTodayAppt">...</h3></div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100"><p class="text-sm text-gray-500">Gecikmiş Ödevler</p><h3 class="text-2xl font-bold text-red-600" id="dashPendingOdev">...</h3></div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100"><p class="text-sm text-gray-500">Onay Bekleyenler</p><h3 class="text-2xl font-bold text-yellow-600" id="dashPendingOnay">...</h3></div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-8"><h3 class="font-bold text-gray-800 mb-4">Hızlı İşlemler</h3><div class="flex gap-4"><button onclick="openModal('addStudentModal')" class="flex items-center p-3 rounded-lg border hover:bg-purple-50 text-gray-700"><i class="fa-solid fa-user-plus text-purple-600 mr-2"></i>Öğrenci Ekle</button><button onclick="openRandevuModal()" class="flex items-center p-3 rounded-lg border hover:bg-orange-50 text-gray-700"><i class="fa-regular fa-calendar-plus text-orange-600 mr-2"></i>Randevu Ekle</button></div></div>
    `;
    activeListeners.current = onSnapshot(query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim")), (s) => document.getElementById('dashTotalStudent').textContent = s.size);
    const today = new Date().toISOString().split('T')[0];
    onSnapshot(query(collection(db, "artifacts", appId, "users", currentUserId, "ajandam"), where("tarih","==",today)), (s) => document.getElementById('dashTodayAppt').textContent = s.size);
}

// ÖĞRENCİLER
function renderOgrenciSayfasi() {
    document.getElementById("mainContentTitle").textContent = "Öğrencilerim";
    document.getElementById("mainContentArea").innerHTML = `<div class="flex justify-end mb-4"><button onclick="openModal('addStudentModal')" class="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Yeni Ekle</button></div><div id="studentList" class="bg-white rounded shadow p-4">Yükleniyor...</div>`;
    activeListeners.current = onSnapshot(query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad")), (snap) => {
        const list = document.getElementById('studentList');
        if(snap.empty) { list.innerHTML = "Öğrenci yok."; return; }
        let html = `<table class="w-full text-left"><thead><tr><th class="p-2">Ad Soyad</th><th class="p-2">Sınıf</th><th class="p-2">İşlem</th></tr></thead><tbody>`;
        snap.forEach(doc => { const s=doc.data(); html+=`<tr class="border-b hover:bg-gray-50"><td class="p-2 font-bold">${s.ad} ${s.soyad}</td><td class="p-2">${s.sinif}</td><td class="p-2"><button onclick="alert('Detay: ${s.ad}')" class="text-blue-600">Detay</button></td></tr>`; });
        list.innerHTML = html + "</tbody></table>";
    });
}

// AJANDA
function renderAjandaSayfasi() {
    document.getElementById("mainContentTitle").textContent = "Ajandam";
    document.getElementById("mainContentArea").innerHTML = `<div class="bg-white rounded-lg shadow p-4 mb-4"><button onclick="openRandevuModal()" class="bg-purple-600 text-white px-4 py-2 rounded mb-4">Yeni Randevu</button><div id="calendarGrid">Takvim yükleniyor...</div></div>`;
    // (Takvim çizim kodları buraya eklenebilir, yer tutucu olarak bırakıldı)
}

// DİĞERLERİ (Placeholder)
const pages = ['muhasebe', 'mesajlar', 'denemeler', 'sorutakibi', 'hedefler', 'odevler'];
pages.forEach(p => { window[`render${p.charAt(0).toUpperCase() + p.slice(1)}Sayfasi`] = () => renderPlaceholderSayfasi(p.toUpperCase()); });


// =================================================================
// 5. MODAL VE HELPERLAR
// =================================================================

// Ortak Kapatma (Class-based)
document.querySelectorAll('.js-modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.fixed');
        if(modal) modal.classList.add('hidden');
    });
});

window.openModal = (id) => { document.getElementById(id).classList.remove('hidden'); };
window.openRandevuModal = async () => {
    await populateStudentSelect('randevuStudentId');
    openModal('addRandevuModal');
};

// Kayıt İşlemleri (Event Listeners)
const addListener = (id, handler) => { const el = document.getElementById(id); if(el) el.onclick = handler; };

// Kayıt Butonları
addListener('saveStudentButton', 'click', () => saveNewStudent(db, currentUserId, appId));
addListener('saveStudentChangesButton', 'click', () => saveStudentChanges(db, currentUserId, appId));
addListener('studentClass', 'change', (e) => renderDersSecimi(e.target.value, document.getElementById('studentDersSecimiContainer')));
addListener('editStudentClass', 'change', (e) => renderDersSecimi(e.target.value, document.getElementById('editStudentDersSecimiContainer')));

addListener('saveDenemeButton', 'click', () => saveGlobalDeneme(db, currentUserId, appId));
addListener('denemeTuru', 'change', (e) => renderDenemeNetInputs(e.target.value));

addListener('saveSoruButton', 'click', () => saveGlobalSoru(db, currentUserId, appId));

addListener('saveHedefButton', 'click', () => saveGlobalHedef(db, currentUserId, appId));
addListener('saveOdevButton', 'click', () => saveGlobalOdev(db, currentUserId, appId));

addListener('saveRandevuButton', 'click', () => saveNewRandevu(db, currentUserId, appId));

addListener('saveTahsilatButton', 'click', () => saveNewTahsilat(db, currentUserId, appId));
addListener('saveBorcButton', 'click', () => saveNewBorc(db, currentUserId, appId));

// Window Helpers
window.renderOgrenciDetaySayfasi = (id, name) => renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);


// Profil Modalı
const profileModal = document.getElementById("profileModal");
window.showProfileModal = (user) => {
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    document.querySelector('[data-tab="hesap"]').click();
    profileModal.classList.remove('hidden');
}
document.querySelectorAll('.profile-tab-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.profile-tab-button').forEach(b => { b.classList.remove('active', 'bg-purple-100', 'text-purple-700'); b.classList.add('text-gray-500', 'hover:bg-gray-200'); });
        e.currentTarget.classList.add('active', 'bg-purple-100', 'text-purple-700');
        const tab = e.currentTarget.dataset.tab;
        document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`tab-${tab}`).classList.remove('hidden');
    });
});
addListener('btnSaveName', async () => { const n=document.getElementById('profileDisplayName').value; if(n) { await updateProfile(auth.currentUser, {displayName:n}); window.location.reload(); } });
addListener('btnKopyala', () => { navigator.clipboard.writeText(document.getElementById('kocDavetKodu').value).then(()=>alert('Kopyalandı')); });

// Bildirim
function initNotifications(uid) {
    const btn = document.getElementById('btnHeaderNotifications');
    const drop = document.getElementById('coachNotificationDropdown');
    if(btn && drop) {
        btn.onclick = (e) => { e.stopPropagation(); drop.classList.toggle('hidden'); document.getElementById('headerNotificationDot').classList.add('hidden'); };
        document.addEventListener('click', (e) => { if(!drop.contains(e.target) && !btn.contains(e.target)) drop.classList.add('hidden'); });
    }
}

main();
