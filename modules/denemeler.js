import { 
    collection, query, onSnapshot, updateDoc, deleteDoc, getDoc,
    where, orderBy, getDocs, doc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    activeListeners, 
    formatDateTR, 
    openModalWithBackHistory,
    EXAM_CONFIG,       // Merkezi Config'den alıyoruz
    CLASS_LEVEL_RULES  // Merkezi Kurallardan alıyoruz
} from './helpers.js';

let currentStudentId = null;
let currentStudentClass = null; 
let denemeChartInstance = null;
let currentDb = null;
let globalUserId = null; 
let globalAppId = null;
let lastVisibleDeneme = null; // Sayfalama için son dökümanı tutar
const DENEME_PAGE_SIZE = 20;  // Sayfa başı kayıt sayısı
let isDenemeLoading = false;  // Çift tıklamayı önlemek için

export async function renderDenemelerSayfasi(db, currentUserId, appId) {
    currentDb = db;
    // YENİ EKLENENLER:
    globalUserId = currentUserId;
    globalAppId = appId;

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

    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim"), orderBy("ad"));
    const snapshot = await getDocs(q);
    const students = [];
    snapshot.forEach(doc => students.push({ id: doc.id, name: `${doc.data().ad} ${doc.data().soyad}`, sinif: doc.data().sinif }));

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
                hiddenInput.value = s.id;
                currentStudentId = s.id;
                currentStudentClass = s.sinif;
                
                labelSpan.textContent = s.name;
                labelSpan.classList.add('font-bold', 'text-purple-700');
                dropdown.classList.add('hidden'); 
                
                document.getElementById('btnAddNewDeneme').classList.remove('hidden');
                document.getElementById('denemeStatsArea').classList.remove('hidden');
                document.getElementById('denemeChartContainer').classList.remove('hidden');
                
                startDenemeListener(db, uid, appId, s.id);
            };
            listContainer.appendChild(item);
        });
    };

    renderList();

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

// --- VERİ ÇEKME VE SAYFALAMA ---
async function startDenemeListener(db, uid, appId, studentId) {
    // 1. Listeyi ve State'i Sıfırla
    const container = document.getElementById('denemeListContainer');
    container.innerHTML = ''; 
    lastVisibleDeneme = null;
    
    // 2. Yükle Butonu Alanını Oluştur
    let loadMoreDiv = document.getElementById('denemeLoadMoreContainer');
    if (!loadMoreDiv) {
        loadMoreDiv = document.createElement('div');
        loadMoreDiv.id = 'denemeLoadMoreContainer';
        loadMoreDiv.className = 'text-center mt-4 hidden pb-10';
        loadMoreDiv.innerHTML = `<button id="btnLoadMoreDeneme" class="bg-white border border-gray-200 text-gray-600 px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors">Daha Fazla Göster</button>`;
        // Ana container'ın dışına değil, list container'ın hemen altına ekleyelim
        container.parentNode.appendChild(loadMoreDiv);
        
        document.getElementById('btnLoadMoreDeneme').addEventListener('click', () => {
            fetchNextDenemeBatch(db, uid, appId, studentId);
        });
    }

    // 3. İlk 20 Kaydı Getir
    await fetchNextDenemeBatch(db, uid, appId, studentId, true);
}

