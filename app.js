// =================================================================
// HATA YAKALAMA
// =================================================================
window.addEventListener('error', function(e) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.innerHTML = `
            <div class="text-center p-6 max-w-lg bg-white rounded-lg shadow-xl border-l-4 border-red-500">
                <h3 class="text-red-600 font-bold text-lg mb-2">Uygulama Hatası</h3>
                <code class="block bg-gray-100 p-3 rounded text-red-500 text-xs font-mono text-left overflow-auto">
                    ${e.message}<br>
                    <span class="text-gray-400">${e.filename}:${e.lineno}</span>
                </code>
            </div>
        `;
    }
});

// =================================================================
// 1. FİREBASE KÜTÜPHANELERİ (DÜZELTİLDİ)
// =================================================================
import { initializeApp, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

// DÜZELTME: Auth ile ilgili TÜM fonksiyonlar buradan gelmeli
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    updateProfile, 
    EmailAuthProvider, 
    reauthenticateWithCredential, 
    deleteUser, 
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// DÜZELTME: Firestore fonksiyonları sadece veritabanı işleri içindir
import { 
    getFirestore,
    doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, 
    collection, collectionGroup, query, where, orderBy, 
    onSnapshot, getDocs, serverTimestamp, limit, increment, writeBatch 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 


// =================================================================
// 2. MODÜL IMPORTLARI
// =================================================================
import { 
    cleanUpListeners, 
    populateStudentSelect, 
    renderDersSecimi, 
    renderPlaceholderSayfasi 
} from './modules/helpers.js';

import { renderAnaSayfa } from './modules/anasayfa.js';
import { 
    renderOgrenciSayfasi, 
    renderOgrenciDetaySayfasi, 
    saveNewStudent, 
    saveStudentChanges, 
    saveNewDeneme, 
    renderDenemeNetInputs, 
    saveNewSoruTakibi, 
    saveNewHedef, 
    saveNewOdev,
    saveNewKoclukNotu
} from './modules/ogrencilerim.js';

import { renderAjandaSayfasi, saveNewRandevu } from './modules/ajanda.js';
import { renderMuhasebeSayfasi, saveNewBorc, saveNewTahsilat } from './modules/muhasebe.js';
import { renderMesajlarSayfasi } from './modules/mesajlar.js';
import { renderDenemelerSayfasi } from './modules/denemeler.js';
import { renderSoruTakibiSayfasi } from './modules/sorutakibi.js';
import { renderHedeflerSayfasi, saveGlobalHedef } from './modules/hedefler.js';
import { renderOdevlerSayfasi, saveGlobalOdev } from './modules/odevler.js';
import { saveGlobalDeneme } from './modules/denemeler.js';


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
// 4. GLOBAL DEĞİŞKENLER VE DOM SEÇİMLERİ
// =================================================================
let currentUserId = null;

const loadingSpinner = document.getElementById("loadingSpinner");
const appContainer = document.getElementById("appContainer");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");

// GLOBAL WINDOW FONKSİYONLARI
window.renderOgrenciDetaySayfasi = (id, name) => {
    renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);
};
window.showProfileModal = (user) => showProfileModal(user);

// =================================================================
// 5. ANA UYGULAMA MANTIĞI (MAIN)
// =================================================================
async function main() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("Koç giriş yaptı:", currentUserId);
            
            // Arayüzü Göster
            if(loadingSpinner) loadingSpinner.style.display = 'none';
            if(appContainer) {
                appContainer.style.display = 'flex';
                appContainer.classList.remove('hidden');
            }
            
            updateUIForLoggedInUser(user);
            
            // Başlangıç Sayfası
            navigateToPage('anasayfa'); 
            
        } else {
            console.log("Giriş yok, login.html'e yönlendiriliyor...");
            window.location.href = 'login.html';
        }
    });
}

// =================================================================
// 6. NAVİGASYON VE ARAYÜZ YÖNETİMİ
// =================================================================

