// =================================================================
// 0. HATA YAKALAMA
// =================================================================
window.addEventListener('error', function (e) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
    console.error("Global Hata:", e);
});

// =================================================================
// 1. FİREBASE KÜTÜPHANELERİ & MODÜLLER
// =================================================================
import {
    onAuthStateChanged, signOut, updateProfile,
    EmailAuthProvider, reauthenticateWithCredential, deleteUser, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    doc, getDoc, updateDoc,
    collection, query, where, orderBy, onSnapshot, limit, collectionGroup,
    getCountFromServer
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { app, auth, db, appId } from './modules/firebase-config.js';

// --- MODÜLLER ---
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";
import { cleanUpListeners, formatDateTR, renderStudentOptions } from './modules/helpers.js';
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
                        cleanUpListeners();
                        await signOut(auth);
                        alert("Bu panele sadece Koç hesapları erişebilir.");
                        window.location.href = 'student-login.html';
                        return;
                    }
                } else {
                    cleanUpListeners();
                    await signOut(auth);
                    window.location.href = 'login.html';
                    return;
                }
            } catch (error) {
                console.error("Yetki kontrolü hatası:", error);
                cleanUpListeners();
                await signOut(auth);
                window.location.href = 'login.html';
                return;
            }

            currentUserId = user.uid;

            const spinner = document.getElementById('loadingSpinner');
            if (spinner) spinner.style.display = 'none';

            const container = document.getElementById('appContainer');
            if (container) container.classList.remove('hidden');

            updateUIForLoggedInUser(user);

            // Önce sahte bir 'root' geçmişi oluşturuyoruz
            window.history.replaceState({ page: 'root' }, '', window.location.pathname);
            // Üzerine ana sayfayı ekliyoruz
            window.history.pushState({ page: 'anasayfa' }, '', '#anasayfa');

            navigateToPage('anasayfa', false);

            // Global Bildirimler
            initCoachNotifications(user.uid);

            // --- İLK ÖĞRENCİ KONTROLÜ (YENİ) ---
            checkAndPromptFirstStudent(db, user.uid, appId);

        } else {
            window.location.href = 'login.html';
        }
    });
}
const messaging = getMessaging(app);

async function requestNotificationPermission(uid) {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Bildirim izni verildi.');

            // Token al (VAPID Key'i Firebase Console -> Project Settings -> Cloud Messaging kısmından almalısınız)
            const token = await getToken(messaging, {
                vapidKey: "1a8sASMDsVqK_lknoaGrukPo2inv-tzGL-LAC4WtsrE"
            });

            if (token) {
                // Bu token'ı kullanıcının profiline kaydetmelisiniz ki ona bildirim atabilelim
                await updateDoc(doc(db, "artifacts", appId, "users", uid, "settings", "profile"), {
                    fcmToken: token
                });
            }
        }
    } catch (error) {
        console.error('Bildirim izni hatası:', error);
    }
}
// =================================================================
// 3. NAVİGASYON YÖNETİMİ
// =================================================================

