// === DENEMELER MODÜLÜ (FİLTRELİ VE TAM) ===

import { 
    doc, 
    collection, 
    collectionGroup, 
    query, 
    onSnapshot, 
    updateDoc, 
    deleteDoc,
    where, 
    orderBy,
    writeBatch,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR, populateStudentSelect } from './helpers.js';

// Modül Seviyesi Değişkenler
let allDenemeData = []; 
let studentMap = {};    
let pendingDocsPaths = []; 
let denemeBarChart = null;

// --- ANA RENDER FONKSİYONU ---
export async function renderDenemelerSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Genel Deneme Analizi";
    
    // HTML İskeleti
    mainContentArea.innerHTML = `
        <!-- Üst Bar: Filtre ve Ekleme -->
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div class="w-full md:w-1/3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Öğrenci Filtrele</label>
                <select id="filterStudentSelect" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500">
                    <option value="all">Tüm Öğrenciler</option>
                    <option disabled>Yükleniyor...</option>
                </select>
            </div>
            <div class="flex gap-2">
                <button id="btnApproveAll" class="hidden bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm flex items-center">
                    <i class="fa-solid fa-check-double mr-2"></i> Onayla
                </button>
                <button id="btnAddNewDeneme" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-sm flex items-center">
                    <i class="fa-solid fa-plus mr-2"></i> Yeni Deneme Ekle
                </button>
            </div>
        </div>

        <!-- KPI Kartları -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500">Ortalama Net</p>
                <h3 id="kpiAvgNet" class="text-2xl font-bold text-gray-800">0.00</h3>
             </div>
             <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500">En Yüksek</p>
                <h3 id="kpiMaxNet" class="text-2xl font-bold text-gray-800">0.00</h3>
             </div>
             <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500">Bekleyen</p>
                <h3 id="kpiPendingCount" class="text-2xl font-bold text-gray-800">0</h3>
             </div>
        </div>

        <!-- Grafik ve Bilgi -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 class="font-semibold mb-4" id="chartTitle">Net Dağılımı</h3>
                <div class="h-64"><canvas id="denemeBarChart"></canvas></div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 class="font-semibold mb-4">Bilgi</h3>
                <p class="text-sm text-gray-600">Listeden öğrenci seçerek detaylı analiz yapabilir veya yeni deneme ekleyebilirsiniz.</p>
            </div>
        </div>

        <!-- Liste -->
        <div class="bg-white rounded-lg shadow border border-gray-100">
            <div class="px-6 py-4 border-b bg-gray-50">
                <h3 class="font-semibold text-gray-800" id="listTitle">Tüm Denemeler</h3>
            </div>
            <div id="denemelerListContainer">
                <p class="p-8 text-center text-gray-400">Yükleniyor...</p>
            </div>
        </div>
    `;

    // Verileri Yükle
    await loadStudentsAndMap(db, currentUserId, appId);
    startDenemeListener(db, currentUserId, appId);
    
    // Event Listeners
    document.getElementById('filterStudentSelect').addEventListener('change', () => applyFilterAndRender(db));
    document.getElementById('btnApproveAll').addEventListener('click', () => approveFilteredPending(db));
    
    // Yeni Deneme Ekle Butonu
    document.getElementById('btnAddNewDeneme').addEventListener('click', async () => {
        const selectedStudentId = document.getElementById('filterStudentSelect').value;
        const modal = document.getElementById('addDenemeModal');
        const selectContainer = document.getElementById('denemeStudentSelectContainer');
        
        // Temizlik
        document.getElementById('denemeAdi').value = '';
        document.getElementById('denemeTarih').value = new Date().toISOString().split('T')[0];
        renderDenemeNetInputs('TYT'); // Varsayılan inputları çiz
        
        if (selectedStudentId === 'all') {
            selectContainer.classList.remove('hidden');
            await populateStudentSelect(db, currentUserId, appId, 'denemeStudentSelect');
        } else {
            selectContainer.classList.add('hidden');
            document.getElementById('currentStudentIdForDeneme').value = selectedStudentId;
        }
        
        modal.style.display = 'block';
    });
}

// --- YARDIMCI FONKSİYONLAR ---

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
        allDenemeData = [];

        snapshot.forEach(doc => {
            const data = doc.data();
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

    filteredData.forEach(item => {
        if (item.onayDurumu === 'bekliyor') pendingDocsPaths.push(item.path);
    });

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
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">${d.tur}</span></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">${netVal.toFixed(2)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                                ${isPending ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Onay Bekliyor</span>' : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Onaylandı</span>'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
                                ${isPending ? `<button data-path="${d.path}" class="btn-onayla-deneme text-green-600 hover:text-green-800 font-bold mr-3">Onayla</button>` : ''}
                                <button data-path="${d.path}" class="btn-sil-deneme text-red-400 hover:text-red-600">Sil</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.querySelectorAll('.btn-onayla-deneme').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            await updateDoc(doc(db, e.currentTarget.dataset.path), { onayDurumu: 'onaylandi' });
        });
    });
    container.querySelectorAll('.btn-sil-deneme').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm("Silinsin mi?")) await deleteDoc(doc(db, e.currentTarget.dataset.path));
        });
    });
}

