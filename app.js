// =================================================================
// 0. HATA YAKALAMA
// =================================================================
window.addEventListener('error', function(e) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
    console.error("Global Hata:", e);
});

// =================================================================
// 1. FİREBASE VE IMPORTLAR
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile, EmailAuthProvider, reauthenticateWithCredential, deleteUser, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, collectionGroup, query, where, orderBy, onSnapshot, getDocs, serverTimestamp, writeBatch, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 

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
            
            // UI Hazırla
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('appContainer').classList.remove('hidden');
            
            updateUIForLoggedInUser(user);
            navigateToPage('anasayfa');
            
            // Bildirimleri Başlat
            initNotifications(user.uid);
            
        } else {
            window.location.href = 'login.html';
        }
    });
}
// UI GÜNCELLEME & PROFİL
function updateUIForLoggedInUser(user) {
    const displayName = user.displayName || "Koç";
    const initials = displayName.substring(0, 2).toUpperCase();
    
    // Masaüstü Sidebar
    if(document.getElementById("userName")) document.getElementById("userName").textContent = name;
    if(document.getElementById("userEmail")) document.getElementById("userEmail").textContent = email;
    if(document.getElementById("userAvatar")) document.getElementById("userAvatar").textContent = initials;

    // Mobil Drawer Profil (YENİ)
    if(document.getElementById("drawerUserName")) document.getElementById("drawerUserName").textContent = name;
    if(document.getElementById("drawerUserEmail")) document.getElementById("drawerUserEmail").textContent = email;
    if(document.getElementById("drawerUserAvatar")) document.getElementById("drawerUserAvatar").textContent = initials;

    // Profil Tıklama Olayları (Masaüstü ve Mobil)
    const openProfile = (e) => {
        e.preventDefault();
        closeMobileMenu();
        showProfileModal(user);
    };

    if(document.getElementById("userProfileArea")) document.getElementById("userProfileArea").onclick = openProfile;
    if(document.getElementById("btnDrawerProfile")) document.getElementById("btnDrawerProfile").onclick = openProfile;

    // Header Profili
    const headerName = document.getElementById("headerName");
    const headerAvatar = document.getElementById("headerAvatar");
    if(headerName) headerName.textContent = displayName;
    if(headerAvatar) headerAvatar.textContent = initials;
    
    const profileHeader = document.getElementById("headerCoachProfile");
    if(profileHeader) profileHeader.onclick = () => showProfileModal(user);

    // Çıkış
    const logout = () => signOut(auth).then(() => window.location.href = 'login.html');
    if(document.getElementById("logoutButton")) document.getElementById("logoutButton").onclick = logout;
    if(document.getElementById("btnMobileLogout")) document.getElementById("btnMobileLogout").onclick = logout;

     // Navigasyon
    document.querySelectorAll('.nav-link, .bottom-nav-btn, .mobile-drawer-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.id === 'btnToggleMobileMenu') return;
            e.preventDefault();
            const page = link.dataset.page || (link.id ? link.id.split('-')[1] : null);
            if (page) {
                navigateToPage(page);
                closeMobileMenu();

            }
        });
    });
}

// =================================================================
// 3. BİLDİRİM SİSTEMİ (YENİ)
// =================================================================

