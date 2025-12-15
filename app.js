// =================================================================
// 0. HATA YAKALAMA
// =================================================================
window.addEventListener('error', function(e) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
    console.error("Global Hata:", e);
});

// =================================================================
// 1. FİREBASE KÜTÜPHANELERİ & MODÜLLER
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signOut, updateProfile, 
    EmailAuthProvider, reauthenticateWithCredential, deleteUser, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, updateDoc, 
    collection, query, where, orderBy, onSnapshot, limit, collectionGroup // DÜZELTME: collectionGroup EKLENDİ
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 

// --- GÜNCELLENMİŞ MODÜLLERİ İÇE AKTAR ---
import { cleanUpListeners, formatDateTR } from './modules/helpers.js';
import { renderAnaSayfa } from './modules/anasayfa.js';
import { renderOgrenciSayfasi, renderOgrenciDetaySayfasi, saveNewStudent, saveStudentChanges, deleteStudentFull } from './modules/ogrencilerim.js';
import { renderAjandaSayfasi, saveNewRandevu } from './modules/ajanda.js';
import { renderMuhasebeSayfasi, saveNewBorc, saveNewTahsilat } from './modules/muhasebe.js';
import { renderMesajlarSayfasi } from './modules/mesajlar.js';
import { renderDenemelerSayfasi } from './modules/denemeler.js';
import { renderSoruTakibiSayfasi, saveGlobalSoru } from './modules/sorutakibi.js';
import { renderHedeflerSayfasi, saveGlobalHedef } from './modules/hedefler.js';
import { renderOdevlerSayfasi, saveGlobalOdev } from './modules/odevler.js';
import { renderPaketSayfasi } from './modules/paket.js';

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
// 2. BAŞLATMA & GÜVENLİK
// =================================================================
async function main() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // Rol Kontrolü
                const userProfileRef = doc(db, "artifacts", appId, "users", user.uid, "settings", "profile");
                const userProfileSnap = await getDoc(userProfileRef);

                if (userProfileSnap.exists()) {
                    const userData = userProfileSnap.data();
                    if (userData.rol !== 'koc') {
                        await signOut(auth); 
                        alert("Bu panele sadece Koç hesapları erişebilir.");
                        window.location.href = 'student-login.html'; 
                        return; 
                    }
                } else {
                    // Profil yoksa login'e at
                    await signOut(auth);
                    window.location.href = 'login.html';
                    return;
                }
            } catch (error) {
                console.error("Yetki kontrolü hatası:", error);
                await signOut(auth);
                window.location.href = 'login.html';
                return;
            }

            currentUserId = user.uid;
            
            // Yükleme ekranını kaldır
            const spinner = document.getElementById('loadingSpinner');
            if (spinner) spinner.style.display = 'none';
            
            // Ana içeriği göster
            const container = document.getElementById('appContainer');
            if (container) container.classList.remove('hidden');
            
            updateUIForLoggedInUser(user);
            
            // İlk açılışta Anasayfa'yı yükle (History replace ile)
            window.history.replaceState({ page: 'anasayfa' }, '', '#anasayfa');
            navigateToPage('anasayfa', false);
            
            // Global Bildirim Dinleyicileri
            initCoachNotifications(user.uid); 
            
        } else {
            window.location.href = 'login.html';
        }
    });
}

// =================================================================
// 3. NAVİGASYON YÖNETİMİ
// =================================================================

function navigateToPage(pageId, addToHistory = true) {
    // 1. Önceki sayfanın dinleyicilerini temizle (PERFORMANS İÇİN KRİTİK)
    cleanUpListeners(); 
    
    // 2. Geçmişe Ekle
    if (addToHistory) {
        window.history.pushState({ page: pageId }, '', `#${pageId}`);
    }

    // 3. Aktif Link Güncellemeleri
    updateActiveLinkStyles(pageId);

    // 4. Sayfa İçeriğini Render Et
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
            case 'paketyukselt': renderPaketSayfasi(db, currentUserId, appId); break;
            default: renderAnaSayfa(db, currentUserId, appId); break;
        }
    } catch (err) {
        console.error("Sayfa yüklenirken hata:", err);
    }
}

