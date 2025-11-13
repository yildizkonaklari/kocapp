// === ÖĞRENCİLERİM MODÜLÜ ===
// Bu dosya, öğrenciler, öğrenci listesi, öğrenci detay profili
// ve alt sekmeleriyle (deneme, soru, hedef vb.) ilgili tüm fonksiyonları içerir.

import { 
    doc, getDoc, addDoc, updateDoc, collection, query, 
    onSnapshot, deleteDoc, orderBy, where, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    activeListeners, 
    formatCurrency, 
    formatDateTR, 
    SINAV_DERSLERI, 
    renderDersSecimi // renderDersSecimi helpers'dan import ediliyor
} from './helpers.js';

// Global (Modül İçi) Değişkenler
let soruTakibiZaman = 'haftalik'; 
let soruTakibiOffset = 0; 

// --- 1. ANA FONKSİYON: ÖĞRENCİ LİSTESİ SAYFASI ---
export function renderOgrenciSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    if (!currentUserId) return;
    mainContentTitle.textContent = "Öğrencilerim";
    mainContentArea.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div class="relative w-full md:w-1/3">
                <input type="text" id="searchStudentInput" placeholder="Öğrenci ara (Ad, Soyad...)" class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>
            <button id="showAddStudentModalButton" class="w-full md:w-auto bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Yeni Öğrenci Ekle
            </button>
        </div>
        <div id="studentListContainer" class="bg-white p-4 rounded-lg shadow">
            <p class="text-gray-500 text-center py-4">Öğrenciler yükleniyor...</p>
        </div>
    `;
    
    document.getElementById('showAddStudentModalButton').addEventListener('click', () => {
        document.getElementById('studentName').value = '';
        document.getElementById('studentSurname').value = '';
        const defaultClass = '12. Sınıf';
        document.getElementById('studentClass').value = defaultClass;
        renderDersSecimi(defaultClass, document.getElementById('studentDersSecimiContainer')); // Dersleri yükle
        document.getElementById('modalErrorMessage').classList.add('hidden');
        document.getElementById('addStudentModal').style.display = 'block';
    });
    
    loadOgrenciler(db, currentUserId, appId);
}

function loadOgrenciler(db, currentUserId, appId) {
    const studentListContainer = document.getElementById('studentListContainer');
    if (!studentListContainer) return;
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim"));
    
    activeListeners.studentUnsubscribe = onSnapshot(q, (querySnapshot) => {
        const students = [];
        querySnapshot.forEach((doc) => {
            students.push({ id: doc.id, ...doc.data() });
        });
        renderStudentList(students, db, currentUserId, appId); // db vs. geçilmeli
    }, (error) => {
        console.error("Öğrencileri yüklerken hata:", error);
        studentListContainer.innerHTML = `<p class="text-red-500 text-center py-4">Veri okuma izni alınamadı. Güvenlik kurallarınızı kontrol edin.</p>`;
    });
}

function renderStudentList(students, db, currentUserId, appId) {
    const studentListContainer = document.getElementById('studentListContainer');
    if (students.length === 0) {
        studentListContainer.innerHTML = `<p class="text-gray-500 text-center py-4">Henüz öğrenci eklememişsiniz. "Yeni Öğrenci Ekle" butonu ile başlayın.</p>`;
        return;
    }
    studentListContainer.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bakiye</th>
                        <th scope="col" class="relative px-6 py-3"><span class="sr-only">Eylemler</span></th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${students.map(student => {
                        const bakiye = (student.toplamBorc || 0) - (student.toplamOdenen || 0);
                        let bakiyeClass = 'text-gray-500';
                        if (bakiye > 0) bakiyeClass = 'text-red-600 font-medium';
                        if (bakiye < 0) bakiyeClass = 'text-green-600 font-medium';
                        
                        return `
                        <tr id="student-row-${student.id}">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0 h-10 w-10 bg-purple-100 text-purple-600 flex items-center justify-center rounded-full font-bold">
                                        ${student.ad[0] || ''}${student.soyad[0] || ''}
                                    </div>
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-gray-900">${student.ad} ${student.soyad}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    ${student.sinif}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm ${bakiyeClass}">
                                ${formatCurrency(bakiye)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button data-id="${student.id}" data-ad="${student.ad} ${student.soyad}" class="profil-gor-button text-purple-600 hover:text-purple-900">Profili Gör</button>
                                <button data-id="${student.id}" class="delete-student-button text-red-600 hover:text-red-900 ml-4">Sil</button>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    document.querySelectorAll('.delete-student-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const studentId = e.target.dataset.id;
            if (confirm("Bu öğrenciyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
                try {
                    const studentDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
                    await deleteDoc(studentDocRef);
                } catch (error) {
                    console.error("Silme hatası:", error);
                    alert("Öğrenci silinirken bir hata oluştu.");
                }
            }
        });
    });

    document.querySelectorAll('.profil-gor-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const studentId = e.target.dataset.id;
            const studentName = e.target.dataset.ad;
            renderOgrenciDetaySayfasi(db, currentUserId, appId, studentId, studentName);
        });
    });
}

