import { 
    collection, query, updateDoc, deleteDoc, 
    where, orderBy, getDocs, doc, addDoc, serverTimestamp, writeBatch, limit, startAfter, getCountFromServer
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR, openModalWithBackHistory } from './helpers.js';

let currentDb = null;
let currentUserIdGlobal = null;
let currentAppIdGlobal = null;
let currentStudentId = null;
let lastVisibleQuestion = null; // Sayfalama için son döküman

export async function renderSoruTakibiSayfasi(db, currentUserId, appId) {
    currentDb = db;
    currentUserIdGlobal = currentUserId;
    currentAppIdGlobal = appId;
    
    // State temizliği
    currentStudentId = null;
    lastVisibleQuestion = null;

    document.getElementById("mainContentTitle").textContent = "Bireysel Soru Takibi";
    const area = document.getElementById("mainContentArea");
    
    // HTML İSKELETİ
    area.innerHTML = `
        <div class="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-30">
            
            <div class="w-full lg:w-1/3 relative flex items-center gap-3">
                <button id="backToSoruDashboardBtn" class="hidden h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-600 transition-colors" title="Özete Dön">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>

                <div class="relative w-full">
                    <button id="soruSelectTrigger" class="w-full flex justify-between items-center bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm shadow-sm group">
                        <span id="soruSelectedStudentText" class="font-medium truncate">Öğrenci Seçiniz...</span>
                        <i class="fa-solid fa-chevron-down text-gray-400 text-xs group-hover:text-purple-600"></i>
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
            </div>

            <div id="soruActionButtons" class="hidden flex gap-2 w-full sm:w-auto animate-fade-in">
                <button id="btnApproveAllSoru" class="flex-1 sm:flex-none bg-green-100 text-green-700 px-4 py-2.5 rounded-xl hover:bg-green-200 text-xs font-bold border border-green-200 flex items-center justify-center transition-colors shadow-sm whitespace-nowrap">
                    <i class="fa-solid fa-check-double mr-2"></i> Toplu Onayla
                </button>
                <button id="btnAddNewSoru" class="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 shadow-md flex items-center justify-center text-xs font-bold transition-transform active:scale-95 whitespace-nowrap">
                    <i class="fa-solid fa-plus mr-2"></i> Soru Ekle
                </button>
            </div>
        </div>

        <div id="soruDashboardView" class="animate-fade-in pb-20">
            <h3 class="text-lg font-bold text-gray-800 mb-4 px-1 border-l-4 border-purple-500 pl-3">Onay Bekleyen Sorular</h3>
            <div id="soruDashboardStatsContainer" class="space-y-3">
                <div class="text-center text-gray-400 py-12">
                    <i class="fa-solid fa-spinner fa-spin text-3xl opacity-30"></i>
                    <p class="mt-2 text-sm">Veriler analiz ediliyor...</p>
                </div>
            </div>
        </div>

        <div id="soruDetailView" class="hidden animate-fade-in w-full">
            
            <div id="soruStatsArea" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Bugün</p>
                        <h3 id="kpiSoruToday" class="text-2xl font-bold text-indigo-600">0</h3>
                    </div>
                    <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><i class="fa-solid fa-calendar-day"></i></div>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Bu Hafta</p>
                        <h3 id="kpiSoruWeek" class="text-2xl font-bold text-green-600">0</h3>
                    </div>
                    <div class="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><i class="fa-solid fa-calendar-week"></i></div>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Bekleyen</p>
                        <h3 id="kpiSoruPending" class="text-2xl font-bold text-orange-500">0</h3>
                    </div>
                    <div class="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><i class="fa-solid fa-hourglass-half"></i></div>
                </div>
            </div>

            <div id="soruTakibiListContainer" class="relative z-10 pb-20">
                <div id="soruEmptyState" class="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed hidden">
                    <i class="fa-solid fa-magnifying-glass-chart text-5xl mb-4 opacity-20"></i>
                    <p>Soru takibi yapmak için lütfen öğrenci seçin.</p>
                </div>
                
                <div id="soruListContent" class="space-y-3"></div>

                <div id="loadMoreSoruContainer" class="hidden mt-4 text-center">
                    <button id="btnLoadMoreSoru" class="bg-white border border-gray-200 text-gray-600 px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors">
                        <i class="fa-solid fa-arrow-down mr-2"></i> Daha Fazla Göster
                    </button>
                </div>
            </div>
        </div>
    `;

    // Dropdown Kurulumu
    await setupSoruSearchableDropdown(db, currentUserId, appId);
    
    // Dashboard Verisi Yükle
    loadPendingSoruDashboard(db, currentUserId, appId);

    // Event Listeners
    document.getElementById('btnAddNewSoru').addEventListener('click', openAddSoruModal);
    document.getElementById('btnApproveAllSoru').addEventListener('click', approveAllPendingQuestions);
    document.getElementById('backToSoruDashboardBtn').addEventListener('click', switchToDashboardView);
    
    // Load More Listener
    document.getElementById('btnLoadMoreSoru').addEventListener('click', () => {
        fetchQuestions(true);
    });
}

