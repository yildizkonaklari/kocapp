// === AJANDA MODÜLÜ ===
// Bu dosya, koçun "Ajandam" sayfasıyla ilgili tüm fonksiyonları yönetir.

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
    getDoc // YENİ: Tek randevu çekmek için
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    activeListeners, 
    formatDateTR, 
    populateStudentSelect
} from './helpers.js';

// --- 2. MODÜL İÇİ GLOBAL DEĞİŞKENLER ---
let currentCalDate = new Date(); // Takvimin o anda gösterdiği ay
let allMonthAppointments = []; // Çekilen tüm randevuları hafızada tut
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
    
    // YENİ HTML İSKELETİ (Takvim + Liste)
    mainContentArea.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <!-- Takvim Navigasyonu -->
            <div class="flex items-center">
                <button id="prevMonth" class="p-2 text-gray-500 hover:text-purple-600 rounded-full">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <h2 id="currentMonthYear" class="text-xl font-bold text-gray-800 mx-4 w-32 text-center">Yükleniyor...</h2>
                <button id="nextMonth" class="p-2 text-gray-500 hover:text-purple-600 rounded-full">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
                <button id="goToday" class="ml-4 px-3 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full hover:bg-gray-300">Bugün</button>
            </div>
            <!-- Yeni Randevu Butonu -->
            <button id="showAddRandevuModalButton" class="w-full md:w-auto bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Yeni Randevu Planla
            </button>
        </div>
        
        <!-- Takvim Izgarası -->
        <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div id="calendarHeader" class="grid grid-cols-7">
                <div class="calendar-header">Pzt</div>
                <div class="calendar-header">Sal</div>
                <div class="calendar-header">Çar</div>
                <div class="calendar-header">Per</div>
                <div class="calendar-header">Cum</div>
                <div class="calendar-header">Cmt</div>
                <div class="calendar-header">Paz</div>
            </div>
            <div id="calendarGrid" class="relative">
                <!-- JS burayı dolduracak -->
                <div class="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
                    <p class="text-gray-500">Takvim yükleniyor...</p>
                </div>
            </div>
        </div>

        <!-- Randevu Listesi Alanı -->
        <div class="mt-8">
            <h3 id="appointmentListTitle" class="text-lg font-semibold text-gray-700 mb-4">Yaklaşan Randevular</h3>
            <div id="appointmentListContainer" class="space-y-3 max-h-96 overflow-y-auto">
                <p class="text-center text-gray-400 py-4">Randevular yükleniyor...</p>
            </div>
        </div>
    `;

    // Event Listener'ları Kur
    document.getElementById('showAddRandevuModalButton').addEventListener('click', onShowAddRandevuModal);
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('goToday').addEventListener('click', () => changeMonth(0, true));

    // "Randevu Düzenle" modalı için listener'lar
    document.getElementById('closeEditRandevuModalButton').addEventListener('click', () => document.getElementById('editRandevuModal').style.display = 'none');
    document.getElementById('cancelEditRandevuModalButton').addEventListener('click', () => document.getElementById('editRandevuModal').style.display = 'none');
    document.getElementById('saveRandevuChangesButton').addEventListener('click', saveRandevuChanges);
    document.getElementById('btnDeleteRandevu').addEventListener('click', deleteRandevuFromModal);
    document.getElementById('btnToggleRandevuDurum').addEventListener('click', toggleRandevuStatusFromModal);
    
    // Takvimi ilk kez çiz
    loadCalendarDataAndDraw(currentCalDate);
}

/**
 * Ay değiştirme fonksiyonu
 */
function changeMonth(offset, toToday = false) {
    if (toToday) {
        currentCalDate = new Date();
    } else {
        currentCalDate.setMonth(currentCalDate.getMonth() + offset);
    }
    loadCalendarDataAndDraw(currentCalDate);
}

/**
 * "Yeni Randevu Ekle" modalını açar ve hazırlar.
 */
async function onShowAddRandevuModal() {
    await populateStudentSelect(currentDb, currentUid, currentAppId, 'randevuStudentId');
    document.getElementById('randevuBaslik').value = 'Birebir Koçluk';
    document.getElementById('randevuTarih').value = new Date().toISOString().split('T')[0];
    document.getElementById('randevuBaslangic').value = '09:00';
    document.getElementById('randevuBitis').value = '10:00';
    document.getElementById('randevuNot').value = '';
    document.getElementById('randevuModalErrorMessage').classList.add('hidden');
    document.getElementById('addRandevuModal').style.display = 'block';
}

/**
 * Gösterilen ay için Firestore'dan randevuları çeker ve takvimi çizer.
 */
function loadCalendarDataAndDraw(date) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    
    // Ayın ilk ve son gününü hesapla
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0]; // Ayın 0. günü -> bir önceki ayın son günü

    // Başlığı güncelle (Örn: Kasım 2025)
    document.getElementById('currentMonthYear').textContent = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

    // Önceki dinleyiciyi kapat
    if (activeListeners.ajandaUnsubscribe) activeListeners.ajandaUnsubscribe();

    // DÜZELTME: Veritabanı yolu
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
        
        // Veriler geldikten sonra takvimi çiz
        drawCalendarGrid(year, month, allMonthAppointments);
        
        // Başlangıçta "Yaklaşan Randevular" listesini göster
        renderAppointmentList(null, allMonthAppointments); 

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

    // 0(Paz) -> 6(Cmt) | Biz 0(Pzt) -> 6(Paz) istiyoruz
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
        
        // Bugün'ü işaretle
        if (dateStr === todayStr) {
            dayEl.classList.add('today');
        }

        // Gün numarası
        dayEl.innerHTML = `<div class="day-number">${day}</div>`;

        // O güne ait randevuları bul ve noktaları ekle
        const dayAppointments = appointments.filter(a => a.tarih === dateStr);
        if (dayAppointments.length > 0) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'appointment-dots';
            
            dayAppointments.forEach(appt => {
                const dot = document.createElement('div');
                dot.className = 'dot';
                
                // Renk kuralı
                if (appt.durum === 'tamamlandi') dot.classList.add('dot-green');
                else if (appt.tarih < todayStr) dot.classList.add('dot-red');
                else dot.classList.add('dot-blue');
                
                dotsContainer.appendChild(dot);
            });
            dayEl.appendChild(dotsContainer);
        }

        // Güne tıklama olayı
        dayEl.addEventListener('click', () => {
            // Seçili stili ayarla
            document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
            dayEl.classList.add('selected');
            
            // Listeyi o gün için filtrele
            renderAppointmentList(dateStr, dayAppointments);
        });

        grid.appendChild(dayEl);
    }
}

/**
 * Takvimin altındaki randevu listesini çizer.
 * dateStr null ise "Yaklaşanlar"ı gösterir.
 */
function renderAppointmentList(dateStr, appointments) {
    const listContainer = document.getElementById('appointmentListContainer');
    const titleEl = document.getElementById('appointmentListTitle');
    
    let listHtml = '';
    let title = '';
    let appointmentsToShow = [];

    if (dateStr) {
        // Belirli bir gün seçildi
        title = `${formatDateTR(dateStr)} Günü Randevuları`;
        appointmentsToShow = appointments; // Zaten `drawCalendarGrid` içinde filtrelendi
    } else {
        // Varsayılan: Yaklaşan Randevular
        title = 'Yaklaşan Randevular';
        const todayStr = new Date().toISOString().split('T')[0];
        appointmentsToShow = allMonthAppointments
            .filter(a => a.tarih >= todayStr && a.durum !== 'tamamlandi')
            .sort((a,b) => a.tarih.localeCompare(b.tarih) || a.baslangic.localeCompare(b.baslangic));
    }

    titleEl.textContent = title;

    if (appointmentsToShow.length === 0) {
        listContainer.innerHTML = `<p class="text-gray-500 text-center py-4">${dateStr ? 'Bu gün için randevu yok.' : 'Yaklaşan randevu yok.'}</p>`;
        return;
    }

    listHtml = appointmentsToShow.map(r => {
        const isDone = r.durum === 'tamamlandi';
        const isPast = r.tarih < new Date().toISOString().split('T')[0];
        let colorClass = 'border-blue-400 bg-blue-50'; // Gelecek
        if (isDone) colorClass = 'border-green-400 bg-green-50 opacity-70'; // Tamamlandı
        else if (isPast) colorClass = 'border-red-400 bg-red-50'; // Geçmiş

        return `
        <div data-id="${r.id}" class="appointment-item border ${colorClass} rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow">
            <div class="flex justify-between items-center">
                <span class="text-sm font-bold text-gray-800">${r.ogrenciAd}</span>
                <span class="text-xs font-mono text-gray-700 font-bold">${formatDateTR(r.tarih)} @ ${r.baslangic}</span>
            </div>
            <p class="text-sm text-gray-700 mt-1">${r.baslik}</p>
        </div>
        `;
    }).join('');
    
    listContainer.innerHTML = listHtml;

    // Listeye tıklayınca detay modalını aç
    listContainer.querySelectorAll('.appointment-item').forEach(item => {
        item.addEventListener('click', () => {
            openEditRandevuModal(item.dataset.id);
        });
    });
}

/**
 * Randevu Detay/Düzenle modalını açar ve verilerle doldurur.
 */
async function openEditRandevuModal(randevuId) {
    const modal = document.getElementById('editRandevuModal');
    const errorEl = document.getElementById('editRandevuModalErrorMessage');
    errorEl.classList.add('hidden');
    
    const studentId = allMonthAppointments.find(r => r.id === randevuId)?.studentId;
    if (!studentId) {
        alert("Randevu verisi bulunamadı.");
        return;
    }
    
    // DÜZELTME: Veritabanı yolu
    const randevuRef = doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", randevuId);
    
    try {
        const docSnap = await getDoc(randevuRef);
        if (docSnap.exists()) {
            const r = docSnap.data();
            
            // Modal'ı doldur
            document.getElementById('editRandevuId').value = randevuId;
            document.getElementById('editRandevuStudentId').value = r.studentId;
            document.getElementById('editRandevuTitle').textContent = `Detay: ${r.ogrenciAd}`;
            document.getElementById('editRandevuBaslik').value = r.baslik;
            document.getElementById('editRandevuTarih').value = r.tarih;
            document.getElementById('editRandevuBaslangic').value = r.baslangic;
            document.getElementById('editRandevuBitis').value = r.bitis;
            document.getElementById('editRandevuNot').value = r.not || '';

            // "Yapıldı" butonunu ayarla
            const statusBtn = document.getElementById('btnToggleRandevuDurum');
            if (r.durum === 'tamamlandi') {
                statusBtn.classList.replace('bg-green-100', 'bg-gray-200');
                statusBtn.classList.replace('text-green-700', 'text-gray-600');
                statusBtn.innerHTML = '<i class="fa-solid fa-rotate-left mr-2"></i> Geri Al';
                statusBtn.title = "Geri Al";
            } else {
                statusBtn.classList.replace('bg-gray-200', 'bg-green-100');
                statusBtn.classList.replace('text-gray-600', 'text-green-700');
                statusBtn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Yapıldı';
                statusBtn.title = "Yapıldı olarak işaretle";
            }

            modal.style.display = 'block';
        }
    } catch (error) {
        console.error("Randevu detayı çekilemedi:", error);
    }
}

/**
 * Modal'dan randevu durumunu (tamamlandı/geri al) değiştirir.
 */
async function toggleRandevuStatusFromModal() {
    const randevuId = document.getElementById('editRandevuId').value;
    const btn = document.getElementById('btnToggleRandevuDurum');
    
    const randevuRef = doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", randevuId);
    
    try {
        const docSnap = await getDoc(randevuRef);
        const currentStatus = docSnap.data().durum;
        const newStatus = currentStatus === 'tamamlandi' ? 'gelecek' : 'tamamlandi';
        
        await updateDoc(randevuRef, { durum: newStatus });
        
        // Modalı ve takvimi yenilemek için modalı kapat ve veriyi yeniden yükle
        document.getElementById('editRandevuModal').style.display = 'none';
        loadCalendarDataAndDraw(currentCalDate); // onSnapshot dinlediği için bu otomatik olmalı, ama garanti olsun.
    } catch (error) {
        console.error("Randevu durumu güncellenemedi:", error);
    }
}

/**
 * Modal'dan randevuyu siler.
 */
async function deleteRandevuFromModal() {
    const randevuId = document.getElementById('editRandevuId').value;
    if (confirm('Bu randevuyu kalıcı olarak silmek istediğinize emin misiniz?')) {
        try {
            const randevuRef = doc(currentDb, "artifacts", currentAppId, "users", currentUid, "ajandam", randevuId);
            await deleteDoc(randevuRef);
            document.getElementById('editRandevuModal').style.display = 'none';
            // onSnapshot dinlediği için liste ve takvim otomatik güncellenecek
        } catch (error) {
            console.error("Randevu silinemedi:", error);
        }
    }
}

/**
 * Modal'daki "Değişiklikleri Kaydet" butonunun işlevi.
 */
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
        // onSnapshot dinlediği için liste ve takvim otomatik güncellenecek
        
    } catch (error) {
        console.error("Randevu güncellenemedi:", error);
        errorEl.textContent = "Hata: " + error.message;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Değişiklikleri Kaydet";
    }
}

/**
 * "Yeni Randevu Ekle" modalından gelen veriyi Firestore'a kaydeder.
 * (Bu fonksiyon app.js'den import edilir)
 */
export async function saveNewRandevu(db, currentUserId, appId) {
    const studentId = document.getElementById('randevuStudentId').value;
    const studentName = document.getElementById('randevuStudentId').options[document.getElementById('randevuStudentId').selectedIndex].text;
    const baslik = document.getElementById('randevuBaslik').value.trim();
    const tarih = document.getElementById('randevuTarih').value;
    const baslangic = document.getElementById('randevuBaslangic').value;
    const bitis = document.getElementById('randevuBitis').value;
    const not = document.getElementById('randevuNot').value.trim();
    
    const errorEl = document.getElementById('randevuModalErrorMessage');
    const saveButton = document.getElementById('saveRandevuButton');

    if (!studentId || !baslik || !tarih || !baslangic || !bitis) {
        errorEl.textContent = "Lütfen tüm zorunlu alanları doldurun.";
        errorEl.classList.remove('hidden');
        return;
    }
    
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";
        
        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ajandam"), {
            studentId, 
            ogrenciAd: studentName, 
            baslik, 
            tarih, 
            baslangic, 
            bitis, 
            not,
            durum: 'gelecek', // YENİ: Varsayılan durum
            olusturmaTarihi: serverTimestamp()
        });
        
        document.getElementById('addRandevuModal').style.display = 'none';
        // onSnapshot dinlediği için takvim otomatik güncellenecek
        
    } catch (error) {
        console.error("Randevu kaydetme hatası:", error);
        errorEl.textContent = `Hata: ${error.message}`;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Randevuyu Kaydet";
    }
}
