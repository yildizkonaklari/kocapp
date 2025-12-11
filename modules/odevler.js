import { 
    collection, query, onSnapshot, updateDoc, deleteDoc, 
    where, orderBy, getDocs, doc, addDoc, serverTimestamp, writeBatch 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR, openModalWithBackHistory } from './helpers.js';

let currentDb = null; 
let currentUserIdGlobal = null;
let currentAppIdGlobal = null;
let currentStudentId = null; 
let currentWeekOffset = 0; 
let allFetchedOdevs = []; 

export async function renderOdevlerSayfasi(db, currentUserId, appId) {
    currentDb = db;
    currentUserIdGlobal = currentUserId;
    currentAppIdGlobal = appId;
    
    // Eğer sayfaya geri dönüldüyse ve öğrenci seçiliyse onu koru, yoksa sıfırla
    if (!document.getElementById('weeklyCalendarContainer')) {
         currentStudentId = null;
         currentWeekOffset = 0;
    }

    document.getElementById("mainContentTitle").textContent = "Haftalık Ödev Programı";
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-30">
            
            <div class="w-full lg:w-1/3 relative">
                <button id="odevSelectTrigger" class="w-full flex justify-between items-center bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm shadow-sm">
                    <span id="odevSelectedStudentText" class="font-medium">Öğrenci Seçiniz...</span>
                    <i class="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                </button>
                <input type="hidden" id="filterOdevStudentId">

                <div id="odevSelectDropdown" class="hidden absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 animate-fade-in overflow-hidden">
                    <div class="p-3 border-b border-gray-100 bg-gray-50">
                        <div class="relative">
                            <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                            <input type="text" id="odevSelectSearch" placeholder="Öğrenci ara..." class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500">
                        </div>
                    </div>
                    <div id="odevSelectList" class="max-h-60 overflow-y-auto custom-scrollbar">
                        <div class="p-4 text-center text-gray-400 text-xs">Yükleniyor...</div>
                    </div>
                </div>
            </div>

            <div id="weeklyControls" class="hidden flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
                <div class="flex items-center justify-between bg-gray-100 rounded-xl p-1 w-full sm:w-auto shadow-inner">
                    <button id="btnPrevWeek" class="p-2.5 hover:bg-white rounded-lg text-gray-600 transition-all shadow-sm"><i class="fa-solid fa-chevron-left"></i></button>
                    <span id="weekLabel" class="px-4 text-xs font-bold text-gray-700 min-w-[130px] text-center">...</span>
                    <button id="btnNextWeek" class="p-2.5 hover:bg-white rounded-lg text-gray-600 transition-all shadow-sm"><i class="fa-solid fa-chevron-right"></i></button>
                </div>

                <div class="flex gap-2 w-full sm:w-auto">
                    <button id="btnApproveAllOdev" class="flex-1 sm:flex-none bg-green-100 text-green-700 px-4 py-2.5 rounded-xl hover:bg-green-200 text-xs font-bold border border-green-200 flex items-center justify-center transition-colors shadow-sm whitespace-nowrap">
                        <i class="fa-solid fa-check-double mr-2"></i> Onayla
                    </button>
                    <button id="btnAddNewOdev" class="flex-1 sm:flex-none bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 shadow-md flex items-center justify-center text-xs font-bold transition-transform active:scale-95 whitespace-nowrap">
                        <i class="fa-solid fa-plus mr-2"></i> Ekle
                    </button>
                </div>
            </div>
        </div>

        <div id="weeklyCalendarContainer" class="relative z-10 pb-24">
            <div id="odevEmptyState" class="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
                <i class="fa-regular fa-calendar-days text-5xl mb-4 opacity-20"></i>
                <p>Programı görüntülemek için lütfen öğrenci seçin.</p>
            </div>
            
            <div id="calendarGrid" class="hidden grid grid-cols-1 xl:grid-cols-7 gap-4"></div>
        </div>
    `;

    await setupOdevSearchableDropdown(db, currentUserId, appId);

    document.getElementById('btnAddNewOdev').addEventListener('click', openAddOdevModal);
    document.getElementById('btnApproveAllOdev').addEventListener('click', approvePendingOdevs);
    document.getElementById('btnPrevWeek').addEventListener('click', () => changeWeek(-1));
    document.getElementById('btnNextWeek').addEventListener('click', () => changeWeek(1));
    
    if (currentStudentId) {
        document.getElementById('odevEmptyState').classList.add('hidden');
        document.getElementById('weeklyControls').classList.remove('hidden');
        document.getElementById('calendarGrid').classList.remove('hidden');
        startOdevListener(db, currentUserId, appId, currentStudentId);
    }
}

// --- MODAL OLUŞTURMA (GARANTİ YÖNTEM) ---
function ensureModalExists() {
    if (!document.getElementById('addOdevModal')) {
        const modalHtml = `
        <div id="addOdevModal" class="hidden fixed inset-0 bg-gray-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up">
                <div class="flex justify-between items-center p-5 border-b border-gray-100">
                    <h3 class="text-xl font-bold text-gray-800">Yeni Ödev Ekle</h3>
                    <button id="btnCloseOdevModal" class="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                    <input type="hidden" id="currentStudentIdForOdev">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1.5">Ödev Türü</label>
                        <select id="odevTur" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer">
                            <option value="GÜNLÜK">Günlük (Tek Seferlik)</option>
                            <option value="HAFTALIK">Haftalık (Pazar Teslimli)</option>
                        </select>
                        <p class="text-[10px] text-gray-400 mt-1 ml-1"><i class="fa-solid fa-circle-info mr-1"></i>Günlük: Tek tarihli. Haftalık: Aralıktaki her Pazar için.</p>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1.5">Ödev Başlığı</label>
                        <input type="text" id="odevBaslik" placeholder="Örn: 20 Paragraf Çöz" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1.5">Başlangıç</label>
                            <input type="date" id="odevBaslangic" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1.5">Bitiş (Teslim)</label>
                            <input type="date" id="odevBitis" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1.5">Açıklama / Not</label>
                        <textarea id="odevAciklama" rows="3" placeholder="Detaylar..." class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"></textarea>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1.5">Kaynak Linki (Opsiyonel)</label>
                        <div class="relative">
                            <i class="fa-solid fa-link absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                            <input type="url" id="odevLink" placeholder="https://..." class="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>
                    </div>
                </div>
                <div class="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button id="btnCancelOdev" class="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">İptal</button>
                    <button id="btnSaveOdev" class="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all transform active:scale-95">Kaydet</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

// --- MODAL AÇMA (DÜZELTİLDİ: GARANTİ HTML) ---
function openAddOdevModal() {
    if (!currentStudentId) { alert("Lütfen önce öğrenci seçin."); return; }

    // Modalı oluştur (yoksa)
    ensureModalExists();

    const modal = document.getElementById('addOdevModal');
    
    // Değerleri Ata
    const hiddenInput = document.getElementById('currentStudentIdForOdev');
    if(hiddenInput) hiddenInput.value = currentStudentId;

    document.getElementById('odevTur').value = 'GÜNLÜK';
    document.getElementById('odevBaslik').value = '';
    document.getElementById('odevBaslangic').value = new Date().toISOString().split('T')[0];
    document.getElementById('odevBitis').value = '';
    document.getElementById('odevAciklama').value = '';
    document.getElementById('odevLink').value = '';
    
    openModalWithBackHistory('addOdevModal');

    // Kapatma Butonları
    const btnCloseX = document.getElementById('btnCloseOdevModal'); 
    const btnCancel = document.getElementById('btnCancelOdev'); 
    const handleClose = (e) => { e.preventDefault(); window.history.back(); };

    if(btnCloseX) btnCloseX.onclick = handleClose;
    if(btnCancel) btnCancel.onclick = handleClose;

    // Kaydet Butonu
    const btnSave = document.getElementById('btnSaveOdev');
    btnSave.onclick = saveGlobalOdev; 
}

// --- DİĞER FONKSİYONLAR (Takvim, Kaydet vb.) ---
function changeWeek(offset) {
    currentWeekOffset += offset;
    renderWeeklyGrid();
}

function renderWeeklyGrid() {
    const grid = document.getElementById('calendarGrid');
    const label = document.getElementById('weekLabel');
    if(!currentStudentId) return;

    const today = new Date();
    const currentDay = today.getDay(); 
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + (currentWeekOffset * 7);
    const startOfWeek = new Date(today.setDate(diff)); 
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); 

    const options = { month: 'short', day: 'numeric' };
    label.textContent = `${startOfWeek.toLocaleDateString('tr-TR', options)} - ${endOfWeek.toLocaleDateString('tr-TR', options)}`;

    grid.innerHTML = '';
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

    for (let i = 0; i < 7; i++) {
        const loopDate = new Date(startOfWeek);
        loopDate.setDate(startOfWeek.getDate() + i);
        const dateStr = loopDate.toISOString().split('T')[0];
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        const dailyOdevs = allFetchedOdevs.filter(o => o.bitisTarihi === dateStr);

        const dayCol = document.createElement('div');
        // RESPONSIVE: Mobilde min-h yok, içerik kadar. Masaüstünde sabit yükseklik.
        dayCol.className = `flex flex-col bg-white rounded-xl border ${isToday ? 'border-purple-300 ring-2 ring-purple-50 shadow-md' : 'border-gray-200'} overflow-hidden xl:min-h-[150px] transition-all`;
        
        let headerHtml = `
            <div class="p-3 xl:p-2 flex justify-between xl:block items-center border-b ${isToday ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-600'}">
                <div class="flex items-center gap-2 xl:justify-center">
                    <span class="text-sm xl:text-xs font-bold uppercase">${days[i]}</span>
                    ${isToday ? '<span class="xl:hidden text-[10px] bg-white/20 px-2 py-0.5 rounded font-medium">BUGÜN</span>' : ''}
                </div>
                <div class="text-xs xl:text-[10px] opacity-80 font-mono xl:text-center xl:mt-1 bg-white/10 px-2 py-0.5 rounded">
                    ${formatDateTR(dateStr)}
                </div>
            </div>
            <div class="p-3 xl:p-2 flex-1 space-y-3 xl:space-y-2 bg-gray-50/30">
        `;

        if (dailyOdevs.length === 0) {
            headerHtml += `<div class="flex items-center justify-center py-2 xl:h-full xl:py-0"><p class="text-xs text-gray-300 italic">Boş</p></div>`;
        } else {
            dailyOdevs.forEach(o => { headerHtml += createOdevCard(o); });
        }

        headerHtml += `</div>`;
        dayCol.innerHTML = headerHtml;
        grid.appendChild(dayCol);
    }
}

