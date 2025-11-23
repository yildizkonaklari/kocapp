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

// Global Değişkenler
let currentUserId = null;

// =================================================================
// 2. BAŞLATMA (MAIN)
// =================================================================
async function main() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            
            // UI Hazırla
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('appContainer').classList.remove('hidden');
            
            // Kullanıcı Bilgilerini ve Sayfayı Yükle
            updateUIForLoggedInUser(user);
            navigateToPage('anasayfa');
            
        } else {
            window.location.href = 'login.html';
        }
    });
}

// =================================================================
// 3. KULLANICI ARAYÜZÜ VE PROFİL (DÜZELTİLDİ)
// =================================================================

function updateUIForLoggedInUser(user) {
    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : "Koç");
    const initials = displayName.substring(0, 2).toUpperCase();

    // Sidebar Profil Bilgileri (HTML'deki ID'lerle Eşleşmeli)
    const userNameEl = document.getElementById("userName");
    const userEmailEl = document.getElementById("userEmail");
    const userAvatarEl = document.getElementById("userAvatar");

    if (userNameEl) userNameEl.textContent = displayName;
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userAvatarEl) userAvatarEl.textContent = initials;

    // Profil Modalı Tıklama Olayı
    const profileArea = document.getElementById("userProfileArea");
    if (profileArea) {
        profileArea.onclick = (e) => {
            e.preventDefault();
            closeMobileMenu(); // Mobildeysek menüyü kapat
            showProfileModal(user);
        };
    }

    // Çıkış İşlemi
    const handleLogout = () => signOut(auth).then(() => window.location.href = 'login.html');
    const btnLogout = document.getElementById("logoutButton");
    if (btnLogout) btnLogout.onclick = handleLogout;

    // Navigasyon Linkleri
    document.querySelectorAll('.nav-link, .bottom-nav-btn').forEach(link => {
        link.addEventListener('click', (e) => {
            // Menü açma butonu değilse
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

// Profil Modalı Açma
function showProfileModal(user) {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    
    // Alanları Doldur
    const dispName = document.getElementById('profileDisplayName');
    const davetKodu = document.getElementById('kocDavetKodu');
    
    if(dispName) dispName.value = user.displayName || '';
    if(davetKodu) davetKodu.value = user.uid;
    
    document.getElementById('deleteConfirmPassword').value = '';
    const err = document.getElementById('profileError');
    if(err) err.classList.add('hidden');

    // Varsayılan sekmeyi aç
    const tabBtn = document.querySelector('.profile-tab-button[data-tab="hesap"]');
    if(tabBtn) tabBtn.click();
    
    modal.classList.remove('hidden');
}

// Profil Modal Kapatma ve Sekme Geçişleri
const profileModal = document.getElementById("profileModal");
if(profileModal) {
    const closeBtn = document.getElementById('closeProfileModalButton');
    if(closeBtn) closeBtn.onclick = () => profileModal.classList.add('hidden');

    // Sekme Geçişleri
    document.querySelectorAll('.profile-tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Stilleri Sıfırla
            document.querySelectorAll('.profile-tab-button').forEach(b => {
                b.classList.remove('active', 'bg-purple-100', 'text-purple-700');
                b.classList.add('text-gray-500', 'hover:bg-gray-200');
            });
            // Aktif Yap
            e.currentTarget.classList.add('active', 'bg-purple-100', 'text-purple-700');
            e.currentTarget.classList.remove('text-gray-500', 'hover:bg-gray-200');
            
            // İçeriği Göster
            const tabId = e.currentTarget.dataset.tab;
            document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        });
    });
}

// Profil İşlemleri (Event Listeners)
addListener('btnSaveName', 'click', async () => {
    const newName = document.getElementById('profileDisplayName').value.trim();
    const btn = document.getElementById('btnSaveName');
    if (!newName) return;
    btn.disabled = true; btn.textContent = "Kaydediliyor...";
    try {
        await updateProfile(auth.currentUser, { displayName: newName });
        alert("Profil güncellendi."); window.location.reload();
    } catch (e) { alert(e.message); } finally { btn.disabled = false; btn.textContent = "Kaydet"; }
});

addListener('btnResetPassword', 'click', async () => {
    try {
        await sendPasswordResetEmail(auth, auth.currentUser.email);
        alert("Şifre sıfırlama e-postası gönderildi.");
    } catch (e) { alert("Hata: " + e.message); }
});

addListener('btnDeleteAccount', 'click', async () => {
    const password = document.getElementById('deleteConfirmPassword').value;
    if (!password) return alert("Şifrenizi girin.");
    if (!confirm("Hesabınızı kalıcı olarak silmek istediğinize emin misiniz?")) return;

    try {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await deleteUser(auth.currentUser);
        alert("Hesap silindi."); window.location.href = "login.html";
    } catch (e) { 
        const err = document.getElementById('profileError');
        if(err) {
            err.textContent = e.message;
            err.classList.remove('hidden');
        } else alert(e.message);
    }
});

addListener('btnKopyala', 'click', () => {
    const input = document.getElementById('kocDavetKodu');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => alert("Kopyalandı!"));
});


