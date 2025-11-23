// =================================================================
// 0. HATA YAKALAMA (Sistem Yükleniyor Sorunu İçin)
// =================================================================
window.addEventListener('error', function(e) {
    const spinner = document.getElementById('loadingSpinner');
    
    // Hata olursa yükleme ekranını gizle ve hatayı göster
    if (spinner) spinner.style.display = 'none';
    
    const appContainer = document.getElementById('appContainer');
    // Hatayı görebilmek için app container'ı gizle veya üstüne bas
    
    // Ekrana Hata Bas
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:20px; border-left: 5px solid red; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 9999; max-width:80%; font-family: monospace;';
    errorDiv.innerHTML = `
        <h3 style="color:#dc2626; margin-top:0;">Uygulama Başlatılamadı</h3>
        <p style="color:#4b5563;">Lütfen aşağıdaki hatayı geliştiriciye bildirin:</p>
        <div style="background:#f3f4f6; padding:10px; border-radius:4px; color:#ef4444; margin-top:10px; overflow:auto;">
            ${e.message}<br>
            <small style="color:#6b7280;">${e.filename}:${e.lineno}</small>
        </div>
        <button onclick="location.reload()" style="margin-top:15px; padding:8px 16px; background:#dc2626; color:white; border:none; border-radius:4px; cursor:pointer;">Sayfayı Yenile</button>
    `;
    document.body.appendChild(errorDiv);
    
    console.error("Global Hata:", e);
});

// =================================================================
// 1. FİREBASE KÜTÜPHANELERİ
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signOut, updateProfile, 
    EmailAuthProvider, reauthenticateWithCredential, deleteUser, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, 
    collection, query, where, orderBy, 
    onSnapshot, getDocs, serverTimestamp, writeBatch 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 

// =================================================================
// 2. MODÜL IMPORTLARI
// =================================================================
import { 
    cleanUpListeners, populateStudentSelect, renderDersSecimi, renderPlaceholderSayfasi 
} from './modules/helpers.js';

import { renderAnaSayfa } from './modules/anasayfa.js';

import { 
    renderOgrenciSayfasi, 
    renderOgrenciDetaySayfasi, 
    saveNewStudent, 
    saveStudentChanges
} from './modules/ogrencilerim.js';

import { renderAjandaSayfasi, saveNewRandevu } from './modules/ajanda.js';
import { renderMuhasebeSayfasi, saveNewBorc, saveNewTahsilat } from './modules/muhasebe.js';
import { renderMesajlarSayfasi } from './modules/mesajlar.js';

// Global Fonksiyonlar
import { renderDenemelerSayfasi, saveGlobalDeneme, renderDenemeNetInputs } from './modules/denemeler.js';
import { renderSoruTakibiSayfasi, saveGlobalSoru } from './modules/sorutakibi.js';
import { renderHedeflerSayfasi, saveGlobalHedef } from './modules/hedefler.js';
import { renderOdevlerSayfasi, saveGlobalOdev } from './modules/odevler.js';

// =================================================================
// 3. FİREBASE AYARLARI
// =================================================================
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

// =================================================================
// 4. GLOBAL DEĞİŞKENLER
// =================================================================
let currentUserId = null;

const loadingSpinner = document.getElementById("loadingSpinner");
const appContainer = document.getElementById("appContainer");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");

// Global Erişimler (HTML onclick için)
window.renderOgrenciDetaySayfasi = (id, name) => {
    renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);
};
window.showProfileModal = (user) => showProfileModal(user);

// =================================================================
// 2. BAŞLATMA (MAIN)
// =================================================================
async function main() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('appContainer').classList.remove('hidden');
            updateUIForLoggedInUser(user);
            navigateToPage('anasayfa');
            initNotifications(); // Bildirimleri Başlat
        } else {
            window.location.href = 'login.html';
        }
    });
}

// =================================================================
// 3. NAVİGASYON & MOBİL MENÜ
// =================================================================

