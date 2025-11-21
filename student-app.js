// =================================================================
// 1. FİREBASE KÜTÜPHANELERİ
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, getDoc, getDocs, collection, query, where, addDoc, updateDoc, 
    serverTimestamp, orderBy, limit, deleteDoc, writeBatch, onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FİREBASE AYARLARI ---
const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "kocluk-sistemi";

// =================================================================
// 2. GLOBAL DEĞİŞKENLER
// =================================================================

let currentUser = null;
let coachId = null;     
let studentDocId = null; 

let studentDersler = []; 
const studentRutinler = ["Paragraf", "Problem", "Kitap Okuma"];

const motivasyonSozleri = [
    "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.",
    "Geleceğini yaratmanın en iyi yolu, onu inşa etmektir.",
    "Bugünün acısı, yarının gücüdür. Çalışmaya devam et.",
    "Disiplin, hedefler ve başarı arasındaki köprüdür.",
    "Yapabileceğinin en iyisini yap. Gerisini merak etme."
];

let denemeChartInstance = null;
let currentCalDate = new Date();
let currentWeekOffset = 0;

let listeners = {
    chat: null,
    ajanda: null,
    hedefler: null,
    odevler: null,
    denemeler: null,
    upcomingAjanda: null
};

const DERS_HAVUZU = {
    'ORTAOKUL': ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "T.C. İnkılap", "Din Kültürü", "İngilizce"],
    'LISE': ["Türk Dili ve Edebiyatı", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "İngilizce"]
};

const SINAV_DERSLERI = {
    'TYT': ['Türkçe', 'Sosyal', 'Matematik', 'Fen'],
    'AYT': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Edebiyat', 'Tarih-1', 'Coğrafya-1'],
    'LGS': ['Türkçe', 'Matematik', 'Fen', 'İnkılap', 'Din', 'İngilizce'],
    'Diger': ['Genel']
};


// =================================================================
// 3. KİMLİK DOĞRULAMA VE BAŞLATMA
// =================================================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await initializeStudentApp(user.uid);
    } else {
        window.location.href = "student-login.html";
    }
});

async function initializeStudentApp(uid) {
    try {
        const profileRef = doc(db, "artifacts", appId, "users", uid, "settings", "profile");
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            coachId = profileData.kocId;
            studentDocId = profileData.linkedDocId;
            
            if (coachId && studentDocId) {
                loadDashboardData(); 
            } else {
                const modal = document.getElementById('modalMatchProfile');
                if(modal) {
                    modal.classList.remove('hidden');
                    modal.style.display = 'flex';
                }
            }
        } else {
            console.error("Profil ayarı bulunamadı.");
            signOut(auth);
        }
    } catch (error) { 
        console.error("Başlatma hatası:", error); 
    }
}

// Profil Eşleştirme Butonu
const btnMatch = document.getElementById('btnMatchProfile');
if (btnMatch) {
    btnMatch.addEventListener('click', async () => {
        const name = document.getElementById('matchName').value.trim();
        const surname = document.getElementById('matchSurname').value.trim();
        const errorEl = document.getElementById('matchError');

        if (!name || !surname) {
            errorEl.textContent = "Ad ve Soyad girmelisiniz.";
            errorEl.classList.remove('hidden');
            return;
        }

        btnMatch.disabled = true;
        btnMatch.textContent = "Aranıyor...";
        errorEl.classList.add('hidden');

        try {
            const q = query(
                collection(db, "artifacts", appId, "users", coachId, "ogrencilerim"),
                where("ad", "==", name),
                where("soyad", "==", surname)
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const matchDoc = querySnapshot.docs[0];
                studentDocId = matchDoc.id;

                await updateDoc(doc(db, "artifacts", appId, "users", currentUser.uid, "settings", "profile"), {
                    linkedDocId: studentDocId
                });

                document.getElementById('modalMatchProfile').classList.add('hidden');
                document.getElementById('modalMatchProfile').style.display = 'none';
                alert("Başarıyla eşleştiniz!");
                loadDashboardData(); 

            } else {
                errorEl.textContent = `Koçunuzun listesinde "${name} ${surname}" bulunamadı.`;
                errorEl.classList.remove('hidden');
            }
        } catch (error) {
            console.error("Eşleştirme hatası:", error);
            errorEl.textContent = "Hata: " + error.message;
            errorEl.classList.remove('hidden');
        } finally {
            btnMatch.disabled = false;
            btnMatch.textContent = "Profili Eşleştir";
        }
    });
}


