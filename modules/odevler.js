import {
    collection, query, onSnapshot, updateDoc, deleteDoc,
    orderBy, getDocs, doc, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR } from './helpers.js';

let currentDb = null;
let currentUserIdGlobal = null;
let currentAppIdGlobal = null;
let currentStudentId = null;
let currentWeekOffset = 0;
let allFetchedOdevs = [];

// ======================================================
// 1. SAYFA RENDER
// ======================================================
export async function renderOdevlerSayfasi(db, currentUserId, appId) {
    currentDb = db;
    currentUserIdGlobal = currentUserId;
    currentAppIdGlobal = appId;

    // Eğer weeklyCalendarContainer yoksa ilk defa gelinmiştir => state sıfırla
    if (!document.getElementById('weeklyCalendarContainer')) {
        currentStudentId = null;
        currentWeekOffset = 0;
    }

    document.getElementById("mainContentTitle").textContent = "Haftalık Ödev Programı";
    const area = document.getElementById("mainContentArea");

    area.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-30">
            
            <!-- ÖĞRENCİ SEÇİMİ -->
            <div class="w-full md:w-1/3 relative">
                <button id="odevSelectTrigger"
                        class="w-full flex justify-between items-center bg-white border border-gray-300 text-gray-700 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm">
                    <span id="odevSelectedStudentText">Öğrenci Seçiniz...</span>
                    <i class="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                </button>
                <input type="hidden" id="filterOdevStudentId">

                <div id="odevSelectDropdown"
                     class="hidden absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
                    <div class="p-2 border-b border-gray-100 bg-gray-50">
                        <div class="relative">
                            <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                            <input type="text" id="odevSelectSearch" placeholder="Ara..."
                                   class="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500">
                        </div>
                    </div>
                    <div id="odevSelectList" class="max-h-60 overflow-y-auto custom-scrollbar">
                        <div class="p-3 text-center text-gray-400 text-xs">Yükleniyor...</div>
                    </div>
                </div>
            </div>

            <!-- HAFTALIK KONTROLLER -->
            <div id="weeklyControls"
                 class="hidden flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                
                <div class="flex items-center bg-gray-100 rounded-lg p-1 w-full md:w-auto justify-between md:justify-start">
                    <button id="btnPrevWeek"
                            class="p-2 hover:bg-white rounded-md text-gray-600 transition-colors">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <span id="weekLabel"
                          class="px-4 text-xs font-bold text-gray-700 min-w-[160px] text-center">
                        ...
                    </span>
                    <button id="btnNextWeek"
                            class="p-2 hover:bg-white rounded-md text-gray-600 transition-colors">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>

                <div class="flex gap-2 w-full md:w-auto">
                    <button id="btnApproveAllOdev"
                            class="flex-1 bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 text-xs font-bold border border-green-200 flex items-center justify-center whitespace-nowrap"
                            title="Sadece öğrencinin tamamladığı ödevleri onaylar">
                        <i class="fa-solid fa-check-double mr-2"></i> Onayla
                    </button>
                    <button id="btnAddNewOdev"
                            class="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-md flex items-center justify-center text-xs font-bold whitespace-nowrap">
                        <i class="fa-solid fa-plus mr-2"></i> Ödev Ekle
                    </button>
                </div>
            </div>
        </div>

        <!-- HAFTALIK TAKVİM -->
        <div id="weeklyCalendarContainer" class="relative z-10 pb-20">
            <div id="odevEmptyState"
                 class="flex flex-col items-center justify-center py-16 sm:py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
                <i class="fa-regular fa-calendar-days text-4xl sm:text-5xl mb-4 opacity-20"></i>
                <p class="text-xs sm:text-sm text-center max-w-sm">
                    Programı görüntülemek için lütfen öğrenci seçin.
                </p>
            </div>
            
            <div id="calendarGrid"
                 class="hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 p-1">
            </div>
        </div>
    `;

    await setupOdevSearchableDropdown(db, currentUserId, appId);

    // Event Listeners
    document.getElementById('btnAddNewOdev').addEventListener('click', openAddOdevModal);
    document.getElementById('btnApproveAllOdev').addEventListener('click', approvePendingOdevs);
    document.getElementById('btnPrevWeek').addEventListener('click', () => changeWeek(-1));
    document.getElementById('btnNextWeek').addEventListener('click', () => changeWeek(1));

    // Önceden öğrenci seçili ise (başka sekmeden geri dönüldüyse) görünümü koru
    if (currentStudentId) {
        document.getElementById('odevEmptyState').classList.add('hidden');
        document.getElementById('weeklyControls').classList.remove('hidden');
        document.getElementById('calendarGrid').classList.remove('hidden');
        startOdevListener(db, currentUserId, appId, currentStudentId);
    }
}

// ======================================================
// 2. HAFTA DEĞİŞİMİ & GRID RENDER
// ======================================================
function changeWeek(offset) {
    currentWeekOffset += offset;
    renderWeeklyGrid();
}

function renderWeeklyGrid() {
    const grid = document.getElementById('calendarGrid');
    const label = document.getElementById('weekLabel');

    if (!currentStudentId || !grid || !label) return;

    const today = new Date();
    const currentDay = today.getDay(); // 0=Sunday, 1=Monday
    const base = new Date();

    const diff =
        base.getDate() -
        currentDay +
        (currentDay === 0 ? -6 : 1) + // Pazartesiye ayarla
        (currentWeekOffset * 7);

    const startOfWeek = new Date(base.setDate(diff));      // Pazartesi
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);            // Pazar

    const options = { month: 'short', day: 'numeric' };
    label.textContent = `${startOfWeek.toLocaleDateString('tr-TR', options)} - ${endOfWeek.toLocaleDateString('tr-TR', options)}`;

    grid.innerHTML = '';
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

    for (let i = 0; i < 7; i++) {
        const loopDate = new Date(startOfWeek);
        loopDate.setDate(startOfWeek.getDate() + i);

        const dateStr = loopDate.toISOString().split('T')[0];
        const isToday = dateStr === new Date().toISOString().split('T')[0];

        const dailyOdevs = allFetchedOdevs.filter(o => o.bitisTarihi === dateStr);

        const dayCol = document.createElement('div');
        dayCol.className = "flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden";

        let headerHtml = `
            <div class="p-3 border-b flex flex-col items-center gap-1 text-xs md:text-sm ${
                isToday
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-50 text-gray-600'
            }">
                <span class="font-bold uppercase tracking-wide">${days[i]}</span>
                <span class="text-[10px] md:text-xs ${
                    isToday ? 'bg-white/20' : 'bg-white'
                } px-2 py-0.5 rounded-full ${
                    isToday ? 'text-white' : 'text-gray-500 border border-gray-200'
                }">
                    ${formatDateTR(dateStr)}
                </span>
            </div>
            <div class="p-2 sm:p-3 flex-1 space-y-2 bg-gray-50/50 min-h-[110px]">
        `;

        if (dailyOdevs.length === 0) {
            headerHtml += `
                <div class="h-full flex items-center justify-center py-4">
                    <p class="text-[10px] text-gray-300 italic text-center">
                        Boş
                    </p>
                </div>`;
        } else {
            dailyOdevs.forEach(o => {
                headerHtml += createOdevCard(o);
            });
        }

        headerHtml += `</div>`;
        dayCol.innerHTML = headerHtml;
        grid.appendChild(dayCol);
    }
}

// ======================================================
// 3. ÖDEV KARTI
// ======================================================
function createOdevCard(o) {
    let statusClass = "border-l-4 border-blue-500 bg-white";
    let icon = "";
    let buttons = "";

    if (o.durum === 'tamamlandi') {
        if (o.onayDurumu === 'onaylandi') {
            statusClass = "border-l-4 border-green-500 bg-green-50 opacity-75";
            icon = `<i class="fa-solid fa-circle-check text-green-500"></i>`;
            buttons = `
                <button onclick="toggleGlobalOdevStatus('${o.path}', 'devam')"
                        class="text-[9px] text-gray-400 hover:text-red-500 underline ml-auto">
                    Geri Al
                </button>`;
        } else {
            statusClass = "border-l-4 border-orange-400 bg-orange-50 shadow-sm ring-1 ring-orange-100";
            icon = `<i class="fa-solid fa-clock text-orange-500 animate-pulse"></i>`;
            buttons = `
                <div class="flex gap-1 mt-1 w-full">
                    <button onclick="approveSingleOdev('${o.path}')"
                            class="flex-1 bg-green-500 text-white text-[10px] py-1 rounded hover:bg-green-600 transition-colors">
                        Onayla
                    </button>
                    <button onclick="toggleGlobalOdevStatus('${o.path}', 'devam')"
                            class="px-2 bg-red-100 text-red-600 text-[10px] py-1 rounded hover:bg-red-200">
                        Red
                    </button>
                </div>`;
        }
    } else {
        statusClass = "border-l-4 border-blue-500 bg-white shadow-sm";
        icon = `<i class="fa-solid fa-spinner text-blue-400"></i>`;
        buttons = `
            <button onclick="deleteGlobalDoc('${o.path}')"
                    class="text-[9px] text-gray-400 hover:text-red-500 ml-auto">
                <i class="fa-solid fa-trash"></i>
            </button>`;
    }

    return `
        <div class="p-3 rounded-xl border border-gray-100 text-left relative group shadow-sm hover:shadow-md transition-all ${statusClass}">
            <div class="flex justify-between items-start mb-1">
                <span class="text-[11px] md:text-xs font-bold text-gray-700 line-clamp-2 leading-snug">
                    ${o.title}
                </span>
                <div class="text-xs ml-1">
                    ${icon}
                </div>
            </div>
            <p class="text-[10px] md:text-[11px] text-gray-500 line-clamp-2">
                ${o.aciklama || ''}
            </p>
            <div class="mt-2 flex justify-between items-center w-full gap-2">
                ${buttons}
            </div>
        </div>`;
}

// ======================================================
// 4. VERİ ÇEKME & DİNLEYİCİ
// ======================================================
function startOdevListener(db, uid, appId, studentId) {
    document.getElementById('weeklyControls')?.classList.remove('hidden');
    document.getElementById('weeklyCalendarContainer')?.classList.remove('hidden');
    document.getElementById('odevEmptyState')?.classList.add('hidden');
    document.getElementById('calendarGrid')?.classList.remove('hidden');

    const q = query(
        collection(db, "artifacts", appId, "users", uid, "ogrencilerim", studentId, "odevler")
    );

    if (activeListeners.odevlerUnsubscribe) activeListeners.odevlerUnsubscribe();

    activeListeners.odevlerUnsubscribe = onSnapshot(
        q,
        (snap) => {
            allFetchedOdevs = [];
            snap.forEach(d => {
                allFetchedOdevs.push({ id: d.id, ...d.data(), path: d.ref.path });
            });
            renderWeeklyGrid();
        },
        (error) => {
            console.error("Hata:", error);
        }
    );
}

// ======================================================
// 5. ÖĞRENCİ SEÇİM DROPDOWN
// ======================================================
async function setupOdevSearchableDropdown(db, uid, appId) {
    const triggerBtn = document.getElementById('odevSelectTrigger');
    const dropdown = document.getElementById('odevSelectDropdown');
    const searchInput = document.getElementById('odevSelectSearch');
    const listContainer = document.getElementById('odevSelectList');
    const hiddenInput = document.getElementById('filterOdevStudentId');
    const labelSpan = document.getElementById('odevSelectedStudentText');

    const q = query(
        collection(db, "artifacts", appId, "users", uid, "ogrencilerim"),
        orderBy("ad")
    );
    const snapshot = await getDocs(q);
    const students = [];
    snapshot.forEach(docu => {
        students.push({
            id: docu.id,
            name: `${docu.data().ad} ${docu.data().soyad}`
        });
    });

    const renderList = (filter = "") => {
        listContainer.innerHTML = "";
        const filtered = students.filter(s =>
            s.name.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            listContainer.innerHTML =
                `<div class="p-3 text-center text-gray-400 text-xs">Sonuç bulunamadı.</div>`;
            return;
        }

        filtered.forEach(s => {
            const item = document.createElement('div');
            item.className =
                "px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer border-b border-gray-50 last:border-0 transition-colors";
            item.textContent = s.name;
            item.onclick = () => {
                hiddenInput.value = s.id;
                currentStudentId = s.id;
                labelSpan.textContent = s.name;
                labelSpan.classList.add('font-bold', 'text-purple-700');
                dropdown.classList.add('hidden');

                startOdevListener(db, uid, appId, s.id);
            };
            listContainer.appendChild(item);
        });
    };

    renderList();

    triggerBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
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

// ======================================================
// 6. MODAL AÇMA
// ======================================================
function openAddOdevModal() {
    if (!currentStudentId) {
        alert("Lütfen önce öğrenci seçin.");
        return;
    }

    const modal = document.getElementById('addOdevModal');
    if (!modal) {
        alert("Modal bulunamadı.");
        return;
    }

    const hiddenInput = document.getElementById('currentStudentIdForOdev');
    if (hiddenInput) hiddenInput.value = currentStudentId;

    document.getElementById('odevTur').value = 'GÜNLÜK';
    document.getElementById('odevBaslik').value = '';
    document.getElementById('odevBaslangic').value = new Date().toISOString().split('T')[0];
    document.getElementById('odevBitis').value = '';
    document.getElementById('odevAciklama').value = '';
    document.getElementById('odevLink').value = '';

    modal.classList.remove('hidden');

    const btnCloseX = document.getElementById('btnCloseOdevModal');
    const btnCancel = document.getElementById('btnCancelOdev');

    const handleClose = (e) => {
        e.preventDefault();
        modal.classList.add('hidden');
    };

    if (btnCloseX) btnCloseX.onclick = handleClose;
    if (btnCancel) btnCancel.onclick = handleClose;

    document.getElementById('btnSaveOdev').onclick = saveGlobalOdev;
}

// ======================================================
// 7. ÖDEV KAYDETME
// ======================================================
export async function saveGlobalOdev() {
    if (!currentDb || !currentUserIdGlobal || !currentStudentId) {
        alert("Bağlantı hatası veya öğrenci seçilmedi.");
        return;
    }

    const tur = document.getElementById('odevTur').value;
    const title = document.getElementById('odevBaslik').value.trim();
    const startDateStr = document.getElementById('odevBaslangic').value;
    const endDateStr = document.getElementById('odevBitis').value;
    const desc = document.getElementById('odevAciklama').value;
    const link = document.getElementById('odevLink').value;

    if (!title || !startDateStr || !endDateStr) {
        alert("Başlık ve tarihler zorunludur.");
        return;
    }
    if (endDateStr < startDateStr) {
        alert("Bitiş tarihi hatalı.");
        return;
    }

    const btn = document.getElementById('btnSaveOdev');
    btn.disabled = true;
    btn.textContent = "Kaydediliyor...";

    const batch = writeBatch(currentDb);
    const collectionRef = collection(
        currentDb,
        "artifacts", currentAppIdGlobal,
        "users", currentUserIdGlobal,
        "ogrencilerim", currentStudentId,
        "odevler"
    );

    try {
        if (tur === 'GÜNLÜK') {
            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, {
                tur: 'GÜNLÜK',
                title: title,
                aciklama: desc,
                link: link,
                baslangicTarihi: startDateStr,
                bitisTarihi: endDateStr,
                durum: 'devam',
                onayDurumu: 'bekliyor',
                kocId: currentUserIdGlobal,
                eklenmeTarihi: serverTimestamp()
            });
        } else if (tur === 'HAFTALIK') {
            let current = new Date(startDateStr);
            const end = new Date(endDateStr);
            let count = 0;

            while (current <= end) {
                if (current.getDay() === 0) { // Pazar
                    const deadlineStr = current.toISOString().split('T')[0];
                    const newDocRef = doc(collectionRef);
                    batch.set(newDocRef, {
                        tur: 'HAFTALIK',
                        title: `${title} (Hafta Sonu)`,
                        aciklama: desc,
                        link: link,
                        baslangicTarihi: startDateStr,
                        bitisTarihi: deadlineStr,
                        durum: 'devam',
                        onayDurumu: 'bekliyor',
                        kocId: currentUserIdGlobal,
                        eklenmeTarihi: serverTimestamp()
                    });
                    count++;
                }
                current.setDate(current.getDate() + 1);
            }

            if (count === 0) {
                const newDocRef = doc(collectionRef);
                batch.set(newDocRef, {
                    tur: 'HAFTALIK',
                    title: title,
                    aciklama: desc,
                    link: link,
                    baslangicTarihi: startDateStr,
                    bitisTarihi: endDateStr,
                    durum: 'devam',
                    onayDurumu: 'bekliyor',
                    kocId: currentUserIdGlobal,
                    eklenmeTarihi: serverTimestamp()
                });
            }
        }

        await batch.commit();

        const modal = document.getElementById('addOdevModal');
        if (modal) modal.classList.add('hidden');

    } catch (e) {
        console.error(e);
        alert("Kayıt hatası: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Kaydet";
    }
}

// ======================================================
// 8. TOPLU ONAY
// ======================================================
async function approvePendingOdevs() {
    if (!currentStudentId) return;

    const pendingOdevs = allFetchedOdevs.filter(
        o => o.durum === 'tamamlandi' && o.onayDurumu === 'bekliyor'
    );

    if (pendingOdevs.length === 0) {
        alert("Onay bekleyen (öğrencinin tamamladığı) ödev bulunamadı.");
        return;
    }

    if (!confirm(`${pendingOdevs.length} adet tamamlanmış ödevi onaylamak istiyor musunuz?`)) return;

    const btn = document.getElementById('btnApproveAllOdev');
    const orgText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const batch = writeBatch(currentDb);
    pendingOdevs.forEach(o => {
        const ref = doc(
            currentDb,
            "artifacts", currentAppIdGlobal,
            "users", currentUserIdGlobal,
            "ogrencilerim", currentStudentId,
            "odevler", o.id
        );
        batch.update(ref, { onayDurumu: 'onaylandi' });
    });

    try {
        await batch.commit();
    } catch (e) {
        console.error(e);
        alert("Onay hatası.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = orgText;
    }
}

// ======================================================
// 9. GLOBAL WINDOW FONKSİYONLARI
// ======================================================
window.approveSingleOdev = async (path) => {
    if (!currentDb) return;
    await updateDoc(doc(currentDb, path), { onayDurumu: 'onaylandi' });
};

window.toggleGlobalOdevStatus = async (path, status) => {
    if (!currentDb) return;
    await updateDoc(doc(currentDb, path), { durum: 'devam', onayDurumu: 'bekliyor' });
};

window.deleteGlobalDoc = async (path) => {
    if (!currentDb) return;
    if (confirm('Silmek istediğinize emin misiniz?')) {
        await deleteDoc(doc(currentDb, path));
    }
};
