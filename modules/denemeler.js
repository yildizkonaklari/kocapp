// === DENEMELER MODÜLÜ (FİLTRELİ) ===

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
let allDenemeData = []; // Tüm ham veri
let studentMap = {};    // ID -> İsim eşleşmesi
let pendingDocsPaths = []; // Onay bekleyenlerin yolları
let denemeBarChart = null; // Grafik instance'ı

export async function renderDenemelerSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Genel Deneme Analizi";
    
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
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-chart-line"></i></div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">Ortalama Net (Seçili)</p>
                    <h3 id="kpiAvgNet" class="text-2xl font-bold text-gray-800">0.00</h3>
                </div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-trophy"></i></div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">En Yüksek Net</p>
                    <h3 id="kpiMaxNet" class="text-2xl font-bold text-gray-800">0.00</h3>
                </div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-clock"></i></div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">Bekleyen Onaylar</p>
                    <h3 id="kpiPendingCount" class="text-2xl font-bold text-gray-800">0</h3>
                </div>
            </div>
        </div>

        <!-- Grafik ve Bilgi Alanı -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <!-- Grafik -->
            <div class="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 class="font-semibold text-gray-800 mb-4" id="chartTitle">Onaylı Netlerin Dağılımı</h3>
                <div class="h-64 relative">
                    <canvas id="denemeBarChart"></canvas>
                </div>
            </div>
            
            <!-- Bilgi -->
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 class="font-semibold text-gray-800 mb-4">Bilgilendirme</h3>
                <div class="space-y-4 text-sm text-gray-600">
                    <p>Listeden öğrenci seçerek sadece o öğrenciye ait analizleri görebilirsiniz.</p>
                    <ul class="list-disc pl-5 space-y-2">
                        <li>Sarı satırlar onay bekleyenlerdir.</li>
                        <li>"Listelenenleri Onayla" butonu ile o an ekranda görünen tüm bekleyenleri tek seferde onaylayabilirsiniz.</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Liste -->
        <div class="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
            <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 class="font-semibold text-gray-800" id="listTitle">Tüm Denemeler</h3>
            </div>
            <div id="denemelerListContainer">
                <p class="text-center text-gray-400 p-8">Veriler yükleniyor...</p>
            </div>
        </div>
    `;

    // 1. Öğrenci Listesini Çek ve Haritala
    await loadStudentsAndMap(db, currentUserId, appId);

    // 2. Denemeleri Dinle
    startDenemeListener(db, currentUserId, appId);
    
    // Event Listeners
    document.getElementById('filterStudentSelect').addEventListener('change', () => applyFilterAndRender(db));
    document.getElementById('btnApproveAll').addEventListener('click', () => approveFilteredPending(db));
}

/**
 * Öğrenci listesini çeker ve Select kutusunu doldurur.
 */
async function loadStudentsAndMap(db, currentUserId, appId) {
    const selectEl = document.getElementById('filterStudentSelect');
    studentMap = {}; 

    try {
        const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
        const snapshot = await getDocs(q);

        selectEl.innerHTML = '<option value="all">Tüm Öğrenciler</option>';

        snapshot.forEach(doc => {
            const s = doc.data();
            const fullName = `${s.ad} ${s.soyad}`;
            studentMap[doc.id] = fullName;

            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = fullName;
            selectEl.appendChild(option);
        });

    } catch (error) {
        console.error("Öğrenci listesi hatası:", error);
        selectEl.innerHTML = '<option disabled>Liste yüklenemedi</option>';
    }
}

/**
 * Deneme verilerini gerçek zamanlı dinler.
 */
function startDenemeListener(db, currentUserId, appId) {
    const listContainer = document.getElementById("denemelerListContainer");

    const q = query(
        collectionGroup(db, 'denemeler'),
        where('kocId', '==', currentUserId),
        orderBy('onayDurumu', 'asc'),
        orderBy('eklenmeTarihi', 'desc')
    );
    
    if (activeListeners.denemeUnsubscribe) activeListeners.denemeUnsubscribe();

    activeListeners.denemeUnsubscribe = onSnapshot(q, (snapshot) => {
        allDenemeData = []; // Sıfırla

        snapshot.forEach(doc => {
            const data = doc.data();
            // studentId verisi dökümanın içinde var, yoksa map'ten bulmaya çalışalım
            const sId = data.studentId || doc.ref.parent.parent.id;
            const sName = data.studentAd || studentMap[sId] || "Bilinmiyor";

            const entry = { 
                id: doc.id, 
                ...data, 
                path: doc.ref.path,
                studentId: sId,
                studentAd: sName
            };
            allDenemeData.push(entry);
        });
        
        applyFilterAndRender(db);

    }, (error) => {
        console.error("Deneme verisi hatası:", error);
        listContainer.innerHTML = `<p class="text-red-500 text-center p-8">Veriler yüklenemedi: ${error.message}</p>`;
    });
}

/**
 * Filtreleme ve Render İşlemleri
 */
function applyFilterAndRender(db) {
    const selectedStudentId = document.getElementById('filterStudentSelect').value;
    const listTitle = document.getElementById('listTitle');
    const chartTitle = document.getElementById('chartTitle');
    
    let filteredData = [];
    pendingDocsPaths = [];

    if (selectedStudentId === 'all') {
        filteredData = allDenemeData;
        listTitle.textContent = "Tüm Denemeler";
        chartTitle.textContent = "Tüm Öğrenciler - Net Dağılımı";
    } else {
        filteredData = allDenemeData.filter(item => item.studentId === selectedStudentId);
        const name = studentMap[selectedStudentId] || "Seçili Öğrenci";
        listTitle.textContent = `${name} - Deneme Geçmişi`;
        chartTitle.textContent = `${name} - Net Gelişimi`;
    }

    // Bekleyenleri topla
    filteredData.forEach(item => {
        if (item.onayDurumu === 'bekliyor') {
            pendingDocsPaths.push(item.path);
        }
    });

    // Buton Kontrolü
    const btnApproveAll = document.getElementById('btnApproveAll');
    if (pendingDocsPaths.length > 0) {
        btnApproveAll.classList.remove('hidden');
        btnApproveAll.innerHTML = `<i class="fa-solid fa-check-double mr-2"></i> ${pendingDocsPaths.length} Kaydı Onayla`;
    } else {
        btnApproveAll.classList.add('hidden');
    }

    renderDenemelerList(filteredData, db);
    calculateStatsAndChart(filteredData);
}

function renderDenemelerList(entries, db) {
    const container = document.getElementById("denemelerListContainer");

    if (entries.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center p-8">Kayıt bulunamadı.</p>';
        return;
    }

    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öğrenci</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sınav Adı</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tür</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlem</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${entries.map(d => {
                        const isPending = d.onayDurumu === 'bekliyor';
                        const netVal = parseFloat(d.toplamNet) || 0;
                        
                        return `
                        <tr class="${isPending ? 'bg-yellow-50' : 'hover:bg-gray-50'} transition-colors">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatDateTR(d.tarih)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">${d.studentAd}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${d.ad}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                <span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">${d.tur}</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">${netVal.toFixed(2)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                                ${isPending ? 
                                    '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Onay Bekliyor</span>' : 
                                    '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Onaylandı</span>'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
                                ${isPending ? 
                                    `<button data-path="${d.path}" class="btn-onayla-deneme text-green-600 hover:text-green-800 font-bold mr-3" title="Onayla"><i class="fa-solid fa-check"></i></button>` : ''}
                                <button data-path="${d.path}" class="btn-sil-deneme text-red-400 hover:text-red-600" title="Sil"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Event Listeners
    container.querySelectorAll('.btn-onayla-deneme').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const path = e.currentTarget.dataset.path;
            await updateDoc(doc(db, path), { onayDurumu: 'onaylandi' });
        });
    });
    
    container.querySelectorAll('.btn-sil-deneme').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const path = e.currentTarget.dataset.path;
            if (confirm("Silinsin mi?")) await deleteDoc(doc(db, path));
        });
    });
}

