// === AJANDA MODÜLÜ ===
// Bu dosya, koçun "Ajandam" sayfasıyla ilgili tüm fonksiyonları yönetir.

// 1. GEREKLİ IMPORTLAR
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
    getDocs // populateStudentSelect için
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    activeListeners, 
    formatDateTR, 
    populateStudentSelect // helpers.js'den import ediyoruz
} from './helpers.js';


// --- 2. ANA FONKSİYON: AJANDA SAYFASI ---

/**
 * "Ajandam" sayfasının ana HTML iskeletini çizer ve ilgili fonksiyonları tetikler.
 * @param {object} db - Firestore veritabanı referansı
 * @param {string} currentUserId - Giriş yapmış koçun UID'si
 * @param {string} appId - Uygulama ID'si
 */
export function renderAjandaSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Ajandam";
    
    // HTML iskeletini oluştur
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
                <div id="gelecekRandevuList" class="space-y-3 max-h-96 overflow-y-auto">
                    <p class="text-center text-gray-400 py-4">Yükleniyor...</p>
                </div>
            </div>
            
            <div id="gecmisRandevular" class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Geçmiş Randevular</h3>
                <div id="gecmisRandevuList" class="space-y-3 max-h-96 overflow-y-auto">
                    <p class="text-center text-gray-400 py-4">Yükleniyor...</p>
                </div>
            </div>
        </div>
    `;

    // "Yeni Randevu Ekle" butonunu modal'a bağla
    document.getElementById('showAddRandevuModalButton').addEventListener('click', async () => {
        // Modalı açmadan önce öğrenci listesini doldur
        await populateStudentSelect(db, currentUserId, 'randevuStudentId');
        
        // Formu temizle ve varsayılanları ayarla
        document.getElementById('randevuBaslik').value = 'Birebir Koçluk';
        document.getElementById('randevuTarih').value = new Date().toISOString().split('T')[0];
        document.getElementById('randevuBaslangic').value = '09:00';
        document.getElementById('randevuBitis').value = '10:00';
        document.getElementById('randevuNot').value = '';
        document.getElementById('randevuModalErrorMessage').classList.add('hidden');
        
        // Modalı göster
        document.getElementById('addRandevuModal').style.display = 'block';
    });
    
    // Ajanda verilerini yükle
    loadAjanda(db, currentUserId, appId);
}

/**
 * Firestore'dan ajanda verilerini çeker ve listelere ayırır.
 */
function loadAjanda(db, currentUserId, appId) {
    const gelecekList = document.getElementById('gelecekRandevuList');
    const gecmisList = document.getElementById('gecmisRandevuList');
    
    // Geçerli tarih (YYYY-MM-DD formatında)
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Tüm randevuları tarihe göre azalan sırada çek
    const q = query(
        collection(db, "koclar", currentUserId, "ajandam"), 
        orderBy("tarih", "desc"), 
        orderBy("baslangic", "desc")
    );

    activeListeners.ajandaUnsubscribe = onSnapshot(q, (snapshot) => {
        const gelecek = [];
        const gecmis = [];
        
        snapshot.forEach(doc => {
            const randevu = { id: doc.id, ...doc.data() };
            // Tarihi bugünden büyük veya eşit olanlar "Gelecek" listesine
            if (randevu.tarih >= todayStr) {
                gelecek.push(randevu);
            } else {
                gecmis.push(randevu);
            }
        });

        // Gelecek randevuları ASC (eskiden yeniye) sırala
        gelecek.reverse(); 

        renderAjandaList(gelecekList, gelecek, false, db, currentUserId, appId);
        renderAjandaList(gecmisList, gecmis, true, db, currentUserId, appId);
        
    }, (error) => {
        console.error("Ajanda yüklenirken hata:", error);
        if(gelecekList) gelecekList.innerHTML = `<p class="text-red-500 text-center py-4">Veri yüklenemedi.</p>`;
        if(gecmisList) gecmisList.innerHTML = `<p class="text-red-500 text-center py-4">Veri yüklenemedi.</p>`;
    });
}

/**
 * Gelen randevu listesini HTML olarak çizer.
 */
function renderAjandaList(container, randevular, isGecmis, db, currentUserId, appId) {
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

    // Sil butonlarına event listener ekle
    container.querySelectorAll('.delete-randevu-button').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm('Bu randevuyu silmek istediğinize emin misiniz?')) {
                await deleteDoc(doc(db, "koclar", currentUserId, "ajandam", id));
                // onSnapshot sayesinde liste otomatik güncellenecek
            }
        });
    });
}

/**
 * "Yeni Randevu Ekle" modalından gelen veriyi Firestore'a kaydeder.
 * app.js tarafından çağrılır.
 */
export async function saveNewRandevu(db, currentUserId, appId) {
    // Modal elementlerinden verileri al
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
        
        await addDoc(collection(db, "koclar", currentUserId, "ajandam"), {
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
