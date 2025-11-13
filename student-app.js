// ... (Mevcut kodlar) ...

// --- MESAJLAŞMA (YENİ EKLENDİ) ---
let studentChatUnsubscribe = null;

// Sekme değiştirme dinleyicisi (Mesajlar sekmesine geçince yükle)
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        if (targetId === 'tab-messages') {
            loadStudentMessages();
        }
    });
});

// Mesaj Gönderme
document.getElementById('studentChatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('studentMessageInput');
    const text = input.value.trim();
    
    if (!text) return;

    try {
        input.value = ''; // Temizle
        // Mesajı koçun altındaki öğrenci dökümanına ekle
        await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), {
            text: text,
            gonderen: 'ogrenci', // Öğrenci gönderiyor
            tarih: serverTimestamp()
        });
        
        // Scroll en alta
        const container = document.getElementById('studentMessagesContainer');
        container.scrollTop = container.scrollHeight;

    } catch (error) {
        console.error("Mesaj hatası:", error);
        showToast("Mesaj gönderilemedi");
    }
});

function loadStudentMessages() {
    if (studentChatUnsubscribe) return; // Zaten dinleniyorsa tekrar başlatma

    const container = document.getElementById('studentMessagesContainer');
    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"),
        orderBy("tarih", "asc")
    );

    studentChatUnsubscribe = onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 opacity-60">
                    <i class="fa-regular fa-comments text-4xl"></i>
                    <p class="text-sm">Koçunla sohbete başla</p>
                </div>
            `;
            return;
        }

        snapshot.forEach(doc => {
            const msg = doc.data();
            const isMe = msg.gonderen === 'ogrenci';
            
            const div = document.createElement('div');
            div.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'}`;
            
            // Koç mesajları beyaz/gri, Öğrenci mesajları mavi/indigo
            div.innerHTML = `
                <div class="max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}">
                    <p>${msg.text}</p>
                    <p class="text-[10px] mt-1 ${isMe ? 'text-indigo-200 text-right' : 'text-gray-400'}">
                        ${msg.tarih ? new Date(msg.tarih.toDate()).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : ''}
                    </p>
                </div>
            `;
            container.appendChild(div);
        });

        // En alta kaydır
        container.scrollTop = container.scrollHeight;
    });
}
