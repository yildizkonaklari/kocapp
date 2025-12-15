import { 
    collection, query, onSnapshot, updateDoc, deleteDoc, 
    where, orderBy, getDocs, doc, addDoc, serverTimestamp, writeBatch 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR, openModalWithBackHistory } from './helpers.js';

let currentDb = null;
let currentUserIdGlobal = null;
let currentAppIdGlobal = null;
let currentStudentId = null;
let allFetchedQuestions = [];

export async function renderSoruTakibiSayfasi(db, currentUserId, appId) {
    currentDb = db;
    currentUserIdGlobal = currentUserId;
    currentAppIdGlobal = appId;
    
    // Sayfaya geri dönüldüyse state temizliği (Eğer sayfa yeniden çiziliyorsa)
    // Ancak app.js her seferinde render çağırdığı için burada DOM element kontrolü yapmaya gerek yok, 
    // değişkenleri sıfırlamak yeterli.
    if (!document.getElementById('soruTakibiListContainer')) {
         currentStudentId = null;
    }

    document.getElementById("mainContentTitle").textContent = "Bireysel Soru Takibi";
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-30">
            
            <div class="w-full lg:w-1/3 relative">
                <button id="soruSelectTrigger" class="w-full flex justify-between items-center bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm shadow-sm">
                    <span id="soruSelectedStudentText" class="font-medium">Öğrenci Seçiniz...</span>
                    <i class="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                </button>
                <input type="hidden" id="filterSoruStudentId">

                <div id="soruSelectDropdown" class="hidden absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 animate-fade-in overflow-hidden">
                    <div class="p-3 border-b border-gray-100 bg-gray-50">
                        <div class="relative">
                            <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                            <input type="text" id="soruSelectSearch" placeholder="Öğrenci ara..." class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500">
                        </div>
                    </div>
                    <div id="soruSelectList" class="max-h-60 overflow-y-auto custom-scrollbar">
                        <div class="p-4 text-center text-gray-400 text-xs">Yükleniyor...</div>
                    </div>
                </div>
            </div>

            <div id="soruActionButtons" class="hidden flex gap-2 w-full sm:w-auto">
                <button id="btnApproveAllSoru" class="flex-1 sm:flex-none bg-green-100 text-green-700 px-4 py-2.5 rounded-xl hover:bg-green-200 text-xs font-bold border border-green-200 flex items-center justify-center transition-colors shadow-sm whitespace-nowrap">
                    <i class="fa-solid fa-check-double mr-2"></i> Toplu Onayla
                </button>
                <button id="btnAddNewSoru" class="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 shadow-md flex items-center justify-center text-xs font-bold transition-transform active:scale-95 whitespace-nowrap">
                    <i class="fa-solid fa-plus mr-2"></i> Soru Ekle
                </button>
            </div>
        </div>

        <div id="soruStatsArea" class="hidden grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Bu Hafta</p>
                    <h3 id="kpiSoruThisWeek" class="text-2xl font-bold text-indigo-600">0</h3>
                </div>
                <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><i class="fa-solid fa-calendar-week"></i></div>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Geçen Hafta</p>
                    <div class="flex items-center gap-2">
                        <h3 id="kpiSoruLastWeek" class="text-2xl font-bold text-gray-400">0</h3>
                        <span id="kpiSoruTrend" class="text-xs font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">-</span>
                    </div>
                </div>
                <div class="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center"><i class="fa-solid fa-clock-rotate-left"></i></div>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Bekleyen Onay</p>
                    <h3 id="kpiSoruPending" class="text-2xl font-bold text-orange-500">0</h3>
                </div>
                <div class="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><i class="fa-solid fa-hourglass-half"></i></div>
            </div>
        </div>

        <div id="soruTakibiListContainer" class="relative z-10 pb-20">
            <div id="soruEmptyState" class="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
                <i class="fa-solid fa-magnifying-glass-chart text-5xl mb-4 opacity-20"></i>
                <p>Soru takibi yapmak için lütfen öğrenci seçin.</p>
            </div>
            
            <div id="soruListContent" class="hidden bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-100">
                        <thead class="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                            <tr>
                                <th class="px-4 py-3 text-left">Tarih</th>
                                <th class="px-4 py-3 text-left">Ders</th>
                                <th class="px-4 py-3 text-left">Konu</th>
                                <th class="px-4 py-3 text-center">Adet</th>
                                <th class="px-4 py-3 text-center">Durum</th>
                                <th class="px-4 py-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody id="soruTableBody" class="divide-y divide-gray-100 text-sm"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Dropdown Kurulumu
    await setupSoruSearchableDropdown(db, currentUserId, appId);

    // Event Listeners
    document.getElementById('btnAddNewSoru').addEventListener('click', openAddSoruModal);
    document.getElementById('btnApproveAllSoru').addEventListener('click', approveAllPendingQuestions);
}