async function fetchNextDenemeBatch(db, uid, appId, studentId, isFirstLoad = false) {
    if (isDenemeLoading) return;
    isDenemeLoading = true;
    
    const loadMoreBtn = document.getElementById('btnLoadMoreDeneme');
    const loadMoreContainer = document.getElementById('denemeLoadMoreContainer');
    
    if (loadMoreBtn) loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';

    try {
        let q = query(
            collection(db, "artifacts", appId, "users", uid, "ogrencilerim", studentId, "denemeler"), 
            orderBy("tarih", "desc"), 
            limit(DENEME_PAGE_SIZE)
        );

        // Eğer sayfalama yapıyorsak (ilk sayfa değilse), son kayıttan sonrasını getir
        if (!isFirstLoad && lastVisibleDeneme) {
            q = query(
                collection(db, "artifacts", appId, "users", uid, "ogrencilerim", studentId, "denemeler"), 
                orderBy("tarih", "desc"), 
                startAfter(lastVisibleDeneme),
                limit(DENEME_PAGE_SIZE)
            );
        }

        const snap = await getDocs(q);
        
        if (!snap.empty) {
            lastVisibleDeneme = snap.docs[snap.docs.length - 1]; // Son dökümanı kaydet
            const list = [];
            snap.forEach(d => list.push({id: d.id, ...d.data()}));
            
            // Listeyi Ekrana Bas (Append modu)
            appendDenemeCards(list);
            
            // İstatistikleri sadece ilk yüklemede hesapla (veya her seferinde kümülatif eklenebilir ama basitlik için ilk 20 yeterli olabilir)
            // Not: İstatistiklerin tam doğru olması için tüm verinin çekilmesi gerekir. 
            // Pagination varken sadece çekilenlerin istatistiği gösterilir veya ayrı bir count sorgusu atılır.
            if(isFirstLoad) calculateStatsAndChart(list); 

            // Daha fazla butonunu yönet
            if (snap.docs.length < DENEME_PAGE_SIZE) {
                loadMoreContainer.classList.add('hidden'); // Başka kayıt yok
            } else {
                loadMoreContainer.classList.remove('hidden');
            }
        } else {
            if (isFirstLoad) {
                document.getElementById('denemeListContainer').innerHTML = '<div class="text-center py-8 bg-gray-50 rounded-xl border border-gray-100"><p class="text-gray-400">Henüz deneme kaydı yok.</p></div>';
            }
            loadMoreContainer.classList.add('hidden');
        }

    } catch (error) {
        console.error("Deneme yükleme hatası:", error);
    } finally {
        isDenemeLoading = false;
        if (loadMoreBtn) loadMoreBtn.innerText = 'Daha Fazla Göster';
    }
}

