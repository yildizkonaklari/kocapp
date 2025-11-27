// === MUHASEBE MODÜLÜ (GÜNCELLENMİŞ) ===

import { 
    doc, 
    addDoc, 
    updateDoc, 
    collection, 
    query, 
    onSnapshot, 
    orderBy, 
    serverTimestamp,
    increment,
    limit,
    getDocs 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    activeListeners, 
    formatCurrency, 
    populateStudentSelect 
} from './helpers.js';

export function renderMuhasebeSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Muhasebe & Finans";
    
    mainContentArea.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                <p class="text-sm text-gray-500 font-medium">Toplam Tahsilat (Genel)</p>
                <h3 id="kpiTotalTahsilat" class="text-2xl font-bold text-gray-800">0,00 ₺</h3>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
                <p class="text-sm text-gray-500 font-medium">Toplam Alacak (Bekleyen)</p>
                <h3 id="kpiTotalAlacak" class="text-2xl font-bold text-gray-800">0,00 ₺</h3>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                <p class="text-sm text-gray-500 font-medium">Toplam Hizmet Hacmi</p>
                <h3 id="kpiTotalHizmet" class="text-2xl font-bold text-gray-800">0,00 ₺</h3>
            </div>
        </div>

        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 class="text-xl font-semibold text-gray-700">Öğrenci Bakiyeleri</h2>
            <div class="flex gap-2 w-full md:w-auto">
                <button id="showAddBorcButton" type="button" class="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                    <i class="fa-solid fa-plus mr-2"></i> Hizmet/Borç
                </button>
                <button id="showAddTahsilatButton" type="button" class="flex-1 md:flex-none bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                    <i class="fa-solid fa-wallet mr-2"></i> Tahsilat
                </button>
            </div>
        </div>

        <div id="muhasebeListContainer" class="bg-white rounded-lg shadow border border-gray-100">
            <p class="text-gray-500 text-center py-8">Veriler yükleniyor...</p>
        </div>

        <div class="mt-8">
            <h3 class="text-lg font-semibold text-gray-700 mb-4">Son İşlem Geçmişi</h3>
            <div id="transactionLogContainer" class="bg-white rounded-lg shadow border border-gray-100">
                <p class="text-gray-500 text-center py-4">Geçmiş yükleniyor...</p>
            </div>
        </div>

        <div class="h-32 lg:h-12 w-full"></div>
    `;

    // Buton Bağlantıları
    const btnBorc = document.getElementById("showAddBorcButton");
    if (btnBorc) {
        btnBorc.addEventListener("click", async () => {
            try {
                await populateStudentSelect(db, currentUserId, appId, "borcStudentId"); 
                document.getElementById("borcTutar").value = "";
                document.getElementById("borcAciklama").value = "";
                document.getElementById("borcTarih").value = new Date().toISOString().split('T')[0];
                document.getElementById("borcModalErrorMessage").classList.add("hidden");
                document.getElementById("addBorcModal").style.display = "block";
            } catch (e) {
                console.error("Borç modalı hatası:", e);
                alert("Öğrenci listesi yüklenemedi: " + e.message);
            }
        });
    }

    const btnTahsilat = document.getElementById("showAddTahsilatButton");
    if (btnTahsilat) {
        btnTahsilat.addEventListener("click", async () => {
            try {
                await populateStudentSelect(db, currentUserId, appId, "tahsilatStudentId"); 
                document.getElementById("tahsilatTutar").value = "";
                document.getElementById("tahsilatAciklama").value = "";
                document.getElementById("tahsilatTarih").value = new Date().toISOString().split('T')[0];
                document.getElementById("tahsilatModalErrorMessage").classList.add("hidden");
                document.getElementById("addTahsilatModal").style.display = "block";
            } catch (e) {
                console.error("Tahsilat modalı hatası:", e);
                alert("Öğrenci listesi yüklenemedi: " + e.message);
            }
        });
    }

    // Verileri Yükle
    loadMuhasebeVerileri(db, currentUserId, appId);
    loadIslemGecmisi(db, currentUserId, appId);
}

function loadMuhasebeVerileri(db, currentUserId, appId) {
    const listContainer = document.getElementById("muhasebeListContainer");
    
    // Verileri çekmeye çalış
    try {
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
            console.error("Muhasebe verileri hatası:", error);
            if(listContainer) listContainer.innerHTML = `<p class="text-red-500 text-center py-8">Veri hatası: ${error.message}</p>`;
        });
    } catch (e) {
        console.error("Muhasebe sorgu hatası:", e);
    }
}

function renderMuhasebeList(students) {
    const container = document.getElementById("muhasebeListContainer");
    if (students.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Henüz öğrenci kaydı yok.</p>';
        return;
    }

    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Öğrenci</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Hizmet</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Ödenen</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Bakiye</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Durum</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${students.map(s => {
                        const borc = s.toplamBorc || 0;
                        const odenen = s.toplamOdenen || 0;
                        const bakiye = borc - odenen;
                        
                        let durumBadge = '';
                        if (bakiye > 0) durumBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 whitespace-nowrap">Ödeme Bekliyor</span>';
                        else if (bakiye < 0) durumBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 whitespace-nowrap">Fazla Ödeme</span>';
                        else durumBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 whitespace-nowrap">Hesap Kapalı</span>';

                        return `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${s.ad} ${s.soyad}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">${formatCurrency(borc)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">${formatCurrency(odenen)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${bakiye > 0 ? 'text-red-600' : 'text-gray-800'}">
                                    ${bakiye > 0 ? '-' : ''}${formatCurrency(Math.abs(bakiye))}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-center">${durumBadge}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function loadIslemGecmisi(db, currentUserId, appId) {
    const container = document.getElementById("transactionLogContainer");
    
    // HATA DÜZELTME: Sıralama kriteri değiştirildi. 'eklenmeZamani' daha güvenilir.
    // Eğer bu da hata verirse, Firestore konsolunda bu sorgu için indeks oluşturmanız gerektiğine dair
    // konsolda (F12) bir link çıkacaktır. O linke tıklamanız gerekebilir.
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
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Henüz işlem geçmişi yok.</p>';
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Tarih</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Öğrenci</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">İşlem</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Açıklama</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Tutar</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${transactions.map(t => `
                            <tr>
                                <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-500">${t.tarih}</td>
                                <td class="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${t.ogrenciAd}</td>
                                <td class="px-6 py-3 whitespace-nowrap text-sm">
                                    <span class="px-2 py-1 rounded-full text-xs font-semibold ${t.tur === 'borc' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                                        ${t.tur === 'borc' ? 'Hizmet/Borç' : 'Tahsilat'}
                                    </span>
                                </td>
                                <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600">${t.aciklama || '-'}</td>
                                <td class="px-6 py-3 whitespace-nowrap text-sm text-right font-bold ${t.tur === 'borc' ? 'text-blue-600' : 'text-green-600'}">
                                    ${formatCurrency(t.tutar)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }, (error) => {
        console.error("İşlem geçmişi hatası:", error);
        container.innerHTML = `<p class="text-red-500 text-center py-4">Veri yüklenemedi: ${error.message}</p>`;
    });
}


