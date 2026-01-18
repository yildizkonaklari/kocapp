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
// 1. MESAJLAR SAYFASI ANA YAPISI
// =================================================================
export function renderMesajlarSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Mesajlar";
    const mainContentArea = document.getElementById("mainContentArea");
    
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

                    <button id="btnDeleteChat" class="hidden w-9 h-9 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all shadow-sm group" title="Sohbeti Temizle">
                        <i class="fa-regular fa-trash-can text-sm group-hover:scale-110 transition-transform"></i>
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
    setupSearchFunctionality();
    startStudentListListener(db, currentUserId, appId);
    setupChatForm(db, currentUserId, appId);

    // Global Değişkenler
    window.currentDb = db; 
    window.globalUserId = currentUserId; 
    window.globalAppId = appId;
}
// =================================================================
// 2. ARAMA FONKSİYONU (YENİ EKLENDİ)
// =================================================================
function setupSearchFunctionality() {
    const searchInput = document.getElementById('studentSearchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const filter = e.target.value.toLowerCase();
            const listItems = document.querySelectorAll('#msgStudentList li');
            
            listItems.forEach(item => {
                // data-search-name attribute'undan ismi alıp kontrol ediyoruz
                const name = item.getAttribute('data-search-name').toLowerCase();
                if (name.includes(filter)) {
                    item.classList.remove('hidden');
                    item.classList.add('flex'); // Flex yapısını korumak için
                } else {
                    item.classList.add('hidden');
                    item.classList.remove('flex');
                }
            });
        });
    }
}

// =================================================================
// 3. ÖĞRENCİ LİSTESİNİ DİNLEME (DÜZELTİLDİ: Loading Kaldırma Eklendi)
// =================================================================
function startStudentListListener(db, currentUserId, appId) {
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    if (activeListeners.msgStudentList) activeListeners.msgStudentList();

    activeListeners.msgStudentList = onSnapshot(q, (snapshot) => {
        const listContainer = document.getElementById('msgStudentList');
        if (!listContainer) return;

        // 1. Durum: Hiç öğrenci yoksa
        if (snapshot.empty) {
            listContainer.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-gray-400"><i class="fa-solid fa-users-slash text-3xl mb-2"></i><p class="text-sm">Henüz öğrenci eklenmemiş.</p></div>';
            return;
        }

        // 2. Durum: Öğrenciler geldi
        // Önce ekrandaki mevcut öğrencileri (LI etiketlerini) kontrol et
        const existingItems = {};
        listContainer.querySelectorAll('li').forEach(li => {
            existingItems[li.id] = li;
        });

        // DÜZELTME BURADA: 
        // Eğer ekranda henüz hiç 'li' yoksa (yani ilk yükleme ise ve loading spinner varsa),
        // container'ın içini tamamen temizle. Böylece "Yükleniyor" yazısı gider.
        if (Object.keys(existingItems).length === 0) {
            listContainer.innerHTML = '';
        }

        // Listeyi oluştur / güncelle
        snapshot.forEach(doc => {
            const s = doc.data();
            const avatarContent = s.avatarIcon || (s.ad ? s.ad[0].toUpperCase() : '?');
            const fullName = `${s.ad} ${s.soyad}`;
            const itemId = `student-list-item-${doc.id}`;

            // Eğer item ekranda yoksa ekle
            if (!existingItems[itemId]) {
                const li = document.createElement('li');
                li.id = itemId;
                li.setAttribute('data-search-name', fullName); 
                li.setAttribute('data-last-msg-time', 0); 
                li.className = "group p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 transition-all duration-300 relative flex";
                li.onclick = () => window.selectChatStudent(doc.id, fullName, avatarContent);
                
                li.innerHTML = `
                    <div class="flex items-center gap-3 w-full">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold border-2 border-white shadow-sm text-xl shrink-0 group-hover:scale-105 transition-transform">
                            ${avatarContent}
                        </div>
                        
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-center mb-0.5">
                                <h4 class="font-bold text-gray-800 text-sm truncate group-hover:text-indigo-700 transition-colors">${fullName}</h4>
                                <span class="text-[10px] text-gray-400 font-medium last-msg-date"></span>
                            </div>
                            <p class="text-xs text-gray-500 truncate group-hover:text-gray-600 last-msg-preview">Sohbeti görüntülemek için dokunun</p>
                        </div>

                        <div id="unread-${doc.id}" class="hidden w-6 h-6 bg-red-500 text-white text-[11px] font-bold rounded-full items-center justify-center shadow-md border-2 border-white transform scale-100 transition-transform animate-pulse z-10 shrink-0">
                            0
                        </div>
                    </div>`;
                
                listContainer.appendChild(li);
                
                // Bu öğrenci için sohbet detaylarını dinlemeye başla
                setupStudentChatListeners(db, currentUserId, appId, doc.id);
            }
        });
    });
}