// =================================================================
// 4. DASHBOARD YÖNETİMİ
// =================================================================

async function loadDashboardData() {
    if (!coachId || !studentDocId) return;

    const soz = motivasyonSozleri[Math.floor(Math.random() * motivasyonSozleri.length)];
    if(document.getElementById('motivasyonSozu')) document.getElementById('motivasyonSozu').textContent = `"${soz}"`;

    const studentRef = doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId);
    const studentSnap = await getDoc(studentRef);
    
    if (studentSnap.exists()) {
        const data = studentSnap.data();
        if(document.getElementById('headerStudentName')) document.getElementById('headerStudentName').textContent = data.ad;
        if(document.getElementById('profileName')) document.getElementById('profileName').textContent = `${data.ad} ${data.soyad}`;
        if(document.getElementById('profileClass')) document.getElementById('profileClass').textContent = data.sinif;
        if(document.getElementById('profileAvatar')) document.getElementById('profileAvatar').textContent = (data.ad[0] || '') + (data.soyad[0] || '');
        studentDersler = data.takipDersleri || (['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(data.sinif) ? DERS_HAVUZU['ORTAOKUL'] : DERS_HAVUZU['LISE']);
    }
    
    await updateHomeworkMetrics();
    loadActiveGoalsForDashboard();
}

async function updateHomeworkMetrics() {
    const listEl = document.getElementById('gecikmisOdevlerList');
    if(!listEl) return;
    
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"));
    const snapshot = await getDocs(q);
    // ... (Ödev metrikleri)
}

function loadActiveGoalsForDashboard() {
    const listEl = document.getElementById('dashboardHedefList');
    if(!listEl) return;
    
    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"),
        where("durum", "!=", "tamamlandi"),
        orderBy("durum"),
        limit(3)
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            listEl.innerHTML = `<p class="text-center text-gray-400 text-sm py-4 bg-white rounded-xl shadow-sm border border-gray-100">Aktif hedefin yok.</p>`;
            return;
        }
        listEl.innerHTML = snapshot.docs.map(doc => {
            const hedef = doc.data();
            return `
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs"><i class="fa-solid fa-bullseye"></i></div>
                <div class="flex-1"><p class="text-sm font-medium text-gray-700">${hedef.title}</p></div>
            </div>`;
        }).join('');
    });
}


// =================================================================
// 5. TAB NAVİGASYONU
// =================================================================

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target || e.currentTarget.closest('.nav-btn').dataset.target;
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');
        
        document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('active', 'text-indigo-600'); b.classList.add('text-gray-400'); });
        const activeBtn = e.currentTarget.closest('.nav-btn');
        activeBtn.classList.add('active', 'text-indigo-600'); activeBtn.classList.remove('text-gray-400');

        // Dinleyicileri temizle
        for(let key in listeners) { if(listeners[key]) { listeners[key](); listeners[key]=null; } }

        if (targetId === 'tab-denemeler') loadDenemelerTab();
        else if (targetId === 'tab-homework') loadHomeworksTab();
        else if (targetId === 'tab-messages') loadStudentMessages();
        else if (targetId === 'tab-tracking') { currentWeekOffset = 0; renderSoruTakibiGrid(); }
        else if (targetId === 'tab-ajanda') { currentCalDate = new Date(); loadCalendarDataAndDraw(currentCalDate); }
        else if (targetId === 'tab-goals') loadGoalsTab();
    });
});


// =================================================================
// 6. AJANDA (TAKVİM) YÖNETİMİ - DÜZELTİLDİ
// =================================================================

function loadCalendarDataAndDraw(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

    document.getElementById('currentMonthYear').textContent = date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

    // Dinleyici temizliği
    if (listeners.ajanda) listeners.ajanda();

    // Sorgu: StudentId ve Tarih aralığı
    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ajandam"),
        where("studentId", "==", studentDocId),
        where("tarih", ">=", startOfMonth),
        where("tarih", "<=", endOfMonth)
    );

    listeners.ajanda = onSnapshot(q, (snapshot) => {
        const appointments = [];
        snapshot.forEach(doc => appointments.push({ id: doc.id, ...doc.data() }));
        drawCalendarGrid(year, month, appointments);
        renderUpcomingAppointments(appointments);
    }, (error) => {
        console.error("Takvim hatası:", error);
        const grid = document.getElementById('calendarGrid');
        if (error.code === 'failed-precondition') {
             grid.innerHTML = `<div class="col-span-7 p-4 text-center text-red-500 text-xs bg-red-50 rounded">
                Veritabanı indeksi eksik.<br>
                Lütfen koçunuza bildirin veya konsoldaki linke tıklayın.
             </div>`;
        } else {
             grid.innerHTML = `<div class="col-span-7 p-4 text-center text-red-500">Veri yüklenemedi.</div>`;
        }
    });
}

