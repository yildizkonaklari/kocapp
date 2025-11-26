import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc, getDocs,
    collection, query, orderBy, onSnapshot, serverTimestamp, where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR, formatCurrency, renderDersSecimi } from './helpers.js';

// --- ÖĞRENCİ DETAY SAYFASI ---
export function renderOgrenciDetaySayfasi(db, currentUserId, appId, studentId, studentName) {
    document.getElementById("mainContentTitle").textContent = `${studentName} - Detay`;
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <button onclick="document.getElementById('nav-ogrencilerim').click()" class="flex items-center text-sm text-gray-600 hover:text-purple-600 font-medium">
                <i class="fa-solid fa-arrow-left mr-1"></i> Listeye Dön
            </button>
        </div>
        
        <div class="bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row items-center mb-6 gap-4">
            <div class="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-2xl">
                ${studentName.split(' ').map(n=>n[0]).join('')}
            </div>
            <div class="flex-1 text-center md:text-left">
                <h2 class="text-3xl font-bold text-gray-800">${studentName}</h2>
                <p class="text-lg text-gray-500" id="studentDetailClass">...</p>
            </div>
            <div class="flex gap-2">
                <button id="btnEditStudent" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 border">Düzenle</button>
                <button id="btnMsgStudent" class="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm hover:bg-purple-200 border border-purple-200">Mesaj</button>
            </div>
        </div>

        <div class="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
            <button data-tab="ozet" class="tab-button active py-3 px-5 text-purple-600 border-b-2 border-purple-600 font-semibold">Özet & Analiz</button>
            <button data-tab="notlar" class="tab-button py-3 px-5 text-gray-500 hover:text-purple-600">Koçluk Notları</button>
        </div>
        
        <div id="tabContentArea"></div>
    `;

    // Event Listeners
    document.getElementById('btnEditStudent').addEventListener('click', () => showEditStudentModal(db, currentUserId, appId, studentId));
    document.getElementById('btnMsgStudent').addEventListener('click', () => document.getElementById('nav-mesajlar').click());

    // Tab Geçişleri
    const tabBtns = document.querySelectorAll('.tab-button');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Temizlik
            if (activeListeners.notlarUnsubscribe) activeListeners.notlarUnsubscribe();
            
            tabBtns.forEach(b => { b.classList.remove('active', 'text-purple-600', 'border-purple-600'); b.classList.add('text-gray-500'); });
            e.currentTarget.classList.add('active', 'text-purple-600', 'border-purple-600');
            e.currentTarget.classList.remove('text-gray-500');
            
            const tab = e.currentTarget.dataset.tab;
            if(tab === 'ozet') renderOzetTab(db, currentUserId, appId, studentId);
            else if(tab === 'notlar') renderKoclukNotlariTab(db, currentUserId, appId, studentId);
        });
    });

    // İlk açılış
    renderOzetTab(db, currentUserId, appId, studentId);
}

// --- ÖZET & ANALİZ TAB (YENİLENMİŞ) ---
async function renderOzetTab(db, currentUserId, appId, studentId) {
    const area = document.getElementById('tabContentArea');
    
    // Temel Öğrenci Bilgisi (Class, Tarih, Bakiye)
    const studentSnap = await getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId));
    const studentData = studentSnap.exists() ? studentSnap.data() : {};
    if(document.getElementById('studentDetailClass')) document.getElementById('studentDetailClass').textContent = studentData.sinif || '';

    area.innerHTML = `
        <div class="flex justify-end mb-4">
            <select id="summaryTimeFilter" class="p-2 border rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer">
                <option value="all">Tüm Zamanlar</option>
                <option value="month" selected>Bu Ay</option>
                <option value="week">Bu Hafta</option>
            </select>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            ${renderKpiCard('Tamamlanan Hedef', '0', 'bg-green-100 text-green-700', 'fa-bullseye', 'kpi-goal')}
            ${renderKpiCard('Tamamlanan Ödev', '0', 'bg-blue-100 text-blue-700', 'fa-list-check', 'kpi-homework')}
            ${renderKpiCard('Deneme Sayısı', '0', 'bg-purple-100 text-purple-700', 'fa-file-lines', 'kpi-exam-count')}
            ${renderKpiCard('Çözülen Soru', '0', 'bg-orange-100 text-orange-700', 'fa-pen', 'kpi-question')}
            ${renderKpiCard('Tamamlanan Seans', '0', 'bg-pink-100 text-pink-700', 'fa-calendar-check', 'kpi-session')}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
                <p class="text-xs text-gray-500 uppercase font-bold mb-1">Ortalama Net</p>
                <h3 id="stat-avg-net" class="text-2xl font-bold text-indigo-600">-</h3>
                <p class="text-[10px] text-gray-400 mt-1">Tüm denemeler</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
                <p class="text-xs text-gray-500 uppercase font-bold mb-1">Okuma (Sayfa)</p>
                <h3 id="stat-reading" class="text-2xl font-bold text-teal-600">-</h3>
                <p class="text-[10px] text-gray-400 mt-1">Rutin takibi</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
                <p class="text-xs text-gray-500 uppercase font-bold mb-1">En Başarılı Ders</p>
                <h3 id="stat-best-lesson" class="text-lg font-bold text-green-600">-</h3>
                <div class="w-full bg-green-100 h-1 mt-2 rounded-full"><div class="bg-green-500 h-1 rounded-full" style="width: 80%"></div></div>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
                <p class="text-xs text-gray-500 uppercase font-bold mb-1">Geliştirilecek Ders</p>
                <h3 id="stat-worst-lesson" class="text-lg font-bold text-red-500">-</h3>
                <div class="w-full bg-red-100 h-1 mt-2 rounded-full"><div class="bg-red-500 h-1 rounded-full" style="width: 40%"></div></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="space-y-4">
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-gray-700 mb-3 flex items-center"><i class="fa-solid fa-address-card mr-2 text-gray-400"></i> Öğrenci Künyesi</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between border-b border-gray-200 pb-1"><span>Sınıf:</span> <span class="font-semibold text-gray-800">${studentData.sinif || '-'}</span></div>
                        <div class="flex justify-between border-b border-gray-200 pb-1"><span>Kayıt:</span> <span class="font-semibold text-gray-800">${formatDateTR(studentData.olusturmaTarihi?.toDate().toISOString().split('T')[0])}</span></div>
                        <div class="flex justify-between pt-1"><span>Bakiye:</span> <span class="font-semibold ${((studentData.toplamBorc||0)-(studentData.toplamOdenen||0)) > 0 ? 'text-red-600':'text-green-600'}">${formatCurrency((studentData.toplamBorc||0)-(studentData.toplamOdenen||0))}</span></div>
                    </div>
                </div>
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 class="font-bold text-blue-800 mb-2 text-sm">Takip Edilen Dersler</h4>
                    <div class="flex flex-wrap gap-2">
                        ${(studentData.takipDersleri || []).map(d => `<span class="px-2 py-1 bg-white text-blue-600 rounded text-xs shadow-sm border border-blue-100">${d}</span>`).join('')}
                    </div>
                </div>
            </div>

            <div class="lg:col-span-2 bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden flex flex-col">
                <div class="bg-red-50 px-4 py-3 border-b border-red-100 flex justify-between items-center">
                    <h4 class="font-bold text-red-800 flex items-center gap-2"><i class="fa-solid fa-triangle-exclamation"></i> Gecikmiş Ödevler</h4>
                    <span id="overdue-count" class="bg-red-200 text-red-800 text-xs px-2 py-1 rounded-full font-bold">0</span>
                </div>
                <div id="overdue-list" class="p-2 flex-1 overflow-y-auto max-h-64">
                    <p class="text-center text-gray-400 text-sm py-8">Yükleniyor...</p>
                </div>
            </div>
        </div>
    `;

    // Filtre Listener
    const filterSelect = document.getElementById('summaryTimeFilter');
    filterSelect.addEventListener('change', () => loadStats(db, currentUserId, appId, studentId, filterSelect.value));

    // Verileri Yükle
    loadStats(db, currentUserId, appId, studentId, 'month'); // Varsayılan: Bu Ay
    loadOverdueHomeworks(db, currentUserId, appId, studentId); // Gecikmiş ödevler zamandan bağımsız
}

// --- YARDIMCI: KPI KARTI ---
function renderKpiCard(title, valueId, colorClass, icon, id) {
    return `
    <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-28 hover:shadow-md transition-shadow">
        <div class="w-10 h-10 rounded-full ${colorClass} flex items-center justify-center mb-2 text-lg"><i class="fa-solid ${icon}"></i></div>
        <h4 class="text-2xl font-bold text-gray-800 leading-none" id="${id}">0</h4>
        <p class="text-[10px] text-gray-500 font-bold uppercase leading-tight mt-1.5 tracking-wide">${title}</p>
    </div>`;
}

// --- VERİ YÜKLEME & HESAPLAMA ---
async function loadStats(db, uid, appId, sid, period) {
    // 1. Tarih Aralığını Belirle
    const now = new Date();
    let startDate = null;
    
    if (period === 'week') {
        const day = now.getDay() || 7; 
        if(day !== 1) now.setHours(-24 * (day - 1)); 
        startDate = now.toISOString().split('T')[0];
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else {
        startDate = '2000-01-01'; // Tüm zamanlar
    }

    // 2. Veritabanı Sorguları
    const qGoals = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "hedefler"), 
        where("durum", "==", "tamamlandi"),
        where("bitisTarihi", ">=", startDate)
    );
    const qHomework = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), 
        where("durum", "==", "tamamlandi"),
        where("bitisTarihi", ">=", startDate)
    );
    const qExams = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "denemeler"),
        where("tarih", ">=", startDate)
    );
    const qQuestions = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "soruTakibi"),
        where("tarih", ">=", startDate)
    );
    // Randevular: Ajanda kök dizinde olduğu için studentId ile filtreliyoruz
    const qSessions = query(collection(db, "artifacts", appId, "users", uid, "ajandam"),
        where("studentId", "==", sid),
        where("tarih", ">=", startDate),
        where("durum", "==", "tamamlandi")
    );

    // 3. Paralel Veri Çekme
    const [snapGoals, snapHomework, snapExams, snapQuestions, snapSessions] = await Promise.all([
        getDocs(qGoals),
        getDocs(qHomework),
        getDocs(qExams),
        getDocs(qQuestions),
        getDocs(qSessions)
    ]);

    // 4. KPI Güncelleme
    document.getElementById('kpi-goal').textContent = snapGoals.size;
    document.getElementById('kpi-homework').textContent = snapHomework.size;
    document.getElementById('kpi-exam-count').textContent = snapExams.size;
    document.getElementById('kpi-session').textContent = snapSessions.size;

    // 5. Soru ve Okuma Hesaplama
    let totalQuestions = 0;
    let totalReading = 0;
    snapQuestions.forEach(doc => {
        const d = doc.data();
        const adet = parseInt(d.adet) || 0;
        // Kitap okumayı ayır (Ders adı veya Konu içinde geçiyorsa)
        if (d.ders === 'Kitap Okuma' || (d.konu && d.konu.includes('Kitap'))) {
             totalReading += adet;
        } else {
             totalQuestions += adet;
        }
    });
    document.getElementById('kpi-question').textContent = totalQuestions;
    document.getElementById('stat-reading').textContent = totalReading;

    // 6. Deneme Analizi (Ortalama, En iyi/kötü ders)
    let totalNet = 0;
    let subjectStats = {}; // { 'Matematik': {total: 150, count: 3}, ... }

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
    document.getElementById('stat-avg-net').textContent = avgNet;

    // En iyi / En kötü dersi bul
    let bestLesson = { name: '-', avg: -Infinity };
    let worstLesson = { name: '-', avg: Infinity };

    for (const [name, stat] of Object.entries(subjectStats)) {
        const avg = stat.total / stat.count;
        if (avg > bestLesson.avg) bestLesson = { name, avg };
        if (avg < worstLesson.avg) worstLesson = { name, avg };
    }

    if (bestLesson.name !== '-') {
        document.getElementById('stat-best-lesson').textContent = `${bestLesson.name} (${bestLesson.avg.toFixed(1)})`;
        document.getElementById('stat-worst-lesson').textContent = `${worstLesson.name} (${worstLesson.avg.toFixed(1)})`;
    } else {
        document.getElementById('stat-best-lesson').textContent = '-';
        document.getElementById('stat-worst-lesson').textContent = '-';
    }
}

// --- GECİKMİŞ ÖDEVLER ---
async function loadOverdueHomeworks(db, uid, appId, sid) {
    const today = new Date().toISOString().split('T')[0];
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"),
        where("durum", "!=", "tamamlandi"),
        where("bitisTarihi", "<", today),
        orderBy("bitisTarihi", "asc")
    );

    const snap = await getDocs(q);
    document.getElementById('overdue-count').textContent = snap.size;
    const container = document.getElementById('overdue-list');
    
    if (snap.empty) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-gray-400 py-6"><i class="fa-regular fa-circle-check text-3xl mb-2 text-green-200"></i><p class="text-sm">Harika! Gecikmiş ödev yok.</p></div>';
    } else {
        container.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
            <div class="bg-white p-3 rounded-lg border-l-4 border-red-400 shadow-sm mb-2 hover:bg-red-50 transition-colors">
                <h5 class="font-bold text-gray-800 text-sm line-clamp-1">${d.title}</h5>
                <div class="flex justify-between items-center mt-1.5">
                    <span class="text-[10px] text-red-700 font-mono bg-red-100 px-1.5 py-0.5 rounded flex items-center"><i class="fa-regular fa-clock mr-1"></i> ${formatDateTR(d.bitisTarihi)}</span>
                    <button class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800" onclick="document.getElementById('nav-odevler').click()">İncele <i class="fa-solid fa-arrow-right ml-0.5"></i></button>
                </div>
            </div>`;
        }).join('');
    }
}