function updateActiveLinkStyles(pageId) {
    // Masaüstü Sidebar
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-700', 'font-semibold'));
    const activeLink = document.getElementById(`nav-${pageId}`);
    if(activeLink) activeLink.classList.add('bg-purple-50', 'text-purple-700', 'font-semibold');
    
    // Mobil Bottom Nav
    document.querySelectorAll('.bottom-nav-btn').forEach(l => {
        l.classList.remove('active', 'text-purple-600');
        l.classList.add('text-gray-500');
    });
    const bottomLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if(bottomLink) {
        bottomLink.classList.add('active', 'text-purple-600');
        bottomLink.classList.remove('text-gray-500');
    }
}

// Geri Tuşu Yönetimi (Popstate)
window.addEventListener('popstate', (event) => {
    // 1. AÇIK MODALLARI KAPAT
    const openModals = document.querySelectorAll('.fixed.inset-0:not(.hidden)');
    if (openModals.length > 0) {
        openModals.forEach(modal => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        });
        return;
    }

    // 2. MOBİL MENÜYÜ KAPAT
    const drawer = document.getElementById('mobileMenuDrawer');
    if (drawer && !drawer.classList.contains('translate-x-full')) {
        closeMobileMenu();
        return;
    }

    // 3. SAYFA DEĞİŞİMİ
    if (event.state && event.state.page) {
        navigateToPage(event.state.page, false);
    }
});

// Linklere Tıklama Olayları
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-link, .bottom-nav-btn, .mobile-drawer-link').forEach(link => {
        link.addEventListener('click', (e) => {
            // Özel butonlar hariç (Menü açma vb.)
            if (link.id !== 'mobileMenuBtn' && link.id !== 'btnToggleMobileMenu') {
                e.preventDefault();
                // data-page veya ID'den sayfa adını al
                const page = link.dataset.page || (link.id ? link.id.split('-')[1] : null);
                if (page) {
                    navigateToPage(page);
                    closeMobileMenu(); // Mobildeysek menüyü kapat
                }
            }
        });
    });
});

// =================================================================
// 4. UI & KULLANICI İŞLEMLERİ
// =================================================================

function updateUIForLoggedInUser(user) {
    const displayName = user.displayName || "Koç";
    const initials = displayName.substring(0, 2).toUpperCase();

    // Profil Bilgileri
    ['userName', 'drawerUserName'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = displayName;
    });
    
    ['userEmail', 'drawerUserEmail'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = user.email;
    });

    ['userAvatar', 'drawerUserAvatar'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = initials;
    });

    // Profil Modalını Açma
    const openProfileHandler = (e) => {
        e.preventDefault();
        closeMobileMenu();
        showProfileModal(user);
    };

    const profileTriggers = [
        "userProfileArea", "btnDrawerProfileSettings", "btnMobileProfile"
    ];
    
    profileTriggers.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('click', openProfileHandler);
    });
    
    // Çıkış İşlemleri
    const handleLogout = () => signOut(auth).then(() => window.location.href = 'login.html');
    
    const logoutBtns = ["logoutButton", "btnMobileLogout"];
    logoutBtns.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('click', handleLogout);
    });
}

// Mobil Menü (Drawer) Yönetimi (SAĞDAN GELİŞ)
const mobileDrawer = document.getElementById('mobileMenuDrawer');
const overlay = document.getElementById('mobileOverlay');

function openMobileMenu() {
    if(mobileDrawer) {
        mobileDrawer.classList.remove('translate-x-full');
        if(overlay) overlay.classList.remove('hidden');
        window.history.pushState({ menuOpen: true }, '', window.location.href);
    }
}

function closeMobileMenu() {
    if(mobileDrawer) {
        mobileDrawer.classList.add('translate-x-full');
        if(overlay) overlay.classList.add('hidden');
    }
}

document.getElementById('btnToggleMobileMenu')?.addEventListener('click', openMobileMenu);
document.getElementById('btnCloseMobileMenu')?.addEventListener('click', () => window.history.back());
overlay?.addEventListener('click', () => window.history.back());

// =================================================================
// 5. GLOBAL BUTON VE MODAL İŞLEMLERİ
// =================================================================