// --- DROPDOWN SETUP ---
async function setupSoruSearchableDropdown(db, uid, appId) {
    const triggerBtn = document.getElementById('soruSelectTrigger');
    const dropdown = document.getElementById('soruSelectDropdown');
    const searchInput = document.getElementById('soruSelectSearch');
    const listContainer = document.getElementById('soruSelectList');
    const labelSpan = document.getElementById('soruSelectedStudentText');

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
                currentStudentId = s.id;
                labelSpan.textContent = s.name;
                labelSpan.classList.add('font-bold', 'text-purple-700');
                dropdown.classList.add('hidden');
                
                // UI Aç
                document.getElementById('soruEmptyState').classList.add('hidden');
                document.getElementById('soruStatsArea').classList.remove('hidden');
                document.getElementById('soruActionButtons').classList.remove('hidden');
                document.getElementById('soruListContent').classList.remove('hidden');
                
                startSoruListener(db, uid, appId, s.id);
            };
            listContainer.appendChild(item);
        });
    };
    
    renderList();
    
    triggerBtn.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); if(!dropdown.classList.contains('hidden')) searchInput.focus(); };
    searchInput.oninput = (e) => { renderList(e.target.value); };
    document.addEventListener('click', (e) => { if (!triggerBtn.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add('hidden'); });
}

// --- DATA LISTENER ---
function startSoruListener(db, uid, appId, studentId) {
    const q = query(
        collection(db, "artifacts", appId, "users", uid, "ogrencilerim", studentId, "soruTakibi"),
        orderBy("tarih", "desc"),
        orderBy("eklenmeTarihi", "desc")
    );

    if (activeListeners.soruTakibiUnsubscribe) activeListeners.soruTakibiUnsubscribe();

    activeListeners.soruTakibiUnsubscribe = onSnapshot(q, (snap) => {
        allFetchedQuestions = [];
        snap.forEach(doc => {
            allFetchedQuestions.push({ id: doc.id, ...doc.data(), path: doc.ref.path });
        });
        
        renderSoruList();
        calculateSoruStats();
    });
}

function renderSoruList() {
    const tbody = document.getElementById('soruTableBody');
    if (allFetchedQuestions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-400 text-sm">Kayıt bulunamadı.</td></tr>`;
        return;
    }

    tbody.innerHTML = allFetchedQuestions.map(q => {
        const isApproved = q.onayDurumu === 'onaylandi';
        const statusBadge = isApproved 
            ? `<span class="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">Onaylı</span>`
            : `<span class="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">Bekliyor</span>`;
        
        const actionBtn = isApproved
            ? `<button onclick="toggleSoruStatus('${q.path}', 'onaylandi')" class="text-gray-400 hover:text-orange-500 text-xs font-medium underline">Geri Al</button>`
            : `<div class="flex justify-end gap-2">
                 <button onclick="deleteSoru('${q.path}')" class="text-red-400 hover:text-red-600"><i class="fa-solid fa-trash"></i></button>
                 <button onclick="approveSingleSoru('${q.path}')" class="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-xs font-bold">Onayla</button>
               </div>`;

        return `
            <tr class="hover:bg-gray-50 transition-colors group">
                <td class="px-4 py-3 whitespace-nowrap text-gray-600">${formatDateTR(q.tarih)}</td>
                <td class="px-4 py-3 font-medium text-gray-800">${q.ders}</td>
                <td class="px-4 py-3 text-gray-500 truncate max-w-[150px]">${q.konu || '-'}</td>
                <td class="px-4 py-3 text-center font-bold text-indigo-600">${q.adet}</td>
                <td class="px-4 py-3 text-center">${statusBadge}</td>
                <td class="px-4 py-3 text-right">${actionBtn}</td>
            </tr>
        `;
    }).join('');
}

function calculateSoruStats() {
    // Tarih Hesaplamaları
    const now = new Date();
    // Bu haftanın başı (Pazartesi)
    const day = now.getDay() || 7; 
    const thisWeekStart = new Date(now);
    thisWeekStart.setHours(0,0,0,0);
    thisWeekStart.setDate(now.getDate() - day + 1);
    
    // Geçen haftanın başı ve sonu
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1); // Pazar

    const strThisWeekStart = thisWeekStart.toISOString().split('T')[0];
    const strLastWeekStart = lastWeekStart.toISOString().split('T')[0];
    const strLastWeekEnd = lastWeekEnd.toISOString().split('T')[0];

    let thisWeekTotal = 0;
    let lastWeekTotal = 0;
    let pendingCount = 0;

    allFetchedQuestions.forEach(q => {
        const qDate = q.tarih;
        const qAdet = parseInt(q.adet) || 0;

        // Bekleyenler
        if (q.onayDurumu === 'bekliyor') pendingCount++;

        // Bu Hafta (Onaylılar + Bekleyenler sayılabilir veya sadece onaylılar. Genelde toplam efor sayılır)
        if (qDate >= strThisWeekStart) {
            thisWeekTotal += qAdet;
        }
        // Geçen Hafta
        else if (qDate >= strLastWeekStart && qDate <= strLastWeekEnd) {
            lastWeekTotal += qAdet;
        }
    });

    document.getElementById('kpiSoruThisWeek').textContent = thisWeekTotal;
    document.getElementById('kpiSoruLastWeek').textContent = lastWeekTotal;
    document.getElementById('kpiSoruPending').textContent = pendingCount;

    // Trend
    const trendEl = document.getElementById('kpiSoruTrend');
    if (lastWeekTotal === 0) {
        trendEl.textContent = thisWeekTotal > 0 ? "%100+" : "-";
        trendEl.className = "text-xs font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500";
    } else {
        const diff = thisWeekTotal - lastWeekTotal;
        const percent = Math.round((diff / lastWeekTotal) * 100);
        if (diff >= 0) {
            trendEl.textContent = `+${percent}%`;
            trendEl.className = "text-xs font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700";
        } else {
            trendEl.textContent = `${percent}%`;
            trendEl.className = "text-xs font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700";
        }
    }
}

