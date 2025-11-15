// === AJANDA MODÜLÜ ===
// ... (imports) ...
import { 
    doc, 
    addDoc, 
    updateDoc, 
    collection, 
    query, 
    onSnapshot, 
    deleteDoc, 
    orderBy, 
    where, 
    serverTimestamp,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// ... (imports) ...
import { 
    activeListeners, 
    formatDateTR, 
    populateStudentSelect
} from './helpers.js';


// --- ANA FONKSİYON: AJANDA SAYFASI ---
export function renderAjandaSayfasi(db, currentUserId, appId) { // appId buraya geliyor
    // ... (HTML iskeleti aynı) ...
    serverTimestamp,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    activeListeners, 
    formatDateTR, 
    populateStudentSelect
} from './helpers.js';


// --- ANA FONKSİYON: AJANDA SAYFASI ---
export function renderAjandaSayfasi(db, currentUserId, appId) {
    // ... (renderAjandaSayfasi HTML iskeleti aynı) ...
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Ajandam";
    
    mainContentArea.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 class="text-xl font-semibold text-gray-700">Randevu Takvimi</h2>
            <button id="showAddRandevuModalButton" class="w-full md:w-auto bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Yeni Randevu Planla
            </button>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div id="gelecekRandevular" class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Gelecek Randevular</h3>
                <div id="gelecekRandevuList" class="space-y-3 max-h-96 overflow-y-auto"><p class="text-center text-gray-400 py-4">Yükleniyor...</p></div>
            </div>
            
            <div id="gecmisRandevular" class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Geçmiş Randevular</h3>
                <div id="gecmisRandevuList" class="space-y-3 max-h-96 overflow-y-auto"><p class="text-center text-gray-400 py-4">Yükleniyor...</p></div>
            </div>
        </div>
    `;

    document.getElementById('showAddRandevuModalButton').addEventListener('click', async () => {
        // DÜZELTME: populateStudentSelect fonksiyonuna 'appId' eklendi
        await populateStudentSelect(db, currentUserId, appId, 'randevuStudentId');
        
        document.getElementById('randevuBaslik').value = 'Birebir Koçluk';
        document.getElementById('randevuTarih').value = new Date().toISOString().split('T')[0];
        document.getElementById('randevuBaslangic').value = '09:00';
        document.getElementById('randevuBitis').value = '10:00';
        document.getElementById('randevuNot').value = '';
        document.getElementById('randevuModalErrorMessage').classList.add('hidden');
        document.getElementById('addRandevuModal').style.display = 'block';
    });
    
    loadAjanda(db, currentUserId, appId); // appId buraya da iletiliyor
}

/**
 * Firestore'dan ajanda verilerini çeker ve listelere ayırır.
 */
function loadAjanda(db, currentUserId, appId) { // appId buraya da iletiliyor
    const gelecekList = document.getElementById('gelecekRandevuList');
    const gecmisList = document.getElementById('gecmisRandevuList');
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Veritabanı Yolu DÜZELTİLDİ: 'koclar' -> 'artifacts'
    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ajandam"), 
        orderBy("tarih", "desc"), 
        orderBy("baslangic", "desc")
    );

    activeListeners.ajandaUnsubscribe = onSnapshot(q, (snapshot) => {
        const gelecek = [];
        const gecmis = [];
        
        snapshot.forEach(doc => {
            const randevu = { id: doc.id, ...doc.data() };
            if (randevu.tarih >= todayStr) {
                gelecek.push(randevu);
            } else {
                gecmis.push(randevu);
            }
        });

        gelecek.reverse(); // Gelecek randevularını (15 Kasım, 16 Kasım) şeklinde sırala

        renderAjandaList(gelecekList, gelecek, false, db, currentUserId, appId);
        renderAjandaList(gecmisList, gecmis, true, db, currentUserId, appId);
        
    }, (error) => {
        console.error("Ajanda yüklenirken hata:", error);
        
        // GÜNCELLENDİ: Hata yönetimi
        let errorMsg = "Veri yüklenemedi. Lütfen internet bağlantınızı kontrol edin.";
        if (error.code === 'failed-precondition') {
            errorMsg = "Veritabanı index'i gerekiyor. Lütfen Firebase konsolundan 'ajandam' koleksiyonu için (tarih-desc, baslangic-desc) index'i oluşturun.";
            // Hata mesajını konsola daha net yazdır
            console.error("Eksik Firestore İndeksi! Lütfen konsolda görünen linke tıklayarak indeksi oluşturun.", error.message);
        }
        
        if(gelecekList) gelecekList.innerHTML = `<p class="text-red-500 text-center py-4">${errorMsg}</p>`;
        if(gecmisList) gecmisList.innerHTML = `<p class="text-red-500 text-center py-4"></p>`; // İkinci mesajı gizle
    });
}

/**
 * Gelen randevu listesini HTML olarak çizer.
 */
function renderAjandaList(container, randevular, isGecmis, db, currentUserId, appId) {
    // ... (Bu fonksiyonun içeriği aynı kalacak) ...
    if (!container) return;
    
    if (randevular.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-center py-4">${isGecmis ? 'Geçmiş randevu yok.' : 'Gelecek randevu yok.'}</p>`;
        return;
    }
    
    container.innerHTML = randevular.map(r => `
        <div class="border border-gray-200 rounded-lg p-3 ${isGecmis ? 'bg-gray-50 opacity-70' : 'bg-white hover:shadow-md transition-shadow'}">
            <div class="flex justify-between items-center">
                <span class="text-sm font-bold text-purple-700">${r.ogrenciAd}</span>
                <span class="text-xs font-mono text-gray-600 ${isGecmis ? '' : 'font-bold'}">${formatDateTR(r.tarih)} @ ${r.baslangic}</span>
            </div>
            <p class="text-sm text-gray-700 mt-1">${r.baslik}</p>
            <p class="text-xs text-gray-500 mt-1">${r.not || ''}</p>
            <div class="text-right mt-1">
                <button data-id="${r.id}" class="delete-randevu-button text-xs text-red-400 hover:text-red-700">Sil</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.delete-randevu-button').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm('Bu randevuyu silmek istediğinize emin misiniz?')) {
                // Veritabanı yolu DÜZELTİLDİ:
                await deleteDoc(doc(db, "artifacts", appId, "users", currentUserId, "ajandam", id));
            }
        });
    });
}

/**
 * app.js tarafından çağrılır.
 */
export async function saveNewRandevu(db, currentUserId, appId) {
    // ... (Bu fonksiyonun içeriği aynı kalacak) ...
    const studentId = document.getElementById('randevuStudentId').value;
    const studentName = document.getElementById('randevuStudentId').options[document.getElementById('randevuStudentId').selectedIndex].text;
    const baslik = document.getElementById('randevuBaslik').value.trim();
    const tarih = document.getElementById('randevuTarih').value;
    const baslangic = document.getElementById('randevuBaslangic').value;
    const bitis = document.getElementById('randevuBitis').value;
    const not = document.getElementById('randevuNot').value.trim();
    
    const errorEl = document.getElementById('randevuModalErrorMessage');
    const saveButton = document.getElementById('saveRandevuButton');

    if (!studentId || !baslik || !tarih || !baslangic || !bitis) {
        errorEl.textContent = "Lütfen tüm zorunlu alanları doldurun.";
        errorEl.classList.remove('hidden');
        return;
    }
    
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";
        
        // Veritabanı yolu DÜZELTİLDİ:
        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ajandam"), {
            studentId, 
            ogrenciAd: studentName, 
            baslik, 
            tarih, 
            baslangic, 
            bitis, 
            not,
            olusturmaTarihi: serverTimestamp()
        });
        
        document.getElementById('addRandevuModal').style.display = 'none';
        
    } catch (error) {
        console.error("Randevu kaydetme hatası:", error);
        errorEl.textContent = `Hata: ${error.message}`;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Randevuyu Kaydet";
    }
}
