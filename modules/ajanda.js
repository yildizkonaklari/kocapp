// === AJANDA MODÜLÜ (DÜZELTİLMİŞ) ===

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
    populateStudentSelect
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
        <div class="bg-white rounded-lg shadow border border-gray-200 mb-6">
            <div class="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-gray-200 gap-2">
                <div class="flex items-center gap-2">
                    <button id="prevMonth" class="p-2 text-gray-500 hover:text-purple-600 rounded-full bg-gray-50 hover:bg-gray-100"><i class="fa-solid fa-chevron-left"></i></button>
                    <h2 id="currentMonthYear" class="text-lg font-bold text-gray-800 w-40 text-center">Yükleniyor...</h2>
                    <button id="nextMonth" class="p-2 text-gray-500 hover:text-purple-600 rounded-full bg-gray-50 hover:bg-gray-100"><i class="fa-solid fa-chevron-right"></i></button>
                    <button id="goToday" class="ml-2 px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full hover:bg-purple-200">Bugün</button>
                </div>
                <button id="btnOpenRandevuModal" class="w-full sm:w-auto bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center justify-center gap-2">
                    <i class="fa-solid fa-plus"></i> Yeni Seans
                </button>
            </div>
            
            <div class="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center">
                <div class="py-2 text-xs font-semibold text-gray-500">Pzt</div>
                <div class="py-2 text-xs font-semibold text-gray-500">Sal</div>
                <div class="py-2 text-xs font-semibold text-gray-500">Çar</div>
                <div class="py-2 text-xs font-semibold text-gray-500">Per</div>
                <div class="py-2 text-xs font-semibold text-gray-500">Cum</div>
                <div class="py-2 text-xs font-semibold text-gray-500 text-red-500">Cmt</div>
                <div class="py-2 text-xs font-semibold text-gray-500 text-red-500">Paz</div>
            </div>

            <div id="calendarGrid" class="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px border-b border-gray-200">
                <div class="col-span-7 bg-white p-8 text-center text-gray-400">Takvim yükleniyor...</div>
            </div>
        </div>
        
        <div>
            <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fa-regular fa-calendar-check text-purple-600"></i> Gelecek 7 Gün
            </h3>
            <div id="upcomingListContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <p class="text-gray-500 text-sm col-span-full text-center py-4">Randevular yükleniyor...</p>
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
        document.getElementById('addRandevuModal').style.display = 'block';
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
    document.getElementById('randevuModalErrorMessage').classList.add('hidden');
    document.getElementById('dailyAppointmentsList').innerHTML = ''; // Temizle
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
        document.getElementById('calendarGrid').innerHTML = `<div class="col-span-7 p-4 text-center text-red-500">Veri yüklenemedi.</div>`;
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
        grid.innerHTML += `<div class="bg-gray-50 min-h-[100px]"></div>`;
    }

    // Günler
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayAppts = appointments.filter(a => a.tarih === dateStr);
        const isToday = dateStr === todayStr;
        
        const dayEl = document.createElement('div');
        dayEl.className = `bg-white min-h-[100px] p-1 relative hover:bg-purple-50 transition-colors cursor-pointer group`;
        
        // Gün numarası
        let dayNumHtml = `<span class="text-sm font-medium text-gray-700 p-1">${day}</span>`;
        if(isToday) dayNumHtml = `<span class="text-xs font-bold text-white bg-purple-600 rounded-full w-6 h-6 flex items-center justify-center">${day}</span>`;
        
        // Noktalar
        let dotsHtml = `<div class="flex flex-wrap gap-1 mt-1 px-1">`;
        dayAppts.forEach(a => {
            const color = a.durum === 'tamamlandi' ? 'bg-green-500' : (a.tarih < todayStr ? 'bg-red-400' : 'bg-blue-500');
            dotsHtml += `<div class="h-1.5 w-1.5 rounded-full ${color}" title="${a.ogrenciAd}"></div>`;
        });
        dotsHtml += `</div>`;

        dayEl.innerHTML = `
            <div class="flex justify-between items-start">${dayNumHtml}</div>
            ${dotsHtml}
        `;

        dayEl.addEventListener('click', () => openDayModal(dateStr, dayAppts));
        grid.appendChild(dayEl);
    }
}

// --- GELECEK 7 GÜN LİSTESİ (DÜZELTİLDİ) ---
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
            listContainer.innerHTML = '<div class="col-span-full text-center py-8 bg-white rounded-lg border border-gray-200 text-gray-400">Önümüzdeki 7 gün boş.</div>';
            return;
        }

        listContainer.innerHTML = list.map(r => {
            const isDone = r.durum === 'tamamlandi';
            return `
            <div class="bg-white p-3 rounded-lg border-l-4 ${isDone ? 'border-green-500' : 'border-blue-500'} shadow-sm hover:shadow-md transition-shadow cursor-pointer randevu-card" data-id="${r.id}">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-gray-800 text-sm">${r.ogrenciAd}</span>
                    <span class="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${formatDateTR(r.tarih)}</span>
                </div>
                <div class="flex justify-between text-xs text-gray-600">
                    <span>${r.baslangic} - ${r.bitis}</span>
                    <span class="${isDone ? 'text-green-600 font-bold' : 'text-blue-600'}">${isDone ? 'Tamamlandı' : 'Gelecek'}</span>
                </div>
            </div>`;
        }).join('');

        // Tıklama olaylarını güvenli şekilde bağla
        listContainer.querySelectorAll('.randevu-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id; // ID'yi data attribute'dan al
                if (id) openEditRandevuModal(id);
            });
        });

    }, (error) => {
        console.error("Gelecek liste hatası:", error);
        listContainer.innerHTML = `<div class="col-span-full text-center text-red-500">Veri yüklenirken hata oluştu.</div>`;
    });
}

