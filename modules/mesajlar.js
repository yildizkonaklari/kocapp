import { doc, addDoc, collection, collectionGroup, query, onSnapshot, orderBy, serverTimestamp, getDocs, updateDoc, where, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { activeListeners } from './helpers.js';

// --- ÖĞRENCİ LİSTESİNİ GETİR VE OTOMATİK SEÇİM YAP ---
    loadMessageStudentList(db, currentUserId, appId);
}

function loadMessageStudentList(db, currentUserId, appId) {
    const listContainer = document.getElementById('msgStudentList');
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));

    activeListeners.messageListUnsubscribe = onSnapshot(q, async (snapshot) => {
        let students = [];
        // Okunmamış mesaj sayılarını al (Basitleştirilmiş: Her öğrenci için ayrı sorgu yerine UI'da işaretleyeceğiz)
        // Gerçek zamanlı okundu bilgisi için alt sorgu gerekir, burada basitleştiriyoruz.
        
        snapshot.forEach(doc => {
            students.push({ id: doc.id, ...doc.data() });
        });

        if (students.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Öğrenci bulunamadı.</p>';
            return;
        }

        listContainer.innerHTML = students.map(s => `
            <div class="msg-student-item flex items-center p-3 rounded-lg cursor-pointer hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100" 
                 data-id="${s.id}" data-name="${s.ad} ${s.soyad}" data-avatar="${s.avatarIcon || ''}">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 border border-white shadow-sm text-lg">
                    ${s.avatarIcon || s.ad[0]}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-bold text-gray-800 truncate">${s.ad} ${s.soyad}</h4>
                    <p class="text-xs text-gray-500 truncate" id="lastMsg-${s.id}">Sohbeti aç...</p>
                </div>
                <div id="badge-${s.id}" class="hidden w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
        `).join('');

        // Tıklama Olayları
        const items = document.querySelectorAll('.msg-student-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                items.forEach(i => i.classList.remove('bg-white', 'shadow-md', 'border-gray-200'));
                item.classList.add('bg-white', 'shadow-md', 'border-gray-200'); // Seçili stili
                loadChat(db, currentUserId, appId, item.dataset.id, item.dataset.name, item.dataset.avatar);
            });
        });

        // --- OTOMATİK SEÇİM MANTIĞI (DÜZELTME BURADA) ---
        if (window.targetMessageStudentId) {
            const targetItem = document.querySelector(`.msg-student-item[data-id="${window.targetMessageStudentId}"]`);
            if (targetItem) {
                targetItem.click(); // Tıklamayı simüle et
                targetItem.scrollIntoView({ block: 'center' }); // Listeyi kaydır
            }
            // ID'yi temizle ki tekrar tekrar açılmasın
            window.targetMessageStudentId = null; 
        }
        
        // Arama Filtresi
        document.getElementById('msgSearchStudent').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            items.forEach(item => {
                const name = item.dataset.name.toLowerCase();
                item.style.display = name.includes(term) ? 'flex' : 'none';
            });
        });
    });
}

    loadChatStudentList(db, currentUserId, appId);

    document.getElementById('chatSearchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.chat-student-item').forEach(item => {
            item.style.display = item.dataset.name.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });
}

async function loadChatStudentList(db, currentUserId, appId) {
    const listContainer = document.getElementById('chatStudentList');
    if(!listContainer) return;
    
    // 1. Öğrencileri Çek
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    try {
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="text-gray-400 text-center text-sm py-4">Öğrenci bulunamadı.</p>';
            return;
        }

        listContainer.innerHTML = '';
        
        // Her öğrenci için liste elemanı oluştur
        snapshot.forEach(doc => {
            const s = doc.data();
            const div = document.createElement('div');
            div.className = 'chat-student-item flex items-center p-3 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors border border-transparent hover:border-purple-100 mx-1 relative';
            div.dataset.name = `${s.ad} ${s.soyad}`;
            div.dataset.id = doc.id; // ID'yi sakla
            div.innerHTML = `
                <div class="relative">
                    <div class="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm border border-white">
                        ${s.ad[0]}${s.soyad[0]}
                    </div>
                </div>
                <div class="ml-3 overflow-hidden flex-1">
                    <div class="flex justify-between items-center">
                        <p class="student-name-text text-sm text-gray-700 truncate font-medium">${s.ad} ${s.soyad}</p>
                        <span class="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">${s.sinif}</span>
                    </div>
                    <p class="text-xs text-gray-500 truncate mt-0.5 text-indigo-500">Mesajlaşmak için dokun</p>
                </div>
                
                <div class="unread-badge hidden absolute top-3 right-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white">0</div>
                
                <i class="fa-solid fa-chevron-right text-gray-300 text-xs ml-2"></i>
            `;
            
            div.onclick = () => {
                if (window.innerWidth < 1024) {
                    document.getElementById('chatSidebar').classList.add('hidden');
                    document.getElementById('chatArea').classList.remove('hidden');
                }

                document.querySelectorAll('.chat-student-item').forEach(el => {
                    el.classList.remove('bg-purple-100', 'border-purple-200');
                    el.classList.add('hover:bg-purple-50');
                });
                div.classList.remove('hover:bg-purple-50');
                div.classList.add('bg-purple-100', 'border-purple-200');

                // Okunmamış mesajları sıfırla (Görsel)
                const badge = div.querySelector('.unread-badge');
                badge.classList.add('hidden');
                div.querySelector('.student-name-text').classList.remove('font-bold', 'text-black');
                div.querySelector('.student-name-text').classList.add('text-gray-700', 'font-medium');

                loadChatMessages(db, currentUserId, appId, doc.id, `${s.ad} ${s.soyad}`);
            };
            
            listContainer.appendChild(div);
        });

        // 2. Okunmamış Mesajları Dinle ve Rozetleri Güncelle
        listenUnreadMessagesForList(db, currentUserId, listContainer);

    } catch (error) {
        console.error("Liste yükleme hatası:", error);
        listContainer.innerHTML = '<p class="text-red-400 text-center text-sm py-4">Hata oluştu.</p>';
    }
}