function appendDenemeCards(list) {
    const container = document.getElementById('denemeListContainer');
    
    // Uyarı mesajı (Sadece listenin başında ve bekleyen varsa göster)
    const hasPending = list.some(d => d.onayDurumu === 'bekliyor');
    // Eğer container boşsa ve bekleyen varsa uyarıyı ekle (Sadece ilk sayfada)
    if (container.children.length === 0 && hasPending) {
        container.innerHTML += `
        <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-fade-in">
            <div class="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><i class="fa-solid fa-bell"></i></div>
            <div><h4 class="font-bold text-green-800 text-sm">Onay Bekleyen Denemeler Var</h4></div>
        </div>`;
    }

    const html = list.map(d => {
        const isApproved = d.onayDurumu === 'onaylandi';
        const isExcluded = d.analizHaric === true; 
        
        // Detay İçeriği (Netler Tablosu)
        let detailsContent = '';
        if (d.netler) {
            detailsContent = '<div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">';
            for (const [ders, stats] of Object.entries(d.netler)) {
                if (parseFloat(stats.net) !== 0) {
                    detailsContent += `<div class="text-xs bg-gray-50 p-2 rounded border border-gray-100 flex justify-between"><span class="font-bold text-gray-600 truncate mr-2">${ders}</span><span class="font-bold text-gray-800">${stats.net} Net</span></div>`;
                }
            }
            detailsContent += '</div>';
        } else {
            detailsContent = `<div class="flex gap-4 text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded">
                <span>Soru: <b>${d.soruSayisi || '-'}</b></span>
                <span>Doğru: <b class="text-green-600">${d.dogru || '-'}</b></span>
                <span>Yanlış: <b class="text-red-500">${d.yanlis || '-'}</b></span>
            </div>`;
        }

        // Buton Grubu (Detayların En Altında)
        const actionButtons = `
            <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
                ${!isApproved ? `
                <button class="btn-approve-deneme bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-2 text-xs font-bold" data-id="${d.id}">
                    <i class="fa-solid fa-check"></i> Onayla
                </button>` : ''}
                
                <button class="btn-delete-deneme bg-white border border-red-100 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold" data-id="${d.id}">
                    <i class="fa-solid fa-trash"></i> Sil
                </button>
            </div>
        `;

        return `
        <div class="bg-white p-4 rounded-xl border ${!isApproved ? 'border-orange-200 ring-1 ring-orange-100' : 'border-gray-200'} shadow-sm relative group cursor-pointer transition-all hover:shadow-md mb-3" onclick="toggleDenemeDetails(this)">
            
            <div class="flex justify-between items-center">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wide">${d.tur}</span>
                        ${!isApproved ? '<span class="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold"><i class="fa-solid fa-clock mr-1"></i>Bekliyor</span>' : ''}
                        ${isApproved ? '<span class="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold"><i class="fa-solid fa-check-circle mr-1"></i>Onaylı</span>' : ''}
                    </div>
                    <h4 class="font-bold text-gray-800 text-base">${d.ad}</h4>
                    <p class="text-xs text-gray-500 mt-1 flex items-center"><i class="fa-regular fa-calendar mr-1.5 text-gray-400"></i> ${formatDateTR(d.tarih)}</p>
                </div>
                <div class="text-right">
                    <h3 class="text-2xl font-black ${isExcluded ? 'text-gray-400' : 'text-indigo-600'} tracking-tight">${d.toplamNet}</h3>
                    <p class="text-[10px] font-bold text-gray-400 uppercase">TOPLAM NET</p>
                </div>
            </div>

            <div class="details-panel hidden mt-4 pt-2 border-t border-gray-50 animate-fade-in cursor-auto" onclick="event.stopPropagation()">
                ${detailsContent}
                ${actionButtons}
            </div>
            
            <div class="absolute bottom-2 right-1/2 transform translate-x-1/2 text-gray-300 text-xs">
                <i class="fa-solid fa-chevron-down transition-transform duration-300 chevron-icon"></i>
            </div>
        </div>`;
    }).join('');

    // Mevcut içeriğin üzerine ekle (Append)
    container.insertAdjacentHTML('beforeend', html);

    // Event Listenerları Yeniden Bağla (Performans için sadece yenilere bağlamak daha iyi ama basitlik için hepsine yeniden bağlıyoruz)
    attachDenemeActionListeners();
}

// Global toggle fonksiyonu
window.toggleDenemeDetails = function(card) {
    const panel = card.querySelector('.details-panel');
    const icon = card.querySelector('.chevron-icon');
    
    // Diğer açık olanları kapat (Opsiyonel - Akordiyon etkisi için)
    // document.querySelectorAll('.details-panel').forEach(p => {
    //     if(p !== panel) p.classList.add('hidden');
    // });

    panel.classList.toggle('hidden');
    if (icon) icon.classList.toggle('rotate-180');
};