function calculateStatsAndChart(entries) {
    const onayli = entries.filter(d => d.onayDurumu === 'onaylandi');
    const pendingCount = entries.filter(d => d.onayDurumu === 'bekliyor').length;

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

    renderChart(onayli);
}

function renderChart(onayliEntries) {
    const ctx = document.getElementById('denemeBarChart');
    if (!ctx) return;
    
    if (denemeBarChart) denemeBarChart.destroy();

    const sortedData = onayliEntries.sort((a,b) => a.tarih.localeCompare(b.tarih)).slice(-15);
    
    const labels = sortedData.map(d => `${formatDateTR(d.tarih)} (${d.studentAd.split(' ')[0]})`);
    const dataPoints = sortedData.map(d => (parseFloat(d.toplamNet) || 0).toFixed(2));
    
    denemeBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Net Sayısı',
                data: dataPoints,
                backgroundColor: 'rgba(124, 58, 237, 0.7)',
                borderColor: '#7c3aed',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
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

// --- KAYDETME FONKSİYONU (Globalden Çağrılacak) ---
export async function saveGlobalDeneme(db, currentUserId, appId) {
    let studentId = document.getElementById('currentStudentIdForDeneme').value;
    const selectContainer = document.getElementById('denemeStudentSelectContainer');
    
    if (!selectContainer.classList.contains('hidden')) {
        studentId = document.getElementById('denemeStudentSelect').value;
    }

    if (!studentId) { alert("Lütfen bir öğrenci seçin."); return; }

    const ad = document.getElementById('denemeAdi').value;
    const tur = document.getElementById('denemeTuru').value;
    const tarih = document.getElementById('denemeTarih').value;
    
    let totalNet = 0;
    const netler = {};
    const katsayi = tur === 'LGS' ? 3 : 4;
    
    document.querySelectorAll('.inp-deneme-d').forEach(inp => {
        const ders = inp.dataset.ders;
        const d = parseInt(inp.value) || 0;
        const y = parseInt(inp.parentElement.querySelector('.inp-deneme-y').value) || 0;
        const b = parseInt(inp.parentElement.querySelector('.inp-deneme-b').value) || 0;
        const net = d - (y / katsayi);
        totalNet += net;
        netler[ders] = { d, y, b, net: net.toFixed(2) };
    });

    const studentName = studentMap[studentId] || "Öğrenci";

    await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "denemeler"), {
        ad, tur, tarih, toplamNet: totalNet, netler, 
        onayDurumu: 'onaylandi',
        kocId: currentUserId, 
        studentId: studentId, 
        studentAd: studentName,
        eklenmeTarihi: serverTimestamp()
    });

    document.getElementById('addDenemeModal').style.display = 'none';
}

// --- YENİ: INPUT RENDER FONKSİYONU (EXPORT EDİLDİ) ---
export function renderDenemeNetInputs(tur) {
    const container = document.getElementById('denemeNetGirisAlani');
    if(!container) return;
    
    container.innerHTML = '';
    const dersListeleri = {
        'TYT': ['Türkçe', 'Sosyal', 'Matematik', 'Fen'],
        'AYT': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Edebiyat', 'Tarih-1', 'Coğrafya-1'],
        'LGS': ['Türkçe', 'Matematik', 'Fen', 'İnkılap', 'Din', 'İngilizce'],
        'Diger': ['Genel']
    };

    const dersler = dersListeleri[tur] || dersListeleri['Diger'];

    dersler.forEach(ders => {
        container.innerHTML += `
            <div class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                <span class="text-sm font-medium text-gray-700 w-24 truncate">${ders}</span>
                <div class="flex gap-2">
                    <input type="number" placeholder="D" class="inp-deneme-d w-14 px-2 py-1 border border-green-200 rounded bg-green-50 text-center text-sm focus:ring-1 focus:ring-green-500 outline-none" data-ders="${ders}">
                    <input type="number" placeholder="Y" class="inp-deneme-y w-14 px-2 py-1 border border-red-200 rounded bg-red-50 text-center text-sm focus:ring-1 focus:ring-red-500 outline-none" data-ders="${ders}">
                    <input type="number" placeholder="B" class="inp-deneme-b w-14 px-2 py-1 border border-gray-200 rounded bg-gray-50 text-center text-sm focus:ring-1 focus:ring-gray-500 outline-none" data-ders="${ders}">
                </div>
            </div>
        `;
    });
}