// --- MODAL İŞLEMLERİ ---

async function openDayModal(dateStr, appointments) {
    await populateStudentSelect(currentDb, currentUid, currentAppId, 'randevuStudentId');
    resetRandevuForm(dateStr);
    
    const listDiv = document.getElementById('dailyAppointmentsList');
    if (appointments.length > 0) {
        let html = `<h4 class="font-bold text-sm mb-2 text-gray-700">${formatDateTR(dateStr)} Programı</h4><div class="space-y-2 max-h-40 overflow-y-auto pr-1">`;
        appointments.sort((a,b) => a.baslangic.localeCompare(b.baslangic)).forEach(r => {
            html += `
                <div class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm border border-gray-100">
                    <div><span class="font-bold text-indigo-700">${r.baslangic}</span> - ${r.ogrenciAd}</div>
                    <button class="text-xs text-blue-600 hover:underline btn-edit-randevu" data-id="${r.id}">Düzenle</button>
                </div>`;
        });
        html += `</div>`;
        listDiv.innerHTML = html;
        
        listDiv.querySelectorAll('.btn-edit-randevu').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('addRandevuModal').style.display = 'none';
                openEditRandevuModal(e.target.dataset.id);
            });
        });
    } else {
        listDiv.innerHTML = `<p class="text-sm text-gray-400 text-center py-2">Bu tarihte randevu yok.</p>`;
    }

    document.getElementById('addRandevuModal').style.display = 'block';
}

// --- KAYDETME (HAFTALIK TEKRAR İLE) ---
export async function saveNewRandevu(db, currentUserId, appId) {
    const studentId = document.getElementById('randevuStudentId').value;
    const studentName = document.getElementById('randevuStudentId').options[document.getElementById('randevuStudentId').selectedIndex].text;
    const baslik = document.getElementById('randevuBaslik').value || "Görüşme";
    const tarihStr = document.getElementById('randevuTarih').value;
    const baslangic = document.getElementById('randevuBaslangic').value;
    const bitis = document.getElementById('randevuBitis').value;
    const not = document.getElementById('randevuNot').value;
    const tekrar = parseInt(document.getElementById('randevuTekrar').value) || 0;

    if (!studentId || !tarihStr || !baslangic) {
        document.getElementById('randevuModalErrorMessage').textContent = "Lütfen öğrenci, tarih ve saati seçin.";
        document.getElementById('randevuModalErrorMessage').classList.remove('hidden');
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
        document.getElementById('addRandevuModal').style.display = 'none';

    } catch (e) {
        console.error(e);
        alert("Hata oluştu");
    } finally {
        btn.disabled = false;
        btn.textContent = "Randevuyu Kaydet";
    }
}

// --- DÜZENLEME / SİLME / TAMAMLAMA ---
async function openEditRandevuModal(id) {
    if (!id) { console.error("Randevu ID bulunamadı"); return; }

    const ref = doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", id);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById('editRandevuId').value = id;
        document.getElementById('editRandevuBaslik').value = d.baslik;
        document.getElementById('editRandevuTarih').value = d.tarih;
        document.getElementById('editRandevuBaslangic').value = d.baslangic;
        document.getElementById('editRandevuBitis').value = d.bitis;
        document.getElementById('editRandevuNot').value = d.not || '';
        document.getElementById('editRandevuModal').style.display = 'block';
    }
}

function setupEditModalListeners() {
    document.getElementById('closeEditRandevuModalButton').onclick = () => document.getElementById('editRandevuModal').style.display = 'none';
    document.getElementById('cancelEditRandevuModalButton').onclick = () => document.getElementById('editRandevuModal').style.display = 'none';
    
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
        document.getElementById('editRandevuModal').style.display = 'none';
    };

    document.getElementById('btnDeleteRandevu').onclick = async () => {
        if(confirm('Silinsin mi?')) {
            const id = document.getElementById('editRandevuId').value;
            await deleteDoc(doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", id));
            document.getElementById('editRandevuModal').style.display = 'none';
        }
    };

    document.getElementById('btnToggleRandevuDurum').onclick = async () => {
        const id = document.getElementById('editRandevuId').value;
        await updateDoc(doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", id), { durum: 'tamamlandi' });
        document.getElementById('editRandevuModal').style.display = 'none';
    };
}
