// =================================================================
// 1. FİREBASE KÜTÜPHANELERİ
// =================================================================
import { initializeApp, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore,
    updateProfile,
    EmailAuthProvider,
    reauthenticateWithCredential,
    deleteUser,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 
// Not: Auth fonksiyonları (updateProfile vb.) auth paketinden gelmeli, 
// ancak app.js içinde sadece Auth instance'ı ve signOut kullanıyoruz.
// Profil işlemleri aşağıda Auth paketinden import edilerek düzeltilmiştir.

// =================================================================
// 2. MODÜL IMPORTLARI (TÜM SAYFALAR)
// =================================================================

// Yardımcılar
import { 
    cleanUpListeners, 
    populateStudentSelect, 
    renderDersSecimi, 
    renderPlaceholderSayfasi 
} from './modules/helpers.js';

// Sayfa Modülleri
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

// Profil Yönetimi için Auth Fonksiyonları (Doğru paketten)
import { 
    updateProfile as updateAuthProfile, 
    reauthenticateWithCredential as reauth, 
    EmailAuthProvider as EmailProvider,
    deleteUser as delUser,
    sendPasswordResetEmail as sendResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";


// =================================================================
// 3. FİREBASE AYARLARI VE BAŞLATMA
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

// Hata ayıklama
setLogLevel('debug');

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

// GLOBAL WINDOW FONKSİYONLARI (HTML'den erişim için)
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
            
            // UI Hazırla
            loadingSpinner.style.display = 'none';
            appContainer.style.display = 'flex';
            updateUIForLoggedInUser(user);
            
            // Başlangıç Sayfası: Ana Sayfa
            navigateToPage('anasayfa'); 
            
        } else {
            console.log("Giriş yok, yönlendiriliyor...");
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

    // Profil Alanı Tıklama
    const profileArea = document.getElementById("userProfileArea");
    if (profileArea) {
        profileArea.onclick = () => showProfileModal(user);
    }

    // Çıkış
    logoutButton.onclick = () => {
        signOut(auth).then(() => window.location.href = 'login.html');
    };

    // Navigasyon Linkleri (Hem Sidebar hem Bottom Nav)
    const handleNavClick = (e) => {
        e.preventDefault();
        // ID'den veya data-page attribute'undan sayfa adını al
        const target = e.currentTarget;
        const pageId = target.id ? target.id.split('-')[1] : target.dataset.page;
        navigateToPage(pageId);
    };

    document.querySelectorAll('.nav-link, .bottom-nav-btn').forEach(link => {
        link.addEventListener('click', handleNavClick);
    });
}

function navigateToPage(pageId) {
    // 1. Eski dinleyicileri temizle
    cleanUpListeners();
    
    // 2. Aktif link stillerini güncelle
    // Sidebar
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'font-semibold'));
    const sidebarLink = document.getElementById(`nav-${pageId}`);
    if (sidebarLink) sidebarLink.classList.add('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
    
    // Bottom Nav
    document.querySelectorAll('.bottom-nav-btn').forEach(l => {
        l.classList.remove('active', 'text-purple-600');
        l.classList.add('text-gray-500');
    });
    const bottomLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if (bottomLink) {
        bottomLink.classList.add('active', 'text-purple-600');
        bottomLink.classList.remove('text-gray-500');
    }

    // 3. İlgili sayfayı render et
    switch(pageId) {
        case 'anasayfa': renderAnaSayfa(db, currentUserId, appId); break;
        case 'ogrencilerim': renderOgrenciSayfasi(db, currentUserId, appId); break;
        case 'ajandam': renderAjandaSayfasi(db, currentUserId, appId); break;
        case 'muhasebe': renderMuhasebeSayfasi(db, currentUserId, appId); break;
        case 'mesajlar': renderMesajlarSayfasi(db, currentUserId, appId); break;
        case 'denemeler': renderDenemelerSayfasi(db, currentUserId, appId); break; // Global Denemeler
        case 'sorutakibi': renderSoruTakibiSayfasi(db, currentUserId, appId); break; // Global Soru Takibi
        
        // Alt sekmelerden biri seçildiyse (örn: hedefler, ödevler), varsayılan olarak ana sayfaya veya öğrencilere atabiliriz
        // veya specific bir "Görevler" sayfası yapabiliriz.
        case 'hedefler': 
        case 'odevler':
            // Şimdilik placeholder, istenirse global görev sayfası yapılabilir
            renderPlaceholderSayfasi(pageId.charAt(0).toUpperCase() + pageId.slice(1)); 
            break;
            
        default:
            renderPlaceholderSayfasi("Sayfa Bulunamadı");
            break;
    }
}


