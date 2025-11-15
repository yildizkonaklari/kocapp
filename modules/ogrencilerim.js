// === ÖĞRENCİLERİM MODÜLÜ ===
// Bu dosya, öğrenciler, öğrenci listesi, öğrenci detay profili
// ve alt sekmeleriyle (deneme, soru, hedef vb.) ilgili tüm fonksiyonları içerir.

// 1. GEREKLİ IMPORTLAR
import { 
    doc, getDoc, addDoc, updateDoc, collection, query, 
    onSnapshot, deleteDoc, orderBy, where, serverTimestamp,
    increment // increment'i muhasebe için (veya gerekirse) ekleyebiliriz, şimdilik dursun
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// helpers.js dosyamızdan ortak fonksiyonları ve sabitleri import ediyoruz
// ... (imports) ...
import { 
    activeListeners, 
    formatCurrency, 
    formatDateTR, 
    SINAV_DERSLERI, 
    renderDersSecimi,
    cleanUpListeners
} from './helpers.js';

// ... (renderOgrenciSayfasi ve alt fonksiyonları aynı) ...

// --- 4. ÖĞRENCİ DETAY SAYFASI ---
export function renderOgrenciDetaySayfasi(db, currentUserId, appId, studentId, studentName) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = `${studentName} - Detay Profili`;
    
    // Sayfa değişti, tüm dinleyicileri temizle
    cleanUpListeners();

    mainContentArea.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <button id="geriDonOgrenciListesi" class="flex items-center text-sm text-gray-600 hover:text-purple-600 font-medium">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                Öğrenci Listesine Geri Dön
            </button>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row items-center mb-6 gap-4">
            <div class="flex-shrink-0 h-16 w-16 bg-purple-100 text-purple-600 flex items-center justify-center rounded-full font-bold text-2xl" id="studentDetailAvatar">
                ${studentName.split(' ').map(n => n[0]).join('')}
            </div>
            <div class="text-center md:text-left flex-1">
                <h2 class="text-3xl font-bold text-gray-800" id="studentDetailName">${studentName}</h2>
                <p class="text-lg text-gray-500" id="studentDetailClass">Yükleniyor...</p>
            </div>
            <div class="ml-0 md:ml-auto flex flex-col sm:flex-row gap-2">
                <button id="showEditStudentModalButton" data-student-id="${studentId}" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 border border-gray-200">Bilgileri Düzenle</button>
                <button id="btnStudentMesajGonder" class="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 border border-purple-200">Mesaj Gönder</button>
                <!-- data-student-id eklendi -->
                <button id="btnStudentRandevuPlanla" data-student-id="${studentId}" class="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 border border-green-200 flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Randevu Planla
                </button>
            </div>
        </div>
        <div class="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
            <button data-tab="ozet" class="tab-button active flex-shrink-0 py-3 px-5 text-purple-600 border-b-2 border-purple-600 font-semibold">Özet</button>
            <button data-tab="denemeler" class="tab-button flex-shrink-0 py-3 px-5 text-gray-500 hover:text-purple-600">Denemeler</button>
            <button data-tab="soru-takibi" class="tab-button flex-shrink-0 py-3 px-5 text-gray-500 hover:text-purple-600">Soru Takibi</button>
            <button data-tab="hedefler" class="tab-button flex-shrink-0 py-3 px-5 text-gray-500 hover:text-purple-600">Hedefler & Ödevler</button>
            <button data-tab="notlar" class="tab-button flex-shrink-0 py-3 px-5 text-gray-500 hover:text-purple-600">Koçluk Notları (Özel)</button>
        </div>
        <div id="tabContentArea"></div>
    `;

    // Event Listener'lar
    document.getElementById('geriDonOgrenciListesi').addEventListener('click', () => {
        cleanUpListeners();
        renderOgrenciSayfasi(db, currentUserId, appId);
    });

    document.getElementById('showEditStudentModalButton').addEventListener('click', (e) => {
        showEditStudentModal(db, currentUserId, appId, e.currentTarget.dataset.studentId);
    });

    // Mesaj gönder'e tıklayınca Mesajlar sayfasını aç
    document.getElementById('btnStudentMesajGonder').addEventListener('click', () => {
        document.getElementById('nav-mesajlar').click();
        // TODO: Açılan mesajlar sayfasında bu öğrenciyi otomatik seç (gelişmiş özellik)
    });

    // Randevu Planla Butonu
    document.getElementById('btnStudentRandevuPlanla').addEventListener('click', async (e) => {
        const studentId = e.currentTarget.dataset.studentId; // ID'yi butondan al
        const modal = document.getElementById('addRandevuModal');
        const selectId = 'randevuStudentId';
        
        // DÜZELTME: populateStudentSelect fonksiyonuna 'appId' eklendi
        await populateStudentSelect(db, currentUserId, appId, selectId);
        
        const select = document.getElementById(selectId);
        document.getElementById('randevuBaslik').value = 'Birebir Koçluk Görüşmesi';
        document.getElementById('randevuTarih').value = new Date().toISOString().split('T')[0];
        document.getElementById('randevuBaslangic').value = '09:00';
        document.getElementById('randevuBitis').value = '10:00';
        document.getElementById('randevuNot').value = '';
        document.getElementById('randevuModalErrorMessage').classList.add('hidden');
        modal.style.display = 'block';
    });

    // Sekme (Tab) Butonları
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            cleanUpListeners(); 
            
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'text-purple-600', 'border-purple-600', 'font-semibold');
                btn.classList.add('text-gray-500');
            });
            e.currentTarget.classList.add('active', 'text-purple-600', 'border-purple-600', 'font-semibold');
            e.currentTarget.classList.remove('text-gray-500');
            
            const tabId = e.currentTarget.dataset.tab;
            
            switch(tabId) {
                case 'ozet': renderOzetTab(db, currentUserId, appId, studentId); break;
                case 'denemeler': renderDenemelerTab(db, currentUserId, appId, studentId, studentName); break;
                case 'soru-takibi': 
                    soruTakibiZaman = 'haftalik';
                    soruTakibiOffset = 0;
                    renderSoruTakibiTab(db, currentUserId, appId, studentId, studentName); 
                    break;
                case 'hedefler': renderHedeflerOdevlerTab(db, currentUserId, appId, studentId, studentName); break;
                case 'notlar': renderKoclukNotlariTab(db, currentUserId, appId, studentId, studentName); break;
                default: 
                    import('./helpers.js').then(module => module.renderPlaceholderSayfasi(tabId));
                    break;
            }
        });
    });
    
    renderOzetTab(db, currentUserId, appId, studentId); // Varsayılanı yükle
}

// --- 4.1. ÖZET SEKMESİ ---
async function renderOzetTab(db, currentUserId, appId, studentId) {
    const tabContentArea = document.getElementById('tabContentArea');
    if (!tabContentArea) return;
    tabContentArea.innerHTML = `<p class="text-gray-600 p-4">Öğrenci detayları yükleniyor...</p>`;
    try {
        const studentDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
        const docSnap = await getDoc(studentDocRef); // Tek seferlik okuma
        if (docSnap.exists()) {
            const studentData = docSnap.data();
            const classElement = document.getElementById('studentDetailClass');
            if (classElement) {
                classElement.textContent = `${studentData.sinif} Öğrencisi`;
            }
            tabContentArea.innerHTML = `
                <h3 class="text-xl font-semibold mb-4 text-gray-700">Öğrenci Özeti</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-gray-50 p-4 rounded-lg shadow-sm"><p class="text-sm font-medium text-gray-500">Sınıf</p><p class="text-lg font-semibold text-gray-800">${studentData.sinif}</p></div>
                    <div class="bg-gray-50 p-4 rounded-lg shadow-sm"><p class="text-sm font-medium text-gray-500">Kayıt Tarihi</p><p class="text-lg font-semibold text-gray-800">${studentData.olusturmaTarihi ? studentData.olusturmaTarihi.toDate().toLocaleDateString('tr-TR') : 'Bilinmiyor'}</p></div>
                    <div class="bg-gray-50 p-4 rounded-lg shadow-sm"><p class="text-sm font-medium text-gray-500">Genel Bakiye</p><p class="text-lg font-semibold ${((studentData.toplamBorc || 0) - (studentData.toplamOdenen || 0)) > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency((studentData.toplamBorc || 0) - (studentData.toplamOdenen || 0))}</p></div>
                </div>
            `;
        } else {
            tabContentArea.innerHTML = `<p class="text-red-500">Öğrenci detayları bulunamadı.</p>`;
        }
    } catch (error) {
        console.error("Öğrenci detayı yüklenirken hata:", error);
        tabContentArea.innerHTML = `<p class="text-red-500">Hata: ${error.message}</p>`;
    }
}

// --- 4.2. DENEMELER SEKMESİ ---
function renderDenemelerTab(db, currentUserId, appId, studentId, studentName) {
    const tabContentArea = document.getElementById('tabContentArea');
    if (!tabContentArea) return;
    tabContentArea.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-semibold text-gray-700">${studentName} - Deneme Sınavları</h3>
            <button id="showAddDenemeModalButton" class="bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center text-sm">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Yeni Deneme Ekle
            </button>
        </div>
        <div id="denemeListContainer" class="bg-white p-4 rounded-lg shadow"><p class="text-gray-500 text-center py-4">Denemeler yükleniyor...</p></div>
    `;
    document.getElementById('showAddDenemeModalButton').addEventListener('click', () => {
        document.getElementById('denemeModalErrorMessage').classList.add('hidden');
        document.getElementById('denemeAdi').value = '';
        document.getElementById('denemeTarihi').value = new Date().toISOString().split('T')[0];
        document.getElementById('denemeTuru').value = 'TYT'; 
        renderDenemeNetInputs('TYT');
        document.getElementById('currentStudentIdForDeneme').value = studentId;
        document.getElementById('addDenemeModal').style.display = 'block';
    });
    loadDenemeler(db, currentUserId, appId, studentId);
}

