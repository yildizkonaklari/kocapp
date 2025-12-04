import { 
    collection, collectionGroup, query, onSnapshot, updateDoc, deleteDoc, 
    where, orderBy, getDocs, doc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { activeListeners, formatDateTR, populateStudentSelect } from './helpers.js';

let allGoals = [];
let studentMap = {};
// YENİ: Veritabanı referansını modül genelinde saklamak için değişken
let currentDb = null; 
let currentStudentId = null;

export async function renderHedeflerSayfasi(db, currentUserId, appId) {
    // DB referansını kaydet, böylece global fonksiyonlar erişebilir
    currentDb = db;

    document.getElementById("mainContentTitle").textContent = "Hedef Yönetimi";
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div class="w-full md:w-1/3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Öğrenci Seçin</label>
                <select id="filterGoalStudent" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500">
                    <option value="" disabled selected>Öğrenci Seçiniz...</option>
                </select>
            </div>
            <button id="btnAddNewGoal" class="hidden bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-sm flex items-center">
                <i class="fa-solid fa-plus mr-2"></i> Yeni Hedef Ata
            </button>
        </div>

        <div id="goalsListContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div id="goalEmptyState" class="col-span-full text-center text-gray-400 py-12">
                <i class="fa-solid fa-bullseye text-4xl mb-3 opacity-20"></i>
                <p>Hedefleri görmek için lütfen bir öğrenci seçin.</p>
            </div>
        </div>
    `;

    // Öğrenci Listesini Doldur
    await populateStudentSelect(db, currentUserId, appId, 'filterGoalStudent');

    // Event Listeners
    document.getElementById('filterGoalStudent').addEventListener('change', (e) => {
        currentStudentId = e.target.value;
        document.getElementById('btnAddNewGoal').classList.remove('hidden');
        // Hedefleri Getir
        startGoalListener(db, currentUserId, appId, currentStudentId);
    });
    
    // Ekle Butonu
    document.getElementById('btnAddNewGoal').addEventListener('click', () => {
        if (!currentStudentId) { alert("Lütfen öğrenci seçin."); return; }

        // Formu Temizle
        document.getElementById('hedefTitle').value = '';
        document.getElementById('hedefAciklama').value = '';
        document.getElementById('hedefBitisTarihi').value = '';

        // Gizli ID Ata
        document.getElementById('currentStudentIdForHedef').value = currentStudentId;
        
        // Modal içindeki select'i gizle (Zaten seçili)
        const selectContainer = document.getElementById('hedefStudentSelectContainer');
        if(selectContainer) selectContainer.classList.add('hidden');

        document.getElementById('addHedefModal').style.display = 'block';
    });
}

function startGoalListener(db, uid, appId, studentId) {
    const container = document.getElementById('goalsListContainer');
    container.innerHTML = '<p class="col-span-full text-center text-gray-400 p-8">Yükleniyor...</p>';

    // Doğrudan öğrencinin alt koleksiyonundan çekiyoruz
    const q = query(
        collection(db, "artifacts", appId, "users", uid, "ogrencilerim", studentId, "hedefler"),
        orderBy('bitisTarihi', 'asc') // Yakın tarihli hedefler önce
    );
    
    if (activeListeners.hedeflerUnsubscribe) activeListeners.hedeflerUnsubscribe();
    
    activeListeners.hedeflerUnsubscribe = onSnapshot(q, (snap) => {
        const goals = [];
        snap.forEach(doc => {
            goals.push({ id: doc.id, ...doc.data(), path: doc.ref.path });
        });
        // Not: renderGoals'a db geçmiyoruz, global currentDb kullanacak
        renderGoals(goals); 
    }, (error) => {
        console.error("Hedefler yüklenirken hata:", error);
        container.innerHTML = `<p class="col-span-full text-center text-red-500 p-8">Veriler yüklenemedi: ${error.message}</p>`;
    });
}

function renderGoals(goals) {
    const container = document.getElementById('goalsListContainer');
    
    if (goals.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-400 py-12">
                <i class="fa-solid fa-bullseye text-4xl mb-3 opacity-20"></i>
                <p>Bu öğrenciye atanmış hedef bulunmuyor.</p>
            </div>`;
        return;
    }

    // SIRALAMA: Önce Pinli Olanlar, Sonra Tarih
    goals.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(a.bitisTarihi) - new Date(b.bitisTarihi);
    });

    container.innerHTML = goals.map(g => {
        const isDone = g.durum === 'tamamlandi';
        const isPinned = g.isPinned === true;
        
        // Kart Stili
        let cardClass = isDone ? 'border-green-100 bg-green-50 opacity-80' : 'border-gray-200 bg-white';
        if (isPinned && !isDone) cardClass = 'border-yellow-300 bg-yellow-50 shadow-md ring-1 ring-yellow-200'; 

        return `
        <div class="p-4 rounded-xl border shadow-sm relative group transition-all hover:shadow-md ${cardClass}">
            
            ${isPinned ? '<div class="absolute -top-2 -right-2 bg-yellow-400 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm text-xs z-10"><i class="fa-solid fa-thumbtack"></i></div>' : ''}

            <div class="flex justify-between items-start mb-2">
                <span class="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded font-mono">
                    <i class="fa-regular fa-calendar"></i> ${formatDateTR(g.bitisTarihi)}
                </span>
                ${isDone ? '<span class="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">Tamamlandı</span>' : ''}
            </div>
            
            <h4 class="font-bold text-gray-800 ${isDone ? 'line-through text-gray-500' : ''} mb-1 line-clamp-2">${g.title}</h4>
            <p class="text-sm text-gray-600 line-clamp-3 mb-4 min-h-[3rem]">${g.aciklama || ''}</p>
            
            <div class="flex justify-between items-center pt-3 border-t border-gray-100/50">
                <button class="text-gray-400 hover:text-yellow-500 transition-colors p-1" 
                        onclick="toggleGoalPin('${g.path}', ${isPinned})" 
                        title="${isPinned ? 'Başa tutturmayı kaldır' : 'Başa tuttur'}">
                    <i class="fa-solid fa-thumbtack ${isPinned ? 'text-yellow-500' : ''}"></i>
                </button>

                <div class="flex gap-2">
                    <button class="text-xs px-3 py-1.5 rounded border font-medium transition-colors ${isDone ? 'border-gray-300 text-gray-500 hover:bg-gray-100' : 'border-green-500 text-green-600 hover:bg-green-50'}" 
                            onclick="toggleGlobalGoalStatus('${g.path}', '${g.durum}')">
                        ${isDone ? 'Geri Al' : '<i class="fa-solid fa-check mr-1"></i> Tamamla'}
                    </button>
                    <button class="text-xs px-3 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 transition-colors" 
                            onclick="deleteGlobalDoc('${g.path}')">Sil</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// --- GLOBAL FONKSİYONLAR ---
// Bu fonksiyonlar window nesnesine atanır ve currentDb kullanır.
window.toggleGlobalGoalStatus = async (path, current) => {
    if (!currentDb) { console.error("DB bağlantısı yok!"); return; }
    await updateDoc(doc(currentDb, path), { durum: current === 'tamamlandi' ? 'devam' : 'tamamlandi' });
};

window.deleteGlobalDoc = async (path) => {
    if (!currentDb) { console.error("DB bağlantısı yok!"); return; }
    if(confirm('Bu hedefi silmek istediğinize emin misiniz?')) await deleteDoc(doc(currentDb, path));
};

window.toggleGoalPin = async (path, currentStatus) => {
    if (!currentDb) { console.error("DB bağlantısı yok!"); return; }
    await updateDoc(doc(currentDb, path), { isPinned: !currentStatus });
};

// --- KAYDETME FONKSİYONU ---
export async function saveGlobalHedef(db, uid, appId) {
    let sid = document.getElementById('currentStudentIdForHedef').value;
    
    // Fallback: Eğer modal içindeki select görünürse oradan al (ama gizliyoruz)
    if (!document.getElementById('hedefStudentSelectContainer').classList.contains('hidden')) {
        sid = document.getElementById('hedefStudentSelect').value;
    }
    
    if (!sid) { alert('Öğrenci seçin'); return; }

    const title = document.getElementById('hedefTitle').value.trim();
    const date = document.getElementById('hedefBitisTarihi').value;
    
    if(!title || !date) { alert("Başlık ve Bitiş Tarihi zorunludur."); return; }

    await addDoc(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "hedefler"), {
        title: title,
        aciklama: document.getElementById('hedefAciklama').value,
        bitisTarihi: date,
        durum: 'devam',
        isPinned: false,
        kocId: uid,
        olusturmaTarihi: serverTimestamp()
    });
    document.getElementById('addHedefModal').style.display = 'none';
}
