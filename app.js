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
// 5. BAŞLATMA (MAIN)
// =================================================================
async function main() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("Giriş yapıldı:", currentUserId);
            
            // Arayüzü Göster
            if(loadingSpinner) loadingSpinner.style.display = 'none';
            if(appContainer) {
                appContainer.style.display = 'flex';
                appContainer.classList.remove('hidden');
            }
            
            updateUIForLoggedInUser(user);
            navigateToPage('anasayfa'); 
            
        } else {
            console.log("Giriş yok, login.html'e yönlendiriliyor...");
            window.location.href = 'login.html';
        }
    });
}

// =================================================================
// 6. NAVİGASYON YÖNETİMİ
// =================================================================

function updateUIForLoggedInUser(user) {
    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : "Koç");
    if(userName) userName.textContent = displayName;
    if(userEmail) userEmail.textContent = user.email || "";
    if(userAvatar) userAvatar.textContent = displayName.substring(0, 2).toUpperCase();

    const profileArea = document.getElementById("userProfileArea");
    if (profileArea) {
        profileArea.onclick = () => showProfileModal(user);
    }

    if (logoutButton) {
        logoutButton.onclick = () => {
            signOut(auth).then(() => window.location.href = 'login.html');
        };
    }

    const handleNavClick = (e) => {
        e.preventDefault();
        const target = e.currentTarget;
        const pageId = target.dataset.page || (target.id ? target.id.split('-')[1] : null);
        if (pageId) navigateToPage(pageId);
    };

    document.querySelectorAll('.nav-link, .bottom-nav-btn').forEach(link => {
        link.addEventListener('click', handleNavClick);
    });
}

function navigateToPage(pageId) {
    cleanUpListeners(); // Eski dinleyicileri temizle
    
    // Sidebar Stilleri
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'font-semibold'));
    const sidebarLink = document.getElementById(`nav-${pageId}`);
    if (sidebarLink) sidebarLink.classList.add('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
    
    // Bottom Nav Stilleri
    document.querySelectorAll('.bottom-nav-btn').forEach(l => {
        l.classList.remove('active', 'text-purple-600');
        l.classList.add('text-gray-500');
    });
    const bottomLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if (bottomLink) {
        bottomLink.classList.add('active', 'text-purple-600');
        bottomLink.classList.remove('text-gray-500');
    }

    // Sayfa Render
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
// 7. MODAL VE EVENT LISTENERLAR (KAYIT İŞLEMLERİ)
// =================================================================

function addListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

// Kapatma Butonları
document.querySelectorAll('.close-modal-btn, #closeModalButton, #closeEditModalButton, #closeDenemeModalButton, #closeSoruModalButton, #closeHedefModalButton, #closeOdevModalButton, #closeRandevuModalButton, #closeTahsilatModalButton, #closeBorcModalButton, #closeProfileModalButton, #cancelModalButton, #cancelEditModalButton, #cancelDenemeModalButton, #cancelSoruModalButton, #cancelHedefModalButton, #cancelOdevModalButton, #cancelRandevuModalButton, #cancelTahsilatModalButton, #cancelBorcModalButton').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.fixed'); // Modal container'ı bul
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

// Randevu & Muhasebe
addListener('saveRandevuButton', 'click', () => saveNewRandevu(db, currentUserId, appId));
addListener('saveTahsilatButton', 'click', () => saveNewTahsilat(db, currentUserId, appId));
addListener('saveBorcButton', 'click', () => saveNewBorc(db, currentUserId, appId));


// --- PROFİL İŞLEMLERİ ---
const profileModal = document.getElementById("profileModal");

function showProfileModal(user) {
    if (!profileModal) return;
    document.getElementById('profileError').classList.add('hidden');
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    document.getElementById('deleteConfirmPassword').value = '';
    
    const tabBtn = document.querySelector('.profile-tab-button[data-tab="hesap"]');
    if (tabBtn) tabBtn.click();
    
    profileModal.style.display = 'block';
}

document.querySelectorAll('.profile-tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
        document.querySelectorAll('.profile-tab-button').forEach(btn => {
            btn.classList.remove('active', 'bg-purple-100', 'text-purple-700');
            btn.classList.add('text-gray-500', 'hover:bg-gray-200');
        });
        e.currentTarget.classList.add('active', 'bg-purple-100', 'text-purple-700');
        e.currentTarget.classList.remove('text-gray-500', 'hover:bg-gray-200');
        
        const tabId = e.currentTarget.dataset.tab;
        document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    });
});

// Kaydet / Sıfırla / Sil
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
    if (!password) { alert("Şifrenizi girin."); return; }
    if (!confirm("Hesabınızı kalıcı olarak silmek istediğinize emin misiniz?")) return;

    try {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await deleteUser(auth.currentUser);
        alert("Hesap silindi."); window.location.href = "login.html";
    } catch (e) { alert("Hata: " + e.message); }
});

addListener('btnKopyala', 'click', () => {
    const input = document.getElementById('kocDavetKodu');
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => alert("Kopyalandı!"));
});

// UYGULAMAYI BAŞLAT
main();
