import { 
    collection, query, onSnapshot, updateDoc, deleteDoc, getDoc,
    where, orderBy, getDocs, doc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR, openModalWithBackHistory } from './helpers.js';

let currentStudentId = null;
let currentStudentClass = null; 
let denemeChartInstance = null;
let currentDb = null;

// Sınıf ve Sınav Ayarları
const EXAM_RULES = {
    'ORTAOKUL': { types: ['LGS', 'Diger'], ratio: 3 },
    'LISE': { types: ['TYT', 'AYT', 'YDS', 'Diger'], ratio: 4 }
};

const EXAM_CONFIG = {
    'LGS': { subjects: [{name:'Türkçe',max:20},{name:'Matematik',max:20},{name:'Fen Bilimleri',max:20},{name:'T.C. İnkılap',max:10},{name:'Din Kültürü',max:10},{name:'İngilizce',max:10}] },
    'TYT': { subjects: [{name:'Türkçe',max:40},{name:'Matematik',max:40},{name:'Sosyal',max:20},{name:'Fen',max:20}] },
    'AYT': { subjects: [{name:'Matematik',max:40},{name:'Fizik',max:14},{name:'Kimya',max:13},{name:'Biyoloji',max:13},{name:'Edebiyat',max:24},{name:'Tarih-1',max:10},{name:'Coğrafya-1',max:6},{name:'Tarih-2',max:11},{name:'Coğrafya-2',max:11},{name:'Felsefe Gr.',max:12},{name:'Din',max:6}] },
    'YDS': { subjects: [{name:'Yabancı Dil',max:80}] }
};