function calculateStatsAndChart(entries) {
    const onayli = entries.filter(d => d.onayDurumu === 'onaylandi');
    const pendingCount = entries.filter(d => d.onayDurumu === 'bekliyor').length;

    // KPI Hesapla
    let totalNet = 0;
    let maxNet = 0;
    
    onayli.forEach(d => {
        const net = parseFloat(d.toplamNet) || 0;
        totalNet += net;
        if (net > maxNet) maxNet = net;
    });

    const avgNet = onayli.length > 0 ? (totalNet / onayli.length) : 0;

    document.getElementById('kpiAvgNet').textContent = avgNet.toFixed(2);
    document.getElementById('kpiMaxNet').textContent = maxNet.toFixed(2);
    document.getElementById('kpiPendingCount').textContent = pendingCount;

    // Grafik Çiz (Son 10 Onaylı)
    renderChart(onayli);
}

function renderChart(onayliEntries) {
    const ctx = document.getElementById('denemeBarChart');
    if (!ctx) return;
    
    if (denemeBarChart) denemeBarChart.destroy();

    // Tarihe göre eskiden yeniye sırala (Gelişimi görmek için)
    const sortedData = onayliEntries
        .sort((a,b) => a.tarih.localeCompare(b.tarih))
        .slice(-15); // Son 15 veri
    
    const labels = sortedData.map(d => `${formatDateTR(d.tarih)} (${d.studentAd.split(' ')[0]})`);
    const dataPoints = sortedData.map(d => (parseFloat(d.toplamNet) || 0).toFixed(2));
    
    denemeBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Net Sayısı',
                data: dataPoints,
                backgroundColor: 'rgba(124, 58, 237, 0.7)', // purple-600
                borderColor: '#7c3aed',
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 20,
            }]
        },
        options: {
            indexAxis: 'x', // Dikey çubuklar (Zaman çizelgesi gibi olsun diye değiştirdim)
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                x: { grid: { display: false } }
            },
            plugins: { 
                legend: { display: false }
            }
        }
    });
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
        alert("Hata oluştu.");
    }
}
