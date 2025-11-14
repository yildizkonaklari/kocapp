// === MUHASEBE MODÜLÜ ===
// Bu dosya, koçun "Muhasebe" sayfasıyla ilgili tüm fonksiyonları yönetir.

// 1. GEREKLİ IMPORTLAR
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
    getDocs // populateStudentSelect için
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    activeListeners, 
    formatCurrency, 
    populateStudentSelect // helpers.js'den import ediyoruz
} from './helpers.js';


// --- 2. ANA FONKSİYON: MUHASEBE SAYFASI ---

/**
 * "Muhasebe & Finans" sayfasının ana HTML iskeletini çizer ve verileri yükler.
 * @param {object} db - Firestore veritabanı referansı
 * @param {string} currentUserId - Giriş yapmış koçun UID'si
 * @param {string} appId - Uygulama ID'si
 */
export function renderMuhasebeSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Muhasebe & Finans";
    
    // HTML iskeletini oluştur
    mainContentArea.innerHTML = `
        <!-- KPI Özet Kartları -->
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

        <!-- Kontrol Paneli -->
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 class="text-xl font-semibold text-gray-700">Öğrenci Bakiyeleri</h2>
            <div class="flex gap-2 w-full md:w-auto">
                <button id="showAddBorcButton" class="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Hizmet/Borç Ekle
                </button>
                <button id="showAddTahsilatButton" class="flex-1 md:flex-none bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Tahsilat Ekle
                </button>
            </div>
        </div>

        <!-- Bakiye Listesi -->
        <div id="muhasebeListContainer" class="bg-white rounded-lg shadow overflow-hidden">
            <p class="text-gray-500 text-center py-8">Veriler yükleniyor...</p>
        </div>

        <!-- Son İşlemler (Log) -->
        <div class="mt-8">
            <h3 class="text-lg font-semibold text-gray-700 mb-4">Son İşlem Geçmişi</h3>
            <div id="transactionLogContainer" class="bg-white rounded-lg shadow overflow-hidden">
                <p class="text-gray-500 text-center py-4">Geçmiş yükleniyor...</p>
            </div>
        </div>
    `;

    // Buton Bağlantıları (Modalları açmak için)
    document.getElementById("showAddBorcButton").addEventListener("click", async () => {
        await populateStudentSelect(db, currentUserId, "borcStudentId");
        document.getElementById("borcTutar").value = "";
        document.getElementById("borcAciklama").value = "";
        document.getElementById("borcTarih").value = new Date().toISOString().split('T')[0];
        document.getElementById("borcModalErrorMessage").classList.add("hidden");
        document.getElementById("addBorcModal").style.display = "block";
    });

    document.getElementById("showAddTahsilatButton").addEventListener("click", async () => {
        await populateStudentSelect(db, currentUserId, "tahsilatStudentId");
        document.getElementById("tahsilatTutar").value = "";
        document.getElementById("tahsilatAciklama").value = "";
        document.getElementById("tahsilatTarih").value = new Date().toISOString().split('T')[0];
        document.getElementById("tahsilatModalErrorMessage").classList.add("hidden");
        document.getElementById("addTahsilatModal").style.display = "block";
    });

    // Verileri Yükle
    loadMuhasebeVerileri(db, currentUserId, appId);
    loadIslemGecmisi(db, currentUserId, appId);
}

/**
 * Öğrenci bakiyelerini ve KPI'ları yükler/dinler.
 */
function loadMuhasebeVerileri(db, currentUserId, appId) {
    const listContainer = document.getElementById("muhasebeListContainer");
    
    // Öğrencileri dinle (Bakiyeler öğrenci dökümanında tutulacak)
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    activeListeners.muhasebeUnsubscribe = onSnapshot(q, (snapshot) => {
        const students = [];
        let totalTahsilat = 0;
        let totalBorc = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            students.push({ id: doc.id, ...data });
            
            // KPI Hesaplama
            totalTahsilat += (data.toplamOdenen || 0);
            totalBorc += (data.toplamBorc || 0);
        });

        // KPI'ları Güncelle
        document.getElementById("kpiTotalTahsilat").textContent = formatCurrency(totalTahsilat);
        document.getElementById("kpiTotalAlacak").textContent = formatCurrency(totalBorc - totalTahsilat);
        document.getElementById("kpiTotalHizmet").textContent = formatCurrency(totalBorc);

        // Listeyi Çiz
        renderMuhasebeList(students);
        
    }, (error) => {
        console.error("Muhasebe verileri yüklenirken hata:", error);
        if(listContainer) listContainer.innerHTML = `<p class="text-red-500 text-center py-8">Veri yüklenemedi: ${error.message}</p>`;
    });
}

/**
 * Öğrenci bakiye listesini HTML olarak çizer.
 */