// --- ACTIONS ---
function openAddSoruModal() {
    if (!currentStudentId) return;
    
    // Modal HTML içindeki inputları temizle
    const modal = document.getElementById('addSoruModal');
    if(!modal) return;

    // Öğrenci seçimi gizle (Zaten seçili)
    const selectCont = document.getElementById('soruStudentSelectContainer');
    if(selectCont) selectCont.classList.add('hidden');
    
    // Hidden inputa ID ata
    document.getElementById('currentStudentIdForSoruTakibi').value = currentStudentId;
    
    // Tarih bugüne ayarla
    document.getElementById('soruTarih').value = new Date().toISOString().split('T')[0];
    document.getElementById('soruDers').value = '';
    document.getElementById('soruKonu').value = '';
    document.getElementById('soruAdet').value = '';

    openModalWithBackHistory('addSoruModal');

    // Kapatma butonlarını ayarla
    const closeBtn = document.getElementById('closeSoruModalButton');
    const cancelBtn = document.getElementById('cancelSoruModalButton');
    const handleClose = () => window.history.back();
    if(closeBtn) closeBtn.onclick = handleClose;
    if(cancelBtn) cancelBtn.onclick = handleClose;
    
    // Kaydet butonunu bağla
    const saveBtn = document.getElementById('saveSoruButton');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.onclick = () => saveGlobalSoru(currentDb, currentUserIdGlobal, currentAppIdGlobal);
}

export async function saveGlobalSoru(db, currentUserId, appId) {
    // Hidden inputtan veya değişkenden ID al
    const sid = document.getElementById('currentStudentIdForSoruTakibi').value || currentStudentId;
    
    const tarih = document.getElementById('soruTarih').value;
    const ders = document.getElementById('soruDers').value;
    const konu = document.getElementById('soruKonu').value;
    const adet = parseInt(document.getElementById('soruAdet').value);

    if (!sid || !tarih || !ders || !adet) { alert("Lütfen tüm alanları doldurun."); return; }

    try {
        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", sid, "soruTakibi"), {
            tarih, ders, konu, adet, 
            onayDurumu: 'onaylandi', // Koç girdiği için direkt onaylı
            eklenmeTarihi: serverTimestamp(),
            kocId: currentUserId
        });
        window.history.back();
    } catch (e) {
        console.error(e);
        alert("Hata oluştu.");
    }
}

async function approveAllPendingQuestions() {
    if (!currentStudentId) return;
    const pending = allFetchedQuestions.filter(q => q.onayDurumu === 'bekliyor');
    
    if (pending.length === 0) { alert("Onay bekleyen soru yok."); return; }
    if (!confirm(`${pending.length} adet kaydı onaylıyor musunuz?`)) return;

    const btn = document.getElementById('btnApproveAllSoru');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const batch = writeBatch(currentDb);
        pending.forEach(q => {
            const ref = doc(currentDb, q.path);
            batch.update(ref, { onayDurumu: 'onaylandi' });
        });
        await batch.commit();
    } catch (e) {
        console.error(e);
        alert("Onaylama sırasında hata oluştu.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Global'e fonksiyon atama (HTML onclick için)
window.toggleSoruStatus = async (path, currentStatus) => {
    if (!currentDb) return;
    const newStatus = currentStatus === 'onaylandi' ? 'bekliyor' : 'onaylandi';
    await updateDoc(doc(currentDb, path), { onayDurumu: newStatus });
};

window.approveSingleSoru = async (path) => {
    if (!currentDb) return;
    await updateDoc(doc(currentDb, path), { onayDurumu: 'onaylandi' });
};

window.deleteSoru = async (path) => {
    if (!currentDb) return;
    if(confirm('Bu kaydı silmek istediğinize emin misiniz?')) await deleteDoc(doc(currentDb, path));
};