// =================================================================
// 4. NAVİGASYON VE MOBİL MENÜ
// =================================================================

// Mobil Menü (Drawer) Kontrolü
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('mobileOverlay');
const btnMenu = document.getElementById('mobileMenuBtn');

function openMobileMenu() {
    if(sidebar) {
        sidebar.classList.remove('sidebar-closed');
        sidebar.classList.add('sidebar-open');
    }
    if(overlay) overlay.classList.remove('hidden');
}

function closeMobileMenu() {
    if(sidebar) {
        sidebar.classList.remove('sidebar-open');
        sidebar.classList.add('sidebar-closed');
    }
    if(overlay) overlay.classList.add('hidden');
}

if(btnMenu) btnMenu.onclick = openMobileMenu;
if(overlay) overlay.onclick = closeMobileMenu;

// Sayfa Yönlendirme
function navigateToPage(pageId) {
    cleanUpListeners(); // Eski dinleyicileri temizle
    
    // Link Stilleri
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'font-semibold'));
    const activeLinks = document.querySelectorAll(`[data-page="${pageId}"], #nav-${pageId}`);
    activeLinks.forEach(l => l.classList.add('active', 'bg-purple-100', 'text-purple-700', 'font-semibold'));

    // Mobil alt menü stilleri
    document.querySelectorAll('.bottom-nav-btn').forEach(l => {
        l.classList.remove('active', 'text-purple-600');
        l.classList.add('text-gray-500');
    });
    const bottomLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if (bottomLink) {
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
        console.error("Sayfa yüklenirken hata:", err);
        alert("Sayfa yüklenirken bir hata oluştu: " + err.message);
    }
}

// =================================================================
// 5. MODAL KONTROLLERİ (KAYIT İŞLEMLERİ)
// =================================================================

function addListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

// Modal Kapatıcılar
document.querySelectorAll('.close-modal-btn, #closeModalButton, #closeEditModalButton, #closeDenemeModalButton, #closeSoruModalButton, #closeHedefModalButton, #closeOdevModalButton, #closeRandevuModalButton, #closeTahsilatModalButton, #closeBorcModalButton, #closeProfileModalButton, #cancelModalButton, #cancelEditModalButton, #cancelDenemeModalButton, #cancelSoruModalButton, #cancelHedefModalButton, #cancelOdevModalButton, #cancelRandevuModalButton, #cancelTahsilatModalButton, #cancelBorcModalButton').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.fixed');
        if(modal) modal.style.display = 'none';
    });
});

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

// GLOBAL WINDOW FONKSİYONLARI (HTML onclick için)
window.renderOgrenciDetaySayfasi = (id, name) => {
    renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);
};

// BAŞLAT
main();