function initNotifications(uid) {
    // 1. Mesaj İkonu
    const btnMsg = document.getElementById('btnHeaderMessages');
    if(btnMsg) {
        btnMsg.onclick = () => navigateToPage('mesajlar');
        // Okunmamış Sayısı
        onSnapshot(query(collectionGroup(db, 'mesajlar'), where('kocId', '==', uid), where('gonderen', '==', 'ogrenci'), where('okundu', '==', false)), (snap) => {
            const b = document.getElementById('headerUnreadMsgCount');
            if(snap.size > 0) { b.textContent = snap.size; b.classList.remove('hidden'); } else b.classList.add('hidden');
        });
    }

    // 2. Bildirim İkonu
    const btnNotif = document.getElementById('btnHeaderNotifications');
    const dropNotif = document.getElementById('coachNotificationDropdown');
    const list = document.getElementById('coachNotificationList');
    const dot = document.getElementById('headerNotificationDot');

    if(btnNotif && dropNotif) {
        btnNotif.onclick = (e) => {
            e.stopPropagation();
            dropNotif.classList.toggle('hidden');
            dropNotif.classList.toggle('opacity-0'); // Animasyon için
            dot.classList.add('hidden'); // Okundu say
        };
        document.getElementById('btnCloseCoachNotifications').onclick = () => dropNotif.classList.add('hidden');
        document.addEventListener('click', (e) => { if(!dropNotif.contains(e.target) && !btnNotif.contains(e.target)) dropNotif.classList.add('hidden'); });

        // Bildirimleri Topla (Manuel Birleştirme)
        const notifications = [];
        
        // A. Yarınki Randevular
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const tStr = tomorrow.toISOString().split('T')[0];
        
        onSnapshot(query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("tarih", "==", tStr)), (snap) => {
            snap.forEach(d => notifications.push({ type: 'randevu', ...d.data(), time: d.data().baslangic }));
            renderNotifications(notifications, list, dot);
        });

        // B. Onay Bekleyen Denemeler (Son 5)
        onSnapshot(query(collectionGroup(db, 'denemeler'), where('kocId', '==', uid), where('onayDurumu', '==', 'bekliyor'), limit(5)), (snap) => {
            snap.forEach(d => notifications.push({ type: 'deneme', ...d.data(), time: d.data().tarih }));
            renderNotifications(notifications, list, dot);
        });
    }
}

function renderNotifications(data, list, dot) {
    // Basit sıralama ve render
    // (Gerçek uygulamada tarih alanlarını standartlaştırıp sıralamak gerekir)
    if(data.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-400 text-xs py-8">Bildirim yok.</p>';
        return;
    }
    
    let html = '';
    data.forEach(n => {
        let icon = '', title = '', desc = '';
        if(n.type === 'randevu') { icon = 'fa-calendar-days text-blue-500'; title = 'Yarınki Randevu'; desc = `${n.baslangic} - ${n.ogrenciAd}`; }
        else if(n.type === 'deneme') { icon = 'fa-chart-line text-orange-500'; title = 'Deneme Onayı'; desc = `${n.studentAd} - ${n.ad}`; }
        
        html += `
        <div class="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3 items-start">
            <div class="mt-1"><i class="fa-solid ${icon}"></i></div>
            <div>
                <p class="text-xs font-bold text-gray-700">${title}</p>
                <p class="text-xs text-gray-500">${desc}</p>
            </div>
        </div>`;
    });
    
    list.innerHTML = html;
    dot.classList.remove('hidden');
}

// MOBİL MENÜ (DRAWER)
const drawer = document.getElementById('mobileMenuDrawer');
const overlay = document.getElementById('mobileOverlay');
const btnMenu = document.getElementById('btnToggleMobileMenu'); // ID'yi düzelttim
const btnCloseDrawer = document.getElementById('btnCloseMobileMenu');

if(btnMenu) btnMenu.onclick = () => {
    drawer.classList.remove('translate-x-full');
    overlay.classList.remove('hidden');
};

function closeMobileMenu() {
    drawer.classList.add('translate-x-full');
    overlay.classList.add('hidden');
}
if(overlay) overlay.onclick = closeMobileMenu;
if(btnCloseDrawer) btnCloseDrawer.onclick = closeMobileMenu;