export async function renderDenemelerSayfasi(db, currentUserId, appId) {
    currentDb = db;
    document.getElementById("mainContentTitle").textContent = "Deneme Yönetimi";
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-20">
            
            <div class="w-full md:w-1/3 relative">
                <label class="block text-xs font-bold text-gray-500 mb-1 ml-1">Öğrenci Seçin</label>
                
                <button id="denemeSelectTrigger" class="w-full flex justify-between items-center bg-white border border-gray-300 text-gray-700 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm">
                    <span id="denemeSelectedStudentText">Bir öğrenci seçin...</span>
                    <i class="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                </button>

                <input type="hidden" id="filterDenemeStudentId">

                <div id="denemeSelectDropdown" class="hidden absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
                    <div class="p-2 border-b border-gray-100 bg-gray-50">
                        <div class="relative">
                            <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                            <input type="text" id="denemeSelectSearch" placeholder="Öğrenci ara..." class="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500">
                        </div>
                    </div>
                    <div id="denemeSelectList" class="max-h-60 overflow-y-auto custom-scrollbar">
                        <div class="p-3 text-center text-gray-400 text-xs">Yükleniyor...</div>
                    </div>
                </div>
            </div>

            <button id="btnAddNewDeneme" class="hidden w-full md:w-auto bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center justify-center transition-transform active:scale-95 text-sm font-medium">
                <i class="fa-solid fa-plus mr-2"></i> Yeni Deneme Ekle
            </button>
        </div>

        <div id="denemeStatsArea" class="hidden grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-10">
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <p class="text-xs text-gray-500 font-bold uppercase">Ortalama Net</p>
                <h3 id="statGlobalAvg" class="text-2xl font-bold text-indigo-600">-</h3>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <p class="text-xs text-gray-500 font-bold uppercase">En Yüksek Net</p>
                <h3 id="statGlobalMax" class="text-2xl font-bold text-green-600">-</h3>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <p class="text-xs text-gray-500 font-bold uppercase">Toplam Deneme</p>
                <h3 id="statGlobalTotal" class="text-2xl font-bold text-gray-800">-</h3>
            </div>
        </div>

        <div id="denemeChartContainer" class="hidden bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 h-64 relative z-10">
            <canvas id="coachDenemeChart"></canvas>
        </div>

        <div id="denemeListContainer" class="space-y-3 relative z-10">
            <div class="col-span-full text-center text-gray-400 py-12">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i class="fa-solid fa-file-signature text-3xl opacity-30"></i>
                </div>
                <p>Denemeleri görmek için listeden bir öğrenci seçin.</p>
            </div>
        </div>
    `;

    // 1. Öğrenci Listesini Getir ve Dropdown'ı Kur
    await setupDenemeSearchableDropdown(db, currentUserId, appId);

    // 2. Yeni Deneme Ekleme Butonu
    document.getElementById('btnAddNewDeneme').addEventListener('click', () => {
        openDenemeModal(db, currentUserId, appId);
    });
}

// --- ARAMALI DROPDOWN MANTIĞI ---
async function setupDenemeSearchableDropdown(db, uid, appId) {
    const triggerBtn = document.getElementById('denemeSelectTrigger');
    const dropdown = document.getElementById('denemeSelectDropdown');
    const searchInput = document.getElementById('denemeSelectSearch');
    const listContainer = document.getElementById('denemeSelectList');
    const hiddenInput = document.getElementById('filterDenemeStudentId');
    const labelSpan = document.getElementById('denemeSelectedStudentText');

    // Öğrencileri Çek
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim"), orderBy("ad"));
    const snapshot = await getDocs(q);
    const students = [];
    snapshot.forEach(doc => students.push({ id: doc.id, name: `${doc.data().ad} ${doc.data().soyad}`, sinif: doc.data().sinif }));

    // Listeyi Render Et
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
                // Seçim Yapıldığında:
                hiddenInput.value = s.id;
                currentStudentId = s.id;
                currentStudentClass = s.sinif; // Sınıf bilgisini güncelle
                
                labelSpan.textContent = s.name;
                labelSpan.classList.add('font-bold', 'text-purple-700');
                dropdown.classList.add('hidden'); 
                
                // Arayüzü Aç
                document.getElementById('btnAddNewDeneme').classList.remove('hidden');
                document.getElementById('denemeStatsArea').classList.remove('hidden');
                document.getElementById('denemeChartContainer').classList.remove('hidden');
                
                // Denemeleri Getir
                startDenemeListener(db, uid, appId, s.id);
            };
            listContainer.appendChild(item);
        });
    };

    renderList(); // İlk render

    // Event Listeners
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

function startDenemeListener(db, uid, appId, studentId) {
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", studentId, "denemeler"), orderBy("tarih", "desc"));
    
    if (activeListeners.denemelerUnsubscribe) activeListeners.denemelerUnsubscribe();

    activeListeners.denemelerUnsubscribe = onSnapshot(q, (snap) => {
        const list = [];
        snap.forEach(d => list.push({id:d.id, ...d.data()}));
        renderDenemeList(list);
        calculateStatsAndChart(list);
    });
}

function renderDenemeList(list) {
    const container = document.getElementById('denemeListContainer');
    if (list.length === 0) { 
        container.innerHTML = '<div class="text-center py-8 bg-gray-50 rounded-xl border border-gray-100"><p class="text-gray-400">Henüz deneme kaydı yok.</p></div>'; 
        return; 
    }

    container.innerHTML = list.map(d => {
        const isApproved = d.onayDurumu === 'onaylandi';
        const isExcluded = d.analizHaric === true; 
        
        let detailsHtml = '';
        if (d.netler) { // Normal Deneme
            detailsHtml = '<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 pt-2 border-t border-gray-100 hidden animate-fade-in details-panel">';
            for (const [ders, stats] of Object.entries(d.netler)) {
                if (parseFloat(stats.net) !== 0) {
                    detailsHtml += `<div class="text-xs bg-gray-50 p-1.5 rounded flex justify-between"><span class="font-bold truncate">${ders}</span><span class="text-gray-600">${stats.net} Net</span></div>`;
                }
            }
            detailsHtml += '</div>';
        } else { // Diğer Deneme
            detailsHtml = `<div class="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 hidden animate-fade-in details-panel flex gap-4">
                <span class="font-bold text-gray-700">Soru: <span class="font-normal">${d.soruSayisi || '-'}</span></span>
                <span class="font-bold text-green-600">Doğru: <span class="font-normal">${d.dogru || '-'}</span></span>
                <span class="font-bold text-red-500">Yanlış: <span class="font-normal">${d.yanlis || '-'}</span></span>
            </div>`;
        }

        return `
        <div class="bg-white p-4 rounded-xl border ${isExcluded ? 'border-orange-200 bg-orange-50' : 'border-gray-200'} shadow-sm relative group cursor-pointer transition-all hover:shadow-md" onclick="this.querySelector('.details-panel').classList.toggle('hidden')">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-gray-800 text-sm">${d.ad} <span class="text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-1">${d.tur}</span></h4>
                    <p class="text-xs text-gray-500 mt-1 flex items-center"><i class="fa-regular fa-calendar mr-1.5 text-gray-400"></i> ${formatDateTR(d.tarih)}</p>
                </div>
                <div class="text-right">
                    <h3 class="text-xl font-bold ${isExcluded ? 'text-orange-600' : 'text-indigo-600'}">${d.toplamNet} <span class="text-xs font-normal text-gray-400">Net</span></h3>
                    ${!isApproved ? '<span class="text-[9px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Onay Bekliyor</span>' : ''}
                    ${isExcluded ? '<span class="text-[9px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full block mt-1">Analiz Dışı</span>' : ''}
                </div>
            </div>
            ${detailsHtml}
            <button onclick="event.stopPropagation(); deleteGlobalDoc('${d.id}')" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full shadow-sm"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    }).join('');
}

