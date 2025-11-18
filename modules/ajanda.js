// === AJANDA MODÜLÜ (TAM VE EKSİKSİZ) ===

// 1. GEREKLİ IMPORTLAR
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

// --- 2. MODÜL İÇİ GLOBAL DEĞİŞKENLER ---
let currentCalDate = new Date(); // Takvimin o anda gösterdiği ay
let allMonthAppointments = []; // Çekilen aydaki tüm randevular
let currentDb;
let currentUid;
let currentAppId;

// --- 3. ANA FONKSİYON: AJANDA SAYFASI ---

export function renderAjandaSayfasi(db, currentUserId, appId) {
    // Global değişkenleri ayarla
    currentDb = db;
    currentUid = currentUserId;
    currentAppId = appId;

    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Ajandam";
    
    // HTML İSKELETİ
    mainContentArea.innerHTML = `
        <div class="bg-white rounded-lg shadow border border-gray-200">
            <!-- Takvim Kontrolleri -->
            <div class="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-gray-200 gap-2">
                <div class="flex items-center">
                    <button id="prevMonth" class="p-2 text-gray-500 hover:text-purple-600 rounded-full" title="Önceki Ay">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <h2 id="currentMonthYear" class="text-xl font-bold text-gray-800 mx-4 w-40 text-center">Yükleniyor...</h2>
                    <button id="nextMonth" class="p-2 text-gray-500 hover:text-purple-600 rounded-full" title="Sonraki Ay">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                    <button id="goToday" class="ml-4 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full hover:bg-gray-200 border border-gray-200">Bugün</button>
                </div>
                <p class="text-sm text-gray-500 hidden md:block">Randevu eklemek veya görmek için bir güne tıklayın.</p>
            </div>
            
            <!-- Takvim Başlıkları -->
            <div id="calendarHeader" class="grid grid-cols-7 p-4 border-b border-gray-200 bg-gray-50">
                <div class="calendar-header">Pzt</div>
                <div class="calendar-header">Sal</div>
                <div class="calendar-header">Çar</div>
                <div class="calendar-header">Per</div>
                <div class="calendar-header">Cum</div>
                <div class="calendar-header">Cmt</div>
                <div class="calendar-header">Paz</div>
            </div>

            <!-- Takvim Izgarası -->
            <div id="calendarGrid" class="relative p-2">
                <div class="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
                    <p class="text-gray-500">Takvim yükleniyor...</p>
                </div>
            </div>
        </div>
        
        <!-- Yaklaşan Randevular Listesi Alanı -->
        <div class="mt-8">
            <h3 id="appointmentListTitle" class="text-lg font-semibold text-gray-700 mb-4">Yaklaşan Randevular</h3>
            <div id="appointmentListContainer" class="space-y-3 max-h-96 overflow-y-auto bg-white p-4 rounded-lg shadow border border-gray-200">
                <p class="text-center text-gray-400 py-4">Yükleniyor...</p>
            </div>
        </div>
    `;

    // Event Listener'ları Kur
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('goToday').addEventListener('click', () => changeMonth(0, true));

    // "Randevu Ekle" modalı butonları (app.js'deki listener'lar ana yönlendirmeyi yapsa da, buradaki özel işlevler için gerekli olabilir)
    // Not: Ana 'saveRandevuButton' dinleyicisi app.js'de.

    // "Randevu Düzenle" modalı butonları
    document.getElementById('closeEditRandevuModalButton').addEventListener('click', () => document.getElementById('editRandevuModal').style.display = 'none');
    document.getElementById('cancelEditRandevuModalButton').addEventListener('click', () => document.getElementById('editRandevuModal').style.display = 'none');
    document.getElementById('saveRandevuChangesButton').addEventListener('click', saveRandevuChanges);
    document.getElementById('btnDeleteRandevu').addEventListener('click', deleteRandevuFromModal);
    document.getElementById('btnToggleRandevuDurum').addEventListener('click', toggleRandevuStatusFromModal);
    
    // Takvimi ve listeyi ilk kez yükle
    loadCalendarDataAndDraw(currentCalDate);
    loadUpcomingList(currentDb, currentUid, currentAppId);
}

/**
 * Ay değiştirme fonksiyonu
 */
function changeMonth(offset, toToday = false) {
    if (toToday) {
        currentCalDate = new Date();
    } else {
        currentCalDate.setDate(1); // Ayın 1'ine git (taşmaları önlemek için)
        currentCalDate.setMonth(currentCalDate.getMonth() + offset);
    }
    loadCalendarDataAndDraw(currentCalDate);
}

/**
 * Gösterilen ay için Firestore'dan randevuları çeker ve takvimi çizer.
 */
