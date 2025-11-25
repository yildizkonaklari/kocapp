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

// Modül Importları
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
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('appContainer').classList.remove('hidden');
            updateUIForLoggedInUser(user);
            navigateToPage('anasayfa');
            initNotifications();
        } else { window.location.href = 'login.html'; }
    });
}
function updateUIForLoggedInUser(user) {
    const n = user.displayName || "Koç"; const i = n.substring(0, 2).toUpperCase();
    if(document.getElementById("userName")) document.getElementById("userName").textContent = n;
    if(document.getElementById("userEmail")) document.getElementById("userEmail").textContent = user.email;
    if(document.getElementById("userAvatar")) document.getElementById("userAvatar").textContent = i;
    const pa = document.getElementById("userProfileArea"); if(pa) pa.onclick = (e) => { e.preventDefault(); closeMobileMenu(); showProfileModal(user); };
    const lo = document.getElementById("logoutButton"); if(lo) lo.onclick = () => signOut(auth).then(() => window.location.href = 'login.html');
    document.querySelectorAll('.nav-link, .bottom-nav-btn').forEach(l => l.addEventListener('click', (e) => {
        if (l.id !== 'mobileMenuBtn' && !l.classList.contains('mobile-menu-trigger')) { e.preventDefault(); const p = l.dataset.page || (l.id ? l.id.split('-')[1] : null); if (p) { navigateToPage(p); closeMobileMenu(); } }
    }));
}
const sidebar = document.getElementById('sidebar'); const overlay = document.getElementById('mobileOverlay'); const mobileBtn = document.getElementById('mobileMenuBtn');
if(mobileBtn) mobileBtn.onclick = () => { sidebar.classList.remove('sidebar-closed'); sidebar.classList.add('sidebar-open'); overlay.classList.remove('hidden'); };
if(overlay) overlay.onclick = closeMobileMenu;
function closeMobileMenu() { sidebar.classList.remove('sidebar-open'); sidebar.classList.add('sidebar-closed'); overlay.classList.add('hidden'); }
function navigateToPage(pageId) {
    cleanUpListeners();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-700', 'font-semibold'));
    const al = document.getElementById(`nav-${pageId}`); if(al) al.classList.add('bg-purple-50', 'text-purple-700', 'font-semibold');
    document.querySelectorAll('.bottom-nav-btn').forEach(l => { l.classList.remove('active', 'text-purple-600'); l.classList.add('text-gray-500'); });
    const bl = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`); if(bl) { bl.classList.add('active', 'text-purple-600'); bl.classList.remove('text-gray-500'); }
    try {
        if(pageId === 'anasayfa') renderAnaSayfa(db, currentUserId, appId);
        else if(pageId === 'ogrencilerim') renderOgrenciSayfasi(db, currentUserId, appId);
        else if(pageId === 'ajandam') renderAjandaSayfasi(db, currentUserId, appId);
        else if(pageId === 'muhasebe') renderMuhasebeSayfasi(db, currentUserId, appId);
        else if(pageId === 'mesajlar') renderMesajlarSayfasi(db, currentUserId, appId);
        else if(pageId === 'denemeler') renderDenemelerSayfasi(db, currentUserId, appId);
        else if(pageId === 'sorutakibi') renderSoruTakibiSayfasi(db, currentUserId, appId);
        else if(pageId === 'hedefler') renderHedeflerSayfasi(db, currentUserId, appId);
        else if(pageId === 'odevler') renderOdevlerSayfasi(db, currentUserId, appId);
        else renderPlaceholderSayfasi(pageId);
    } catch (e) { console.error(e); }
}
// BİLDİRİMLER
function initNotifications(uid) {
    const list = document.getElementById('coachNotificationList');
    const dot = document.getElementById('coachNotificationDot');
    const dropdown = document.getElementById('coachNotificationDropdown');
    const btn = document.getElementById('btnHeaderNotifications');
    
    // Dropdown Toggle
    if(btn) btn.onclick = (e) => { 
        e.stopPropagation(); 
        dropdown.classList.toggle('hidden'); 
        dropdown.classList.toggle('scale-95'); // Animasyon için
        dropdown.classList.toggle('opacity-0');
        dot.classList.add('hidden'); 
    };
    document.addEventListener('click', (e) => { if(!dropdown.contains(e.target) && !btn.contains(e.target)) dropdown.classList.add('hidden'); });

    // 1 Gün Sonrasına Randevular
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tStr = tomorrow.toISOString().split('T')[0];
    
    // Dinleyici
    onSnapshot(query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("tarih", "==", tStr)), (snap) => {
        let html = '';
        if(!snap.empty) {
            snap.forEach(d => html += `<div class="p-3 border-b hover:bg-purple-50 cursor-pointer"><p class="text-xs font-bold text-purple-700">Yarınki Randevu</p><p class="text-xs text-gray-600">${d.data().baslangic} - ${d.data().ogrenciAd}</p></div>`);
            list.innerHTML = html;
            dot.classList.remove('hidden');
        } else {
            list.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">Yeni bildirim yok.</p>';
        }
    });
}

// MESAJLAR İKONU
if(document.getElementById('btnHeaderMessages')) {
    document.getElementById('btnHeaderMessages').onclick = () => navigateToPage('mesajlar');
}
// =================================================================
// 4. MODAL KONTROLLERİ (YENİLENMİŞ KAPATMA MANTIĞI)
// =================================================================

// 1. Ortak Kapatma (Class-Based) - EN ÖNEMLİ KISIM
document.addEventListener('click', (e) => {
    // .js-modal-close sınıfına sahip bir elemente veya onun içine tıklandıysa
    if (e.target.classList.contains('js-modal-close') || e.target.closest('.js-modal-close')) {
        e.preventDefault();
        const modal = e.target.closest('.fixed'); // Butonun içinde bulunduğu modalı bul
        if (modal) {
            modal.classList.add('hidden'); // Gizle
            modal.style.display = ''; // Inline stili temizle (flex vb.)
        }
    }
});

// 2. Açma Fonksiyonu (Global)
window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // Flexbox düzenini koru
    }
};

// 3. Randevu Özel Açma
window.openRandevuModal = async () => {
    await populateStudentSelect('randevuStudentId');
    openModal('addRandevuModal');
};

// 4. Profil Modalı
const profileModal = document.getElementById("profileModal");
function showProfileModal(user) {
    if (!profileModal) return;
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    document.querySelector('[data-tab="hesap"]').click();
    profileModal.classList.remove('hidden');
    profileModal.style.display = 'flex'; // Görünür yap
}
window.showProfileModal = showProfileModal;

// Kayıt Listenerları (Helpers)
function addListener(id, handler) { const el = document.getElementById(id); if (el) el.onclick = handler; }
addListener('saveStudentButton', () => saveNewStudent(db, currentUserId, appId));
addListener('saveStudentChangesButton', () => saveStudentChanges(db, currentUserId, appId));
document.getElementById('studentClass')?.addEventListener('change', (e) => renderDersSecimi(e.target.value, document.getElementById('studentDersSecimiContainer')));
document.getElementById('editStudentClass')?.addEventListener('change', (e) => renderDersSecimi(e.target.value, document.getElementById('editStudentDersSecimiContainer')));
addListener('saveDenemeButton', () => saveGlobalDeneme(db, currentUserId, appId));
document.getElementById('denemeTuru')?.addEventListener('change', (e) => renderDenemeNetInputs(e.target.value));
addListener('saveSoruButton', () => saveGlobalSoru(db, currentUserId, appId));
addListener('saveHedefButton', () => saveGlobalHedef(db, currentUserId, appId));
addListener('saveOdevButton', () => saveGlobalOdev(db, currentUserId, appId));
addListener('saveRandevuButton', () => saveNewRandevu(db, currentUserId, appId));
addListener('saveTahsilatButton', () => saveNewTahsilat(db, currentUserId, appId));
addListener('saveBorcButton', () => saveNewBorc(db, currentUserId, appId));

// Tab Geçişleri
document.querySelectorAll('.profile-tab-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.profile-tab-button').forEach(b => { b.classList.remove('active', 'bg-purple-100', 'text-purple-700'); b.classList.add('text-gray-500', 'hover:bg-gray-200'); });
        e.currentTarget.classList.add('active', 'bg-purple-100', 'text-purple-700');
        const tabId = e.currentTarget.dataset.tab;
        document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    });
});
addListener('btnSaveName', async () => { const n = document.getElementById('profileDisplayName').value.trim(); if (n) { await updateProfile(auth.currentUser, { displayName: n }); alert("Güncellendi."); window.location.reload(); } });
addListener('btnResetPassword', async () => { try { await sendPasswordResetEmail(auth, auth.currentUser.email); alert("E-posta gönderildi."); } catch (e) { alert(e.message); } });
addListener('btnDeleteAccount', async () => {
    const p = document.getElementById('deleteConfirmPassword').value; if (!p) return alert("Şifre girin."); if (!confirm("Silinsin mi?")) return;
    try { const c = EmailAuthProvider.credential(auth.currentUser.email, p); await reauthenticateWithCredential(auth.currentUser, c); await deleteUser(auth.currentUser); window.location.href = "login.html"; } catch (e) { alert(e.message); }
});
addListener('btnKopyala', () => { const i = document.getElementById('kocDavetKodu'); i.select(); navigator.clipboard.writeText(i.value).then(() => alert("Kopyalandı!")); });
function initNotifications() { /* Bildirim */ }
window.renderOgrenciDetaySayfasi = (id, name) => renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);

main();
