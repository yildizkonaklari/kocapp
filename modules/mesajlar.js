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

// === MESAJLAR SAYFASI ANA FONKSİYONU ===
export function renderMesajlarSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Mesajlar";
    const mainContentArea = document.getElementById("mainContentArea");
    
    // 1. Sayfa İskeleti (Mobil Uyumlu Yapı)
    mainContentArea.innerHTML = `
        <div class="flex flex-col md:flex-row h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
            
            <div id="msgStudentListPanel" class="w-full md:w-1/3 border-r border-gray-100 flex flex-col bg-white z-10 absolute inset-0 md:relative transition-transform duration-300 transform translate-x-0">
                <div class="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    <div class="relative">
                        <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" id="msgSearchStudent" placeholder="Öğrenci ara..." class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm">
                    </div>
                </div>
                <div id="msgStudentList" class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    <p class="text-center text-gray-400 text-sm py-8">Yükleniyor...</p>
                </div>
            </div>

            <div id="chatArea" class="w-full md:w-2/3 flex flex-col bg-white absolute inset-0 md:relative z-20 transform translate-x-full md:translate-x-0 transition-transform duration-300">
                
                <div id="chatEmptyState" class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center h-full">
                    <div class="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 text-3xl text-indigo-200">
                        <i class="fa-solid fa-comments"></i>
                    </div>
                    <p class="text-gray-500 font-medium">Mesajlaşmak için soldan bir öğrenci seçin.</p>
                </div>

                <div id="chatContent" class="hidden flex-col h-full">
                    <div class="p-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
                        <div class="flex items-center">
                            <button id="btnBackToStudentList" class="md:hidden mr-3 text-gray-500 hover:text-gray-800 p-2 -ml-2 rounded-full active:bg-gray-100">
                                <i class="fa-solid fa-arrow-left text-lg"></i>
                            </button>
                            <div id="chatHeaderAvatar" class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold mr-3 border border-gray-100 shadow-sm"></div>
                            <div>
                                <h3 id="chatHeaderName" class="font-bold text-gray-800 text-sm leading-tight">...</h3>
                                <p class="text-[10px] text-green-600 flex items-center gap-1 font-medium bg-green-50 px-1.5 rounded w-fit mt-0.5">
                                    <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Çevrimiçi
                                </p>
                            </div>
                        </div>
                        <button class="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors" title="Sohbeti Temizle (Görsel)">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>

                    <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fafafa] custom-scrollbar scroll-smooth"></div>

                    <div class="p-3 border-t border-gray-100 bg-white shrink-0">
                        <form id="chatForm" class="flex gap-2 items-center">
                            <input type="hidden" id="chatTargetStudentId">
                            <button type="button" class="text-gray-400 hover:text-gray-600 p-2 transition-colors"><i class="fa-solid fa-paperclip"></i></button>
                            <input type="text" id="chatInput" placeholder="Bir mesaj yaz..." class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-sm" autocomplete="off">
                            <button type="submit" class="bg-purple-600 text-white w-11 h-11 rounded-full hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 flex items-center justify-center active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                <i class="fa-solid fa-paper-plane text-sm"></i>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 2. Öğrenci Listesini Yükle
    loadMessageStudentList(db, currentUserId, appId);

    // 3. Olay Dinleyicileri
    document.getElementById('chatForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const studentId = document.getElementById('chatTargetStudentId').value;
        if (studentId) sendMessage(db, currentUserId, appId, studentId);
    });

    document.getElementById('btnBackToStudentList').addEventListener('click', () => {
        closeMobileChat();
    });

    // Mobil Geri Tuşu Yönetimi (Popstate)
    window.onpopstate = (event) => {
        if (currentChatStudentId && window.innerWidth < 768) {
            closeMobileChat();
        }
    };
}

// === ÖĞRENCİ LİSTESİ YÜKLEME ===
function loadMessageStudentList(db, currentUserId, appId) {
    const listContainer = document.getElementById('msgStudentList');
    
    // Eski dinleyiciyi temizle
    if (activeListeners.messageListUnsubscribe) activeListeners.messageListUnsubscribe();

    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));

    activeListeners.messageListUnsubscribe = onSnapshot(q, (snapshot) => {
        let students = [];
        snapshot.forEach(doc => {
            students.push({ id: doc.id, ...doc.data() });
        });

        if (students.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-gray-400 text-sm py-8">Öğrenci bulunamadı.</p>';
            return;
        }

        // Okunmamış mesaj sayılarını çekmek için ek sorgu yapılabilir, 
        // ancak performans için şimdilik global listener'a güveniyoruz veya basit bırakıyoruz.
        
        listContainer.innerHTML = students.map(s => `
            <div class="msg-student-item flex items-center p-3 rounded-xl cursor-pointer hover:bg-purple-50 transition-all border border-transparent hover:border-purple-100 group relative" 
                 data-id="${s.id}" data-name="${s.ad} ${s.soyad}" data-avatar="${s.avatarIcon || ''}">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold mr-3 border-2 border-white shadow-sm text-lg shrink-0 group-hover:scale-105 transition-transform">
                    ${s.avatarIcon || s.ad[0]}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-0.5">
                        <h4 class="text-sm font-bold text-gray-800 truncate">${s.ad} ${s.soyad}</h4>
                        <span class="text-[10px] text-gray-400">Şimdi</span>
                    </div>
                    <p class="text-xs text-gray-500 truncate group-hover:text-purple-600 transition-colors">Sohbeti görüntüle...</p>
                </div>
            </div>
        `).join('');

        // Tıklama Olayları
        const items = document.querySelectorAll('.msg-student-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                // Görsel Seçim Efekti
                items.forEach(i => {
                    i.classList.remove('bg-purple-50', 'border-purple-100');
                });
                item.classList.add('bg-purple-50', 'border-purple-100');

                // Sohbeti Yükle
                loadChat(db, currentUserId, appId, item.dataset.id, item.dataset.name, item.dataset.avatar);
            });
        });

        // Arama Filtresi
        const searchInput = document.getElementById('msgSearchStudent');
        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                items.forEach(item => {
                    const name = item.dataset.name.toLowerCase();
                    item.style.display = name.includes(term) ? 'flex' : 'none';
                });
            });
        }

        // Otomatik Seçim (Global değişkenden)
        if (window.targetMessageStudentId) {
            const targetItem = document.querySelector(`.msg-student-item[data-id="${window.targetMessageStudentId}"]`);
            if (targetItem) {
                targetItem.click();
                // Biraz bekleyip scroll yap (render sonrası)
                setTimeout(() => targetItem.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
            }
            window.targetMessageStudentId = null;
        }
    });
}

// === SOHBET YÜKLEME ===
function loadChat(db, currentUserId, appId, studentId, studentName, studentAvatar) {
    currentChatStudentId = studentId;

    // Mobil Görünüm Geçişi
    openMobileChat();

    document.getElementById('chatEmptyState').classList.add('hidden');
    document.getElementById('chatContent').classList.remove('hidden');
    document.getElementById('chatContent').classList.add('flex');

    // Header Güncelle
    document.getElementById('chatHeaderName').textContent = studentName;
    const avatarEl = document.getElementById('chatHeaderAvatar');
    if (studentAvatar) {
        avatarEl.textContent = studentAvatar;
        avatarEl.style.backgroundColor = '#fff';
        avatarEl.className = "w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-xl mr-3 shadow-sm bg-white";
    } else {
        avatarEl.textContent = studentName[0];
        avatarEl.className = "w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3";
    }
    
    document.getElementById('chatTargetStudentId').value = studentId;
    
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '<div class="flex justify-center p-4"><i class="fa-solid fa-spinner fa-spin text-purple-500"></i></div>';

    // Mesajları Dinle
    if (activeListeners.chatUnsubscribe) activeListeners.chatUnsubscribe();

    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"), 
        orderBy("tarih", "asc"),
        limit(100) // Son 100 mesaj
    );

    activeListeners.chatUnsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            messagesContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">👋</div>
                    <p class="text-xs">Henüz mesaj yok. İlk mesajı sen at!</p>
                </div>`;
            return;
        }

        let html = '';
        let unreadBatch = []; 
        let lastDate = null;

        snapshot.forEach(doc => {
            const m = doc.data();
            const isMe = m.gonderen === 'koc';
            
            // Tarih Ayracı (Gün bazlı)
            const msgDate = m.tarih ? m.tarih.toDate() : new Date();
            const dateStr = formatDateTR(msgDate.toISOString().split('T')[0]);
            
            if (dateStr !== lastDate) {
                html += `<div class="flex justify-center my-4"><span class="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium shadow-sm">${dateStr}</span></div>`;
                lastDate = dateStr;
            }

            const time = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            if (!isMe && !m.okundu) {
                unreadBatch.push(doc.ref);
            }

            html += `
                <div class="flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-1 group animate-fade-in">
                    <div class="max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                        <div class="px-4 py-2.5 rounded-2xl text-sm shadow-sm relative break-words ${isMe ? 'bg-purple-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}">
                            ${m.text}
                        </div>
                        <span class="text-[10px] text-gray-400 mt-1 px-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            ${time} ${isMe ? (m.okundu ? '<i class="fa-solid fa-check-double text-blue-400"></i>' : '<i class="fa-solid fa-check"></i>') : ''}
                        </span>
                    </div>
                </div>
            `;
        });

        messagesContainer.innerHTML = html;
        
        // Otomatik en alta kaydır
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });

        // Okundu işaretle
        if (unreadBatch.length > 0) {
            const batch = writeBatch(db);
            unreadBatch.forEach(ref => batch.update(ref, { okundu: true }));
            batch.commit().catch(console.error);
        }
    });
}