export function renderDenemeNetInputs(tur) {
    const sinav = SINAV_DERSLERI[tur];
    const container = document.getElementById("denemeNetGirisAlani");
    if (!container) return;
    
    let html = `<p class="text-gray-700 font-medium">Net Girişi (${tur})</p>`;
    if (tur === 'Diger') {
        html += `<div class="mt-4"><label for="net-diger-toplam" class="block text-sm font-medium text-gray-700">Toplam Net</label><input type="number" id="net-diger-toplam" class="net-input-diger mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" placeholder="Örn: 75.25"><p class="text-xs text-gray-500 mt-2">Diğer sınav türleri için sadece toplam neti girin.</p></div>`;
    } else if (sinav && sinav.dersler.length > 0) {
        const kuralText = sinav.netKural === 0 ? "Yanlış doğruyu götürmez" : `${sinav.netKural} Yanlış 1 Doğruyu götürür`;
        html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 mt-4">`;
        sinav.dersler.forEach(ders => {
            html += `<div class="md:col-span-1"><label for="net-${ders.id}-d" class="block text-xs font-medium text-gray-600">${ders.ad} (D)</label><input type="number" id="net-${ders.id}-d" data-ders-id="${ders.id}" data-type="d" data-max-soru="${ders.soru}" class="net-input mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" min="0" max="${ders.soru}"></div><div class="md:col-span-1"><label for="net-${ders.id}-y" class="block text-xs font-medium text-gray-600">${ders.ad} (Y)</label><input type="number" id="net-${ders.id}-y" data-ders-id="${ders.id}" data-type="y" data-max-soru="${ders.soru}" class="net-input mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" min="0"></div>`;
        });
        html += `</div>`;
        html += `<p class="text-xs text-gray-500 mt-3">Boş ve Net sayıları otomatik hesaplanacaktır. (${kuralText})</p>`;
    } else {
        html = '<p class="text-gray-500">Bu sınav türü için ders girişi tanımlanmamış.</p>';
    }
    container.innerHTML = html;
}

function loadDenemeler(db, currentUserId, appId, studentId) {
    const container = document.getElementById('denemeListContainer');
    if (!container) return;
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "denemeler"), orderBy("tarih", "desc"));
    
    activeListeners.denemeUnsubscribe = onSnapshot(q, (snapshot) => {
        const denemeler = [];
        snapshot.forEach(doc => denemeler.push({ id: doc.id, ...doc.data() }));
        renderDenemeList(denemeler, db, currentUserId, appId, studentId);
    }, (error) => {
        console.error("Deneme yükleme hatası:", error);
        container.innerHTML = `<p class="text-red-500 text-center py-4">Hata: ${error.message}</p>`;
    });
}