function createOdevCard(o) {
    let statusClass = "border-l-4 border-blue-500 bg-white";
    let icon = "";
    let buttons = "";

    if (o.durum === 'tamamlandi') {
        if (o.onayDurumu === 'onaylandi') {
            statusClass = "border-l-4 border-green-500 bg-green-50/50 opacity-80";
            icon = `<i class="fa-solid fa-circle-check text-green-600"></i>`;
            buttons = `<button onclick="toggleGlobalOdevStatus('${o.path}', 'devam')" class="text-xs text-gray-400 hover:text-red-500 underline ml-auto">Geri Al</button>`;
        } else {
            statusClass = "border-l-4 border-orange-400 bg-orange-50 shadow-sm ring-1 ring-orange-100";
            icon = `<i class="fa-solid fa-clock text-orange-500 animate-pulse"></i>`;
            buttons = `
                <div class="flex gap-2 mt-2 w-full">
                    <button onclick="approveSingleOdev('${o.path}')" class="flex-1 bg-green-500 text-white text-xs py-1.5 rounded hover:bg-green-600 transition-colors font-medium">Onayla</button>
                    <button onclick="toggleGlobalOdevStatus('${o.path}', 'devam')" class="px-3 bg-red-100 text-red-600 text-xs py-1.5 rounded hover:bg-red-200 font-medium">Red</button>
                </div>`;
        }
    } else {
        statusClass = "border-l-4 border-blue-500 bg-white shadow-sm";
        icon = `<i class="fa-solid fa-spinner text-blue-400"></i>`;
        buttons = `<button onclick="deleteGlobalDoc('${o.path}')" class="text-xs text-gray-300 hover:text-red-500 ml-auto p-1"><i class="fa-solid fa-trash"></i></button>`;
    }

    return `
    <div class="p-3 xl:p-2 rounded-lg border border-gray-100 text-left relative group ${statusClass}">
        <div class="flex justify-between items-start mb-1.5">
            <span class="text-xs xl:text-[10px] font-bold text-gray-800 line-clamp-2 leading-snug w-full pr-1">${o.title}</span>
            <div class="text-sm xl:text-xs shrink-0">${icon}</div>
        </div>
        ${o.aciklama ? `<p class="text-xs xl:text-[9px] text-gray-500 line-clamp-2 mb-2 leading-relaxed">${o.aciklama}</p>` : ''}
        <div class="flex justify-between items-center w-full">${buttons}</div>
    </div>`;
}