function navigateToPage(pageId, addToHistory = true) {
    cleanUpListeners();

    if (addToHistory) {
        window.history.pushState({ page: pageId }, '', `#${pageId}`);
    }

    updateActiveLinkStyles(pageId);

    try {
        switch (pageId) {
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
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-700', 'font-semibold'));
    const activeLink = document.getElementById(`nav-${pageId}`);
    if (activeLink) activeLink.classList.add('bg-purple-50', 'text-purple-700', 'font-semibold');

    document.querySelectorAll('.bottom-nav-btn').forEach(l => {
        l.classList.remove('active', 'text-purple-600');
        l.classList.add('text-gray-500');
    });
    const bottomLink = document.querySelector(`.bottom-nav-btn[data-page="${pageId}"]`);
    if (bottomLink) {
        bottomLink.classList.add('active', 'text-purple-600');
        bottomLink.classList.remove('text-gray-500');
    }
}

window.addEventListener('popstate', (event) => {
    // 1. AÇIK MODALLARI KAPAT
    const openModals = document.querySelectorAll('.fixed.inset-0:not(.hidden):not(#mobileOverlay)');
    if (openModals.length > 0) {
        openModals.forEach(modal => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        });
        // Modalı kapattıysak ve geriye bastıysak, history'i düzeltmek gerekebilir
        // ama basit kullanımda kullanıcı tekrar ileri gitmezse sorun olmaz.
        return;
    }

    // 2. MOBİL MENÜYÜ KAPAT
    const drawer = document.getElementById('mobileMenuDrawer');
    if (drawer && !drawer.classList.contains('translate-x-full')) {
        closeMobileMenu();
        return;
    }

    // --- YENİ EKLENEN KISIM: ÇIKIŞ ONAYI ---
    // Eğer kullanıcı 'root' (başlangıç) state'ine geri döndüyse (yani ana sayfadan geri bastıysa)
    if (event.state && event.state.page === 'root') {
        if (confirm("Uygulamadan çıkmak istiyor musunuz?")) {
            // Evet derse, tarayıcının daha da gerisine gitmesine izin ver (Uygulamadan çıkar veya login'e döner)
            window.history.back();
        } else {
            // Hayır derse, tekrar ana sayfayı history'e ekle ve orada kal
            window.history.pushState({ page: 'anasayfa' }, '', '#anasayfa');
        }
        return;
    }
    // ----------------------------------------

    // 3. SAYFA DEĞİŞİMİ
    if (event.state && event.state.page) {
        navigateToPage(event.state.page, false);
    }
});

// Link Listener
document.addEventListener('DOMContentLoaded', () => {
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
});

// =================================================================
// 4. UI & KULLANICI İŞLEMLERİ
// =================================================================

function updateUIForLoggedInUser(user) {
    const displayName = user.displayName || "Koç";
    const initials = displayName.substring(0, 2).toUpperCase();

    ['userName', 'drawerUserName'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = displayName;
    });
    ['userEmail', 'drawerUserEmail'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = user.email;
    });
    ['userAvatar', 'drawerUserAvatar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = initials;
    });

    const openProfileHandler = (e) => {
        e.preventDefault();
        closeMobileMenu();
        showProfileModal(user);
    };

    ["userProfileArea", "btnDrawerProfileSettings", "btnMobileProfile"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', openProfileHandler);
    });
}

const mobileDrawer = document.getElementById('mobileMenuDrawer');
const overlay = document.getElementById('mobileOverlay');

function openMobileMenu() {
    if (mobileDrawer) {
        mobileDrawer.classList.remove('translate-x-full');
        if (overlay) overlay.classList.remove('hidden');
        window.history.pushState({ menuOpen: true }, '', window.location.href);
    }
}

function closeMobileMenu() {
    if (mobileDrawer) {
        mobileDrawer.classList.add('translate-x-full');
        if (overlay) overlay.classList.add('hidden');
    }
}

function handleCloseMenuAction() {
    if (window.history.state && window.history.state.menuOpen) {
        window.history.back();
    } else {
        closeMobileMenu();
    }
}

document.getElementById('btnToggleMobileMenu')?.addEventListener('click', (e) => {
    e.preventDefault();
    openMobileMenu();
});
document.getElementById('btnCloseMobileMenu')?.addEventListener('click', handleCloseMenuAction);
overlay?.addEventListener('click', handleCloseMenuAction);

// =================================================================
// 5. GLOBAL BUTON VE MODAL İŞLEMLERİ
// =================================================================
// =================================================================
// ÇIKIŞ (LOGOUT) MODAL YÖNETİMİ
// =================================================================

// 1. Çıkış Butonlarına Tıklanınca Modalı Aç
const handleLogoutOpen = (e) => {
    e.preventDefault();
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

// Butonları Bul ve Bağla
["logoutButton", "btnMobileLogout"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
        btn.onclick = handleLogoutOpen;
    }
});

// 2. Modal İçindeki Buton İşlemleri (Vazgeç / Onayla)
const btnCancelLogout = document.getElementById('btnCancelLogout');
const btnConfirmLogout = document.getElementById('btnConfirmLogout');
const logoutModal = document.getElementById('logoutModal');

if (btnCancelLogout) {
    btnCancelLogout.addEventListener('click', () => {
        if (logoutModal) {
            logoutModal.classList.add('hidden');
            logoutModal.style.display = 'none';
        }
    });
}