function renderDenemeList(denemeler, db, currentUserId, appId, studentId) {
    const container = document.getElementById('denemeListContainer');
    if (denemeler.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-center py-4">Bu öğrenci için henüz deneme sonucu girilmemiş.</p>`;
        return;
    }
    container.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınav Adı</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Net</th>
                    <th class="relative px-6 py-3"><span class="sr-only">Eylemler</span></th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${denemeler.map(deneme => {
                    const toplamNetStr = (deneme.toplamNet || 0).toFixed(2);
                    let turClass = 'bg-gray-100 text-gray-800';
                    if (deneme.tur === 'TYT') turClass = 'bg-blue-100 text-blue-800';
                    else if (deneme.tur === 'AYT') turClass = 'bg-red-100 text-red-800';
                    else if (deneme.tur === 'LGS') turClass = 'bg-green-100 text-green-800';
                    else if (deneme.tur === 'YDS') turClass = 'bg-yellow-100 text-yellow-800';
                    return `
                        <tr id="deneme-row-${deneme.id}">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${deneme.tarih || 'Bilinmiyor'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${deneme.ad}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${turClass}">${deneme.tur}</span></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${toplamNetStr}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button data-id="${deneme.id}" class="text-purple-600 hover:text-purple-900">Düzenle</button>
                                <button data-id="${deneme.id}" class="delete-deneme-button text-red-600 hover:text-red-900 ml-4">Sil</button>
                            </td>
                        </tr>
                    `
                }).join('')}
            </tbody>
        </table>
    `;

    document.querySelectorAll('.delete-deneme-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const denemeId = e.target.dataset.id;
            if (confirm("Bu deneme sonucunu silmek istediğinize emin misiniz?")) {
                try {
                    const denemeDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "denemeler", denemeId);
                    await deleteDoc(denemeDocRef);
                } catch (error) {
                    console.error("Deneme silme hatası:", error);
                }
            }
        });
    });
}

export async function saveNewDeneme(db, currentUserId, appId) {
    const studentId = document.getElementById('currentStudentIdForDeneme').value;
    const ad = document.getElementById('denemeAdi').value.trim();
    const tarih = document.getElementById('denemeTarihi').value;
    const tur = document.getElementById('denemeTuru').value;
    const errorEl = document.getElementById('denemeModalErrorMessage');
    
    if (!studentId || !ad || !tarih) {
        errorEl.textContent = "Sınav Adı ve Tarihi alanları zorunludur.";
        errorEl.classList.remove('hidden');
        return;
    }

    let denemeVerisi = {
        ad, tarih, tur,
        eklenmeTarihi: serverTimestamp(),
        netler: {},
        toplamNet: 0
    };
    const saveButton = document.getElementById('saveDenemeButton');
    
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";
        
        const sinav = SINAV_DERSLERI[tur];
        
        if (tur === 'Diger') {
            const toplamNet = parseFloat(document.getElementById('net-diger-toplam').value) || 0;
            denemeVerisi.toplamNet = toplamNet;
            denemeVerisi.netler['diger_toplam'] = { ad: 'Toplam Net', d: 0, y: 0, b: 0, net: toplamNet };
        } else if (sinav) {
            let toplamNetHesabi = 0;
            const kural = sinav.netKural;
            
            for (const ders of sinav.dersler) {
                const d = parseInt(document.getElementById(`net-${ders.id}-d`).value) || 0;
                const y = parseInt(document.getElementById(`net-${ders.id}-y`).value) || 0;
                const b = Math.max(0, ders.soru - (d + y));
                
                let net = 0;
                if (kural === 0) { net = d; }
                else { net = d - (y / kural); }
                
                denemeVerisi.netler[ders.id] = { ad: ders.ad, soru: ders.soru, d, y, b, net };
                if (!isNaN(net)) {
                    toplamNetHesabi += net;
                }
            }
            denemeVerisi.toplamNet = toplamNetHesabi;
        }

        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "denemeler"), denemeVerisi);
        document.getElementById('addDenemeModal').style.display = 'none';
        
    } catch (error) {
        console.error("Deneme ekleme hatası: ", error);
        errorEl.textContent = `Bir hata oluştu: ${error.message}`;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Denemeyi Kaydet";
    }
}


// --- 4.3. SORU TAKİBİ SEKMESİ ---

function getSoruTakibiDateRange(zaman, offset) {
    // ... (helpers.js'ye taşındı ama burada da tutabiliriz, şimdilik kalsın)
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (zaman === 'haftalik') {
        const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
        startDate.setDate(today.getDate() - dayOfWeek + (offset * 7));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
    } else {
        startDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1 + offset, 0);
    }
    
    const formatForUI = (date) => date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    const formatForFirestore = (date) => date.toISOString().split('T')[0];
    
    return {
        start: formatForFirestore(startDate),
        end: formatForFirestore(endDate),
        uiText: `${formatForUI(startDate)} - ${formatForUI(endDate)}`
    };
}

function renderDonutChart(percent, elementId) {
    // ... (Bu da helpers.js'ye taşınabilir)
    const container = document.getElementById(elementId);
    if (!container) return;
    const cleanPercent = Math.max(0, Math.min(100, percent || 0));
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (cleanPercent / 100) * circumference;
    container.innerHTML = `<svg class="w-full h-full" viewBox="0 0 100 100"><circle class="text-gray-200" stroke-width="12" stroke="currentColor" fill="transparent" r="${radius}" cx="50" cy="50" /><circle class="text-purple-600" stroke-width="12" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" stroke="currentColor" fill="transparent" r="${radius}" cx="50" cy="50" transform="rotate(-90 50 50)"/><text x="50" y="50" font-family="sans-serif" font-size="20" fill="currentColor" text-anchor="middle" dy=".3em" class="font-bold text-purple-700">${cleanPercent.toFixed(0)}%</text></svg>`;
}