function startOdevListener(db, uid, appId, studentId) {
    document.getElementById('weeklyControls').classList.remove('hidden');
    document.getElementById('weeklyCalendarContainer').classList.remove('hidden');
    document.getElementById('odevEmptyState').classList.add('hidden');
    document.getElementById('calendarGrid').classList.remove('hidden');
    document.getElementById('calendarGrid').classList.add('grid');

    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", studentId, "odevler"));
    if (activeListeners.odevlerUnsubscribe) activeListeners.odevlerUnsubscribe();
    
    activeListeners.odevlerUnsubscribe = onSnapshot(q, (snap) => {
        allFetchedOdevs = [];
        snap.forEach(doc => { allFetchedOdevs.push({ id: doc.id, ...doc.data(), path: doc.ref.path }); });
        renderWeeklyGrid(); 
    }, (error) => { console.error("Hata:", error); });
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
        if (filtered.length === 0) { listContainer.innerHTML = `<div class="p-3 text-center text-gray-400 text-xs">Sonuç bulunamadı.</div>`; return; }
        filtered.forEach(s => {
            const item = document.createElement('div');
            item.className = "px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer border-b border-gray-50 last:border-0 transition-colors";
            item.textContent = s.name;
            item.onclick = () => {
                hiddenInput.value = s.id;
                currentStudentId = s.id; 
                labelSpan.textContent = s.name;
                labelSpan.classList.add('font-bold', 'text-purple-700');
                dropdown.classList.add('hidden'); 
                startOdevListener(db, uid, appId, s.id);
            };
            listContainer.appendChild(item);
        });
    };
    renderList();
    triggerBtn.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); if(!dropdown.classList.contains('hidden')) searchInput.focus(); };
    searchInput.oninput = (e) => { renderList(e.target.value); };
    document.addEventListener('click', (e) => { if (!triggerBtn.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add('hidden'); });
}