// --- GÖRÜNÜM DEĞİŞTİRME FONKSİYONLARI ---

function switchToDetailView(studentId, studentName) {
    currentStudentId = studentId;
    lastVisibleQuestion = null;

    // Görünümleri Ayarla
    document.getElementById('soruDashboardView').classList.add('hidden');
    document.getElementById('soruDetailView').classList.remove('hidden');
    
    // Üst Bar Ayarları
    document.getElementById('backToSoruDashboardBtn').classList.remove('hidden');
    document.getElementById('soruActionButtons').classList.remove('hidden');
    
    // Dropdown Güncelle
    const label = document.getElementById('soruSelectedStudentText');
    const hiddenInput = document.getElementById('filterSoruStudentId');
    if(label) {
        label.textContent = studentName;
        label.classList.add('font-bold', 'text-purple-700');
    }
    if(hiddenInput) hiddenInput.value = studentId;

    // Verileri Yükle
    document.getElementById('soruListContent').innerHTML = '';
    calculateSoruStats(currentDb, currentUserIdGlobal, currentAppIdGlobal, studentId);
    fetchQuestions(false);
}

function switchToDashboardView() {
    currentStudentId = null;
    lastVisibleQuestion = null;
    
    // Görünümleri Ayarla
    document.getElementById('soruDetailView').classList.add('hidden');
    document.getElementById('soruDashboardView').classList.remove('hidden');

    // Üst Bar Ayarları
    document.getElementById('backToSoruDashboardBtn').classList.add('hidden');
    document.getElementById('soruActionButtons').classList.add('hidden');

    // Dropdown Reset
    const label = document.getElementById('soruSelectedStudentText');
    const hiddenInput = document.getElementById('filterSoruStudentId');
    if(label) {
        label.textContent = "Öğrenci Seçiniz...";
        label.classList.remove('font-bold', 'text-purple-700');
    }
    if(hiddenInput) hiddenInput.value = "";

    // Dashboard'ı Yenile
    loadPendingSoruDashboard(currentDb, currentUserIdGlobal, currentAppIdGlobal);
}

