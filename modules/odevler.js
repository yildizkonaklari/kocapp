import { 
    collection, query, onSnapshot, updateDoc, deleteDoc, 
    where, orderBy, getDocs, doc, addDoc, serverTimestamp, writeBatch 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR, openModalWithBackHistory } from './helpers.js';

let currentDb = null; 

export async function renderOdevlerSayfasi(db, currentUserId, appId) {
    currentDb = db;
    document.getElementById("mainContentTitle").textContent = "Ödev Takibi";
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-20">
            
            <div class="w-full md:w-1/3 relative">
                <label class="block text-xs font-bold text-gray-500 mb-1 ml-1">Öğrenci Seçin</label>
                <button id="odevSelectTrigger" class="w-full flex justify-between items-center bg-white border border-gray-300 text-gray-700 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm">
                    <span id="odevSelectedStudentText">Bir öğrenci seçin...</span>
                    <i class="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                </button>
                <input type="hidden" id="filterOdevStudentId">

                <div id="odevSelectDropdown" class="hidden absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
                    <div class="p-2 border-b border-gray-100 bg-gray-50">
                        <div class="relative">
                            <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                            <input type="text" id="odevSelectSearch" placeholder="Öğrenci ara..." class="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500">
                        </div>
                    </div>
                    <div id="odevSelectList" class="max-h-60 overflow-y-auto custom-scrollbar">
                        <div class="p-3 text-center text-gray-400 text-xs">Yükleniyor...</div>
                    </div>
                </div>
            </div>

            <button id="btnAddNewOdev" class="hidden w-full md:w-auto bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center justify-center transition-transform active:scale-95 text-sm font-medium">
                <i class="fa-solid fa-plus mr-2"></i> Yeni Ödev Ata
            </button>
        </div>

        <div id="odevListContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 pb-20">
            <div id="odevEmptyState" class="col-span-full text-center text-gray-400 py-12">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i class="fa-solid fa-list-check text-3xl opacity-30"></i>
                </div>
                <p>Ödevleri görmek için listeden bir öğrenci seçin.</p>
            </div>
        </div>
    `;

    await setupOdevSearchableDropdown(db, currentUserId, appId);

    document.getElementById('btnAddNewOdev').addEventListener('click', () => {
        openAddOdevModal();
    });
}

async function setupOdevSearchableDropdown(db, uid, appId) {
    const triggerBtn = document.getElementById('odevSelectTrigger');
    const dropdown = document.getElementById('odevSelectDropdown');
    const searchInput = document.getElementById('odevSelectSearch');
    const listContainer = document.getElementById('odevSelectList');
    const hiddenInput = document.getElementById('filterOdevStudentId');
    const labelSpan = document.getElementById('odevSelectedStudentText');

    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim"), orderBy("ad"));
    const snapshot = await getDocs(q);
    const students = [];
    snapshot.forEach(doc => students.push({ id: doc.id, name: `${doc.data().ad} ${doc.data().soyad}` }));

    const renderList = (filter = "") => {
        listContainer.innerHTML = "";
        const filtered = students.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));

        if (filtered.length === 0) {
            listContainer.innerHTML = `<div class="p-3 text-center text-gray-400 text-xs">Sonuç bulunamadı.</div>`;
            return;
        }

        filtered.forEach(s => {
            const item = document.createElement('div');
            item.className = "px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer border-b border-gray-50 last:border-0 transition-colors";
            item.textContent = s.name;
            item.onclick = () => {
                hiddenInput.value = s.id;
                labelSpan.textContent = s.name;
                labelSpan.classList.add('font-bold', 'text-purple-700');
                dropdown.classList.add('hidden'); 
                
                document.getElementById('btnAddNewOdev').classList.remove('hidden');
                startOdevListener(db, uid, appId, s.id);
            };
            listContainer.appendChild(item);
        });
    };

    renderList();

    triggerBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if(!dropdown.classList.contains('hidden')) {
            searchInput.focus(); 
        }
    };

    searchInput.oninput = (e) => {
        renderList(e.target.value);
    };

    document.addEventListener('click', (e) => {
        if (!triggerBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

function startOdevListener(db, uid, appId, studentId) {
    const container = document.getElementById('odevListContainer');
    container.innerHTML = '<p class="col-span-full text-center text-gray-400 p-8">Yükleniyor...</p>';

    const q = query(
        collection(db, "artifacts", appId, "users", uid, "ogrencilerim", studentId, "odevler"),
        orderBy('bitisTarihi', 'desc') // En yakın tarihli veya yeni eklenen en üstte
    );
    
    if (activeListeners.odevlerUnsubscribe) activeListeners.odevlerUnsubscribe();
    
    activeListeners.odevlerUnsubscribe = onSnapshot(q, (snap) => {
        const odevler = [];
        snap.forEach(doc => {
            odevler.push({ id: doc.id, ...doc.data(), path: doc.ref.path });
        });
        renderOdevler(odevler); 
    }, (error) => {
        console.error("Ödevler yüklenirken hata:", error);
        container.innerHTML = `<p class="col-span-full text-center text-red-500 p-8">Veriler yüklenemedi.</p>`;
    });
}

function renderOdevler(odevler) {
    const container = document.getElementById('odevListContainer');
    
    if (odevler.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-400 py-12 flex flex-col items-center">
                <i class="fa-solid fa-list-check text-4xl mb-3 opacity-20"></i>
                <p>Bu öğrenciye atanmış ödev bulunmuyor.</p>
            </div>`;
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    container.innerHTML = odevler.map(o => {
        const isDone = o.durum === 'tamamlandi';
        const isLate = !isDone && o.bitisTarihi < todayStr;
        
        let cardClass = isDone ? 'border-green-100 bg-green-50 opacity-80' : 'border-gray-200 bg-white';
        let statusBadge = '';

        if(isDone) {
            statusBadge = '<span class="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">Tamamlandı</span>';
        } else if(isLate) {
            cardClass = 'border-red-200 bg-red-50';
            statusBadge = '<span class="text-[10px] bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold">Gecikti</span>';
        } else {
            statusBadge = '<span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">Devam</span>';
        }

        return `
        <div class="p-4 rounded-xl border shadow-sm relative group transition-all hover:shadow-md ${cardClass}">
            <div class="flex justify-between items-start mb-2">
                <div class="flex flex-col">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">${o.tur || 'GÜNLÜK'}</span>
                    <span class="text-xs text-gray-500 flex items-center gap-1 bg-white/50 px-2 py-1 rounded font-mono border border-gray-100">
                        <i class="fa-regular fa-calendar"></i> ${formatDateTR(o.bitisTarihi)}
                    </span>
                </div>
                ${statusBadge}
            </div>
            
            <h4 class="font-bold text-gray-800 ${isDone ? 'line-through text-gray-500' : ''} mb-1 line-clamp-2">${o.title}</h4>
            <p class="text-sm text-gray-600 line-clamp-3 mb-4 min-h-[3rem]">${o.aciklama || ''}</p>
            
            ${o.link ? `<a href="${o.link}" target="_blank" class="text-xs text-indigo-600 hover:underline mb-3 block truncate"><i class="fa-solid fa-link mr-1"></i>Kaynak Linki</a>` : ''}

            <div class="flex justify-between items-center pt-3 border-t border-gray-100/50">
                <div class="flex gap-2 w-full justify-end">
                    <button class="text-xs px-3 py-1.5 rounded border font-medium transition-colors ${isDone ? 'border-gray-300 text-gray-500 hover:bg-gray-100' : 'border-green-500 text-green-600 hover:bg-green-50 bg-white'}" 
                            onclick="toggleGlobalOdevStatus('${o.path}', '${o.durum}')">
                        ${isDone ? 'Geri Al' : '<i class="fa-solid fa-check mr-1"></i> Tamamla'}
                    </button>
                    <button class="text-xs px-3 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 bg-white transition-colors" 
                            onclick="deleteGlobalDoc('${o.path}')">Sil</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- MODAL AÇMA (DÜZELTİLDİ: CLOSEST HATASI VE YENİ INPUTLAR) ---
function openAddOdevModal() {
    const sid = document.getElementById('filterOdevStudentId').value;
    if (!sid) { alert("Lütfen önce öğrenci seçin."); return; }

    // Formu Temizle
    document.getElementById('odevTur').value = 'GÜNLÜK';
    document.getElementById('odevBaslik').value = '';
    document.getElementById('odevBaslangic').value = new Date().toISOString().split('T')[0];
    document.getElementById('odevBitis').value = '';
    document.getElementById('odevAciklama').value = '';
    document.getElementById('odevLink').value = '';
    document.getElementById('currentStudentIdForOdev').value = sid;
    
    // Modalı Helper üzerinden aç (History Push yapar)
    openModalWithBackHistory('addOdevModal');

    // Kapatma butonlarını ayarla - DÜZELTİLDİ: ID ile güvenli seçim
    const btnCloseX = document.getElementById('btnCloseOdevModal'); 
    const btnCancel = document.getElementById('btnCancelOdev'); 

    const handleClose = (e) => {
        e.preventDefault();
        window.history.back();
    };

    if(btnCloseX) btnCloseX.onclick = handleClose;
    if(btnCancel) btnCancel.onclick = handleClose;

    // Kaydet Butonu (Event yığılmasını önle)
    document.getElementById('btnSaveOdev').onclick = async () => saveGlobalOdev(currentDb, firebase.auth().currentUser.uid, "kocluk-sistemi");
}

// --- KAYDETME FONKSİYONU (HAFTALIK MANTIĞI EKLENDİ) ---
export async function saveGlobalOdev(db, uid, appId) {
    let sid = document.getElementById('currentStudentIdForOdev').value;
    if (!sid) { 
        // Eğer modal açılırken ID set edilemediyse, hidden inputtan tekrar dene
        sid = document.getElementById('filterOdevStudentId').value;
    }
    
    if (!sid) { alert('Öğrenci seçimi hatası.'); return; }

    const tur = document.getElementById('odevTur').value;
    const title = document.getElementById('odevBaslik').value.trim();
    const startDateStr = document.getElementById('odevBaslangic').value;
    const endDateStr = document.getElementById('odevBitis').value;
    const desc = document.getElementById('odevAciklama').value;
    const link = document.getElementById('odevLink').value;

    if(!title || !startDateStr || !endDateStr) { 
        alert("Başlık, Başlangıç ve Bitiş Tarihleri zorunludur."); 
        return; 
    }

    if (endDateStr < startDateStr) {
        alert("Bitiş tarihi başlangıç tarihinden önce olamaz.");
        return;
    }

    const btn = document.getElementById('btnSaveOdev');
    btn.disabled = true;
    btn.textContent = "Kaydediliyor...";

    const batch = writeBatch(db);
    const collectionRef = collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler");

    try {
        if (tur === 'GÜNLÜK') {
            // GÜNLÜK: Tek bir kayıt, bitiş tarihi deadline'dır.
            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, {
                tur: 'GÜNLÜK',
                title: title,
                aciklama: desc,
                link: link,
                baslangicTarihi: startDateStr,
                bitisTarihi: endDateStr, // Tek bir teslim tarihi
                durum: 'devam',
                onayDurumu: 'bekliyor',
                kocId: uid,
                eklenmeTarihi: serverTimestamp()
            });

        } else if (tur === 'HAFTALIK') {
            // HAFTALIK: Aralıktaki her Pazar günü için bir ödev
            let current = new Date(startDateStr);
            const end = new Date(endDateStr);
            let count = 0;

            // Döngü: Başlangıçtan bitişe kadar gün gün git
            while (current <= end) {
                // 0 = Pazar
                if (current.getDay() === 0) {
                    const deadlineStr = current.toISOString().split('T')[0];
                    const newDocRef = doc(collectionRef);
                    batch.set(newDocRef, {
                        tur: 'HAFTALIK',
                        title: `${title} (Hafta Sonu)`,
                        aciklama: desc,
                        link: link,
                        baslangicTarihi: startDateStr, // Hepsi aynı gün verilmiş gibi görünebilir veya o haftanın başı yapılabilir
                        bitisTarihi: deadlineStr,      // Teslim tarihi o Pazar
                        durum: 'devam',
                        onayDurumu: 'bekliyor',
                        kocId: uid,
                        eklenmeTarihi: serverTimestamp()
                    });
                    count++;
                }
                // Bir sonraki güne geç
                current.setDate(current.getDate() + 1);
            }

            if (count === 0) {
                // Eğer aralıkta hiç Pazar yoksa, en azından Bitiş Tarihine 1 tane ekleyelim mi?
                // Kullanıcı "Haftalık" dedi ama aralık çok kısaysa (örn: Pzt-Çarş).
                // Mantık: Haftalık ödev Pazar biter. Pazar yoksa bitiş tarihine ekle.
                const newDocRef = doc(collectionRef);
                batch.set(newDocRef, {
                    tur: 'HAFTALIK',
                    title: title,
                    aciklama: desc,
                    link: link,
                    baslangicTarihi: startDateStr,
                    bitisTarihi: endDateStr, 
                    durum: 'devam',
                    onayDurumu: 'bekliyor',
                    kocId: uid,
                    eklenmeTarihi: serverTimestamp()
                });
            }
        }

        await batch.commit();
        
        // Modalı Kapat (Geri git) -> Liste zaten onSnapshot ile güncellenir
        window.history.back();

    } catch (e) {
        console.error(e);
        alert("Kayıt sırasında hata oluştu: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Kaydet";
    }
}

window.toggleGlobalOdevStatus = async (path, current) => {
    if (!currentDb) return;
    await updateDoc(doc(currentDb, path), { durum: current === 'tamamlandi' ? 'devam' : 'tamamlandi' });
};

window.deleteGlobalDoc = async (path) => {
    if (!currentDb) return;
    if(confirm('Silmek istediğinize emin misiniz?')) await deleteDoc(doc(currentDb, path));
};
