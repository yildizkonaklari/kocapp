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

// --- MODÜL IMPORTLARI ---
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
            
        } else {
            window.location.href = 'login.html';
        }
    });
}

// =================================================================
// 3. KULLANICI ARAYÜZÜ VE PROFİL
// =================================================================

function updateUIForLoggedInUser(user) {
    const displayName = user.displayName || "Koç";
    const initials = displayName.substring(0, 2).toUpperCase();

    // Sidebar & Header
    const userNameEl = document.getElementById("userName");
    const userEmailEl = document.getElementById("userEmail");
    const userAvatarEl = document.getElementById("userAvatar");
    const headerName = document.getElementById("headerName"); // Mobilde başlık olarak kullanılabilir

    if (userNameEl) userNameEl.textContent = displayName;
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userAvatarEl) userAvatarEl.textContent = initials;

    // Profil Tıklama
    const profileArea = document.getElementById("userProfileArea");
    if (profileArea) {
        profileArea.onclick = (e) => {
            e.preventDefault();
            closeMobileMenu();
            showProfileModal(user);
        };
    }

    // Çıkış
    const btnLogout = document.getElementById("logoutButton");
    if (btnLogout) {
        btnLogout.onclick = () => signOut(auth).then(() => window.location.href = 'login.html');
    }

    // Navigasyon
    document.querySelectorAll('.nav-link, .bottom-nav-btn').forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.id !== 'mobileMenuBtn' && !link.classList.contains('mobile-menu-trigger')) {
                e.preventDefault();
                const page = link.dataset.page || (link.id ? link.id.split('-')[1] : null);
                if (page) {
                    navigateToPage(page);
                    closeMobileMenu();
                }
            }
        });
    });
}

// Profil Modalı
function showProfileModal(user) {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    document.getElementById('deleteConfirmPassword').value = '';
    document.getElementById('profileError').classList.add('hidden');

    const tabBtn = document.querySelector('.profile-tab-button[data-tab="hesap"]');
    if(tabBtn) tabBtn.click();
    
    modal.classList.remove('hidden');
}

// Modal & Tab İşlemleri
const profileModal = document.getElementById("profileModal");
if(profileModal) {
    document.getElementById('closeProfileModalButton').onclick = () => profileModal.classList.add('hidden');

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
}

// Profil Butonları
function addListener(id, event, handler) { const el = document.getElementById(id); if (el) el.addEventListener(event, handler); }

addListener('btnSaveName', 'click', async () => {
    const n = document.getElementById('profileDisplayName').value.trim();
    if (!n) return;
    await updateProfile(auth.currentUser, { displayName: n });
    alert("Güncellendi."); window.location.reload();
});
addListener('btnResetPassword', 'click', async () => {
    await sendPasswordResetEmail(auth, auth.currentUser.email);
    alert("E-posta gönderildi.");
});
addListener('btnDeleteAccount', 'click', async () => {
    const p = document.getElementById('deleteConfirmPassword').value;
    if (!p) return alert("Şifre girin.");
    const c = EmailAuthProvider.credential(auth.currentUser.email, p);
    await reauthenticateWithCredential(auth.currentUser, c);
    await deleteUser(auth.currentUser);
    window.location.href = "login.html";
});
addListener('btnKopyala', 'click', () => {
    navigator.clipboard.writeText(document.getElementById('kocDavetKodu').value);
    alert("Kopyalandı");
});


// =================================================================
// 4. NAVİGASYON VE MOBİL MENÜ
// =================================================================

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('mobileOverlay');
const btnMenu = document.getElementById('mobileMenuBtn');

if(btnMenu) btnMenu.onclick = () => {
    sidebar.classList.remove('sidebar-closed');
    sidebar.classList.add('sidebar-open');
    overlay.classList.remove('hidden');
};
if(overlay) overlay.onclick = closeMobileMenu;

function closeMobileMenu() {
    sidebar.classList.remove('sidebar-open');
    sidebar.classList.add('sidebar-closed');
    overlay.classList.add('hidden');
}

function navigateToPage(pageId) {
    cleanUpListeners(); 
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-700', 'font-semibold'));
    const activeLink = document.getElementById(`nav-${pageId}`);
    if(activeLink) activeLink.classList.add('bg-purple-50', 'text-purple-700', 'font-semibold');
    
    document.querySelectorAll('.bottom-nav-btn').forEach(l => {
        l.classList.remove('active', 'text-purple-600');
        l.classList.add('text-gray-500');
    });
    const bottomLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if(bottomLink) {
        bottomLink.classList.add('active', 'text-purple-600');
        bottomLink.classList.remove('text-gray-500');
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
    } catch (err) {
        console.error(err);
        alert("Sayfa yükleme hatası: " + err.message);
    }
}

// =================================================================
// 5. MODAL KONTROLLERİ
// =================================================================

// Kapatma
document.querySelectorAll('.close-modal-btn, #closeModalButton, #closeEditModalButton, #closeDenemeModalButton, #closeSoruModalButton, #closeHedefModalButton, #closeOdevModalButton, #closeRandevuModalButton, #closeTahsilatModalButton, #closeBorcModalButton, #closeProfileModalButton, #cancelModalButton, #cancelEditModalButton, #cancelDenemeModalButton, #cancelSoruModalButton, #cancelHedefModalButton, #cancelOdevModalButton, #cancelRandevuModalButton, #cancelTahsilatModalButton, #cancelBorcModalButton').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.fixed');
        if(modal) modal.style.display = 'none'; // veya classList.add('hidden') - stilinize göre
        // index.html'de "hidden" classı kullanıyorsak:
        if(modal) modal.classList.add('hidden');
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

// Window Helper
window.renderOgrenciDetaySayfasi = (id, name) => renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);

// BAŞLAT
main();
