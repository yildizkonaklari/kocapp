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
    collection, query, where, orderBy, onSnapshot, limit, collectionGroup, getCountFromServer // DÜZELTME: collectionGroup EKLENDİ
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; 

// --- GÜNCELLENMİŞ MODÜLLERİ İÇE AKTAR ---
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
            checkAndPromptFirstStudent(db, user.uid, appId);
            
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
    // DÜZELTME: mobileOverlay hariç tutuldu ki menü mantığına karışmasın.
    const openModals = document.querySelectorAll('.fixed.inset-0:not(.hidden):not(#mobileOverlay)');
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

// Mobil Menü (Drawer) Yönetimi (SAĞDAN GELİŞ) - GÜNCELLENMİŞ
const mobileDrawer = document.getElementById('mobileMenuDrawer');
const overlay = document.getElementById('mobileOverlay');

function openMobileMenu() {
    if(mobileDrawer) {
        mobileDrawer.classList.remove('translate-x-full');
        if(overlay) overlay.classList.remove('hidden');
        // Menü açıldığını geçmişe ekle
        window.history.pushState({ menuOpen: true }, '', window.location.href);
    }
}

function closeMobileMenu() {
    if(mobileDrawer) {
        mobileDrawer.classList.add('translate-x-full');
        if(overlay) overlay.classList.add('hidden');
    }
}

// Menüyü geçmiş kontrolü ile kapatan akıllı fonksiyon
function handleCloseMenuAction() {
    // Eğer geçmişte menü açık durumu varsa, geri git (bu popstate'i tetikler ve menüyü kapatır)
    if (window.history.state && window.history.state.menuOpen) {
        window.history.back();
    } else {
        // Geçmişte yoksa (direkt açılmışsa vs.) manuel kapat
        closeMobileMenu();
    }
}

// Olay Dinleyicileri
document.getElementById('btnToggleMobileMenu')?.addEventListener('click', (e) => {
    e.preventDefault();
    openMobileMenu();
});

// X Butonu ve Boşluk (Overlay) Tıklaması için Akıllı Kapatma
document.getElementById('btnCloseMobileMenu')?.addEventListener('click', handleCloseMenuAction);
overlay?.addEventListener('click', handleCloseMenuAction);

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
// 7. BİLDİRİMLER (SADECE SEANS)
// =================================================================
function initCoachNotifications(uid) {
    const list = document.getElementById('coachNotificationList');
    const dot = document.getElementById('headerNotificationDot'); 
    const dropdown = document.getElementById('coachNotificationDropdown');
    const btn = document.getElementById('btnHeaderNotifications');
    const closeBtn = document.getElementById('btnCloseCoachNotifications');
    
    if(!btn || !dropdown) return;

    // Dropdown İşlemleri
    btn.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); if(dot) dot.classList.add('hidden'); };
    if(closeBtn) closeBtn.onclick = (e) => { e.stopPropagation(); dropdown.classList.add('hidden'); };
    document.addEventListener('click', (e) => { if(!dropdown.contains(e.target) && !btn.contains(e.target)) dropdown.classList.add('hidden'); });

    // SADECE SEANS SORGUSU
    const today = new Date().toISOString().split('T')[0];
    onSnapshot(query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("tarih", ">=", today), orderBy("tarih", "asc"), limit(5)), (snap) => {
        let html = '';
        if (snap.empty) {
            html = '<p class="text-center text-gray-400 text-xs py-8">Yaklaşan seans yok.</p>';
            if(dot) dot.classList.add('hidden');
        } else {
            if(dot) dot.classList.remove('hidden');
            snap.forEach(d => {
                const data = d.data();
                html += `
                <div class="p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors group" onclick="window.navigateToPage('ajandam')">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-bold text-gray-800 group-hover:text-indigo-600">${data.title || 'Seans'}</p>
                            <p class="text-xs text-gray-500">${data.ogrenciAd} - ${formatDateTR(data.tarih)} ${data.baslangic}</p>
                        </div>
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700">Seans</span>
                    </div>
                </div>`;
            });
        }
        list.innerHTML = html;
    });

    // 4. MESAJLAR (Sadece Badge Sayısı)
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
// =================================================================
// GLOBAL YÖNLENDİRME FONKSİYONU (ROUTER)
// =================================================================
window.navigateToPage = async (target) => {
    console.log("Yönlendirme isteği geldi:", target);

    // 1. Bildirim menülerini kapat (Temizlik)
    const drop = document.getElementById('coachNotificationDropdown');
    const dot = document.getElementById('headerNotificationDot');
    if (drop) drop.classList.add('hidden');
    if (dot) dot.classList.add('hidden');

    // 2. Global değişken kontrolleri
    const currentUser = auth.currentUser; // Firebase Auth'dan güncel kullanıcıyı al
    if (!currentUser || !db) {
        console.error("Sistem hazır değil: Kullanıcı oturumu yok.");
        return;
    }

    // 3. KONTROL: Gelen 'target' bir menü elemanı mı? (Örn: 'ajandam', 'sorutakibi')
    // Eğer HTML'de id="nav-ajandam" diye bir buton varsa, ona tıkla.
    const navButton = document.getElementById(`nav-${target}`);
    if (navButton) {
        console.log(`Main menüye gidiliyor: nav-${target}`);
        navButton.click();
        return; // İşlem tamam, fonksiyondan çık.
    }

    // 4. KONTROL: Eğer bir menü değilse, bu bir ÖĞRENCİ ID'sidir.
    // Öğrenci detay sayfasını açacağız.
    const studentId = target;
    console.log(`Öğrenci detayına gidiliyor: ID ${studentId}`);

    try {
        // A) Sol menüde 'Öğrencilerim' sekmesini aktif görünüm yap
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active', 'bg-indigo-50', 'text-indigo-600');
            item.classList.add('text-gray-600');
        });
        const ogrencilerimNav = document.getElementById('nav-ogrencilerim');
        if (ogrencilerimNav) {
            ogrencilerimNav.classList.add('active', 'bg-indigo-50', 'text-indigo-600');
        }

        // B) Öğrenci ismini çek (Detay sayfası başlığı için)
        // Eğer global 'coachId' yoksa currentUser.uid kullan
        const activeCoachId = (typeof coachId !== 'undefined' ? coachId : null) || currentUser.uid;
        
        const docRef = doc(db, "artifacts", appId, "users", activeCoachId, "ogrencilerim", studentId);
        const docSnap = await getDoc(docRef);

        let studentName = "Öğrenci Detayı";
        if (docSnap.exists()) {
            const data = docSnap.data();
            studentName = `${data.ad} ${data.soyad}`;
        }

        // C) Detay sayfasını render et
        // NOT: renderOgrenciDetaySayfasi fonksiyonunuzun app.js veya ogrencilerim.js içinde tanımlı olması gerekir.
        if (typeof renderOgrenciDetaySayfasi === 'function') {
            renderOgrenciDetaySayfasi(db, activeCoachId, appId, studentId, studentName);
        } else {
            console.error("HATA: renderOgrenciDetaySayfasi fonksiyonu bulunamadı!");
        }

    } catch (error) {
        console.error("Öğrenci detayına giderken hata:", error);
    }
};
const classSelect = document.getElementById('studentClass');
    if (classSelect) {
        classSelect.addEventListener('change', (e) => {
            // helpers.js import'u yapılmış olmalı
            if(typeof renderStudentOptions === 'function'){
                renderStudentOptions(e.target.value, 'studentOptionsContainer', 'studentDersSecimiContainer');
            }
        });
    }
