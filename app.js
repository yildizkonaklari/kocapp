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
import { 
    getAuth, onAuthStateChanged, signOut, updateProfile, 
    EmailAuthProvider, reauthenticateWithCredential, deleteUser, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, 
    collection, collectionGroup, query, where, orderBy, 
    onSnapshot, getDocs, serverTimestamp, writeBatch, limit 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 

// Modül Importları (Eksiksiz)
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
            
            const spinner = document.getElementById('loadingSpinner');
            if(spinner) spinner.style.display = 'none';
            
            const container = document.getElementById('appContainer');
            if(container) container.classList.remove('hidden');
            
            updateUIForLoggedInUser(user);
            navigateToPage('anasayfa');
            
        } else {
            window.location.href = 'login.html';
        }
    });
}

// =================================================================
// 3. UI & NAVİGASYON
// =================================================================

function updateUIForLoggedInUser(user) {
    // ... (Kullanıcı bilgileri doldurma aynı) ...
    const displayName = user.displayName || "Koç";
    if(document.getElementById("userName")) document.getElementById("userName").textContent = displayName;
    
    // Masaüstü Profil Tıklama
    if(document.getElementById("userProfileArea")) {
        document.getElementById("userProfileArea").onclick = () => showProfileModal(user);
    }
    
    // MOBİL MENÜDEKİ PROFİL TIKLAMA (DÜZELTME)
    const mobileProfileBtn = document.getElementById("btnMobileProfile");
    if(mobileProfileBtn) {
        mobileProfileBtn.onclick = () => {
            closeMobileMenu();
            showProfileModal(user);
        };
    }

    // Çıkış
    const handleLogout = () => signOut(auth).then(() => window.location.href = 'login.html');
    if(document.getElementById("logoutButton")) document.getElementById("logoutButton").onclick = handleLogout;
    if(document.getElementById("btnMobileLogout")) document.getElementById("btnMobileLogout").onclick = handleLogout;

    // Navigasyon Linkleri
    document.querySelectorAll('.nav-link, .bottom-nav-btn, .mobile-drawer-link').forEach(link => {
        link.addEventListener('click', (e) => {
            // Menü Açma Butonu İse İşlem Yapma (Aşağıda tanımlı)
            if (link.id === 'btnToggleMobileMenu') return;

            e.preventDefault();
            const page = link.dataset.page || (link.id ? link.id.split('-')[1] : null);
            if (page) {
                navigateToPage(page);
                closeMobileMenu(); // Mobilde menüden tıklandıysa kapat
            }
        });
    });
}

// MOBİL MENÜ (DRAWER) KONTROLLERİ
const drawer = document.getElementById('mobileMenuDrawer');
const overlay = document.getElementById('mobileOverlay');
const btnMenuToggle = document.getElementById('btnToggleMobileMenu');
const btnCloseDrawer = document.getElementById('btnCloseMobileMenu');

function openMobileMenu() {
    drawer.classList.remove('translate-x-full');
    drawer.classList.add('translate-x-0');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10);
}

function closeMobileMenu() {
    drawer.classList.add('translate-x-full');
    drawer.classList.remove('translate-x-0');
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

if(btnMenuToggle) btnMenuToggle.onclick = openMobileMenu;
if(btnCloseDrawer) btnCloseDrawer.onclick = closeMobileMenu;
if(overlay) overlay.onclick = closeMobileMenu;


// SAYFA YÖNLENDİRME
function navigateToPage(pageId) {
    cleanUpListeners(); 
    
    // Link Stilleri (Sıfırla ve Aktif Yap)
    document.querySelectorAll('.nav-link, .mobile-drawer-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-700', 'font-bold'));
    const activeLinks = document.querySelectorAll(`[data-page="${pageId}"], #nav-${pageId}`);
    activeLinks.forEach(l => l.classList.add('bg-purple-50', 'text-purple-700', 'font-bold'));

    // Alt Menü Stilleri
    document.querySelectorAll('.bottom-nav-btn').forEach(l => {
        l.classList.remove('active', 'text-purple-600');
        l.classList.add('text-gray-500');
        const icon = l.querySelector('.bottom-nav-center-btn');
        if(icon) { icon.classList.remove('bg-purple-600', 'text-white'); icon.classList.add('bg-indigo-600', 'text-white'); }
    });
    const bottomLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if(bottomLink) {
        bottomLink.classList.add('active', 'text-purple-600');
        bottomLink.classList.remove('text-gray-500');
        // Orta butonsa rengini değiştir
        const icon = bottomLink.querySelector('.bottom-nav-center-btn');
        if(icon) icon.classList.replace('bg-indigo-600', 'bg-purple-600');
    }

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
            default: renderPlaceholderSayfasi("Sayfa Bulunamadı"); break;
        }
    } catch (err) { console.error(err); }
}


