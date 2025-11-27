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

// Modül Importları (DÜZELTME: renderStudentOptions eklendi)
import { 
    cleanUpListeners, 
    populateStudentSelect, 
    renderDersSecimi, 
    renderStudentOptions, // EKLENDİ
    renderPlaceholderSayfasi, 
    formatDateTR 
} from './modules/helpers.js';

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
            if (spinner) spinner.style.display = 'none';
            
            const container = document.getElementById('appContainer');
            if (container) container.classList.remove('hidden');
            
            updateUIForLoggedInUser(user);
            navigateToPage('anasayfa');
            
            // Bildirimleri başlat
            initNotifications(user.uid); 
        } else {
            window.location.href = 'login.html';
        }
    });
}

// =================================================================
// 3. UI & NAVİGASYON
// =================================================================

function updateUIForLoggedInUser(user) {
    const displayName = user.displayName || "Koç";
    const initials = displayName.substring(0, 2).toUpperCase();

    // Profil Bilgileri
    if(document.getElementById("userName")) document.getElementById("userName").textContent = displayName;
    if(document.getElementById("userEmail")) document.getElementById("userEmail").textContent = user.email;
    if(document.getElementById("userAvatar")) document.getElementById("userAvatar").textContent = initials;
    
    if(document.getElementById("drawerUserName")) document.getElementById("drawerUserName").textContent = displayName;
    if(document.getElementById("drawerUserEmail")) document.getElementById("drawerUserEmail").textContent = user.email;
    if(document.getElementById("drawerUserAvatar")) document.getElementById("drawerUserAvatar").textContent = initials;

    // Profil Tıklama
    const openProfileHandler = (e) => {
        e.preventDefault();
        const drawer = document.getElementById('mobileMenuDrawer');
        const overlay = document.getElementById('mobileOverlay');
        if (drawer && !drawer.classList.contains('translate-x-full')) {
             drawer.classList.add('translate-x-full');
             if(overlay) overlay.classList.add('hidden');
        }
        showProfileModal(user);
    };

    const desktopProfile = document.getElementById("userProfileArea");
    if (desktopProfile) desktopProfile.onclick = openProfileHandler;

    const headerProfile = document.getElementById("headerCoachProfile");
    if (headerProfile) headerProfile.onclick = openProfileHandler;
    
    const btnDrawerSettings = document.getElementById("btnDrawerProfileSettings");
    if (btnDrawerSettings) btnDrawerSettings.onclick = openProfileHandler;

    const btnMobileProfileList = document.getElementById("btnMobileProfile");
    if (btnMobileProfileList) btnMobileProfileList.onclick = openProfileHandler;
    
    // Çıkış
    const handleLogout = () => signOut(auth).then(() => window.location.href = 'login.html');
    if(document.getElementById("logoutButton")) document.getElementById("logoutButton").onclick = handleLogout;
    if(document.getElementById("btnMobileLogout")) document.getElementById("btnMobileLogout").onclick = handleLogout;

    // Navigasyon
    document.querySelectorAll('.nav-link, .bottom-nav-btn, .mobile-drawer-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.id !== 'mobileMenuBtn' && link.id !== 'btnToggleMobileMenu') {
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

// --- MOBİL MENÜ KONTROLÜ ---
const mobileDrawer = document.getElementById('mobileMenuDrawer');
const overlay = document.getElementById('mobileOverlay');
const headerMenuBtn = document.getElementById('mobileMenuBtn'); 
const bottomMenuBtn = document.getElementById('btnToggleMobileMenu'); 
const closeDrawerBtn = document.getElementById('btnCloseMobileMenu'); 

function openMobileMenu() {
    if(mobileDrawer) mobileDrawer.classList.remove('translate-x-full');
    if(overlay) overlay.classList.remove('hidden');
}

function closeMobileMenu() {
    if(mobileDrawer) mobileDrawer.classList.add('translate-x-full');
    if(overlay) overlay.classList.add('hidden');
}

if(headerMenuBtn) headerMenuBtn.onclick = openMobileMenu;
if(bottomMenuBtn) bottomMenuBtn.onclick = openMobileMenu;
if(closeDrawerBtn) closeDrawerBtn.onclick = closeMobileMenu;
if(overlay) overlay.onclick = closeMobileMenu;


// Sayfa Yönlendirme
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
        console.error("Sayfa yüklenirken hata:", err);
        alert("Sayfa yüklenirken bir hata oluştu: " + err.message);
    }
}