// Kaydetme İşlemleri (Modüllerden Gelen)
document.getElementById('saveStudentButton')?.addEventListener('click', () => saveNewStudent(db, currentUserId, appId));
document.getElementById('saveStudentChangesButton')?.addEventListener('click', () => saveStudentChanges(db, currentUserId, appId));
document.getElementById('btnDeleteStudent')?.addEventListener('click', () => deleteStudentFull(db, currentUserId, appId));

// Modüllerden Kayıt Butonları
document.getElementById('saveSoruButton')?.addEventListener('click', () => saveGlobalSoru(db, currentUserId, appId));
document.getElementById('saveHedefButton')?.addEventListener('click', () => saveGlobalHedef(db, currentUserId, appId));
document.getElementById('saveOdevButton')?.addEventListener('click', () => saveGlobalOdev(db, currentUserId, appId));
document.getElementById('saveRandevuButton')?.addEventListener('click', () => saveNewRandevu(db, currentUserId, appId));
document.getElementById('saveTahsilatButton')?.addEventListener('click', () => saveNewTahsilat(db, currentUserId, appId));
document.getElementById('saveBorcButton')?.addEventListener('click', () => saveNewBorc(db, currentUserId, appId));

// Global Fonksiyon Ataması (HTML'den çağrılanlar için)
window.renderOgrenciDetaySayfasi = (id, name) => renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);

// =================================================================
// 6. PROFİL YÖNETİMİ
// =================================================================
const profileModal = document.getElementById("profileModal");

async function showProfileModal(user) {
    if (!profileModal) return;
    
    document.getElementById('profileDisplayName').value = user.displayName || '';
    
    // Paket Bilgilerini Çek
    try {
        const docRef = doc(db, "artifacts", appId, "users", user.uid, "settings", "profile");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const d = docSnap.data();
            document.getElementById('profilePaketAdi').textContent = d.paketAdi || "Standart";
            document.getElementById('profilePaketBitis').textContent = d.uyelikBitis ? formatDateTR(d.uyelikBitis) : "-";
            document.getElementById('profilePaketLimit').textContent = (d.maxOgrenci || 0) + " Öğrenci";
        }
    } catch (e) { console.error(e); }

    profileModal.classList.remove('hidden');
    profileModal.style.display = 'flex';
}

// Profil Kaydet
document.getElementById('btnSaveName')?.addEventListener('click', async () => {
    const n = document.getElementById('profileDisplayName').value.trim();
    if (!n) return;
    await updateProfile(auth.currentUser, { displayName: n });
    alert("Profil güncellendi.");
    window.location.reload();
});

// Şifre Sıfırla
document.getElementById('btnResetPassword')?.addEventListener('click', async () => {
    try { 
        await sendPasswordResetEmail(auth, auth.currentUser.email); 
        alert("E-posta adresinize sıfırlama bağlantısı gönderildi."); 
    } catch(e) { alert("Hata: " + e.message); }
});

// Hesabı Sil
document.getElementById('btnDeleteAccount')?.addEventListener('click', async () => {
    const p = document.getElementById('deleteConfirmPassword');
    p.classList.remove('hidden');
    if (!p.value) { alert("Silmek için şifrenizi girin."); return; }
    
    if (!confirm("Hesabınızı kalıcı olarak silinecek! Emin misiniz?")) return;
    
    try {
        const c = EmailAuthProvider.credential(auth.currentUser.email, p.value);
        await reauthenticateWithCredential(auth.currentUser, c);
        await deleteUser(auth.currentUser);
        window.location.href = "login.html";
    } catch (e) { alert("Hata: " + e.message); }
});

// Profil Sekme Geçişleri
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

document.getElementById('closeProfileModalButton')?.addEventListener('click', () => {
    profileModal.classList.add('hidden');
    profileModal.style.display = 'none';
});