function renderSoruTakibiSummary(soruVerileri) {
    let totalSoru = 0, totalDogru = 0, totalYanlis = 0;
    soruVerileri.forEach(veri => {
        if (veri.onayDurumu === 'onaylandi' || veri.onayDurumu === undefined) {
            const d = veri.dogru || 0;
            const y = veri.yanlis || 0;
            const b = veri.bos || 0;
            totalDogru += d;
            totalYanlis += y;
            totalSoru += (d + y + b);
        }
    });
    const basariOrani = (totalDogru + totalYanlis) === 0 ? 0 : (totalDogru / (totalDogru + totalYanlis)) * 100;
    
    const summaryToplamSoruEl = document.getElementById('summaryToplamSoru');
    const summaryBasariOraniEl = document.getElementById('summaryBasariOrani');
    if(summaryToplamSoruEl) summaryToplamSoruEl.textContent = totalSoru;
    if(summaryBasariOraniEl) summaryBasariOraniEl.textContent = `${basariOrani.toFixed(0)}%`;
    renderDonutChart(basariOrani, 'summaryDonutChart');
}

function renderSoruTakibiTab(db, currentUserId, appId, studentId, studentName) {
    const tabContentArea = document.getElementById('tabContentArea');
    if (!tabContentArea) return;
    tabContentArea.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div class="flex items-center p-1 bg-gray-200 rounded-lg">
                <button data-zaman="haftalik" class="soru-zaman-toggle active px-3 py-1 text-sm font-semibold text-white bg-purple-600 rounded-md shadow">Haftalık</button>
                <button data-zaman="aylik" class="soru-zaman-toggle px-3 py-1 text-sm font-semibold text-gray-600 rounded-md">Aylık</button>
            </div>
            <div class="flex items-center">
                <button id="soru-tarih-geri" class="soru-tarih-nav p-2 text-gray-500 hover:text-purple-600 rounded-full" data-yon="-1"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>
                <span id="soru-tarih-araligi" class="text-sm font-semibold text-gray-700 mx-2 w-28 text-center">Yükleniyor...</span>
                <button id="soru-tarih-ileri" class="soru-tarih-nav p-2 text-gray-500 hover:text-purple-600 rounded-full" data-yon="1"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>
            </div>
            <button id="showAddSoruModalButton" class="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center text-sm"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Yeni Veri Ekle</button>
        </div>
        <div id="soruTakibiSummary" class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-white p-4 rounded-lg shadow-sm"><p class="text-sm font-medium text-gray-500">Toplam Soru (Onaylı)</p><p id="summaryToplamSoru" class="text-2xl md:text-3xl font-bold text-gray-800">0</p></div>
            <div class="bg-white p-4 rounded-lg shadow-sm"><p class="text-sm font-medium text-gray-500">Başarı Oranı (Onaylı)</p><p id="summaryBasariOrani" class="text-2xl md:text-3xl font-bold text-purple-600">0%</p></div>
            <div class="bg-white p-4 rounded-lg shadow-sm flex justify-center items-center col-span-2 md:col-span-1"><div id="summaryDonutChart" class="w-24 h-24"></div></div>
        </div>
        <div id="soruListContainer" class="bg-white p-4 rounded-lg shadow"><p class="text-gray-500 text-center py-4">Soru verileri yükleniyor...</p></div>
    `;

    document.getElementById('showAddSoruModalButton').addEventListener('click', () => {
        document.getElementById('soruModalErrorMessage').classList.add('hidden');
        document.getElementById('soruTarihi').value = new Date().toISOString().split('T')[0];
        document.getElementById('soruDers').value = '';
        document.getElementById('soruKonu').value = '';
        document.getElementById('soruDogru').value = '';
        document.getElementById('soruYanlis').value = '';
        document.getElementById('soruBos').value = '';
        document.getElementById('currentStudentIdForSoruTakibi').value = studentId;
        document.getElementById('addSoruModal').style.display = 'block';
    });

    document.querySelectorAll('.soru-zaman-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            soruTakibiZaman = e.currentTarget.dataset.zaman;
            soruTakibiOffset = 0;
            document.querySelectorAll('.soru-zaman-toggle').forEach(btn => btn.classList.remove('active', 'bg-purple-600', 'text-white', 'shadow'));
            e.currentTarget.classList.add('active', 'bg-purple-600', 'text-white', 'shadow');
            loadSoruTakibi(db, currentUserId, appId, studentId);
        });
    });

    document.querySelectorAll('.soru-tarih-nav').forEach(button => {
        button.addEventListener('click', (e) => {
            soruTakibiOffset += parseInt(e.currentTarget.dataset.yon);
            loadSoruTakibi(db, currentUserId, appId, studentId);
        });
    });
    
    loadSoruTakibi(db, currentUserId, appId, studentId);
}

function loadSoruTakibi(db, currentUserId, appId, studentId) {
    const container = document.getElementById('soruListContainer');
    if (!container) return;
    if (activeListeners.soruTakibiUnsubscribe) activeListeners.soruTakibiUnsubscribe();
    
    const dateRange = getSoruTakibiDateRange(soruTakibiZaman, soruTakibiOffset);
    document.getElementById('soru-tarih-araligi').textContent = dateRange.uiText;
    document.getElementById('soru-tarih-ileri').disabled = (soruTakibiOffset >= 0);
    
    const q = query(
        collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "soruTakibi"),
        where("tarih", ">=", dateRange.start),
        where("tarih", "<=", dateRange.end),
        orderBy("tarih", "desc")
    );
    
    activeListeners.soruTakibiUnsubscribe = onSnapshot(q, (snapshot) => {
        const veriler = [];
        snapshot.forEach(doc => veriler.push({ id: doc.id, ...doc.data() }));
        renderSoruTakibiSummary(veriler);
        renderSoruTakibiList(veriler, db, currentUserId, appId, studentId);
    }, (error) => {
        console.error("Soru takibi hatası:", error);
        if (error.code === 'failed-precondition') {
            container.innerHTML = `<p class="text-red-500 text-center py-4">Veriler yüklenemedi. Firestore index'i gerekiyor. Lütfen konsoldaki linki takip edin.</p>`;
        } else {
            container.innerHTML = `<p class="text-red-500 text-center py-4">Veriler yüklenemedi. (Hata: ${error.message}).</p>`;
        }
    });
}

