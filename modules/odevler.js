/**********************************************
 *  ÖDEVLER MODÜLÜ – FULL RESPONSIVE SÜRÜM
 **********************************************/

import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR } from "./helpers.js";

let currentStudentIdGlobal = null;

/**********************************************
 *  TAKVİMİ BAŞLAT
 **********************************************/
export function startOdevListener(db, appId, currentUserId, studentId) {
    currentStudentIdGlobal = studentId;

    const calendarGrid = document.getElementById("calendarGrid");
    const calendarNav = document.getElementById("calendarNav");
    const emptyState = document.getElementById("odevEmptyState");

    if (!calendarGrid) return;

    // RESPONSIVE GRID — EN ÖNEMLİ DÜZELTME
    calendarGrid.className =
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3";

    // Loading indicator
    calendarGrid.innerHTML = `
        <div class="col-span-full flex justify-center py-10">
            <i class="fa-solid fa-spinner fa-spin text-purple-600 text-3xl"></i>
        </div>`;

    calendarNav.classList.remove("hidden");
    emptyState.classList.add("hidden");

    // Firestore dinleme
    const q = query(
        collection(
            db,
            "artifacts",
            appId,
            "users",
            currentUserId,
            "ogrencilerim",
            studentId,
            "odevler"
        ),
        orderBy("baslangicTarihi")
    );

    // Önceki listener temizle
    if (activeListeners.odevListener) activeListeners.odevListener();

    activeListeners.odevListener = onSnapshot(q, (snapshot) => {
        let data = [];
        snapshot.forEach((d) => data.push({ id: d.id, ...d.data() }));

        renderWeeklyGrid(data);
    });
}

/**********************************************
 *  HAFTALIK RESPONSIVE TAKVİM RENDER
 **********************************************/
function renderWeeklyGrid(odevList) {
    const calendarGrid = document.getElementById("calendarGrid");
    if (!calendarGrid) return;

    calendarGrid.innerHTML = "";

    const daysTR = [
        "Pazartesi",
        "Salı",
        "Çarşamba",
        "Perşembe",
        "Cuma",
        "Cumartesi",
        "Pazar"
    ];

    // Haftanın günlerini döngü ile oluştur
    daysTR.forEach((dayName, index) => {
        const dayCol = document.createElement("div");

        // RESPONSIVE DAY CARD
        dayCol.className =
            "w-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm p-3";

        dayCol.innerHTML = `
            <h3 class="text-sm font-bold text-purple-700 mb-2">${dayName}</h3>
            <div class="flex flex-col gap-2" id="day-${index}"></div>
        `;

        calendarGrid.appendChild(dayCol);
    });

    // Ödevleri günlere yerleştir
    odevList.forEach((odev) => {
        const dateStr = odev.bitisTarihi || odev.baslangicTarihi;
        const date = new Date(dateStr);
        const weekday = (date.getDay() + 6) % 7; // Pazar=6 olacak şekilde düzenleme

        const target = document.getElementById(`day-${weekday}`);
        if (!target) return;

        const odevItem = document.createElement("div");

        odevItem.className =
            "bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs leading-tight cursor-pointer hover:bg-purple-50 transition";

        odevItem.innerHTML = `
            <div class="font-semibold text-gray-700">${odev.title}</div>
            <div class="text-gray-500">${formatDateTR(dateStr)}</div>
        `;

        target.appendChild(odevItem);
    });
}

/**********************************************
 *  ÖDEV MODAL AÇ
 **********************************************/
export function openAddOdevModal(studentId) {
    currentStudentIdGlobal = studentId;

    const modal = document.getElementById("addOdevModal");
    modal.classList.remove("hidden");

    document.getElementById("odevTur").value = "GÜNLÜK";
    document.getElementById("odevBaslik").value = "";
    document.getElementById("odevAciklama").value = "";
    document.getElementById("odevLink").value = "";
    document.getElementById("odevBaslangic").value =
        new Date().toISOString().split("T")[0];
    document.getElementById("odevBitis").value = "";

    // Modal kapatma
    document.getElementById("btnCloseOdevModal").onclick = () =>
        modal.classList.add("hidden");
    document.getElementById("btnCancelOdev").onclick = () =>
        modal.classList.add("hidden");

    // Kaydet
    document.getElementById("btnSaveOdev").onclick = saveGlobalOdev;
}

/**********************************************
 *  ÖDEV KAYDET
 **********************************************/
async function saveGlobalOdev() {
    const title = document.getElementById("odevBaslik").value.trim();
    const desc = document.getElementById("odevAciklama").value.trim();
    const link = document.getElementById("odevLink").value.trim();
    const startDate = document.getElementById("odevBaslangic").value;
    const endDate = document.getElementById("odevBitis").value;
    const tur = document.getElementById("odevTur").value;

    if (!title || !startDate) {
        alert("Başlık ve başlangıç tarihi zorunludur.");
        return;
    }

    const modal = document.getElementById("addOdevModal");
    const btn = document.getElementById("btnSaveOdev");

    btn.disabled = true;
    btn.textContent = "Kaydediliyor...";

    try {
        const batch = writeBatch(window.db);

        const collectionRef = collection(
            window.db,
            "artifacts",
            window.appId,
            "users",
            window.currentUserId,
            "ogrencilerim",
            currentStudentIdGlobal,
            "odevler"
        );

        // Günlük Ödev
        if (tur === "GÜNLÜK") {
            const newRef = doc(collectionRef);
            batch.set(newRef, {
                title,
                aciklama: desc,
                link,
                tur,
                baslangicTarihi: startDate,
                bitisTarihi: endDate || startDate,
                durum: "devam",
                eklenmeTarihi: serverTimestamp()
            });
        }

        // Haftalık Ödev
        else if (tur === "HAFTALIK") {
            let current = new Date(startDate);
            const end = new Date(endDate);

            while (current <= end) {
                if (current.getDay() === 0) {
                    const ref = doc(collectionRef);
                    batch.set(ref, {
                        title: `${title}`,
                        aciklama: desc,
                        link,
                        tur,
                        baslangicTarihi: startDate,
                        bitisTarihi: current
                            .toISOString()
                            .split("T")[0],
                        durum: "devam",
                        eklenmeTarihi: serverTimestamp()
                    });
                }
                current.setDate(current.getDate() + 1);
            }
        }

        await batch.commit();

        // Yönlendirme yok – sadece modal kapanır
        modal.classList.add("hidden");

    } catch (error) {
        console.error(error);
        alert("Kayıt sırasında bir hata oluştu.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Kaydet";
    }
}
