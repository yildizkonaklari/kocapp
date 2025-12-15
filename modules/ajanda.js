// === MODULES/AJANDA.JS (GÜNCELLENMİŞ & MOBİL UYUMLU) ===

import { 
    doc, 
    addDoc, 
    updateDoc, 
    collection, 
    query, 
    onSnapshot, 
    deleteDoc, 
    orderBy, 
    where, 
    serverTimestamp,
    getDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    activeListeners, 
    formatDateTR, 
    populateStudentSelect,
    openModalWithBackHistory // Geri tuşu desteği için
} from './helpers.js';

// Global Değişkenler
let currentCalDate = new Date();
let allMonthAppointments = [];
let currentDb, currentUid, currentAppId;

// --- ANA FONKSİYON: SAYFAYI ÇİZ ---
export function renderAjandaSayfasi(db, currentUserId, appId) {
    currentDb = db;
    currentUid = currentUserId;
    currentAppId = appId;

    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Ajandam";
    
    mainContentArea.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
            <div class="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-gray-200 gap-3 bg-gray-50">
                <div class="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    <button id="prevMonth" class="p-2 text-gray-500 hover:text-purple-600 hover:bg-gray-50 rounded-md transition-colors"><i class="fa-solid fa-chevron-left"></i></button>
                    <h2 id="currentMonthYear" class="text-sm font-bold text-gray-800 w-32 text-center select-none">Yükleniyor...</h2>
                    <button id="nextMonth" class="p-2 text-gray-500 hover:text-purple-600 hover:bg-gray-50 rounded-md transition-colors"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
                
                <div class="flex gap-2 w-full sm:w-auto">
                    <button id="goToday" class="px-4 py-2 text-xs font-bold text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors border border-purple-200">Bugün</button>
                    <button id="btnOpenRandevuModal" class="flex-1 sm:flex-none bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-700 flex items-center justify-center gap-2 shadow-md shadow-purple-200 active:scale-95 transition-transform">
                        <i class="fa-solid fa-plus"></i> Yeni Seans
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-7 border-b border-gray-200 bg-gray-100 text-center">
                <div class="py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Pzt</div>
                <div class="py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Sal</div>
                <div class="py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Çar</div>
                <div class="py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Per</div>
                <div class="py-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Cum</div>
                <div class="py-2 text-[10px] sm:text-xs font-bold text-red-400 uppercase">Cmt</div>
                <div class="py-2 text-[10px] sm:text-xs font-bold text-red-400 uppercase">Paz</div>
            </div>

            <div id="calendarGrid" class="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px border-b border-gray-200">
                <div class="col-span-7 bg-white p-8 text-center text-gray-400 text-sm">Takvim yükleniyor...</div>
            </div>
        </div>
        
        <div>
            <h3 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <i class="fa-regular fa-calendar-check text-purple-600"></i> Gelecek 7 Gün
            </h3>
            <div id="upcomingListContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <p class="text-gray-500 text-xs col-span-full text-center py-4">Randevular yükleniyor...</p>
            </div>
        </div>
    `;

    // Listenerlar
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('goToday').addEventListener('click', () => changeMonth(0, true));
    
    // Modal Açma Butonu
    document.getElementById('btnOpenRandevuModal').addEventListener('click', async () => {
        await populateStudentSelect(currentDb, currentUid, currentAppId, 'randevuStudentId');
        resetRandevuForm();
        
        // Helper fonksiyonu ile modal aç (Geri tuşu desteği)
        openModalWithBackHistory('addRandevuModal');
        
        // Kapatma butonu listener'ı (Sadece burada tanımlıyoruz)
        const closeBtn = document.getElementById('closeRandevuModalButton');
        const cancelBtn = document.getElementById('cancelRandevuModalButton');
        const handleClose = () => window.history.back(); // History back ile kapat
        
        if(closeBtn) closeBtn.onclick = handleClose;
        if(cancelBtn) cancelBtn.onclick = handleClose;
    });

    // Düzenleme Modalı Butonları
    setupEditModalListeners();

    // Verileri Yükle
    loadCalendarDataAndDraw(currentCalDate);
    loadUpcomingWeek(currentDb, currentUid, currentAppId);
}

function resetRandevuForm(dateStr = null) {
    document.getElementById('randevuBaslik').value = 'Birebir Koçluk';
    document.getElementById('randevuTarih').value = dateStr || new Date().toISOString().split('T')[0];
    document.getElementById('randevuBaslangic').value = '09:00';
    document.getElementById('randevuBitis').value = '10:00';
    document.getElementById('randevuTekrar').value = "0";
    document.getElementById('randevuNot').value = '';
    
    const errEl = document.getElementById('randevuModalErrorMessage');
    if(errEl) errEl.classList.add('hidden');
    
    const dailyList = document.getElementById('dailyAppointmentsList');
    if(dailyList) dailyList.innerHTML = ''; 
}

// --- TAKVİM MANTIĞI ---
function changeMonth(offset, toToday = false) {
    if (toToday) currentCalDate = new Date();
    else currentCalDate.setMonth(currentCalDate.getMonth() + offset);
    loadCalendarDataAndDraw(currentCalDate);
}

function loadCalendarDataAndDraw(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0]; 

    document.getElementById('currentMonthYear').textContent = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

    if (activeListeners.ajandaUnsubscribe) activeListeners.ajandaUnsubscribe();

    const q = query(
        collection(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam"),
        where("tarih", ">=", startOfMonth),
        where("tarih", "<=", endOfMonth)
    );

    activeListeners.ajandaUnsubscribe = onSnapshot(q, (snapshot) => {
        allMonthAppointments = [];
        snapshot.forEach(doc => allMonthAppointments.push({ id: doc.id, ...doc.data() }));
        drawCalendarGrid(year, month, allMonthAppointments);
    }, (error) => {
        console.error("Takvim hatası:", error);
        document.getElementById('calendarGrid').innerHTML = `<div class="col-span-7 p-4 text-center text-red-500 text-sm">Veri yüklenemedi.</div>`;
    });
}

function drawCalendarGrid(year, month, appointments) {
    const grid = document.getElementById('calendarGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay(); // 0=Paz
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];
    const offset = firstDay === 0 ? 6 : firstDay - 1; 

    // Boş günler
    for (let i = 0; i < offset; i++) {
        grid.innerHTML += `<div class="bg-gray-50 min-h-[80px] md:min-h-[100px]"></div>`;
    }

    // Günler
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayAppts = appointments.filter(a => a.tarih === dateStr);
        const isToday = dateStr === todayStr;
        
        const dayEl = document.createElement('div');
        // Mobil için min-height düşürüldü (80px), masaüstünde 100px
        dayEl.className = `bg-white min-h-[80px] md:min-h-[100px] p-1 relative hover:bg-purple-50 transition-colors cursor-pointer group flex flex-col items-center`;
        
        // Gün numarası
        let dayNumHtml = `<span class="text-xs sm:text-sm font-medium text-gray-700 p-1">${day}</span>`;
        if(isToday) dayNumHtml = `<span class="text-xs font-bold text-white bg-purple-600 rounded-full w-6 h-6 flex items-center justify-center shadow-sm">${day}</span>`;
        
        // Noktalar
        let dotsHtml = `<div class="flex flex-wrap gap-1 mt-1 px-1 justify-center w-full">`;
        // Mobilde sadece ilk 4 noktayı göster, gerisi sığmazsa gizli kalsın
        dayAppts.slice(0, 6).forEach(a => {
            const color = a.durum === 'tamamlandi' ? 'bg-green-500' : (a.tarih < todayStr ? 'bg-red-400' : 'bg-blue-500');
            dotsHtml += `<div class="h-1.5 w-1.5 rounded-full ${color}" title="${a.ogrenciAd}"></div>`;
        });
        if(dayAppts.length > 6) dotsHtml += `<div class="h-1.5 w-1.5 rounded-full bg-gray-400 text-[5px] flex items-center justify-center text-white">+</div>`;
        dotsHtml += `</div>`;

        dayEl.innerHTML = `
            <div class="flex justify-between items-start w-full px-1">${dayNumHtml}</div>
            ${dotsHtml}
        `;

        dayEl.addEventListener('click', () => openDayModal(dateStr, dayAppts));
        grid.appendChild(dayEl);
    }
}

// --- GELECEK 7 GÜN LİSTESİ ---
function loadUpcomingWeek(db, uid, appId) {
    const listContainer = document.getElementById('upcomingListContainer');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const q = query(
        collection(db, "artifacts", appId, "users", uid, "ajandam"),
        where("tarih", ">=", todayStr),
        where("tarih", "<=", nextWeekStr),
        orderBy("tarih", "asc"),
        orderBy("baslangic", "asc")
    );

    if (activeListeners.upcomingAjandaUnsubscribe) activeListeners.upcomingAjandaUnsubscribe();

    activeListeners.upcomingAjandaUnsubscribe = onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        
        if(list.length === 0) {
            listContainer.innerHTML = '<div class="col-span-full text-center py-8 bg-white rounded-lg border border-gray-200 text-gray-400 text-sm">Önümüzdeki 7 gün boş.</div>';
            return;
        }

        listContainer.innerHTML = list.map(r => {
            const isDone = r.durum === 'tamamlandi';
            return `
            <div class="bg-white p-3 rounded-xl border-l-4 ${isDone ? 'border-green-500' : 'border-blue-500'} shadow-sm hover:shadow-md transition-shadow cursor-pointer randevu-card group" data-id="${r.id}">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-gray-800 text-sm truncate">${r.ogrenciAd}</span>
                    <span class="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">${formatDateTR(r.tarih)}</span>
                </div>
                <div class="flex justify-between text-xs text-gray-500">
                    <span class="flex items-center gap-1"><i class="fa-regular fa-clock"></i> ${r.baslangic} - ${r.bitis}</span>
                    <span class="${isDone ? 'text-green-600 font-bold' : 'text-blue-600'} group-hover:underline">${isDone ? 'Tamamlandı' : 'Detay'}</span>
                </div>
            </div>`;
        }).join('');

        listContainer.querySelectorAll('.randevu-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                if (id) openEditRandevuModal(id);
            });
        });

    }, (error) => {
        console.error("Gelecek liste hatası:", error);
        listContainer.innerHTML = `<div class="col-span-full text-center text-red-500 text-sm">Veri yüklenirken hata oluştu.</div>`;
    });
}

// --- MODAL İŞLEMLERİ ---

async function openDayModal(dateStr, appointments) {
    await populateStudentSelect(currentDb, currentUid, currentAppId, 'randevuStudentId');
    resetRandevuForm(dateStr);
    
    // Günü gösteren başlık
    const listDiv = document.getElementById('dailyAppointmentsList');
    if (appointments.length > 0) {
        let html = `<h4 class="font-bold text-xs mb-2 text-gray-500 uppercase tracking-wider">${formatDateTR(dateStr)} Programı</h4><div class="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">`;
        appointments.sort((a,b) => a.baslangic.localeCompare(b.baslangic)).forEach(r => {
            html += `
                <div class="flex justify-between items-center p-2 bg-indigo-50 rounded-lg text-sm border border-indigo-100">
                    <div><span class="font-bold text-indigo-700">${r.baslangic}</span> - ${r.ogrenciAd}</div>
                    <button class="text-xs text-white bg-indigo-600 px-2 py-1 rounded hover:bg-indigo-700 btn-edit-randevu" data-id="${r.id}">Düzenle</button>
                </div>`;
        });
        html += `</div><hr class="my-3 border-gray-100">`;
        listDiv.innerHTML = html;
        
        listDiv.querySelectorAll('.btn-edit-randevu').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Mevcut modalı kapatmadan (veya kapatıp) düzenleme modalına geçiş
                // Burada "Geri" tuşu mantığı karışmasın diye önce history.back() yapıp sonra yeni modal açabiliriz.
                window.history.back(); 
                setTimeout(() => openEditRandevuModal(e.target.dataset.id), 100);
            });
        });
    } else {
        listDiv.innerHTML = ``;
    }

    openModalWithBackHistory('addRandevuModal');
    
    const closeBtn = document.getElementById('closeRandevuModalButton');
    const cancelBtn = document.getElementById('cancelRandevuModalButton');
    const handleClose = () => window.history.back();
    
    if(closeBtn) closeBtn.onclick = handleClose;
    if(cancelBtn) cancelBtn.onclick = handleClose;
}

// --- KAYDETME (HAFTALIK TEKRAR İLE) ---
export async function saveNewRandevu(db, currentUserId, appId) {
    const studentId = document.getElementById('randevuStudentId').value;
    const select = document.getElementById('randevuStudentId');
    const studentName = select.options[select.selectedIndex]?.text || "Öğrenci";
    const baslik = document.getElementById('randevuBaslik').value || "Görüşme";
    const tarihStr = document.getElementById('randevuTarih').value;
    const baslangic = document.getElementById('randevuBaslangic').value;
    const bitis = document.getElementById('randevuBitis').value;
    const not = document.getElementById('randevuNot').value;
    const tekrar = parseInt(document.getElementById('randevuTekrar').value) || 0;

    const errEl = document.getElementById('randevuModalErrorMessage');

    if (!studentId || !tarihStr || !baslangic) {
        if(errEl) {
            errEl.textContent = "Lütfen öğrenci, tarih ve saati seçin.";
            errEl.classList.remove('hidden');
        }
        return;
    }

    const btn = document.getElementById('saveRandevuButton');
    btn.disabled = true;
    btn.textContent = "Kaydediliyor...";

    try {
        const batch = writeBatch(db);
        const ref = collection(db, "artifacts", appId, "users", currentUserId, "ajandam");
        
        const baseData = {
            studentId, ogrenciAd: studentName, baslik, baslangic, bitis, not, durum: 'gelecek',
            olusturmaTarihi: serverTimestamp()
        };

        // Ana kayıt
        let currentDate = new Date(tarihStr);
        const newDoc = doc(ref);
        batch.set(newDoc, { ...baseData, tarih: tarihStr });

        // Tekrarlar
        for (let i = 0; i < tekrar; i++) {
            currentDate.setDate(currentDate.getDate() + 7);
            const nextDateStr = currentDate.toISOString().split('T')[0];
            const repeatDoc = doc(ref);
            batch.set(repeatDoc, { ...baseData, tarih: nextDateStr });
        }

        await batch.commit();
        window.history.back(); // Modalı kapat

    } catch (e) {
        console.error(e);
        alert("Randevu kaydedilirken hata oluştu.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Kaydet";
    }
}

// --- DÜZENLEME / SİLME / TAMAMLAMA ---
async function openEditRandevuModal(id) {
    if (!id) return;

    const ref = doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", id);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById('editRandevuId').value = id;
        document.getElementById('editRandevuStudentId').value = d.studentId; // Hidden
        document.getElementById('editRandevuBaslik').value = d.baslik;
        document.getElementById('editRandevuTarih').value = d.tarih;
        document.getElementById('editRandevuBaslangic').value = d.baslangic;
        document.getElementById('editRandevuBitis').value = d.bitis;
        document.getElementById('editRandevuNot').value = d.not || '';
        
        // Başlığı güncelle (Öğrenci adı görünsün)
        const titleEl = document.getElementById('editRandevuTitle');
        if(titleEl) titleEl.textContent = `${d.ogrenciAd} - Detay`;

        openModalWithBackHistory('editRandevuModal');
    }
}

function setupEditModalListeners() {
    const closeBtn = document.getElementById('closeEditRandevuModalButton');
    const cancelBtn = document.getElementById('cancelEditRandevuModalButton');
    const handleClose = () => window.history.back();

    if(closeBtn) closeBtn.onclick = handleClose;
    if(cancelBtn) cancelBtn.onclick = handleClose;
    
    document.getElementById('saveRandevuChangesButton').onclick = async () => {
        const id = document.getElementById('editRandevuId').value;
        const data = {
            baslik: document.getElementById('editRandevuBaslik').value,
            tarih: document.getElementById('editRandevuTarih').value,
            baslangic: document.getElementById('editRandevuBaslangic').value,
            bitis: document.getElementById('editRandevuBitis').value,
            not: document.getElementById('editRandevuNot').value
        };
        await updateDoc(doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", id), data);
        window.history.back();
    };

    document.getElementById('btnDeleteRandevu').onclick = async () => {
        if(confirm('Bu randevuyu silmek istediğinize emin misiniz?')) {
            const id = document.getElementById('editRandevuId').value;
            await deleteDoc(doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", id));
            window.history.back();
        }
    };

    document.getElementById('btnToggleRandevuDurum').onclick = async () => {
        const id = document.getElementById('editRandevuId').value;
        await updateDoc(doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", id), { durum: 'tamamlandi' });
        window.history.back();
    };
}