function renderSoruTakibiList(soruVerileri, db, currentUserId, appId, studentId) {
    const container = document.getElementById('soruListContainer');
    if (soruVerileri.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-center py-4">Seçili tarih aralığı için soru verisi bulunamadı.</p>`;
        return;
    }
    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ders</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konu</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">D</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Y</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">B</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam</th>
                        <th class="relative px-6 py-3"><span class="sr-only">İşlemler</span></th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${soruVerileri.map(veri => {
                        const d = veri.dogru || 0, y = veri.yanlis || 0, b = veri.bos || 0;
                        const toplam = d + y + b;
                        let statusBadge = '', rowClass = '', approveBtn = '';
                        if (veri.onayDurumu === 'bekliyor') {
                            statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Onay Bekliyor</span>';
                            rowClass = 'bg-yellow-50';
                            approveBtn = `<button data-id="${veri.id}" class="approve-soru-button text-green-600 hover:text-green-900 mr-3 font-bold" title="Onayla">✓ Onayla</button>`;
                        } else {
                            statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Onaylandı</span>';
                        }
                        return `
                            <tr id="soru-row-${veri.id}" class="${rowClass}">
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${veri.tarih || 'Bilinmiyor'}</td>
                                <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${veri.ders}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${veri.konu}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">${d}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">${y}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${b}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">${toplam}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">${approveBtn}<button data-id="${veri.id}" class="delete-soru-button text-red-600 hover:text-red-900">Sil</button></td>
                            </tr>
                        `
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.querySelectorAll('.approve-soru-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const veriId = e.currentTarget.dataset.id;
            const soruDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "soruTakibi", veriId);
            await updateDoc(soruDocRef, { onayDurumu: 'onaylandi' });
        });
    });

    document.querySelectorAll('.delete-soru-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const veriId = e.currentTarget.dataset.id;
            if (confirm("Bu soru verisini silmek/reddetmek istediğinize emin misiniz?")) {
                const soruDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "soruTakibi", veriId);
                await deleteDoc(soruDocRef);
            }
        });
    });
}

export async function saveNewSoruTakibi(db, currentUserId, appId) {
    const studentId = document.getElementById('currentStudentIdForSoruTakibi').value;
    const tarih = document.getElementById('soruTarihi').value;
    const ders = document.getElementById('soruDers').value.trim();
    const konu = document.getElementById('soruKonu').value.trim();
    const dogru = parseInt(document.getElementById('soruDogru').value) || 0;
    const yanlis = parseInt(document.getElementById('soruYanlis').value) || 0;
    const bos = parseInt(document.getElementById('soruBos').value) || 0;
    const errorEl = document.getElementById('soruModalErrorMessage');

    if (!studentId || !tarih || !ders || !konu) {
        errorEl.textContent = "Tarih, Ders ve Konu alanları zorunludur.";
        errorEl.classList.remove('hidden');
        return;
    }

    const saveButton = document.getElementById('saveSoruButton');
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";
        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "soruTakibi"), {
            tarih, ders, konu, dogru, yanlis, bos,
            onayDurumu: 'onaylandi', // Koç girdiği için direkt onaylı
            eklenmeTarihi: serverTimestamp()
        });
        document.getElementById('addSoruModal').style.display = 'none';
    } catch (error) {
        console.error("Soru verisi ekleme hatası: ", error);
        errorEl.textContent = `Bir hata oluştu: ${error.message}`;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Veriyi Kaydet";
    }
}


// --- 4.4. HEDEFLER & ÖDEVLER SEKMESİ ---

function renderHedeflerOdevlerTab(db, currentUserId, appId, studentId, studentName) {
    const tabContentArea = document.getElementById('tabContentArea');
    if (!tabContentArea) return;
    tabContentArea.innerHTML = `
        <div class="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
            <button data-subtab="hedefler" class="subtab-button active flex-shrink-0 py-3 px-5 text-purple-600 border-b-2 border-purple-600 font-semibold">🎯 Hedefler</button>
            <button data-subtab="odevler" class="subtab-button flex-shrink-0 py-3 px-5 text-gray-500 hover:text-purple-600">📝 Ödevler</button>
        </div>
        <div id="subTabContentArea"></div>
    `;

    document.querySelectorAll('.subtab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            if (activeListeners.hedeflerUnsubscribe) activeListeners.hedeflerUnsubscribe();
            if (activeListeners.odevlerUnsubscribe) activeListeners.odevlerUnsubscribe();
            
            document.querySelectorAll('.subtab-button').forEach(btn => {
                btn.classList.remove('active', 'text-purple-600', 'border-purple-600', 'font-semibold');
                btn.classList.add('text-gray-500');
            });
            e.currentTarget.classList.add('active', 'text-purple-600', 'border-purple-600', 'font-semibold');
            
            const subTabId = e.currentTarget.dataset.subtab;
            if (subTabId === 'hedefler') {
                renderHedeflerSubTab(db, currentUserId, appId, studentId, studentName);
            } else {
                renderOdevlerSubTab(db, currentUserId, appId, studentId, studentName);
            }
        });
    });
    
    renderHedeflerSubTab(db, currentUserId, appId, studentId, studentName);
}

