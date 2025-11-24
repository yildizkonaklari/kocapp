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
            
            // Yükleniyor ekranını kapat
            const spinner = document.getElementById('loadingSpinner');
            if (spinner) spinner.style.display = 'none';
            
            // Ana konteyneri göster (GÜVENLİ KONTROL)
            const appContainer = document.getElementById('appContainer');
            if (appContainer) {
                appContainer.classList.remove('hidden');
                appContainer.style.display = 'flex'; // Flex yapısını koru
            } else {
                console.error("HATA: appContainer elementi bulunamadı! index.html dosyasını kontrol edin.");
                return; // İşlemi durdur
            }
            
            updateUIForLoggedInUser(user);
            navigateToPage('anasayfa');
            
        } else {
            window.location.href = 'login.html';
        }
    });
}

// UI GÜNCELLEME & PROFİL
function updateUIForLoggedInUser(user) {
    const name = user.displayName || "Koç";
    const email = user.email;
    const initials = name.substring(0, 2).toUpperCase();

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

// =================================================================
// MESAJLAR SAYFASI (MOBİL AKORDİYONLU)
// =================================================================

function renderMesajlarSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Mesajlar";
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentArea.innerHTML = `
        <div class="flex flex-col lg:flex-row h-[calc(100vh-160px)] lg:h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            <!-- SOL PANEL: Liste (Akordiyonlu) -->
            <div id="chatSidebar" class="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col bg-white transition-all duration-300 shrink-0">
                
                <!-- Arama ve Toggle Header -->
                <div class="p-3 border-b border-gray-100 bg-gray-50 flex gap-2 items-center justify-between shrink-0">
                    <div class="relative flex-1">
                        <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input type="text" id="chatSearchInput" placeholder="Öğrenci Ara..." class="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-purple-500 outline-none transition-shadow">
                    </div>
                    
                    <!-- Mobil Liste Aç/Kapa Butonu -->
                    <button id="btnToggleChatList" class="lg:hidden w-9 h-9 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-purple-600 hover:border-purple-300 transition-all shadow-sm">
                        <i class="fa-solid fa-chevron-down transition-transform duration-300" id="iconChatListToggle"></i>
                    </button>
                </div>

                <!-- Öğrenci Listesi (Mobilde Gizlenebilir) -->
                <div id="chatStudentList" class="hidden lg:block flex-1 overflow-y-auto overflow-x-hidden p-1 space-y-1 bg-white min-h-0 max-h-[40vh] lg:max-h-full border-b lg:border-b-0 border-gray-100 shadow-inner lg:shadow-none">
                    <p class="text-gray-400 text-center text-sm py-4">Yükleniyor...</p>
                </div>
            </div>

            <!-- SAĞ PANEL: Sohbet -->
            <div class="w-full lg:w-2/3 flex-1 flex flex-col bg-gray-50 relative min-h-0" id="chatArea">
                <div class="flex-1 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-300">
                        <i class="fa-regular fa-comments text-3xl"></i>
                    </div>
                    <p class="text-sm font-medium">Mesajlaşmak için listeden bir öğrenci seçin.</p>
                </div>
            </div>
        </div>
    `;

    loadChatStudentList(db, currentUserId, appId);
    
    // Toggle Butonu İşlevi
    const btnToggle = document.getElementById('btnToggleChatList');
    const listDiv = document.getElementById('chatStudentList');
    const icon = document.getElementById('iconChatListToggle');
    
    if (btnToggle) {
        btnToggle.onclick = () => {
            listDiv.classList.toggle('hidden');
            // İkonu döndür
            if (listDiv.classList.contains('hidden')) {
                icon.classList.remove('rotate-180');
                btnToggle.classList.remove('bg-purple-50', 'border-purple-300', 'text-purple-600');
            } else {
                icon.classList.add('rotate-180');
                btnToggle.classList.add('bg-purple-50', 'border-purple-300', 'text-purple-600');
            }
        };
    }

    // Arama İşlevi
    document.getElementById('chatSearchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        // Arama yapınca listeyi otomatik aç (mobilde)
        if(term.length > 0 && listDiv.classList.contains('hidden')) {
            if(btnToggle) btnToggle.click();
        }
        
        document.querySelectorAll('.chat-student-item').forEach(item => {
            item.style.display = item.dataset.name.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });
}

async function loadChatStudentList(db, currentUserId, appId) {
    const listContainer = document.getElementById('chatStudentList');
    if(!listContainer) return;
    
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    try {
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="text-gray-400 text-center text-sm py-4">Öğrenci bulunamadı.</p>';
            return;
        }

        listContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const s = doc.data();
            const div = document.createElement('div');
            div.className = 'chat-student-item flex items-center p-3 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors border border-transparent hover:border-purple-100 mx-1';
            div.dataset.name = `${s.ad} ${s.soyad}`;
            div.innerHTML = `
                <div class="relative">
                    <div class="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm border border-white">
                        ${s.ad[0]}${s.soyad[0]}
                    </div>
                    <!-- Online durumunu simüle edebiliriz -->
                    <div class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div class="ml-3 overflow-hidden flex-1">
                    <div class="flex justify-between items-center">
                        <p class="text-sm font-bold text-gray-800 truncate">${s.ad} ${s.soyad}</p>
                        <span class="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">${s.sinif}</span>
                    </div>
                    <p class="text-xs text-gray-500 truncate mt-0.5">Sohbeti görüntülemek için tıklayın</p>
                </div>
                <i class="fa-solid fa-chevron-right text-gray-300 text-xs ml-2"></i>
            `;
            
            div.onclick = () => {
                // Aktif sınıfı ekle
                document.querySelectorAll('.chat-student-item').forEach(el => {
                    el.classList.remove('bg-purple-100', 'border-purple-200');
                    el.classList.add('hover:bg-purple-50');
                });
                div.classList.remove('hover:bg-purple-50');
                div.classList.add('bg-purple-100', 'border-purple-200');

                // Sohbeti yükle
                loadChatMessages(db, currentUserId, appId, doc.id, `${s.ad} ${s.soyad}`);
                
                // Mobilde listeyi kapat (Akordiyon mantığı)
                const listDiv = document.getElementById('chatStudentList');
                const btnToggle = document.getElementById('btnToggleChatList');
                const icon = document.getElementById('iconChatListToggle');
                
                if (window.innerWidth < 1024 && !listDiv.classList.contains('hidden')) {
                    listDiv.classList.add('hidden');
                    if(icon) icon.classList.remove('rotate-180');
                    if(btnToggle) btnToggle.classList.remove('bg-purple-50', 'border-purple-300', 'text-purple-600');
                }
            };
            
            listContainer.appendChild(div);
        });
    } catch (error) {
        console.error("Liste yükleme hatası:", error);
        listContainer.innerHTML = '<p class="text-red-400 text-center text-sm py-4">Hata oluştu.</p>';
    }
}