function loadCalendarDataAndDraw(date) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0]; 

    document.getElementById('currentMonthYear').textContent = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

    if (activeListeners.ajandaUnsubscribe) activeListeners.ajandaUnsubscribe();

    // SORGULAMA: Sadece tarih aralığına göre (İndeks hatası almamak için order by kullanmıyoruz, JS ile sıralayacağız)
    const q = query(
        collection(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam"),
        where("tarih", ">=", startOfMonth),
        where("tarih", "<=", endOfMonth)
    );

    activeListeners.ajandaUnsubscribe = onSnapshot(q, (snapshot) => {
        allMonthAppointments = [];
        snapshot.forEach(doc => {
            allMonthAppointments.push({ id: doc.id, ...doc.data() });
        });
        
        // Client-side sıralama (Tarih ve Saate göre)
        allMonthAppointments.sort((a, b) => a.tarih.localeCompare(b.tarih) || a.baslangic.localeCompare(b.baslangic));

        drawCalendarGrid(year, month, allMonthAppointments);

    }, (error) => {
        console.error("Ajanda yüklenirken hata:", error);
        document.getElementById('calendarGrid').innerHTML = `<p class="text-red-500 text-center p-4">Takvim yüklenemedi: ${error.message}</p>`;
    });
}

/**
 * Takvim ızgarasını çizer ve randevu noktalarını yerleştirir.
 */
function drawCalendarGrid(year, month, appointments) {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = ''; // Temizle
    
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Paz, 1=Pzt
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Pzt (0) - Paz (6)
    const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

    // Önceki ayın boş günlerini oluştur
    for (let i = 0; i < offset; i++) {
        grid.innerHTML += `<div class="calendar-day other-month"></div>`;
    }

    // Bu ayın günleri
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        if (dateStr === todayStr) {
            dayEl.classList.add('today');
        }

        dayEl.innerHTML = `<div class="day-number">${day}</div>`;

        // O güne ait randevuları bul
        const dayAppointments = appointments.filter(a => a.tarih === dateStr);
        if (dayAppointments.length > 0) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'appointment-dots';
            
            dayAppointments.forEach(appt => {
                const dot = document.createElement('div');
                dot.className = 'dot';
                
                if (appt.durum === 'tamamlandi') dot.classList.add('dot-green');
                else if (appt.tarih < todayStr && appt.durum !== 'tamamlandi') dot.classList.add('dot-red');
                else dot.classList.add('dot-blue');
                
                dotsContainer.appendChild(dot);
            });
            dayEl.appendChild(dotsContainer);
        }

        // GÜNE TIKLAMA EYLEMİ
        dayEl.addEventListener('click', () => {
            onShowAddRandevuModal(dateStr, dayAppointments);
        });

        grid.appendChild(dayEl);
    }
}

/**
 * "Yeni Randevu Ekle" modalını açar, o günün tarihini ve mevcut randevularını doldurur.
 */
async function onShowAddRandevuModal(dateStr, dayAppointments = []) {
    const modal = document.getElementById('addRandevuModal');
    
    // 1. Öğrenci listesini doldur
    await populateStudentSelect(currentDb, currentUid, currentAppId, 'randevuStudentId');
    
    // 2. Formu temizle ve tarihi ayarla
    document.getElementById('randevuBaslik').value = 'Birebir Koçluk';
    document.getElementById('randevuTarih').value = dateStr;
    document.getElementById('randevuBaslangic').value = '09:00';
    document.getElementById('randevuBitis').value = '10:00';
    document.getElementById('randevuTekrar').value = "0";
    document.getElementById('randevuNot').value = '';
    document.getElementById('randevuModalErrorMessage').classList.add('hidden');
    
    // 3. O günün mevcut randevularını modalın içindeki listeye dök
    const listTitle = document.getElementById('dailyAppointmentsTitle');
    const listContainer = document.getElementById('dailyAppointmentsContainer');
    
    listTitle.textContent = `${formatDateTR(dateStr)} - Günün Planı`;
    
    if (dayAppointments.length === 0) {
        listContainer.innerHTML = `<p class="text-sm text-gray-500 text-center">Bu gün için randevu yok.</p>`;
    } else {
        // Modal içindeki listeyi çiz (Detay/Düzenle butonlarıyla)
        renderAppointmentListHTML(listContainer, dayAppointments, "", true);
    }

    // 4. Modalı göster
    modal.style.display = 'block';
}

/**
 * "Yaklaşan Randevular" listesini (takvim altı) yükler.
 * Bugünden itibaren olanları çeker.
 */
