// === ANA SAYFA (DASHBOARD) MODÜLÜ - GÜNCELLENMİŞ ===

import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    getDocs,
    getDoc,
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
    
// mainContentTitle elementini seç
const titleElement = document.getElementById("mainContentTitle");

// Flex yapısı kullanarak yan yana ve dikey ortalı hizala
titleElement.innerHTML = `
    <div class="flex items-center gap-2">
        <img src="public/logo.png" alt="Logo" class="h-8 w-auto object-contain">
        <span>NetKoç</span>
    </div>
`;    
    // 1. İskeleti Oluştur
    mainContentArea.innerHTML = `
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg mb-8 flex justify-between items-center relative overflow-hidden">
            <div class="relative z-10">
                <h2 class="text-2xl font-bold mb-1">Hoş geldin, Koç! 👋</h2>
                <p class="text-purple-100 text-sm">Bugün öğrencilerinin başarısı için harika bir gün.</p>
            </div>
            <div class="hidden md:block text-right relative z-10">
                <p class="text-3xl font-bold" id="dashDateDay">--</p>
                <p class="text-sm text-purple-200" id="dashDateFull">--</p>
            </div>
            <div class="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center transition-transform hover:-translate-y-1">
                <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-users"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Aktif Öğrenci</p><h3 class="text-2xl font-bold text-gray-800" id="dashTotalStudent">...</h3></div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center transition-transform hover:-translate-y-1">
                <div class="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-regular fa-calendar-check"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Bugünkü Seanslar</p><h3 class="text-2xl font-bold text-gray-800" id="dashTodayAppt">...</h3></div>
            </div>
            
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center transition-transform hover:-translate-y-1">
                <div class="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-hourglass-half"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Onay Bekleyenler</p><h3 class="text-2xl font-bold text-yellow-600" id="dashPendingOnay">...</h3></div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center transition-transform hover:-translate-y-1">
                <div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-calendar-times"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Gecikmiş Ödevler</p><h3 class="text-2xl font-bold text-red-600" id="dashPendingOdev">...</h3></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2">
                            <span class="w-2 h-6 bg-orange-500 rounded-full"></span>Bugünkü Seans Programım
                        </h3>
                        <button id="btnDashGoAjanda" class="text-xs text-purple-600 hover:text-purple-800 font-medium border border-purple-200 px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors">Tümünü Gör</button>
                    </div>
                    <div id="dashAgendaList" class="p-2 max-h-96 overflow-y-auto custom-scrollbar">
                        <p class="text-center text-gray-400 py-8">Yükleniyor...</p>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2">
                            <span class="w-2 h-6 bg-blue-500 rounded-full"></span>Öğrenci Durum Özeti
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
                            <tbody id="dashStudentTableBody" class="divide-y divide-gray-100"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2 text-sm">
                            Tamamlanan Ödevler <i class="fa-solid fa-circle-info text-gray-400 text-xs" title="Onaylanmış ve tamamlanmış ödevler"></i>
                        </h3>
                        <span id="totalCompletedOdevCount" class="text-blue-600 font-bold text-xs bg-blue-50 px-2 py-1 rounded">0 adet</span>
                    </div>
                    <div id="accordionCompletedHomeworks" class="p-3 space-y-2 bg-white min-h-[100px] max-h-[300px] overflow-y-auto custom-scrollbar">
                        <p class="text-center text-gray-400 text-sm py-4">Yükleniyor...</p>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2 text-sm">
                            Onay Bekleyenler <i class="fa-solid fa-circle-info text-gray-400 text-xs" title="Soru, Deneme ve Ödev onayları"></i>
                        </h3>
                        <span id="totalPendingCount" class="text-orange-600 font-bold text-xs bg-orange-50 px-2 py-1 rounded">0 adet</span>
                    </div>
                    <div id="accordionPendingApprovals" class="p-3 space-y-2 bg-white min-h-[100px] max-h-[300px] overflow-y-auto custom-scrollbar">
                        <p class="text-center text-gray-400 text-sm py-4">Yükleniyor...</p>
                    </div>
                </div>
            
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 class="font-bold text-gray-800 mb-4 text-sm">Hızlı İşlemler</h3>
                    <div class="space-y-3">
                        <button id="btnDashAddStudent" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors group">
                            <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <i class="fa-solid fa-user-plus"></i>
                            </div>
                            <span class="font-medium text-gray-700 group-hover:text-purple-700 text-sm">Yeni Öğrenci Ekle</span>
                        </button>
                        
                        <button id="btnDashAddRandevu" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-200 transition-colors group">
                            <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-3 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                <i class="fa-regular fa-calendar-plus"></i>
                            </div>
                            <span class="font-medium text-gray-700 group-hover:text-orange-700 text-sm">Seans Oluştur</span>
                        </button>
                        
                        <button id="btnDashGoMesajlar" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group relative">
                            <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <i class="fa-regular fa-envelope"></i>
                            </div>
                            <span class="font-medium text-gray-700 group-hover:text-blue-700 text-sm">Mesajları Oku</span>
                            <span id="dashUnreadCount" class="hidden absolute top-3 right-3 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">0</span>
                        </button>
                    </div>
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
        // Formu temizle
        const nameInp = document.getElementById('studentName'); if(nameInp) nameInp.value = '';
        const surInp = document.getElementById('studentSurname'); if(surInp) surInp.value = '';
        const classInp = document.getElementById('studentClass'); if(classInp) classInp.value = '';
        const optCont = document.getElementById('studentOptionsContainer'); if(optCont) optCont.innerHTML = '';
        const dersCont = document.getElementById('studentDersSecimiContainer'); if(dersCont) dersCont.innerHTML = '';
        
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
    loadPendingOdevler(db, currentUserId, appId);
    loadUnreadMessages(db, currentUserId, appId);

    // --- AKORDİYON SİSTEMLERİ ---
    loadCompletedHomeworks(db, currentUserId, appId);
    loadPendingApprovals(db, currentUserId, appId);
}

// ===========================================================
// 1. ÖĞRENCİ İSTATİSTİKLERİ (BELLEK SIZINTISI GİDERİLDİ)
// ===========================================================
function loadDashboardStats(db, currentUserId, appId) {
    const studentTableBody = document.getElementById('dashStudentTableBody');
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    // Eski dinleyiciyi temizle
    if (activeListeners.studentUnsubscribe) {
        activeListeners.studentUnsubscribe();
    }

    activeListeners.studentUnsubscribe = onSnapshot(q, async (snapshot) => {
        let totalStudents = 0;
        let tableHtml = '';
        const students = [];

        snapshot.forEach(doc => {
            students.push({ id: doc.id, ...doc.data() });
            totalStudents++;
        });

        // Toplam sayıyı güncelle
        document.getElementById('dashTotalStudent').textContent = totalStudents;

        // İlk 5 öğrenciyi işle
        const displayStudents = students.slice(0, 5);

        if (displayStudents.length === 0) {
            studentTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-400">Henüz öğrenci yok.</td></tr>';
            return;
        }

        for (const s of displayStudents) {
            // Ödev ilerlemesini TEK SEFERLİK çek (Listener yerine getDocs)
            const progress = await fetchStudentProgressOneTime(db, currentUserId, appId, s.id);
            
            tableHtml += `
                <tr class="hover:bg-gray-50 transition-colors group cursor-pointer dash-student-link" data-id="${s.id}" data-name="${s.ad} ${s.soyad}">
                    <td class="px-6 py-3 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold mr-3 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                ${s.avatarIcon || (s.ad[0] + s.soyad[0])}
                            </div>
                            <div>
                                <div class="text-sm font-medium text-gray-900">${s.ad} ${s.soyad}</div>
                                <div class="mt-1 w-24">
                                    <div class="flex justify-between text-[10px] text-gray-500 mb-0.5">
                                        <span>Ödev</span>
                                        <span>%${progress}</span>
                                    </div>
                                    <div class="w-full bg-gray-100 rounded-full h-1.5">
                                        <div class="h-1.5 rounded-full ${progress < 50 ? 'bg-red-400' : (progress < 80 ? 'bg-yellow-400' : 'bg-green-500')}" style="width: ${progress}%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-3 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">${s.sinif}</span></td>
                    <td class="px-6 py-3 whitespace-nowrap text-center text-sm text-gray-500"><i class="fa-solid fa-chevron-right text-xs text-gray-300 group-hover:text-purple-500 transition-colors"></i></td>
                </tr>
            `;
        }

        studentTableBody.innerHTML = tableHtml;
        
        studentTableBody.querySelectorAll('.dash-student-link').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.dataset.id;
                const studentName = e.currentTarget.dataset.name;
                window.renderOgrenciDetaySayfasi(studentId, studentName);
            });
        });
    });
}

// Yardımcı: Ödev ilerlemesini tek seferlik çeker (Performans Dostu)
async function fetchStudentProgressOneTime(db, coachId, appId, studentId) {
    try {
        const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentId, "odevler"));
        const snap = await getDocs(q);
        
        let total = 0;
        let completed = 0;
        
        snap.forEach(d => {
            total++;
            if (d.data().durum === 'tamamlandi') completed++;
        });

        return total === 0 ? 0 : Math.round((completed / total) * 100);
    } catch (e) {
        console.warn("Ödev bilgisi alınamadı:", e);
        return 0;
    }
}

// ===========================================================
// 2. TAMAMLANAN ÖDEVLER AKORDİYONU
// ===========================================================
function loadCompletedHomeworks(db, currentUserId, appId) {
    const container = document.getElementById('accordionCompletedHomeworks');
    const countBadge = document.getElementById('totalCompletedOdevCount');

    const q = query(
        collectionGroup(db, 'odevler'),
        where('kocId', '==', currentUserId),
        where('durum', '==', 'tamamlandi'),
        limit(20) 
    );

    if (activeListeners.completedHomeworksUnsubscribe) activeListeners.completedHomeworksUnsubscribe();

    activeListeners.completedHomeworksUnsubscribe = onSnapshot(q, async (snapshot) => {
        let groupedData = {};
        let totalCount = 0;

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const studentId = docSnap.ref.parent.parent.id; 
            
            if (!groupedData[studentId]) {
                groupedData[studentId] = { name: "Yükleniyor...", items: [] };
            }
            groupedData[studentId].items.push({ id: docSnap.id, ...data });
            totalCount++;
        }

        countBadge.textContent = `${totalCount} adet`;

        if (totalCount === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Tamamlanan ödev yok.</p>';
            return;
        }

        container.innerHTML = '';
        
        for (const [sId, group] of Object.entries(groupedData)) {
            const contentId = `content-comp-${sId}`;
            const count = group.items.length;

            // İsim çekme (Cache mekanizması eklenebilir ama şimdilik doğrudan)
            let studentName = "Öğrenci";
            try {
                const userDoc = await getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", sId));
                if(userDoc.exists()) studentName = `${userDoc.data().ad} ${userDoc.data().soyad}`;
            } catch (e) { console.warn("İsim alınamadı", e); }

            const div = document.createElement('div');
            div.className = 'border border-gray-200 rounded-lg bg-white overflow-hidden';
            div.innerHTML = `
                <button class="w-full flex justify-between items-center p-3 bg-white hover:bg-gray-50 transition-colors" onclick="document.getElementById('${contentId}').classList.toggle('hidden'); this.querySelector('i').classList.toggle('rotate-180');">
                    <span class="font-bold text-gray-700 text-xs flex items-center gap-2">
                        <span>${studentName}</span>
                    </span>
                    <div class="flex items-center gap-2">
                        <span class="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">${count}</span>
                        <i class="fa-solid fa-chevron-down text-gray-400 text-xs transition-transform"></i>
                    </div>
                </button>
                <div id="${contentId}" class="hidden border-t border-gray-100 bg-gray-50 p-2 space-y-2 max-h-60 overflow-y-auto">
                    ${group.items.map(item => `
                        <div class="bg-white p-2.5 rounded border border-gray-200 shadow-sm">
                            <p class="text-[10px] font-bold text-orange-600 uppercase mb-1">ÖDEV</p>
                            <p class="text-xs text-gray-800 font-medium">${item.title}</p>
                            ${item.aciklama ? `<p class="text-[10px] text-gray-500 mt-1 truncate">${item.aciklama}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(div);
        }
    });
}