// =================================================================
// 7. MODAL KONTROLLERİ (EVENT LISTENERS)
// =================================================================

// --- ÖĞRENCİ İŞLEMLERİ ---
const addStudentModal = document.getElementById('addStudentModal');
document.getElementById('closeModalButton').onclick = () => addStudentModal.style.display = 'none';
document.getElementById('cancelModalButton').onclick = () => addStudentModal.style.display = 'none';
document.getElementById('saveStudentButton').onclick = () => saveNewStudent(db, currentUserId, appId);

const editStudentModal = document.getElementById('editStudentModal');
document.getElementById('closeEditModalButton').onclick = () => editStudentModal.style.display = 'none';
document.getElementById('cancelEditModalButton').onclick = () => editStudentModal.style.display = 'none';
document.getElementById('saveStudentChangesButton').onclick = () => saveStudentChanges(db, currentUserId, appId);

// Sınıf seçimi değişimleri (Ders listelerini güncellemek için)
document.getElementById('studentClass').onchange = (e) => renderDersSecimi(e.target.value, document.getElementById('studentDersSecimiContainer'));
document.getElementById('editStudentClass').onchange = (e) => renderDersSecimi(e.target.value, document.getElementById('editStudentDersSecimiContainer'));


// --- DENEME İŞLEMLERİ ---
const addDenemeModal = document.getElementById('addDenemeModal');
document.getElementById('closeDenemeModalButton').onclick = () => addDenemeModal.style.display = 'none';
document.getElementById('cancelDenemeModalButton').onclick = () => addDenemeModal.style.display = 'none';
document.getElementById('saveDenemeButton').onclick = () => saveNewDeneme(db, currentUserId, appId);
document.getElementById('denemeTuru').onchange = (e) => renderDenemeNetInputs(e.target.value);


// --- SORU TAKİBİ İŞLEMLERİ ---
const addSoruModal = document.getElementById('addSoruModal');
document.getElementById('closeSoruModalButton').onclick = () => addSoruModal.style.display = 'none';
document.getElementById('cancelSoruModalButton').onclick = () => addSoruModal.style.display = 'none';
document.getElementById('saveSoruButton').onclick = () => saveNewSoruTakibi(db, currentUserId, appId);


// --- HEDEF VE ÖDEV İŞLEMLERİ ---
const addHedefModal = document.getElementById('addHedefModal');
document.getElementById('closeHedefModalButton').onclick = () => addHedefModal.style.display = 'none';
document.getElementById('cancelHedefModalButton').onclick = () => addHedefModal.style.display = 'none';
document.getElementById('saveHedefButton').onclick = () => saveNewHedef(db, currentUserId, appId);

const addOdevModal = document.getElementById('addOdevModal');
document.getElementById('closeOdevModalButton').onclick = () => addOdevModal.style.display = 'none';
document.getElementById('cancelOdevModalButton').onclick = () => addOdevModal.style.display = 'none';
document.getElementById('saveOdevButton').onclick = () => saveNewOdev(db, currentUserId, appId);


// --- RANDEVU İŞLEMLERİ ---
const addRandevuModal = document.getElementById('addRandevuModal');
document.getElementById('closeRandevuModalButton').onclick = () => addRandevuModal.style.display = 'none';
document.getElementById('cancelRandevuModalButton').onclick = () => addRandevuModal.style.display = 'none';
document.getElementById('saveRandevuButton').onclick = () => saveNewRandevu(db, currentUserId, appId);