function loadUpcomingList(db, currentUserId, appId) {
    const listContainer = document.getElementById('appointmentListContainer');
    if (!listContainer) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // Bu sorgu için 'tarih ASC, baslangic ASC' indeksi gerekir.
    // Eğer yoksa konsoldaki linkten oluşturmalısınız.
    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ajandam"),
        where("tarih", ">=", todayStr),
        orderBy("tarih", "asc"),
        orderBy("baslangic", "asc"),
        // limit(20) // İsterseniz limit ekleyebilirsiniz
    );

    if (activeListeners.upcomingAjandaUnsubscribe) activeListeners.upcomingAjandaUnsubscribe();
    
    activeListeners.upcomingAjandaUnsubscribe = onSnapshot(q, (snapshot) => {
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        renderAppointmentListHTML(listContainer, appointments, "Yaklaşan randevu yok.", false);
    }, (error) => {
        console.error("Yaklaşan ajanda yüklenirken hata:", error);
        let errorMsg = "Yaklaşan randevular yüklenemedi.";
        if (error.code === 'failed-precondition') {
            errorMsg = "Veritabanı index'i gerekiyor. Lütfen F12 > Konsol'daki linke tıklayarak index'i oluşturun.";
        }
        listContainer.innerHTML = `<p class="text-red-500 text-center py-4">${errorMsg}</p>`;
    });
}

/**
 * Randevu listesini HTML olarak çizer.
 * isModalList: true ise Modal içinde (Detay butonu), false ise Ana sayfada (Basit görünüm)
 */
function renderAppointmentListHTML(container, appointments, emptyMessage, isModalList) {
    if (!container) return;
    
    if (appointments.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-center py-4">${emptyMessage}</p>`;
        return;
    }

    container.innerHTML = appointments
        .map(r => {
            const isDone = r.durum === 'tamamlandi';
            const timeText = `${r.baslangic} - ${r.ogrenciAd}`;
            
            if (isModalList) {
                // MODAL İÇİ GÖRÜNÜM
                return `
                <div class="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                    <div class="flex-1">
                        <p class="text-sm font-semibold ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}">${timeText}</p>
                        <p class="text-xs text-gray-500">${r.baslik}</p>
                    </div>
                    <button data-id="${r.id}" class="edit-randevu-item-btn flex-shrink-0 text-xs text-purple-600 font-medium hover:underline ml-2">Detay</button>
                </div>
                `;
            } else {
                // TAKVİM ALTI GÖRÜNÜM
                return `
                <div data-id="${r.id}" class="appointment-item flex items-center justify-between p-3 bg-white rounded border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <div class="flex-1">
                        <p class="text-sm font-semibold ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}">${timeText}</p>
                        <p class="text-xs text-gray-500">${r.baslik}</p>
                    </div>
                    <div class="flex flex-col items-end">
                        <span class="text-xs font-bold text-purple-600">${formatDateTR(r.tarih)}</span>
                        ${isDone ? '<span class="text-xs text-green-600 font-medium">Tamamlandı</span>' : ''}
                    </div>
                </div>
                `;
            }
        }).join('');
        
    // Event Listeners
    const items = isModalList ? container.querySelectorAll('.edit-randevu-item-btn') : container.querySelectorAll('.appointment-item');
    
    items.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const randevuId = e.currentTarget.dataset.id;
            // "Ekle" modalını kapat, "Düzenle" modalını aç
            document.getElementById('addRandevuModal').style.display = 'none';
            openEditRandevuModal(randevuId);
        });
    });
}


/**
 * "Yeni Randevu Ekle" - Firestore Kayıt (Haftalık Tekrar Dahil)
 */
export async function saveNewRandevu(db, currentUserId, appId) {
    const studentId = document.getElementById('randevuStudentId').value;
    const studentName = document.getElementById('randevuStudentId').options[document.getElementById('randevuStudentId').selectedIndex].text;
    const baslik = document.getElementById('randevuBaslik').value.trim();
    const tarihStr = document.getElementById('randevuTarih').value;
    const baslangic = document.getElementById('randevuBaslangic').value;
    const bitis = document.getElementById('randevuBitis').value;
    const not = document.getElementById('randevuNot').value.trim();
    const tekrarSayisi = parseInt(document.getElementById('randevuTekrar').value); // 0, 4, 8, 12
    
    const errorEl = document.getElementById('randevuModalErrorMessage');
    const saveButton = document.getElementById('saveRandevuButton');

    if (!studentId || !baslik || !tarihStr || !baslangic || !bitis) {
        errorEl.textContent = "Lütfen tüm zorunlu alanları doldurun.";
        errorEl.classList.remove('hidden');
        return;
    }
    
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";

        const batch = writeBatch(db);
        const collectionRef = collection(db, "artifacts", appId, "users", currentUserId, "ajandam");
        
        const baseRandevu = {
            studentId, 
            ogrenciAd: studentName, 
            baslik, 
            baslangic, 
            bitis, 
            not,
            durum: 'gelecek',
            olusturmaTarihi: serverTimestamp()
        };

        // İlk randevu
        let currentDate = new Date(tarihStr);
        batch.set(doc(collectionRef), {
            ...baseRandevu,
            tarih: currentDate.toISOString().split('T')[0]
        });

        // Haftalık tekrarlar
        if (tekrarSayisi > 0) {
            for (let i = 0; i < tekrarSayisi; i++) {
                currentDate.setDate(currentDate.getDate() + 7); // 7 gün ekle
                batch.set(doc(collectionRef), {
                    ...baseRandevu,
                    tarih: currentDate.toISOString().split('T')[0]
                });
            }
        }

        await batch.commit();
        
        document.getElementById('addRandevuModal').style.display = 'none';
        
    } catch (error) {
        console.error("Randevu kaydetme hatası:", error);
        errorEl.textContent = `Hata: ${error.message}`;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Randevuyu Kaydet";
    }
}