// YENİ: Listedeki Öğrenciler İçin Okunmamış Mesajları Takip Et
function listenUnreadMessagesForList(db, uid, listContainer) {
    const q = query(
        collectionGroup(db, 'mesajlar'), 
        where('kocId', '==', uid), 
        where('gonderen', '==', 'ogrenci'), 
        where('okundu', '==', false)
    );

    // Bu listener sayfa değişince temizlenmeli (activeListeners'a eklenebilir ama şimdilik basit tutuyoruz)
    onSnapshot(q, (snapshot) => {
        // Önce tüm rozetleri temizle
        listContainer.querySelectorAll('.unread-badge').forEach(el => el.classList.add('hidden'));
        listContainer.querySelectorAll('.student-name-text').forEach(el => {
            el.classList.remove('font-bold', 'text-black');
            el.classList.add('font-medium', 'text-gray-700');
        });

        // Mesajları öğrenciye göre grupla
        const unreadCounts = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            // Mesajın hangi öğrenciye ait olduğunu bulmak için path'e bakıyoruz
            // Path: .../ogrencilerim/{studentId}/mesajlar/{msgId}
            const studentId = doc.ref.parent.parent.id;
            
            unreadCounts[studentId] = (unreadCounts[studentId] || 0) + 1;
        });

        // Rozetleri güncelle
        Object.entries(unreadCounts).forEach(([sid, count]) => {
            const item = listContainer.querySelector(`.chat-student-item[data-id="${sid}"]`);
            if (item) {
                const badge = item.querySelector('.unread-badge');
                const nameText = item.querySelector('.student-name-text');
                
                if (badge && count > 0) {
                    badge.textContent = count > 9 ? '9+' : count;
                    badge.classList.remove('hidden');
                    
                    // İsmi kalınlaştır
                    if(nameText) {
                        nameText.classList.remove('font-medium', 'text-gray-700');
                        nameText.classList.add('font-bold', 'text-black');
                    }
                    
                    // Listede en üste taşı (Opsiyonel)
                    listContainer.prepend(item);
                }
            }
        });
    });
}

function loadChatMessages(db, currentUserId, appId, studentId, studentName) {
    const chatArea = document.getElementById('chatArea');
    if(!chatArea) return;

    // Mesajlar yüklendiğinde "okundu" olarak işaretle
    markMessagesAsRead(db, currentUserId, appId, studentId);

    chatArea.innerHTML = `
        <div class="px-4 py-3 bg-white border-b border-gray-200 flex items-center shadow-sm z-30 shrink-0 sticky top-0">
            <button id="btnBackToChatList" class="lg:hidden mr-3 text-gray-500 hover:text-purple-600">
                <i class="fa-solid fa-arrow-left text-lg"></i>
            </button>
            <div class="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs mr-3 shadow-md shadow-indigo-200">
                ${studentName.split(' ').map(n=>n[0]).join('')}
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-gray-800 text-sm">${studentName}</h3>
                <p class="text-[10px] text-green-600 flex items-center"><span class="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span> Çevrimiçi</p>
            </div>
        </div>

        <div id="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 scroll-smooth pb-28 lg:pb-4">
            <div class="flex justify-center"><span class="text-[10px] text-gray-400 bg-gray-200 px-2 py-1 rounded-full">Sohbet Başladı</span></div>
        </div>

        <div class="p-3 bg-white border-t border-gray-200 shrink-0 fixed bottom-16 left-0 w-full z-40 lg:static lg:w-full lg:bottom-auto lg:border-t lg:border-gray-200">
            <form id="chatForm" class="flex gap-2 items-end">
                <div class="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-2 border border-transparent focus-within:border-indigo-500 focus-within:bg-white transition-all">
                    <input type="text" id="messageInput" placeholder="Mesajınızı yazın..." class="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-800 placeholder-gray-400" autocomplete="off">
                </div>
                <button type="submit" id="btnSendMsg" class="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
                    <i class="fa-solid fa-paper-plane text-sm"></i>
                </button>
            </form>
        </div>
    `;

    const backBtn = document.getElementById('btnBackToChatList');
    if (backBtn) {
        backBtn.onclick = () => {
            document.getElementById('chatArea').classList.add('hidden');
            document.getElementById('chatSidebar').classList.remove('hidden');
        };
    }

    const container = document.getElementById('messagesContainer');
    const form = document.getElementById('chatForm');
    const input = document.getElementById('messageInput');

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
        } catch (err) {
            console.error("Mesaj gönderme hatası:", err);
        }
    };
    form.onsubmit = send;

    if (activeListeners.chatUnsubscribe) activeListeners.chatUnsubscribe();
    
    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"),
        orderBy("tarih", "asc")
    );
    
    activeListeners.chatUnsubscribe = onSnapshot(q, (snap) => {
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
        
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    });
}

// Mesajları Okundu Olarak İşaretle
async function markMessagesAsRead(db, uid, appId, sid) {
    const q = query(
        collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "mesajlar"),
        where('gonderen', '==', 'ogrenci'),
        where('okundu', '==', false)
    );
    
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    
    snap.forEach(doc => {
        batch.update(doc.ref, { okundu: true });
    });
    
    if (!snap.empty) await batch.commit();
}
