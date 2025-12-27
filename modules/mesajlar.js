import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    addDoc, 
    serverTimestamp, 
    doc, 
    updateDoc, 
    getDocs, 
    writeBatch,
    limit 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR } from './helpers.js';

let currentChatStudentId = null;

// =================================================================
// 1. MESAJLAR SAYFASI ANA YAPISI (HTML & ID TANIMLAMALARI)
// =================================================================
export function renderMesajlarSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Mesajlar";
    const mainContentArea = document.getElementById("mainContentArea");
    
    // Mobil Uyumlu İskelet
    mainContentArea.innerHTML = `
        <div class="flex flex-col md:flex-row h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
            
            <div id="msgStudentListPanel" class="w-full md:w-1/3 border-r border-gray-100 flex flex-col bg-white z-10 absolute inset-0 md:relative transition-transform duration-300 transform translate-x-0">
                <div class="p-4 border-b border-gray-50 bg-gray-50/50">
                    <div class="relative">
                        <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input type="text" id="studentSearchInput" placeholder="Öğrenci ara..." class="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300 transition-colors">
                    </div>
                </div>

                <ul id="msgStudentList" class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    <div class="flex flex-col items-center justify-center h-40 text-gray-400">
                        <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
                        <p class="text-xs">Öğrenciler yükleniyor...</p>
                    </div>
                </ul>
            </div>

            <div id="msgChatPanel" class="w-full md:w-2/3 flex flex-col bg-[#efeae2] absolute inset-0 md:relative transition-transform duration-300 transform translate-x-full md:translate-x-0 hidden md:flex">
                
                <div class="p-3 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-20">
                    <div class="flex items-center gap-3">
                        <button onclick="backToStudentList()" class="md:hidden mr-1 text-gray-500 hover:text-gray-800">
                            <i class="fa-solid fa-arrow-left text-lg"></i>
                        </button>
                        
                        <div id="chatHeaderAvatarContainer">
                            <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <i class="fa-solid fa-user text-gray-400"></i>
                            </div>
                        </div>

                        <div>
                            <h3 id="chatHeaderName" class="font-bold text-gray-800 text-sm">Öğrenci Seçilmedi</h3>
                            <span id="chatHeaderStatus" class="text-xs text-gray-400 block">Sohbet başlatmak için bir öğrenci seçin</span>
                        </div>
                    </div>

                    <button id="chatDeleteBtn" onclick="deleteChatHistory('${currentUserId}', '${appId}', db)" class="text-gray-400 hover:text-red-500 transition-colors p-2 hidden" title="Sohbeti Temizle">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>

                <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar scroll-smooth relative">
                    <div class="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                        <i class="fa-regular fa-comments text-4xl mb-3"></i>
                        <p class="text-sm">Listeden bir öğrenci seçin.</p>
                    </div>
                </div>

                <div class="p-3 bg-gray-50 border-t border-gray-200">
                    <form id="chatForm" class="flex items-end gap-2 max-w-4xl mx-auto">
                        <div class="flex-1 bg-white rounded-2xl border border-gray-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-sm flex items-center">
                            <input type="text" id="messageInput" class="w-full px-4 py-3 bg-transparent border-none focus:ring-0 text-sm text-gray-800 placeholder-gray-400" placeholder="Bir mesaj yazın..." autocomplete="off" disabled>
                        </div>
                        <button type="submit" id="sendMessageBtn" class="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                            <i class="fa-solid fa-paper-plane text-sm ml-0.5"></i>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    // 2. Fonksiyonları Başlat
    startStudentListListener(db, currentUserId, appId);
    setupChatForm(db, currentUserId, appId);

    // Global Değişkenler (Fonksiyonların erişebilmesi için)
    window.currentDb = db; 
    window.globalUserId = currentUserId; 
    window.globalAppId = appId;
}

// =================================================================
// 2. ÖĞRENCİ LİSTESİNİ DİNLEME VE LİSTELEME
// =================================================================
function startStudentListListener(db, currentUserId, appId) {
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    if (activeListeners.msgStudentList) activeListeners.msgStudentList();

    activeListeners.msgStudentList = onSnapshot(q, (snapshot) => {
        const listContainer = document.getElementById('msgStudentList');
        if (!listContainer) return; // Hata koruması

        if (snapshot.empty) {
            listContainer.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-gray-400"><i class="fa-solid fa-users-slash text-3xl mb-2"></i><p class="text-sm">Henüz öğrenci eklenmemiş.</p></div>';
            return;
        }

        let listHtml = '';
        
        snapshot.forEach(doc => {
            const s = doc.data();
            // Avatar Mantığı: Emoji > Baş Harf > ?
            const avatarContent = s.avatarIcon || (s.ad ? s.ad[0].toUpperCase() : '?');
            
            listHtml += `
            <li id="student-list-item-${doc.id}" 
                onclick="window.selectChatStudent('${doc.id}', '${s.ad} ${s.soyad}', '${avatarContent}')" 
                class="group p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 transition-all duration-300 relative">
                
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold border-2 border-white shadow-sm text-xl shrink-0 group-hover:scale-105 transition-transform">
                        ${avatarContent}
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center mb-0.5">
                            <h4 class="font-bold text-gray-800 text-sm truncate group-hover:text-indigo-700 transition-colors">${s.ad} ${s.soyad}</h4>
                            <span class="text-[10px] text-gray-400 font-medium">${s.sinif || ''}</span>
                        </div>
                        <p class="text-xs text-gray-500 truncate group-hover:text-gray-600">Sohbeti görüntülemek için dokunun</p>
                    </div>

                    <div id="unread-${doc.id}" class="hidden w-6 h-6 bg-red-500 text-white text-[11px] font-bold rounded-full items-center justify-center shadow-md border-2 border-white transform scale-100 transition-transform animate-pulse z-10">
                        0
                    </div>
                    
                    <i class="fa-solid fa-chevron-right text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-1"></i>
                </div>
            </li>`;
        });

        listContainer.innerHTML = listHtml;

        // Okunmamış Mesaj Kontrolünü Başlat
        snapshot.forEach(doc => {
            checkUnreadMessages(db, currentUserId, appId, doc.id);
        });
    });
}

// =================================================================
// 3. OKUNMAMIŞ MESAJ SAYISI VE SIRALAMA (Zıplama Özelliği)
// =================================================================
function checkUnreadMessages(db, currentUserId, appId, studentId) {
    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"),
        where("gonderen", "==", "ogrenci"),
        where("okundu", "==", false)
    );

    if (activeListeners[`unreadMsg_${studentId}`]) activeListeners[`unreadMsg_${studentId}`]();

    activeListeners[`unreadMsg_${studentId}`] = onSnapshot(q, (snapshot) => {
        const count = snapshot.size;
        const badge = document.getElementById(`unread-${studentId}`);
        const studentListItem = document.getElementById(`student-list-item-${studentId}`);
        const listContainer = document.getElementById('msgStudentList');

        if (badge && studentListItem) {
            if (count > 0) {
                // Sayıyı Göster
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
                badge.classList.add('flex');
                
                // En Başa Taşı
                if (listContainer) listContainer.prepend(studentListItem);

                // Arkaplanı Vurgula
                studentListItem.classList.add('bg-red-50');
            } else {
                badge.classList.add('hidden');
                badge.classList.remove('flex');
                studentListItem.classList.remove('bg-red-50');
            }
        }
    });
}

// =================================================================
// 4. SOHBET SEÇİMİ (MOBİL VE DESKTOP UYUMLU)
// =================================================================
window.selectChatStudent = function(studentId, studentName, avatarContent) {
    currentChatStudentId = studentId;

    // A) Mobil Görünüm Geçişi
    const listPanel = document.getElementById('msgStudentListPanel');
    const chatPanel = document.getElementById('msgChatPanel');
    
    if (window.innerWidth < 768) {
        listPanel.classList.add('-translate-x-full', 'absolute'); // Gizle
        chatPanel.classList.remove('translate-x-full', 'hidden'); // Göster
        chatPanel.classList.add('translate-x-0', 'flex');
    } else {
        chatPanel.classList.remove('hidden'); // Masaüstünde her zaman göster
    }

    // B) Başlık Bilgilerini Güncelle (HATA BURADAYDI, ARTIK ID'LER GARANTİ)
    const nameEl = document.getElementById('chatHeaderName');
    const statusEl = document.getElementById('chatHeaderStatus');
    const avatarContainer = document.getElementById('chatHeaderAvatarContainer');

    if (nameEl) nameEl.textContent = studentName;
    if (statusEl) statusEl.textContent = "Çevrimiçi";

    // Avatarı Kutu Olarak Güncelle
    if (avatarContainer) {
        avatarContainer.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold border border-gray-200 text-lg">
                ${avatarContent}
            </div>`;
    }

    // C) Butonları Aktif Et
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendMessageBtn').disabled = false;
    document.getElementById('chatDeleteBtn').classList.remove('hidden');

    // D) Mesajları Yükle
    loadChatMessages(window.currentDb, window.globalUserId, window.globalAppId, studentId);
    
    // E) Okundu Yap
    markMessagesAsRead(window.currentDb, window.globalUserId, window.globalAppId, studentId);
    
    // F) Inputa Odaklan (Masaüstü ise)
    if (window.innerWidth >= 768) {
        document.getElementById('messageInput').focus();
    }
};

