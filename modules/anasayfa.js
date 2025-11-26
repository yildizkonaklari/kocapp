// === ANA SAYFA (DASHBOARD) MODÜLÜ ===

import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    getDocs,
    collectionGroup,
    limit,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    activeListeners, 
    renderDersSecimi, 
    populateStudentSelect,
    formatDateTR 
} from './helpers.js';

/**
 * Ana Sayfa (Dashboard) arayüzünü çizer ve verileri yükler.
 */
export function renderAnaSayfa(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Kontrol Paneli";
    
    // 1. İskeleti Oluştur
    mainContentArea.innerHTML = `
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

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-users"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Aktif Öğrenci</p><h3 class="text-2xl font-bold text-gray-800" id="dashTotalStudent">...</h3></div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-regular fa-calendar-check"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Bugünkü Randevular</p><h3 class="text-2xl font-bold text-gray-800" id="dashTodayAppt">...</h3></div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-calendar-times"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Gecikmiş Ödevler</p><h3 class="text-2xl font-bold text-red-600" id="dashPendingOdev">...</h3></div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-hourglass-half"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Onay Bekleyenler</p><h3 class="text-2xl font-bold text-yellow-600" id="dashPendingOnay">...</h3></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div class="lg:col-span-2 space-y-6">
                
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2">
                            Tamamlanan Ödevler <i class="fa-solid fa-circle-info text-gray-400 text-xs"></i>
                        </h3>
                        <span id="totalCompletedOdevCount" class="text-blue-600 font-bold text-sm">0 adet</span>
                    </div>
                    <div id="accordionCompletedHomeworks" class="p-4 space-y-2 bg-gray-50 min-h-[100px]">
                        <p class="text-center text-gray-400 text-sm py-4">Yükleniyor...</p>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2">
                            Onay Bekleyenler <i class="fa-solid fa-circle-info text-gray-400 text-xs"></i>
                        </h3>
                        <span id="totalPendingCount" class="text-orange-600 font-bold text-sm">0 adet</span>
                    </div>
                    <div id="accordionPendingApprovals" class="p-4 space-y-2 bg-gray-50 min-h-[100px]">
                        <p class="text-center text-gray-400 text-sm py-4">Yükleniyor...</p>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2"><span class="w-2 h-6 bg-orange-500 rounded-full"></span>Bugünkü Programım</h3>
                        <button id="btnDashGoAjanda" class="text-sm text-purple-600 hover:text-purple-800 font-medium">Tümünü Gör</button>
                    </div>
                    <div id="dashAgendaList" class="p-2 max-h-80 overflow-y-auto"><p class="text-center text-gray-400 py-8">Yükleniyor...</p></div>
                </div>

            </div>

            <div class="space-y-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 class="font-bold text-gray-800 mb-4">Hızlı İşlemler</h3>
                    <div class="space-y-3">
                        <button id="btnDashAddStudent" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors group"><div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 group-hover:bg-purple-600 group-hover:text-white transition-colors"><i class="fa-solid fa-user-plus"></i></div><span class="font-medium text-gray-700 group-hover:text-purple-700">Yeni Öğrenci Ekle</span></button>
                        <button id="btnDashAddRandevu" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-200 transition-colors group"><div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-3 group-hover:bg-orange-600 group-hover:text-white transition-colors"><i class="fa-regular fa-calendar-plus"></i></div><span class="font-medium text-gray-700 group-hover:text-orange-700">Randevu Oluştur</span></button>
                        
                        <button id="btnDashGoMesajlar" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group relative">
                            <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors"><i class="fa-regular fa-envelope"></i></div>
                            <span class="font-medium text-gray-700 group-hover:text-blue-700">Mesajları Oku</span>
                            <span id="dashUnreadCount" class="hidden absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">0</span>
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100"><h3 class="font-bold text-gray-800 flex items-center gap-2"><span class="w-2 h-6 bg-blue-500 rounded-full"></span>Öğrenci Durum Özeti</h3></div>
                    <div class="overflow-x-auto"><table class="min-w-full text-sm text-left"><thead class="bg-gray-50 text-gray-500 font-medium"><tr><th class="px-6 py-3">Öğrenci</th><th class="px-6 py-3">Sınıf</th><th class="px-6 py-3 text-center">İşlem</th></tr></thead><tbody id="dashStudentTableBody" class="divide-y divide-gray-100"></tbody></table></div>
                </div>
            </div>
        </div>
    `;

    // Tarih Bilgisi
    const now = new Date();
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    document.getElementById('dashDateDay').textContent = days[now.getDay()];
    document.getElementById('dashDateFull').textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    // Hızlı Eylem Butonları
    document.getElementById('btnDashAddStudent').addEventListener('click', () => {
        document.getElementById('studentName').value = '';
        document.getElementById('studentSurname').value = '';
        document.getElementById('studentClass').value = '12. Sınıf';
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

    // Verileri Yükle
    loadDashboardStats(db, currentUserId, appId);
    loadTodayAgenda(db, currentUserId, appId);
    loadPendingOdevler(db, currentUserId, appId); // Sadece KPI sayısı için
    
    loadUnreadMessages(db, currentUserId, appId);

    // --- YENİ AKORDİYON SİSTEMLERİ ---
    loadCompletedHomeworks(db, currentUserId, appId);
    loadPendingApprovals(db, currentUserId, appId);
}

// ===========================================================
// 1. TAMAMLANAN ÖDEVLER AKORDİYONU
// ===========================================================
function loadCompletedHomeworks(db, currentUserId, appId) {
    const container = document.getElementById('accordionCompletedHomeworks');
    const countBadge = document.getElementById('totalCompletedOdevCount');

    // Son 20 tamamlanan ödev
    const q = query(
        collectionGroup(db, 'odevler'),
        where('kocId', '==', currentUserId),
        where('durum', '==', 'tamamlandi'),
        limit(20) 
    );

    activeListeners.completedHomeworksUnsubscribe = onSnapshot(q, async (snapshot) => {
        let groupedData = {};
        let totalCount = 0;

        // Öğrencilere göre grupla
        // Not: doc.ref.parent.parent.id bize studentId'yi verir.
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const studentId = docSnap.ref.parent.parent.id; 
            
            if (!groupedData[studentId]) {
                // Öğrenci adını almak için önbellek veya map kullanılabilir.
                // Burada basitlik adına data içinde studentName saklanmadığını varsayarak
                // UI'da "Öğrenci ID" yerine daha önce helpers'da cache varsa kullanabiliriz
                // veya daha güvenli yol olarak parent doc'u fetch edebiliriz.
                // Ancak performans için burada direkt parent fetch yapmak yerine
                // studentMap global değişkenini kullanmak isterdik ama bu modül dışı.
                // Bu yüzden veri yapısında 'studentName' yoksa, asenkron isim çekmek gerekebilir
                // veya basitçe 'Öğrenci' yazıp geçebiliriz.
                // İYİLEŞTİRME: odevler koleksiyonuna kaydederken 'studentName' eklemek en iyisidir.
                // Eğer yoksa, mecburen bir sorgu daha atacağız veya ID göstereceğiz.
                
                // Şimdilik geçici bir çözüm:
                groupedData[studentId] = {
                    name: "Yükleniyor...", // Sonra güncellenecek
                    items: []
                };
            }
            
            groupedData[studentId].items.push({
                id: docSnap.id,
                ...data
            });
            totalCount++;
        }

        countBadge.textContent = `${totalCount} adet`;

        if (totalCount === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Tamamlanan ödev yok.</p>';
            return;
        }

        // HTML Oluştur
        container.innerHTML = '';
        
        for (const [sId, group] of Object.entries(groupedData)) {
            // Önce HTML'i ID ile bas
            const groupId = `acc-comp-${sId}`;
            const contentId = `content-comp-${sId}`;
            const count = group.items.length;

            const div = document.createElement('div');
            div.className = 'border border-gray-200 rounded-lg bg-white overflow-hidden';
            div.innerHTML = `
                <button class="w-full flex justify-between items-center p-3 bg-white hover:bg-gray-50 transition-colors" onclick="document.getElementById('${contentId}').classList.toggle('hidden'); this.querySelector('i').classList.toggle('rotate-180');">
                    <span class="font-bold text-gray-700 text-sm flex items-center gap-2">
                        <span class="student-name-placeholder" data-sid="${sId}">Öğrenci Yükleniyor</span>
                    </span>
                    <div class="flex items-center gap-2">
                        <span class="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">${count} adet</span>
                        <i class="fa-solid fa-chevron-down text-gray-400 text-xs transition-transform"></i>
                    </div>
                </button>
                <div id="${contentId}" class="hidden border-t border-gray-100 bg-gray-50 p-2 space-y-2 max-h-60 overflow-y-auto">
                    ${group.items.map(item => `
                        <div class="bg-white p-3 rounded border border-gray-200 shadow-sm">
                            <p class="text-[10px] font-bold text-orange-600 uppercase mb-1">ÖDEV</p>
                            <p class="text-sm text-gray-800">${item.title}</p>
                            <p class="text-xs text-gray-500 mt-1">${item.aciklama || ''}</p>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(div);
            
            // İsimleri Asenkron Getir
            // Not: Bu işlemi her render'da yapmak maliyetli olabilir ama 
            // anasayfa olduğu için kabul edilebilir.
            const userDoc = await getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", sId));
            if(userDoc.exists()) {
                const nameSpan = div.querySelector('.student-name-placeholder');
                if(nameSpan) nameSpan.textContent = `${userDoc.data().ad} ${userDoc.data().soyad}`;
            }
        }
    });
}

// ===========================================================
// 2. ONAY BEKLEYENLER AKORDİYONU (SORU + DENEME)
// ===========================================================
function loadPendingApprovals(db, currentUserId, appId) {
    const container = document.getElementById('accordionPendingApprovals');
    const countBadge = document.getElementById('totalPendingCount');

    // Verileri toplamak için geçici depo
    let pendingData = {
        questions: [],
        exams: []
    };

    const renderAccordion = async () => {
        let groupedData = {};
        let totalCount = 0;

        // Soruları Grupla
        pendingData.questions.forEach(q => {
            if (!groupedData[q.studentId]) groupedData[q.studentId] = { name: "Yükleniyor...", items: [] };
            groupedData[q.studentId].items.push({ ...q, type: 'SORU TAKİBİ', color: 'text-green-600', bg: 'bg-green-50' });
            totalCount++;
        });

        // Denemeleri Grupla
        pendingData.exams.forEach(e => {
            if (!groupedData[e.studentId]) groupedData[e.studentId] = { name: "Yükleniyor...", items: [] };
            groupedData[e.studentId].items.push({ ...e, type: 'DENEME', color: 'text-purple-600', bg: 'bg-purple-50', desc: `${e.ad} (${e.tur}) - ${e.toplamNet} Net` });
            totalCount++;
        });

        countBadge.textContent = `${totalCount} adet`;

        if (totalCount === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Onay bekleyen işlem yok.</p>';
            return;
        }

        container.innerHTML = '';

        for (const [sId, group] of Object.entries(groupedData)) {
            const contentId = `content-pending-${sId}`;
            const count = group.items.length;

            const div = document.createElement('div');
            div.className = 'border border-gray-200 rounded-lg bg-white overflow-hidden';
            div.innerHTML = `
                <button class="w-full flex justify-between items-center p-3 bg-white hover:bg-gray-50 transition-colors" onclick="document.getElementById('${contentId}').classList.toggle('hidden'); this.querySelector('i').classList.toggle('rotate-180');">
                    <span class="font-bold text-gray-700 text-sm flex items-center gap-2">
                        <span class="student-name-placeholder" data-sid="${sId}">Öğrenci Yükleniyor</span>
                    </span>
                    <div class="flex items-center gap-2">
                        <span class="bg-yellow-400 text-yellow-900 text-[10px] px-2 py-0.5 rounded-full font-bold">${count} adet</span>
                        <i class="fa-solid fa-chevron-down text-gray-400 text-xs transition-transform"></i>
                    </div>
                </button>
                <div id="${contentId}" class="hidden border-t border-gray-100 bg-gray-50 p-2 space-y-2 max-h-60 overflow-y-auto">
                    </div>
            `;
            
            const innerContainer = div.querySelector(`#${contentId}`);
            
            group.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'bg-white p-3 rounded border border-gray-200 shadow-sm relative';
                
                let detailText = item.desc || `${item.ders} - ${item.konu || 'Genel'} : ${item.adet} soru`;
                
                itemDiv.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-[10px] font-bold ${item.color} bg-opacity-20 px-1 rounded inline-block mb-1 bg-gray-100">${item.type}</p>
                            <p class="text-xs text-gray-500">Tarih: ${formatDateTR(item.tarih)}</p>
                            <p class="text-sm font-medium text-gray-800 mt-1">${detailText}</p>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 mt-2">
                        <button class="btn-reject text-xs bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 transition-colors">Reddet</button>
                        <button class="btn-approve text-xs bg-green-100 text-green-600 px-3 py-1 rounded hover:bg-green-200 transition-colors">Onayla</button>
                    </div>
                `;

                // Buton İşlevleri
                itemDiv.querySelector('.btn-approve').onclick = async () => {
                    if(confirm('Onaylıyor musun?')) {
                        await updateDoc(doc(db, item.path), { onayDurumu: 'onaylandi' });
                    }
                };
                itemDiv.querySelector('.btn-reject').onclick = async () => {
                    if(confirm('Bu kaydı silmek/reddetmek istiyor musun?')) {
                        await deleteDoc(doc(db, item.path));
                    }
                };

                innerContainer.appendChild(itemDiv);
            });

            container.appendChild(div);

            // İsim Getir
            const userDoc = await getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", sId));
            if(userDoc.exists()) {
                const nameSpan = div.querySelector('.student-name-placeholder');
                if(nameSpan) nameSpan.textContent = `${userDoc.data().ad} ${userDoc.data().soyad}`;
            }
        }
    };

    // 1. Soruları Dinle
    const qSoru = query(collectionGroup(db, 'soruTakibi'), where('kocId', '==', currentUserId), where('onayDurumu', '==', 'bekliyor'));
    activeListeners.pendingSoruListUnsubscribe = onSnapshot(qSoru, (snap) => {
        pendingData.questions = [];
        snap.forEach(d => {
            const sid = d.ref.parent.parent.id;
            pendingData.questions.push({ id: d.id, path: d.ref.path, studentId: sid, ...d.data() });
        });
        renderAccordion();
    });

    // 2. Denemeleri Dinle
    const qDeneme = query(collectionGroup(db, 'denemeler'), where('kocId', '==', currentUserId), where('onayDurumu', '==', 'bekliyor'));
    activeListeners.pendingDenemeListUnsubscribe = onSnapshot(qDeneme, (snap) => {
        pendingData.exams = [];
        snap.forEach(d => {
            const sid = d.ref.parent.parent.id;
            pendingData.exams.push({ id: d.id, path: d.ref.path, studentId: sid, ...d.data() });
        });
        renderAccordion();
    });
}

// --- DİĞER YARDIMCI FONKSİYONLAR (MEVCUT KODLAR) ---

function loadDashboardStats(db, currentUserId, appId) {
    const studentTableBody = document.getElementById('dashStudentTableBody');
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    activeListeners.studentUnsubscribe = onSnapshot(q, (snapshot) => {
        let totalStudents = 0, tableHtml = '';
        snapshot.forEach(doc => {
            const s = doc.data();
            totalStudents++;
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
        studentTableBody.innerHTML = tableHtml || '<tr><td colspan="3" class="text-center py-4 text-gray-400">Henüz öğrenci yok.</td></tr>';
        studentTableBody.querySelectorAll('.dash-student-link').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.dataset.id;
                const studentName = e.currentTarget.dataset.name;
                window.renderOgrenciDetaySayfasi(studentId, studentName);
            });
        });
    });
}

function loadTodayAgenda(db, currentUserId, appId) {
    const listContainer = document.getElementById('dashAgendaList');
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ajandam"), where("tarih", "==", todayStr), orderBy("baslangic"));
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
        listContainer.innerHTML = html || `<div class="flex flex-col items-center justify-center py-6 text-gray-400"><i class="fa-regular fa-calendar text-3xl mb-2 opacity-30"></i><p class="text-sm">Bugün randevu yok.</p></div>`;
    });
}

function loadPendingOdevler(db, currentUserId, appId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(collectionGroup(db, 'odevler'), where('kocId', '==', currentUserId), where('durum', '==', 'devam'), where('bitisTarihi', '<', todayStr));
    activeListeners.pendingOdevUnsubscribe = onSnapshot(q, (snapshot) => {
        document.getElementById('dashPendingOdev').textContent = snapshot.size;
    });
}

function loadUnreadMessages(db, currentUserId, appId) {
    const countEl = document.getElementById('dashUnreadCount');
    // 'onayDurumu' KPI'sını artık akordiyon fonksiyonu yönetiyor, o yüzden buradan sildik veya sadece toplamı gösterebiliriz.
    // Burası sadece Mesajlar için:
    const q = query(collectionGroup(db, 'mesajlar'), where('kocId', '==', currentUserId), where('gonderen', '==', 'ogrenci'), where('okundu', '==', false));
    activeListeners.unreadMessagesUnsubscribe = onSnapshot(q, (snapshot) => {
        const count = snapshot.size;
        if (count > 0) { countEl.textContent = count > 9 ? '9+' : count; countEl.classList.remove('hidden'); } else { countEl.classList.add('hidden'); }
    });
    
    // Pending Onay KPI'sını yukarıdaki akordiyon fonksiyonları güncellediği için burada ayrıca sorguya gerek yok.
}