export async function saveNewStudent(db, currentUserId, appId) {
    const ad = document.getElementById('studentName').value.trim();
    const soyad = document.getElementById('studentSurname').value.trim();
    const sinif = document.getElementById('studentClass').value;
    
    const selectedDersler = [];
    document.getElementById('studentDersSecimiContainer').querySelectorAll('.student-ders-checkbox:checked').forEach(cb => {
        selectedDersler.push(cb.value);
    });

    if (!ad || !soyad) {
        document.getElementById('modalErrorMessage').textContent = "Ad ve Soyad alanları zorunludur.";
        document.getElementById('modalErrorMessage').classList.remove('hidden');
        return;
    }
    const saveButton = document.getElementById('saveStudentButton');
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";
        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim"), {
            ad: ad,
            soyad: soyad,
            sinif: sinif,
            takipDersleri: selectedDersler,
            olusturmaTarihi: serverTimestamp(),
            toplamBorc: 0,
            toplamOdenen: 0
        });
        document.getElementById('addStudentModal').style.display = 'none';
    } catch (error) {
        console.error("Öğrenci ekleme hatası: ", error);
        document.getElementById('modalErrorMessage').textContent = `Bir hata oluştu: ${error.message}`;
        document.getElementById('modalErrorMessage').classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Kaydet";
    }
}


// --- 2. ÖĞRENCİ DETAY SAYFASI ---
export function renderOgrenciDetaySayfasi(db, currentUserId, appId, studentId, studentName) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = `${studentName} - Detay Profili`;
    
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
                <button id="btnStudentRandevuPlanla" class="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 border border-green-200 flex items-center">
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
    document.getElementById('btnStudentRandevuPlanla').addEventListener('click', async () => {
        const modal = document.getElementById('addRandevuModal');
        const selectId = 'randevuStudentId';
        await populateStudentSelect(db, currentUserId, appId, selectId);
        document.getElementById(selectId).value = studentId;
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
                default: renderPlaceholderTab(tabId); break;
            }
        });
    });
    
    renderOzetTab(db, currentUserId, appId, studentId); // Varsayılanı yükle
}

// --- 2.1. ÖZET SEKMESİ ---
async function renderOzetTab(db, currentUserId, appId, studentId) {
    const tabContentArea = document.getElementById('tabContentArea');
    if (!tabContentArea) return;
    tabContentArea.innerHTML = `<p class="text-gray-600 p-4">Öğrenci detayları yükleniyor...</p>`;
    try {
        const studentDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
        const docSnap = await getDoc(studentDocRef);
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

// --- 2.2. DENEMELER SEKMESİ ---
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
    
    activeListeners.studentUnsubscribe = onSnapshot(q, (snapshot) => {
        const denemeler = [];
        snapshot.forEach(doc => denemeler.push({ id: doc.id, ...doc.data() }));
        renderDenemeList(denemeler, db, currentUserId, appId, studentId);
    }, (error) => {
        console.error("Deneme yükleme hatası:", error);
        container.innerHTML = `<p class="text-red-500 text-center py-4">Hata: ${error.message}</p>`;
    });
      }