function attachDenemeActionListeners() {
    // Silme Butonları
    document.querySelectorAll('.btn-delete-deneme').forEach(btn => {
        // Çift dinleyiciyi önlemek için clone (veya removeEventListener) yapılabilir ama 
        // innerHTML += yaptığımız için DOM yenileniyor, risk az.
        btn.onclick = async (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            if(confirm("Bu denemeyi silmek istediğinize emin misiniz?")) {
                try {
                    await deleteDoc(doc(currentDb, "artifacts", globalAppId, "users", globalUserId, "ogrencilerim", currentStudentId, "denemeler", id));
                    // Silindikten sonra o kartı UI'dan kaldır
                    e.currentTarget.closest('.group').remove();
                } catch (error) {
                    console.error(error);
                    alert("Hata oluştu.");
                }
            }
        };
    });

    // Onaylama Butonları
    document.querySelectorAll('.btn-approve-deneme').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            const btnElem = e.currentTarget;
            
            if(confirm("Denemeyi onaylıyor musunuz?")) {
                btnElem.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                try {
                    await updateDoc(doc(currentDb, "artifacts", globalAppId, "users", globalUserId, "ogrencilerim", currentStudentId, "denemeler", id), {
                        onayDurumu: 'onaylandi'
                    });
                    
                    // UI Güncelleme (Yeniden yüklemeye gerek yok)
                    // Kartın headerındaki badge'i güncelle
                    const card = btnElem.closest('.group');
                    const headerBadgeContainer = card.querySelector('.flex.items-center.gap-2.mb-1');
                    // Eski bekliyor badge'ini kaldır, onaylı badge ekle
                    // Basitlik için sayfayı yenilemek yerine butonu kaldırıyoruz:
                    btnElem.remove();
                    // Badge güncellemesi complex DOM işlemi gerektirir, en kolayı o kartı gizlemek veya kullanıcıya feedback vermek
                    alert("Onaylandı!"); 
                    // İsterseniz kartın görselini manuel güncelleyebilirsiniz.
                    
                } catch (error) {
                    console.error(error);
                    alert("Hata oluştu.");
                    btnElem.innerHTML = '<i class="fa-solid fa-check"></i> Onayla';
                }
            }
        };
    });
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
    const sid = document.getElementById('filterDenemeStudentId').value;
    if (!sid) { alert("Lütfen önce öğrenci seçin."); return; }

    const modal = document.getElementById('addDenemeModal');
    if (!modal) { console.error("Modal (addDenemeModal) bulunamadı!"); return; }

    // Helper kullanarak modalı aç
    openModalWithBackHistory('addDenemeModal');

    // Kapatma Butonları
    const closeBtnX = document.getElementById('closeDenemeModalButton');
    const cancelBtn = document.getElementById('cancelDenemeModalButton');

    const handleClose = (e) => { e.preventDefault(); window.history.back(); };
    if (closeBtnX) closeBtnX.onclick = handleClose;
    if (cancelBtn) cancelBtn.onclick = handleClose;

    // Formu Hazırla
    document.getElementById('denemeAdi').value = '';
    document.getElementById('denemeTarih').value = new Date().toISOString().split('T')[0];
    
    // Öğrenci Sınıfına Göre Türleri Getir (helpers.js'den CLASS_LEVEL_RULES kullanıyoruz)
    const isOrtaokul = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(currentStudentClass);
    const levelKey = isOrtaokul ? 'ORTAOKUL' : 'LISE';
    const rules = CLASS_LEVEL_RULES[levelKey];

    const typeSelect = document.getElementById('denemeTuru');
    typeSelect.innerHTML = rules.types.map(t => `<option value="${t}">${t}</option>`).join('');
    
    renderDenemeInputs(rules.types[0], rules.defaultRatio);

    typeSelect.onchange = (e) => {
        renderDenemeInputs(e.target.value, rules.defaultRatio);
    };

    // Kaydet Butonu
    const saveBtn = document.getElementById('saveDenemeButton');
    // Önceki listener'ları temizlemek için klonlama
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    
    newSaveBtn.onclick = async () => saveDeneme(db, uid, appId, levelKey);
}

