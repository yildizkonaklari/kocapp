// === ANA SAYFA (DASHBOARD) MODÜLÜ ===

import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    getDocs,
    collectionGroup, // YENİ: Gecikmiş ödevler ve onaylar için
    limit
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// helpers.js'den import edilen fonksiyonlar
import { 
    activeListeners, 
    formatCurrency, 
    renderDersSecimi, 
    populateStudentSelect 
} from './helpers.js';

/**
 * Ana Sayfa (Dashboard) arayüzünü çizer ve verileri yükler.
 * @param {object} db - Firestore veritabanı referansı
 * @param {string} currentUserId - Giriş yapmış koçun UID'si
 * @param {string} appId - Uygulama ID'si
 */
export function renderAnaSayfa(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Kontrol Paneli";
    
    // 1. İskeleti Oluştur
    mainContentArea.innerHTML = `
        <!-- Hoşgeldin Banner -->
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg mb-8 flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold mb-1">Hoş geldin, Hocam! 👋</h2>
                <p class="text-purple-100 text-sm">Bugün öğrencilerinin başarısı için harika bir gün.</p>
            </div>
            <div class="hidden md:block text-right">
                <p class="text-3xl font-bold" id="dashDateDay">--</p>
                <p class="text-sm text-purple-200" id="dashDateFull">--</p>
            </div>
        </div>

        <!-- GÜNCELLENDİ: KPI Kartları (4 Kart) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- Kart 1: Öğrenciler -->
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-users"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Aktif Öğrenci</p><h3 class="text-2xl font-bold text-gray-800" id="dashTotalStudent">...</h3></div>
            </div>
            <!-- Kart 2: Bugünkü Randevular -->
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-regular fa-calendar-check"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Bugünkü Randevular</p><h3 class="text-2xl font-bold text-gray-800" id="dashTodayAppt">...</h3></div>
            </div>
            <!-- YENİ Kart 3: Gecikmiş Ödevler -->
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-calendar-times"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Gecikmiş Ödevler</p><h3 class="text-2xl font-bold text-red-600" id="dashPendingOdev">...</h3></div>
            </div>
            <!-- YENİ Kart 4: Onay Bekleyenler -->
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-hourglass-half"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Onay Bekleyenler</p><h3 class="text-2xl font-bold text-yellow-600" id="dashPendingOnay">...</h3></div>
            </div>
        </div>

        <!-- Ana İçerik Izgarası -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- SOL KOLON (Geniş): BUGÜNKÜ PROGRAM -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2"><span class="w-2 h-6 bg-orange-500 rounded-full"></span>Bugünkü Programım</h3>
                        <button id="btnDashGoAjanda" class="text-sm text-purple-600 hover:text-purple-800 font-medium">Tümünü Gör</button>
                    </div>
                    <div id="dashAgendaList" class="p-2 max-h-80 overflow-y-auto"><p class="text-center text-gray-400 py-8">Yükleniyor...</p></div>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100"><h3 class="font-bold text-gray-800 flex items-center gap-2"><span class="w-2 h-6 bg-blue-500 rounded-full"></span>Öğrenci Durum Özeti</h3></div>
                    <div class="overflow-x-auto"><table class="min-w-full text-sm text-left"><thead class="bg-gray-50 text-gray-500 font-medium"><tr><th class="px-6 py-3">Öğrenci</th><th class="px-6 py-3">Sınıf</th><th class="px-6 py-3 text-center">İşlem</th></tr></thead><tbody id="dashStudentTableBody" class="divide-y divide-gray-100"></tbody></table></div>
                </div>
            </div>

            <!-- SAĞ KOLON (Dar): HIZLI EYLEMLER -->
            <div class="space-y-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 class="font-bold text-gray-800 mb-4">Hızlı İşlemler</h3>
                    <div class="space-y-3">
                        <button id="btnDashAddStudent" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors group"><div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 group-hover:bg-purple-600 group-hover:text-white transition-colors"><i class="fa-solid fa-user-plus"></i></div><span class="font-medium text-gray-700 group-hover:text-purple-700">Yeni Öğrenci Ekle</span></button>
                        <button id="btnDashAddRandevu" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-200 transition-colors group"><div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-3 group-hover:bg-orange-600 group-hover:text-white transition-colors"><i class="fa-regular fa-calendar-plus"></i></div><span class="font-medium text-gray-700 group-hover:text-orange-700">Randevu Oluştur</span></button>
                        
                        <!-- GÜNCELLENDİ: Mesaj Sayacı Eklendi -->
                        <button id="btnDashGoMesajlar" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group relative">
                            <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors"><i class="fa-regular fa-envelope"></i></div>
                            <span class="font-medium text-gray-700 group-hover:text-blue-700">Mesajları Oku</span>
                            <span id="dashUnreadCount" class="hidden absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">0</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- 2. TARİH BİLGİSİ ---
    const now = new Date();
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    document.getElementById('dashDateDay').textContent = days[now.getDay()];
    document.getElementById('dashDateFull').textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    // --- 3. HIZLI EYLEM BUTONLARI ---
    document.getElementById('btnDashAddStudent').addEventListener('click', () => {
        document.getElementById('studentName').value = '';
        document.getElementById('studentSurname').value = '';
        document.getElementById('studentClass').value = '12. Sınıf';
        document.getElementById('modalErrorMessage').classList.add('hidden');
        renderDersSecimi('12. Sınıf', document.getElementById('studentDersSecimiContainer'));
        document.getElementById('addStudentModal').style.display = 'block';
    });
    
    document.getElementById('btnDashAddRandevu').addEventListener('click', async () => {
        await populateStudentSelect(db, currentUserId, appId, 'randevuStudentId');
        document.getElementById('randevuBaslik').value = 'Birebir Koçluk';
        document.getElementById('randevuTarih').value = new Date().toISOString().split('T')[0];
        document.getElementById('randevuBaslangic').value = '09:00';
        document.getElementById('randevuBitis').value = '10:00';
        document.getElementById('addRandevuModal').style.display = 'block';
    });
    
    document.getElementById('btnDashGoAjanda').addEventListener('click', () => document.getElementById('nav-ajandam').click());
    document.getElementById('btnDashGoMesajlar').addEventListener('click', () => document.getElementById('nav-mesajlar').click());

    // --- 4. VERİLERİ YÜKLE ---
    loadDashboardStats(db, currentUserId, appId);
    loadTodayAgenda(db, currentUserId, appId);
    loadPendingOdevler(db, currentUserId, appId); // YENİ
    loadPendingOnaylar(db, currentUserId, appId); // YENİ
    loadUnreadMessages(db, currentUserId, appId); // YENİ
}

/**
 * KPI Kartı 1: Aktif Öğrenciler ve Bekleyen Alacak
 */
function loadDashboardStats(db, currentUserId, appId) {
    const studentTableBody = document.getElementById('dashStudentTableBody');
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    activeListeners.studentUnsubscribe = onSnapshot(q, (snapshot) => {
        let totalStudents = 0, totalAlacak = 0, tableHtml = '';
        snapshot.forEach(doc => {
            const s = doc.data();
            totalStudents++;
            const bakiye = (s.toplamBorc || 0) - (s.toplamOdenen || 0);
            if (bakiye > 0) totalAlacak += bakiye;
            
            // Sadece ilk 5 öğrenciyi listele (performans için)
            if (totalStudents <= 5) {
                tableHtml += `
                    <tr class="hover:bg-gray-50 transition-colors group cursor-pointer dash-student-link" data-id="${doc.id}" data-name="${s.ad} ${s.soyad}">
                        <td class="px-6 py-3 whitespace-nowrap"><div class="flex items-center"><div class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold mr-3 group-hover:bg-purple-100 group-hover:text-purple-600">${s.ad[0]}${s.soyad[0]}</div><div><div class="text-sm font-medium text-gray-900">${s.ad} ${s.soyad}</div></div></div></td>
                        <td class="px-6 py-3 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700">${s.sinif}</span></td>
                        <td class="px-6 py-3 whitespace-nowrap text-center text-sm text-gray-500"><i class="fa-solid fa-chevron-right text-xs text-gray-300 group-hover:text-purple-500"></i></td>
                    </tr>
                `;
            }
        });

        document.getElementById('dashTotalStudent').textContent = totalStudents;
        // document.getElementById('dashPendingPayment').textContent = formatCurrency(totalAlacak); // Bu kartı kaldırdık
        studentTableBody.innerHTML = tableHtml || '<tr><td colspan="3" class="text-center py-4 text-gray-400">Henüz öğrenci yok.</td></tr>';
    
        studentTableBody.querySelectorAll('.dash-student-link').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.dataset.id;
                const studentName = e.currentTarget.dataset.name;
                window.renderOgrenciDetaySayfasi(studentId, studentName); // app.js'deki global fonk.
            });
        });
        
    }, (error) => {
        console.error("Dashboard istatistikleri yüklenirken hata:", error);
        document.getElementById('dashTotalStudent').textContent = 'Hata';
        // document.getElementById('dashPendingPayment').textContent = 'Hata';
    });
}

/**
 * KPI Kartı 2: Bugünkü Randevular
 */
function loadTodayAgenda(db, currentUserId, appId) {
    const listContainer = document.getElementById('dashAgendaList');
    const todayStr = new Date().toISOString().split('T')[0];
    
    const q = query(
        collection(db, "artifacts", appId, "users", currentUserId, "ajandam"),
        where("tarih", "==", todayStr),
        orderBy("baslangic")
    );
    
    activeListeners.ajandaUnsubscribe = onSnapshot(q, (snapshot) => {
        let count = 0, html = '';
        snapshot.forEach(doc => {
            const randevu = doc.data();
            count++;
            html += `
                <div class="flex items-start p-3 bg-orange-50 rounded-lg border border-orange-100 mb-2 relative overflow-hidden group cursor-pointer hover:shadow-sm transition-shadow">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-orange-400"></div>
                    <div class="ml-2 flex-1">
                        <div class="flex justify-between items-center">
                            <h4 class="font-bold text-gray-800 text-sm">${randevu.ogrenciAd}</h4>
                            <span class="text-xs font-mono text-orange-700 bg-orange-100 px-2 py-0.5 rounded">${randevu.baslangic} - ${randevu.bitis}</span>
                        </div>
                        <p class="text-xs text-gray-600 mt-1 line-clamp-1">${randevu.baslik}</p>
                    </div>
                </div>
            `;
        });
        document.getElementById('dashTodayAppt').textContent = count;
        listContainer.innerHTML = html || `<div class="flex flex-col items-center justify-center py-6 text-gray-400"><i class="fa-regular fa-calendar text-3xl mb-2 opacity-30"></i><p class="text-sm">Bugün için planlanmış randevu yok.</p></div>`;
    
    }, (error) => {
        console.error("Bugünkü ajanda yüklenirken hata:", error);
        listContainer.innerHTML = `<p class="text-red-500 text-center py-4">Ajanda yüklenemedi.</p>`;
    });
}

/**
 * YENİ: KPI Kartı 3: Gecikmiş Ödevler
 * Bu fonksiyon çalışmadan önce 'ogrencilerim.js' içindeki saveNewOdev fonksiyonuna 'kocId' eklenmelidir!
 * Ve Firestore kuralları güncellenmelidir!
 */
function loadPendingOdevler(db, currentUserId, appId) {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const q = query(
        collectionGroup(db, 'odevler'), // TÜM 'odevler' alt koleksiyonlarında ara
        where('kocId', '==', currentUserId),
        where('durum', '!=', 'tamamlandi'),
        where('bitisTarihi', '<', todayStr)
    );

    activeListeners.pendingOdevUnsubscribe = onSnapshot(q, (snapshot) => {
        document.getElementById('dashPendingOdev').textContent = snapshot.size;
    }, (error) => {
        console.error("Gecikmiş ödevler yüklenirken hata (İndeks veya kural eksik olabilir):", error.message);
        document.getElementById('dashPendingOdev').textContent = "Hata";
    });
}

/**
 * YENİ: KPI Kartı 4: Onay Bekleyenler (Sorular + Denemeler)
 * Bu fonksiyon çalışmadan önce 'student-app.js' dosyaları 'kocId' eklemelidir!
 * Ve Firestore kuralları güncellenmelidir!
 */
function loadPendingOnaylar(db, currentUserId, appId) {
    let pendingSoru = 0;
    let pendingDeneme = 0;
    const countEl = document.getElementById('dashPendingOnay');

    const updateCount = () => {
        countEl.textContent = pendingSoru + pendingDeneme;
    };

    // 1. Onay bekleyen sorular
    const qSoru = query(
        collectionGroup(db, 'soruTakibi'),
        where('kocId', '==', currentUserId),
        where('onayDurumu', '==', 'bekliyor')
    );
    activeListeners.pendingSoruUnsubscribe = onSnapshot(qSoru, (snapshot) => {
        pendingSoru = snapshot.size;
        updateCount();
    }, (error) => {
        console.error("Onay bekleyen sorular yüklenirken hata:", error.message);
        countEl.textContent = "Hata";
    });

    // 2. Onay bekleyen denemeler
    const qDeneme = query(
        collectionGroup(db, 'denemeler'),
        where('kocId', '==', currentUserId),
        where('onayDurumu', '==', 'bekliyor')
    );
    activeListeners.pendingDenemeUnsubscribe = onSnapshot(qDeneme, (snapshot) => {
        pendingDeneme = snapshot.size;
        updateCount();
    }, (error) => {
        console.error("Onay bekleyen denemeler yüklenirken hata:", error.message);
        countEl.textContent = "Hata";
    });
}

/**
 * YENİ: Okunmamış Mesaj Sayacı
 * Bu fonksiyon çalışmadan önce 'student-app.js' (mesaj gönderirken) ve
 * 'modules/mesajlar.js' (mesaj okurken) 'kocId' ve 'okundu' alanlarını eklemelidir!
 */
function loadUnreadMessages(db, currentUserId, appId) {
    const countEl = document.getElementById('dashUnreadCount');

    const q = query(
        collectionGroup(db, 'mesajlar'),
        where('kocId', '==', currentUserId),
        where('gonderen', '==', 'ogrenci'),
        where('okundu', '==', false)
    );

    activeListeners.unreadMessagesUnsubscribe = onSnapshot(q, (snapshot) => {
        const count = snapshot.size;
        if (count > 0) {
            countEl.textContent = count > 9 ? '9+' : count;
            countEl.classList.remove('hidden');
        } else {
            countEl.classList.add('hidden');
        }
    }, (error) => {
        console.error("Okunmamış mesajlar yüklenirken hata:", error.message);
        countEl.classList.add('hidden');
    });
}
