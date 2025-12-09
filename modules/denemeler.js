import { 
    collection, query, onSnapshot, updateDoc, deleteDoc, getDoc,
    where, orderBy, getDocs, doc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { activeListeners, formatDateTR, populateStudentSelect, openModalWithBackHistory } from './helpers.js';

let currentStudentId = null;
let currentStudentClass = null; // Seçilen öğrencinin sınıfı
let denemeChartInstance = null;

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
    document.getElementById("mainContentTitle").textContent = "Deneme Yönetimi";
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div class="w-full md:w-1/3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Öğrenci Seçin</label>
                <select id="filterDenemeStudent" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500">
                    <option value="" disabled selected>Öğrenci Seçiniz...</option>
                </select>
            </div>
            <button id="btnAddNewDeneme" class="hidden bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-sm flex items-center">
                <i class="fa-solid fa-plus mr-2"></i> Yeni Deneme Ekle
            </button>
        </div>

        <div id="denemeStatsArea" class="hidden grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        <div id="denemeChartContainer" class="hidden bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 h-64">
            <canvas id="coachDenemeChart"></canvas>
        </div>

        <div id="denemeListContainer" class="space-y-3">
            <p class="text-center text-gray-400 py-12">Denemeleri görmek için öğrenci seçin.</p>
        </div>
    `;

    await populateStudentSelect(db, currentUserId, appId, 'filterDenemeStudent');

    // Öğrenci Seçimi Listener
    const selectEl = document.getElementById('filterDenemeStudent');
    selectEl.addEventListener('change', async (e) => {
        currentStudentId = e.target.value;
        
        // Sınıf Bilgisini Çek (Net Hesabı İçin Önemli)
        const studentDoc = await getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", currentStudentId));
        if(studentDoc.exists()) {
            currentStudentClass = studentDoc.data().sinif;
        }

        document.getElementById('btnAddNewDeneme').classList.remove('hidden');
        document.getElementById('denemeStatsArea').classList.remove('hidden');
        document.getElementById('denemeChartContainer').classList.remove('hidden');
        
        startDenemeListener(db, currentUserId, appId, currentStudentId);
    });

    // Yeni Deneme Ekleme Butonu
    document.getElementById('btnAddNewDeneme').addEventListener('click', () => {
        openDenemeModal(db, currentUserId, appId);
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
    if (list.length === 0) { container.innerHTML = '<p class="text-center text-gray-400">Kayıtlı deneme yok.</p>'; return; }

    container.innerHTML = list.map(d => {
        const isApproved = d.onayDurumu === 'onaylandi';
        // Diğer denemeler için özel etiket
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
            detailsHtml = `<div class="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 hidden animate-fade-in details-panel">
                <span class="mr-3">Soru: ${d.soruSayisi || '-'}</span>
                <span class="mr-3 text-green-600">Doğru: ${d.dogru || '-'}</span>
                <span class="text-red-500">Yanlış: ${d.yanlis || '-'}</span>
            </div>`;
        }

        return `
        <div class="bg-white p-4 rounded-xl border ${isExcluded ? 'border-orange-200 bg-orange-50' : 'border-gray-200'} shadow-sm relative group cursor-pointer" onclick="this.querySelector('.details-panel').classList.toggle('hidden')">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-gray-800 text-sm">${d.ad} <span class="text-xs font-normal text-gray-500">(${d.tur})</span></h4>
                    <p class="text-xs text-gray-500 mt-0.5"><i class="fa-regular fa-calendar mr-1"></i> ${formatDateTR(d.tarih)}</p>
                </div>
                <div class="text-right">
                    <h3 class="text-xl font-bold text-indigo-600">${d.toplamNet} <span class="text-xs font-normal text-gray-400">Net</span></h3>
                    ${!isApproved ? '<span class="text-[9px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Onay Bekliyor</span>' : ''}
                    ${isExcluded ? '<span class="text-[9px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full block mt-1">Analiz Dışı</span>' : ''}
                </div>
            </div>
            ${detailsHtml}
            <button onclick="event.stopPropagation(); deleteGlobalDoc('${d.id}')" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    }).join('');
}

// --- İSTATİSTİK VE GRAFİK ---
function calculateStatsAndChart(list) {
    // Sadece onaylı ve analize dahil olanları filtrele
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

    // Grafik
    const ctx = document.getElementById('coachDenemeChart');
    if (ctx) {
        // Tarihe göre artan sıralama (grafik için)
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
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: false } }
            }
        });
    }
}

// --- MODAL VE FORM YÖNETİMİ ---
function openDenemeModal(db, uid, appId) {
    // Modalı bul (yoksa oluştur)
    const modal = document.getElementById('modalDenemeEkle') || createDenemeModalHtml();
    
    // YENİ: Modalı "Geri Tuşu Desteğiyle" aç
    openModalWithBackHistory('modalDenemeEkle');
    
    // 1. Öğrencinin Seviyesini Belirle (Ortaokul / Lise)
    const isOrtaokul = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(currentStudentClass);
    const levelKey = isOrtaokul ? 'ORTAOKUL' : 'LISE';
    const rules = EXAM_RULES[levelKey];

    // 2. Selectbox'ı Doldur
    const typeSelect = document.getElementById('inpDenemeTur');
    typeSelect.innerHTML = rules.types.map(t => `<option value="${t}">${t}</option>`).join('');
    
    // 3. Tarihi Ayarla
    document.getElementById('inpDenemeTarih').value = new Date().toISOString().split('T')[0];
    
    // 4. Inputları Oluştur (İlk seçenek için)
    renderDenemeInputs(rules.types[0], rules.ratio);

    // 5. Change Event
    typeSelect.onchange = (e) => {
        renderDenemeInputs(e.target.value, rules.ratio);
    };

    // 6. Kaydet Butonu
    document.getElementById('btnSaveDeneme').onclick = async () => saveDeneme(db, uid, appId, levelKey);

    modal.classList.remove('hidden');
}

