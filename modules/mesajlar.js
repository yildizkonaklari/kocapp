import { doc, addDoc, collection, query, onSnapshot, orderBy, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { activeListeners } from './helpers.js';

export function renderMesajlarSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Mesajlar";
    const mainContentArea = document.getElementById("mainContentArea");
    
    // Responsive Layout: Mobilde Alt Alta (Col), Masaüstünde Yan Yana (Row)
    mainContentArea.innerHTML = `
        <div class="flex flex-col lg:flex-row h-[calc(100vh-180px)] lg:h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            <!-- SOL PANEL: Liste (Mobilde Üstte ve Kısa) -->
            <div class="w-full lg:w-1/3 h-1/3 lg:h-full border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col">
                <div class="p-3 border-b border-gray-100 bg-gray-50">
                    <input type="text" id="chatSearchInput" placeholder="Öğrenci Ara..." class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-purple-500 outline-none">
                </div>
                <div id="chatStudentList" class="flex-1 overflow-y-auto overflow-x-hidden p-1 space-y-1">
                    <p class="text-gray-400 text-center text-sm py-4">Yükleniyor...</p>
                </div>
            </div>

            <!-- SAĞ PANEL: Sohbet (Mobilde Altta ve Uzun) -->
            <div class="w-full lg:w-2/3 h-2/3 lg:h-full flex flex-col bg-gray-50 relative" id="chatArea">
                <div class="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <i class="fa-regular fa-comments text-4xl mb-2 opacity-20"></i>
                    <p class="text-sm">Mesajlaşmak için bir öğrenci seçin.</p>
                </div>
            </div>
        </div>
    `;

    loadChatStudentList(db, currentUserId, appId);
    
    // Arama
    document.getElementById('chatSearchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.chat-student-item').forEach(item => {
            item.style.display = item.dataset.name.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });
}

async function loadChatStudentList(db, currentUserId, appId) {
    const listContainer = document.getElementById('chatStudentList');
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) { listContainer.innerHTML = '<p class="text-gray-400 text-center text-sm py-4">Öğrenci yok.</p>'; return; }
        listContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const s = doc.data();
            const div = document.createElement('div');
            div.className = 'chat-student-item flex items-center p-3 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors border border-transparent hover:border-purple-100';
            div.dataset.name = `${s.ad} ${s.soyad}`;
            div.innerHTML = `
                <div class="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">${s.ad[0]}${s.soyad[0]}</div>
                <div class="ml-3 overflow-hidden">
                    <p class="text-sm font-bold text-gray-800 truncate">${s.ad} ${s.soyad}</p>
                    <p class="text-xs text-gray-500 truncate">${s.sinif}</p>
                </div>
            `;
            div.onclick = () => loadChatMessages(db, currentUserId, appId, doc.id, `${s.ad} ${s.soyad}`);
            listContainer.appendChild(div);
        });
    } catch (error) { console.error(error); }
}

function loadChatMessages(db, currentUserId, appId, studentId, studentName) {
    const chatArea = document.getElementById('chatArea');
    chatArea.innerHTML = `
        <div class="px-4 py-3 bg-white border-b border-gray-200 flex items-center shadow-sm z-10">
            <div class="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs mr-2">${studentName.charAt(0)}</div>
            <h3 class="font-bold text-gray-800 text-sm">${studentName}</h3>
        </div>
        <div id="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-100 flex flex-col"></div>
        <div class="p-2 bg-white border-t border-gray-200 flex gap-2">
            <input type="text" id="messageInput" placeholder="Mesaj..." class="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-purple-500 text-sm" autocomplete="off">
            <button id="btnSendMsg" class="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-md active:scale-95"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
    `;

    const container = document.getElementById('messagesContainer');
    const btnSend = document.getElementById('btnSendMsg');
    const input = document.getElementById('messageInput');

    // Gönder
    const send = async () => {
        const txt = input.value.trim();
        if(!txt) return;
        input.value = '';
        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"), {
            text: txt, gonderen: 'koc', tarih: serverTimestamp(), okundu: false, kocId: currentUserId
        });
        container.scrollTop = container.scrollHeight;
    };
    btnSend.onclick = send;
    input.onkeypress = (e) => { if(e.key==='Enter') send(); };

    // Dinle
    if (activeListeners.chatUnsubscribe) activeListeners.chatUnsubscribe();
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"), orderBy("tarih"));
    
    activeListeners.chatUnsubscribe = onSnapshot(q, (snap) => {
        container.innerHTML = '';
        snap.forEach(doc => {
            const m = doc.data();
            const isMe = m.gonderen === 'koc';
            container.innerHTML += `
                <div class="flex w-full ${isMe ? 'justify-end' : 'justify-start'}">
                    <div class="max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}">
                        <p>${m.text}</p>
                        <p class="text-[9px] opacity-70 text-right mt-1">${m.tarih ? new Date(m.tarih.toDate()).toLocaleTimeString().slice(0,5) : '...'}</p>
                    </div>
                </div>`;
        });
        container.scrollTop = container.scrollHeight;
    });
}