// --- DASHBOARD VERİSİ YÜKLEME ---
async function loadPendingSoruDashboard(db, uid, appId) {
    const container = document.getElementById('soruDashboardStatsContainer');
    
    try {
        const studentsSnap = await getDocs(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim"), orderBy("ad")));
        
        let statsList = [];
        const promises = [];

        studentsSnap.forEach(studentDoc => {
            const studentData = studentDoc.data();
            const sName = `${studentData.ad} ${studentData.soyad}`;
            const sClass = studentData.sinif || 'Belirtilmemiş';
            
            // Onay bekleyenleri çek
            const p = getDocs(query(
                collection(db, "artifacts", appId, "users", uid, "ogrencilerim", studentDoc.id, "soruTakibi"),
                where("onayDurumu", "==", "bekliyor")
            )).then(snap => {
                if (!snap.empty) {
                    let totalQuestions = 0;
                    snap.forEach(d => {
                        totalQuestions += parseInt(d.data().adet) || 0;
                    });
                    
                    statsList.push({ 
                        id: studentDoc.id, 
                        name: sName, 
                        sinif: sClass, 
                        pendingCount: snap.size, // Bekleyen Kayıt Sayısı
                        totalPendingQuestions: totalQuestions // Bekleyen Toplam Soru Adedi
                    });
                }
            });
            promises.push(p);
        });

        await Promise.all(promises);

        // Sıralama (Çok bekleyen en üstte)
        statsList.sort((a, b) => b.pendingCount - a.pendingCount);

        if (statsList.length === 0) {
            container.innerHTML = `
                <div class="bg-green-50 border border-green-100 rounded-xl p-8 text-center animate-fade-in">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i class="fa-solid fa-check-double text-2xl text-green-600"></i>
                    </div>
                    <h4 class="font-bold text-gray-800">Harika!</h4>
                    <p class="text-sm text-gray-600 mt-1">Onay bekleyen soru kaydı bulunmuyor.</p>
                </div>`;
            return;
        }

        container.innerHTML = statsList.map(item => `
            <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer soru-card-click"
                 data-id="${item.id}" data-name="${item.name}">
                
                <div class="flex items-center gap-4 pointer-events-none">
                    <div class="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
                        ${item.pendingCount}
                    </div>
                    
                    <div>
                        <h4 class="font-bold text-gray-800 group-hover:text-purple-700 transition-colors">${item.name}</h4>
                        <div class="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span class="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">${item.sinif}</span>
                            <span class="text-orange-500 font-bold bg-orange-50 px-2 py-0.5 rounded">
                                <i class="fa-solid fa-hourglass-half"></i> Toplam ${item.totalPendingQuestions} Soru
                            </span>
                        </div>
                    </div>
                </div>

                <div class="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-purple-600 group-hover:text-white transition-all pointer-events-none">
                    <i class="fa-solid fa-arrow-right text-sm"></i>
                </div>
            </div>
        `).join('');

        // Event Listener Ekle
        document.querySelectorAll('.soru-card-click').forEach(item => {
            item.addEventListener('click', () => {
                switchToDetailView(item.getAttribute('data-id'), item.getAttribute('data-name'));
            });
        });

    } catch (e) {
        console.error("Dashboard yüklenirken hata:", e);
        container.innerHTML = `<div class="text-center text-red-400 py-4">Veriler yüklenemedi.</div>`;
    }
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
                switchToDetailView(s.id, s.name);
                dropdown.classList.add('hidden');
            };
            listContainer.appendChild(item);
        });
    };
    
    renderList();
    
    triggerBtn.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); if(!dropdown.classList.contains('hidden')) searchInput.focus(); };
    searchInput.oninput = (e) => { renderList(e.target.value); };
    document.addEventListener('click', (e) => { if (!triggerBtn.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add('hidden'); });
}

// --- VERİ ÇEKME (PAGINATION) ---
async function fetchQuestions(isLoadMore = false) {
    if (!currentStudentId) return;

    const listContainer = document.getElementById('soruListContent');
    const loadMoreBtn = document.getElementById('btnLoadMoreSoru');
    const loadMoreContainer = document.getElementById('loadMoreSoruContainer');

    if (isLoadMore) loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
    else listContainer.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fa-solid fa-spinner fa-spin text-2xl"></i></div>';

    try {
        let q = query(
            collection(currentDb, "artifacts", currentAppIdGlobal, "users", currentUserIdGlobal, "ogrencilerim", currentStudentId, "soruTakibi"),
            orderBy("tarih", "desc"),
            orderBy("eklenmeTarihi", "desc"),
            limit(20)
        );

        if (isLoadMore && lastVisibleQuestion) {
            q = query(
                collection(currentDb, "artifacts", currentAppIdGlobal, "users", currentUserIdGlobal, "ogrencilerim", currentStudentId, "soruTakibi"),
                orderBy("tarih", "desc"),
                orderBy("eklenmeTarihi", "desc"),
                startAfter(lastVisibleQuestion),
                limit(20)
            );
        }

        const snapshot = await getDocs(q);

        if (!isLoadMore) listContainer.innerHTML = '';

        if (snapshot.empty) {
            if (!isLoadMore) listContainer.innerHTML = '<div class="text-center py-10 text-gray-400 border border-dashed rounded-xl"><p>Kayıt bulunamadı.</p></div>';
            loadMoreContainer.classList.add('hidden');
            return;
        }

        lastVisibleQuestion = snapshot.docs[snapshot.docs.length - 1];

        // 20'den az geldiyse son sayfa demektir
        if (snapshot.docs.length < 20) loadMoreContainer.classList.add('hidden');
        else loadMoreContainer.classList.remove('hidden');

        if (isLoadMore) loadMoreBtn.innerHTML = '<i class="fa-solid fa-arrow-down mr-2"></i> Daha Fazla Göster';

        snapshot.forEach(doc => {
            renderSingleQuestionCard(doc);
        });

    } catch (error) {
        console.error("Soru yükleme hatası:", error);
        listContainer.innerHTML += '<p class="text-center text-red-400 text-xs py-2">Hata oluştu.</p>';
    }
}