function renderHedeflerSubTab(db, currentUserId, appId, studentId, studentName) {
    const subTabContentArea = document.getElementById('subTabContentArea');
    if (!subTabContentArea) return;
    subTabContentArea.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-semibold text-gray-700">${studentName} - Hedefler</h3>
            <button id="showAddHedefModalButton" class="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center text-sm"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Yeni Hedef Ekle</button>
        </div>
        <div id="hedefListContainer"><p class="text-gray-500 text-center py-4">Hedefler yükleniyor...</p></div>
    `;

    document.getElementById('showAddHedefModalButton').addEventListener('click', () => {
        document.getElementById('hedefModalErrorMessage').classList.add('hidden');
        document.getElementById('hedefTitle').value = '';
        document.getElementById('hedefBitisTarihi').value = '';
        document.getElementById('hedefAciklama').value = '';
        document.getElementById('currentStudentIdForHedef').value = studentId;
        document.getElementById('addHedefModal').style.display = 'block';
    });
    loadHedefler(db, currentUserId, appId, studentId);
}

function renderOdevlerSubTab(db, currentUserId, appId, studentId, studentName) {
    const subTabContentArea = document.getElementById('subTabContentArea');
    if (!subTabContentArea) return;
    subTabContentArea.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-semibold text-gray-700">${studentName} - Ödevler</h3>
            <button id="showAddOdevModalButton" class="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center text-sm"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Yeni Ödev Planla</button>
        </div>
        <div class="bg-blue-50 text-blue-800 p-3 rounded-md mb-4 text-sm flex items-start"><svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p>Ödevler bitiş tarihine göre sıralanır. Rutin ödevler her gün/hafta için ayrı birer görev olarak oluşturulur.</p></div>
        <div id="odevListContainer"><p class="text-gray-500 text-center py-4">Ödevler yükleniyor...</p></div>
    `;
    
    document.getElementById('showAddOdevModalButton').addEventListener('click', () => {
        document.getElementById('odevModalErrorMessage').classList.add('hidden');
        document.getElementById('odevTitle').value = '';
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
        document.getElementById('odevBaslangicTarihi').value = today;
        document.getElementById('odevBitisTarihi').value = tomorrow;
        document.getElementById('odevAciklama').value = '';
        document.getElementById('odevLink').value = '';
        document.querySelector('input[name="odevTuru"][value="serbest"]').checked = true;
        document.getElementById('currentStudentIdForOdev').value = studentId;
        document.getElementById('addOdevModal').style.display = 'block';
    });
    loadOdevler(db, currentUserId, appId, studentId);
}

function loadHedefler(db, currentUserId, appId, studentId) {
    const c = document.getElementById('hedefListContainer');
    if (!c) return;
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "hedefler"), orderBy("olusturmaTarihi", "desc"));
    activeListeners.hedeflerUnsubscribe = onSnapshot(q, (snapshot) => {
        const d = [];
        snapshot.forEach(doc => d.push({ id: doc.id, ...doc.data() }));
        renderHedeflerList(d, db, currentUserId, appId, studentId);
    }, (e) => console.error("Hedefler yüklenirken hata:", e));
}

function loadOdevler(db, currentUserId, appId, studentId) {
    const c = document.getElementById('odevListContainer');
    if (!c) return;
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "odevler"), orderBy("bitisTarihi", "asc"));
    activeListeners.odevlerUnsubscribe = onSnapshot(q, (snapshot) => {
        const d = [];
        snapshot.forEach(doc => d.push({ id: doc.id, ...doc.data() }));
        renderOdevlerList(d, db, currentUserId, appId, studentId);
    }, (e) => console.error("Ödevler yüklenirken hata:", e));
}