// === MESAJ GÖNDERME ===
async function sendMessage(db, currentUserId, appId, studentId) {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    try {
        input.value = ''; 
        input.focus();
        
        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"), {
            text: text,
            gonderen: 'koc',
            tarih: serverTimestamp(),
            okundu: false,
            kocId: currentUserId
        });
        
        // Mesaj listesi listener ile otomatik güncellenir.
        
    } catch (error) {
        console.error("Mesaj gönderme hatası:", error);
        alert("Mesaj gönderilemedi. İnternet bağlantınızı kontrol edin.");
    }
}

// === MOBİL GÖRÜNÜM YÖNETİMİ ===
function openMobileChat() {
    // Sadece mobilde (md breakpoint altı) çalışsın
    if (window.innerWidth < 768) {
        const studentListPanel = document.getElementById('msgStudentListPanel');
        const chatArea = document.getElementById('chatArea');
        
        // Listeyi Sola Kaydır (Gizle)
        studentListPanel.classList.add('-translate-x-full');
        // Sohbeti Sola Kaydır (Göster)
        chatArea.classList.remove('translate-x-full');
        
        // History'e durum ekle (Geri tuşu için)
        window.history.pushState({ chatOpen: true }, '', window.location.href);
    }
}

function closeMobileChat() {
    if (window.innerWidth < 768) {
        const studentListPanel = document.getElementById('msgStudentListPanel');
        const chatArea = document.getElementById('chatArea');
        
        // Listeyi Geri Getir
        studentListPanel.classList.remove('-translate-x-full');
        // Sohbeti Sağa Kaydır (Gizle)
        chatArea.classList.add('translate-x-full');
        
        currentChatStudentId = null;
        if(activeListeners.chatUnsubscribe) {
            activeListeners.chatUnsubscribe();
            activeListeners.chatUnsubscribe = null;
        }
    }
}