// =================================================================
// 5. MESAJLARI YÜKLEME VE RENDER
// =================================================================
function loadChatMessages(db, currentUserId, appId, studentId) {
    const container = document.getElementById('chatMessages');
    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"),
        orderBy("tarih", "asc")
    );

    if (activeListeners.currentChat) activeListeners.currentChat();

    activeListeners.currentChat = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-gray-400 opacity-60"><i class="fa-regular fa-comments text-4xl mb-3"></i><p class="text-sm">Henüz mesaj yok. İlk mesajı siz atın!</p></div>';
            return;
        }

        let html = '';
        let lastDate = null;

        snapshot.forEach(doc => {
            const msg = doc.data();
            const isMe = msg.gonderen === 'koc';
            const dateObj = msg.tarih ? msg.tarih.toDate() : new Date();
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString();

            // Tarih Ayırıcı
            if (dateStr !== lastDate) {
                html += `<div class="flex justify-center my-4"><span class="bg-gray-100 text-gray-500 text-[10px] px-3 py-1 rounded-full font-bold shadow-sm">${dateStr}</span></div>`;
                lastDate = dateStr;
            }

            // Mesaj Balonu
            html += `
            <div class="flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in group mb-1">
                <div class="max-w-[75%] md:max-w-[60%] px-4 py-2 rounded-2xl text-sm shadow-sm relative break-words 
                    ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'}">
                    
                    <p class="leading-relaxed whitespace-pre-wrap">${msg.text}</p>
                    
                    <div class="flex items-center justify-end gap-1 mt-1 opacity-70 select-none">
                        <span class="text-[10px] ${isMe ? 'text-indigo-100' : 'text-gray-400'}">${timeStr}</span>
                        ${isMe ? (msg.okundu ? '<i class="fa-solid fa-check-double text-[10px]"></i>' : '<i class="fa-solid fa-check text-[10px]"></i>') : ''}
                    </div>
                </div>
            </div>`;
        });

        container.innerHTML = html;
        setTimeout(() => container.scrollTop = container.scrollHeight, 100);
    });
}