// SAYFA YÖNLENDİRME
function navigateToPage(pageId) {
    cleanUpListeners();
    
    // Link Stilleri
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-700', 'font-bold'));
    const activeLinks = document.querySelectorAll(`[data-page="${pageId}"], #nav-${pageId}`);
    activeLinks.forEach(l => l.classList.add('bg-purple-50', 'text-purple-700', 'font-bold'));

    // Alt Menü Stili
    document.querySelectorAll('.bottom-nav-btn').forEach(l => {
        l.classList.remove('active', 'text-purple-600');
        l.classList.add('text-gray-500');
        const icon = l.querySelector('.bottom-nav-center-btn');
        if(icon) { icon.classList.remove('bg-purple-600', 'text-white'); icon.classList.add('bg-indigo-600', 'text-white'); }
    });
    const bottomLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if(bottomLink) {
        bottomLink.classList.add('active', 'text-purple-600');
        bottomLink.classList.remove('text-gray-500');
        const icon = bottomLink.querySelector('.bottom-nav-center-btn');
        if(icon) icon.classList.replace('bg-indigo-600', 'bg-purple-600');
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
            default: renderPlaceholderSayfasi("Sayfa"); break;
        }
    } catch (err) { console.error(err); }
}


// =================================================================
// 4. MODALLAR VE LISTENERS
// =================================================================


// MODAL KAPATMA
document.querySelectorAll('.close-modal-btn, #closeModalButton, #closeEditModalButton, #closeDenemeModalButton, #closeSoruModalButton, #closeHedefModalButton, #closeOdevModalButton, #closeRandevuModalButton, #closeTahsilatModalButton, #closeBorcModalButton, #closeProfileModalButton, #cancelModalButton, #cancelEditModalButton, #cancelDenemeModalButton, #cancelSoruModalButton, #cancelHedefModalButton, #cancelOdevModalButton, #cancelRandevuModalButton, #cancelTahsilatModalButton, #cancelBorcModalButton').forEach(btn => {
    btn.addEventListener('click', (e) => { const m=e.target.closest('.fixed'); if(m) m.style.display='none'; if(m) m.classList.add('hidden'); });
});
// KAYIT
function addListener(id, event, handler) { const el = document.getElementById(id); if (el) el.addEventListener(event, handler); }
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
window.renderOgrenciDetaySayfasi = (id, name) => renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);

// PROFIL MODAL
const profileModal = document.getElementById("profileModal");
function showProfileModal(user) {
    if (!profileModal) return;
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('kocDavetKodu').value = user.uid;
    document.querySelector('[data-tab="hesap"]').click();
    profileModal.classList.remove('hidden');
}
document.querySelectorAll('.profile-tab-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.profile-tab-button').forEach(b => { b.classList.remove('active', 'bg-purple-100', 'text-purple-700'); b.classList.add('text-gray-500', 'hover:bg-gray-200'); });
        e.currentTarget.classList.add('active', 'bg-purple-100', 'text-purple-700');
        const tabId = e.currentTarget.dataset.tab;
        document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    });
});
addListener('btnSaveName', 'click', async () => {
    const n = document.getElementById('profileDisplayName').value.trim(); if (!n) return;
    await updateProfile(auth.currentUser, { displayName: n }); alert("Güncellendi."); window.location.reload();
});
addListener('btnResetPassword', 'click', async () => { try { await sendPasswordResetEmail(auth, auth.currentUser.email); alert("E-posta gönderildi."); } catch(e) { alert(e.message); } });
addListener('btnDeleteAccount', 'click', async () => {
    const p = document.getElementById('deleteConfirmPassword').value; if (!p) return alert("Şifre girin.");
    if (!confirm("Silinsin mi?")) return;
    try { const c = EmailAuthProvider.credential(auth.currentUser.email, p); await reauthenticateWithCredential(auth.currentUser, c); await deleteUser(auth.currentUser); window.location.href = "login.html"; } catch (e) { alert(e.message); }
});
addListener('btnKopyala', 'click', () => { const i=document.getElementById('kocDavetKodu'); i.select(); navigator.clipboard.writeText(i.value).then(()=>alert("Kopyalandı")); });
function initNotifications() { /* Bildirim mantığı (Önceki koddan kopyalanabilir) */ }

main();