function drawCalendarGrid(year, month, appointments) {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = ''; // Temizle

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];
    const offset = firstDay === 0 ? 6 : firstDay - 1; 

    // Boş günler
    for (let i = 0; i < offset; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = "bg-gray-50 min-h-[80px]";
        grid.appendChild(emptyDay);
    }

    // Dolu günler
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayAppts = appointments.filter(a => a.tarih === dateStr);
        const isToday = dateStr === todayStr;
        
        const dayEl = document.createElement('div');
        dayEl.className = `bg-white min-h-[80px] p-1 relative border border-gray-100 hover:bg-purple-50 transition-colors cursor-pointer`;
        
        let dotsHtml = `<div class="flex flex-wrap gap-1 mt-1">`;
        dayAppts.forEach(a => {
            const color = a.durum === 'tamamlandi' ? 'bg-green-500' : (a.tarih < todayStr ? 'bg-red-400' : 'bg-blue-500');
            dotsHtml += `<div class="h-2 w-2 rounded-full ${color}" title="${a.baslik}"></div>`;
        });
        dotsHtml += `</div>`;

        dayEl.innerHTML = `
            <div class="flex justify-between items-start">
                <span class="text-sm font-medium ${isToday ? 'bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-700'}">${day}</span>
            </div>
            ${dotsHtml}
        `;

        if (dayAppts.length > 0) {
            dayEl.onclick = () => {
                const msg = dayAppts.map(a => `⏰ ${a.baslangic}: ${a.baslik}`).join('\n');
                alert(`📅 ${formatDateTR(dateStr)}\n\n${msg}`);
            };
        }
        grid.appendChild(dayEl);
    }
}

function renderUpcomingAppointments(appointments) {
    const listEl = document.getElementById('appointmentListContainer');
    if(!listEl) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = appointments
        .filter(a => a.tarih >= todayStr && a.durum !== 'tamamlandi')
        .sort((a,b) => a.tarih.localeCompare(b.tarih));
        
    if (upcoming.length === 0) {
        listEl.innerHTML = '<p class="text-center text-gray-400 text-xs py-2">Bu ay için yaklaşan randevu yok.</p>';
        return;
    }

    listEl.innerHTML = upcoming.map(a => `
        <div class="p-3 bg-white border-l-4 border-indigo-500 rounded shadow-sm mb-2">
            <div class="flex justify-between">
                <span class="font-bold text-gray-800 text-sm">${formatDateTR(a.tarih)}</span>
                <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">${a.baslangic}</span>
            </div>
            <p class="text-xs text-gray-600 mt-1">${a.baslik}</p>
        </div>
    `).join('');
}

// Butonlar
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');
if(prevBtn) prevBtn.onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() - 1); loadCalendarDataAndDraw(currentCalDate); };
if(nextBtn) nextBtn.onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() + 1); loadCalendarDataAndDraw(currentCalDate); };


// =================================================================
// 7. DENEME SEKME YÖNETİMİ (AKORDİYON YAPISI)
// =================================================================

