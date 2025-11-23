// =================================================================
// 0. HATA YAKALAMA
// =================================================================
window.addEventListener('error', function(e) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
    
    console.error("Global Hata:", e);
    // İsteğe bağlı: Hata mesajını ekrana basabilirsiniz
    // document.body.innerHTML += `<div style="position:fixed;top:0;left:0;background:red;color:white;padding:10px;z-index:9999">${e.message}</div>`;
});

// =================================================================
// 1. FİREBASE VE IMPORTLAR
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

// Modüller
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
        } else {
            window.location.href = 'login.html';
        }
    });
}

// =================================================================
// 3. NAVİGASYON
// =================================================================

function updateUIForLoggedInUser(user) {
    const displayName = user.displayName || "Koç";
    if(document.getElementById("userName")) document.getElementById("userName").textContent = displayName;
    if(document.getElementById("userEmail")) document.getElementById("userEmail").textContent = user.email;
    if(document.getElementById("userAvatar")) document.getElementById("userAvatar").textContent = displayName.substring(0,2).toUpperCase();

    // Profil Tıklama
    if(document.getElementById("userProfileArea")) {
        document.getElementById("userProfileArea").onclick = (e) => {
            e.preventDefault();
            closeMobileMenu();
            showProfileModal(user);
        };
    }

    // Çıkış
    if(document.getElementById("logoutButton")) {
        document.getElementById("logoutButton").onclick = () => signOut(auth).then(() => window.location.href = 'login.html');
    }

    // Linkler
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.id ? link.id.split('-')[1] : null;
            if (pageId) {
                navigateToPage(pageId);
                closeMobileMenu();
            }
        });
    });
}

// Mobil Menü
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('mobileOverlay');
const mobileBtn = document.getElementById('mobileMenuBtn'); // Eğer varsa (responsive tasarımda eklenebilir)

if(mobileBtn) {
    mobileBtn.onclick = () => {
        sidebar.classList.remove('sidebar-closed');
        sidebar.classList.add('sidebar-open');
        overlay.classList.remove('hidden');
    };
}
if(overlay) {
    overlay.onclick = closeMobileMenu;
}

function closeMobileMenu() {
    sidebar.classList.remove('sidebar-open');
    sidebar.classList.add('sidebar-closed');
    if(overlay) overlay.classList.add('hidden');
}

function navigateToPage(pageId) {
    cleanUpListeners();
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-700', 'font-semibold'));
    const activeLink = document.getElementById(`nav-${pageId}`);
    if(activeLink) activeLink.classList.add('bg-purple-50', 'text-purple-700', 'font-semibold');

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
// 4. MODAL KONTROLLERİ
// =================================================================

function addListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

// Kapatma
document.querySelectorAll('.close-modal-btn, #closeModalButton, #closeEditModalButton, #closeDenemeModalButton, #closeSoruModalButton, #closeHedefModalButton, #closeOdevModalButton, #closeRandevuModalButton, #closeTahsilatModalButton, #closeBorcModalButton, #closeProfileModalButton, #cancelModalButton, #cancelEditModalButton, #cancelDenemeModalButton, #cancelSoruModalButton, #cancelHedefModalButton, #cancelOdevModalButton, #cancelRandevuModalButton, #cancelTahsilatModalButton, #cancelBorcModalButton').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.fixed');
        if(modal) modal.style.display = 'none';
    });
});

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

// Global Window Fonksiyonları
window.renderOgrenciDetaySayfasi = (id, name) => renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);
window.showProfileModal = (user) => showProfileModal(user);

// Profil Modalı
function showProfileModal(user) {
    const m = document.getElementById("profileModal");
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    document.querySelector('[data-tab="hesap"]').click();
    m.style.display = 'block';
}
document.querySelectorAll('.profile-tab-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.profile-tab-button').forEach(b => { b.classList.remove('active', 'bg-purple-100', 'text-purple-700'); b.classList.add('text-gray-500'); });
        e.currentTarget.classList.add('active', 'bg-purple-100', 'text-purple-700');
        const tab = e.currentTarget.dataset.tab;
        document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`tab-${tab}`).classList.remove('hidden');
    });
});

// Profil İşlemleri
addListener('btnSaveName', 'click', async () => {
    const n = document.getElementById('profileDisplayName').value;
    if(n) { await updateProfile(auth.currentUser, {displayName: n}); alert('Kaydedildi'); window.location.reload(); }
});
addListener('btnResetPassword', 'click', async () => {
    try { await sendPasswordResetEmail(auth, auth.currentUser.email); alert('E-posta gönderildi'); } catch(e) { alert(e.message); }
});
addListener('btnKopyala', 'click', () => {
    navigator.clipboard.writeText(document.getElementById('kocDavetKodu').value);
    alert('Kopyalandı');
});

main();