function renderDenemeInputs(tur, ratio) {
    const container = document.getElementById('denemeNetGirisAlani');
    container.innerHTML = '';

    let ratioText = ratio === 3 ? "3 Yanlış 1 Doğruyu Götürür" : "4 Yanlış 1 Doğruyu Götürür";
    
    if (tur === 'Diger') {
        container.innerHTML = `
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 text-xs text-orange-800 text-center">
                <i class="fa-solid fa-triangle-exclamation"></i> Bu deneme genel analize dahil edilmez. (${ratioText})
            </div>
            <div class="space-y-3">
                <div><label class="block text-xs font-bold text-gray-500 mb-1">Soru Sayısı</label><input type="number" id="inpDigerSoru" class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="block text-xs font-bold text-green-600 mb-1">Doğru</label><input type="number" id="inpDigerDogru" class="w-full p-2.5 border border-green-200 rounded-lg"></div>
                    <div><label class="block text-xs font-bold text-red-600 mb-1">Yanlış</label><input type="number" id="inpDigerYanlis" class="w-full p-2.5 border border-red-200 rounded-lg"></div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `<p class="text-xs text-gray-400 text-center mb-3 bg-gray-100 py-1 rounded">${ratioText}</p>`;
        // helpers.js'den gelen EXAM_CONFIG
        const config = EXAM_CONFIG[tur];
        
        if(config && config.subjects) {
            config.subjects.forEach(sub => {
                container.innerHTML += `
                <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span class="text-sm font-bold text-gray-700 w-24 truncate" title="${sub.name}">${sub.name}</span>
                    <div class="flex gap-2">
                        <input type="number" placeholder="D" class="inp-deneme-d w-14 p-2 border border-green-100 bg-green-50 rounded-lg text-center text-green-700 font-bold outline-none text-sm" data-ders="${sub.name}">
                        <input type="number" placeholder="Y" class="inp-deneme-y w-14 p-2 border border-red-100 bg-red-50 rounded-lg text-center text-red-700 font-bold outline-none text-sm" data-ders="${sub.name}">
                    </div>
                </div>`;
            });
        }
    }
}

async function saveDeneme(db, uid, appId, levelKey) {
    const ad = document.getElementById('denemeAdi').value.trim() || "Deneme Sınavı";
    const tur = document.getElementById('denemeTuru').value;
    const tarih = document.getElementById('denemeTarih').value;
    const ratio = CLASS_LEVEL_RULES[levelKey].defaultRatio;
    const studentNameEl = document.getElementById('denemeSelectedStudentText'); 

    if (!tarih) { alert('Lütfen tarih seçin.'); return; }
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
        const soru = parseInt(document.getElementById('inpDigerSoru').value) || 0;
        
        // YENİ KONTROL
        if (soru <= 0) {
            alert("Lütfen soru sayısını giriniz.");
            return;
        }
        const dogru = parseInt(document.getElementById('inpDigerDogru').value) || 0;
        const yanlis = parseInt(document.getElementById('inpDigerYanlis').value) || 0;
        
        if (dogru + yanlis > soru) { alert("Doğru + Yanlış soru sayısını geçemez!"); return; }

        totalNet = dogru - (yanlis / ratio);
        
        dataPayload.soruSayisi = soru;
        dataPayload.dogru = dogru;
        dataPayload.yanlis = yanlis;
        dataPayload.toplamNet = totalNet.toFixed(2);
        dataPayload.analizHaric = true; 

    } else {
        let netler = {};
        let hasEntry = false;

        document.querySelectorAll('.inp-deneme-d').forEach(i => {
            const dVal = i.value;
            const yVal = i.parentElement.querySelector('.inp-deneme-y').value;
            if (dVal !== '' || yVal !== '') hasEntry = true;

            const d = parseInt(dVal) || 0;
            const y = parseInt(yVal) || 0;
            
            if (d > 0 || y > 0) {
                const n = d - (y / ratio);
                totalNet += n;
                netler[i.dataset.ders] = { d, y, net: n.toFixed(2) };
            }
        });
        
        // YENİ KONTROL: Boş kayda izin yok
        if (!hasEntry) {
            alert("Lütfen en az bir ders için Doğru/Yanlış girişi yapınız.");
            return;
        }

        dataPayload.toplamNet = totalNet.toFixed(2);
        dataPayload.netler = netler;
        dataPayload.analizHaric = false;
    }

    const btn = document.getElementById('saveDenemeButton');
    btn.disabled = true;
    btn.textContent = "Kaydediliyor...";

    try {
        await addDoc(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", currentStudentId, "denemeler"), dataPayload);
        window.history.back(); // Modalı kapat
    } catch (e) {
        console.error(e);
        alert("Kayıt hatası.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Kaydet";
    }
}



