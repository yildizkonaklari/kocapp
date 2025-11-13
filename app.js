// ... (Mevcut importlar ve kodlar) ...

// ÖNEMLİ: Firestore import listesine 'limit' ve 'orderBy' eklediğinizden emin olun.
// import { ..., limit, orderBy, startAt, endAt } from ...

// === 1. ANA SAYFA (DASHBOARD) ===

async function renderAnaSayfa() {
    mainContentTitle.textContent = "Kontrol Paneli";
    
    // Temizlik
    if (typeof studentUnsubscribe !== 'undefined' && studentUnsubscribe) studentUnsubscribe();
    if (typeof ajandaUnsubscribe !== 'undefined' && ajandaUnsubscribe) ajandaUnsubscribe();
    if (typeof hedeflerUnsubscribe !== 'undefined' && hedeflerUnsubscribe) hedeflerUnsubscribe();

    // 1. İSKELETİ OLUŞTUR
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

        <!-- KPI Kartları (Özet Bilgiler) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <!-- Kart 1: Öğrenciler -->
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl mr-4">
                    <i class="fa-solid fa-users"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">Aktif Öğrenci</p>
                    <h3 class="text-2xl font-bold text-gray-800" id="dashTotalStudent">...</h3>
                </div>
            </div>

            <!-- Kart 2: Bugünkü Randevular -->
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl mr-4">
                    <i class="fa-regular fa-calendar-check"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">Bugünkü Randevular</p>
                    <h3 class="text-2xl font-bold text-gray-800" id="dashTodayAppt">...</h3>
                </div>
            </div>

            <!-- Kart 3: Bekleyen Ödemeler (Basit Özet) -->
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl mr-4">
                    <i class="fa-solid fa-turkish-lira-sign"></i>
                </div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">Bekleyen Alacak</p>
                    <h3 class="text-2xl font-bold text-gray-800" id="dashPendingPayment">...</h3>
                </div>
            </div>
        </div>

        <!-- Ana İçerik Izgarası -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- SOL KOLON (Geniş): BUGÜNKÜ PROGRAM -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2">
                            <span class="w-2 h-6 bg-orange-500 rounded-full"></span>
                            Bugünkü Programım
                        </h3>
                        <button onclick="renderAjandaSayfasi()" class="text-sm text-purple-600 hover:text-purple-800 font-medium">Tümünü Gör</button>
                    </div>
                    <div id="dashAgendaList" class="p-2 max-h-80 overflow-y-auto">
                        <p class="text-center text-gray-400 py-8">Yükleniyor...</p>
                    </div>
                </div>

                <!-- Hızlı Öğrenci Durumları -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2">
                            <span class="w-2 h-6 bg-blue-500 rounded-full"></span>
                            Öğrenci Durum Özeti
                        </h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm text-left">
                            <thead class="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th class="px-6 py-3">Öğrenci</th>
                                    <th class="px-6 py-3">Sınıf</th>
                                    <th class="px-6 py-3 text-center">İşlem</th>
                                </tr>
                            </thead>
                            <tbody id="dashStudentTableBody" class="divide-y divide-gray-100">
                                <!-- JS ile dolacak -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- SAĞ KOLON (Dar): HIZLI EYLEMLER ve DUYURULAR -->
            <div class="space-y-6">
                
                <!-- Hızlı Eylemler -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 class="font-bold text-gray-800 mb-4">Hızlı İşlemler</h3>
                    <div class="space-y-3">
                        <button id="btnDashAddStudent" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors group">
                            <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <i class="fa-solid fa-user-plus"></i>
                            </div>
                            <span class="font-medium text-gray-700 group-hover:text-purple-700">Yeni Öğrenci Ekle</span>
                        </button>
                        <button id="btnDashAddRandevu" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-200 transition-colors group">
                            <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-3 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                <i class="fa-regular fa-calendar-plus"></i>
                            </div>
                            <span class="font-medium text-gray-700 group-hover:text-orange-700">Randevu Oluştur</span>
                        </button>
                        <button onclick="renderMesajlarSayfasi()" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                            <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <i class="fa-regular fa-envelope"></i>
                            </div>
                            <span class="font-medium text-gray-700 group-hover:text-blue-700">Mesajları Oku</span>
                        </button>
                    </div>
                </div>

                <!-- Motivasyon / Not Alanı -->
                <div class="bg-gradient-to-b from-yellow-50 to-white rounded-xl shadow-sm border border-yellow-100 p-5 relative overflow-hidden">
                    <div class="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-yellow-200 rounded-full opacity-20 blur-xl"></div>
                    <h3 class="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                        <i class="fa-regular fa-lightbulb"></i> Hatırlatma
                    </h3>
                    <p class="text-sm text-gray-600 italic">"Planlamada başarısız olan, başarısızlığı planlıyor demektir."</p>
                    <p class="text-xs text-gray-400 mt-2 text-right">- Benjamin Franklin</p>
                </div>

            </div>
        </div>
    `;

    // --- TARİH BİLGİSİ ---
    const now = new Date();
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    document.getElementById('dashDateDay').textContent = days[now.getDay()];
    document.getElementById('dashDateFull').textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    // --- HIZLI EYLEM BUTONLARI ---
    document.getElementById('btnDashAddStudent').addEventListener('click', () => {
        // Öğrenci ekleme modalını aç (varsa)
        if(document.getElementById('showAddStudentModalButton')) document.getElementById('showAddStudentModalButton').click();
    });
    document.getElementById('btnDashAddRandevu').addEventListener('click', () => {
        // Randevu modalını aç ve öğrenci listesini doldur
        populateStudentSelect('randevuStudentId'); 
        document.getElementById('addRandevuModal').style.display = 'block';
    });

    // --- VERİLERİ YÜKLE ---
    loadDashboardStats();
    loadTodayAgenda();
}

// --- DASHBOARD VERİ ÇEKME FONKSİYONLARI ---

// 1. İstatistikler ve Öğrenci Listesi
function loadDashboardStats() {
    const studentTableBody = document.getElementById('dashStudentTableBody');
    
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    // Tek seferlik çekim yeterli dashboard için (onSnapshot yerine getDocs da olabilir ama canlı olması iyidir)
    // Ancak performans için burada onSnapshot kullanıp, unsubscribe'ı yönetmek gerekir.
    // Basitlik için onSnapshot kullanalım ve `studentUnsubscribe` global değişkenine atayalım (zaten yukarıda temizliyoruz).
    
    studentUnsubscribe = onSnapshot(q, (snapshot) => {
        let totalStudents = 0;
        let totalAlacak = 0;
        let tableHtml = '';

        snapshot.forEach(doc => {
            const s = doc.data();
            totalStudents++;
            
            // Bakiye hesabı
            const bakiye = (s.toplamBorc || 0) - (s.toplamOdenen || 0);
            if (bakiye > 0) totalAlacak += bakiye;

            // Tabloya ilk 5 öğrenciyi ekleyelim (veya hepsini, scroll var)
            // Basit bir liste görünümü
            tableHtml += `
                <tr class="hover:bg-gray-50 transition-colors group cursor-pointer" onclick="renderOgrenciDetaySayfasi('${doc.id}', '${s.ad} ${s.soyad}')">
                    <td class="px-6 py-3 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold mr-3 group-hover:bg-purple-100 group-hover:text-purple-600">
                                ${s.ad[0]}${s.soyad[0]}
                            </div>
                            <div>
                                <div class="text-sm font-medium text-gray-900">${s.ad} ${s.soyad}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-3 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700">
                            ${s.sinif}
                        </span>
                    </td>
                    <td class="px-6 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                        <i class="fa-solid fa-chevron-right text-xs text-gray-300 group-hover:text-purple-500"></i>
                    </td>
                </tr>
            `;
        });

        document.getElementById('dashTotalStudent').textContent = totalStudents;
        document.getElementById('dashPendingPayment').textContent = formatCurrency(totalAlacak); // formatCurrency app.js içinde tanımlı olmalı
        studentTableBody.innerHTML = tableHtml || '<tr><td colspan="3" class="text-center py-4 text-gray-400">Henüz öğrenci yok.</td></tr>';
    });
}

// 2. Bugünkü Ajanda
function loadTodayAgenda() {
    const listContainer = document.getElementById('dashAgendaList');
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const q = query(
        collection(db, "koclar", currentUserId, "ajandam"),
        where("tarih", "==", todayStr),
        orderBy("baslangic")
    );

    // Ajanda için ayrı bir unsubscribe değişkeni kullanabiliriz veya tek seferlik çekebiliriz.
    // Canlı takip için onSnapshot iyidir.
    ajandaUnsubscribe = onSnapshot(q, (snapshot) => {
        let count = 0;
        let html = '';

        snapshot.forEach(doc => {
            const randevu = doc.data();
            count++;
            
            // Saat formatlama
            const start = randevu.baslangic; // "09:00"
            const end = randevu.bitis;

            // Durum rengi (Basitçe hepsi mavi şimdilik)
            const borderClass = 'border-l-4 border-orange-400';

            html += `
                <div class="flex items-start p-3 bg-orange-50 rounded-lg border border-orange-100 mb-2 relative overflow-hidden group cursor-pointer hover:shadow-sm transition-shadow">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-orange-400"></div>
                    <div class="ml-2 flex-1">
                        <div class="flex justify-between items-center">
                            <h4 class="font-bold text-gray-800 text-sm">${randevu.ogrenciAd}</h4>
                            <span class="text-xs font-mono text-orange-700 bg-orange-100 px-2 py-0.5 rounded">${start} - ${end}</span>
                        </div>
                        <p class="text-xs text-gray-600 mt-1 line-clamp-1">${randevu.baslik}</p>
                    </div>
                </div>
            `;
        });

        document.getElementById('dashTodayAppt').textContent = count;
        listContainer.innerHTML = html || `
            <div class="flex flex-col items-center justify-center py-6 text-gray-400">
                <i class="fa-regular fa-calendar text-3xl mb-2 opacity-30"></i>
                <p class="text-sm">Bugün için planlanmış randevu yok.</p>
            </div>
        `;
    });
}