// =================================================================
// BİLDİRİMLER
// =================================================================
function initNotifications(uid) {
    const list = document.getElementById('coachNotificationList');
    const dot = document.getElementById('coachNotificationDot');
    const dropdown = document.getElementById('coachNotificationDropdown');
    const btn = document.getElementById('btnHeaderNotifications');
    
    if(!btn || !dropdown) return;

    btn.onclick = (e) => { 
        e.stopPropagation(); 
        dropdown.classList.toggle('hidden'); 
        if (!dropdown.classList.contains('hidden')) {
            dropdown.classList.remove('scale-95', 'opacity-0');
        } else {
            dropdown.classList.add('scale-95', 'opacity-0');
        }
        dot.classList.add('hidden'); 
    };

    document.addEventListener('click', (e) => { 
        if(!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.add('hidden', 'scale-95', 'opacity-0');
        }
    });

    const closeBtn = document.getElementById('btnCloseCoachNotifications');
    if(closeBtn) closeBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden', 'scale-95', 'opacity-0');
    };

    let notifications = { appointments: [], pendingQuestions: [], pendingExams: [] };

    const renderNotifications = () => {
        const all = [...notifications.appointments, ...notifications.pendingQuestions, ...notifications.pendingExams];
        if (all.length > 0) {
            dot.classList.remove('hidden');
            let html = '';
            all.forEach(item => {
                html += `
                <div class="p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors" onclick="${item.action || ''}">
                    <div class="flex justify-between items-start">
                        <div><p class="text-xs font-bold text-gray-800">${item.title}</p><p class="text-xs text-gray-500 line-clamp-1">${item.desc}</p></div>
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-medium ${item.badgeClass}">${item.badgeText}</span>
                    </div>
                </div>`;
            });
            list.innerHTML = html;
        } else {
            dot.classList.add('hidden');
            list.innerHTML = `<div class="flex flex-col items-center justify-center py-8 text-gray-400"><i class="fa-regular fa-bell-slash text-2xl mb-2 opacity-20"></i><p class="text-xs">Yeni bildirim yok.</p></div>`;
        }
    };

    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tStr = tomorrow.toISOString().split('T')[0];
    onSnapshot(query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("tarih", "==", tStr)), (snap) => {
        notifications.appointments = [];
        snap.forEach(d => {
            const data = d.data();
            notifications.appointments.push({ title: 'Yarınki Randevu', desc: `${data.baslangic} - ${data.ogrenciAd}`, badgeText: 'Ajanda', badgeClass: 'bg-blue-100 text-blue-700', action: "document.getElementById('nav-ajandam').click()" });
        });
        renderNotifications();
    });

    onSnapshot(query(collectionGroup(db, 'soruTakibi'), where('kocId', '==', uid), where('onayDurumu', '==', 'bekliyor'), limit(5)), (snap) => {
        notifications.pendingQuestions = [];
        snap.forEach(d => {
            const data = d.data();
            notifications.pendingQuestions.push({ title: 'Soru Onayı Bekliyor', desc: `${formatDateTR(data.tarih)} - ${data.ders}`, badgeText: 'Onay', badgeClass: 'bg-yellow-100 text-yellow-700', action: "document.getElementById('nav-sorutakibi').click()" });
        });
        renderNotifications();
    });

    onSnapshot(query(collectionGroup(db, 'denemeler'), where('kocId', '==', uid), where('onayDurumu', '==', 'bekliyor'), limit(5)), (snap) => {
        notifications.pendingExams = [];
        snap.forEach(d => {
            const data = d.data();
            notifications.pendingExams.push({ title: 'Deneme Onayı Bekliyor', desc: `${data.studentAd || 'Öğrenci'} - ${data.tur} Denemesi`, badgeText: 'Onay', badgeClass: 'bg-purple-100 text-purple-700', action: "document.getElementById('nav-denemeler').click()" });
        });
        renderNotifications();
    });
}

if(document.getElementById('btnHeaderMessages')) {
    document.getElementById('btnHeaderMessages').onclick = () => navigateToPage('mesajlar');
}

// =================================================================
// 4. MODAL KONTROLLERİ
// =================================================================

function addListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

