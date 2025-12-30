// === MODULES/MUHASEBE.JS (MOBİL UYUMLU & GERİ TUŞU DESTEKLİ) ===

import { 
    doc, 
    collection, 
    query, 
    onSnapshot, 
    orderBy, 
    serverTimestamp,
    increment,
    limit,
    writeBatch 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// openModalWithBackHistory import edildi
import { 
    activeListeners, 
    formatCurrency, 
    populateStudentSelect,
    openModalWithBackHistory 
} from './helpers.js';

export function renderMuhasebeSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Muhasebe & Finans";
    
    mainContentArea.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-green-100 border-l-4 border-l-green-500">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Toplam Tahsilat</p>
                <h3 id="kpiTotalTahsilat" class="text-2xl font-black text-gray-800">0,00 ₺</h3>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-red-100 border-l-4 border-l-red-500">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Bekleyen Alacak</p>
                <h3 id="kpiTotalAlacak" class="text-2xl font-black text-gray-800">0,00 ₺</h3>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 border-l-4 border-l-blue-500">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Hizmet Hacmi</p>
                <h3 id="kpiTotalHizmet" class="text-2xl font-black text-gray-800">0,00 ₺</h3>
            </div>
        </div>

        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 class="text-lg font-bold text-gray-800">Öğrenci Bakiyeleri</h2>
            <div class="grid grid-cols-2 gap-2 w-full sm:w-auto">
                <button id="showAddBorcButton" type="button" class="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-blue-700 flex items-center justify-center shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                    <i class="fa-solid fa-plus mr-2"></i> Hizmet Ekle
                </button>
                <button id="showAddTahsilatButton" type="button" class="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-green-700 flex items-center justify-center shadow-lg shadow-green-200 active:scale-95 transition-transform">
                    <i class="fa-solid fa-wallet mr-2"></i> Tahsilat Ekle
                </button>
            </div>
        </div>

        <div id="muhasebeListContainer" class="space-y-3 pb-4">
            <p class="text-gray-500 text-center py-8">Veriler yükleniyor...</p>
        </div>

        <div class="mt-6 mb-4">
            <h3 class="text-lg font-bold text-gray-800">Son İşlemler</h3>
        </div>
        <div id="transactionLogContainer" class="space-y-2 pb-24">
            <p class="text-gray-500 text-center py-4">Geçmiş yükleniyor...</p>
        </div>
    `;

    // --- BUTON OLAYLARI (GERİ TUŞU UYUMLU) ---
    
    // Hizmet/Borç Ekle
    const btnBorc = document.getElementById("showAddBorcButton");
    if (btnBorc) {
        btnBorc.addEventListener("click", async () => {
            try {
                await populateStudentSelect(db, currentUserId, appId, "borcStudentId"); 
                document.getElementById("borcTutar").value = "";
                document.getElementById("borcAciklama").value = "";
                document.getElementById("borcTarih").value = new Date().toISOString().split('T')[0];
                document.getElementById("borcModalErrorMessage").classList.add("hidden");
                
                // DÜZELTME: openModalWithBackHistory kullanıldı
                openModalWithBackHistory("addBorcModal");
            } catch (e) {
                console.error("Borç modalı hatası:", e);
                alert("Hata: " + e.message);
            }
        });
    }

    // Tahsilat Ekle
    const btnTahsilat = document.getElementById("showAddTahsilatButton");
    if (btnTahsilat) {
        btnTahsilat.addEventListener("click", async () => {
            try {
                await populateStudentSelect(db, currentUserId, appId, "tahsilatStudentId"); 
                document.getElementById("tahsilatTutar").value = "";
                document.getElementById("tahsilatAciklama").value = "";
                document.getElementById("tahsilatTarih").value = new Date().toISOString().split('T')[0];
                document.getElementById("tahsilatModalErrorMessage").classList.add("hidden");
                
                // DÜZELTME: openModalWithBackHistory kullanıldı
                openModalWithBackHistory("addTahsilatModal");
            } catch (e) {
                console.error("Tahsilat modalı hatası:", e);
                alert("Hata: " + e.message);
            }
        });
    }

    loadMuhasebeVerileri(db, currentUserId, appId);
    loadIslemGecmisi(db, currentUserId, appId);
}

function loadMuhasebeVerileri(db, currentUserId, appId) {
    const listContainer = document.getElementById("muhasebeListContainer");
    
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    if (activeListeners.muhasebeUnsubscribe) activeListeners.muhasebeUnsubscribe();

    activeListeners.muhasebeUnsubscribe = onSnapshot(q, (snapshot) => {
        const students = [];
        let totalTahsilat = 0;
        let totalBorc = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            students.push({ id: doc.id, ...data });
            totalTahsilat += (data.toplamOdenen || 0);
            totalBorc += (data.toplamBorc || 0);
        });

        if(document.getElementById("kpiTotalTahsilat")) document.getElementById("kpiTotalTahsilat").textContent = formatCurrency(totalTahsilat);
        if(document.getElementById("kpiTotalAlacak")) document.getElementById("kpiTotalAlacak").textContent = formatCurrency(totalBorc - totalTahsilat);
        if(document.getElementById("kpiTotalHizmet")) document.getElementById("kpiTotalHizmet").textContent = formatCurrency(totalBorc);

        renderMuhasebeList(students);
        
    }, (error) => {
        console.error(error);
        if(listContainer) listContainer.innerHTML = `<p class="text-red-500 text-center text-sm">Veri hatası.</p>`;
    });
}

function renderMuhasebeList(students) {
    const container = document.getElementById("muhasebeListContainer");
    if (students.length === 0) {
        container.innerHTML = '<div class="bg-white p-8 rounded-xl border border-gray-100 text-center text-gray-400"><i class="fa-solid fa-users-slash text-3xl mb-2 opacity-50"></i><p>Öğrenci kaydı yok.</p></div>';
        return;
    }

    // Mobil Uyumlu Kart Görünümü
    const html = students.map(s => {
        const borc = s.toplamBorc || 0;
        const odenen = s.toplamOdenen || 0;
        const bakiye = borc - odenen;
        
        let durumBadge = '';
        let borderClass = '';
        if (bakiye > 0) {
            durumBadge = '<span class="px-2 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-700">Ödeme Bekliyor</span>';
            borderClass = 'border-l-4 border-red-500';
        } else if (bakiye < 0) {
            durumBadge = '<span class="px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-700">Fazla Ödeme</span>';
            borderClass = 'border-l-4 border-green-500';
        } else {
            durumBadge = '<span class="px-2 py-1 text-[10px] font-bold rounded-full bg-gray-100 text-gray-600">Hesap Kapalı</span>';
            borderClass = 'border-l-4 border-gray-300';
        }

        return `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 ${borderClass} relative">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-bold text-gray-800 text-sm">${s.ad} ${s.soyad}</h4>
                        <div class="mt-1">${durumBadge}</div>
                    </div>
                    <div class="text-right">
                        <span class="block text-xs text-gray-400 uppercase font-bold">Bakiye</span>
                        <span class="text-lg font-black ${bakiye > 0 ? 'text-red-600' : 'text-gray-800'}">
                            ${bakiye > 0 ? '-' : ''}${formatCurrency(Math.abs(bakiye))}
                        </span>
                    </div>
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-gray-50 text-xs">
                    <div class="text-gray-500">
                        <span class="font-bold text-gray-400 text-[10px] uppercase block">Hizmet</span>
                        ${formatCurrency(borc)}
                    </div>
                    <div class="text-right text-green-600">
                        <span class="font-bold text-gray-400 text-[10px] uppercase block">Ödenen</span>
                        ${formatCurrency(odenen)}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function loadIslemGecmisi(db, currentUserId, appId) {
    const container = document.getElementById("transactionLogContainer");
    
    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "muhasebe"), 
        orderBy("eklenmeZamani", "desc"), 
        limit(10)
    );
    
    if (activeListeners.islemGecmisiUnsubscribe) activeListeners.islemGecmisiUnsubscribe();

    activeListeners.islemGecmisiUnsubscribe = onSnapshot(q, (snapshot) => {
        const transactions = [];
        snapshot.forEach(doc => transactions.push({ id: doc.id, ...doc.data() }));
        
        if (transactions.length === 0) {
            container.innerHTML = '<div class="bg-white p-6 rounded-xl border border-gray-100 text-center text-gray-400 text-sm">İşlem geçmişi yok.</div>';
            return;
        }

        const listHtml = transactions.map(t => {
            const isBorc = t.tur === 'borc';
            const icon = isBorc 
                ? '<div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><i class="fa-solid fa-plus text-xs"></i></div>' 
                : '<div class="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><i class="fa-solid fa-check text-xs"></i></div>';
            
            const amountColor = isBorc ? 'text-blue-600' : 'text-green-600';
            const label = isBorc ? 'Hizmet/Borç' : 'Tahsilat';

            return `
                <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div class="flex items-center gap-3 overflow-hidden">
                        ${icon}
                        <div class="min-w-0">
                            <h4 class="text-sm font-bold text-gray-800 truncate">${t.ogrenciAd}</h4>
                            <p class="text-xs text-gray-500 truncate">${t.aciklama || label}</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0 ml-2">
                        <span class="block font-bold text-sm ${amountColor}">${formatCurrency(t.tutar)}</span>
                        <span class="text-[10px] text-gray-400">${t.tarih}</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = listHtml;
    });
}

// KAYDETME FONKSİYONLARI (GERİ TUŞU UYUMLU)
export async function saveNewBorc(db, currentUserId, appId) {
    const studentId = document.getElementById("borcStudentId").value;
    const tutar = parseFloat(document.getElementById("borcTutar").value);
    const tarih = document.getElementById("borcTarih").value;
    const aciklama = document.getElementById("borcAciklama").value.trim();
    const sel = document.getElementById("borcStudentId");
    const studentName = sel.options[sel.selectedIndex]?.text || "Öğrenci";
    const errorEl = document.getElementById("borcModalErrorMessage");
    const saveButton = document.getElementById("saveBorcButton");

    if (!studentId || isNaN(tutar) || !tarih || tutar <= 0) {
        errorEl.textContent = "Lütfen alanları doldurun.";
        errorEl.classList.remove("hidden");
        return;
    }

    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";

        const batch = writeBatch(db);
        const transactionRef = doc(collection(db, "artifacts", appId, "users", currentUserId, "muhasebe"));
        batch.set(transactionRef, {
            ogrenciId: studentId, ogrenciAd: studentName, tur: 'borc',
            tutar: tutar, tarih: tarih, aciklama: aciklama, eklenmeZamani: serverTimestamp()
        });
        const studentRef = doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId);
        batch.update(studentRef, { toplamBorc: increment(tutar) });

        await batch.commit();
        
        // MODALI KAPAT (GERİ TUŞU İLE UYUMLU)
        window.history.back();

    } catch (error) {
        console.error(error);
        errorEl.textContent = "Hata: " + error.message;
        errorEl.classList.remove("hidden");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Kaydet";
    }
}

export async function saveNewTahsilat(db, currentUserId, appId) {
    const studentId = document.getElementById("tahsilatStudentId").value;
    const tutar = parseFloat(document.getElementById("tahsilatTutar").value);
    const tarih = document.getElementById("tahsilatTarih").value;
    const aciklama = document.getElementById("tahsilatAciklama").value.trim();
    const sel = document.getElementById("tahsilatStudentId");
    const studentName = sel.options[sel.selectedIndex]?.text || "Öğrenci";
    const errorEl = document.getElementById("tahsilatModalErrorMessage");
    const saveButton = document.getElementById("saveTahsilatButton");

    if (!studentId || isNaN(tutar) || !tarih || tutar <= 0) {
        errorEl.textContent = "Lütfen alanları doldurun.";
        errorEl.classList.remove("hidden");
        return;
    }

    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";

        const batch = writeBatch(db);
        const transactionRef = doc(collection(db, "artifacts", appId, "users", currentUserId, "muhasebe"));
        batch.set(transactionRef, {
            ogrenciId: studentId, ogrenciAd: studentName, tur: 'tahsilat',
            tutar: tutar, tarih: tarih, aciklama: aciklama, eklenmeZamani: serverTimestamp()
        });
        const studentRef = doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId);
        batch.update(studentRef, { toplamOdenen: increment(tutar) });

        await batch.commit();
        
        // MODALI KAPAT (GERİ TUŞU İLE UYUMLU)
        window.history.back();

    } catch (error) {
        console.error(error);
        errorEl.textContent = "Hata: " + error.message;
        errorEl.classList.remove("hidden");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Kaydet";
    }
}