if (btnConfirmLogout) {
    btnConfirmLogout.addEventListener('click', async () => {
        // Loading Efekti
        btnConfirmLogout.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Çıkılıyor...';
        btnConfirmLogout.disabled = true;

        try {
            cleanUpListeners();
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Çıkış hatası:", error);
            alert("Çıkış yapılırken bir hata oluştu.");
            btnConfirmLogout.innerHTML = 'Çıkış Yap';
            btnConfirmLogout.disabled = false;
        }
    });
}
document.getElementById('saveStudentButton')?.addEventListener('click', () => saveNewStudent(db, currentUserId, appId));
document.getElementById('saveStudentChangesButton')?.addEventListener('click', () => saveStudentChanges(db, currentUserId, appId));
document.getElementById('btnDeleteStudent')?.addEventListener('click', () => deleteStudentFull(db, currentUserId, appId));

document.getElementById('saveSoruButton')?.addEventListener('click', () => saveGlobalSoru(db, currentUserId, appId));
document.getElementById('saveHedefButton')?.addEventListener('click', () => saveGlobalHedef(db, currentUserId, appId));
document.getElementById('saveOdevButton')?.addEventListener('click', () => saveGlobalOdev(db, currentUserId, appId));
document.getElementById('saveRandevuButton')?.addEventListener('click', () => saveNewRandevu(db, currentUserId, appId));
document.getElementById('saveTahsilatButton')?.addEventListener('click', () => saveNewTahsilat(db, currentUserId, appId));
document.getElementById('saveBorcButton')?.addEventListener('click', () => saveNewBorc(db, currentUserId, appId));

window.renderOgrenciDetaySayfasi = (id, name) => renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);

// =================================================================
// 6. PROFİL YÖNETİMİ
// =================================================================
const profileModal = document.getElementById("profileModal");