function renderDenemeInputs(tur, ratio) {
    const container = document.getElementById('denemeDersContainer');
    container.innerHTML = '';

    // UYARI MESAJI (ORAN)
    let ratioText = ratio === 3 ? "3 Yanlış 1 Doğruyu Götürür" : "4 Yanlış 1 Doğruyu Götürür";
    
    if (tur === 'Diger') {
        // DİĞER SEÇENEĞİ (BASİT GİRİŞ)
        container.innerHTML = `
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 text-xs text-orange-800 text-center">
                <i class="fa-solid fa-triangle-exclamation"></i> Bu deneme genel analize ve ortalamaya dahil edilmeyecektir.
                <br>(${ratioText})
            </div>
            <div class="grid grid-cols-3 gap-2">
                <div><label class="text-xs font-bold text-gray-500">Soru Sayısı</label><input type="number" id="inpDigerSoru" class="w-full p-2 border rounded"></div>
                <div><label class="text-xs font-bold text-green-600">Doğru</label><input type="number" id="inpDigerDogru" class="w-full p-2 border border-green-200 rounded"></div>
                <div><label class="text-xs font-bold text-red-600">Yanlış</label><input type="number" id="inpDigerYanlis" class="w-full p-2 border border-red-200 rounded"></div>
            </div>
        `;
    } else {
        // STANDART SINAVLAR (DERS BAZLI GİRİŞ)
        container.innerHTML = `<p class="text-xs text-gray-400 text-center mb-2">${ratioText}</p>`;
        const config = EXAM_CONFIG[tur];
        
        config.subjects.forEach(sub => {
            container.innerHTML += `
            <div class="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                <span class="text-sm font-bold text-gray-700 w-24 truncate" title="${sub.name}">${sub.name}</span>
                <div class="flex gap-1">
                    <input type="number" placeholder="D" class="inp-deneme-d w-12 p-1.5 border border-green-100 bg-green-50 rounded text-center text-green-700 font-bold outline-none focus:ring-1 focus:ring-green-500 text-sm" data-ders="${sub.name}">
                    <input type="number" placeholder="Y" class="inp-deneme-y w-12 p-1.5 border border-red-100 bg-red-50 rounded text-center text-red-700 font-bold outline-none focus:ring-1 focus:ring-red-500 text-sm" data-ders="${sub.name}">
                </div>
            </div>`;
        });
    }
}

async function saveDeneme(db, uid, appId, levelKey) {
    const ad = document.getElementById('inpDenemeAd').value || "Deneme Sınavı";
    const tur = document.getElementById('inpDenemeTur').value;
    const tarih = document.getElementById('inpDenemeTarih').value;
    const ratio = EXAM_RULES[levelKey].ratio;

    if (!tarih) { alert('Tarih seçin'); return; }

    let totalNet = 0;
    let dataPayload = {
        ad, tur, tarih,
        kocId: uid,
        studentId: currentStudentId,
        studentAd: document.getElementById('filterDenemeStudent').options[document.getElementById('filterDenemeStudent').selectedIndex].text,
        onayDurumu: 'onaylandi', // Koç girdiği için direkt onaylı
        eklenmeTarihi: serverTimestamp()
    };

    if (tur === 'Diger') {
        const soru = parseInt(document.getElementById('inpDigerSoru').value) || 0;
        const dogru = parseInt(document.getElementById('inpDigerDogru').value) || 0;
        const yanlis = parseInt(document.getElementById('inpDigerYanlis').value) || 0;
        
        totalNet = dogru - (yanlis / ratio);
        
        dataPayload.soruSayisi = soru;
        dataPayload.dogru = dogru;
        dataPayload.yanlis = yanlis;
        dataPayload.toplamNet = totalNet.toFixed(2);
        dataPayload.analizHaric = true; // ANALİZE DAHİL EDİLMEZ

    } else {
        let netler = {};
        document.querySelectorAll('.inp-deneme-d').forEach(i => {
            const d = parseInt(i.value) || 0;
            const y = parseInt(i.parentElement.querySelector('.inp-deneme-y').value) || 0;
            if (d > 0 || y > 0) {
                const n = d - (y / ratio);
                totalNet += n;
                netler[i.dataset.ders] = { d, y, net: n.toFixed(2) };
            }
        });
        
        dataPayload.toplamNet = totalNet.toFixed(2);
        dataPayload.netler = netler;
        dataPayload.analizHaric = false;
    }

    try {
        await addDoc(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", currentStudentId, "denemeler"), dataPayload);
        document.getElementById('modalDenemeEkle').classList.add('hidden');
        alert("Deneme kaydedildi.");
    } catch (e) {
        console.error(e);
        alert("Hata oluştu.");
    }
}

// Modal HTML Oluşturucu (Eğer sayfada yoksa)
function createDenemeModalHtml() {
    // index.html'de zaten var ama yedek olarak
    // Bu fonksiyon sadece modül içinde modal yapısını yönetmek içindir
    // index.html'deki modal yapısını kullanacağız.
    return document.getElementById('modalDenemeEkle');
}

// Global Silme
window.deleteGlobalDoc = async (docId) => {
    if(confirm('Bu denemeyi silmek istiyor musunuz?')) {
        await deleteDoc(doc(currentDb, "artifacts", "kocluk-sistemi", "users", currentUserId, "ogrencilerim", currentStudentId, "denemeler", docId));
    }
};
