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
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR } from './helpers.js';

// === MESAJLAR SAYFASI ANA FONKSİYONU ===
export function renderMesajlarSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Mesajlar";
    const mainContentArea = document.getElementById("mainContentArea");
    
    // 1. Sayfa İskeleti
    mainContentArea.innerHTML = `
        <div class="flex flex-col md:flex-row h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="w-full md:w-1/3 border-r border-gray-100 flex flex-col bg-gray-50">
                <div class="p-4 border-b border-gray-100 bg-white">
                    <input type="text" id="msgSearchStudent" placeholder="Öğrenci ara..." class="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50">
                </div>
                <div id="msgStudentList" class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    <p class="text-center text-gray-400 text-sm py-4">Yükleniyor...</p>
                </div>
            </div>

            <div class="w-full md:w-2/3 flex flex-col bg-white relative" id="chatArea">
                <div id="chatEmptyState" class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center h-full">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">💬</div>
                    <p>Mesajlaşmak için soldan bir öğrenci seçin.</p>
                </div>

                <div id="chatContent" class="hidden flex-col h-full">
                    <div class="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                        <div class="flex items-center">
                            <div id="chatHeaderAvatar" class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold mr-3"></div>
                            <div>
                                <h3 id="chatHeaderName" class="font-bold text-gray-800 text-sm">Öğrenci Adı</h3>
                                <p class="text-xs text-green-500 flex items-center gap-1"><span class="w-2 h-2 bg-green-500 rounded-full"></span> Çevrimiçi</p>
                            </div>
                        </div>
                    </div>

                    <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 custom-scrollbar"></div>

                    <div class="p-4 border-t border-gray-100 bg-white shrink-0">
                        <form id="chatForm" class="flex gap-2">
                            <input type="hidden" id="chatTargetStudentId">
                            <input type="text" id="chatInput" placeholder="Mesaj yaz..." class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" autocomplete="off">
                            <button type="submit" class="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 flex items-center justify-center min-w-[50px]">
                                <i class="fa-solid fa-paper-plane"></i>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 2. Öğrenci Listesini Yükle
    loadMessageStudentList(db, currentUserId, appId);

    // 3. Mesaj Gönderme Olayı
    document.getElementById('chatForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const studentId = document.getElementById('chatTargetStudentId').value;
        if (studentId) sendMessage(db, currentUserId, appId, studentId);
    });
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
            listContainer.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Öğrenci bulunamadı.</p>';
            return;
        }

        listContainer.innerHTML = students.map(s => `
            <div class="msg-student-item flex items-center p-3 rounded-lg cursor-pointer hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100 group" 
                 data-id="${s.id}" data-name="${s.ad} ${s.soyad}" data-avatar="${s.avatarIcon || ''}">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 border border-white shadow-sm text-lg shrink-0 group-hover:scale-105 transition-transform">
                    ${s.avatarIcon || s.ad[0]}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-bold text-gray-800 truncate">${s.ad} ${s.soyad}</h4>
                    <p class="text-xs text-gray-500 truncate group-hover:text-purple-500 transition-colors">Sohbeti aç...</p>
                </div>
                <div class="hidden w-2 h-2 bg-red-500 rounded-full ml-2"></div>
            </div>
        `).join('');

        // Tıklama Olayları
        const items = document.querySelectorAll('.msg-student-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                // Görsel Seçim Efekti
                items.forEach(i => {
                    i.classList.remove('bg-white', 'shadow-md', 'border-gray-200');
                    i.classList.add('hover:bg-white');
                });
                item.classList.add('bg-white', 'shadow-md', 'border-gray-200');
                item.classList.remove('hover:bg-white');

                // Sohbeti Yükle
                loadChat(db, currentUserId, appId, item.dataset.id, item.dataset.name, item.dataset.avatar);
                
                // Mobilde liste gizlenebilir (Opsiyonel UX)
                if(window.innerWidth < 768) {
                    // Mobilde UX geliştirmesi yapılabilir
                }
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

        // --- OTOMATİK SEÇİM (Öğrenci Detay Sayfasından Gelen Yönlendirme) ---
        if (window.targetMessageStudentId) {
            const targetItem = document.querySelector(`.msg-student-item[data-id="${window.targetMessageStudentId}"]`);
            if (targetItem) {
                targetItem.click(); // Tıklamayı simüle et
                targetItem.scrollIntoView({ block: 'center', behavior: 'smooth' }); // Listeyi kaydır
            }
            window.targetMessageStudentId = null; // ID'yi temizle
        }
    });
}

// === SOHBET YÜKLEME ===
function loadChat(db, currentUserId, appId, studentId, studentName, studentAvatar) {
    document.getElementById('chatEmptyState').classList.add('hidden');
    document.getElementById('chatContent').classList.remove('hidden');
    document.getElementById('chatContent').classList.add('flex'); // Flex yapısını geri getir

    // Header Güncelle
    document.getElementById('chatHeaderName').textContent = studentName;
    const avatarEl = document.getElementById('chatHeaderAvatar');
    if (studentAvatar) {
        avatarEl.textContent = studentAvatar;
        avatarEl.style.backgroundColor = '#fff';
        avatarEl.className = "w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-xl mr-3 shadow-sm";
    } else {
        avatarEl.textContent = studentName[0];
        avatarEl.className = "w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold mr-3";
    }
    
    document.getElementById('chatTargetStudentId').value = studentId;
    
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '<div class="flex justify-center p-4"><i class="fa-solid fa-spinner fa-spin text-purple-500"></i></div>';

    // Mesajları Dinle
    if (activeListeners.chatUnsubscribe) activeListeners.chatUnsubscribe();

    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"), 
        orderBy("tarih", "asc")
    );

    activeListeners.chatUnsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            messagesContainer.innerHTML = '<p class="text-center text-gray-400 text-xs mt-10">Henüz mesaj yok. İlk mesajı sen at! 👋</p>';
            return;
        }

        let html = '';
        let unreadBatch = []; // Okundu olarak işaretlenecekler

        snapshot.forEach(doc => {
            const m = doc.data();
            const isMe = m.gonderen === 'koc';
            const time = m.tarih ? m.tarih.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
            
            // Okundu işaretleme listesi
            if (!isMe && !m.okundu) {
                unreadBatch.push(doc.ref);
            }

            html += `
                <div class="flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-2 animate-fade-in">
                    <div class="max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                        <div class="px-4 py-2 rounded-2xl text-sm shadow-sm relative ${isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}">
                            <p>${m.text}</p>
                        </div>
                        <span class="text-[10px] text-gray-400 mt-1 px-1 flex items-center gap-1">
                            ${time} ${isMe ? (m.okundu ? '<i class="fa-solid fa-check-double text-blue-400"></i>' : '<i class="fa-solid fa-check"></i>') : ''}
                        </span>
                    </div>
                </div>
            `;
        });

        messagesContainer.innerHTML = html;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Okundu olarak işaretle (Toplu işlem)
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
        input.value = ''; // Hızlıca temizle
        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"), {
            text: text,
            gonderen: 'koc',
            tarih: serverTimestamp(),
            okundu: false,
            kocId: currentUserId
        });
    } catch (error) {
        console.error("Mesaj gönderme hatası:", error);
        alert("Mesaj gönderilemedi.");
    }
}