// --- NOTLAR TAB ---
function renderKoclukNotlariTab(db, currentUserId, appId, studentId) {
    const area = document.getElementById('tabContentArea');
    area.innerHTML = `
        <div class="mb-4">
            <h3 class="font-bold text-gray-800 mb-2">Yeni Not Ekle</h3>
            <div class="flex gap-2">
                <textarea id="newNoteInput" class="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" rows="2" placeholder="Öğrenci hakkında notlar..."></textarea>
                <button id="btnSaveNote" class="bg-purple-600 text-white px-6 rounded-lg font-semibold hover:bg-purple-700">Kaydet</button>
            </div>
        </div>
        <div id="noteList" class="space-y-3">
            <p class="text-center text-gray-400 py-4">Notlar yükleniyor...</p>
        </div>
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
        if(snap.empty) { container.innerHTML = '<p class="text-center text-gray-400 py-4">Henüz not yok.</p>'; return; }
        
        container.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
                <div class="p-4 bg-yellow-50 border border-yellow-100 rounded-lg relative group hover:shadow-sm transition-shadow">
                    <p class="text-gray-800 whitespace-pre-wrap text-sm">${d.icerik}</p>
                    <p class="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><i class="fa-regular fa-clock"></i> ${d.tarih?.toDate().toLocaleString()}</p>
                    <button class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" 
                            onclick="if(confirm('Silinsin mi?')) deleteDoc(doc(db, 'artifacts', '${appId}', 'users', '${currentUserId}', 'ogrencilerim', '${studentId}', 'koclukNotlari', '${doc.id}'))">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>`;
        }).join('');
    });
}

