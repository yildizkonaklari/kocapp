import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc, getDocs, getCountFromServer, writeBatch,
    collection, query, orderBy, onSnapshot, serverTimestamp, where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR, formatCurrency, renderDersSecimi } from './helpers.js';

// =================================================================
// 1. ÖĞRENCİ DETAY SAYFASI
// =================================================================
export function renderOgrenciDetaySayfasi(db, currentUserId, appId, studentId, studentName) {
    document.getElementById("mainContentTitle").textContent = `${studentName} - Detay`;
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <button onclick="document.getElementById('nav-ogrencilerim').click()" class="flex items-center text-sm text-gray-600 hover:text-purple-600 font-medium">
                <i class="fa-solid fa-arrow-left mr-1"></i> Listeye Dön
            </button>
        </div>
        
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center mb-6 gap-6 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div class="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-3xl shadow-lg relative z-10">
                ${studentName.split(' ').map(n=>n[0]).join('')}
            </div>
            <div class="flex-1 text-center md:text-left z-10">
                <h2 class="text-2xl font-bold text-gray-800">${studentName}</h2>
                <div class="flex flex-col md:items-start items-center mt-1 gap-1">
                    <p class="text-sm text-gray-500 flex items-center gap-2">
                        <span id="studentDetailClass" class="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">...</span>
                        <span id="studentDetailJoinDate" class="text-gray-400 text-xs"></span>
                    </p>
                    <p id="studentDetailArea" class="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded hidden"></p>
                </div>
            </div>
            <div class="flex gap-3 z-10">
                <button id="btnEditStudent" class="bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 hover:text-purple-600 transition-colors shadow-sm">
                    <i class="fa-solid fa-pen mr-2"></i> Düzenle
                </button>
                <button id="btnMsgStudent" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                    <i class="fa-regular fa-paper-plane mr-2"></i> Mesaj Gönder
                </button>
            </div>
        </div>

        <div class="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
            <button data-tab="ozet" class="tab-button active py-3 px-6 text-purple-600 border-b-2 border-purple-600 font-semibold transition-colors">Özet & Analiz</button>
            <button data-tab="notlar" class="tab-button py-3 px-6 text-gray-500 hover:text-purple-600 font-medium transition-colors">Koçluk Notları</button>
        </div>
        
        <div id="tabContentArea"></div>
        <div class="h-24"></div>
    `;

    document.getElementById('btnEditStudent').addEventListener('click', () => showEditStudentModal(db, currentUserId, appId, studentId));
    document.getElementById('btnMsgStudent').addEventListener('click', () => document.getElementById('nav-mesajlar').click());

    const tabBtns = document.querySelectorAll('.tab-button');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (activeListeners.notlarUnsubscribe) activeListeners.notlarUnsubscribe();
            
            tabBtns.forEach(b => { b.classList.remove('active', 'text-purple-600', 'border-purple-600'); b.classList.add('text-gray-500'); });
            e.currentTarget.classList.add('active', 'text-purple-600', 'border-purple-600');
            e.currentTarget.classList.remove('text-gray-500');
            
            const tab = e.currentTarget.dataset.tab;
            const contentArea = document.getElementById('tabContentArea');
            
            // Güvenlik Kontrolü: Alan var mı?
            if (contentArea) {
                if(tab === 'ozet') renderOzetTab(db, currentUserId, appId, studentId);
                else if(tab === 'notlar') renderKoclukNotlariTab(db, currentUserId, appId, studentId);
            }
        });
    });

    // İlk açılışta Özet sekmesini yükle
    renderOzetTab(db, currentUserId, appId, studentId);
}

// --- SEKME 1: ÖZET & ANALİZ ---
async function renderOzetTab(db, currentUserId, appId, studentId) {
    const area = document.getElementById('tabContentArea');
    if (!area) return; // Eğer alan yoksa dur

    const studentSnap = await getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId));
    const studentData = studentSnap.exists() ? studentSnap.data() : {};
    
    // Header bilgilerini güncelle (Elementler hala sayfadaysa)
    if(document.getElementById('studentDetailClass')) document.getElementById('studentDetailClass').textContent = studentData.sinif || 'Sınıf Yok';
    if(document.getElementById('studentDetailJoinDate') && studentData.olusturmaTarihi) {
        document.getElementById('studentDetailJoinDate').textContent = `Kayıt: ${formatDateTR(studentData.olusturmaTarihi.toDate().toISOString().split('T')[0])}`;
    }
    if(studentData.alan) {
        const areaEl = document.getElementById('studentDetailArea');
        if(areaEl) { areaEl.textContent = studentData.alan; areaEl.classList.remove('hidden'); }
    }

    area.innerHTML = `
        <div class="flex justify-end mb-4">
            <select id="summaryTimeFilter" class="p-2 pl-3 pr-8 border border-gray-200 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer text-gray-600 font-medium">
                <option value="all">Tüm Zamanlar</option>
                <option value="month" selected>Bu Ay</option>
                <option value="week">Bu Hafta</option>
            </select>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            ${renderKpiCard('Tamamlanan Hedef', '0', 'bg-green-100 text-green-600', 'fa-bullseye', 'kpi-goal')}
            ${renderKpiCard('Tamamlanan Ödev', '0', 'bg-blue-100 text-blue-600', 'fa-list-check', 'kpi-homework')}
            ${renderKpiCard('Deneme Sayısı', '0', 'bg-purple-100 text-purple-600', 'fa-file-lines', 'kpi-exam-count')}
            ${renderKpiCard('Çözülen Soru', '0', 'bg-orange-100 text-orange-600', 'fa-pen', 'kpi-question')}
            ${renderKpiCard('Tamamlanan Seans', '0', 'bg-pink-100 text-pink-600', 'fa-calendar-check', 'kpi-session')}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Ortalama Net</p>
                <h3 id="stat-avg-net" class="text-3xl font-bold text-indigo-600 tracking-tight">-</h3>
                <p class="text-[10px] text-gray-400 mt-1">Tüm denemeler</p>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Okuma (Sayfa)</p>
                <h3 id="stat-reading" class="text-3xl font-bold text-teal-600 tracking-tight">-</h3>
                <p class="text-[10px] text-gray-400 mt-1">Rutin takibi</p>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">En Başarılı Ders</p>
                <h3 id="stat-best-lesson" class="text-lg font-bold text-green-600 mb-2">-</h3>
                <div class="w-full bg-green-50 h-1.5 rounded-full overflow-hidden"><div class="bg-green-500 h-full rounded-full" style="width: 80%"></div></div>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Geliştirilecek Ders</p>
                <h3 id="stat-worst-lesson" class="text-lg font-bold text-red-500 mb-2">-</h3>
                <div class="w-full bg-red-50 h-1.5 rounded-full overflow-hidden"><div class="bg-red-500 h-full rounded-full" style="width: 40%"></div></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div class="space-y-6">
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 class="font-bold text-gray-800 mb-4 text-sm flex items-center"><i class="fa-solid fa-wallet mr-2 text-gray-400"></i> Finansal Durum</h4>
                    <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                        <span class="text-sm text-gray-500">Güncel Bakiye</span>
                        <span class="font-bold text-lg ${((studentData.toplamBorc||0)-(studentData.toplamOdenen||0)) > 0 ? 'text-red-600':'text-green-600'}">
                            ${formatCurrency((studentData.toplamBorc||0)-(studentData.toplamOdenen||0))}
                        </span>
                    </div>
                </div>

                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 class="font-bold text-gray-800 mb-4 text-sm flex items-center"><i class="fa-solid fa-book-open mr-2 text-gray-400"></i> Takip Edilen Dersler</h4>
                    <div class="flex flex-wrap gap-2">
                        ${(studentData.takipDersleri || []).map(d => `<span class="px-2.5 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200">${d}</span>`).join('')}
                    </div>
                </div>
            </div>

            <div class="lg:col-span-2 bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden flex flex-col h-full">
                <div class="bg-red-50 px-5 py-4 border-b border-red-100 flex justify-between items-center">
                    <h4 class="font-bold text-red-800 flex items-center gap-2 text-sm"><i class="fa-solid fa-triangle-exclamation"></i> Gecikmiş / Tamamlanmamış Ödevler</h4>
                    <span id="overdue-count" class="bg-white text-red-600 text-xs px-2.5 py-1 rounded-lg font-bold shadow-sm border border-red-100">0</span>
                </div>
                <div id="overdue-list" class="p-3 flex-1 overflow-y-auto max-h-80 space-y-2">
                    <p class="text-center text-gray-400 text-sm py-10">Yükleniyor...</p>
                </div>
            </div>
        </div>
    `;

    const filterSelect = document.getElementById('summaryTimeFilter');
    if(filterSelect) {
        filterSelect.addEventListener('change', () => loadStats(db, currentUserId, appId, studentId, filterSelect.value));
    }

    loadStats(db, currentUserId, appId, studentId, 'month'); 
    loadOverdueHomeworks(db, currentUserId, appId, studentId);
}

// Helper: KPI Kartı HTML
function renderKpiCard(title, valueId, colorClass, icon, id) {
    return `
    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-32 transition-transform hover:-translate-y-1">
        <div class="w-10 h-10 rounded-full ${colorClass} bg-opacity-20 flex items-center justify-center mb-3 text-lg"><i class="fa-solid ${icon}"></i></div>
        <h4 class="text-2xl font-bold text-gray-800 leading-none mb-1.5" id="${id}">0</h4>
        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">${title}</p>
    </div>`;
}

// --- VERİ YÜKLEME & HESAPLAMA ---
async function loadStats(db, uid, appId, sid, period) {
    const now = new Date();
    let startDate = null;
    
    if (period === 'week') {
        const day = now.getDay() || 7; 
        if(day !== 1) now.setHours(-24 * (day - 1)); 
        startDate = now.toISOString().split('T')[0];
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else {
        startDate = '2000-01-01'; 
    }

    const qGoals = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "hedefler"), where("durum", "==", "tamamlandi"), where("bitisTarihi", ">=", startDate));
    const qHomework = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), where("durum", "==", "tamamlandi"), where("bitisTarihi", ">=", startDate));
    const qExams = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "denemeler"), where("tarih", ">=", startDate));
    const qQuestions = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "soruTakibi"), where("tarih", ">=", startDate));
    const qSessions = query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("studentId", "==", sid), where("tarih", ">=", startDate), where("durum", "==", "tamamlandi"));

    try {
        const [snapGoals, snapHomework, snapExams, snapQuestions, snapSessions] = await Promise.all([
            getDocs(qGoals), getDocs(qHomework), getDocs(qExams), getDocs(qQuestions), getDocs(qSessions)
        ]);

        if(document.getElementById('kpi-goal')) document.getElementById('kpi-goal').textContent = snapGoals.size;
        if(document.getElementById('kpi-homework')) document.getElementById('kpi-homework').textContent = snapHomework.size;
        if(document.getElementById('kpi-exam-count')) document.getElementById('kpi-exam-count').textContent = snapExams.size;
        if(document.getElementById('kpi-session')) document.getElementById('kpi-session').textContent = snapSessions.size;

        let totalQuestions = 0;
        let totalReading = 0;
        snapQuestions.forEach(doc => {
            const d = doc.data();
            const adet = parseInt(d.adet) || 0;
            if (d.ders === 'Kitap Okuma' || (d.konu && d.konu.includes('Kitap'))) totalReading += adet;
            else totalQuestions += adet;
        });
        if(document.getElementById('kpi-question')) document.getElementById('kpi-question').textContent = totalQuestions;
        if(document.getElementById('stat-reading')) document.getElementById('stat-reading').textContent = totalReading;

        let totalNet = 0;
        let subjectStats = {}; 

        snapExams.forEach(doc => {
            const d = doc.data();
            totalNet += (parseFloat(d.toplamNet) || 0);
            if (d.netler) {
                for (const [ders, stats] of Object.entries(d.netler)) {
                    if (!subjectStats[ders]) subjectStats[ders] = { total: 0, count: 0 };
                    subjectStats[ders].total += (parseFloat(stats.net) || 0);
                    subjectStats[ders].count += 1;
                }
            }
        });

        const avgNet = snapExams.size > 0 ? (totalNet / snapExams.size).toFixed(2) : '-';
        if(document.getElementById('stat-avg-net')) document.getElementById('stat-avg-net').textContent = avgNet;

        let bestLesson = { name: '-', avg: -Infinity };
        let worstLesson = { name: '-', avg: Infinity };

        for (const [name, stat] of Object.entries(subjectStats)) {
            const avg = stat.total / stat.count;
            if (avg > bestLesson.avg) bestLesson = { name, avg };
            if (avg < worstLesson.avg) worstLesson = { name, avg };
        }

        if (bestLesson.name !== '-') {
            if(document.getElementById('stat-best-lesson')) document.getElementById('stat-best-lesson').textContent = `${bestLesson.name} (${bestLesson.avg.toFixed(1)})`;
            if(document.getElementById('stat-worst-lesson')) document.getElementById('stat-worst-lesson').textContent = `${worstLesson.name} (${worstLesson.avg.toFixed(1)})`;
        } else {
            if(document.getElementById('stat-best-lesson')) document.getElementById('stat-best-lesson').textContent = '-';
            if(document.getElementById('stat-worst-lesson')) document.getElementById('stat-worst-lesson').textContent = '-';
        }

    } catch (err) {
        console.error("Dashboard istatistik hatası:", err);
    }
}

async function loadOverdueHomeworks(db, uid, appId, sid) {
    const today = new Date().toISOString().split('T')[0];
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"),
        where("durum", "!=", "tamamlandi"),
        where("bitisTarihi", "<", today),
        orderBy("bitisTarihi", "asc")
    );

    const snap = await getDocs(q);
    if(document.getElementById('overdue-count')) document.getElementById('overdue-count').textContent = snap.size;
    const container = document.getElementById('overdue-list');
    
    if (!container) return;

    if (snap.empty) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-gray-300 py-10"><i class="fa-regular fa-circle-check text-4xl mb-3 text-green-100"></i><p class="text-sm">Gecikmiş ödev bulunmuyor.</p></div>';
    } else {
        container.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
            <div class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-red-300 transition-colors group">
                <div class="flex justify-between items-start">
                    <h5 class="font-bold text-gray-800 text-sm line-clamp-1">${d.title}</h5>
                    <span class="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-medium whitespace-nowrap">Gecikti</span>
                </div>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-xs text-gray-500 flex items-center"><i class="fa-regular fa-calendar mr-1.5"></i> ${formatDateTR(d.bitisTarihi)}</span>
                    <button class="text-xs font-bold text-indigo-600 hover:text-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity" onclick="document.getElementById('nav-odevler').click()">Görüntüle <i class="fa-solid fa-arrow-right ml-1"></i></button>
                </div>
            </div>`;
        }).join('');
    }
}