function updateUIForLoggedInUser(user) {
    const displayName = user.displayName || "Koç";
    const initials = displayName.substring(0, 2).toUpperCase();

    // Header & Sidebar Profil
    ['userName', 'userNameDesktop'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).textContent = displayName; });
    ['userEmail', 'userEmailDesktop'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).textContent = user.email; });
    ['userAvatar', 'userAvatarDesktop', 'headerAvatar'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).textContent = initials; });
    if(document.getElementById('headerName')) document.getElementById('headerName').textContent = displayName;

    // Profil Modalı Bağlantıları
    document.querySelectorAll('#userProfileArea, #userProfileAreaDesktop, #headerCoachProfile, #btnMobileProfile').forEach(el => {
        if(el) el.onclick = () => {
            closeMobileMenu();
            showProfileModal(user);
        };
    });

    // Çıkış
    const logout = () => signOut(auth).then(() => window.location.href = 'login.html');
    document.querySelectorAll('#logoutButton, #btnMobileLogout').forEach(btn => { if(btn) btn.onclick = logout; });

    // Sayfa Yönlendirme (Desktop & Mobile)
    document.querySelectorAll('.nav-link, .mobile-drawer-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page || (link.id ? link.id.split('-')[1] : null);
            if (page) {
                navigateToPage(page);
                closeMobileMenu();
            }
        });
    });
}

// Mobil Menü (Drawer) Kontrolü
const drawer = document.getElementById('sidebar'); // Mobilde sidebar'ı drawer olarak kullanıyoruz
const overlay = document.getElementById('mobileOverlay');
const btnMenu = document.getElementById('mobileMenuBtn');

function toggleMobileMenu() {
    drawer.classList.toggle('sidebar-closed');
    drawer.classList.toggle('sidebar-open');
    overlay.classList.toggle('hidden');
    overlay.classList.toggle('opacity-0');
}

function closeMobileMenu() {
    drawer.classList.add('sidebar-closed');
    drawer.classList.remove('sidebar-open');
    overlay.classList.add('hidden', 'opacity-0');
}

if(btnMenu) btnMenu.onclick = toggleMobileMenu;
if(overlay) overlay.onclick = closeMobileMenu;


function navigateToPage(pageId) {
    cleanUpListeners();
    
    // Aktif Link Stili
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-700', 'font-bold'));
    const activeLinks = document.querySelectorAll(`[data-page="${pageId}"], #nav-${pageId}`);
    activeLinks.forEach(l => l.classList.add('bg-purple-50', 'text-purple-700', 'font-bold'));

    try {
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
    } catch (err) { console.error(err); }
}

// =================================================================
// 4. BİLDİRİM VE MESAJLAR
// =================================================================

function initNotifications() {
    // 1. Mesaj İkonu -> Sayfaya Git
    const btnMsg = document.getElementById('btnHeaderMessages');
    if(btnMsg) {
        btnMsg.onclick = () => navigateToPage('mesajlar');
        // Okunmamış Sayısı
        onSnapshot(query(collectionGroup(db, 'mesajlar'), where('kocId', '==', currentUserId), where('gonderen', '==', 'ogrenci'), where('okundu', '==', false)), (snap) => {
            const b = document.getElementById('headerUnreadMsgCount');
            if(snap.size > 0) { b.textContent = snap.size; b.classList.remove('hidden'); } else b.classList.add('hidden');
        });
    }

    // 2. Bildirim İkonu -> Dropdown
    const btnNotif = document.getElementById('btnHeaderNotifications');
    const dropNotif = document.getElementById('coachNotificationDropdown');
    if(btnNotif && dropNotif) {
        btnNotif.onclick = (e) => { e.stopPropagation(); dropNotif.classList.toggle('hidden'); document.getElementById('coachNotificationDot').classList.add('hidden'); };
        document.getElementById('btnCloseCoachNotifications').onclick = () => dropNotif.classList.add('hidden');
        document.addEventListener('click', (e) => { if(!dropNotif.contains(e.target) && !btnNotif.contains(e.target)) dropNotif.classList.add('hidden'); });

        // Bildirimleri Çek (Örn: Onay Bekleyenler)
        onSnapshot(query(collectionGroup(db, 'denemeler'), where('kocId', '==', currentUserId), where('onayDurumu', '==', 'bekliyor'), limit(5)), (snap) => {
            const list = document.getElementById('coachNotificationList');
            let html = '';
            snap.forEach(doc => {
                const d = doc.data();
                html += `<div class="p-3 border-b hover:bg-gray-50 cursor-pointer" onclick="navigateToPage('denemeler')"><p class="text-xs font-bold text-gray-700">Onay Bekleyen Deneme</p><p class="text-xs text-gray-500">${d.studentAd} - ${d.ad}</p></div>`;
            });
            list.innerHTML = html || '<p class="text-center text-gray-400 text-xs py-4">Bildirim yok.</p>';
            if(!snap.empty) document.getElementById('coachNotificationDot').classList.remove('hidden');
        });
    }
}