// --- MUHASEBE İŞLEMLERİ ---
const addTahsilatModal = document.getElementById('addTahsilatModal');
document.getElementById('closeTahsilatModalButton').onclick = () => addTahsilatModal.style.display = 'none';
document.getElementById('cancelTahsilatModalButton').onclick = () => addTahsilatModal.style.display = 'none';
document.getElementById('saveTahsilatButton').onclick = () => saveNewTahsilat(db, currentUserId, appId);

const addBorcModal = document.getElementById('addBorcModal');
document.getElementById('closeBorcModalButton').onclick = () => addBorcModal.style.display = 'none';
document.getElementById('cancelBorcModalButton').onclick = () => addBorcModal.style.display = 'none';
document.getElementById('saveBorcButton').onclick = () => saveNewBorc(db, currentUserId, appId);


// --- PROFİL AYARLARI (YENİ) ---
const profileModal = document.getElementById("profileModal");
const closeProfileModalButton = document.getElementById("closeProfileModalButton");
const btnSaveName = document.getElementById("btnSaveName");
const btnResetPassword = document.getElementById("btnResetPassword");
const btnDeleteAccount = document.getElementById("btnDeleteAccount");
const profileError = document.getElementById("profileError");
const kocDavetKoduInput = document.getElementById("kocDavetKodu");
const btnKopyala = document.getElementById("btnKopyala");

// Modal Kapatma
if (closeProfileModalButton) closeProfileModalButton.onclick = () => profileModal.style.display = 'none';

// Kopyalama Butonu
if (btnKopyala) {
    btnKopyala.onclick = () => {
        if (kocDavetKoduInput) {
            kocDavetKoduInput.select();
            kocDavetKoduInput.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(kocDavetKoduInput.value).then(() => {
                const span = btnKopyala.querySelector('span');
                const originalText = span.textContent;
                span.textContent = "Kopyalandı!";
                setTimeout(() => span.textContent = originalText, 2000);
            });
        }
    };
}

// Profil Modalı Açma
function showProfileModal(user) {
    if (!profileModal) return;
    profileError.classList.add('hidden');
    document.getElementById('profileDisplayName').value = user.displayName || '';
    if (kocDavetKoduInput) kocDavetKoduInput.value = user.uid; // Koç ID
    document.getElementById('deleteConfirmPassword').value = '';
    
    // Tabları sıfırla
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

// Profil Kaydetme
if (btnSaveName) {
    btnSaveName.onclick = async () => {
        const newName = document.getElementById('profileDisplayName').value.trim();
        if (!newName) return;
        btnSaveName.disabled = true;
        btnSaveName.textContent = "Kaydediliyor...";
        try {
            await updateAuthProfile(auth.currentUser, { displayName: newName });
            alert("Profil güncellendi.");
            window.location.reload();
        } catch (e) {
            console.error(e);
            profileError.textContent = e.message;
            profileError.classList.remove('hidden');
        } finally {
            btnSaveName.disabled = false;
            btnSaveName.textContent = "Adı Kaydet";
        }
    };
}

// Şifre Sıfırlama
if (btnResetPassword) {
    btnResetPassword.onclick = async () => {
        btnResetPassword.disabled = true;
        try {
            await sendResetEmail(auth, auth.currentUser.email);
            alert("Şifre sıfırlama e-postası gönderildi.");
        } catch (e) {
            console.error(e);
            alert("Hata: " + e.message);
        } finally {
            btnResetPassword.disabled = false;
        }
    };
}

// Hesap Silme
if (btnDeleteAccount) {
    btnDeleteAccount.onclick = async () => {
        const password = document.getElementById('deleteConfirmPassword').value;
        if (!password) { alert("Şifrenizi girin."); return; }
        if (!confirm("Hesabınızı kalıcı olarak silmek istediğinize emin misiniz?")) return;

        btnDeleteAccount.disabled = true;
        try {
            const credential = EmailProvider.credential(auth.currentUser.email, password);
            await reauth(auth.currentUser, credential);
            await delUser(auth.currentUser);
            alert("Hesap silindi.");
            window.location.href = "login.html";
        } catch (e) {
            console.error(e);
            profileError.textContent = "Hata: " + e.message;
            profileError.classList.remove('hidden');
            btnDeleteAccount.disabled = false;
        }
    };
}

// =================================================================
// 8. UYGULAMAYI BAŞLAT
// =================================================================
main();