// --- ÖĞRENCİ LİSTESİ (SAYFA) ---
export function renderOgrenciSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Öğrencilerim";
    document.getElementById("mainContentArea").innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div class="relative w-full md:w-1/3">
                <input type="text" id="searchStudentInput" placeholder="Öğrenci ara..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i class="fa-solid fa-magnifying-glass text-gray-400"></i></div>
            </div>
            <button id="showAddStudentModalButton" class="w-full md:w-auto bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center">
                <i class="fa-solid fa-plus mr-2"></i>Yeni Öğrenci Ekle
            </button>
        </div>
        <div id="studentListContainer" class="bg-white p-4 rounded-lg shadow">
            <p class="text-gray-500 text-center py-4">Yükleniyor...</p>
        </div>
    `;
    
    document.getElementById('showAddStudentModalButton').addEventListener('click', () => {
        document.getElementById('studentName').value = '';
        document.getElementById('studentSurname').value = '';
        document.getElementById('studentClass').value = '12. Sınıf';
        renderDersSecimi('12. Sınıf', document.getElementById('studentDersSecimiContainer'));
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
        if(snapshot.empty) { container.innerHTML = '<p class="text-gray-500 text-center py-4">Henüz öğrenci yok.</p>'; return; }
        
        let html = `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Soyad</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sınıf</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bakiye</th><th class="relative px-6 py-3"><span class="sr-only">Eylemler</span></th></tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
        
        snapshot.forEach(doc => {
            const s = doc.data();
            const bakiye = (s.toplamBorc || 0) - (s.toplamOdenen || 0);
            html += `
                <tr class="hover:bg-gray-50 cursor-pointer transition-colors" onclick="renderOgrenciDetaySayfasi('${doc.id}', '${s.ad} ${s.soyad}')">
                    <td class="px-6 py-4 whitespace-nowrap"><div class="flex items-center"><div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold mr-3">${s.ad[0]}${s.soyad[0]}</div><div class="text-sm font-medium text-gray-900">${s.ad} ${s.soyad}</div></div></td>
                    <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">${s.sinif}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-bold ${bakiye > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(bakiye)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <i class="fa-solid fa-chevron-right text-gray-300"></i>
                    </td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    });
}

function showEditStudentModal(db, currentUserId, appId, studentId) {
    const modal = document.getElementById('editStudentModal');
    const dersContainer = document.getElementById('editStudentDersSecimiContainer');
    
    getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId)).then(snap => {
        if(snap.exists()) {
            const s = snap.data();
            document.getElementById('editStudentId').value = studentId;
            document.getElementById('editStudentName').value = s.ad;
            document.getElementById('editStudentSurname').value = s.soyad;
            document.getElementById('editStudentClass').value = s.sinif;
            renderDersSecimi(s.sinif, dersContainer, s.takipDersleri);
            modal.style.display = 'block';
        }
    });
}

export async function saveNewStudent(db, currentUserId, appId) {
    const ad = document.getElementById('studentName').value.trim();
    const soyad = document.getElementById('studentSurname').value.trim();
    const sinif = document.getElementById('studentClass').value;
    const dersler = Array.from(document.querySelectorAll('#studentDersSecimiContainer input:checked')).map(cb => cb.value);
    
    if(!ad || !soyad) { alert('Ad soyad girin'); return; }
    
    await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), {
        ad, soyad, sinif, takipDersleri: dersler, olusturmaTarihi: serverTimestamp(), toplamBorc: 0, toplamOdenen: 0
    });
    document.getElementById('addStudentModal').style.display = 'none';
}

export async function saveStudentChanges(db, currentUserId, appId) {
    const id = document.getElementById('editStudentId').value;
    const ad = document.getElementById('editStudentName').value.trim();
    const soyad = document.getElementById('editStudentSurname').value.trim();
    const sinif = document.getElementById('editStudentClass').value;
    const dersler = Array.from(document.querySelectorAll('#editStudentDersSecimiContainer input:checked')).map(cb => cb.value);
    
    await updateDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", id), {
        ad, soyad, sinif, takipDersleri: dersler
    });
    document.getElementById('editStudentModal').style.display = 'none';
}
