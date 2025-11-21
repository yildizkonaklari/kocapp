// === GLOBAL SORU TAKİBİ MODÜLÜ (FİLTRELİ) ===

import { 
    doc, 
    collection, // Öğrenci listesi için
    collectionGroup, 
    query, 
    onSnapshot, 
    updateDoc, 
    deleteDoc,
    where, 
    orderBy,
    writeBatch,
    getDocs // Öğrenci listesini çekmek için
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR } from './helpers.js';

// Modül Seviyesi Değişkenler
let allSoruData = []; // Tüm ham veri burada tutulur
let studentMap = {};  // { 'docId': 'Ahmet Yılmaz' } şeklinde eşleşme
let pendingDocsPaths = []; // Onay bekleyenlerin yolları (Toplu onay için)

export async function renderSoruTakibiSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Genel Soru Takibi";
    
    // HTML İskeleti
    mainContentArea.innerHTML = `
        <!-- Filtreleme Alanı -->
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="w-full md:w-1/3">
                <label for="filterStudentSelect" class="block text-sm font-medium text-gray-700 mb-1">Öğrenci Filtrele</label>
                <select id="filterStudentSelect" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-white">
                    <option value="all">Tüm Öğrenciler</option>
                    <option disabled>Yükleniyor...</option>
                </select>
            </div>
            <div class="w-full md:w-auto flex justify-end">
                 <button id="btnApproveAll" class="hidden bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm transition-colors flex items-center">
                    <i class="fa-solid fa-check-double mr-2"></i> Listelenenleri Onayla
                </button>
            </div>
        </div>

        <!-- KPI Kartları -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Bu Hafta Çözülen (Seçili)</p>
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

        <!-- Liste -->
        <div class="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="font-semibold text-gray-800" id="tableTitle">Tüm Girişler</h3>
            </div>
            <div id="globalSoruListContainer">
                <p class="text-center text-gray-400 p-8">Veriler yükleniyor...</p>
            </div>
        </div>
    `;

    // 1. Önce Öğrenci Listesini Çek ve Haritala
    await loadStudentsAndMap(db, currentUserId, appId);

    // 2. Sonra Soru Verilerini Dinlemeye Başla
    startSoruListener(db, currentUserId, appId);
    
    // Event Listeners
    document.getElementById('filterStudentSelect').addEventListener('change', () => applyFilterAndRender(db));
    document.getElementById('btnApproveAll').addEventListener('click', () => approveFilteredPending(db));
}

/**
 * Öğrenci listesini çeker, Select kutusunu doldurur ve ID->İsim haritasını oluşturur.
 */
async function loadStudentsAndMap(db, currentUserId, appId) {
    const selectEl = document.getElementById('filterStudentSelect');
    studentMap = {}; // Sıfırla

    try {
        const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
        const snapshot = await getDocs(q);

        // Select'i temizle ve varsayılanı ekle
        selectEl.innerHTML = '<option value="all">Tüm Öğrenciler</option>';

        snapshot.forEach(doc => {
            const s = doc.data();
            const fullName = `${s.ad} ${s.soyad}`;
            
            // Haritaya ekle (ID -> İsim)
            studentMap[doc.id] = fullName;

            // Select'e ekle
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = fullName;
            selectEl.appendChild(option);
        });

    } catch (error) {
        console.error("Öğrenci listesi yüklenirken hata:", error);
        selectEl.innerHTML = '<option disabled>Hata oluştu</option>';
    }
}

/**
 * Soru verilerini gerçek zamanlı dinler ve ham veriyi günceller.
 */
function startSoruListener(db, currentUserId, appId) {
    const listContainer = document.getElementById("globalSoruListContainer");

    // İndeks gerektiren sorgu
    const q = query(
        collectionGroup(db, 'soruTakibi'),
        where('kocId', '==', currentUserId),
        orderBy('onayDurumu', 'asc'), // Bekleyenler önce
        orderBy('eklenmeTarihi', 'desc')
    );

    if (activeListeners.soruTakibiUnsubscribe) activeListeners.soruTakibiUnsubscribe();

    activeListeners.soruTakibiUnsubscribe = onSnapshot(q, (snapshot) => {
        allSoruData = []; // Ham veriyi sıfırla

        snapshot.forEach(doc => {
            const data = doc.data();
            // Firestore yolu: .../ogrencilerim/{STUDENT_ID}/soruTakibi/{DOC_ID}
            // parent.parent.id bize öğrenci ID'sini verir.
            const studentId = doc.ref.parent.parent.id;
            const studentName = studentMap[studentId] || "Bilinmeyen Öğrenci";

            const entry = { 
                id: doc.id, 
                ...data, 
                path: doc.ref.path,
                studentId: studentId,
                studentName: studentName
            };
            allSoruData.push(entry);
        });
        
        // Veri gelince filtreyi uygula ve çiz
        applyFilterAndRender(db);

    }, (error) => {
        console.error("Soru verisi hata:", error);
        listContainer.innerHTML = `<p class="text-red-500 text-center p-8">Veriler yüklenemedi: ${error.message}</p>`;
    });
}