export async function saveGlobalOdev() {
    if (!currentDb || !currentUserIdGlobal || !currentStudentId) { alert("Bağlantı hatası veya öğrenci seçilmedi."); return; }

    const tur = document.getElementById('odevTur').value;
    const title = document.getElementById('odevBaslik').value.trim();
    const startDateStr = document.getElementById('odevBaslangic').value;
    const endDateStr = document.getElementById('odevBitis').value;
    const desc = document.getElementById('odevAciklama').value;
    const link = document.getElementById('odevLink').value;

    if(!title || !startDateStr || !endDateStr) { alert("Başlık ve tarihler zorunludur."); return; }
    if (endDateStr < startDateStr) { alert("Bitiş tarihi hatalı."); return; }

    const btn = document.getElementById('btnSaveOdev');
    btn.disabled = true; btn.textContent = "Kaydediliyor...";

    const batch = writeBatch(currentDb);
    const collectionRef = collection(currentDb, "artifacts", currentAppIdGlobal, "users", currentUserIdGlobal, "ogrencilerim", currentStudentId, "odevler");

    try {
        if (tur === 'GÜNLÜK') {
            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, { tur: 'GÜNLÜK', title: title, aciklama: desc, link: link, baslangicTarihi: startDateStr, bitisTarihi: endDateStr, durum: 'devam', onayDurumu: 'bekliyor', kocId: currentUserIdGlobal, eklenmeTarihi: serverTimestamp() });
        } else if (tur === 'HAFTALIK') {
            let current = new Date(startDateStr);
            const end = new Date(endDateStr);
            let count = 0;
            while (current <= end) {
                if (current.getDay() === 0) { 
                    const deadlineStr = current.toISOString().split('T')[0];
                    const newDocRef = doc(collectionRef);
                    batch.set(newDocRef, { tur: 'HAFTALIK', title: `${title} (Hafta Sonu)`, aciklama: desc, link: link, baslangicTarihi: startDateStr, bitisTarihi: deadlineStr, durum: 'devam', onayDurumu: 'bekliyor', kocId: currentUserIdGlobal, eklenmeTarihi: serverTimestamp() });
                    count++;
                }
                current.setDate(current.getDate() + 1);
            }
            if (count === 0) {
                const newDocRef = doc(collectionRef);
                batch.set(newDocRef, { tur: 'HAFTALIK', title: title, aciklama: desc, link: link, baslangicTarihi: startDateStr, bitisTarihi: endDateStr, durum: 'devam', onayDurumu: 'bekliyor', kocId: currentUserIdGlobal, eklenmeTarihi: serverTimestamp() });
            }
        }

        await batch.commit();
        window.history.back(); // Sadece modalı kapat

    } catch (e) {
        console.error(e);
        alert("Kayıt hatası: " + e.message);
    } finally {
        btn.disabled = false; btn.textContent = "Kaydet";
    }
}