function renderHedeflerList(hedefler, db, currentUserId, appId, studentId) {
    const c = document.getElementById('hedefListContainer');
    if (hedefler.length === 0) {
        c.innerHTML = `<p class="text-gray-500 text-center py-4">Henüz hedef oluşturulmamış.</p>`;
        return;
    }
    c.innerHTML = `<div class="space-y-4">
        ${hedefler.map(hedef => `
            <div class="bg-white p-4 rounded-lg shadow-sm border ${hedef.durum === 'tamamlandi' ? 'border-green-200 bg-green-50' : 'border-gray-200'}">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-lg ${hedef.durum === 'tamamlandi' ? 'text-gray-500 line-through' : 'text-gray-800'}">${hedef.title}</h4>
                        <p class="text-sm text-gray-600">${hedef.aciklama || ''}</p>
                        ${hedef.bitisTarihi ? `<p class="text-xs text-gray-500 mt-1">Bitiş: ${hedef.bitisTarihi}</p>` : ''}
                    </div>
                    <div class="flex-shrink-0 ml-4 flex gap-2">
                        <button data-id="${hedef.id}" data-status="${hedef.durum === 'tamamlandi' ? 'devam' : 'tamamlandi'}" class="toggle-hedef-button p-2 rounded-md ${hedef.durum === 'tamamlandi' ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-green-100 text-green-600 hover:bg-green-200'}" title="${hedef.durum === 'tamamlandi' ? 'Geri Al' : 'Tamamla'}">${hedef.durum === 'tamamlandi' ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'}</button>
                        <button data-id="${hedef.id}" class="delete-hedef-button p-2 rounded-md bg-red-100 text-red-600 hover:bg-red-200" title="Sil"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>`;
    c.querySelectorAll('.toggle-hedef-button').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const newStatus = e.currentTarget.dataset.status;
        const ref = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "hedefler", id);
        updateDoc(ref, { durum: newStatus });
    }));
    c.querySelectorAll('.delete-hedef-button').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Bu hedefi silmek istediğinize emin misiniz?')) {
            const ref = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "hedefler", id);
            await deleteDoc(ref);
        }
    }));
}

function renderOdevlerList(odevler, db, currentUserId, appId, studentId) {
    const c = document.getElementById('odevListContainer');
    if (odevler.length === 0) {
        c.innerHTML = `<p class="text-gray-500 text-center py-4">Henüz ödev oluşturulmamış.</p>`;
        return;
    }
    c.innerHTML = `<div class="space-y-4">
        ${odevler.map(odev => {
            const todayStr = new Date().toISOString().split('T')[0];
            const isGecikti = odev.durum !== 'tamamlandi' && odev.bitisTarihi < todayStr;
            let linkHtml = '';
            if (odev.link) {
                const safeLink = odev.link.startsWith('http') ? odev.link : 'https://' + odev.link;
                linkHtml = `<a href="${safeLink}" target="_blank" class="inline-flex items-center mt-2 text-sm text-purple-600 hover:text-purple-800 hover:underline"><svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>Kaynağa Git</a>`;
            }
            let typeBadge = '';
            if (odev.tur === 'gunluk') typeBadge = '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Günlük Rutin</span>';
            else if (odev.tur === 'haftalik') typeBadge = '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Haftalık Rutin</span>';
            return `
            <div class="bg-white p-4 rounded-lg shadow-sm border ${odev.durum === 'tamamlandi' ? 'border-green-200 bg-green-50' : (isGecikti ? 'border-red-200 bg-red-50' : 'border-gray-200')} transition-all hover:shadow-md">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center"><h4 class="font-semibold text-lg ${odev.durum === 'tamamlandi' ? 'text-gray-500 line-through' : 'text-gray-800'}">${odev.title}</h4>${typeBadge}</div>
                        <p class="text-sm text-gray-600 whitespace-pre-wrap mt-1">${odev.aciklama || ''}</p>
                        ${linkHtml}
                        <div class="flex items-center mt-2 text-xs text-gray-500">
                            <span class="mr-3 flex items-center"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>Başlangıç: ${formatDateTR(odev.baslangicTarihi)}</span>
                            <span class="${isGecikti ? 'text-red-600 font-bold' : ''} flex items-center"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Bitiş/Teslim: ${formatDateTR(odev.bitisTarihi)} ${isGecikti ? '(GECİKTİ)' : ''}</span>
                        </div>
                    </div>
                    <div class="flex-shrink-0 ml-4 flex gap-2">
                        <button data-id="${odev.id}" data-status="${odev.durum === 'tamamlandi' ? 'devam' : 'tamamlandi'}" class="toggle-odev-button p-2 rounded-md ${odev.durum === 'tamamlandi' ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-green-100 text-green-600 hover:bg-green-200'}" title="${odev.durum === 'tamamlandi' ? 'Geri Al' : 'Tamamla'}">${odev.durum === 'tamamlandi' ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'}</button>
                        <button data-id="${odev.id}" class="delete-odev-button p-2 rounded-md bg-red-100 text-red-600 hover:bg-red-200" title="Sil"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                </div>
            </div>
        `}).join('')}
    </div>`;
    c.querySelectorAll('.toggle-odev-button').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const newStatus = e.currentTarget.dataset.status;
        const ref = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "odevler", id);
        updateDoc(ref, { durum: newStatus });
    }));
    c.querySelectorAll('.delete-odev-button').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Bu ödevi silmek istediğinize emin misiniz?')) {
            const ref = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "odevler", id);
            await deleteDoc(ref);
        }
    }));
}

export async function saveNewHedef(db, currentUserId, appId) {
    const studentId = document.getElementById('currentStudentIdForHedef').value;
    const title = document.getElementById('hedefTitle').value.trim();
    const bitisTarihi = document.getElementById('hedefBitisTarihi').value;
    const aciklama = document.getElementById('hedefAciklama').value.trim();
    const errorEl = document.getElementById('hedefModalErrorMessage');
    if (!studentId || !title) {
        errorEl.textContent = "Hedef Başlığı zorunludur.";
        errorEl.classList.remove('hidden');
        return;
    }
    const saveButton = document.getElementById('saveHedefButton');
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";
        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "hedefler"), {
            title, bitisTarihi: bitisTarihi || null, aciklama,
            durum: "devam",
            olusturmaTarihi: serverTimestamp()
        });
        document.getElementById('addHedefModal').style.display = 'none';
    } catch (error) {
        console.error("Hedef ekleme hatası:", error);
        errorEl.textContent = `Bir hata oluştu: ${error.message}`;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Hedefi Kaydet";
    }
}

export async function saveNewOdev(db, currentUserId, appId) {
    const studentId = document.getElementById('currentStudentIdForOdev').value;
    const title = document.getElementById('odevTitle').value.trim();
    const baslangicTarihi = document.getElementById('odevBaslangicTarihi').value;
    const bitisTarihi = document.getElementById('odevBitisTarihi').value;
    const aciklama = document.getElementById('odevAciklama').value.trim();
    const link = document.getElementById('odevLink').value.trim();
    const tur = document.querySelector('input[name="odevTuru"]:checked').value;
    const errorEl = document.getElementById('odevModalErrorMessage');

    if (!studentId || !title || !baslangicTarihi || !bitisTarihi) {
        errorEl.textContent = "Başlık ve Tarih aralığı zorunludur.";
        errorEl.classList.remove('hidden');
        return;
    }
    if (baslangicTarihi > bitisTarihi) {
        errorEl.textContent = "Başlangıç tarihi, bitiş tarihinden sonra olamaz.";
        errorEl.classList.remove('hidden');
        return;
    }
    const saveButton = document.getElementById('saveOdevButton');
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Planlanıyor...";
        const batchPromises = [];
        const baseData = {
            title, aciklama, link, tur,
            durum: "devam",
            olusturmaTarihi: serverTimestamp()
        };
        
        if (tur === 'serbest') {
            batchPromises.push(addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "odevler"), {
                ...baseData,
                baslangicTarihi: baslangicTarihi,
                bitisTarihi: bitisTarihi
            }));
        } else if (tur === 'gunluk') {
            let current = new Date(new Date(baslangicTarihi).setUTCHours(0,0,0,0)); // Saat dilimi sorunlarını önle
            const end = new Date(new Date(bitisTarihi).setUTCHours(0,0,0,0));
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                batchPromises.push(addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "odevler"), {
                    ...baseData,
                    baslangicTarihi: dateStr,
                    bitisTarihi: dateStr
                }));
                current.setDate(current.getDate() + 1);
            }
        } else if (tur === 'haftalik') {
            let current = new Date(new Date(baslangicTarihi).setUTCHours(0,0,0,0));
            const end = new Date(new Date(bitisTarihi).setUTCHours(0,0,0,0));
            while (current <= end) {
                const weekStartStr = current.toISOString().split('T')[0];
                let weekEnd = new Date(current);
                weekEnd.setDate(weekEnd.getDate() + 6);
                if (weekEnd > end) {
                    weekEnd = new Date(end);
                }
                const weekEndStr = weekEnd.toISOString().split('T')[0];
                batchPromises.push(addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "odevler"), {
                    ...baseData,
                    baslangicTarihi: weekStartStr,
                    bitisTarihi: weekEndStr
                }));
                current.setDate(current.getDate() + 7);
            }
        }
        await Promise.all(batchPromises);
        document.getElementById('addOdevModal').style.display = 'none';
    } catch (error) {
        console.error("Ödev ekleme hatası:", error);
        errorEl.textContent = `Bir hata oluştu: ${error.message}`;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Planı Oluştur";
    }
}


// --- 4.5. KOÇLUK NOTLARI SEKMESİ ---

function renderKoclukNotlariTab(db, currentUserId, appId, studentId, studentName) {
    const tabContentArea = document.getElementById('tabContentArea');
    if (!tabContentArea) return;
    tabContentArea.innerHTML = `
        <h3 class="text-xl font-semibold text-gray-700 mb-4">Koçluk Notları (Sadece Siz Görürsünüz)</h3>
        <div class="bg-white p-4 rounded-lg shadow-sm mb-6">
            <textarea id="newNotIcerik" rows="4" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="${studentName} ile ilgili yeni bir not ekle..."></textarea>
            <p id="newNotErrorMessage" class="text-sm text-red-600 hidden"></p>
            <div class="flex justify-end mt-2">
                <button id="saveNewNotButton" class="bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700">Notu Kaydet</button>
            </div>
        </div>
        <div id="notListContainer">
            <p class="text-gray-500 text-center py-4">Notlar yükleniyor...</p>
        </div>
    `;
    
    document.getElementById('saveNewNotButton').addEventListener('click', () => {
        saveNewKoclukNotu(db, currentUserId, appId, studentId);
    });
    
    loadKoclukNotlari(db, currentUserId, appId, studentId);
}

function loadKoclukNotlari(db, currentUserId, appId, studentId) {
    const c = document.getElementById('notListContainer');
    if (!c) return;
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "koclukNotlari"), orderBy("tarih", "desc"));
    activeListeners.notlarUnsubscribe = onSnapshot(q, (snapshot) => {
        const d = [];
        snapshot.forEach(doc => d.push({ id: doc.id, ...doc.data() }));
        renderKoclukNotlariList(d, db, currentUserId, appId, studentId);
    }, (e) => console.error("Koçluk notları yüklenirken hata:", e));
}

function renderKoclukNotlariList(notlar, db, currentUserId, appId, studentId) {
    const c = document.getElementById('notListContainer');
    if (notlar.length === 0) {
        c.innerHTML = `<p class="text-gray-500 text-center py-4">Henüz koçluk notu eklenmemiş.</p>`;
        return;
    }
    c.innerHTML = `<div class="space-y-4">
        ${notlar.map(not => `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div class="flex justify-between items-center mb-2">
                    <p class="text-sm font-semibold text-gray-700">${not.tarih.toDate().toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}</p>
                    <button data-id="${not.id}" class="delete-not-button p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-100" title="Notu Sil">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <p class="text-gray-800 whitespace-pre-wrap">${not.icerik}</p>
            </div>
        `).join('')}
    </div>`;
    
    c.querySelectorAll('.delete-not-button').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Bu koçluk notunu silmek istediğinize emin misiniz?')) {
            const ref = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "koclukNotlari", id);
            await deleteDoc(ref);
        }
    }));
}

export async function saveNewKoclukNotu(db, currentUserId, appId, studentId) {
    const icerikEl = document.getElementById('newNotIcerik');
    const errorEl = document.getElementById('newNotErrorMessage');
    const saveButton = document.getElementById('saveNewNotButton');
    const icerik = icerikEl.value.trim();
    
    if (!icerik) {
        errorEl.textContent = "Not içeriği boş olamaz.";
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";
        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "koclukNotlari"), {
            icerik: icerik,
            tarih: serverTimestamp()
        });
        icerikEl.value = "";
    } catch (error) {
        console.error("Koçluk notu ekleme hatası:", error);
        errorEl.textContent = `Bir hata oluştu: ${error.message}`;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Notu Kaydet";
    }
}


// --- 4.6. ÖĞRENCİ DÜZENLEME (MODAL) ---

async function showEditStudentModal(db, currentUserId, appId, studentId) {
    const errorEl = document.getElementById('editModalErrorMessage');
    errorEl.classList.add('hidden');
    
    try {
        const studentDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
        const docSnap = await getDoc(studentDocRef);
        if (docSnap.exists()) {
            const studentData = docSnap.data();
            document.getElementById('editStudentName').value = studentData.ad;
            document.getElementById('editStudentSurname').value = studentData.soyad;
            document.getElementById('editStudentClass').value = studentData.sinif;
            document.getElementById('editStudentId').value = studentId;
            const mevcutDersler = studentData.takipDersleri || [];
            renderDersSecimi(studentData.sinif, document.getElementById('editStudentDersSecimiContainer'), mevcutDersler);
            document.getElementById('editStudentModal').style.display = 'block';
        } else {
            alert("Öğrenci verisi bulunamadı.");
        }
    } catch (error) {
        console.error("Öğrenci verisi çekerken hata: ", error);
        alert("Veri yüklenirken bir hata oluştu.");
    }
}

export async function saveStudentChanges(db, currentUserId, appId) {
    const studentId = document.getElementById('editStudentId').value;
    const ad = document.getElementById('editStudentName').value.trim();
    const soyad = document.getElementById('editStudentSurname').value.trim();
    const sinif = document.getElementById('editStudentClass').value;
    const errorEl = document.getElementById('editModalErrorMessage');
    
    const selectedDersler = [];
    document.getElementById('editStudentDersSecimiContainer').querySelectorAll('.student-ders-checkbox:checked').forEach(cb => {
        selectedDersler.push(cb.value);
    });
    
    if (!studentId || !ad || !soyad) {
        errorEl.textContent = "Ad ve Soyad alanları zorunludur.";
        errorEl.classList.remove('hidden');
        return;
    }
    
    const saveButton = document.getElementById('saveStudentChangesButton');
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";
        
        const studentDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
        await updateDoc(studentDocRef, {
            ad, soyad, sinif,
            takipDersleri: selectedDersler
        });
        
        document.getElementById('editStudentModal').style.display = 'none';
        
        // Arayüzü canlı güncelle
        const headerName = document.getElementById('studentDetailName');
        if (headerName && document.getElementById('mainContentTitle').textContent.includes("Detay Profili")) {
             renderOgrenciDetaySayfasi(db, currentUserId, appId, studentId, `${ad} ${soyad}`);
        }
        
    } catch (error) {
        console.error("Öğrenci güncelleme hatası: ", error);
        errorEl.textContent = `Bir hata oluştu: ${error.message}`;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Değişiklikleri Kaydet";
    }
}