async function loadDenemelerTab() {
    const listEl = document.getElementById('studentDenemeList');
    if (!listEl) return;

    if(!coachId || !studentDocId) { listEl.innerHTML = '<p class="text-center text-red-500 py-4">Hata.</p>'; return; }

    const btnAdd = document.getElementById('btnAddNewDeneme');
    if(btnAdd) {
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.addEventListener('click', openDenemeModal);
    }

    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"),
        orderBy("tarih", "desc")
    );

    listeners.denemeler = onSnapshot(q, (snapshot) => {
        const denemeler = [];
        snapshot.forEach(doc => denemeler.push({ id: doc.id, ...doc.data() }));
        calculateDenemeStats(denemeler);

        if (denemeler.length === 0) {
            listEl.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm">Henüz deneme girilmemiş.</p>';
            return;
        }

        listEl.innerHTML = denemeler.map(d => {
            const isPending = d.onayDurumu === 'bekliyor';
            const net = parseFloat(d.toplamNet) || 0;
            
            // Akordiyon Detay
            let detailsHtml = '';
            if (d.netler) {
                detailsHtml = `<div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">`;
                for (const [ders, stats] of Object.entries(d.netler)) {
                    detailsHtml += `
                        <div class="flex justify-between bg-gray-50 p-2 rounded">
                            <span class="font-medium truncate mr-1">${ders}</span>
                            <span class="font-bold text-indigo-600">${stats.net}</span>
                        </div>`;
                }
                detailsHtml += `</div>`;
            } else {
                detailsHtml = `<p class="text-xs text-gray-400 mt-2 text-center">Detay yok.</p>`;
            }

            return `
                <div class="bg-white p-4 rounded-xl border ${isPending ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'} shadow-sm transition-all mb-3 cursor-pointer group" onclick="this.querySelector('.deneme-details').classList.toggle('hidden')">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-bold text-gray-800 text-sm truncate pr-2">${d.ad}</h4>
                        <div class="flex flex-col items-end">
                            <span class="text-[10px] px-2 py-1 rounded-full font-medium mb-1 ${isPending ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-800'}">
                                ${isPending ? 'Bekliyor' : 'Onaylı'}
                            </span>
                        </div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500 items-end">
                        <div class="flex flex-col">
                            <span class="mb-1 bg-gray-100 px-1.5 py-0.5 rounded w-max">${d.tur}</span>
                            <span><i class="fa-regular fa-calendar mr-1"></i>${formatDateTR(d.tarih)}</span>
                        </div>
                        <div class="text-right">
                             <span class="block text-[10px] text-gray-400 mb-0.5">Toplam Net</span>
                             <span class="font-bold text-indigo-600 text-lg">${net.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="deneme-details hidden animate-fade-in">
                        ${detailsHtml}
                    </div>
                </div>
            `;
        }).join('');
    });
}

// ... (calculateDenemeStats, renderStudentDenemeChart fonksiyonları aynı) ...
function calculateDenemeStats(denemeler) { 
    const onayli = denemeler.filter(d => d.onayDurumu === 'onaylandi');
    let totalNet = 0, maxNet = 0;
    onayli.forEach(d => {
        const net = parseFloat(d.toplamNet) || 0;
        totalNet += net; if (net > maxNet) maxNet = net;
    });
    const avg = onayli.length > 0 ? (totalNet / onayli.length) : 0;
    if(document.getElementById('studentKpiAvg')) document.getElementById('studentKpiAvg').textContent = avg.toFixed(2);
    if(document.getElementById('studentKpiMax')) document.getElementById('studentKpiMax').textContent = maxNet.toFixed(2);
    if(document.getElementById('studentKpiTotal')) document.getElementById('studentKpiTotal').textContent = denemeler.length;
    renderStudentDenemeChart(onayli);
}

function renderStudentDenemeChart(denemeler) {
    const ctx = document.getElementById('studentDenemeChart');
    if (!ctx) return;
    const sortedData = [...denemeler].sort((a,b) => a.tarih.localeCompare(b.tarih)).slice(-10);
    const labels = sortedData.map(d => formatDateTR(d.tarih).substring(0, 5));
    const dataPoints = sortedData.map(d => (parseFloat(d.toplamNet) || 0).toFixed(2));
    if (denemeChartInstance) denemeChartInstance.destroy();
    denemeChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Net', data: dataPoints, borderColor: '#7c3aed', backgroundColor: 'rgba(124, 58, 237, 0.1)', tension: 0.4, fill: true, pointRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, grid: { display: false } }, x: { grid: { display: false } } } }
    });
}


// ... (Diğer Fonksiyonlar: Soru Takip, Modal vb.) ...
// (Tamamı korunuyor, renderSoruTakibiGrid, openDenemeModal, saveSoruData vs.)