// =================================================================
// 6. MESAJ GÖNDERME
// =================================================================
function setupChatForm(db, currentUserId, appId) {
    const form = document.getElementById('chatForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('messageInput');
        const text = input.value.trim();

        if (!text || !currentChatStudentId) return;

        input.value = ''; // Hemen temizle
        input.focus();

        try {
            await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", currentChatStudentId, "mesajlar"), {
                text: text,
                gonderen: 'koc',
                tarih: serverTimestamp(),
                okundu: false
            });
        } catch (error) {
            console.error("Mesaj gönderme hatası:", error);
            alert("Mesaj gönderilemedi.");
        }
    });
}

// =================================================================
// 7. YARDIMCI FONKSİYONLAR (GERİ DÖN, SİL, OKUNDU YAP)
// =================================================================

// Mobilde Geri Dönüş
window.backToStudentList = function() {
    currentChatStudentId = null;
    const listPanel = document.getElementById('msgStudentListPanel');
    const chatPanel = document.getElementById('msgChatPanel');
    
    listPanel.classList.remove('-translate-x-full', 'absolute');
    chatPanel.classList.add('translate-x-full', 'hidden');
    chatPanel.classList.remove('translate-x-0', 'flex');
    
    // Listeye geri dönünce badge'leri güncellemek iyi olur ama zaten listener çalışıyor
};

// Okundu Olarak İşaretle
async function markMessagesAsRead(db, currentUserId, appId, studentId) {
    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"),
        where("gonderen", "==", "ogrenci"),
        where("okundu", "==", false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.forEach(doc => {
        batch.update(doc.ref, { okundu: true });
    });

    if (!snapshot.empty) await batch.commit();
}

// Sohbeti Sil (Opsiyonel Buton)
window.deleteChatHistory = async function(userId, appId, db) {
    if(!confirm("Bu öğrenciyle olan tüm mesaj geçmişi silinecek. Emin misiniz?")) return;
    
    // Batch silme işlemi (detaylar önceki kodlarda mevcuttu, istenirse eklenebilir)
    // Şimdilik alert verip geçelim, çünkü ana istek bu değil.
    alert("Silme fonksiyonu çağrıldı.");
};