// =================================================================
// 5. MODAL VE PROFİL İŞLEMLERİ (YASAL SEKME DAHİL)
// =================================================================

function addListener(id, event, handler) { const el = document.getElementById(id); if (el) el.addEventListener(event, handler); }

// Modal Kapatıcılar
document.querySelectorAll('.close-modal-btn, #closeModalButton, #cancelModalButton, #closeEditModalButton, #cancelEditModalButton, #closeDenemeModalButton, #cancelDenemeModalButton, #closeSoruModalButton, #cancelSoruModalButton, #closeHedefModalButton, #cancelHedefModalButton, #closeOdevModalButton, #cancelOdevModalButton, #closeRandevuModalButton, #cancelRandevuModalButton, #closeTahsilatModalButton, #cancelTahsilatModalButton, #closeBorcModalButton, #cancelBorcModalButton').forEach(btn => {
    btn.addEventListener('click', (e) => e.target.closest('.fixed').style.display = 'none');
});

// Modüllerdeki Save Butonları
addListener('saveStudentButton', 'click', () => saveNewStudent(db, currentUserId, appId));
addListener('saveStudentChangesButton', 'click', () => saveStudentChanges(db, currentUserId, appId));
addListener('studentClass', 'change', (e) => renderDersSecimi(e.target.value, document.getElementById('studentDersSecimiContainer')));
addListener('saveDenemeButton', 'click', () => saveGlobalDeneme(db, currentUserId, appId));
addListener('denemeTuru', 'change', (e) => renderDenemeNetInputs(e.target.value));
addListener('saveSoruButton', 'click', () => saveGlobalSoru(db, currentUserId, appId));
addListener('saveHedefButton', 'click', () => saveGlobalHedef(db, currentUserId, appId));
addListener('saveOdevButton', 'click', () => saveGlobalOdev(db, currentUserId, appId));
addListener('saveRandevuButton', 'click', () => saveNewRandevu(db, currentUserId, appId));
addListener('saveTahsilatButton', 'click', () => saveNewTahsilat(db, currentUserId, appId));
addListener('saveBorcButton', 'click', () => saveNewBorc(db, currentUserId, appId));

// PROFİL MODALI VE TABLARI
const profileModal = document.getElementById("profileModal");
if(profileModal) {
    document.getElementById('closeProfileModalButton').onclick = () => profileModal.style.display = 'none';
    
    // Tab Geçişi (Hesap <-> Yasal)
    document.querySelectorAll('.profile-tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.profile-tab-button').forEach(b => {
                b.classList.remove('active', 'bg-purple-100', 'text-purple-700');
                b.classList.add('text-gray-500', 'hover:bg-gray-200');
            });
            e.currentTarget.classList.add('active', 'bg-purple-100', 'text-purple-700');
            
            const tabId = e.currentTarget.dataset.tab;
            document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        });
    });
}

window.showProfileModal = (user) => {
    if (!profileModal) return;
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    // Varsayılan olarak Hesap tabını aç
    document.querySelector('[data-tab="hesap"]').click();
    profileModal.style.display = 'block';
}

addListener('btnSaveName', 'click', async () => {
    const n = document.getElementById('profileDisplayName').value;
    if(n) { await updateProfile(auth.currentUser, {displayName: n}); alert('Kaydedildi'); window.location.reload(); }
});
addListener('btnKopyala', 'click', () => {
    navigator.clipboard.writeText(document.getElementById('kocDavetKodu').value).then(()=>alert('Kopyalandı'));
});

main();