const btnSaveRandevu = document.getElementById('saveRandevuButton');
    if (btnSaveRandevu) {
        const newBtn = btnSaveRandevu.cloneNode(true);
        btnSaveRandevu.parentNode.replaceChild(newBtn, btnSaveRandevu);

        newBtn.addEventListener('click', async () => {
            newBtn.disabled = true;
            newBtn.textContent = 'Kaydediliyor...';
            try {
                await saveNewRandevu(db, currentUserId, appId);
                closeModalSmart('addRandevuModal');
                // Ajandayı yenile
                if(document.getElementById('nav-ajandam').classList.contains('active')) {
                    navigateToPage('ajandam', false);
                }
            } catch (e) { console.error(e); } 
            finally { 
                newBtn.disabled = false; 
                newBtn.textContent = 'Kaydet'; 
            }
        });
    }

// =================================================================
// İLK ÖĞRENCİ KONTROLÜ VE KARŞILAMA MODALI
// =================================================================
async function checkAndPromptFirstStudent(db, uid, appId) {
    try {
        // Öğrenci koleksiyonundaki belge sayısını hızlıca say
        const coll = collection(db, "artifacts", appId, "users", uid, "ogrencilerim");
        const snapshot = await getCountFromServer(coll);
        const count = snapshot.data().count;

        // Eğer hiç öğrenci yoksa (count === 0) modalı göster
        if (count === 0) {
            showEmptyStateModal();
        }
    } catch (error) {
        console.error("Öğrenci sayısı kontrol edilemedi:", error);
    }
}

function showEmptyStateModal() {
    // Eğer zaten varsa tekrar oluşturma
    if(document.getElementById('firstStudentModal')) return;

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

    // Butona tıklanınca yapılacaklar
    document.getElementById('btnGoToStudents').onclick = () => {
        // 1. Modalı kapat
        document.getElementById('firstStudentModal').remove();
        
        // 2. Öğrenciler sayfasına git
        navigateToPage('ogrencilerim');
        
        // 3. (Opsiyonel) Öğrenciler sayfası açılınca direkt "Yeni Öğrenci Ekle" modalını tetikle
        // Sayfa geçişi biraz sürdüğü için kısa bir gecikme ekliyoruz
        setTimeout(() => {
            const addBtn = document.getElementById('showAddStudentModalButton');
            if(addBtn) addBtn.click();
        }, 500);
    };
}
// BAŞLAT
main();