function loadChatMessages(db, currentUserId, appId, studentId, studentName) {
    const chatArea = document.getElementById('chatArea');
    if(!chatArea) return;

    chatArea.innerHTML = `
        <!-- Sohbet Header -->
        <div class="px-4 py-3 bg-white border-b border-gray-200 flex items-center shadow-sm z-10 shrink-0">
            <div class="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs mr-3 shadow-md shadow-indigo-200">
                ${studentName.split(' ').map(n=>n[0]).join('')}
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-gray-800 text-sm">${studentName}</h3>
                <p class="text-[10px] text-green-600 flex items-center"><span class="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span> Çevrimiçi</p>
            </div>
        </div>

        <!-- Mesajlar Alanı -->
        <div id="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 scroll-smooth">
            <div class="flex justify-center"><span class="text-[10px] text-gray-400 bg-gray-200 px-2 py-1 rounded-full">Sohbet Başladı</span></div>
        </div>

        <!-- Yazma Alanı -->
        <div class="p-3 bg-white border-t border-gray-200 shrink-0">
            <form id="chatForm" class="flex gap-2 items-end">
                <div class="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-2 border border-transparent focus-within:border-indigo-500 focus-within:bg-white transition-all">
                    <input type="text" id="messageInput" placeholder="Mesajınızı yazın..." class="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-800 placeholder-gray-400" autocomplete="off">
                </div>
                <button type="submit" id="btnSendMsg" class="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <i class="fa-solid fa-paper-plane text-sm"></i>
                </button>
            </form>
        </div>
    `;

    const container = document.getElementById('messagesContainer');
    const form = document.getElementById('chatForm');
    const input = document.getElementById('messageInput');

    // Gönder
    const send = async (e) => {
        e.preventDefault();
        const txt = input.value.trim();
        if(!txt) return;
        
        input.value = '';
        input.focus();

        try {
            await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"), {
                text: txt,
                gonderen: 'koc',
                tarih: serverTimestamp(),
                okundu: false,
                kocId: currentUserId
            });
            // Scroll otomatik aşağı kayacak (listener sayesinde)
        } catch (err) {
            console.error("Mesaj gönderme hatası:", err);
            alert("Mesaj gönderilemedi.");
        }
    };
    form.onsubmit = send;

    // Dinle
    if (activeListeners.chatUnsubscribe) activeListeners.chatUnsubscribe();
    
    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"),
        orderBy("tarih", "asc")
    );
    
    activeListeners.chatUnsubscribe = onSnapshot(q, (snap) => {
        // Sadece yeni eklenenleri veya tümünü tekrar çizebiliriz. 
        // Performans için innerHTML temizleyip tekrar çiziyoruz (basit yöntem).
        container.innerHTML = '<div class="flex justify-center mb-4"><span class="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Sohbet Geçmişi</span></div>';
        
        snap.forEach(doc => {
            const m = doc.data();
            const isMe = m.gonderen === 'koc';
            const time = m.tarih ? new Date(m.tarih.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...';
            
            container.innerHTML += `
                <div class="flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in-up">
                    <div class="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm relative group ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}">
                        <p class="leading-relaxed break-words">${m.text}</p>
                        <div class="flex items-center justify-end gap-1 mt-1 opacity-70 text-[10px]">
                            <span>${time}</span>
                            ${isMe ? `<i class="fa-solid fa-check ${m.okundu ? 'text-blue-300' : ''}"></i>` : ''}
                        </div>
                    </div>
                </div>`;
        });
        
        // En alta kaydır
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    });
}

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