// --- SEKME 2: KOÇLUK NOTLARI ---
function renderKoclukNotlariTab(db, currentUserId, appId, studentId) {
    const area = document.getElementById('tabContentArea');
    if(!area) return;

    area.innerHTML = `
        <div class="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 class="font-bold text-gray-800 mb-3 text-sm">Yeni Not Ekle</h3>
            <div class="flex flex-col gap-3">
                <textarea id="newNoteInput" class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm resize-none" rows="3" placeholder="Öğrenci hakkında gözlemleriniz..."></textarea>
                <div class="flex justify-end">
                    <button id="btnSaveNote" class="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm">Notu Kaydet</button>
                </div>
            </div>
        </div>
        <div id="noteList" class="space-y-3">
            <p class="text-center text-gray-400 py-8">Notlar yükleniyor...</p>
        </div>
        <div class="h-24"></div>
    `;

    document.getElementById('btnSaveNote').onclick = async () => {
        const txt = document.getElementById('newNoteInput').value.trim();
        if(!txt) return;
        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "koclukNotlari"), {
            icerik: txt, tarih: serverTimestamp()
        });
        document.getElementById('newNoteInput').value = '';
    };

    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "koclukNotlari"), orderBy("tarih", "desc"));
    activeListeners.notlarUnsubscribe = onSnapshot(q, (snap) => {
        const container = document.getElementById('noteList');
        if(snap.empty) { container.innerHTML = '<div class="text-center text-gray-400 py-10 flex flex-col items-center"><i class="fa-regular fa-note-sticky text-3xl mb-2 opacity-20"></i><p class="text-sm">Henüz not eklenmemiş.</p></div>'; return; }
        
        container.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
                <div class="p-4 bg-yellow-50 border border-yellow-100 rounded-xl relative group hover:shadow-md transition-all">
                    <div class="flex items-start gap-3">
                        <div class="mt-1 text-yellow-500"><i class="fa-solid fa-quote-left"></i></div>
                        <div class="flex-1">
                            <p class="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">${d.icerik}</p>
                            <p class="text-[10px] text-gray-400 mt-2 flex items-center gap-1 font-medium"><i class="fa-regular fa-clock"></i> ${d.tarih?.toDate().toLocaleString()}</p>
                        </div>
                    </div>
                    <button class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm" 
                            onclick="if(confirm('Silinsin mi?')) deleteDoc(doc(db, 'artifacts', '${appId}', 'users', '${currentUserId}', 'ogrencilerim', '${studentId}', 'koclukNotlari', '${doc.id}'))">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                </div>`;
        }).join('');
    });
}

// =================================================================
// 2. ÖĞRENCİ LİSTESİ (SAYFA)
// =================================================================
export function renderOgrenciSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Öğrencilerim";
    document.getElementById("mainContentArea").innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div class="relative w-full md:w-1/3">
                <input type="text" id="searchStudentInput" placeholder="Öğrenci ara..." class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm transition-shadow">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i class="fa-solid fa-magnifying-glass text-gray-400"></i></div>
            </div>
            <button id="showAddStudentModalButton" class="w-full md:w-auto bg-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition-all flex items-center justify-center shadow-lg shadow-purple-200 active:scale-95">
                <i class="fa-solid fa-user-plus mr-2"></i>Yeni Öğrenci Ekle
            </button>
        </div>
        <div id="studentListContainer" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <p class="text-gray-500 text-center py-8">Yükleniyor...</p>
        </div>
        <div class="h-24"></div>
    `;
    
    document.getElementById('showAddStudentModalButton').addEventListener('click', () => {
        document.getElementById('studentName').value = '';
        document.getElementById('studentSurname').value = '';
        document.getElementById('studentClass').value = '';
        document.getElementById('studentOptionsContainer').innerHTML = '';
        document.getElementById('studentDersSecimiContainer').innerHTML = '';
        document.getElementById('addStudentModal').style.display = 'block';
    });

    document.getElementById('searchStudentInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#studentListContainer tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    });

    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    activeListeners.studentUnsubscribe = onSnapshot(q, (snapshot) => {
        const container = document.getElementById('studentListContainer');
        if(snapshot.empty) { 
            container.innerHTML = '<div class="text-center py-12"><div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl text-gray-400"><i class="fa-solid fa-users-slash"></i></div><p class="text-gray-500 font-medium">Henüz öğrenci eklenmemiş.</p></div>'; 
            return; 
        }
        
        let html = `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-100"><thead class="bg-gray-50"><tr><th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ad Soyad</th><th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sınıf</th><th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bakiye</th><th class="relative px-6 py-4"><span class="sr-only">Eylemler</span></th></tr></thead><tbody class="bg-white divide-y divide-gray-100">`;
        
        snapshot.forEach(doc => {
            const s = doc.data();
            const bakiye = (s.toplamBorc || 0) - (s.toplamOdenen || 0);
            html += `
                <tr class="hover:bg-purple-50 cursor-pointer transition-colors group" onclick="renderOgrenciDetaySayfasi('${doc.id}', '${s.ad} ${s.soyad}')">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3 border border-white shadow-sm group-hover:scale-110 transition-transform">${s.ad[0]}${s.soyad[0]}</div>
                            <div class="text-sm font-bold text-gray-800">${s.ad} ${s.soyad}</div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap"><span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">${s.sinif}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-bold ${bakiye > 0 ? 'text-red-500' : 'text-green-600'}">${formatCurrency(bakiye)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <i class="fa-solid fa-chevron-right text-gray-300 group-hover:text-purple-600 transition-colors"></i>
                    </td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    });
}

// --- YARDIMCI: DÜZENLEME MODALI AÇ ---
function showEditStudentModal(db, currentUserId, appId, studentId) {
    const modal = document.getElementById('editStudentModal');
    
    getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId)).then(snap => {
        if(snap.exists()) {
            const s = snap.data();
            document.getElementById('editStudentId').value = studentId;
            document.getElementById('editStudentName').value = s.ad;
            document.getElementById('editStudentSurname').value = s.soyad;
            
            const classSelect = document.getElementById('editStudentClass');
            classSelect.value = s.sinif;
            
            classSelect.dispatchEvent(new Event('change'));

            setTimeout(() => {
                renderDersSecimi(s.sinif, 'editStudentOptionsContainer', 'editStudentDersSecimiContainer', s.takipDersleri);
                if (s.alan) {
                    const alanSelect = document.querySelector('#editStudentOptionsContainer select');
                    if (alanSelect) alanSelect.value = s.alan;
                }
                modal.style.display = 'block';
            }, 100);
        }
    });
}

// --- KAYIT FONKSİYONLARI ---
export async function saveNewStudent(db, currentUserId, appId) {
    const ad = document.getElementById('studentName').value.trim();
    const soyad = document.getElementById('studentSurname').value.trim();
    const sinif = document.getElementById('studentClass').value;
    const dersler = Array.from(document.querySelectorAll('#studentDersSecimiContainer input:checked')).map(cb => cb.value);
    const alanSelect = document.querySelector('#studentOptionsContainer select');
    const alan = alanSelect ? alanSelect.value : null;
    
    if(!ad || !soyad || !sinif) { alert('Lütfen Ad, Soyad ve Sınıf bilgilerini girin.'); return; }
    
    // Limit Kontrolü
    try {
        const profileRef = doc(db, "artifacts", appId, "users", currentUserId, "settings", "profile");
        const profileSnap = await getDoc(profileRef);
        let maxOgrenci = 10; 
        if (profileSnap.exists() && profileSnap.data().maxOgrenci !== undefined) {
            maxOgrenci = profileSnap.data().maxOgrenci;
        }
        const studentsColl = collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim");
        const snapshot = await getCountFromServer(studentsColl);
        const currentCount = snapshot.data().count;

        if (currentCount >= maxOgrenci) {
            document.getElementById('addStudentModal').style.display = 'none'; 
            if(confirm(`Paket limitiniz doldu! En fazla ${maxOgrenci} öğrenci kaydedebilirsiniz.\n\nPaketinizi yükseltmek ister misiniz?`)) {
                const upgradeBtn = document.getElementById('nav-paketyukselt');
                if(upgradeBtn) upgradeBtn.click();
            }
            return; 
        }
    } catch (e) { console.error(e); return; }

    await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), {
        ad, soyad, sinif, alan: alan, takipDersleri: dersler, olusturmaTarihi: serverTimestamp(), toplamBorc: 0, toplamOdenen: 0
    });
    document.getElementById('addStudentModal').style.display = 'none';
}

export async function saveStudentChanges(db, currentUserId, appId) {
    const id = document.getElementById('editStudentId').value;
    const ad = document.getElementById('editStudentName').value.trim();
    const soyad = document.getElementById('editStudentSurname').value.trim();
    const sinif = document.getElementById('editStudentClass').value;
    const dersler = Array.from(document.querySelectorAll('#editStudentDersSecimiContainer input:checked')).map(cb => cb.value);
    const alanSelect = document.querySelector('#editStudentOptionsContainer select');
    const alan = alanSelect ? alanSelect.value : null;
    
    await updateDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", id), {
        ad, soyad, sinif, alan: alan, takipDersleri: dersler
    });
    document.getElementById('editStudentModal').style.display = 'none';
}

// --- ÖĞRENCİ SİLME ---
export async function deleteStudentFull(db, currentUserId, appId) {
    const studentId = document.getElementById('editStudentId').value;
    if (!studentId) return;

    if (!confirm("DİKKAT! Bu öğrenci ve ona ait TÜM VERİLER kalıcı olarak silinecektir. \n\nBu işlem geri alınamaz. Onaylıyor musunuz?")) {
        return;
    }

    const btn = document.getElementById('btnDeleteStudent');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Siliniyor...';

    try {
        const studentRef = doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId);
        const subCollections = ['odevler', 'denemeler', 'hedefler', 'soruTakibi', 'koclukNotlari', 'mesajlar'];
        
        for (const subColName of subCollections) {
            const subColRef = collection(studentRef, subColName);
            const snapshot = await getDocs(subColRef);
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        }

        await deleteDoc(studentRef);
        document.getElementById('editStudentModal').style.display = 'none';
        alert("Öğrenci silindi.");
        document.getElementById('nav-ogrencilerim').click(); // Listeye dön
    } catch (error) {
        console.error("Silme hatası:", error);
        alert("Hata oluştu.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}