// --- 3. EXPORT EDİLEN MODAL KAYDETME FONKSİYONLARI ---

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
        errorEl.textContent = "Lütfen tüm alanları geçerli bir şekilde doldurun.";
        errorEl.classList.remove("hidden");
        return;
    }

    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";

        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "muhasebe"), {
            ogrenciId: studentId,
            ogrenciAd: studentName,
            tur: 'borc',
            tutar: tutar,
            tarih: tarih,
            aciklama: aciklama,
            eklenmeZamani: serverTimestamp()
        });

        const studentRef = doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId);
        await updateDoc(studentRef, {
            toplamBorc: increment(tutar)
        });

        document.getElementById("addBorcModal").style.display = "none";
    } catch (error) {
        console.error("Borç ekleme hatası:", error);
        errorEl.textContent = "Hata: " + error.message;
        errorEl.classList.remove("hidden");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Borcu Kaydet";
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
        errorEl.textContent = "Lütfen tüm alanları geçerli bir şekilde doldurun.";
        errorEl.classList.remove("hidden");
        return;
    }

    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";

        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "muhasebe"), {
            ogrenciId: studentId,
            ogrenciAd: studentName,
            tur: 'tahsilat',
            tutar: tutar,
            tarih: tarih,
            aciklama: aciklama,
            eklenmeZamani: serverTimestamp()
        });

        const studentRef = doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId);
        await updateDoc(studentRef, {
            toplamOdenen: increment(tutar)
        });

        document.getElementById("addTahsilatModal").style.display = "none";
    } catch (error) {
        console.error("Tahsilat ekleme hatası:", error);
        errorEl.textContent = "Hata: " + error.message;
        errorEl.classList.remove("hidden");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Tahsilatı Kaydet";
    }
}