// =================================================================
// 4. CHAT DİNLEYİCİLERİ (SIRALAMA VE BİLDİRİM - WHATSAPP TARZI)
// =================================================================
function setupStudentChatListeners(db, currentUserId, appId, studentId) {
    // A. OKUNMAMIŞ MESAJ SAYISI (Kırmızı Rozet)
    const unreadQuery = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"),
        where("gonderen", "==", "ogrenci"),
        where("okundu", "==", false)
    );

    // B. SON MESAJ (Sıralama ve Önizleme İçin)
    const lastMsgQuery = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"),
        orderBy("tarih", "desc"),
        limit(1)
    );

    // Dinleyicileri temizlemek için isim oluştur
    const unreadKey = `unread_${studentId}`;
    const lastMsgKey = `lastmsg_${studentId}`;

    if (activeListeners[unreadKey]) activeListeners[unreadKey]();
    if (activeListeners[lastMsgKey]) activeListeners[lastMsgKey]();

    // 1. Okunmamış Mesaj Listener
    activeListeners[unreadKey] = onSnapshot(unreadQuery, (snapshot) => {
        const count = snapshot.size;
        const badge = document.getElementById(`unread-${studentId}`);
        const listItem = document.getElementById(`student-list-item-${studentId}`);
        
        if (badge && listItem) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
                badge.classList.add('flex');
                listItem.classList.add('bg-red-50'); // Okunmamış varsa renklendir
            } else {
                badge.classList.add('hidden');
                badge.classList.remove('flex');
                listItem.classList.remove('bg-red-50');
            }
        }
    });

    // 2. Son Mesaj Listener (SIRALAMA İŞLEMİ BURADA)
    activeListeners[lastMsgKey] = onSnapshot(lastMsgQuery, (snapshot) => {
        const listItem = document.getElementById(`student-list-item-${studentId}`);
        if (!listItem) return;

        if (!snapshot.empty) {
            const msg = snapshot.docs[0].data();
            const dateObj = msg.tarih ? msg.tarih.toDate() : new Date();
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // DOM Güncelleme (Önizleme ve Tarih)
            const previewEl = listItem.querySelector('.last-msg-preview');
            const dateEl = listItem.querySelector('.last-msg-date');
            
            if (previewEl) {
                // Mesajı kısalt
                let text = msg.text.length > 30 ? msg.text.substring(0, 30) + '...' : msg.text;
                if(msg.gonderen === 'koc') text = `siz: ${text}`;
                previewEl.textContent = text;
                
                // Yeni mesaj geldiyse kalın yap
                if(msg.gonderen === 'ogrenci' && !msg.okundu) {
                    previewEl.classList.add('font-bold', 'text-gray-800');
                } else {
                    previewEl.classList.remove('font-bold', 'text-gray-800');
                }
            }
            if (dateEl) dateEl.textContent = timeStr;

            // SIRALAMA İÇİN DATA SET
            // Milisaniye cinsinden zamanı attribute'a yazıyoruz
            listItem.setAttribute('data-last-msg-time', dateObj.getTime());

        } else {
            // Hiç mesaj yoksa en sona at
            listItem.setAttribute('data-last-msg-time', 0);
        }

        // LİSTEYİ YENİDEN SIRALA
        sortStudentList();
    });
}

// Listeyi data-last-msg-time'a göre sıralayan fonksiyon
function sortStudentList() {
    const list = document.getElementById('msgStudentList');
    const items = Array.from(list.children);

    items.sort((a, b) => {
        const timeA = parseInt(a.getAttribute('data-last-msg-time') || '0');
        const timeB = parseInt(b.getAttribute('data-last-msg-time') || '0');
        return timeB - timeA; // Büyükten küçüğe (En yeni en üstte)
    });

    // DOM'a tekrar ekleyerek sıralamayı uygula
    items.forEach(item => list.appendChild(item));
}

// =================================================================
// 5. SOHBET SEÇİMİ VE DETAYLAR
// =================================================================
// window.selectChatStudent fonksiyonunu bununla değiştirin:

window.selectChatStudent = function(studentId, studentName, avatarContent) {
    currentChatStudentId = studentId;

    // Mobil Geçiş
    const listPanel = document.getElementById('msgStudentListPanel');
    const chatPanel = document.getElementById('msgChatPanel');
    if (window.innerWidth < 768) {
        listPanel.classList.add('-translate-x-full', 'absolute');
        chatPanel.classList.remove('translate-x-full', 'hidden');
        chatPanel.classList.add('translate-x-0', 'flex');
    } else {
        chatPanel.classList.remove('hidden');
    }

    // Başlık Güncelleme
    document.getElementById('chatHeaderName').textContent = studentName;
    document.getElementById('chatHeaderStatus').textContent = "";

    const avatarContainer = document.getElementById('chatHeaderAvatarContainer');
    if (avatarContainer) {
        avatarContainer.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold border border-gray-200 text-lg">
                ${avatarContent}
            </div>`;
    }

    // SİLME BUTONUNU AYARLA (YENİ KISIM)
    const btnDelete = document.getElementById('btnDeleteChat');
    if (btnDelete) {
        btnDelete.classList.remove('hidden'); // Butonu göster
        // Eski event listener'ları temizlemek için butonu klonla
        const newBtn = btnDelete.cloneNode(true);
        btnDelete.parentNode.replaceChild(newBtn, btnDelete);
        
        // Yeni silme olayını bağla
        newBtn.onclick = () => deleteChatHistory(window.currentDb, window.globalUserId, window.globalAppId, studentId);
    }

    // Butonları Aktif Et
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendMessageBtn').disabled = false;

    // Mesajları Getir
    loadChatMessages(window.currentDb, window.globalUserId, window.globalAppId, studentId);
    
    // Okundu Yap
    markMessagesAsRead(window.currentDb, window.globalUserId, window.globalAppId, studentId);
    
    // Input Odak
    if (window.innerWidth >= 768) {
        document.getElementById('messageInput').focus();
    }
};
// =================================================================
// 6. MESAJLARI YÜKLE
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

            if (dateStr !== lastDate) {
                html += `<div class="flex justify-center my-4"><span class="bg-gray-100 text-gray-500 text-[10px] px-3 py-1 rounded-full font-bold shadow-sm">${dateStr}</span></div>`;
                lastDate = dateStr;
            }

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
// 7. MESAJ GÖNDERME VE YARDIMCILAR
// =================================================================
function setupChatForm(db, currentUserId, appId) {
    const form = document.getElementById('chatForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('messageInput');
        const text = input.value.trim();

        if (!text || !currentChatStudentId) return;

        input.value = '';
        input.focus();

        try {
            await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", currentChatStudentId, "mesajlar"), {
                text: text,
                gonderen: 'koc',
                tarih: serverTimestamp(),
                okundu: false
            });
        } catch (error) {
            console.error(error);
        }
    });
}

window.backToStudentList = function() {
    currentChatStudentId = null;
    const listPanel = document.getElementById('msgStudentListPanel');
    const chatPanel = document.getElementById('msgChatPanel');
    
    listPanel.classList.remove('-translate-x-full', 'absolute');
    chatPanel.classList.add('translate-x-full', 'hidden');
    chatPanel.classList.remove('translate-x-0', 'flex');
};

async function markMessagesAsRead(db, currentUserId, appId, studentId) {
    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"),
        where("gonderen", "==", "ogrenci"),
        where("okundu", "==", false)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.update(doc.ref, { okundu: true }));
    if (!snapshot.empty) await batch.commit();
}
// Bu fonksiyonu dosyanın sonuna ekleyin

async function deleteChatHistory(db, currentUserId, appId, studentId) {
    if (!confirm("Bu öğrenciyle olan TÜM mesaj geçmişi kalıcı olarak silinecek. Emin misiniz?")) return;

    const btn = document.getElementById('btnDeleteChat');
    if(btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; // Loading ikonu

    try {
        // Silinecek mesajları bul
        const q = collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar");
        const snapshot = await getDocs(q);
        
        // Batch işlemi ile toplu sil (Daha hızlı ve güvenli)
        const batch = writeBatch(db);
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        // Başarılı olursa (Listener zaten ekranı temizleyecektir ama kullanıcıya bilgi verelim)
        // İsteğe bağlı: alert("Sohbet temizlendi."); 

    } catch (error) {
        console.error("Silme hatası:", error);
        alert("Mesajlar silinirken bir hata oluştu.");
    } finally {
        // İkonu geri getir
        if(btn) btn.innerHTML = '<i class="fa-regular fa-trash-can text-sm group-hover:scale-110 transition-transform"></i>';
    }
}
