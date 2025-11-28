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

import { activeListeners, formatDateTR } from './helpers.js';

let currentStudentId = null;
let denemeBarChart = null;

// Sınav Kuralları ve Ders Dağılımları
const EXAM_CONFIG = {
    'LGS': {
        wrongRatio: 3, // 3 yanlış 1 doğruyu götürür
        subjects: [
            { name: 'Türkçe', max: 20 },
            { name: 'Matematik', max: 20 },
            { name: 'Fen Bilimleri', max: 20 },
            { name: 'T.C. İnkılap Tarihi', max: 10 },
            { name: 'Din Kültürü', max: 10 },
            { name: 'Yabancı Dil', max: 10 }
        ]
    },
    'TYT': {
        wrongRatio: 4,
        subjects: [
            { name: 'Türkçe', max: 40 },
            { name: 'Matematik', max: 40 },
            { name: 'Tarih', max: 5 },
            { name: 'Coğrafya', max: 5 },
            { name: 'Felsefe', max: 5 },
            { name: 'Din Kültürü', max: 5 },
            { name: 'Fizik', max: 7 },
            { name: 'Kimya', max: 7 },
            { name: 'Biyoloji', max: 6 }
        ]
    },
    'AYT': {
        wrongRatio: 4,
        subjects: [
            { name: 'Türk Dili ve Edebiyatı', max: 24 },
            { name: 'Tarih-1', max: 10 },
            { name: 'Coğrafya-1', max: 6 },
            { name: 'Tarih-2', max: 11 },
            { name: 'Coğrafya-2', max: 11 },
            { name: 'Felsefe Grubu', max: 12 },
            { name: 'Din Kültürü', max: 6 },
            { name: 'Matematik', max: 40 },
            { name: 'Fizik', max: 14 },
            { name: 'Kimya', max: 13 },
            { name: 'Biyoloji', max: 13 }
        ]
    },
    'YDS': {
        wrongRatio: 0,
        subjects: [
            { name: 'Yabancı Dil', max: 80 }
        ]
    },
    'Diger': {
        wrongRatio: 4,
        subjects: [{ name: 'Genel', max: 100 }]
    }
};

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
                    <p class="text-sm text-gray-500 font-medium">Ortalama Net</p>
                    <h3 id="kpiAvgNet" class="text-2xl font-bold text-gray-800">0.00</h3>
                 </div>
                 <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500 font-medium">En Yüksek Net</p>
                    <h3 id="kpiMaxNet" class="text-2xl font-bold text-green-600">0.00</h3>
                 </div>
                 <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500 font-medium">Toplam Deneme</p>
                    <h3 id="kpiTotalCount" class="text-2xl font-bold text-indigo-600">0</h3>
                 </div>
            </div>

            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 class="font-semibold mb-4 text-gray-700">Net Gelişimi</h3>
                <div class="h-64 w-full"><canvas id="denemeBarChart"></canvas></div>
            </div>

            <div class="space-y-3 pb-12" id="denemelerListContainer">
                </div>
        </div>
    `;

    // Öğrenci Listesini Doldur
    await loadStudents(db, currentUserId, appId);

    // Event Listeners
    document.getElementById('filterStudentSelect').addEventListener('change', (e) => {
        currentStudentId = e.target.value;
        document.getElementById('denemeEmptyState').classList.add('hidden');
        document.getElementById('denemeContentArea').classList.remove('hidden');
        document.getElementById('btnAddNewDeneme').classList.remove('hidden');
        startDenemeListener(db, currentUserId, appId, currentStudentId);
    });

    document.getElementById('btnAddNewDeneme').addEventListener('click', () => {
        const modal = document.getElementById('addDenemeModal');
        document.getElementById('denemeAdi').value = '';
        document.getElementById('denemeTarih').value = new Date().toISOString().split('T')[0];
        document.getElementById('currentStudentIdForDeneme').value = currentStudentId;
        document.getElementById('denemeStudentSelectContainer').classList.add('hidden');
        
        // Varsayılan olarak TYT getir
        renderDenemeNetInputs('TYT');
        
        // Tür değişimi dinleyicisi (Daha önce yoksa ekle)
        const typeSelect = document.getElementById('denemeTuru');
        // Temizleyip yeniden ekleyelim ki üst üste binmesin
        const newTypeSelect = typeSelect.cloneNode(true);
        typeSelect.parentNode.replaceChild(newTypeSelect, typeSelect);
        
        // Seçenekleri EXAM_CONFIG'den doldur
        newTypeSelect.innerHTML = '';
        Object.keys(EXAM_CONFIG).forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = key === 'Diger' ? 'Diğer' : key;
            if(key === 'TYT') opt.selected = true;
            newTypeSelect.appendChild(opt);
        });

        newTypeSelect.addEventListener('change', (e) => {
            renderDenemeNetInputs(e.target.value);
        });

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

    const ctx = document.getElementById('denemeBarChart');
    if (denemeBarChart) denemeBarChart.destroy();

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

    // AKORDİYON YAPISI (Mobil Uyumlu)
    container.innerHTML = data.map(d => {
        const pending = d.onayDurumu === 'bekliyor'; 
        const net = parseFloat(d.toplamNet)||0;
        
        // Detay Grid'i
        let detailsHtml = '';
        if (d.netler) {
            detailsHtml = '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100">';
            for (const [ders, stats] of Object.entries(d.netler)) {
                if (stats.d > 0 || stats.y > 0) {
                    detailsHtml += `
                        <div class="flex justify-between items-center text-xs bg-gray-50 p-2 rounded border border-gray-100">
                            <span class="font-bold text-gray-700 truncate mr-2" title="${ders}">${ders}</span>
                            <span class="text-gray-500 flex gap-1.5">
                                <span class="text-green-600 font-bold">D:${stats.d}</span>
                                <span class="text-red-500 font-bold">Y:${stats.y}</span>
                                <span class="text-indigo-600 font-bold">N:${stats.net}</span>
                            </span>
                        </div>
                    `;
                }
            }
            detailsHtml += '</div>';
        }

        return `
        <div class="bg-white rounded-xl border ${pending?'border-yellow-200 bg-yellow-50':'border-gray-200'} shadow-sm overflow-hidden transition-all">
            <div class="p-4 cursor-pointer" onclick="this.nextElementSibling.classList.toggle('hidden');">
                <div class="flex justify-between items-center mb-2">
                    <div>
                        <h4 class="font-bold text-gray-800 text-sm md:text-base">${d.ad}</h4>
                        <p class="text-xs text-gray-500 font-mono mt-0.5">${d.tur} • ${formatDateTR(d.tarih)}</p>
                    </div>
                    <div class="text-right">
                        <span class="block text-xl font-bold text-indigo-600 leading-none">${net.toFixed(2)}</span>
                        <span class="text-[10px] text-gray-400 uppercase font-bold">NET</span>
                    </div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[10px] px-2 py-1 rounded-full ${pending?'bg-yellow-200 text-yellow-800':'bg-green-100 text-green-800'} font-bold uppercase tracking-wide">
                        ${pending ? 'Onay Bekliyor' : 'Onaylandı'}
                    </span>
                    <i class="fa-solid fa-chevron-down text-gray-300 text-xs"></i>
                </div>
            </div>

            <div class="hidden px-4 pb-4 bg-white animate-fade-in">
                ${detailsHtml || '<p class="text-xs text-gray-400 text-center py-2">Detay bulunamadı.</p>'}
                
                <div class="flex justify-end gap-2 mt-4 pt-2 border-t border-gray-50">
                    ${pending ? `<button class="btn-approve text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded hover:bg-green-200 font-bold transition-colors" data-path="${d.path}">Onayla</button>` : ''}
                    <button class="btn-delete text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 font-medium transition-colors" data-path="${d.path}">Sil</button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Buton Listenerları
    container.querySelectorAll('.btn-approve').forEach(b => {
        b.addEventListener('click', async () => {
            if(confirm('Bu deneme sonucunu onaylıyor musunuz?'))
                await updateDoc(doc(db, b.dataset.path), { onayDurumu: 'onaylandi' });
        });
    });
    container.querySelectorAll('.btn-delete').forEach(b => {
        b.addEventListener('click', async () => {
            if(confirm('Bu deneme kaydı silinecek. Emin misiniz?')) 
                await deleteDoc(doc(db, b.dataset.path));
        });
    });
}