async function approvePendingOdevs() {
    if (!currentStudentId) return;
    const pendingOdevs = allFetchedOdevs.filter(o => o.durum === 'tamamlandi' && o.onayDurumu === 'bekliyor');
    if (pendingOdevs.length === 0) { alert("Onay bekleyen (öğrencinin tamamladığı) ödev bulunamadı."); return; }
    if (!confirm(`${pendingOdevs.length} adet tamamlanmış ödevi onaylamak istiyor musunuz?`)) return;

    const btn = document.getElementById('btnApproveAllOdev');
    const orgText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const batch = writeBatch(currentDb);
    pendingOdevs.forEach(o => {
        const ref = doc(currentDb, "artifacts", currentAppIdGlobal, "users", currentUserIdGlobal, "ogrencilerim", currentStudentId, "odevler", o.id);
        batch.update(ref, { onayDurumu: 'onaylandi' });
    });

    try { await batch.commit(); } catch (e) { console.error(e); alert("Onay hatası."); } 
    finally { btn.disabled = false; btn.innerHTML = orgText; }
}

window.approveSingleOdev = async (path) => { if (!currentDb) return; await updateDoc(doc(currentDb, path), { onayDurumu: 'onaylandi' }); };
window.toggleGlobalOdevStatus = async (path, status) => { if (!currentDb) return; await updateDoc(doc(currentDb, path), { durum: 'devam', onayDurumu: 'bekliyor' }); };
window.deleteGlobalDoc = async (path) => { if (!currentDb) return; if(confirm('Silmek istediğinize emin misiniz?')) await deleteDoc(doc(currentDb, path)); };
