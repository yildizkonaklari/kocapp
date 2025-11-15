// === MESAJLAR MODÜLÜ ===
// Bu dosya, koçun "Mesajlar" sayfasıyla (WhatsApp benzeri sohbet) ilgili tüm fonksiyonları yönetir.

// 1. GEREKLİ IMPORTLAR
import { 
    doc, 
    addDoc, 
    collection, 
    query, 
    onSnapshot, 
    orderBy, 
    serverTimestamp,
    getDocs // Öğrenci listesini çekmek için
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// helpers.js dosyamızdan ortak fonksiyonları import ediyoruz
import { 
    activeListeners 
} from './helpers.js';

// --- 2. ANA FONKSİYON: MESAJLAR SAYFASI ---

/**
 * "Mesajlar" sayfasının ana HTML iskeletini (çift sütunlu yapı) çizer ve verileri yükler.
 * @param {object} db - Firestore veritabanı referansı
 * @param {string} currentUserId - Giriş yapmış koçun UID'si
 * @param {string} appId - Uygulama ID'si
 */
export function renderMesajlarSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Mesajlar";
    
    // HTML iskeletini oluştur
    mainContentArea.innerHTML = `
        <div class="flex h-[calc(100vh-140px)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            
            <!-- SOL PANEL: Öğrenci Listesi -->
            <div class="w-1/3 border-r border-gray-200 flex flex-col">
                <div class="p-4 border-b border-gray-200 bg-gray-50">
                    <input type="text" id="chatSearchInput" placeholder="Öğrenci Ara..." class="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:border-purple-500">
                </div>
                <div id="chatStudentList" class="flex-1 overflow-y-auto overflow-x-hidden">
                    <p class="text-gray-400 text-center text-sm py-4">Yükleniyor...</p>
                </div>
            </div>

            <!-- SAĞ PANEL: Sohbet Ekranı -->
            <div class="w-2/3 flex flex-col bg-gray-50" id="chatArea">
                <!-- Boş Durum -->
                <div class="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <svg class="w-16 h-16 mb-4 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"></path><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"></path></svg>
                    <p>Mesajlaşmak için soldan bir öğrenci seçin.</p>
                </div>
            </div>
        </div>
    `;

    // Öğrenci listesini yükle
    loadChatStudentList(db, currentUserId, appId);
    
    // Arama filtresi
    document.getElementById('chatSearchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.chat-student-item').forEach(item => {
            const name = item.dataset.name.toLowerCase();
            item.style.display = name.includes(term) ? 'flex' : 'none';
        });
    });
}

/**
 * Sol paneli (sohbet edilecek öğrenci listesi) yükler.
 */
async function loadChatStudentList(db, currentUserId, appId) {
    const listContainer = document.getElementById('chatStudentList');
    
    // DÜZELTME: Veritabanı yolu 'koclar' -> 'artifacts'
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
            div.className = 'chat-student-item flex items-center p-3 border-b border-gray-100 cursor-pointer hover:bg-purple-50 transition-colors';
            div.dataset.id = doc.id;
            div.dataset.name = `${s.ad} ${s.soyad}`;
            
            div.innerHTML = `
                <div class="relative">
                    <div class="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                        ${s.ad[0] || '?'}${s.soyad[0] || ''}
                    </div>
                </div>
                <div class="ml-3 overflow-hidden">
                    <p class="text-sm font-medium text-gray-900 truncate">${s.ad} ${s.soyad}</p>
                    <p class="text-xs text-gray-500 truncate">${s.sinif}</p>
                </div>
                <i class="fa-solid fa-chevron-right ml-auto text-gray-300 text-xs"></i>
            `;
            
            // Öğrenciye tıklandığında sohbeti yükle
            div.addEventListener('click', () => {
                // Aktif stili değiştir
                document.querySelectorAll('.chat-student-item').forEach(el => el.classList.remove('bg-purple-100', 'border-l-4', 'border-purple-600'));
                div.classList.add('bg-purple-100', 'border-l-4', 'border-purple-600');
                div.classList.remove('border-b');
                
                loadChatMessages(db, currentUserId, appId, doc.id, `${s.ad} ${s.soyad}`);
            });
            
            listContainer.appendChild(div);
        });
    } catch (error) {
        console.error("Sohbet için öğrenci listesi yüklenirken hata:", error);
        listContainer.innerHTML = `<p class="text-red-500 text-center text-sm py-4">Öğrenciler yüklenemedi. Kuralları kontrol edin.</p>`;
    }
}

/**
 * Seçilen öğrencinin mesajlarını yükler ve sohbet alanını oluşturur.
 */
function loadChatMessages(db, currentUserId, appId, studentId, studentName) {
    const chatArea = document.getElementById('chatArea');
    
    // Sohbet Arayüzünü Kur
    chatArea.innerHTML = `
        <!-- Sohbet Başlığı -->
        <div class="px-4 py-3 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
            <div class="flex items-center">
                <div class="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs mr-2">
                    ${studentName.split(' ').map(n=>n[0]).join('')}
                </div>
                <h3 class="font-bold text-gray-800">${studentName}</h3>
            </div>
        </div>

        <!-- Mesajlar Alanı -->
        <div id="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 flex flex-col">
            <p class="text-center text-gray-400 text-xs my-4">Sohbet Başladı</p>
        </div>

        <!-- Mesaj Yazma Alanı -->
        <div class="p-3 bg-white border-t border-gray-200">
            <form id="chatForm" class="flex gap-2">
                <input type="text" id="messageInput" placeholder="Mesajınızı yazın..." class="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all" autocomplete="off">
                <button type="submit" class="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-transform active:scale-95">
                    <svg class="w-4 h-4 transform rotate-90 translate-x-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                </button>
            </form>
        </div>
    `;

    const messagesContainer = document.getElementById('messagesContainer');
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');

    // Mesaj Gönderme
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text) return;

        try {
            messageInput.value = ''; // Hemen temizle (Hızlı hissettir)
            
            // DÜZELTME: Veritabanı yolu
            await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"), {
                text: text,
                gonderen: 'koc', // Biz (koç) gönderiyoruz
                tarih: serverTimestamp()
            });
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.error("Mesaj gönderme hatası:", error);
            alert("Mesaj gönderilemedi.");
        }
    });

    // Mesajları Dinle (Real-time)
    
    // Önceki öğrencinin sohbet dinleyicisini kapat
    if (activeListeners.chatUnsubscribe) activeListeners.chatUnsubscribe();

    // DÜZELTME: Veritabanı yolu
    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "mesajlar"),
        orderBy("tarih", "asc")
    );

    activeListeners.chatUnsubscribe = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '<p class="text-center text-gray-400 text-xs my-4">Sohbet Başladı</p>'; // Temizle ve başla
        
        snapshot.forEach(doc => {
            const msg = doc.data();
            const isMe = msg.gonderen === 'koc'; // Koç biziz
            
            // Mesaj Balonu HTML
            const msgDiv = document.createElement('div');
            msgDiv.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'}`;
            
            const bubbleHtml = `
                <div class="max-w-[70%] px-4 py-2 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}">
                    <p>${msg.text}</p>
                    <p class="text-[10px] mt-1 ${isMe ? 'text-purple-200 text-right' : 'text-gray-400'}">
                        ${msg.tarih ? new Date(msg.tarih.toDate()).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : '...'}
                    </p>
                </div>
            `;
            
            msgDiv.innerHTML = bubbleHtml;
            messagesContainer.appendChild(msgDiv);
        });

        // Yeni mesaj gelince otomatik aşağı kaydır
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}