// ===========================================================
// 3. ONAY BEKLEYENLER AKORDİYONU
// ===========================================================
function loadPendingApprovals(db, currentUserId, appId) {
    const container = document.getElementById('accordionPendingApprovals');
    const countBadge = document.getElementById('totalPendingCount');
    const kpiBadge = document.getElementById('dashPendingOnay'); 

    let pendingData = { questions: [], exams: [], homeworks: [] };

    const renderAccordion = async () => {
        let groupedData = {};
        let totalCount = 0;

        // Verileri Grupla
        const addToGroup = (item, type, color, bg, desc) => {
            if (!groupedData[item.studentId]) groupedData[item.studentId] = { items: [] };
            groupedData[item.studentId].items.push({ ...item, type, color, bg, desc });
            totalCount++;
        };

        pendingData.questions.forEach(q => addToGroup(q, 'SORU', 'text-green-600', 'bg-green-50', `${q.ders} - ${q.konu || 'Genel'}: ${q.adet} soru`));
        pendingData.exams.forEach(e => addToGroup(e, 'DENEME', 'text-purple-600', 'bg-purple-50', `${e.ad} (${e.tur}) - ${e.toplamNet} Net`));
        pendingData.homeworks.forEach(h => addToGroup(h, 'ÖDEV', 'text-orange-600', 'bg-orange-50', h.title));

        // Rozetleri Güncelle
        countBadge.textContent = `${totalCount} adet`;
        if(kpiBadge) kpiBadge.textContent = totalCount; 

        if (totalCount === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Onay bekleyen işlem yok.</p>';
            return;
        }

        container.innerHTML = '';

        for (const [sId, group] of Object.entries(groupedData)) {
            const contentId = `content-pending-${sId}`;
            const count = group.items.length;

            // Öğrenci Adı
            let studentName = "Öğrenci";
            try {
                const userDoc = await getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", sId));
                if(userDoc.exists()) studentName = `${userDoc.data().ad} ${userDoc.data().soyad}`;
            } catch (e) {}

            const div = document.createElement('div');
            div.className = 'border border-gray-200 rounded-lg bg-white overflow-hidden';
            div.innerHTML = `
                <button class="w-full flex justify-between items-center p-3 bg-white hover:bg-gray-50 transition-colors" onclick="document.getElementById('${contentId}').classList.toggle('hidden'); this.querySelector('i').classList.toggle('rotate-180');">
                    <span class="font-bold text-gray-700 text-xs flex items-center gap-2">
                        <span>${studentName}</span>
                    </span>
                    <div class="flex items-center gap-2">
                        <span class="bg-yellow-400 text-yellow-900 text-[10px] px-2 py-0.5 rounded-full font-bold">${count}</span>
                        <i class="fa-solid fa-chevron-down text-gray-400 text-xs transition-transform"></i>
                    </div>
                </button>
                <div id="${contentId}" class="hidden border-t border-gray-100 bg-gray-50 p-2 space-y-2 max-h-60 overflow-y-auto"></div>
            `;
            
            const innerContainer = div.querySelector(`#${contentId}`);
            
            group.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'bg-white p-3 rounded border border-gray-200 shadow-sm relative';
                itemDiv.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-[10px] font-bold ${item.color} bg-opacity-20 px-1 rounded inline-block mb-1 bg-gray-100">${item.type}</p>
                            <p class="text-xs text-gray-500">Tarih: ${formatDateTR(item.tarih || item.bitisTarihi)}</p>
                            <p class="text-xs font-medium text-gray-800 mt-1">${item.desc}</p>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 mt-2">
                        <button class="btn-reject text-[10px] bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 transition-colors border border-red-100">Reddet</button>
                        <button class="btn-approve text-[10px] bg-green-50 text-green-600 px-3 py-1.5 rounded hover:bg-green-100 transition-colors border border-green-100">Onayla</button>
                    </div>
                `;

                itemDiv.querySelector('.btn-approve').onclick = async () => {
                    await updateDoc(doc(db, item.path), { onayDurumu: 'onaylandi' });
                };
                itemDiv.querySelector('.btn-reject').onclick = async () => {
                    if(confirm('Reddetmek istediğinize emin misiniz?')) await deleteDoc(doc(db, item.path));
                };

                innerContainer.appendChild(itemDiv);
            });

            container.appendChild(div);
        }
    };

    // Dinleyiciler
    if(activeListeners.pendingSoruListUnsubscribe) activeListeners.pendingSoruListUnsubscribe();
    if(activeListeners.pendingDenemeListUnsubscribe) activeListeners.pendingDenemeListUnsubscribe();
    if(activeListeners.pendingOdevListUnsubscribe) activeListeners.pendingOdevListUnsubscribe();

    const qSoru = query(collectionGroup(db, 'soruTakibi'), where('kocId', '==', currentUserId), where('onayDurumu', '==', 'bekliyor'));
    activeListeners.pendingSoruListUnsubscribe = onSnapshot(qSoru, (snap) => {
        pendingData.questions = [];
        snap.forEach(d => pendingData.questions.push({ id: d.id, path: d.ref.path, studentId: d.ref.parent.parent.id, ...d.data() }));
        renderAccordion();
    });

    const qDeneme = query(collectionGroup(db, 'denemeler'), where('kocId', '==', currentUserId), where('onayDurumu', '==', 'bekliyor'));
    activeListeners.pendingDenemeListUnsubscribe = onSnapshot(qDeneme, (snap) => {
        pendingData.exams = [];
        snap.forEach(d => pendingData.exams.push({ id: d.id, path: d.ref.path, studentId: d.ref.parent.parent.id, ...d.data() }));
        renderAccordion();
    });
    
    const qOdev = query(collectionGroup(db, 'odevler'), where('kocId', '==', currentUserId), where('durum', '==', 'tamamlandi'), where('onayDurumu', '==', 'bekliyor'));
    activeListeners.pendingOdevListUnsubscribe = onSnapshot(qOdev, (snap) => {
        pendingData.homeworks = [];
        snap.forEach(d => pendingData.homeworks.push({ id: d.id, path: d.ref.path, studentId: d.ref.parent.parent.id, ...d.data() }));
        renderAccordion();
    });
}

// ===========================================================
// 4. BUGÜNKÜ AJANDA LİSTESİ
// ===========================================================
function loadTodayAgenda(db, currentUserId, appId) {
    const listContainer = document.getElementById('dashAgendaList');
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ajandam"), where("tarih", "==", todayStr), orderBy("baslangic"));
    
    if(activeListeners.ajandaUnsubscribe) activeListeners.ajandaUnsubscribe();

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

// ===========================================================
// KPI HESAPLAMALARI (Gecikmiş Ödev ve Mesajlar)
// ===========================================================

function loadPendingOdevler(db, currentUserId, appId) {
    // İndeks Hatasını Önlemek İçin:
    // Sadece 'durum' ve 'kocId' ile sorgu yapıp, tarih filtresini JS tarafında yapıyoruz.
    const todayStr = new Date().toISOString().split('T')[0];
    
    const q = query(
        collectionGroup(db, 'odevler'), 
        where('kocId', '==', currentUserId), 
        where('durum', '==', 'devam')
    );

    if(activeListeners.pendingOdevUnsubscribe) activeListeners.pendingOdevUnsubscribe();

    activeListeners.pendingOdevUnsubscribe = onSnapshot(q, (snapshot) => {
        let count = 0;
        snapshot.forEach(doc => {
            if (doc.data().bitisTarihi < todayStr) {
                count++;
            }
        });
        document.getElementById('dashPendingOdev').textContent = count;
    });
}

function loadUnreadMessages(db, currentUserId, appId) {
    const countEl = document.getElementById('dashUnreadCount');
    const q = query(collectionGroup(db, 'mesajlar'), where('kocId', '==', currentUserId), where('gonderen', '==', 'ogrenci'), where('okundu', '==', false));
    
    if(activeListeners.unreadMessagesUnsubscribe) activeListeners.unreadMessagesUnsubscribe();

    activeListeners.unreadMessagesUnsubscribe = onSnapshot(q, (snapshot) => {
        const count = snapshot.size;
        if (count > 0) { 
            countEl.textContent = count > 9 ? '9+' : count; 
            countEl.classList.remove('hidden'); 
        } else { 
            countEl.classList.add('hidden'); 
        }
    });

}

window.addEventListener('popstate', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        if (!modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    });
});
window.closeModalSmart = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('hidden');
    modal.style.display = 'none';

    const form = modal.querySelector('form');
    if (form) form.reset();

    if (history.state && history.state.modalId === modalId) {
        history.back();
    }
};
document.querySelectorAll('.modal').forEach(el => {
    modalObserver.observe(el, { attributes: true });
});
document.addEventListener('click', (e) => {
    const modalId = e.target.getAttribute('data-close-modal');
    if (modalId) {
        e.preventDefault();
        closeModalSmart(modalId);
    }
});