// Dinamik Input Oluşturucu
export function renderDenemeNetInputs(tur) {
    const container = document.getElementById('denemeNetGirisAlani');
    if(!container) return;
    
    container.innerHTML = '';
    const config = EXAM_CONFIG[tur] || EXAM_CONFIG['Diger'];
    
    // Bilgi metni
    const infoText = config.wrongRatio > 0 
        ? `<div class="col-span-full text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-100 mb-2 text-center"><i class="fa-solid fa-circle-info"></i> ${config.wrongRatio} yanlış 1 doğruyu götürür.</div>`
        : `<div class="col-span-full text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100 mb-2 text-center"><i class="fa-solid fa-circle-check"></i> Yanlışlar doğruyu götürmez.</div>`;

    container.innerHTML = infoText;

    config.subjects.forEach(sub => {
        container.innerHTML += `
            <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div class="w-1/3">
                    <span class="text-sm font-bold text-gray-700 block truncate" title="${sub.name}">${sub.name}</span>
                    <span class="text-[10px] text-gray-400">Max: ${sub.max}</span>
                </div>
                <div class="flex gap-2 w-2/3 justify-end">
                    <div class="flex flex-col items-center">
                        <input type="number" placeholder="0" class="inp-deneme-d w-14 px-1 py-1.5 border border-green-200 rounded bg-green-50 text-center text-sm font-bold text-green-700 outline-none focus:ring-2 focus:ring-green-500" data-ders="${sub.name}" max="${sub.max}">
                        <span class="text-[9px] text-green-600 font-bold mt-0.5">D</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <input type="number" placeholder="0" class="inp-deneme-y w-14 px-1 py-1.5 border border-red-200 rounded bg-red-50 text-center text-sm font-bold text-red-700 outline-none focus:ring-2 focus:ring-red-500" data-ders="${sub.name}" max="${sub.max}">
                        <span class="text-[9px] text-red-500 font-bold mt-0.5">Y</span>
                    </div>
                </div>
            </div>
        `;
    });
}