async function showProfileModal(user) {
    if (!profileModal) return;
    document.getElementById('profileDisplayName').value = user.displayName || '';

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

document.getElementById('btnSaveName')?.addEventListener('click', async () => {
    const n = document.getElementById('profileDisplayName').value.trim();
    if (!n) return;
    await updateProfile(auth.currentUser, { displayName: n });
    alert("Profil güncellendi.");
    window.location.reload();
});

document.getElementById('btnResetPassword')?.addEventListener('click', async () => {
    try {
        await sendPasswordResetEmail(auth, auth.currentUser.email);
        alert("E-posta adresinize sıfırlama bağlantısı gönderildi.");
    } catch (e) { alert("Hata: " + e.message); }
});

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
// 7. BİLDİRİMLER
// =================================================================
// =================================================================
// 7. BİLDİRİMLER (GÜNCELLENMİŞ VE DÜZELTİLMİŞ HALİ)
// =================================================================
function initCoachNotifications(uid) {
    const list = document.getElementById('coachNotificationList');
    const dot = document.getElementById('headerNotificationDot');
    const dropdown = document.getElementById('coachNotificationDropdown');
    const btn = document.getElementById('btnHeaderNotifications');
    const closeBtn = document.getElementById('btnCloseCoachNotifications');
    const msgBadge = document.getElementById('headerUnreadMsgCount');

    // Bildirim Sesi
    const notificationSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");

    // Autoplay Politikası Çözümü: İlk etkileşimde sesi yükle
    const unlockAudio = () => {
        notificationSound.play().then(() => {
            notificationSound.pause();
            notificationSound.currentTime = 0;
        }).catch(() => { });
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    // --- 1. MENÜ AÇMA/KAPAMA VE GÖRSEL DÜZELTME ---
    if (btn && dropdown) {
        // [ÖNEMLİ DÜZELTME] Dropdown'ı en öne getirmek için z-index ayarı
        dropdown.style.zIndex = "9999";
        dropdown.style.position = "absolute";

        btn.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
            if (dot) dot.classList.add('hidden');
        };
        if (closeBtn) closeBtn.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.add('hidden');
        };
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) dropdown.classList.add('hidden');
        });
    }

    // --- 2. MESAJ ROZETİNE TIKLAYINCA GİT ---
    if (msgBadge) {
        const msgBtn = msgBadge.closest('button') || msgBadge.parentElement;
        if (msgBtn) {
            msgBtn.style.cursor = 'pointer';
            msgBtn.onclick = () => window.navigateToPage('mesajlar');
        }
    }

    // --- 3. BİLDİRİM VERİLERİNİ TOPLA ---
    // Tüm bildirimleri tek bir havuzda toplayıp tarih sırasına göre göstereceğiz
    let notifications = {
        ajanda: [],
        odevler: [],
        hedefler: [],
        sorular: []
    };

    const renderNotifications = () => {
        if (!list) return;

        // Hepsini birleştir ve zamana göre (yeniden eskiye) sırala
        const allItems = [
            ...notifications.ajanda,
            ...notifications.odevler,
            ...notifications.hedefler,
            ...notifications.sorular
        ].sort((a, b) => b.timestamp - a.timestamp);

        if (allItems.length === 0) {
            list.innerHTML = '<p class="text-center text-gray-400 text-xs py-8">Yeni bildirim yok.</p>';
            if (dot) dot.classList.add('hidden');
        } else {
            if (dot) dot.classList.remove('hidden');

            list.innerHTML = allItems.map(item => `
                <div class="p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors group relative" onclick="window.navigateToPage('${item.page}')">
                    <div class="flex justify-between items-start gap-2">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${item.badgeClass}">${item.type}</span>
                                <span class="text-[10px] text-gray-400">${item.timeStr}</span>
                            </div>
                            <p class="text-xs font-bold text-gray-800 group-hover:text-indigo-600 line-clamp-2">${item.title}</p>
                            <p class="text-[10px] text-gray-500 mt-0.5">${item.desc}</p>
                        </div>
                        <i class="fa-solid fa-chevron-right text-gray-300 text-xs mt-2"></i>
                    </div>
                </div>`
            ).join('');
        }
    };

    // Ses Çalma Kontrolü (Sayfa ilk açıldığında ötmesin)
    let firstLoad = true;
    const playSound = () => {
        if (!firstLoad) {
            notificationSound.play().catch(e => console.log("Ses çalınamadı:", e));
        }
    };
    setTimeout(() => { firstLoad = false; }, 3000);

    const todayStr = new Date().toISOString().split('T')[0];

    // --- A. AJANDA (Sadece Bugün) ---
    if (activeListeners.coachAjandaNotifUnsubscribe) activeListeners.coachAjandaNotifUnsubscribe();
    activeListeners.coachAjandaNotifUnsubscribe = onSnapshot(query(collection(db, "artifacts", appId, "users", uid, "ajandam"),
        where("tarih", "==", todayStr),
        orderBy("baslangic", "asc")), (snap) => {

            notifications.ajanda = [];
            if (!snap.empty && snap.docChanges().some(c => c.type === 'added')) playSound();

            snap.forEach(d => {
                const data = d.data();
                notifications.ajanda.push({
                    type: 'AJANDA', badgeClass: 'bg-blue-100 text-blue-700',
                    title: data.title || 'Seans',
                    desc: `${data.ogrenciAd} ile ${data.baslangic} saatinde`,
                    timeStr: 'Bugün', page: 'ajandam', timestamp: new Date().getTime()
                });
            });
            renderNotifications();
        });

    // --- B. ONAY BEKLEYEN ÖDEVLER ---
    if (activeListeners.coachOdevNotifUnsubscribe) activeListeners.coachOdevNotifUnsubscribe();
    activeListeners.coachOdevNotifUnsubscribe = onSnapshot(query(collectionGroup(db, 'odevler'),
        where('kocId', '==', uid),
        where('onayDurumu', '==', 'bekliyor'),
        where('durum', '==', 'tamamlandi')), (snap) => {

            notifications.odevler = [];
            if (!snap.empty && snap.docChanges().some(c => c.type === 'added')) playSound();

            snap.forEach(d => {
                const data = d.data();
                notifications.odevler.push({
                    type: 'ÖDEV ONAY', badgeClass: 'bg-orange-100 text-orange-700',
                    title: data.title,
                    desc: `${formatDateTR(data.bitisTarihi)} tarihli ödev onay bekliyor`,
                    timeStr: 'Bekliyor', page: 'odevler', timestamp: data.eklenmeTarihi?.seconds * 1000 || 0
                });
            });
            renderNotifications();
        }, (error) => {
            console.error("ÖDEV BİLDİRİM HATASI (Index eksik olabilir):", error);
        });

    // --- C. GECİKEN HEDEFLER ---
    if (activeListeners.coachHedefNotifUnsubscribe) activeListeners.coachHedefNotifUnsubscribe();
    activeListeners.coachHedefNotifUnsubscribe = onSnapshot(query(collectionGroup(db, 'hedefler'),
        where('kocId', '==', uid),
        where('durum', '==', 'devam')), (snap) => {

            notifications.hedefler = [];
            let hasOverdue = false;

            snap.forEach(d => {
                const data = d.data();
                if (data.bitisTarihi && data.bitisTarihi < todayStr) {
                    hasOverdue = true;
                    notifications.hedefler.push({
                        type: 'GECİKEN HEDEF', badgeClass: 'bg-red-100 text-red-700',
                        title: data.title,
                        desc: `${formatDateTR(data.bitisTarihi)} tarihli hedef gecikti!`,
                        timeStr: 'Gecikti', page: 'hedefler', timestamp: data.olusturmaTarihi?.seconds * 1000 || 0
                    });
                }
            });
            if (hasOverdue && !firstLoad) playSound();
            renderNotifications();
        }, (error) => {
            console.error("HEDEF BİLDİRİM HATASI (Index eksik olabilir):", error);
        });

    // --- D. SORU TAKİBİ (TEK BİLDİRİM MANTIĞI) ---
    if (activeListeners.coachSoruNotifUnsubscribe) activeListeners.coachSoruNotifUnsubscribe();
    activeListeners.coachSoruNotifUnsubscribe = onSnapshot(query(collectionGroup(db, 'soruTakibi'),
        where('kocId', '==', uid),
        where('onayDurumu', '==', 'bekliyor')), (snap) => {

            notifications.sorular = [];

            // Eğer bekleyen soru varsa TEK BİR bildirim oluştur
            if (!snap.empty) {
                if (snap.docChanges().some(c => c.type === 'added')) playSound();

                const count = snap.size; // Toplam bekleyen kayıt sayısı

                notifications.sorular.push({
                    type: 'SORU TAKİBİ',
                    badgeClass: 'bg-purple-100 text-purple-700',
                    title: 'Onay Bekleyen Sorular',
                    desc: `${count} adet soru girişi onayınızı bekliyor.`,
                    timeStr: 'Yeni',
                    page: 'sorutakibi',
                    timestamp: new Date().getTime() // En üste çıksın
                });
            }

            renderNotifications();
        }, (error) => {
            console.error("SORU TAKİBİ BİLDİRİM HATASI (Index kontrol edin):", error);
        });

    // --- E. MESAJ SAYACI ---
    if (activeListeners.coachMsgNotifUnsubscribe) activeListeners.coachMsgNotifUnsubscribe();
    activeListeners.coachMsgNotifUnsubscribe = onSnapshot(query(collectionGroup(db, 'mesajlar'), where('kocId', '==', uid), where('gonderen', '==', 'ogrenci'), where('okundu', '==', false)), (snap) => {
        const count = snap.size;
        if (msgBadge) {
            if (count > 0) {
                msgBadge.textContent = count > 9 ? '9+' : count;
                msgBadge.classList.remove('hidden');
                if (snap.docChanges().some(c => c.type === 'added')) playSound();
            } else {
                msgBadge.classList.add('hidden');
            }
        }
    });
}
// =================================================================
// 8. İLK ÖĞRENCİ KONTROLÜ (YENİ EKLENDİ)
// =================================================================
async function checkAndPromptFirstStudent(db, uid, appId) {
    try {
        const coll = collection(db, "artifacts", appId, "users", uid, "ogrencilerim");
        const snapshot = await getCountFromServer(coll);
        const count = snapshot.data().count;

        if (count === 0) {
            showEmptyStateModal();
        }
    } catch (error) {
        console.error("Öğrenci sayısı kontrol edilemedi:", error);
    }
}

