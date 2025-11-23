// =================================================================
// 0. HATA YAKALAMA (Sistem Yükleniyor Ekranında Takılmayı Önler)
// =================================================================
window.addEventListener('error', function(e) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
    
    console.error("Global Hata:", e);
    // Hata kritikse kullanıcıya göster (Opsiyonel)
    // alert("Bir hata oluştu: " + e.message); 
});

// =================================================================
// 1. FİREBASE KÜTÜPHANELERİ VE AYARLAR
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
            
            updateUIForLoggedInUser(user);
            navigateToPage('anasayfa');
            initNotifications(); // Bildirim sistemini başlat
            
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

    // Masaüstü Sidebar
    const userNameDesk = document.getElementById("userNameDesktop");
    if(userNameDesk) {
        userNameDesk.textContent = displayName;
        document.getElementById("userAvatarDesktop").textContent = initials;
    }
    
    // Mobil Header
    const headerName = document.getElementById("headerName");
    if(headerName) {
        headerName.textContent = displayName;
        document.getElementById("headerAvatar").textContent = initials;
    }

    // Profil Modalı Tıklama Olayları
    // (Hem masaüstü sidebar hem mobil header hem mobil menüdeki profil butonları)
    const profileTriggers = [
        document.getElementById("userProfileAreaDesktop"), // Masaüstü Sidebar
        document.getElementById("headerCoachProfile"),     // Mobil Header
        document.getElementById("nav-profil-mobile")       // Mobil Yan Menü
    ];

    profileTriggers.forEach(trigger => {
        if(trigger) {
            trigger.onclick = (e) => {
                e.preventDefault();
                closeMobileMenu(); // Mobildeysek menüyü kapat
                showProfileModal(user);
            };
        }
    });

    // Çıkış İşlemi
    const handleLogout = () => signOut(auth).then(() => window.location.href = 'login.html');
    const btnLogoutDesk = document.getElementById("logoutButton"); // Masaüstü
    const btnLogoutMob = document.getElementById("btnMobileLogout"); // Mobil
    
    if(btnLogoutDesk) btnLogoutDesk.onclick = handleLogout;
    if(btnLogoutMob) btnLogoutMob.onclick = handleLogout;

    // Navigasyon Linkleri (Sidebar ve Mobil Drawer)
    document.querySelectorAll('.nav-link, .mobile-drawer-link').forEach(link => {
        link.addEventListener('click', (e) => {
            // Menü açma/kapama butonu değilse sayfa değiştir
            if(link.id === 'btnToggleMobileMenu') return;

            e.preventDefault();
            const page = link.dataset.page || (link.id ? link.id.split('-')[1] : null);
            if (page) {
                navigateToPage(page);
                closeMobileMenu();
            }
        });
    });
}

// Profil Modalı Açma
function showProfileModal(user) {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    
    // Alanları Doldur
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    document.getElementById('deleteConfirmPassword').value = '';
    document.getElementById('profileError').classList.add('hidden');

    // Varsayılan sekmeyi aç (Hesap)
    const tabBtn = document.querySelector('.profile-tab-button[data-tab="hesap"]');
    if(tabBtn) tabBtn.click();
    
    modal.classList.remove('hidden');
}

// Profil Modal Kapatma ve Sekme Geçişleri
const profileModal = document.getElementById("profileModal");
if(profileModal) {
    document.getElementById('closeProfileModalButton').onclick = () => profileModal.classList.add('hidden');

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

// Profil Kaydetme İşlemleri
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
        document.getElementById('profileError').textContent = e.message;
        document.getElementById('profileError').classList.remove('hidden');
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
const drawer = document.getElementById('mobileMenuDrawer');
const overlay = document.getElementById('mobileMenuOverlay');
const btnMenu = document.getElementById('mobileMenuBtn');
const btnCloseMenu = document.getElementById('btnCloseMobileMenu');

function openMobileMenu() {
    drawer.classList.remove('translate-x-full');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10);
}

function closeMobileMenu() {
    drawer.classList.add('translate-x-full');
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

if(btnMenu) btnMenu.onclick = openMobileMenu;
if(btnCloseMenu) btnCloseMenu.onclick = closeMobileMenu;
if(overlay) overlay.onclick = closeMobileMenu;

// Sayfa Yönlendirme
function navigateToPage(pageId) {
    cleanUpListeners(); // Eski dinleyicileri temizle
    
    // Link Stilleri (Sidebar)
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-700', 'font-bold'));
    const activeLinks = document.querySelectorAll(`[data-page="${pageId}"], #nav-${pageId}`); // Hem sidebar hem drawer linklerini bul
    activeLinks.forEach(l => l.classList.add('bg-purple-50', 'text-purple-700', 'font-bold'));
    
    // Alt Menü Stilleri (Sadece mobilde varsa)
    const bottomLinks = document.querySelectorAll('.bottom-nav-btn');
    if(bottomLinks.length > 0) {
        bottomLinks.forEach(l => {
            l.classList.remove('active', 'text-purple-600');
            l.classList.add('text-gray-500');
        });
        const activeBottom = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
        if(activeBottom) {
            activeBottom.classList.add('active', 'text-purple-600');
            activeBottom.classList.remove('text-gray-500');
        }
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
// 5. BİLDİRİM VE MESAJLAR
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

        // Bildirimleri Çek (Onay Bekleyen Denemeler Örneği)
        onSnapshot(query(collectionGroup(db, 'denemeler'), where('kocId', '==', currentUserId), where('onayDurumu', '==', 'bekliyor'), limit(5)), (snap) => {
            const list = document.getElementById('coachNotificationList');
            let html = '';
            snap.forEach(doc => {
                const d = doc.data();
                html += `<div class="p-3 border-b hover:bg-gray-50 cursor-pointer" onclick="navigateToPage('denemeler')"><p class="text-xs font-bold text-gray-700">Onay Bekleyen Deneme</p><p class="text-xs text-gray-500">${d.studentAd} - ${d.ad}</p></div>`;
            });
            list.innerHTML = html || '<p class="text-center text-gray-400 text-xs py-8">Bildirim yok.</p>';
            if(!snap.empty) document.getElementById('coachNotificationDot').classList.remove('hidden');
        });
    }
}


// =================================================================
// 6. MODAL KONTROLLERİ (KAYIT İŞLEMLERİ)
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