function updateUIForLoggedInUser(user) {
    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : "Koç");
    userName.textContent = displayName;
    userEmail.textContent = user.email || "";
    userAvatar.textContent = displayName.substring(0, 2).toUpperCase();

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
    cleanUpListeners();
    
    // UI Güncelle (Sidebar)
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'font-semibold'));
    const sidebarLink = document.getElementById(`nav-${pageId}`);
    if (sidebarLink) sidebarLink.classList.add('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
    
    // UI Güncelle (Bottom Nav)
    document.querySelectorAll('.bottom-nav-btn').forEach(l => {
        l.classList.remove('active', 'text-purple-600');
        l.classList.add('text-gray-500');
    });
    const bottomLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if (bottomLink) {
        bottomLink.classList.add('active', 'text-purple-600');
        bottomLink.classList.remove('text-gray-500');
    }

    // Sayfayı Render Et
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
            
            case 'hedefler': 
            case 'odevler':
                 renderPlaceholderSayfasi(pageId.charAt(0).toUpperCase() + pageId.slice(1));
                 break;

            default:
                renderPlaceholderSayfasi("Sayfa Bulunamadı");
                break;
        }
    } catch (err) {
        console.error("Sayfa yüklenirken hata:", err);
        alert("Sayfa yüklenirken bir hata oluştu: " + err.message);
    }
}


// =================================================================
// 7. MODAL KONTROLLERİ (EVENT LISTENERS)
// =================================================================

// Yardımcı: Element varsa event ekle, yoksa hata verme
function addListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, handler);
    } else {
        // console.warn(`Uyarı: Element ID '${id}' bulunamadı.`); // Geliştirme aşamasında açılabilir
    }
}

// Öğrenci Ekleme
addListener('closeModalButton', 'click', () => document.getElementById('addStudentModal').style.display = 'none');
addListener('cancelModalButton', 'click', () => document.getElementById('addStudentModal').style.display = 'none');
addListener('saveStudentButton', 'click', () => saveNewStudent(db, currentUserId, appId));

// Öğrenci Düzenleme
addListener('closeEditModalButton', 'click', () => document.getElementById('editStudentModal').style.display = 'none');
addListener('cancelEditModalButton', 'click', () => document.getElementById('editStudentModal').style.display = 'none');
addListener('saveStudentChangesButton', 'click', () => saveStudentChanges(db, currentUserId, appId));

// Sınıf Seçimi
addListener('studentClass', 'change', (e) => renderDersSecimi(e.target.value, document.getElementById('studentDersSecimiContainer')));
addListener('editStudentClass', 'change', (e) => renderDersSecimi(e.target.value, document.getElementById('editStudentDersSecimiContainer')));

// Deneme Modalı
addListener('closeDenemeModalButton', 'click', () => document.getElementById('addDenemeModal').style.display = 'none');
addListener('cancelDenemeModalButton', 'click', () => document.getElementById('addDenemeModal').style.display = 'none');
addListener('saveDenemeButton', 'click', () => saveNewDeneme(db, currentUserId, appId));
addListener('denemeTuru', 'change', (e) => renderDenemeNetInputs(e.target.value));

// Soru Takibi Modalı
addListener('closeSoruModalButton', 'click', () => document.getElementById('addSoruModal').style.display = 'none');
addListener('cancelSoruModalButton', 'click', () => document.getElementById('addSoruModal').style.display = 'none');
addListener('saveSoruButton', 'click', () => saveNewSoruTakibi(db, currentUserId, appId));

// Hedef Modalı
addListener('closeHedefModalButton', 'click', () => document.getElementById('addHedefModal').style.display = 'none');
addListener('cancelHedefModalButton', 'click', () => document.getElementById('addHedefModal').style.display = 'none');
addListener('saveHedefButton', 'click', () => saveNewHedef(db, currentUserId, appId));