function showEmptyStateModal() {
    if (document.getElementById('firstStudentModal')) return;

    const modalHtml = `
    <div id="firstStudentModal" class="fixed inset-0 bg-gray-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-scale-in">
        <div class="bg-white rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl border-4 border-indigo-100">
            <div class="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg text-4xl text-white animate-bounce">
                <i class="fa-solid fa-user-plus"></i>
            </div>
            <h2 class="text-2xl font-black text-gray-800 mt-8 mb-2">Hoş Geldiniz! 👋</h2>
            <p class="text-gray-500 text-sm mb-6 leading-relaxed">
                Koçluk serüvenine başlamak için hazırsınız. Hemen ilk öğrencinizi ekleyerek sistemi keşfetmeye başlayın!
            </p>
            <div class="space-y-3">
                <button id="btnGoToStudents" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:scale-105 transition-transform flex items-center justify-center gap-2">
                    <i class="fa-solid fa-rocket"></i> İlk Öğrencimi Ekle
                </button>
                <button onclick="document.getElementById('firstStudentModal').remove()" class="w-full text-gray-400 hover:text-gray-600 text-xs font-bold py-2">
                    Daha Sonra
                </button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('btnGoToStudents').onclick = () => {
        document.getElementById('firstStudentModal').remove();
        navigateToPage('ogrencilerim');
        setTimeout(() => {
            const addBtn = document.getElementById('showAddStudentModalButton');
            if (addBtn) addBtn.click();
        }, 500);
    };
}

// =================================================================
// 9. GLOBAL YÖNLENDİRME (ROUTER)
// =================================================================
window.navigateToPage = async (target) => {
    const drop = document.getElementById('coachNotificationDropdown');
    const dot = document.getElementById('headerNotificationDot');
    if (drop) drop.classList.add('hidden');
    if (dot) dot.classList.add('hidden');

    const currentUser = auth.currentUser;
    if (!currentUser || !db) return;

    const navButton = document.getElementById(`nav-${target}`);
    if (navButton) {
        navButton.click();
        return;
    }

    const studentId = target;
    try {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active', 'bg-indigo-50', 'text-indigo-600');
            item.classList.add('text-gray-600');
        });
        const ogrencilerimNav = document.getElementById('nav-ogrencilerim');
        if (ogrencilerimNav) {
            ogrencilerimNav.classList.add('active', 'bg-indigo-50', 'text-indigo-600');
        }

        const activeCoachId = (typeof coachId !== 'undefined' ? coachId : null) || currentUser.uid;
        const docRef = doc(db, "artifacts", appId, "users", activeCoachId, "ogrencilerim", studentId);
        const docSnap = await getDoc(docRef);

        let studentName = "Öğrenci Detayı";
        if (docSnap.exists()) {
            const data = docSnap.data();
            studentName = `${data.ad} ${data.soyad}`;
        }

        if (typeof renderOgrenciDetaySayfasi === 'function') {
            renderOgrenciDetaySayfasi(db, activeCoachId, appId, studentId, studentName);
        }
    } catch (error) { console.error(error); }
};

const classSelect = document.getElementById('studentClass');
if (classSelect) {
    classSelect.addEventListener('change', (e) => {
        if (typeof renderStudentOptions === 'function') {
            renderStudentOptions(e.target.value, 'studentOptionsContainer', 'studentDersSecimiContainer');
        }
    });
}

const btnSaveRandevu = document.getElementById('saveRandevuButton');
if (btnSaveRandevu) {
    btnSaveRandevu.onclick = async () => {
        btnSaveRandevu.disabled = true;
        btnSaveRandevu.textContent = 'Kaydediliyor...';
        try {
            await saveNewRandevu(db, currentUserId, appId);
            // Modal kapatma helpers içinde yoksa window.history.back() ile kapatır
            const modal = document.getElementById('addRandevuModal');
            if (modal && !modal.classList.contains('hidden')) window.history.back();

            if (document.getElementById('nav-ajandam').classList.contains('active')) {
                navigateToPage('ajandam', false);
            }
        } catch (e) { console.error(e); }
        finally {
            btnSaveRandevu.disabled = false;
            btnSaveRandevu.textContent = 'Kaydet';
        }
    };
}

main();