// =================================================================
// 4. MODAL KONTROLLERİ (KAYIT İŞLEMLERİ)
// =================================================================

function addListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

// Kapatma Butonları (Genel)
document.querySelectorAll('.close-modal-btn, #closeModalButton, #closeEditModalButton, #closeDenemeModalButton, #closeSoruModalButton, #closeHedefModalButton, #closeOdevModalButton, #closeRandevuModalButton, #closeTahsilatModalButton, #closeBorcModalButton, #closeProfileModalButton, #cancelModalButton, #cancelEditModalButton, #cancelDenemeModalButton, #cancelSoruModalButton, #cancelHedefModalButton, #cancelOdevModalButton, #cancelRandevuModalButton, #cancelTahsilatModalButton, #cancelBorcModalButton').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.fixed');
        if(modal) modal.style.display = 'none';
    });
});

// --- KAYIT BUTONLARI ---
// Öğrenci
addListener('saveStudentButton', 'click', () => saveNewStudent(db, currentUserId, appId));
addListener('saveStudentChangesButton', 'click', () => saveStudentChanges(db, currentUserId, appId));
addListener('studentClass', 'change', (e) => renderDersSecimi(e.target.value, document.getElementById('studentDersSecimiContainer')));
addListener('editStudentClass', 'change', (e) => renderDersSecimi(e.target.value, document.getElementById('editStudentDersSecimiContainer')));

// Deneme
addListener('saveDenemeButton', 'click', () => saveGlobalDeneme(db, currentUserId, appId));
addListener('denemeTuru', 'change', (e) => renderDenemeNetInputs(e.target.value));

// Soru Takibi
addListener('saveSoruButton', 'click', () => saveGlobalSoru(db, currentUserId, appId));

// Hedef & Ödev
addListener('saveHedefButton', 'click', () => saveGlobalHedef(db, currentUserId, appId));
addListener('saveOdevButton', 'click', () => saveGlobalOdev(db, currentUserId, appId));

// Randevu
addListener('saveRandevuButton', 'click', () => saveNewRandevu(db, currentUserId, appId));

// Muhasebe
addListener('saveTahsilatButton', 'click', () => saveNewTahsilat(db, currentUserId, appId));
addListener('saveBorcButton', 'click', () => saveNewBorc(db, currentUserId, appId));


// --- PROFİL MODALI ---
const profileModal = document.getElementById("profileModal");

function showProfileModal(user) {
    if (!profileModal) return;
    
    // Bilgileri Doldur
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    document.getElementById('deleteConfirmPassword').value = '';
    const err = document.getElementById('profileError');
    if(err) err.classList.add('hidden');

    // Varsayılan sekmeyi aç
    const tabBtn = document.querySelector('.profile-tab-button[data-tab="hesap"]');
    if(tabBtn) tabBtn.click();
    
    profileModal.classList.remove('hidden');
}

// Tab Geçişleri
document.querySelectorAll('.profile-tab-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.profile-tab-button').forEach(b => {
            b.classList.remove('active', 'bg-purple-100', 'text-purple-700');
            b.classList.add('text-gray-500', 'hover:bg-gray-200');
        });
        e.currentTarget.classList.add('active', 'bg-purple-100', 'text-purple-700');
        e.currentTarget.classList.remove('text-gray-500', 'hover:bg-gray-200');
        
        const tabId = e.currentTarget.dataset.tab;
        document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    });
});

// Profil İşlemleri
addListener('btnSaveName', 'click', async () => {
    const n = document.getElementById('profileDisplayName').value.trim();
    if (!n) return;
    await updateProfile(auth.currentUser, { displayName: n });
    alert("Güncellendi."); window.location.reload();
});
addListener('btnResetPassword', 'click', async () => {
    try {
        await sendPasswordResetEmail(auth, auth.currentUser.email);
        alert("E-posta gönderildi.");
    } catch (e) { alert("Hata: " + e.message); }
});
addListener('btnDeleteAccount', 'click', async () => {
    const p = document.getElementById('deleteConfirmPassword').value;
    if (!p) return alert("Şifre girin.");
    if (!confirm("Hesabınızı kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
        const c = EmailAuthProvider.credential(auth.currentUser.email, p);
        await reauthenticateWithCredential(auth.currentUser, c);
        await deleteUser(auth.currentUser);
        window.location.href = "login.html";
    } catch (e) { 
        const err = document.getElementById('profileError');
        if(err) { err.textContent = e.message; err.classList.remove('hidden'); } else alert(e.message);
    }
});
addListener('btnKopyala', 'click', () => {
    const input = document.getElementById('kocDavetKodu');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => alert("Kopyalandı!"));
});

// Global Helper (HTML onclick için)
window.renderOgrenciDetaySayfasi = (id, name) => renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);

// BAŞLAT
main();
