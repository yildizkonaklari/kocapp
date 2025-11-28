import {
    doc,
    collection,
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

let currentStudentId = null;
let denemeBarChart = null;

export async function renderDenemelerSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");

    mainContentTitle.textContent = "Denemeler"; 

    mainContentArea.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div class="w-full md:w-1/3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Öğrenci Seçin</label>
                <select id="filterStudentSelect" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500">
                    <option value="" disabled selected>Öğrenci Seçiniz...</option>
                </select>
            </div>
            <button id="btnAddNewDeneme" class="hidden bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-sm flex items-center">
                <i class="fa-solid fa-plus mr-2"></i> Yeni Deneme Ekle
            </button>
        </div>

        <div id="denemeEmptyState" class="text-center text-gray-400 py-12">
            <i class="fa-solid fa-chart-column text-4xl mb-3 opacity-20"></i>
            <p>Deneme sonuçlarını görmek için lütfen bir öğrenci seçin.</p>
        </div>

        <div id="denemeContentArea" class="hidden space-y-6">
             <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500">Ortalama Net</p>
                    <h3 id="kpiAvgNet" class="text-2xl font-bold text-gray-800">0.00</h3>
                 </div>
                 <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500">En Yüksek Net</p>
                    <h3 id="kpiMaxNet" class="text-2xl font-bold text-gray-800">0.00</h3>
                 </div>
                 <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500">Toplam Deneme</p>
                    <h3 id="kpiTotalCount" class="text-2xl font-bold text-gray-800">0</h3>
                 </div>
            </div>

            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 class="font-semibold mb-4">Net Gelişimi</h3>
                <div class="h-64"><canvas id="denemeBarChart"></canvas></div>
            </div>

            <div class="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b bg-gray-50">
                    <h3 class="font-semibold text-gray-800">Deneme Geçmişi</h3>
                </div>
                <div id="denemelerListContainer"></div>
            </div>
        </div>
    `;

    // Öğrenci Listesini Doldur
    await loadStudents(db, currentUserId, appId);

    // Event Listeners
    document.getElementById('filterStudentSelect').addEventListener('change', (e) => {
        currentStudentId = e.target.value;
        
        // UI Güncelle
        document.getElementById('denemeEmptyState').classList.add('hidden');
        document.getElementById('denemeContentArea').classList.remove('hidden');
        document.getElementById('btnAddNewDeneme').classList.remove('hidden');
        
        // Veri Çek
        startDenemeListener(db, currentUserId, appId, currentStudentId);
    });

    document.getElementById('btnAddNewDeneme').addEventListener('click', () => {
         const modal = document.getElementById('addDenemeModal');
         
        document.getElementById('denemeAdi').value = '';
        document.getElementById('denemeTarih').value = new Date().toISOString().split('T')[0];
        
        // Gizli inputa ID ata
        document.getElementById('currentStudentIdForDeneme').value = currentStudentId;
        
        // Öğrenci seçim alanını gizle (Zaten seçili)
        document.getElementById('denemeStudentSelectContainer').classList.add('hidden');
        
        // Varsayılan inputları çiz
        renderDenemeNetInputs('TYT');

        modal.style.display = 'block';
    });
}

async function loadStudents(db, uid, appId) {
    const select = document.getElementById('filterStudentSelect');
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim"), orderBy("ad"));
    const snap = await getDocs(q);
    
    select.innerHTML = '<option value="" disabled selected>Öğrenci Seçiniz...</option>';
    snap.forEach(doc => {
        const s = doc.data();
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = `${s.ad} ${s.soyad}`;
        select.appendChild(opt);
    });
}

function startDenemeListener(db, uid, appId, sid) {
    const q = query(
        collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "denemeler"),
        orderBy("tarih", "desc")
    );

    if (activeListeners.denemeUnsubscribe) activeListeners.denemeUnsubscribe();

    activeListeners.denemeUnsubscribe = onSnapshot(q, (snap) => {
        const data = [];
        snap.forEach(doc => data.push({ id: doc.id, path: doc.ref.path, ...doc.data() }));
        
        updateStatsAndChart(data);
        renderList(data, db);
    });
}

function updateStatsAndChart(data) {
    // KPI Hesapla
    let max = 0;
    let totalNet = 0;
    
    data.forEach(d => {
        const n = parseFloat(d.toplamNet) || 0;
        totalNet += n;
        if (n > max) max = n;
    });
    
    const avg = data.length ? (totalNet / data.length) : 0;
    
    document.getElementById('kpiAvgNet').textContent = avg.toFixed(2);
    document.getElementById('kpiMaxNet').textContent = max.toFixed(2);
    document.getElementById('kpiTotalCount').textContent = data.length;

    // Grafik Çiz
    const ctx = document.getElementById('denemeBarChart');
    if (denemeBarChart) denemeBarChart.destroy();

    // Tarihe göre artan sıralama (Grafik için)
    const chartData = [...data].sort((a, b) => a.tarih.localeCompare(b.tarih));
    
    denemeBarChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => formatDateTR(d.tarih)),
            datasets: [{
                label: 'Net',
                data: chartData.map(d => d.toplamNet),
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderList(data, db) {
    const container = document.getElementById('denemelerListContainer');
    
    if (data.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">Kayıtlı deneme yok.</p>';
        return;
    }

    container.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sınav</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                    <th class="px-6 py-3"></th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${data.map(d => `
                    <tr class="hover:bg-gray-50 cursor-pointer" onclick="document.getElementById('detail-${d.id}').classList.toggle('hidden')">
                        <td class="px-6 py-4 text-sm text-gray-600">${formatDateTR(d.tarih)}</td>
                        <td class="px-6 py-4 text-sm font-medium text-gray-900">${d.ad} <span class="text-xs text-gray-500">(${d.tur})</span></td>
                        <td class="px-6 py-4 text-sm font-bold text-indigo-600">${parseFloat(d.toplamNet).toFixed(2)}</td>
                        <td class="px-6 py-4 text-center">
                            ${d.onayDurumu === 'bekliyor' 
                                ? '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Bekliyor</span>' 
                                : '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Onaylı</span>'}
                        </td>
                        <td class="px-6 py-4 text-right">
                            ${d.onayDurumu === 'bekliyor' ? `<button class="text-green-600 font-bold mr-3 btn-approve" data-path="${d.path}" onclick="event.stopPropagation()">Onayla</button>` : ''}
                            <button class="text-red-400 hover:text-red-600 btn-delete" data-path="${d.path}" onclick="event.stopPropagation()"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                    <tr id="detail-${d.id}" class="hidden bg-gray-50">
                        <td colspan="5" class="px-6 py-4">
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                                ${Object.entries(d.netler || {}).map(([ders, stat]) => `
                                    <div class="text-xs bg-white p-2 rounded border">
                                        <span class="font-bold block">${ders}</span>
                                        <span class="text-gray-500">D:${stat.d} Y:${stat.y} N:${stat.net}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // Buton Listenerları
    container.querySelectorAll('.btn-approve').forEach(b => {
        b.addEventListener('click', async () => {
            await updateDoc(doc(db, b.dataset.path), { onayDurumu: 'onaylandi' });
        });
    });
    container.querySelectorAll('.btn-delete').forEach(b => {
        b.addEventListener('click', async () => {
            if(confirm('Silinsin mi?')) await deleteDoc(doc(db, b.dataset.path));
        });
    });
}

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
                    <input type="number" placeholder="D" class="inp-deneme-d w-14 px-2 py-1 border border-green-200 rounded bg-green-50 text-center text-sm outline-none" data-ders="${ders}">
                    <input type="number" placeholder="Y" class="inp-deneme-y w-14 px-2 py-1 border border-red-200 rounded bg-red-50 text-center text-sm outline-none" data-ders="${ders}">
                    <input type="number" placeholder="B" class="inp-deneme-b w-14 px-2 py-1 border border-gray-200 rounded bg-gray-50 text-center text-sm outline-none" data-ders="${ders}">
                </div>
            </div>
        `;
    });
}

export async function saveGlobalDeneme(db, currentUserId, appId) {
    const studentId = document.getElementById('currentStudentIdForDeneme').value;
    
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

    await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "denemeler"), {
        ad, tur, tarih, toplamNet: totalNet, netler, 
        onayDurumu: 'onaylandi',
        kocId: currentUserId, 
        studentId: studentId,
        eklenmeTarihi: serverTimestamp()
    });

    document.getElementById('addDenemeModal').style.display = 'none';
}