const closeButtons = [
    '.close-modal-btn',
    '#closeModalButton', '#cancelModalButton', 
    '#closeEditModalButton', '#cancelEditModalButton', 
    '#closeDenemeModalButton', '#cancelDenemeModalButton', 
    '#closeSoruModalButton', '#cancelSoruModalButton', 
    '#closeHedefModalButton', '#cancelHedefModalButton', 
    '#closeOdevModalButton', '#cancelOdevModalButton', 
    '#closeRandevuModalButton', '#cancelRandevuModalButton', 
    '#closeEditRandevuModalButton', '#cancelEditRandevuModalButton', 
    '#closeTahsilatModalButton', '#cancelTahsilatModalButton', 
    '#closeBorcModalButton', '#cancelBorcModalButton', 
    '#closeProfileModalButton'
];

document.querySelectorAll(closeButtons.join(', ')).forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.fixed');
        if(modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none'; 
        }
    });
});

// Kayıt Butonları
addListener('saveStudentButton', 'click', () => saveNewStudent(db, currentUserId, appId));
addListener('saveStudentChangesButton', 'click', () => saveStudentChanges(db, currentUserId, appId));

// YENİ: Sınıf Seçimi Dinleyicileri (Ders/Alan seçimi için)
addListener('studentClass', 'change', (e) => {
    renderStudentOptions(e.target.value, 'studentOptionsContainer', 'studentDersSecimiContainer');
});
addListener('editStudentClass', 'change', (e) => {
    renderStudentOptions(e.target.value, 'editStudentOptionsContainer', 'editStudentDersSecimiContainer');
});

addListener('saveDenemeButton', 'click', () => saveGlobalDeneme(db, currentUserId, appId));
addListener('denemeTuru', 'change', (e) => renderDenemeNetInputs(e.target.value));

addListener('saveSoruButton', 'click', () => saveGlobalSoru(db, currentUserId, appId));

addListener('saveHedefButton', 'click', () => saveGlobalHedef(db, currentUserId, appId));
addListener('saveOdevButton', 'click', () => saveGlobalOdev(db, currentUserId, appId));

addListener('saveRandevuButton', 'click', () => saveNewRandevu(db, currentUserId, appId));

addListener('saveTahsilatButton', 'click', () => saveNewTahsilat(db, currentUserId, appId));
addListener('saveBorcButton', 'click', () => saveNewBorc(db, currentUserId, appId));

// Window Helpers
window.renderOgrenciDetaySayfasi = (id, name) => renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);


// --- PROFİL MODALI ---
const profileModal = document.getElementById("profileModal");

function showProfileModal(user) {
    if (!profileModal) return;
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    document.getElementById('deleteConfirmPassword').value = '';
    const err = document.getElementById('profileError');
    if(err) err.classList.add('hidden');

    const tabBtn = document.querySelector('.profile-tab-button[data-tab="hesap"]');
    if(tabBtn) tabBtn.click();
    
    profileModal.classList.remove('hidden');
    profileModal.style.display = ''; 
}
window.showProfileModal = showProfileModal;

if(profileModal) {
    profileModal.addEventListener('click', (e) => {
        if(e.target === profileModal) {
            profileModal.classList.add('hidden');
            profileModal.style.display = 'none';
        }
    });
}

document.querySelectorAll('.profile-tab-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.profile-tab-button').forEach(b => {
            b.classList.remove('active', 'bg-purple-100', 'text-purple-700');
            b.classList.add('text-gray-500', 'hover:bg-gray-200');
        });
        e.currentTarget.classList.add('active', 'bg-purple-100', 'text-purple-700');
        const tabId = e.currentTarget.dataset.tab;
        document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    });
});

addListener('btnSaveName', 'click', async () => {
    const n = document.getElementById('profileDisplayName').value.trim();
    if (!n) return;
    await updateProfile(auth.currentUser, { displayName: n });
    alert("Güncellendi."); window.location.reload();
});

addListener('btnResetPassword', 'click', async () => {
    try { await sendPasswordResetEmail(auth, auth.currentUser.email); alert("E-posta gönderildi."); } catch(e) { alert("Hata: " + e.message); }
});

addListener('btnDeleteAccount', 'click', async () => {
    const p = document.getElementById('deleteConfirmPassword').value;
    if (!p) return alert("Şifre girin.");
    if (!confirm("Hesabınızı silmek istediğinize emin misiniz?")) return;
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

// BAŞLAT
main();
