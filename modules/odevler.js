import { 
    collection, query, onSnapshot, updateDoc, deleteDoc, 
    where, orderBy, getDocs, doc, addDoc, serverTimestamp, writeBatch 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { activeListeners, formatDateTR, populateStudentSelect } from './helpers.js';

// Modül Değişkenleri
let currentStudentId = null;
let currentWeekOffset = 0; // 0: Bu hafta, -1: Geçen hafta, +1: Gelecek hafta
let allOdevs = [];
let unsubscribeOdevler = null;

export async function renderOdevlerSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Ödev Takibi";
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div class="w-full md:w-1/3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Öğrenci Seçin</label>
                <select id="filterOdevStudent" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500">
                    <option value="" disabled selected>Öğrenci Seçiniz...</option>
                </select>
            </div>
            <button id="btnAddNewOdev" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-sm flex items-center hidden">
                <i class="fa-solid fa-plus mr-2"></i> Yeni Ödev Ata
            </button>
        </div>

        <div id="calendarControls" class="hidden flex justify-between items-center mb-4 bg-white p-3 rounded-xl shadow-sm border border-gray-200">
            <button id="btnPrevWeek" class="p-2 hover:bg-gray-100 rounded-full text-gray-600"><i class="fa-solid fa-chevron-left"></i></button>
            <h3 id="weekRangeDisplay" class="font-bold text-gray-800 text-lg">...</h3>
            <button id="btnNextWeek" class="p-2 hover:bg-gray-100 rounded-full text-gray-600"><i class="fa-solid fa-chevron-right"></i></button>
        </div>

        <div id="weeklyCalendarGrid" class="hidden grid grid-cols-1 md:grid-cols-7 gap-4 mb-8">
            </div>

        <div id="odevEmptyState" class="text-center text-gray-400 py-12">
            <i class="fa-solid fa-user-graduate text-4xl mb-3 opacity-20"></i>
            <p>Ödevlerini görmek için lütfen bir öğrenci seçin.</p>
        </div>
    `;

    // Öğrenci Listesini Doldur (Tüm Öğrenciler seçeneği olmadan)
    await loadStudentSelect(db, currentUserId, appId);

    // Event Listeners
    const selectEl = document.getElementById('filterOdevStudent');
    selectEl.addEventListener('change', (e) => {
        currentStudentId = e.target.value;
        currentWeekOffset = 0; // Öğrenci değişince bu haftaya dön
        
        // UI Güncelleme
        document.getElementById('btnAddNewOdev').classList.remove('hidden');
        document.getElementById('calendarControls').classList.remove('hidden');
        document.getElementById('weeklyCalendarGrid').classList.remove('hidden');
        document.getElementById('odevEmptyState').classList.add('hidden');
        
        // Verileri Çek
        startOdevListener(db, currentUserId, currentStudentId);
    });

    document.getElementById('btnPrevWeek').addEventListener('click', () => {
        currentWeekOffset--;
        renderWeeklyCalendar(db);
    });

    document.getElementById('btnNextWeek').addEventListener('click', () => {
        currentWeekOffset++;
        renderWeeklyCalendar(db);
    });

    // Yeni Ödev Ekleme Butonu
    document.getElementById('btnAddNewOdev').addEventListener('click', () => {
        if (!currentStudentId) { alert("Lütfen öğrenci seçin."); return; }
        
        // Formu Temizle
        document.getElementById('odevTitle').value = '';
        document.getElementById('odevAciklama').value = '';
        document.getElementById('odevLink').value = '';
        document.getElementById('odevBaslangicTarihi').value = new Date().toISOString().split('T')[0];
        document.getElementById('odevBitisTarihi').value = new Date().toISOString().split('T')[0];
        
        // Öğrenci seçimi zaten yapıldı, modalda gizli inputa ata
        document.getElementById('currentStudentIdForOdev').value = currentStudentId;
        document.getElementById('odevStudentSelectContainer').classList.add('hidden'); // Modal içindeki seçimi gizle
        
        // Modal HTML'ini güncelle (Serbest seçeneğini kaldır)
        updateModalContent();
        
        document.getElementById('addOdevModal').style.display = 'block';
    });
}

// --- VERİ DİNLEME ---
function startOdevListener(db, uid, studentId) {
    if (unsubscribeOdevler) unsubscribeOdevler();

    // Sadece seçili öğrencinin ödevlerini getir
    const q = query(
        collection(db, "artifacts", "kocluk-sistemi", "users", uid, "ogrencilerim", studentId, "odevler")
    );
    
    unsubscribeOdevler = onSnapshot(q, (snapshot) => {
        allOdevs = [];
        snapshot.forEach(doc => {
            allOdevs.push({ id: doc.id, path: doc.ref.path, ...doc.data() });
        });
        renderWeeklyCalendar(db);
    }, (error) => {
        console.error("Ödevler yüklenirken hata:", error);
    });
}

// --- TAKVİM RENDER ---
function renderWeeklyCalendar(db) {
    const grid = document.getElementById('weeklyCalendarGrid');
    const rangeDisplay = document.getElementById('weekRangeDisplay');
    
    if(!grid) return;
    
    grid.innerHTML = '';

    // Haftanın tarihlerini hesapla
    const today = new Date();
    const currentDay = today.getDay(); // 0: Pazar, 1: Ptesi
    const diff = today.getDate() - currentDay + (currentDay == 0 ? -6 : 1) + (currentWeekOffset * 7); // Pazartesiye git
    
    const weekDates = [];
    const startOfWeek = new Date(today.setDate(diff));
    
    // Başlık Tarihi Güncelle
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    rangeDisplay.textContent = `${formatDateTR(startOfWeek.toISOString().split('T')[0])} - ${formatDateTR(endOfWeek.toISOString().split('T')[0])}`;

    // 7 Günü Oluştur
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);
        const dateStr = dayDate.toISOString().split('T')[0];
        const dayName = dayDate.toLocaleDateString('tr-TR', { weekday: 'long' });
        
        // O güne ait ödevleri bul
        // Kural: Ödevin 'bitisTarihi' bu gün ise o günde göster.
        // (Haftalık ödevler bitiş gününde, günlük ödevler o günde gözükür)
        const dailyOdevs = allOdevs.filter(o => o.bitisTarihi === dateStr);

        // HTML
        const col = document.createElement('div');
        col.className = 'bg-gray-50 rounded-lg border border-gray-200 flex flex-col min-h-[150px]';
        
        // Başlık (Gün)
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        col.innerHTML = `
            <div class="p-2 border-b border-gray-200 text-center ${isToday ? 'bg-purple-100 text-purple-800' : 'bg-white'} rounded-t-lg">
                <p class="text-xs text-gray-500 font-medium uppercase">${dayName}</p>
                <p class="font-bold text-gray-800">${formatDateTR(dateStr).split('.')[0]}</p>
            </div>
            <div class="p-2 space-y-2 flex-1" id="day-${dateStr}"></div>
        `;

        const listContainer = col.querySelector(`#day-${dateStr}`);
        
        dailyOdevs.forEach(o => {
            const card = document.createElement('div');
            
            // RENK VE DURUM MANTIĞI
            // 1. Süresi Geçmiş (Kırmızı): Yapılmamış (devam) VE tarih geçmiş
            // 2. Onay Bekliyor (Turuncu): Öğrenci yapmış (tamamlandi) AMA Koç onaylamamış (onayDurumu yok veya 'bekliyor')
            // 3. Tamamlandı (Yeşil): Öğrenci yapmış VE Koç onaylamış (onayDurumu == 'onaylandi')
            // 4. Devam Ediyor (Mavi): Varsayılan
            
            let colorClass = "bg-blue-50 border-blue-200 text-blue-800"; // Varsayılan: Mavi
            let statusIcon = '<i class="fa-regular fa-clock"></i>';
            let actionBtn = '';
            const todayStr = new Date().toISOString().split('T')[0];

            if (o.durum === 'tamamlandi') {
                if (o.onayDurumu === 'onaylandi') {
                    // YEŞİL: Tamamen bitti
                    colorClass = "bg-green-50 border-green-200 text-green-800";
                    statusIcon = '<i class="fa-solid fa-check-double"></i>';
                } else {
                    // TURUNCU: Öğrenci yaptı, Onay bekliyor
                    colorClass = "bg-orange-50 border-orange-200 text-orange-800";
                    statusIcon = '<i class="fa-solid fa-hourglass-half"></i>';
                    actionBtn = `<button class="btn-approve text-[10px] bg-white border border-orange-300 px-2 py-1 rounded hover:bg-orange-100 transition-colors mt-1 w-full">Onayla</button>`;
                }
            } else {
                // Yapılmamış
                if (o.bitisTarihi < todayStr) {
                    // KIRMIZI: Gecikmiş
                    colorClass = "bg-red-50 border-red-200 text-red-800";
                    statusIcon = '<i class="fa-solid fa-triangle-exclamation"></i>';
                }
            }

            card.className = `p-2 rounded border text-xs shadow-sm relative group ${colorClass}`;
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <span class="font-bold line-clamp-2">${o.title}</span>
                    <span class="ml-1">${statusIcon}</span>
                </div>
                <p class="text-[10px] opacity-75 mt-1 truncate">${o.aciklama || ''}</p>
                ${actionBtn}
                
                <button class="btn-delete absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" title="Sil">
                    &times;
                </button>
            `;

            // Buton Olayları
            const btnDel = card.querySelector('.btn-delete');
            btnDel.onclick = (e) => {
                e.stopPropagation();
                if(confirm('Bu ödevi silmek istediğinize emin misiniz?')) {
                    deleteDoc(doc(db, o.path));
                }
            };

            const btnApprove = card.querySelector('.btn-approve');
            if(btnApprove) {
                btnApprove.onclick = async (e) => {
                    e.stopPropagation();
                    await updateDoc(doc(db, o.path), { onayDurumu: 'onaylandi' });
                };
            }

            listContainer.appendChild(card);
        });

        grid.appendChild(col);
    }
}

// --- YENİ KAYDETME FONKSİYONU ---
export async function saveGlobalOdev(db, uid, appId) {
    let sid = document.getElementById('currentStudentIdForOdev').value;
    
    // Eğer modal içindeki select görünürse oradan al (ama artık gizliyoruz)
    if (!document.getElementById('odevStudentSelectContainer').classList.contains('hidden')) {
        sid = document.getElementById('odevStudentSelect').value;
    }
    
    if (!sid) { alert('Öğrenci seçimi hatası.'); return; }

    const title = document.getElementById('odevTitle').value.trim();
    const aciklama = document.getElementById('odevAciklama').value.trim();
    const link = document.getElementById('odevLink').value.trim();
    const startStr = document.getElementById('odevBaslangicTarihi').value;
    const endStr = document.getElementById('odevBitisTarihi').value;
    
    const turRadio = document.querySelector('input[name="odevTuru"]:checked');
    const turu = turRadio ? turRadio.value : 'gunluk';

    if(!title || !startStr || !endStr) { alert('Lütfen başlık ve tarihleri girin.'); return; }

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    
    if (endDate < startDate) { alert('Bitiş tarihi başlangıçtan önce olamaz.'); return; }

    const collectionRef = collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler");
    const batch = writeBatch(db);
    
    let count = 0;

    if (turu === 'gunluk') {
        // GÜNLÜK: Her gün için bir kayıt
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, {
                title, aciklama, link,
                baslangicTarihi: dateStr,
                bitisTarihi: dateStr, 
                turu: 'gunluk',
                durum: 'devam',
                onayDurumu: 'bekliyor',
                kocId: uid,
                eklenmeTarihi: serverTimestamp()
            });
            count++;
        }
    } else {
        // HAFTALIK: 7 günlük periyotlar
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
            const weekStart = new Date(d);
            const weekEnd = new Date(d);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const actualEnd = weekEnd > endDate ? endDate : weekEnd;
            
            const sStr = weekStart.toISOString().split('T')[0];
            const eStr = actualEnd.toISOString().split('T')[0];

            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, {
                title, aciklama, link,
                baslangicTarihi: sStr,
                bitisTarihi: eStr,
                turu: 'haftalik',
                durum: 'devam',
                onayDurumu: 'bekliyor',
                kocId: uid,
                eklenmeTarihi: serverTimestamp()
            });
            count++;
        }
    }

    if (count > 400) { alert("Çok fazla tarih aralığı seçtiniz. Lütfen aralığı daraltın."); return; }

    await batch.commit();
    document.getElementById('addOdevModal').style.display = 'none';
}

// --- YARDIMCILAR ---
async function loadStudentSelect(db, uid, appId) {
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim"), orderBy("ad"));
    const snap = await getDocs(q);
    const select = document.getElementById('filterOdevStudent');
    
    // İlk seçeneği koru (Öğrenci Seçiniz...)
    select.innerHTML = '<option value="" disabled selected>Öğrenci Seçiniz...</option>';
    
    snap.forEach(doc => {
        const name = `${doc.data().ad} ${doc.data().soyad}`;
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

// Modal İçeriğini Güncelle (Serbest seçeneğini kaldır)
function updateModalContent() {
    const modalBody = document.querySelector('#addOdevModal .mt-4');
    if (!modalBody) return;

    // Ödev Türü Alanını Bul ve Değiştir
    // (DOM yapısına göre sıra değişebilir, metin içeriğinden buluyoruz)
    const allLabels = modalBody.querySelectorAll('label');
    let targetLabel = null;
    allLabels.forEach(lbl => { if(lbl.textContent.includes('Ödev Türü')) targetLabel = lbl; });

    if (targetLabel) {
        const container = targetLabel.parentElement; // div kapsayıcısı
        container.innerHTML = `
            <label class="block text-sm font-medium mb-1">Ödev Türü</label>
            <div class="grid grid-cols-2 gap-2">
                <label class="border p-2 rounded flex items-center justify-center cursor-pointer hover:bg-gray-50 has-[:checked] border-gray-200">
                    <input type="radio" name="odevTuru" value="gunluk" checked class="mr-2 text-purple-600 focus:ring-purple-500">
                    <span class="font-medium text-sm">Günlük (Tekrar)</span>
                </label>
                <label class="border p-2 rounded flex items-center justify-center cursor-pointer hover:bg-gray-50 has-[:checked] border-gray-200">
                    <input type="radio" name="odevTuru" value="haftalik" class="mr-2 text-purple-600 focus:ring-purple-500">
                    <span class="font-medium text-sm">Haftalık</span>
                </label>
            </div>
            <p class="text-xs text-gray-500 mt-1 ml-1" id="odevTuruInfo">Seçilen tarih aralığındaki her gün için ayrı ödev oluşturur.</p>
        `;

        // Radyo buton değişimi için listener
        container.querySelectorAll('input[name="odevTuru"]').forEach(r => {
            r.addEventListener('change', (e) => {
                const info = document.getElementById('odevTuruInfo');
                if(e.target.value === 'gunluk') info.textContent = "Seçilen tarih aralığındaki her gün için ayrı ödev oluşturur.";
                else info.textContent = "Seçilen tarih aralığını haftalık periyotlara böler.";
            });
        });
    }
}
