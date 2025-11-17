// 1. Firebase Kütüphanelerini (SDK) içeri aktar
import { initializeApp, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    signOut,
    updateProfile, // YENİ
    sendPasswordResetEmail, // YENİ
    EmailAuthProvider, // YENİ
    reauthenticateWithCredential, // YENİ
    deleteUser // YENİ
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 2. Modülleri ve Yardımcıları İçeri Aktar
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

// =================================================================
// 1. ADIM: firebaseConfig BİLGİLERİNİZ
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

// 2. DOM Elementlerini Seç (Sadece Ana Panel ve Modalların Dış Kontrolleri)
const loadingSpinner = document.getElementById("loadingSpinner");
const appContainer = document.getElementById("appContainer");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");
const mainContentTitle = document.getElementById("mainContentTitle");
const mainContentArea = document.getElementById("mainContentArea");
// YENİ: Profil Alanı
const userProfileArea = document.getElementById("userProfileArea"); // index.html'deki profil alanına bu ID'yi eklemeliyiz.
// YENİ: Profil Modalı Elementleri
const profileModal = document.getElementById("profileModal");
const closeProfileModalButton = document.getElementById("closeProfileModalButton");
const btnSaveName = document.getElementById("btnSaveName");
const btnResetPassword = document.getElementById("btnResetPassword");
const btnDeleteAccount = document.getElementById("btnDeleteAccount");
const profileError = document.getElementById("profileError");

// 3. Global Değişkenler
let auth;
let db;
let currentUserId = null;
let appId = null;

// Global window objesine modül fonksiyonlarını ekle (HTML inline onclick'leri için)
// Bu, modül yapısında gereklidir, özellikle dashboard'dan profile geçiş için.
window.renderOgrenciDetaySayfasi = (id, name) => {
    renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);
};


// 4. Ana Uygulama Fonksiyonu (Başlatıcı)
async function main() {
    // Firebase'i başlat
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    appId = "kocluk-sistemi";
    setLogLevel('debug'); // Hata ayıklama için

    // GİRİŞ KORUMASI (Auth Guard)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("Koç giriş yaptı, UID:", currentUserId);
            
            // DÜZELTME: Hata oluşsa bile arayüzü göstermek için
            // bu iki satırı EN BAŞA taşıdık.
            loadingSpinner.style.display = 'none';
            appContainer.style.display = 'flex';
            
            // Arayüzü ve menüleri ayarla
            updateUIForLoggedInUser(user);
            
            // Ana Sayfa ile başla (anasayfa.js modülünden)
            renderAnaSayfa(db, currentUserId, appId);
            
        } else {
            // KULLANICI GİRİŞ YAPMAMIŞ
            console.log("Giriş yapan kullanıcı yok, login.html'e yönlendiriliyor.");
            window.location.href = 'login.html';
        }
    });
}

// === 5. Arayüz Güncelleme ve ANA NAVİGASYON ===
function navigateToPage(pageId) {
    cleanUpListeners(); // helpers.js'den (Tüm dinleyicileri temizle)
    
    // İlgili modülün render fonksiyonunu çağır
    switch(pageId) {
        case 'anasayfa':
            renderAnaSayfa(db, currentUserId, appId);
            break;
        case 'ogrencilerim':
            renderOgrenciSayfasi(db, currentUserId, appId);
            break;
        case 'ajandam':
            renderAjandaSayfasi(db, currentUserId, appId);
            break;
        case 'muhasebe':
            renderMuhasebeSayfasi(db, currentUserId, appId);
            break;
        case 'mesajlar':
            renderMesajlarSayfasi(db, currentUserId, appId);
            break;
        default:
            renderPlaceholderSayfasi(pageId);
            break;
    }

    // Hem sol menüde hem alt menüde aktif stili ayarla
    setActiveNav(pageId);
}