function renderMuhasebeList(students) {
    const container = document.getElementById("muhasebeListContainer");
    if (students.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Henüz öğrenci kaydı yok.</p>';
        return;
    }

    container.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öğrenci</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam Hizmet</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam Ödenen</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Güncel Bakiye</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${students.map(s => {
                    const borc = s.toplamBorc || 0;
                    const odenen = s.toplamOdenen || 0;
                    const bakiye = borc - odenen; // Pozitif ise öğrenci borçlu
                    
                    let durumBadge = '';
                    if (bakiye > 0) durumBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Ödeme Bekliyor</span>';
                    else if (bakiye < 0) durumBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Fazla Ödeme</span>';
                    else durumBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Hesap Kapalı</span>';

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
    `;
}

/**
 * Son 10 finansal işlemi (log) yükler.
 */
function loadIslemGecmisi(db, currentUserId, appId) {
    const container = document.getElementById("transactionLogContainer");
    
    // Son 10 işlem
    const q = query(
        collection(db, "koclar", currentUserId, "muhasebe"), 
        orderBy("tarih", "desc"), 
        limit(10)
    );
    
    activeListeners.islemGecmisiUnsubscribe = onSnapshot(q, (snapshot) => {
        const transactions = [];
        snapshot.forEach(doc => transactions.push({ id: doc.id, ...doc.data() }));
        
        if (transactions.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Henüz işlem geçmişi yok.</p>';
            return;
        }

        container.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öğrenci</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${transactions.map(t => `
                        <tr>
                            <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-500">${t.tarih}</td>
                            <td class="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${t.ogrenciAd}</td>
                            <td class="px-6 py-3 whitespace-nowrap text-sm">
                                <span class="px-2 py-1 rounded-full text-xs font-semibold ${t.tur === 'borc' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                                    ${t.tur === 'borc' ? 'Hizmet Ekleme' : 'Tahsilat'}
                                </span>
                            </td>
                            <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-600">${t.aciklama}</td>
                            <td class="px-6 py-3 whitespace-nowrap text-sm text-right font-bold ${t.tur === 'borc' ? 'text-blue-600' : 'text-green-600'}">
                                ${formatCurrency(t.tutar)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }, (error) => {
        console.error("İşlem geçmişi yüklenirken hata:", error);
        container.innerHTML = `<p class="text-red-500 text-center py-4">Geçmiş yüklenemedi.</p>`;
    });
}


// --- 3. EXPORT EDİLEN MODAL KAYDETME FONKSİYONLARI ---

/**
 * "Yeni Borç/Hizmet Ekle" modalından gelen veriyi kaydeder.
 * app.js tarafından çağrılır.
 */
export async function saveNewBorc(db, currentUserId, appId) {
    const studentId = document.getElementById("borcStudentId").value;
    const tutar = parseFloat(document.getElementById("borcTutar").value);
    const tarih = document.getElementById("borcTarih").value;
    const aciklama = document.getElementById("borcAciklama").value.trim();
    const studentName = document.getElementById("borcStudentId").options[document.getElementById("borcStudentId").selectedIndex].text;
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

        // 1. Merkezi Muhasebe Koleksiyonuna Ekle
        await addDoc(collection(db, "koclar", currentUserId, "muhasebe"), {
            ogrenciId: studentId,
            ogrenciAd: studentName,
            tur: 'borc',
            tutar: tutar,
            tarih: tarih,
            aciklama: aciklama,
            eklenmeZamani: serverTimestamp()
        });

        // 2. Öğrenci Bakiyesini Güncelle (toplamBorc artır)
        const studentRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
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

/**
 * "Yeni Tahsilat Ekle" modalından gelen veriyi kaydeder.
 * app.js tarafından çağrılır.
 */
export async function saveNewTahsilat(db, currentUserId, appId) {
    const studentId = document.getElementById("tahsilatStudentId").value;
    const tutar = parseFloat(document.getElementById("tahsilatTutar").value);
    const tarih = document.getElementById("tahsilatTarih").value;
    const aciklama = document.getElementById("tahsilatAciklama").value.trim();
    const studentName = document.getElementById("tahsilatStudentId").options[document.getElementById("tahsilatStudentId").selectedIndex].text;
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

        // 1. Merkezi Muhasebe Koleksiyonuna Ekle
        await addDoc(collection(db, "koclar", currentUserId, "muhasebe"), {
            ogrenciId: studentId,
            ogrenciAd: studentName,
            tur: 'tahsilat',
            tutar: tutar,
            tarih: tarih,
            aciklama: aciklama,
            eklenmeZamani: serverTimestamp()
        });

        // 2. Öğrenci Bakiyesini Güncelle (toplamOdenen artır)
        const studentRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
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