async function renderSoruTakibiGrid() {
    const container = document.getElementById('weeklyAccordion');
    if(!container) return;
    if(!coachId || !studentDocId) { container.innerHTML='<p class="p-4">Hata</p>'; return; }
    
    const weekDates = getWeekDates(currentWeekOffset);
    document.getElementById('weekRangeTitle').textContent = `${formatDateTR(weekDates[0].dateStr)} - ${formatDateTR(weekDates[6].dateStr)}`;
    
    const prevBtn = document.getElementById('prevWeekBtn');
    const nextBtn = document.getElementById('nextWeekBtn');
    if(prevBtn) prevBtn.onclick = () => { currentWeekOffset--; renderSoruTakibiGrid(); };
    if(nextBtn) { nextBtn.onclick = () => { currentWeekOffset++; renderSoruTakibiGrid(); }; nextBtn.disabled = currentWeekOffset >= 0; }
    
    const weekData = await loadWeekSoruData(weekDates[0].dateStr, weekDates[6].dateStr);
    let html = '';
    
    weekDates.forEach(day => {
        const dayData = weekData.filter(d => d.tarih === day.dateStr);
        const isExpanded = day.isToday;
        html += `
            <div class="accordion-item border-b border-gray-100 last:border-0">
                <button class="accordion-header w-full flex justify-between items-center p-4 rounded-xl border mb-2 text-left ${isExpanded ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-200'}" onclick="toggleAccordion(this)" aria-expanded="${isExpanded}">
                    <span class="font-bold text-lg">${day.dayNum} ${day.dayName}</span>
                    <i class="fa-solid fa-chevron-down transition-transform ${isExpanded ? 'rotate-180' : ''}"></i>
                </button>
                <div class="accordion-content ${isExpanded ? '' : 'hidden'} px-1 pb-4">
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        ${studentDersler.map(ders => {
                            const record = dayData.find(d => d.ders === ders);
                            return `<div class="subject-card"><label class="block text-xs font-semibold text-gray-500 mb-1 uppercase text-center w-full truncate">${ders}</label><input type="number" class="text-3xl font-bold text-center text-gray-800 w-full outline-none bg-transparent placeholder-gray-200" placeholder="0" value="${record ? record.adet : ''}" data-tarih="${day.dateStr}" data-ders="${ders}" data-doc-id="${record ? record.id : ''}" onblur="saveInput(this)"></div>`;
                        }).join('')}
                    </div>
                    <div class="text-left">
                        <button class="routine-btn" onclick="toggleRoutines(this)"><i class="fa-solid fa-list-check mr-2"></i> Rutinler</button>
                        <div class="hidden mt-3 grid grid-cols-2 gap-3 p-3 bg-gray-100 rounded-xl border border-gray-200">
                             ${studentRutinler.map(rutin => {
                                const record = dayData.find(d => d.ders === rutin);
                                return `<div class="subject-card bg-white"><label class="block text-xs font-semibold text-gray-500 mb-1 uppercase text-center">${rutin}</label><input type="number" class="text-2xl font-bold text-center text-gray-800 w-full outline-none placeholder-gray-200" placeholder="0" value="${record ? record.adet : ''}" data-tarih="${day.dateStr}" data-ders="${rutin}" data-doc-id="${record ? record.id : ''}" onblur="saveInput(this)"></div>`;
                             }).join('')}
                        </div>
                    </div>
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

// Helperlar
window.toggleAccordion = (btn) => {
    const content = btn.nextElementSibling;
    const icon = btn.querySelector('i');
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
        content.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
        icon.classList.remove('rotate-180');
        btn.className = "accordion-header w-full flex justify-between items-center p-4 rounded-xl border mb-2 text-left bg-white border-gray-200";
    } else {
        content.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        icon.classList.add('rotate-180');
        btn.className = "accordion-header w-full flex justify-between items-center p-4 rounded-xl border mb-2 text-left bg-purple-50 border-purple-500 text-purple-700";
    }
};
window.toggleRoutines = (btn) => { btn.nextElementSibling.classList.toggle('hidden'); };
window.saveInput = (input) => {
    const val = parseInt(input.value) || 0;
    const oldVal = parseInt(input.defaultValue) || 0;
    if (val !== oldVal) saveSoruData(input.dataset.docId, input.dataset.tarih, input.dataset.ders, val, input);
};
function getWeekDates(offset) {
    const days = ['Paz', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const week = [], today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek + (offset * 7));
    for (let i = 0; i < 7; i++) {
        const c = new Date(monday); c.setDate(monday.getDate() + i);
        week.push({ dateStr: c.toISOString().split('T')[0], dayName: days[i], dayNum: c.getDate(), isToday: c.toISOString().split('T')[0] === new Date().toISOString().split('T')[0] });
    }
    return week;
}
async function loadWeekSoruData(s, e) {
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), where("tarih", ">=", s), where("tarih", "<=", e));
    const snap = await getDocs(q);
    const data = []; snap.forEach(d => data.push({ id: d.id, ...d.data() })); return data;
}
async function saveSoruData(docId, tarih, ders, adet, inputEl) {
    const ref = collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi");
    inputEl.parentElement.classList.add('border-indigo-500');
    if(docId) {
        if(adet > 0) await updateDoc(doc(ref, docId), { adet, onayDurumu: 'bekliyor' });
        else { await deleteDoc(doc(ref, docId)); inputEl.dataset.docId = ""; }
    } else if(adet > 0) {
        const d = await addDoc(ref, { tarih, ders, adet, konu: "Genel", onayDurumu: 'bekliyor', eklenmeTarihi: serverTimestamp(), kocId: coachId });
        inputEl.dataset.docId = d.id;
    }
    inputEl.parentElement.classList.remove('border-indigo-500');
    inputEl.parentElement.classList.add('border-green-500');
    setTimeout(() => inputEl.parentElement.classList.remove('border-green-500'), 1000);
}

// --- MODAL VE DENEME EKLEME ---
document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', (e) => e.currentTarget.closest('.fixed').classList.add('hidden')));

const openDenemeModal = () => {
    document.getElementById('modalDenemeEkle').classList.remove('hidden');
    renderDenemeInputs('TYT');
    document.getElementById('inpDenemeTarih').value = new Date().toISOString().split('T')[0];
};
if(document.getElementById('btnOpenDenemeEkle')) document.getElementById('btnOpenDenemeEkle').addEventListener('click', openDenemeModal);

function renderDenemeInputs(tur) {
    const container = document.getElementById('denemeDersContainer');
    container.innerHTML = '';
    const dersler = SINAV_DERSLERI[tur] || SINAV_DERSLERI['Diger'];
    dersler.forEach(ders => {
        container.innerHTML += `<div class="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"><span class="text-gray-700 w-24 truncate font-medium">${ders}</span><div class="flex gap-2"><input type="number" placeholder="D" class="inp-deneme-d w-12 p-2 bg-green-50 border border-green-100 rounded text-center text-sm outline-none" data-ders="${ders}"><input type="number" placeholder="Y" class="inp-deneme-y w-12 p-2 bg-red-50 border border-red-100 rounded text-center text-sm outline-none" data-ders="${ders}"><input type="number" placeholder="B" class="inp-deneme-b w-12 p-2 bg-gray-50 border border-gray-200 rounded text-center text-sm outline-none" data-ders="${ders}"></div></div>`;
    });
}
document.getElementById('inpDenemeTur').addEventListener('change', (e) => renderDenemeInputs(e.target.value));
document.getElementById('btnSaveDeneme').addEventListener('click', async () => {
    const ad = document.getElementById('inpDenemeAd').value || "Deneme";
    const tur = document.getElementById('inpDenemeTur').value;
    const tarih = document.getElementById('inpDenemeTarih').value;
    const studentAd = document.getElementById('headerStudentName').textContent;
    const sinif = document.getElementById('profileClass').textContent;
    let totalNet = 0; const netler = {}; const katsayi = tur === 'LGS' ? 3 : 4;
    document.querySelectorAll('.inp-deneme-d').forEach(input => {
        const ders = input.dataset.ders;
        const d = parseInt(input.value) || 0;
        const y = parseInt(input.parentElement.querySelector('.inp-deneme-y').value) || 0;
        const b = parseInt(input.parentElement.querySelector('.inp-deneme-b').value) || 0;
        const net = d - (y / katsayi);
        totalNet += net;
        netler[ders] = { d, y, b, net: net.toFixed(2) };
    });
    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), {
        ad, tur, tarih, toplamNet: totalNet, netler, onayDurumu: 'bekliyor', kocId: coachId, studentId: studentDocId, studentAd, sinif, eklenmeTarihi: serverTimestamp()
    });
    document.getElementById('modalDenemeEkle').classList.add('hidden');
    showToast(`Deneme kaydedildi: ${totalNet.toFixed(2)} Net`);
});

function showToast(msg, isError=false) {
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-sm z-50 transition-opacity duration-300 ${isError ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`;
    t.classList.remove('hidden', 'opacity-0');
    setTimeout(() => { t.classList.add('opacity-0'); setTimeout(() => t.classList.add('hidden'), 300); }, 2000);
}
function formatDateTR(d) { if(!d) return ''; const [y,m,da] = d.split('-'); return `${da}.${m}.${y}`; }

document.getElementById('btnLogout').onclick = () => signOut(auth);