// Ödev Modalı
addListener('closeOdevModalButton', 'click', () => document.getElementById('addOdevModal').style.display = 'none');
addListener('cancelOdevModalButton', 'click', () => document.getElementById('addOdevModal').style.display = 'none');
addListener('saveOdevButton', 'click', () => saveNewOdev(db, currentUserId, appId));

// Randevu Modalı
addListener('closeRandevuModalButton', 'click', () => document.getElementById('addRandevuModal').style.display = 'none');
addListener('cancelRandevuModalButton', 'click', () => document.getElementById('addRandevuModal').style.display = 'none');
addListener('saveRandevuButton', 'click', () => saveNewRandevu(db, currentUserId, appId));

// Muhasebe Modalları
addListener('closeTahsilatModalButton', 'click', () => document.getElementById('addTahsilatModal').style.display = 'none');
addListener('cancelTahsilatModalButton', 'click', () => document.getElementById('addTahsilatModal').style.display = 'none');
addListener('saveTahsilatButton', 'click', () => saveNewTahsilat(db, currentUserId, appId));

addListener('closeBorcModalButton', 'click', () => document.getElementById('addBorcModal').style.display = 'none');
addListener('cancelBorcModalButton', 'click', () => document.getElementById('addBorcModal').style.display = 'none');
addListener('saveBorcButton', 'click', () => saveNewBorc(db, currentUserId, appId));

addListener('saveDenemeButton', 'click', () => saveGlobalDeneme(db, currentUserId, appId));
addListener('saveHedefButton', 'click', () => saveGlobalHedef(db, currentUserId, appId));
addListener('saveOdevButton', 'click', () => saveGlobalOdev(db, currentUserId, appId));

// --- PROFİL AYARLARI ---
const profileModal = document.getElementById("profileModal");
if (profileModal) {
    addListener('closeProfileModalButton', 'click', () => profileModal.style.display = 'none');
}

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

// Profil Sekme Geçişleri
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

// Profil İşlemleri
addListener('btnSaveName', 'click', async () => {
    const newName = document.getElementById('profileDisplayName').value.trim();
    const btn = document.getElementById('btnSaveName');
    if (!newName) return;
    btn.disabled = true;
    btn.textContent = "Kaydediliyor...";
    try {
        await updateAuthProfile(auth.currentUser, { displayName: newName });
        alert("Profil güncellendi.");
        window.location.reload();
    } catch (e) {
        console.error(e);
        alert(e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Adı Kaydet";
    }
});

addListener('btnResetPassword', 'click', async () => {
    const btn = document.getElementById('btnResetPassword');
    btn.disabled = true;
    try {
        await sendResetEmail(auth, auth.currentUser.email);
        alert("Şifre sıfırlama e-postası gönderildi.");
    } catch (e) {
        console.error(e);
        alert("Hata: " + e.message);
    } finally {
        btn.disabled = false;
    }
});

addListener('btnDeleteAccount', 'click', async () => {
    const password = document.getElementById('deleteConfirmPassword').value;
    const btn = document.getElementById('btnDeleteAccount');
    if (!password) { alert("Şifrenizi girin."); return; }
    if (!confirm("Hesabınızı kalıcı olarak silmek istediğinize emin misiniz?")) return;

    btn.disabled = true;
    try {
        const credential = EmailProvider.credential(auth.currentUser.email, password);
        await reauth(auth.currentUser, credential);
        await deleteUser(auth.currentUser);
        alert("Hesap silindi.");
        window.location.href = "login.html";
    } catch (e) {
        console.error(e);
        alert("Hata: " + e.message);
        btn.disabled = false;
    }
});

// Kopyala Butonu
addListener('btnKopyala', 'click', () => {
    const input = document.getElementById('kocDavetKodu');
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => alert("Kopyalandı!"));
});


// =================================================================
// 8. UYGULAMAYI BAŞLAT
// =================================================================
main();