// --- KART RENDER ---
function renderSingleQuestionCard(docSnapshot) {
    const container = document.getElementById('soruListContent');
    const q = { id: docSnapshot.id, ...docSnapshot.data(), path: docSnapshot.ref.path };
    
    const isApproved = q.onayDurumu === 'onaylandi';
    
    // Durum Rozeti
    const statusBadge = isApproved 
        ? `<span class="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200">Onaylı</span>`
        : `<span class="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200">Onay Bekliyor</span>`;

    // Aksiyon Butonları
    let actionButtons = '';
    if (!isApproved) {
        actionButtons = `
            <div class="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                <button class="btn-soru-delete flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg text-xs font-bold transition-colors" data-path="${q.path}">
                    <i class="fa-solid fa-trash mr-1"></i> Sil
                </button>
                <button class="btn-soru-approve flex-1 bg-green-50 text-green-600 hover:bg-green-100 py-2 rounded-lg text-xs font-bold transition-colors" data-path="${q.path}">
                    <i class="fa-solid fa-check mr-1"></i> Onayla
                </button>
            </div>
        `;
    } else {
        actionButtons = `
            <div class="flex justify-end mt-2">
                <button class="btn-soru-toggle text-gray-400 hover:text-orange-500 text-xs font-medium underline" data-path="${q.path}">Geri Al</button>
            </div>
        `;
    }

    const cardHtml = `
        <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group animate-fade-in">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h4 class="font-bold text-gray-800 text-sm">${q.ders}</h4>
                    <p class="text-xs text-gray-500">${q.konu || 'Konu belirtilmedi'}</p>
                </div>
                <div class="text-right">
                    <span class="text-xl font-bold text-indigo-600 block leading-none">${q.adet}</span>
                    <span class="text-[10px] text-gray-400">Soru</span>
                </div>
            </div>
            
            <div class="flex items-center justify-between mt-2">
                <div class="flex items-center gap-2">
                    <span class="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded font-medium">
                        <i class="fa-regular fa-calendar mr-1"></i> ${formatDateTR(q.tarih)}
                    </span>
                    ${statusBadge}
                </div>
            </div>
            
            ${actionButtons}
        </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardHtml;
    const cardElement = tempDiv.firstElementChild;
    container.appendChild(cardElement);

    const btnApprove = cardElement.querySelector('.btn-soru-approve');
    const btnDelete = cardElement.querySelector('.btn-soru-delete');
    const btnToggle = cardElement.querySelector('.btn-soru-toggle');

    if(btnApprove) btnApprove.onclick = () => updateSoruStatus(q.path, 'onaylandi', cardElement);
    if(btnDelete) btnDelete.onclick = () => deleteSoruDoc(q.path, cardElement);
    if(btnToggle) btnToggle.onclick = () => updateSoruStatus(q.path, 'bekliyor', cardElement);
}

// --- İSTATİSTİK HESAPLAMA ---
async function calculateSoruStats(db, uid, appId, sid) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Bu haftanın başı (Pazartesi)
    const day = now.getDay() || 7; 
    const thisWeekStart = new Date(now);
    thisWeekStart.setHours(0,0,0,0);
    thisWeekStart.setDate(now.getDate() - day + 1);
    const weekStartStr = thisWeekStart.toISOString().split('T')[0];

    // Bekleyen Sayısı
    const qPending = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "soruTakibi"), where("onayDurumu", "==", "bekliyor"));
    const snapPending = await getCountFromServer(qPending); 
    
    // Bu Hafta Toplamı
    const qWeek = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "soruTakibi"), where("tarih", ">=", weekStartStr));
    const snapWeek = await getDocs(qWeek);
    
    let weekTotal = 0;
    let todayTotal = 0;

    snapWeek.forEach(doc => {
        const d = doc.data();
        const adet = parseInt(d.adet) || 0;
        weekTotal += adet;
        if (d.tarih === todayStr) todayTotal += adet;
    });

    document.getElementById('kpiSoruToday').textContent = todayTotal;
    document.getElementById('kpiSoruWeek').textContent = weekTotal;
    document.getElementById('kpiSoruPending').textContent = snapPending.data().count;
}

// --- ACTIONS (YARDIMCI FONKSİYONLAR) ---
async function updateSoruStatus(path, status, cardElement) {
    try {
        await updateDoc(doc(currentDb, path), { onayDurumu: status });
        cardElement.style.opacity = '0.5';
        setTimeout(() => {
            cardElement.innerHTML = `<div class="p-4 text-center text-green-600 font-bold bg-green-50 rounded-xl">İşlem Başarılı!</div>`;
            setTimeout(() => cardElement.remove(), 500); 
        }, 300);
    } catch (e) { console.error(e); alert("İşlem başarısız."); }
}

async function deleteSoruDoc(path, cardElement) {
    if(!confirm("Silmek istediğinize emin misiniz?")) return;
    try {
        await deleteDoc(doc(currentDb, path));
        cardElement.style.transform = 'scale(0.9)';
        cardElement.style.opacity = '0';
        setTimeout(() => cardElement.remove(), 300);
    } catch (e) { console.error(e); alert("Silinemedi."); }
}

function openAddSoruModal() {
    if (!currentStudentId) return;
    const modal = document.getElementById('addSoruModal');
    if(!modal) return;

    // Inputları temizle ve hazırla
    document.getElementById('soruStudentSelectContainer')?.classList.add('hidden');
    document.getElementById('currentStudentIdForSoruTakibi').value = currentStudentId;
    document.getElementById('soruTarih').value = new Date().toISOString().split('T')[0];
    ['soruDers', 'soruKonu', 'soruAdet'].forEach(id => document.getElementById(id).value = '');

    openModalWithBackHistory('addSoruModal');

    // Kapatma Butonları (History uyumlu)
    const closeModal = () => window.history.back();
    document.getElementById('closeSoruModalButton').onclick = closeModal;
    document.getElementById('cancelSoruModalButton').onclick = closeModal;

    // Kaydet Butonu
    const saveBtn = document.getElementById('saveSoruButton');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.onclick = () => saveGlobalSoru(currentDb, currentUserIdGlobal, currentAppIdGlobal);
}

export async function saveGlobalSoru(db, currentUserId, appId) {
    const sid = document.getElementById('currentStudentIdForSoruTakibi').value || currentStudentId;
    const tarih = document.getElementById('soruTarih').value;
    const ders = document.getElementById('soruDers').value;
    const konu = document.getElementById('soruKonu').value;
    const adet = parseInt(document.getElementById('soruAdet').value);

    if (!sid || !tarih || !ders || !adet) { alert("Lütfen tarih, ders ve soru sayısını girin."); return; }

    const btn = document.getElementById('saveSoruButton');
    btn.disabled = true;
    btn.textContent = "Kaydediliyor...";

    try {
        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", sid, "soruTakibi"), {
            tarih, ders, konu, adet, 
            onayDurumu: 'onaylandi',
            eklenmeTarihi: serverTimestamp(),
            kocId: currentUserId
        });
        window.history.back();
    } catch (e) { console.error(e); alert("Hata oluştu."); } 
    finally { btn.disabled = false; btn.textContent = "Kaydet"; }
}

async function approveAllPendingQuestions() {
    if (!currentStudentId) return;
    
    const q = query(collection(currentDb, "artifacts", currentAppIdGlobal, "users", currentUserIdGlobal, "ogrencilerim", currentStudentId, "soruTakibi"), where("onayDurumu", "==", "bekliyor"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) { alert("Onay bekleyen soru yok."); return; }
    if (!confirm(`${snapshot.size} adet kaydı onaylıyor musunuz?`)) return;

    const btn = document.getElementById('btnApproveAllSoru');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const batch = writeBatch(currentDb);
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { onayDurumu: 'onaylandi' });
        });
        await batch.commit();
        
        document.getElementById('soruListContent').innerHTML = '';
        lastVisibleQuestion = null;
        fetchQuestions(false);
        calculateSoruStats(currentDb, currentUserIdGlobal, currentAppIdGlobal, currentStudentId);

    } catch (e) { console.error(e); alert("Hata oluştu."); } 
    finally { btn.disabled = false; btn.innerHTML = originalText; }
}