// =================================================================
// 7. BİLDİRİMLER (GÜNCELLENMİŞ AKILLI SİSTEM)
// =================================================================
function initCoachNotifications(uid) {
    const list = document.getElementById('coachNotificationList');
    const dot = document.getElementById('headerNotificationDot'); 
    const dropdown = document.getElementById('coachNotificationDropdown');
    const btn = document.getElementById('btnHeaderNotifications');
    const closeBtn = document.getElementById('btnCloseCoachNotifications');
    
    if(!btn || !dropdown) return;

    // Dropdown Açma/Kapama
    btn.onclick = (e) => { 
        e.stopPropagation(); 
        dropdown.classList.toggle('hidden'); 
        if(dot) dot.classList.add('hidden'); 
    };

    if(closeBtn) closeBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
    };

    // Dışarı tıklayınca kapat
    document.addEventListener('click', (e) => { 
        if(!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    let notifications = [];

    const render = () => {
        // Tarihe göre sırala (Yeniden eskiye) - Burada basitlik için sıralamayı query hallediyor
        if (notifications.length > 0) {
            if(dot) dot.classList.remove('hidden');
            list.innerHTML = notifications.map(n => `
                <div class="p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors group" onclick="${n.action}">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">${n.title}</p>
                            <p class="text-xs text-gray-500 line-clamp-1">${n.desc}</p>
                        </div>
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-medium ${n.badgeClass}">${n.badgeText}</span>
                    </div>
                </div>`).join('');
        } else {
            if(dot) dot.classList.add('hidden');
            list.innerHTML = '<p class="text-center text-gray-400 text-xs py-8">Bildirim yok.</p>';
        }
    };

    // 1. Yaklaşan Seanslar
    const today = new Date().toISOString().split('T')[0];
    onSnapshot(query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("tarih", ">=", today), orderBy("tarih", "asc"), limit(3)), (snap) => {
        notifications = notifications.filter(n => n.type !== 'seans'); 
        snap.forEach(d => {
            const data = d.data();
            notifications.push({
                type: 'seans',
                title: 'Yaklaşan Seans',
                desc: `${data.ogrenciAd} - ${formatDateTR(data.tarih)} ${data.baslangic}`,
                badgeText: 'Seans',
                badgeClass: 'bg-blue-100 text-blue-700',
                action: "document.getElementById('nav-ajandam').click()"
            });
        });
        render();
    });

    // 2. Onay Bekleyen Ödevler
    onSnapshot(query(collectionGroup(db, 'odevler'), where('kocId', '==', uid), where('durum', '==', 'tamamlandi'), where('onayDurumu', '==', 'bekliyor'), limit(5)), (snap) => {
        notifications = notifications.filter(n => n.type !== 'odev');
        snap.forEach(d => {
            const data = d.data();
            const studentId = d.ref.parent.parent.id;
            notifications.push({
                type: 'odev',
                title: 'Ödev Onayı Bekliyor',
                desc: data.title,
                badgeText: 'Ödev',
                badgeClass: 'bg-orange-100 text-orange-700',
                // Tıklayınca Öğrenci Detay Sayfasını Açar
                action: `renderOgrenciDetaySayfasi('${studentId}', 'Öğrenci'); window.navigateToPage('ogrencilerim')`
            });
        });
        render();
    });

    // 3. Onay Bekleyen Sorular (YENİ EKLENDİ)
    onSnapshot(query(collectionGroup(db, 'soruTakibi'), where('kocId', '==', uid), where('onayDurumu', '==', 'bekliyor'), limit(5)), (snap) => {
        notifications = notifications.filter(n => n.type !== 'soru');
        snap.forEach(d => {
            const data = d.data();
            // Bu sefer direkt Soru Takibi sayfasına gönderiyoruz
            notifications.push({
                type: 'soru',
                title: 'Soru Onayı Bekliyor',
                desc: `${data.ders} - ${data.adet} Soru`,
                badgeText: 'Soru',
                badgeClass: 'bg-yellow-100 text-yellow-700',
                action: `window.navigateToPage('sorutakibi')`
            });
        });
        render();
    });

    // 4. Mesajlar (Badge)
    onSnapshot(query(collectionGroup(db, 'mesajlar'), where('kocId', '==', uid), where('gonderen', '==', 'ogrenci'), where('okundu', '==', false)), (snap) => {
        const count = snap.size;
        const msgBadge = document.getElementById('headerUnreadMsgCount');
        if (msgBadge) {
            if(count > 0) {
                msgBadge.textContent = count > 9 ? '9+' : count;
                msgBadge.classList.remove('hidden');
            } else {
                msgBadge.classList.add('hidden');
            }
        }
    });
}

// BAŞLAT

main();