// YENİ: Aktif Navigasyon Stil Fonksiyonu
function setActiveNav(pageId) {
    // Sol Menü (Sidebar)
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
    });
    const sidebarLink = document.getElementById(`nav-${pageId}`);
    if (sidebarLink) {
        sidebarLink.classList.add('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
    }

    // Alt Menü (Bottom Nav)
    document.querySelectorAll('.bottom-nav-btn').forEach(l => {
        l.classList.remove('active', 'text-purple-600');
        l.classList.add('text-gray-500');
    });
    const bottomNavLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if (bottomNavLink) {
        bottomNavLink.classList.add('active', 'text-purple-600');
        bottomNavLink.classList.remove('text-gray-500');
    }
}
function updateUIForLoggedInUser(user) {
    if (user) {
        // GÜNCELLENDİ: 'displayName' (Ad Soyad) kullan
        const displayName = user.displayName ? user.displayName : (user.email ? user.email.split('@')[0] : "Koç");
        const displayEmail = user.email || "E-posta yok";
        
        userName.textContent = displayName;
        userEmail.textContent = displayEmail;
        userAvatar.textContent = displayName.substring(0, 2).toUpperCase();

        // YENİ: Profil alanını tıklanabilir yap
        // Not: index.html'deki profil alanına id="userProfileArea" eklediğinizden emin olun
        const userProfileArea = document.getElementById("userProfileArea"); // Bu ID'yi <nav> içindeki profil div'ine ekleyin
        if (userProfileArea) {
            userProfileArea.style.cursor = "pointer";
            userProfileArea.addEventListener('click', () => showProfileModal(user));
        }
    }
    
    // Çıkış Butonu
    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("Çıkış yapıldı.");
            window.location.href = 'login.html';
        });
    });

    // Ana Navigasyon (Sidebar) Yönlendiricisi
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.id.split('-')[1];
            navigateToPage(pageId); // YENİ fonksiyonu çağır
        });
    });

    // YENİ: Alt Navigasyon (Bottom Nav) Yönlendiricisi
    document.querySelectorAll('.bottom-nav-btn').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.currentTarget.dataset.page;
            navigateToPage(pageId); // YENİ fonksiyonu çağır
        });
    });
            
            // İlgili modülün render fonksiyonunu çağır
            // TÜM ÇAĞRILARA appId EKLENDİ
            switch(pageId) {
                case 'anasayfa':
                    renderAnaSayfa(db, currentUserId, appId);
                    break;
                case 'ogrencilerim':
                    renderOgrenciSayfasi(db, currentUserId, appId);
                    break;
                case 'ajandam':
                    renderAjandaSayfasi(db, currentUserId, appId);
                    break;
                case 'muhasebe':
                    renderMuhasebeSayfasi(db, currentUserId, appId);
                    break;
                case 'mesajlar':
                    renderMesajlarSayfasi(db, currentUserId, appId);
                    break;
                default:
                    renderPlaceholderSayfasi(link.textContent.trim());
                    break;
            }
        });
    });

    // Varsayılan olarak Ana Sayfa'yı aktif yap
    document.getElementById('nav-ogrencilerim').classList.remove('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
    document.getElementById('nav-anasayfa').classList.add('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
}
// === YENİ BÖLÜM: PROFİL YÖNETİMİ ===

/**
 * Profil Ayarları modalını açar ve doldurur
 */
function showProfileModal(user) {
    profileError.classList.add('hidden');
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('deleteConfirmPassword').value = '';
    
    // Tabları varsayılan (Hesap) hale getir
    document.querySelector('.profile-tab-button[data-tab="hesap"]').click();
    
    profileModal.style.display = 'block';
}

/**
 * Koçun görünen adını (displayName) günceller
 */
async function handleProfileSave() {
    const newName = document.getElementById('profileDisplayName').value.trim();
    if (!newName) {
        profileError.textContent = "Ad Soyad boş olamaz.";
        profileError.classList.remove('hidden');
        return;
    }
    
    btnSaveName.disabled = true;
    btnSaveName.textContent = "Kaydediliyor...";

    try {
        await updateProfile(auth.currentUser, {
            displayName: newName
        });
        
        // Kenar çubuğundaki adı ve avatarı anında güncelle
        userName.textContent = newName;
        userAvatar.textContent = newName.substring(0, 2).toUpperCase();
        
        profileError.classList.add('hidden');
        // Başarı mesajı (opsiyonel)
        alert("Profiliniz güncellendi!");
        profileModal.style.display = 'none';

    } catch (error) {
        console.error("Profil güncelleme hatası:", error);
        profileError.textContent = "Hata: " + error.message;
        profileError.classList.remove('hidden');
    } finally {
        btnSaveName.disabled = false;
        btnSaveName.textContent = "Adı Kaydet";
    }
}

/**
 * Koçun e-postasına şifre sıfırlama linki gönderir
 */
async function handlePasswordReset() {
    btnResetPassword.disabled = true;
    btnResetPassword.textContent = "Gönderiliyor...";
    try {
        await sendPasswordResetEmail(auth, auth.currentUser.email);
        alert("Şifre sıfırlama e-postası gönderildi. Lütfen e-posta kutunuzu (ve spam) kontrol edin.");
        profileError.classList.add('hidden');
    } catch (error) {
        console.error("Şifre sıfırlama hatası:", error);
        profileError.textContent = "Hata: " + error.message;
        profileError.classList.remove('hidden');
    } finally {
        btnResetPassword.disabled = false;
        btnResetPassword.textContent = "Şifre Sıfırlama E-postası Gönder";
    }
}

/**
 * Koçun hesabını silmek için önce yeniden kimlik doğrulaması yapar
 */
async function handleAccountDelete() {
    const password = document.getElementById('deleteConfirmPassword').value;
    if (!password) {
        profileError.textContent = "Hesabınızı silmek için mevcut şifrenizi girmelisiniz.";
        profileError.classList.remove('hidden');
        return;
    }
    
    if (!confirm("EMİN MİSİNİZ?\n\nTüm koçluk verileriniz (öğrenciler, notlar, randevular, mesajlar) kalıcı olarak silinecektir. Bu işlem geri alınamaz!")) {
        return;
    }

    btnDeleteAccount.disabled = true;
    btnDeleteAccount.textContent = "Siliniyor...";
    profileError.classList.add('hidden');

    try {
        // 1. Kimlik bilgisini oluştur
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        
        // 2. Yeniden kimlik doğrula
        await reauthenticateWithCredential(auth.currentUser, credential);
        
        // 3. Kimlik doğrulama başarılıysa, hesabı sil
        // ÖNEMLİ: Hesabı silmeden önce Firestore'daki /koclar/{kocID} klasörünü
        // silmek için bir Cloud Function yazmanız gerekir.
        // deleteUser() fonksiyonu sadece Auth kaydını siler, veritabanı verilerini silmez.
        // Şimdilik sadece Auth'u siliyoruz:
        
        await deleteUser(auth.currentUser);
        
        alert("Hesabınız başarıyla silindi.");
        window.location.href = 'login.html'; // Silindikten sonra giriş sayfasına at
        
    } catch (error) {
        console.error("Hesap silme hatası:", error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            profileError.textContent = "Hata: Mevcut şifre yanlış.";
        } else {
            profileError.textContent = "Hata: " + error.message;
        }
        profileError.classList.remove('hidden');
    } finally {
        btnDeleteAccount.disabled = false;
        btnDeleteAccount.textContent = "Hesabımı Kalıcı Olarak Sil";
    }
}

// === 6. MODAL KONTROLLERİ (Event Listeners) ===
// Bu kısım app.js'de kalmalı çünkü modallar index.html'de

// Öğrenci Ekleme Modalı
document.getElementById('closeModalButton').addEventListener('click', () => { document.getElementById('addStudentModal').style.display = 'none'; });
document.getElementById('cancelModalButton').addEventListener('click', () => { document.getElementById('addStudentModal').style.display = 'none'; });
document.getElementById('saveStudentButton').addEventListener('click', () => saveNewStudent(db, currentUserId, appId));

// Öğrenci Düzenleme Modalı
document.getElementById('closeEditModalButton').addEventListener('click', () => { document.getElementById('editStudentModal').style.display = 'none'; });
document.getElementById('cancelEditModalButton').addEventListener('click', () => { document.getElementById('editStudentModal').style.display = 'none'; });
document.getElementById('saveStudentChangesButton').addEventListener('click', () => saveStudentChanges(db, currentUserId, appId));

// Sınıf seçimi değiştikçe dersleri güncelle (Her iki modal için)
document.getElementById('studentClass').addEventListener('change', (e) => {
    renderDersSecimi(e.target.value, document.getElementById('studentDersSecimiContainer'));
});
document.getElementById('editStudentClass').addEventListener('change', (e) => {
    renderDersSecimi(e.target.value, document.getElementById('editStudentDersSecimiContainer'));
});

// Deneme Modalı
document.getElementById('closeDenemeModalButton').addEventListener('click', () => { document.getElementById('addDenemeModal').style.display = 'none'; });
document.getElementById('cancelDenemeModalButton').addEventListener('click', () => { document.getElementById('addDenemeModal').style.display = 'none'; });
document.getElementById('saveDenemeButton').addEventListener('click', () => saveNewDeneme(db, currentUserId, appId));
document.getElementById('denemeTuru').addEventListener('change', (e) => renderDenemeNetInputs(e.target.value));

// Soru Takibi Modalı
document.getElementById('closeSoruModalButton').addEventListener('click', () => { document.getElementById('addSoruModal').style.display = 'none'; });
document.getElementById('cancelSoruModalButton').addEventListener('click', () => { document.getElementById('addSoruModal').style.display = 'none'; });
document.getElementById('saveSoruButton').addEventListener('click', () => saveNewSoruTakibi(db, currentUserId, appId));

// Hedef Modalı
document.getElementById('closeHedefModalButton').addEventListener('click', () => { document.getElementById('addHedefModal').style.display = 'none'; });
document.getElementById('cancelHedefModalButton').addEventListener('click', () => { document.getElementById('addHedefModal').style.display = 'none'; });
document.getElementById('saveHedefButton').addEventListener('click', () => saveNewHedef(db, currentUserId, appId));

// Ödev Modalı
document.getElementById('closeOdevModalButton').addEventListener('click', () => { document.getElementById('addOdevModal').style.display = 'none'; });
document.getElementById('cancelOdevModalButton').addEventListener('click', () => { document.getElementById('addOdevModal').style.display = 'none'; });
document.getElementById('saveOdevButton').addEventListener('click', () => saveNewOdev(db, currentUserId, appId));

// Randevu Modalı
document.getElementById('closeRandevuModalButton').addEventListener('click', () => { document.getElementById('addRandevuModal').style.display = 'none'; });
document.getElementById('cancelRandevuModalButton').addEventListener('click', () => { document.getElementById('addRandevuModal').style.display = 'none'; });
document.getElementById('saveRandevuButton').addEventListener('click', () => saveNewRandevu(db, currentUserId, appId));

// Muhasebe Modalları
document.getElementById('closeTahsilatModalButton').addEventListener("click", () => document.getElementById('addTahsilatModal').style.display = "none");
document.getElementById('cancelTahsilatModalButton').addEventListener("click", () => document.getElementById('addTahsilatModal').style.display = "none");
document.getElementById('saveTahsilatButton').addEventListener("click", () => saveNewTahsilat(db, currentUserId, appId));

document.getElementById('closeBorcModalButton').addEventListener("click", () => document.getElementById('addBorcModal').style.display = "none");
document.getElementById('cancelBorcModalButton').addEventListener("click", () => document.getElementById('addBorcModal').style.display = "none");
document.getElementById('saveBorcButton').addEventListener("click", () => saveNewBorc(db, currentUserId, appId));

// YENİ: Profil Modalı Listener'ları
closeProfileModalButton.addEventListener('click', () => { profileModal.style.display = 'none'; });
btnSaveName.addEventListener('click', handleProfileSave);
btnResetPassword.addEventListener('click', handlePasswordReset);
btnDeleteAccount.addEventListener('click', handleAccountDelete);

// Profil Modalı Sekme Geçişleri
document.querySelectorAll('.profile-tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
        // Tüm butonlardan 'active' stilini kaldır
        document.querySelectorAll('.profile-tab-button').forEach(btn => {
            btn.classList.remove('active', 'bg-purple-100', 'text-purple-700');
            btn.classList.add('text-gray-500', 'hover:bg-gray-200');
        });
        // Tıklanan butona 'active' stilini ekle
        e.currentTarget.classList.add('active', 'bg-purple-100', 'text-purple-700');
        e.currentTarget.classList.remove('text-gray-500', 'hover:bg-gray-200');
        
        const tabId = e.currentTarget.dataset.tab;
        
        // Tüm içerikleri gizle
        document.querySelectorAll('.profile-tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        // İlgili içeriği göster
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    });
});
// === 7. UYGULAMAYI BAŞLAT ===
main();