// --- DÜZENLEME MODALI FONKSİYONLARI ---

async function openEditRandevuModal(randevuId) {
    const modal = document.getElementById('editRandevuModal');
    const errorEl = document.getElementById('editRandevuModalErrorMessage');
    errorEl.classList.add('hidden');
    
    const randevuRef = doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", randevuId);
    
    try {
        const docSnap = await getDoc(randevuRef);
        if (docSnap.exists()) {
            const r = docSnap.data();
            
            document.getElementById('editRandevuId').value = randevuId;
            document.getElementById('editRandevuStudentId').value = r.studentId;
            document.getElementById('editRandevuTitle').textContent = `Detay: ${r.ogrenciAd}`;
            document.getElementById('editRandevuBaslik').value = r.baslik;
            document.getElementById('editRandevuTarih').value = r.tarih;
            document.getElementById('editRandevuBaslangic').value = r.baslangic;
            document.getElementById('editRandevuBitis').value = r.bitis;
            document.getElementById('editRandevuNot').value = r.not || '';

            const statusBtn = document.getElementById('btnToggleRandevuDurum');
            if (r.durum === 'tamamlandi') {
                statusBtn.classList.replace('bg-green-100', 'bg-gray-200');
                statusBtn.classList.replace('text-green-700', 'text-gray-600');
                statusBtn.innerHTML = '<i class="fa-solid fa-rotate-left mr-2"></i> Geri Al';
            } else {
                statusBtn.classList.replace('bg-gray-200', 'bg-green-100');
                statusBtn.classList.replace('text-gray-600', 'text-green-700');
                statusBtn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Yapıldı';
            }

            modal.style.display = 'block';
        }
    } catch (error) {
        console.error("Randevu detayı çekilemedi:", error);
    }
}

async function toggleRandevuStatusFromModal() {
    const randevuId = document.getElementById('editRandevuId').value;
    const randevuRef = doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", randevuId);
    
    try {
        const docSnap = await getDoc(randevuRef);
        const currentStatus = docSnap.data().durum;
        const newStatus = currentStatus === 'tamamlandi' ? 'gelecek' : 'tamamlandi';
        
        await updateDoc(randevuRef, { durum: newStatus });
        document.getElementById('editRandevuModal').style.display = 'none';
    } catch (error) {
        console.error("Randevu durumu güncellenemedi:", error);
    }
}

async function deleteRandevuFromModal() {
    const randevuId = document.getElementById('editRandevuId').value;
    if (confirm('Bu randevuyu kalıcı olarak silmek istediğinize emin misiniz?')) {
        try {
            const randevuRef = doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", randevuId);
            await deleteDoc(randevuRef);
            document.getElementById('editRandevuModal').style.display = 'none';
        } catch (error) {
            console.error("Randevu silinemedi:", error);
        }
    }
}

async function saveRandevuChanges() {
    const randevuId = document.getElementById('editRandevuId').value;
    const saveButton = document.getElementById('saveRandevuChangesButton');
    const errorEl = document.getElementById('editRandevuModalErrorMessage');

    const data = {
        baslik: document.getElementById('editRandevuBaslik').value.trim(),
        tarih: document.getElementById('editRandevuTarih').value,
        baslangic: document.getElementById('editRandevuBaslangic').value,
        bitis: document.getElementById('editRandevuBitis').value,
        not: document.getElementById('editRandevuNot').value.trim(),
    };

    if (!data.baslik || !data.tarih || !data.baslangic || !data.bitis) {
        errorEl.textContent = "Tüm alanlar doldurulmalıdır.";
        errorEl.classList.remove('hidden');
        return;
    }
    
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";
        
        const randevuRef = doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", randevuId);
        await updateDoc(randevuRef, data);
        
        document.getElementById('editRandevuModal').style.display = 'none';
        
    } catch (error) {
        console.error("Randevu güncellenemedi:", error);
        errorEl.textContent = "Hata: " + error.message;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Değişiklikleri Kaydet";
    }
}