/**
 * Seçili filtreye göre veriyi süzer, tabloyu ve istatistikleri günceller.
 */
function applyFilterAndRender(db) {
    const selectedStudentId = document.getElementById('filterStudentSelect').value;
    const tableTitle = document.getElementById('tableTitle');
    
    let filteredData = [];
    pendingDocsPaths = []; // Onay listesini sıfırla

    if (selectedStudentId === 'all') {
        filteredData = allSoruData;
        tableTitle.textContent = "Tüm Öğrencilerin Girişleri";
    } else {
        filteredData = allSoruData.filter(item => item.studentId === selectedStudentId);
        const name = studentMap[selectedStudentId] || "Seçili Öğrenci";
        tableTitle.textContent = `${name} - Soru Girişleri`;
    }

    // Filtrelenmiş verideki onay bekleyenleri topla
    filteredData.forEach(item => {
        if (item.onayDurumu === 'bekliyor') {
            pendingDocsPaths.push(item.path);
        }
    });

    // Buton kontrolü
    const btnApproveAll = document.getElementById('btnApproveAll');
    if (pendingDocsPaths.length > 0) {
        btnApproveAll.classList.remove('hidden');
        btnApproveAll.innerHTML = `<i class="fa-solid fa-check-double mr-2"></i> ${pendingDocsPaths.length} Kaydı Onayla`;
    } else {
        btnApproveAll.classList.add('hidden');
    }

    renderGlobalSoruList(filteredData, db);
    calculateStats(filteredData);
}

function renderGlobalSoruList(entries, db) {
    const container = document.getElementById("globalSoruListContainer");

    if (entries.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center p-8">Bu kriterlere uygun veri yok.</p>';
        return;
    }

    container.innerHTML = `
        <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öğrenci</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ders</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konu</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adet</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlem</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${entries.map(e => {
                    const isPending = e.onayDurumu === 'bekliyor';
                    const adet = e.adet || (e.dogru + e.yanlis + e.bos) || 0;
                    
                    return `
                    <tr class="${isPending ? 'bg-yellow-50' : 'hover:bg-gray-50'} transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">${e.studentName}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatDateTR(e.tarih)}</td>
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

    // Event Listeners
    container.querySelectorAll('.btn-global-onayla').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const path = e.currentTarget.dataset.path;
            await updateDoc(doc(db, path), { onayDurumu: 'onaylandi' });
        });
    });
    
    container.querySelectorAll('.btn-global-sil').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const path = e.currentTarget.dataset.path;
            if (confirm("Silinsin mi?")) await deleteDoc(doc(db, path));
        });
    });
}

function calculateStats(entries) {
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
        const adet = e.adet || 0;
        
        if (e.onayDurumu === 'bekliyor') pendingCount++;
        
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
    
    const diff = thisWeekTotal - lastWeekTotal;
    const arrowEl = document.getElementById('kpiArrow');
    const textEl = document.getElementById('kpiComparison');
    
    textEl.textContent = Math.abs(diff);
    
    if (diff > 0) {
        arrowEl.innerHTML = '<i class="fa-solid fa-arrow-trend-up"></i> Artış';
        arrowEl.className = "text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold ml-2";
    } else if (diff < 0) {
        arrowEl.innerHTML = '<i class="fa-solid fa-arrow-trend-down"></i> Düşüş';
        arrowEl.className = "text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-bold ml-2";
    } else {
        arrowEl.textContent = "Eşit";
        arrowEl.className = "text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs ml-2";
    }
}

function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

async function approveFilteredPending(db) {
    if (pendingDocsPaths.length === 0) return;
    if (!confirm(`${pendingDocsPaths.length} adet kaydı onaylamak istiyor musunuz?`)) return;
    
    const batch = writeBatch(db);
    pendingDocsPaths.forEach(path => {
        batch.update(doc(db, path), { onayDurumu: 'onaylandi' });
    });
    
    try {
        await batch.commit();
    } catch (error) {
        console.error("Toplu onay hatası:", error);
        alert("İşlem sırasında hata oluştu.");
    }
}
