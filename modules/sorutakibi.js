// === GLOBAL SORU TAKİBİ MODÜLÜ ===

import { 
    doc, 
    collectionGroup, 
    query, 
    onSnapshot, 
    updateDoc, 
    deleteDoc,
    where, 
    orderBy,
    writeBatch,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR } from './helpers.js';

export function renderSoruTakibiSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Genel Soru Takibi";
    
    mainContentArea.innerHTML = `
        <!-- KPI Kartları -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Bu Hafta Çözülen</p>
                <h3 id="kpiThisWeek" class="text-3xl font-bold text-purple-600">...</h3>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Geçen Haftaya Göre</p>
                <div class="flex items-center mt-1">
                    <h3 id="kpiComparison" class="text-2xl font-bold text-gray-800 mr-2">...</h3>
                    <span id="kpiArrow" class="text-sm font-medium"></span>
                </div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Bekleyen Onaylar</p>
                <h3 id="kpiPendingApprovals" class="text-3xl font-bold text-yellow-600">...</h3>
            </div>
        </div>

        <!-- Liste Başlığı ve Toplu İşlem -->
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-semibold text-gray-800">Öğrenci Soru Girişleri</h3>
            <button id="btnApproveAll" class="hidden bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm transition-colors flex items-center">
                <i class="fa-solid fa-check-double mr-2"></i> Hepsini Onayla
            </button>
        </div>

        <!-- Liste -->
        <div id="globalSoruListContainer" class="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
            <p class="text-center text-gray-400 p-8">Veriler yükleniyor...</p>
        </div>
    `;

    loadAllSoruTakibi(db, currentUserId, appId);
    
    // Toplu Onaylama Eventi
    document.getElementById('btnApproveAll').addEventListener('click', () => approveAllPending(db));
}

// Global değişken: Onay bekleyen dökümanların yolları
let pendingDocsPaths = [];

function loadAllSoruTakibi(db, currentUserId, appId) {
    const listContainer = document.getElementById("globalSoruListContainer");

    const q = query(
        collectionGroup(db, 'soruTakibi'),
        where('kocId', '==', currentUserId),
        orderBy('onayDurumu', 'asc'), 
        orderBy('eklenmeTarihi', 'desc')
    );

    activeListeners.soruTakibiUnsubscribe = onSnapshot(q, (snapshot) => {
        const allEntries = [];
        pendingDocsPaths = []; // Sıfırla

        snapshot.forEach(doc => {
            const data = doc.data();
            const entry = { id: doc.id, ...data, path: doc.ref.path };
            allEntries.push(entry);
            
            if (data.onayDurumu === 'bekliyor') {
                pendingDocsPaths.push(doc.ref.path);
            }
        });
        
        renderGlobalSoruList(allEntries, db);
        calculateStats(allEntries);

        // Toplu onayla butonunu göster/gizle
        const btnApproveAll = document.getElementById('btnApproveAll');
        if (pendingDocsPaths.length > 0) {
            btnApproveAll.classList.remove('hidden');
            btnApproveAll.innerHTML = `<i class="fa-solid fa-check-double mr-2"></i> ${pendingDocsPaths.length} Kaydı Onayla`;
        } else {
            btnApproveAll.classList.add('hidden');
        }

    }, (error) => {
        console.error("Hata:", error);
        listContainer.innerHTML = `<p class="text-red-500 text-center p-8">Hata: ${error.message}</p>`;
    });
}

function calculateStats(entries) {
    // Tarih hesaplamaları
    const today = new Date();
    const startOfThisWeek = getMonday(today);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    const thisWeekStr = startOfThisWeek.toISOString().split('T')[0];
    const lastWeekStr = startOfLastWeek.toISOString().split('T')[0];
    
    let thisWeekTotal = 0;
    let lastWeekTotal = 0;
    let pendingCount = 0;

    entries.forEach(e => {
        const adet = e.adet || (e.dogru + e.yanlis + e.bos) || 0;
        
        if (e.onayDurumu === 'bekliyor') pendingCount++;
        
        // Sadece onaylıları istatistiğe kat
        if (e.onayDurumu === 'onaylandi') {
            if (e.tarih >= thisWeekStr) {
                thisWeekTotal += adet;
            } else if (e.tarih >= lastWeekStr && e.tarih < thisWeekStr) {
                lastWeekTotal += adet;
            }
        }
    });

    document.getElementById('kpiThisWeek').textContent = thisWeekTotal;
    document.getElementById('kpiPendingApprovals').textContent = pendingCount;
    
    // Karşılaştırma
    const diff = thisWeekTotal - lastWeekTotal;
    const arrowEl = document.getElementById('kpiArrow');
    const textEl = document.getElementById('kpiComparison');
    
    textEl.textContent = Math.abs(diff);
    
    if (diff > 0) {
        arrowEl.innerHTML = '<i class="fa-solid fa-arrow-trend-up"></i> Artış';
        arrowEl.className = "text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold";
    } else if (diff < 0) {
        arrowEl.innerHTML = '<i class="fa-solid fa-arrow-trend-down"></i> Düşüş';
        arrowEl.className = "text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-bold";
    } else {
        arrowEl.textContent = "Eşit";
        arrowEl.className = "text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs";
    }
}

function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

async function approveAllPending(db) {
    if (!confirm(`${pendingDocsPaths.length} adet kaydı onaylamak istiyor musunuz?`)) return;
    
    const batch = writeBatch(db);
    pendingDocsPaths.forEach(path => {
        batch.update(doc(db, path), { onayDurumu: 'onaylandi' });
    });
    
    try {
        await batch.commit();
        // UI onSnapshot ile güncellenecek
    } catch (error) {
        console.error("Toplu onay hatası:", error);
        alert("İşlem sırasında hata oluştu.");
    }
}

function renderGlobalSoruList(entries, db) {
    const container = document.getElementById("globalSoruListContainer");

    if (entries.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center p-8">Henüz veri girişi yok.</p>';
        return;
    }

    container.innerHTML = `
        <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ders</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konu</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Soru Sayısı</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlem</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${entries.map(e => {
                    const isPending = e.onayDurumu === 'bekliyor';
                    const adet = e.adet || (e.dogru + e.yanlis + e.bos) || 0;
                    
                    return `
                    <tr class="${isPending ? 'bg-yellow-50' : 'hover:bg-gray-50'}">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatDateTR(e.tarih)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${e.ders}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${e.konu || '-'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 text-lg">${adet}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            ${isPending ? 
                                '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Onay Bekliyor</span>' : 
                                '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Onaylandı</span>'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
                            ${isPending ? 
                                `<button data-path="${e.path}" class="btn-global-onayla text-green-600 hover:text-green-800 font-bold mr-3" title="Onayla"><i class="fa-solid fa-check"></i></button>` : ''}
                             <button data-path="${e.path}" class="btn-global-sil text-red-400 hover:text-red-600" title="Sil"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        </div>
    `;

    document.querySelectorAll('.btn-global-onayla').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const path = e.currentTarget.dataset.path;
            await updateDoc(doc(db, path), { onayDurumu: 'onaylandi' });
        });
    });
    
    document.querySelectorAll('.btn-global-sil').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const path = e.currentTarget.dataset.path;
            if (confirm("Silinsin mi?")) await deleteDoc(doc(db, path));
        });
    });
}