// Kaydetme Fonksiyonu
export async function saveGlobalDeneme(db, currentUserId, appId) {
    const studentId = document.getElementById('currentStudentIdForDeneme').value;
    
    if (!studentId) { alert("Lütfen bir öğrenci seçin."); return; }

    const ad = document.getElementById('denemeAdi').value || "Deneme";
    const tur = document.getElementById('denemeTuru').value;
    const tarih = document.getElementById('denemeTarih').value;
    
    if(!tarih) { alert('Tarih seçiniz.'); return; }

    const config = EXAM_CONFIG[tur] || EXAM_CONFIG['Diger'];
    const ratio = config.wrongRatio;

    let totalNet = 0;
    let netler = {};
    let hasData = false;

    document.querySelectorAll('.inp-deneme-d').forEach(inp => {
        const ders = inp.dataset.ders;
        const d = parseInt(inp.value) || 0;
        const yInp = inp.parentElement.nextElementSibling.querySelector('.inp-deneme-y');
        const y = parseInt(yInp.value) || 0;
        
        if(d > 0 || y > 0) hasData = true;

        let net = d;
        if (ratio > 0) net = d - (y / ratio);
        
        totalNet += net;
        netler[ders] = { d, y, net: net.toFixed(2) };
    });

    if(!hasData) { alert('Lütfen en az bir ders sonucu girin.'); return; }

    await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "denemeler"), {
        ad, tur, tarih, 
        toplamNet: totalNet.toFixed(2), 
        netler, 
        onayDurumu: 'onaylandi', // Koç girdiği için direkt onaylı
        kocId: currentUserId, 
        studentId: studentId,
        eklenmeTarihi: serverTimestamp()
    });

    document.getElementById('addDenemeModal').style.display = 'none';
}