// --- İSTATİSTİK VE GRAFİK ---
function calculateStatsAndChart(list) {
    const validList = list.filter(d => d.onayDurumu === 'onaylandi' && d.analizHaric !== true);
    
    let totalNet = 0, maxNet = 0;
    validList.forEach(d => {
        const n = parseFloat(d.toplamNet);
        totalNet += n;
        if(n > maxNet) maxNet = n;
    });

    document.getElementById('statGlobalAvg').textContent = validList.length ? (totalNet / validList.length).toFixed(2) : '-';
    document.getElementById('statGlobalMax').textContent = maxNet.toFixed(2);
    document.getElementById('statGlobalTotal').textContent = validList.length;

    const ctx = document.getElementById('coachDenemeChart');
    if (ctx) {
        const sorted = [...validList].sort((a,b) => a.tarih.localeCompare(b.tarih)).slice(-10);
        
        if(denemeChartInstance) denemeChartInstance.destroy();
        denemeChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(d => formatDateTR(d.tarih)),
                datasets: [{
                    label: 'Net Gelişimi',
                    data: sorted.map(d => d.toplamNet),
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#4f46e5',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: false, grid: { display: true, color: '#f3f4f6' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

// --- MODAL VE FORM YÖNETİMİ ---
function openDenemeModal(db, uid, appId) {
    // ID Kontrolü (Aramalı Listeden gelen ID)
    const sid = document.getElementById('filterDenemeStudentId').value;
    if (!sid) { alert("Lütfen önce öğrenci seçin."); return; }

    const modal = document.getElementById('modalDenemeEkle');
    if (!modal) { console.error("Modal bulunamadı!"); return; }

    // Modalı Aç (History Push ile)
    openModalWithBackHistory('modalDenemeEkle');

    // Kapatma Butonları (History Back ile)
    const closeBtnX = modal.querySelector('.fa-xmark').closest('button');
    const cancelBtn = modal.querySelector('.border-t button'); 

    const handleClose = (e) => { e.preventDefault(); window.history.back(); };
    if (closeBtnX) closeBtnX.onclick = handleClose;
    if (cancelBtn) cancelBtn.onclick = handleClose;

    // Formu Hazırla
    document.getElementById('inpDenemeAd').value = '';
    
    // Öğrenci Sınıfına Göre Türleri Getir
    const isOrtaokul = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(currentStudentClass);
    const levelKey = isOrtaokul ? 'ORTAOKUL' : 'LISE';
    const rules = EXAM_RULES[levelKey];

    const typeSelect = document.getElementById('inpDenemeTur');
    typeSelect.innerHTML = rules.types.map(t => `<option value="${t}">${t}</option>`).join('');
    
    document.getElementById('inpDenemeTarih').value = new Date().toISOString().split('T')[0];
    
    renderDenemeInputs(rules.types[0], rules.ratio);

    typeSelect.onchange = (e) => {
        renderDenemeInputs(e.target.value, rules.ratio);
    };

    // Kaydet Butonu (Event yığılmasını önlemek için onclick ataması)
    document.getElementById('btnSaveDeneme').onclick = async () => saveDeneme(db, uid, appId, levelKey);
}

function renderDenemeInputs(tur, ratio) {
    const container = document.getElementById('denemeDersContainer');
    container.innerHTML = '';

    let ratioText = ratio === 3 ? "3 Yanlış 1 Doğruyu Götürür" : "4 Yanlış 1 Doğruyu Götürür";
    
    if (tur === 'Diger') {
        container.innerHTML = `
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 text-xs text-orange-800 text-center">
                <i class="fa-solid fa-triangle-exclamation"></i> Bu deneme genel analize ve ortalamaya dahil edilmeyecektir.
                <br>(${ratioText})
            </div>
            <div class="space-y-3">
                <div><label class="block text-xs font-bold text-gray-500 mb-1">Soru Sayısı <span class="text-red-500">*</span></label><input type="number" id="inpDigerSoru" class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="block text-xs font-bold text-green-600 mb-1">Doğru <span class="text-red-500">*</span></label><input type="number" id="inpDigerDogru" class="w-full p-2.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"></div>
                    <div><label class="block text-xs font-bold text-red-600 mb-1">Yanlış <span class="text-red-500">*</span></label><input type="number" id="inpDigerYanlis" class="w-full p-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"></div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `<p class="text-xs text-gray-400 text-center mb-3 bg-gray-100 py-1 rounded">${ratioText}</p>`;
        const config = EXAM_CONFIG[tur];
        
        config.subjects.forEach(sub => {
            container.innerHTML += `
            <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span class="text-sm font-bold text-gray-700 w-24 truncate" title="${sub.name}">${sub.name}</span>
                <div class="flex gap-2">
                    <input type="number" placeholder="D" class="inp-deneme-d w-14 p-2 border border-green-100 bg-green-50 rounded-lg text-center text-green-700 font-bold outline-none focus:ring-1 focus:ring-green-500 text-sm" data-ders="${sub.name}">
                    <input type="number" placeholder="Y" class="inp-deneme-y w-14 p-2 border border-red-100 bg-red-50 rounded-lg text-center text-red-700 font-bold outline-none focus:ring-1 focus:ring-red-500 text-sm" data-ders="${sub.name}">
                </div>
            </div>`;
        });
    }
}

async function saveDeneme(db, uid, appId, levelKey) {
    const ad = document.getElementById('inpDenemeAd').value.trim() || "Deneme Sınavı";
    const tur = document.getElementById('inpDenemeTur').value;
    const tarih = document.getElementById('inpDenemeTarih').value;
    const ratio = EXAM_RULES[levelKey].ratio;
    const studentNameEl = document.getElementById('denemeSelectedStudentText'); // Dropdown label'dan al

    // --- DOĞRULAMA (VALIDATION) ---
    if (!tarih) { alert('Lütfen deneme tarihini seçin.'); return; }
    if (!ad) { alert('Lütfen yayın adını girin.'); return; }

    let totalNet = 0;
    let dataPayload = {
        ad, tur, tarih,
        kocId: uid,
        studentId: currentStudentId,
        studentAd: studentNameEl.innerText,
        onayDurumu: 'onaylandi', 
        eklenmeTarihi: serverTimestamp()
    };

    if (tur === 'Diger') {
        // Diğer Seçeneği İçin Sıkı Kontrol
        const soruInput = document.getElementById('inpDigerSoru').value;
        const dogruInput = document.getElementById('inpDigerDogru').value;
        const yanlisInput = document.getElementById('inpDigerYanlis').value;

        if (soruInput === '' || dogruInput === '' || yanlisInput === '') {
            alert("Lütfen Soru, Doğru ve Yanlış sayılarını eksiksiz girin.");
            return;
        }

        const soru = parseInt(soruInput) || 0;
        const dogru = parseInt(dogruInput) || 0;
        const yanlis = parseInt(yanlisInput) || 0;
        
        if (dogru + yanlis > soru) {
            alert("Doğru ve yanlışların toplamı soru sayısını geçemez!");
            return;
        }

        totalNet = dogru - (yanlis / ratio);
        
        dataPayload.soruSayisi = soru;
        dataPayload.dogru = dogru;
        dataPayload.yanlis = yanlis;
        dataPayload.toplamNet = totalNet.toFixed(2);
        dataPayload.analizHaric = true; 

    } else {
        // Standart Sınavlar İçin Kontrol (En az bir ders girilmeli mi?)
        let netler = {};
        let hasEntry = false;

        document.querySelectorAll('.inp-deneme-d').forEach(i => {
            const dVal = i.value;
            const yVal = i.parentElement.querySelector('.inp-deneme-y').value;
            
            // Boş bırakılanlar 0 kabul edilir ama en azından bir veri girildi mi diye bakarız
            if (dVal !== '' || yVal !== '') hasEntry = true;

            const d = parseInt(dVal) || 0;
            const y = parseInt(yVal) || 0;
            
            if (d > 0 || y > 0) {
                const n = d - (y / ratio);
                totalNet += n;
                netler[i.dataset.ders] = { d, y, net: n.toFixed(2) };
            }
        });
        
        // Eğer hiçbir derse giriş yapılmadıysa uyarılabilir (Opsiyonel)
        if (!hasEntry) {
            if(!confirm("Hiçbir derse doğru/yanlış girmediniz. Boş deneme olarak kaydedilsin mi?")) return;
        }

        dataPayload.toplamNet = totalNet.toFixed(2);
        dataPayload.netler = netler;
        dataPayload.analizHaric = false;
    }

    // --- KAYIT ---
    const btn = document.getElementById('btnSaveDeneme');
    btn.disabled = true;
    btn.textContent = "Kaydediliyor...";

    try {
        await addDoc(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", currentStudentId, "denemeler"), dataPayload);
        
        // Modalı Geçmişten Silerek Kapat
        window.history.back();
        
        // Başarı Mesajı (Opsiyonel - Zaten liste güncelleniyor)
        // alert("Deneme başarıyla kaydedildi."); 

    } catch (e) {
        console.error(e);
        alert("Kayıt sırasında hata oluştu.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Kaydet";
    }
}

window.deleteGlobalDoc = async (docId) => {
    if (!currentDb) return;
    if(confirm('Bu denemeyi silmek istiyor musunuz?')) {
        await deleteDoc(doc(currentDb, "artifacts", "kocluk-sistemi", "users", currentUserId, "ogrencilerim", currentStudentId, "denemeler", docId));
    }
};
