// =================================================================
// 0. HATA YAKALAMA
// =================================================================
window.addEventListener('error', (e) => {
    const errorBox = document.getElementById('globalErrorDisplay');
    if(errorBox) {
        errorBox.classList.remove('hidden');
        errorBox.innerHTML = `<p>${e.message}</p>`;
    }
    console.error(e);
});

// =================================================================
// 1. FİREBASE VE AYARLAR
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, getDocs, collection, query, where, addDoc, updateDoc, 
    serverTimestamp, orderBy, limit, deleteDoc, writeBatch, onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { formatDateTR } from './modules/helpers.js';

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
// 2. GLOBAL DEĞİŞKENLER VE SABİTLER
// =================================================================
let currentUser = null;
let coachId = null;     
let studentDocId = null; 
let studentDersler = []; 
let homeworkChart = null; // Grafik instance

const AVATAR_LIBRARY = [
    "👨‍🎓", "👩‍🎓", "🚀", "🦁", "⚡", "🌟", "🎯", "📚",
    "🦊", "🐱", "🐶", "🐼", "🐯", "⚽", "🏀", "🎮"
];

const studentRutinler = ["Paragraf", "Problem", "Kitap Okuma"];
const DERS_HAVUZU = { 
    'ORTAOKUL': [
        "Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", 
        "T.C. İnkılap", "Din Kültürü", "İngilizce"
    ], 
    'LISE': [
        "Türk Dili ve Edebiyatı", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji",
        "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "İngilizce"
    ] 
};
const SINAV_DERSLERI = { 
    'TYT': ['Türkçe', 'Sosyal', 'Matematik', 'Fen'], 
    'AYT': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Edebiyat', 'Tarih-1', 'Coğrafya-1', 'Tarih-2', 'Coğrafya-2', 'Felsefe Grubu'], 
    'LGS': ['Türkçe', 'Matematik', 'Fen', 'İnkılap', 'Din', 'İngilizce'] 
};

let denemeChartInstance = null;
let currentCalDate = new Date();
let currentWeekOffset = 0;
let odevWeekOffset = 0;

let listeners = { chat: null, ajanda: null, hedefler: null, odevler: null, denemeler: null, upcomingAjanda: null, notifications: null, activeGoals: null, unreadMsg: null };

// =================================================================
// 3. KİMLİK DOĞRULAMA
// =================================================================
onAuthStateChanged(auth, async (user) => {
    if (user) { currentUser = user; await initializeStudentApp(user.uid); } 
    else { window.location.href = "student-login.html"; }
});

async function initializeStudentApp(uid) {
    try {
        const profileRef = doc(db, "artifacts", appId, "users", uid, "settings", "profile");
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
            const pd = profileSnap.data();
            coachId = pd.kocId;
            studentDocId = pd.linkedDocId;
            if (coachId && studentDocId) {
                loadDashboardData(); 
                enableHeaderIcons();
            } else {
                document.getElementById('modalMatchProfile').classList.remove('hidden');
                document.getElementById('modalMatchProfile').style.display = 'flex';
            }
        } else signOut(auth);
    } catch (e) { console.error(e); }
}

const btnMatch = document.getElementById('btnMatchProfile');
if (btnMatch) {
    btnMatch.onclick = async () => {
        const n = document.getElementById('matchName').value.trim(), s = document.getElementById('matchSurname').value.trim();
        if(!n||!s) return alert("Bilgileri girin.");
        const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim"), where("ad", "==", n), where("soyad", "==", s));
        const snap = await getDocs(q);
        if (!snap.empty) {
            studentDocId = snap.docs[0].id;
            await updateDoc(doc(db, "artifacts", appId, "users", currentUser.uid, "settings", "profile"), { linkedDocId: studentDocId });
            document.getElementById('modalMatchProfile').classList.add('hidden');
            alert("Eşleşme başarılı!");
            loadDashboardData();
            enableHeaderIcons();
        } else document.getElementById('matchError').classList.remove('hidden');
    };
}

// =================================================================
// 4. HEADER & AVATAR
// =================================================================
function enableHeaderIcons() {
    const btnMsg = document.getElementById('btnHeaderMessages');
    if(btnMsg) {
        btnMsg.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            document.getElementById('tab-messages').classList.remove('hidden');
            
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('active', 'text-indigo-600');
                b.classList.add('text-gray-400');
            });

            for(let k in listeners) { if(listeners[k] && k!=='notifications' && k!=='unreadMsg') { listeners[k](); listeners[k]=null; } }
            markMessagesAsRead();
            loadStudentMessages();
        };
        listenUnreadMessages();
    }

    const btnNotif = document.getElementById('btnHeaderNotifications');
    const dropNotif = document.getElementById('notificationDropdown');
    if(btnNotif && dropNotif) {
        btnNotif.onclick = (e) => { e.stopPropagation(); dropNotif.classList.toggle('hidden'); document.getElementById('headerNotificationDot').classList.add('hidden'); };
        document.getElementById('btnCloseNotifications').onclick = () => dropNotif.classList.add('hidden');
        document.addEventListener('click', (e) => { if (!dropNotif.contains(e.target) && !btnNotif.contains(e.target)) dropNotif.classList.add('hidden'); });
        loadNotifications();
    }

    const btnChangeAvatar = document.getElementById('btnChangeAvatar');
    const modalAvatar = document.getElementById('modalAvatarSelect');
    if (btnChangeAvatar && modalAvatar) {
        btnChangeAvatar.onclick = () => {
            const grid = document.getElementById('avatarGrid');
            grid.innerHTML = AVATAR_LIBRARY.map(icon => 
                `<button class="text-4xl p-2 hover:bg-gray-100 rounded-lg transition-colors" onclick="selectAvatar('${icon}')">${icon}</button>`
            ).join('');
            modalAvatar.classList.remove('hidden');
        };
    }
}

window.selectAvatar = async (icon) => {
    try {
        await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId), { avatarIcon: icon });
        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) {
            avatarEl.textContent = icon;
            avatarEl.style.backgroundColor = '#fff';
            avatarEl.style.fontSize = '3rem';
        }
        document.getElementById('modalAvatarSelect').classList.add('hidden');
        
        const headerLogo = document.querySelector('#headerLogoContainer i');
        if(headerLogo) {
            headerLogo.className = ''; 
            headerLogo.textContent = icon;
            headerLogo.style.fontStyle = 'normal';
        }
    } catch (e) { console.error(e); }
};

function loadNotifications() {
    const list = document.getElementById('notificationList'); if(!list) return;
    listeners.notifications = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), orderBy("olusturmaTarihi", "desc"), limit(5)), (snap) => {
        let html = '';
        snap.forEach(d => html += `<div class="p-2 border-b hover:bg-gray-50"><p class="text-xs font-bold">Yeni Hedef</p><p class="text-xs text-gray-600">${d.data().title}</p></div>`);
        list.innerHTML = html || '<p class="text-center text-xs py-4">Bildirim yok.</p>';
        if(!snap.empty) document.getElementById('headerNotificationDot').classList.remove('hidden');
    });
}

function listenUnreadMessages() {
    listeners.unreadMsg = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), where("gonderen", "==", "koc"), where("okundu", "==", false)), (snap) => {
        const b = document.getElementById('headerUnreadMsgCount');
        if(snap.size>0) { b.textContent=snap.size; b.classList.remove('hidden'); } else b.classList.add('hidden');
    });
}

// =================================================================
// 5. DASHBOARD & VERİ YÜKLEME
// =================================================================
async function loadDashboardData() {
    if (!coachId || !studentDocId) return;
    
    const snap = await getDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId));
    if (snap.exists()) {
        const d = snap.data();
        
        if(document.getElementById('headerStudentName')) document.getElementById('headerStudentName').textContent = d.ad;
        if(document.getElementById('profileName')) document.getElementById('profileName').textContent = `${d.ad} ${d.soyad}`;
        if(document.getElementById('profileClass')) document.getElementById('profileClass').textContent = d.sinif;
        if(document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = currentUser.email;
        
        const headerLogoContainer = document.getElementById('headerLogoContainer');
        if(d.avatarIcon && headerLogoContainer) {
            headerLogoContainer.innerHTML = `<span class="text-2xl">${d.avatarIcon}</span>`;
            headerLogoContainer.style.backgroundColor = 'transparent';
            headerLogoContainer.style.border = 'none';
        }

        const avatarEl = document.getElementById('profileAvatar');
        if (d.avatarIcon) {
            avatarEl.textContent = d.avatarIcon;
            avatarEl.style.backgroundColor = '#fff';
            avatarEl.style.fontSize = '3rem';
        } else {
            avatarEl.textContent = d.ad[0].toUpperCase();
            avatarEl.style.fontSize = '';
        }
        
        if (d.takipDersleri && Array.isArray(d.takipDersleri) && d.takipDersleri.length > 0) {
            studentDersler = d.takipDersleri;
        } else {
            const isOrtaokul = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(d.sinif);
            studentDersler = isOrtaokul ? DERS_HAVUZU['ORTAOKUL'] : DERS_HAVUZU['LISE'];
        }

        renderProfileLessons(studentDersler);
        
        const filterSelect = document.getElementById('dashboardTimeFilter');
        if (filterSelect) {
            const newFilterSelect = filterSelect.cloneNode(true);
            filterSelect.parentNode.replaceChild(newFilterSelect, filterSelect);
            newFilterSelect.addEventListener('change', () => {
                loadStudentStats(db, coachId, appId, studentDocId, newFilterSelect.value);
            });
        }
    }
    
    updateHomeworkMetrics(); // İlerleme Barı/Grafiği
    loadActiveGoalsForDashboard(); 
    loadStudentStats(db, coachId, appId, studentDocId, '30'); 
    loadUpcomingAppointments(db, coachId, appId, studentDocId);
    loadOverdueHomeworks(db, coachId, appId, studentDocId);
}

async function loadUpcomingAppointments(db, uid, appId, sid) {
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(collection(db, "artifacts", appId, "users", uid, "ajandam"), 
        where("studentId", "==", sid), 
        where("tarih", ">=", todayStr),
        orderBy("tarih", "asc"),
        limit(3)
    );
    const snap = await getDocs(q);
    const container = document.getElementById('upcomingAppointmentsList');
    if(!container) return;

    if (snap.empty) {
        container.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">Planlanmış randevu yok.</p>';
    } else {
        container.innerHTML = snap.docs.map(doc => {
            const a = doc.data();
            const isToday = a.tarih === todayStr;
            return `
            <div class="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full ${isToday ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600'} flex items-center justify-center font-bold text-sm shrink-0">
                        ${a.tarih.split('-')[2]}
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-gray-800 leading-none mb-1">${a.baslik || 'Görüşme'}</h4>
                        <p class="text-xs text-gray-500 flex items-center gap-1">
                            <i class="fa-regular fa-clock text-[10px]"></i> ${a.baslangic} - ${a.bitis}
                        </p>
                    </div>
                </div>
                ${isToday ? '<span class="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">BUGÜN</span>' : ''}
            </div>`;
        }).join('');
    }
}

async function loadStudentStats(db, uid, appId, sid, period) {
    const now = new Date();
    let startDate = null;
    
    if (period !== 'all') {
        const days = parseInt(period);
        const pastDate = new Date(now);
        pastDate.setDate(now.getDate() - days);
        startDate = pastDate.toISOString().split('T')[0];
    } else {
        startDate = '2000-01-01'; 
    }

    const qGoals = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "hedefler"), where("durum", "==", "tamamlandi"), where("bitisTarihi", ">=", startDate));
    const qHomework = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), where("durum", "==", "tamamlandi"), where("bitisTarihi", ">=", startDate));
    const qExams = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "denemeler"), where("tarih", ">=", startDate));
    const qQuestions = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "soruTakibi"), where("tarih", ">=", startDate));
    const qSessions = query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("studentId", "==", sid), where("tarih", ">=", startDate), where("durum", "==", "tamamlandi"));

    const [sGoals, sHomework, sExams, sQuestions, sSessions] = await Promise.all([
        getDocs(qGoals), getDocs(qHomework), getDocs(qExams), getDocs(qQuestions), getDocs(qSessions)
    ]);

    document.getElementById('kpiCompletedGoals').textContent = sGoals.size;
    document.getElementById('kpiCompletedHomework').textContent = sHomework.size;
    document.getElementById('kpiTotalExams').textContent = sExams.size;
    document.getElementById('kpiTotalSessions').textContent = sSessions.size;

    let totalQ = 0;
    let totalRead = 0;
    sQuestions.forEach(doc => {
        const d = doc.data();
        const adet = parseInt(d.adet) || 0;
        if (d.ders === 'Kitap Okuma' || (d.konu && d.konu.includes('Kitap'))) totalRead += adet;
        else totalQ += adet;
    });
    document.getElementById('kpiTotalQuestions').textContent = totalQ;
    document.getElementById('kpiReading').textContent = totalRead;

    let totalNet = 0;
    let subjectStats = {}; 

    sExams.forEach(doc => {
        const d = doc.data();
        totalNet += (parseFloat(d.toplamNet) || 0);
        if(d.netler) {
            for (const [ders, stats] of Object.entries(d.netler)) {
                if (!subjectStats[ders]) subjectStats[ders] = { total: 0, count: 0 };
                subjectStats[ders].total += (parseFloat(stats.net) || 0);
                subjectStats[ders].count++;
            }
        }
    });

    const avgNet = sExams.size > 0 ? (totalNet / sExams.size).toFixed(2) : '-';
    document.getElementById('kpiAvgNet').textContent = avgNet;

    let bestLesson = { name: '-', avg: -Infinity };
    for (const [name, stat] of Object.entries(subjectStats)) {
        const avg = stat.total / stat.count;
        if (avg > bestLesson.avg) bestLesson = { name, avg };
    }
    if(bestLesson.name !== '-') {
        document.getElementById('kpiBestLesson').textContent = `${bestLesson.name} (${bestLesson.avg.toFixed(1)})`;
    } else {
        document.getElementById('kpiBestLesson').textContent = '-';
    }
}

function renderProfileLessons(dersler) {
    const profileTab = document.getElementById('tab-profile');
    if(!profileTab) return;

    const oldSection = document.getElementById('profileLessonsContainer');
    if(oldSection) oldSection.remove();

    const infoCards = profileTab.querySelectorAll('.profile-info-card');
    const lastInfoCard = infoCards[infoCards.length - 1]; 

    if (lastInfoCard) {
        const lessonsDiv = document.createElement('div');
        lessonsDiv.id = 'profileLessonsContainer';
        lessonsDiv.className = 'mt-6';
        lessonsDiv.innerHTML = `
            <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Takip Edilen Dersler</h3>
            <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div class="flex flex-wrap gap-2">
                    ${dersler.map(d => `<span class="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">${d}</span>`).join('')}
                </div>
            </div>
        `;
        lastInfoCard.parentNode.insertBefore(lessonsDiv, lastInfoCard.nextSibling);
    }
}

// YENİ: Haftalık Ödev Grafiği (Doughnut)
async function updateHomeworkMetrics() {
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"));
    const snap = await getDocs(q);
    const today = new Date().toISOString().split('T')[0];
    let total=0, done=0;
    
    // Sadece bu haftanın ödevlerini alabiliriz ama şimdilik "Tüm Zamanlar" veya "Aktifler" mantığıyla gidelim
    // Dashboard'daki chart "Haftalık" dediği için tarih kontrolü ekleyebiliriz
    // Şimdilik genel yüzdeyi gösteriyorum
    
    snap.forEach(doc => {
        const d = doc.data(); 
        total++;
        if(d.durum==='tamamlandi') done++;
    });
    
    const percent = total === 0 ? 0 : Math.round((done/total)*100);
    
    document.getElementById('homeworkChartPercent').textContent = `%${percent}`;
    document.getElementById('homeworkChartText').textContent = `${done} Tamamlanan / ${total} Toplam`;

    const ctx = document.getElementById('weeklyHomeworkChart');
    if(ctx) {
        if(homeworkChart) homeworkChart.destroy();
        
        homeworkChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Tamamlanan', 'Kalan'],
                datasets: [{
                    data: [done, total - done],
                    backgroundColor: ['#4f46e5', '#e5e7eb'], // indigo-600, gray-200
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                animation: { animateScale: true, animateRotate: true }
            }
        });
    }
}

async function loadActiveGoalsForDashboard() {
    const list = document.getElementById('dashboardHedefList'); if(!list) return;
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), where("durum","!=","tamamlandi"), orderBy("bitisTarihi", "asc"), limit(10));
    
    // Snapshot kullanmıyoruz dashboard load'da, ama listener ekleyebiliriz.
    // Şimdilik getDocs ile çekiyoruz.
    const snap = await getDocs(q);
    
    if(snap.empty) {
        list.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Aktif hedef yok.</p>';
    } else {
        list.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
            <div class="bg-white p-2.5 rounded-lg shadow-sm border border-gray-100 mb-1.5 flex justify-between items-center">
                <div class="flex-1 min-w-0 pr-2">
                    <p class="text-sm font-medium text-gray-700 truncate">${d.title}</p>
                    <p class="text-[10px] text-gray-400 flex items-center gap-1"><i class="fa-regular fa-clock"></i> ${formatDateTR(d.bitisTarihi)}</p>
                </div>
                <span class="w-2 h-2 rounded-full bg-green-400"></span>
            </div>`;
        }).join('');
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
    const container = document.getElementById('gecikmisOdevlerList');
    if(!container) return;
    
    if (snap.empty) {
        container.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Gecikmiş ödev yok.</p>';
    } else {
        container.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
            <div class="bg-red-50 p-2.5 rounded-lg border border-red-100 mb-1.5 flex justify-between items-center">
                <div class="flex-1 min-w-0 pr-2">
                    <p class="text-sm font-bold text-red-700 truncate">${d.title}</p>
                    <p class="text-[10px] text-red-500 flex items-center gap-1"><i class="fa-solid fa-calendar-xmark"></i> ${formatDateTR(d.bitisTarihi)}</p>
                </div>
            </div>`;
        }).join('');
    }
}

// ... (Kalan fonksiyonlar aynı: renderKoclukNotlariTab, renderOgrenciSayfasi, showEditStudentModal, saveNewStudent, saveStudentChanges vb.)
// Ancak student-app.js'de koçluk notları ve öğrenci sayfası fonksiyonları kullanılmıyor, sadece öğrenci paneli fonksiyonları var.
// Bu yüzden sadece alt menü ve modüllerin geri kalanı korunmalı.

// =================================================================
// 6. TAB NAVİGASYONU
// =================================================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const currentBtn = e.currentTarget.closest('.nav-btn');
        const targetId = currentBtn.dataset.target;

        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'text-indigo-600');
            b.classList.add('text-gray-400');
        });
        currentBtn.classList.add('active', 'text-indigo-600');
        currentBtn.classList.remove('text-gray-400');

        const centerIcon = document.querySelector('.bottom-nav-center-btn');
        if(centerIcon) {
            if (targetId === 'tab-tracking') {
                centerIcon.classList.remove('bg-white', 'text-indigo-600');
                centerIcon.classList.add('bg-indigo-600', 'text-white');
            } else {
                centerIcon.classList.remove('bg-indigo-600', 'text-white');
                centerIcon.classList.add('bg-white', 'text-indigo-600');
            }
        }

        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        for(let k in listeners) if(listeners[k] && k!=='notifications' && k!=='activeGoals' && k!=='unreadMsg') { listeners[k](); listeners[k]=null; }

        if (targetId === 'tab-homework') { odevWeekOffset=0; loadHomeworksTab(); }
        else if (targetId === 'tab-messages') { markMessagesAsRead(); loadStudentMessages(); }
        else if (targetId === 'tab-tracking') { currentWeekOffset=0; renderSoruTakibiGrid(); }
        else if (targetId === 'tab-ajanda') { currentCalDate=new Date(); loadCalendarDataAndDraw(currentCalDate); }
        else if (targetId === 'tab-goals') loadGoalsTab();
        else if (targetId === 'tab-denemeler') loadDenemelerTab();
        else if (targetId === 'tab-home') loadDashboardData();
    });
});

// =================================================================
// 7. MODÜLLER
// =================================================================

// --- SORU TAKİBİ ---
async function renderSoruTakibiGrid() {
    const container = document.getElementById('weeklyAccordion'); if(!container) return;
    if(!coachId) { container.innerHTML='<p class="text-center text-red-500">Hata.</p>'; return; }
    container.innerHTML = '<p class="text-center text-gray-400">Yükleniyor...</p>';
    
    const dates = getWeekDates(currentWeekOffset);
    document.getElementById('weekRangeTitle').textContent = `${dates[0].dateStr} - ${dates[6].dateStr}`;
    
    document.getElementById('prevWeekBtn').onclick = () => { currentWeekOffset--; renderSoruTakibiGrid(); };
    const next = document.getElementById('nextWeekBtn');
    next.onclick = () => { currentWeekOffset++; renderSoruTakibiGrid(); };
    next.disabled = currentWeekOffset >= 0;

    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), where("tarih", ">=", dates[0].dateStr), where("tarih", "<=", dates[6].dateStr));
    const snap = await getDocs(q);
    const data = []; snap.forEach(d => data.push({id:d.id, ...d.data()}));

    container.innerHTML = dates.map(day => {
        const isToday = day.isToday;
        
        const createCard = (label, isRoutine = false) => {
            const r = data.find(d => d.tarih === day.dateStr && d.ders === label);
            const val = r ? r.adet : '';
            const isApproved = r && r.onayDurumu === 'onaylandi';
            const isPending = r && r.onayDurumu === 'bekliyor';
            
            let borderClass = 'border-gray-200';
            let bgClass = 'bg-white';
            let textClass = 'text-gray-800';
            let statusIcon = '';

            if (isApproved) {
                borderClass = 'border-green-400';
                bgClass = 'bg-green-50';
                textClass = 'text-green-700';
                statusIcon = '<i class="fa-solid fa-check-circle text-green-500 absolute top-1 right-1 text-[10px]"></i>';
            } else if (isPending) {
                borderClass = 'border-orange-300';
                bgClass = 'bg-orange-50';
                textClass = 'text-orange-700';
                statusIcon = '<i class="fa-solid fa-clock text-orange-400 absolute top-1 right-1 text-[10px]"></i>';
            }

            return `
            <div class="subject-card relative p-2 rounded-lg border ${borderClass} ${bgClass} shadow-sm flex flex-col items-center justify-center transition-all">
                ${statusIcon}
                <label class="text-[10px] font-bold text-center w-full truncate text-gray-500 mb-1" title="${label}">${label}</label>
                <input type="number" 
                    class="text-2xl font-bold text-center w-full outline-none bg-transparent placeholder-gray-300 ${textClass}" 
                    placeholder="0" 
                    value="${val}" 
                    data-tarih="${day.dateStr}" 
                    data-ders="${label}" 
                    data-doc-id="${r ? r.id : ''}" 
                    ${isApproved ? 'disabled' : ''} 
                    onblur="saveInput(this)">
                <span class="text-[9px] text-gray-400">${isRoutine && label === 'Kitap Okuma' ? 'Sayfa' : 'Soru'}</span>
            </div>`;
        };

        return `
        <div class="accordion-item border-b last:border-0">
            <button class="accordion-header w-full flex justify-between p-4 rounded-xl border mb-2 ${isToday?'bg-purple-50 border-purple-500 text-purple-700':'bg-white border-gray-200'}" onclick="toggleAccordion(this)" aria-expanded="${isToday}">
                <span class="font-bold">${day.dayNum} ${day.dayName}</span>
                <i class="fa-solid fa-chevron-down transition-transform"></i>
            </button>
            <div class="accordion-content ${isToday?'':'hidden'} px-1 pb-4">
                <div class="mb-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <h4 class="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2 pl-1 flex items-center"><i class="fa-solid fa-star mr-1"></i> Rutinler</h4>
                    <div class="grid grid-cols-3 gap-2">
                        ${studentRutinler.map(r => createCard(r, true)).join('')}
                    </div>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 pl-1 flex items-center"><i class="fa-solid fa-book mr-1"></i> Dersler</h4>
                    <div class="grid grid-cols-3 gap-2">
                        ${studentDersler.length > 0 
                            ? studentDersler.map(d => createCard(d)).join('') 
                            : '<p class="col-span-3 text-center text-xs text-gray-400 py-2">Takip edilen ders bulunamadı.</p>'}
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- ÖDEVLER ---
function loadHomeworksTab() {
    const container = document.getElementById('studentOdevList');
    if(!container) return;

    container.innerHTML = `
        <div class="flex justify-between items-center mb-4 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
            <button id="btnOdevPrevWeek" class="p-2 hover:bg-gray-100 rounded-full text-gray-600"><i class="fa-solid fa-chevron-left"></i></button>
            <h3 id="odevWeekRangeDisplay" class="font-bold text-gray-800 text-sm">...</h3>
            <button id="btnOdevNextWeek" class="p-2 hover:bg-gray-100 rounded-full text-gray-600"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <div id="odevWeeklyGrid" class="space-y-4 pb-20">
            <p class="text-center text-gray-400 py-8">Yükleniyor...</p>
        </div>
    `;

    document.getElementById('btnOdevPrevWeek').onclick = () => { odevWeekOffset--; renderOdevCalendar(); };
    document.getElementById('btnOdevNextWeek').onclick = () => { odevWeekOffset++; renderOdevCalendar(); };

    renderOdevCalendar();
}

function renderOdevCalendar() {
    const grid = document.getElementById('odevWeeklyGrid');
    const rangeDisplay = document.getElementById('odevWeekRangeDisplay');
    
    const today = new Date();
    const currentDay = today.getDay(); 
    const diff = today.getDate() - currentDay + (currentDay == 0 ? -6 : 1) + (odevWeekOffset * 7); 
    const startOfWeek = new Date(today.setDate(diff));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    rangeDisplay.textContent = `${formatDateTR(startOfWeek.toISOString().split('T')[0])} - ${formatDateTR(endOfWeek.toISOString().split('T')[0])}`;

    listeners.odevler = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler")), (snap) => {
        const allOdevs = [];
        snap.forEach(doc => allOdevs.push({id: doc.id, ...doc.data()}));

        grid.innerHTML = '';
        let weeklyTotal = 0;
        let weeklyDone = 0;

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + i);
            const dateStr = dayDate.toISOString().split('T')[0];
            const dayName = dayDate.toLocaleDateString('tr-TR', { weekday: 'long' });
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            const dailyOdevs = allOdevs.filter(o => o.bitisTarihi === dateStr);
            
            dailyOdevs.forEach(o => {
                weeklyTotal++;
                if(o.durum === 'tamamlandi') weeklyDone++;
            });

            const dayCard = document.createElement('div');
            dayCard.className = `bg-white rounded-xl border ${isToday ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200'} overflow-hidden`;
            
            let contentHtml = `
                <div class="p-2 ${isToday ? 'bg-indigo-50' : 'bg-gray-50'} border-b border-gray-100 flex justify-between items-center">
                    <span class="font-bold text-sm ${isToday ? 'text-indigo-700' : 'text-gray-700'}">${dayName}</span>
                    <span class="text-xs text-gray-500">${formatDateTR(dateStr)}</span>
                </div>
                <div class="p-2 space-y-2">
            `;

            if (dailyOdevs.length === 0) {
                contentHtml += `<p class="text-center text-xs text-gray-400 py-2">Ödev yok.</p>`;
            } else {
                dailyOdevs.forEach(o => {
                    let statusClass = "bg-blue-50 border-blue-100 text-blue-800"; 
                    let statusText = "Yapılacak";
                    let actionBtn = `<button class="w-full mt-2 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700 transition-colors" onclick="completeOdev('${o.id}')">Tamamladım</button>`;
                    const todayStr = new Date().toISOString().split('T')[0];

                    if (o.durum === 'tamamlandi') {
                        if (o.onayDurumu === 'onaylandi') {
                            statusClass = "bg-green-50 border-green-100 text-green-800";
                            statusText = '<i class="fa-solid fa-check-double"></i> Tamamlandı';
                            actionBtn = '';
                        } else {
                            statusClass = "bg-orange-50 border-orange-100 text-orange-800";
                            statusText = '<i class="fa-solid fa-clock"></i> Onay Bekliyor';
                            actionBtn = '';
                        }
                    } else if (o.bitisTarihi < todayStr) {
                        statusClass = "bg-red-50 border-red-100 text-red-800";
                        statusText = "Gecikti";
                    }

                    contentHtml += `
                        <div class="border rounded-lg p-3 ${statusClass}">
                            <div class="flex justify-between items-start mb-1">
                                <h4 class="font-bold text-sm leading-tight">${o.title}</h4>
                                <span class="text-[10px] font-bold px-1.5 py-0.5 bg-white bg-opacity-50 rounded">${statusText}</span>
                            </div>
                            <p class="text-xs opacity-80 mb-1">${o.aciklama || ''}</p>
                            ${actionBtn}
                        </div>
                    `;
                });
            }
            contentHtml += `</div>`;
            dayCard.innerHTML = contentHtml;
            grid.appendChild(dayCard);
        }

        const p = weeklyTotal === 0 ? 0 : Math.round((weeklyDone / weeklyTotal) * 100);
        if(document.getElementById('haftalikIlerlemeText2')) document.getElementById('haftalikIlerlemeText2').textContent = `%${p}`;
        if(document.getElementById('haftalikIlerlemeBar2')) document.getElementById('haftalikIlerlemeBar2').style.width = `${p}%`;
    });
}

window.completeOdev = async (odevId) => {
    if(!confirm("Ödevi tamamladın mı?")) return;
    try {
        await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler", odevId), {
            durum: 'tamamlandi',
            onayDurumu: 'bekliyor'
        });
    } catch (e) { console.error(e); alert("Hata oluştu."); }
};

// --- HEDEFLER ---
function loadGoalsTab() {
    const list = document.getElementById('studentHedefList'); if(!list) return;
    listeners.hedefler = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), orderBy("olusturmaTarihi", "desc")), (snap) => {
        list.innerHTML = snap.empty ? '<p class="text-center text-gray-400">Hedef yok.</p>' : snap.docs.map(d => {
            const h = d.data(); const isDone = h.durum==='tamamlandi';
            return `<div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-2 flex gap-3"><div class="w-8 h-8 rounded-full ${isDone?'bg-green-100 text-green-600':'bg-purple-100 text-purple-600'} flex items-center justify-center text-xs"><i class="fa-solid ${isDone?'fa-check':'fa-bullseye'}"></i></div><div><h4 class="font-bold text-sm">${h.title}</h4><p class="text-xs text-gray-500">${h.aciklama||''}</p></div></div>`;
        }).join('');
    });
}

// --- DENEMELER ---
function loadDenemelerTab() {
    const list = document.getElementById('studentDenemeList'); if(!list) return;
    const btn = document.getElementById('btnAddNewDeneme');
    if(btn) { const n=btn.cloneNode(true); btn.parentNode.replaceChild(n,btn); n.onclick=openDenemeModal; }
    
    listeners.denemeler = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), orderBy("tarih", "desc")), (snap) => {
        const data = []; snap.forEach(d => data.push({id:d.id, ...d.data()}));
        const onayli = data.filter(x=>x.onayDurumu==='onaylandi');
        let totalNet=0, maxNet=0; onayli.forEach(x=>{ const n=parseFloat(x.toplamNet); totalNet+=n; if(n>maxNet) maxNet=n; });
        if(document.getElementById('studentKpiAvg')) document.getElementById('studentKpiAvg').textContent = (onayli.length ? (totalNet/onayli.length) : 0).toFixed(2);
        if(document.getElementById('studentKpiMax')) document.getElementById('studentKpiMax').textContent = maxNet.toFixed(2);
        if(document.getElementById('studentKpiTotal')) document.getElementById('studentKpiTotal').textContent = data.length;
        
        const ctx = document.getElementById('studentDenemeChart');
        if(ctx) {
            const sorted = [...onayli].sort((a,b) => a.tarih.localeCompare(b.tarih)).slice(-10);
            if(denemeChartInstance) denemeChartInstance.destroy();
            denemeChartInstance = new Chart(ctx, { type: 'line', data: { labels: sorted.map(d=>d.tarih.slice(5)), datasets: [{ label: 'Net', data: sorted.map(d=>d.toplamNet), borderColor: '#7c3aed', tension: 0.4 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { display: false } } } });
        }

        list.innerHTML = data.length === 0 ? '<p class="text-center text-gray-400">Deneme yok.</p>' : data.map(d => {
            const pending = d.onayDurumu==='bekliyor'; const net = parseFloat(d.toplamNet)||0;
            return `<div class="bg-white p-4 rounded-xl border ${pending?'border-yellow-200 bg-yellow-50':'border-gray-200'} shadow-sm mb-2"><div class="flex justify-between"><span class="font-bold text-sm text-gray-800">${d.ad}</span><span class="text-[10px] px-2 py-1 rounded-full ${pending?'bg-yellow-200 text-yellow-800':'bg-green-100 text-green-800'}">${pending?'Bekliyor':'Onaylı'}</span></div><div class="flex justify-between mt-2 text-xs text-gray-500"><span>${d.tur} • ${d.tarih}</span><span class="font-bold text-indigo-600 text-base">${net.toFixed(2)} Net</span></div></div>`;
        }).join('');
    });
}

// --- MESAJLAR ---
function loadStudentMessages() {
    const container = document.getElementById('studentMessagesContainer'); if(!container) return;
    listeners.chat = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), orderBy("tarih")), (snap) => {
        container.innerHTML = snap.docs.map(d => {
            const m = d.data(); const me = m.gonderen === 'ogrenci';
            return `<div class="flex w-full ${me?'justify-end':'justify-start'}"><div class="max-w-[80%] px-3 py-2 rounded-2xl text-sm ${me?'bg-indigo-600 text-white':'bg-white border'}"><p>${m.text}</p></div></div>`;
        }).join('');
        container.scrollTop = container.scrollHeight;
    });
}
document.getElementById('studentChatForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const inp = document.getElementById('studentMessageInput');
    if(inp.value.trim()) { await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), { text: inp.value, gonderen: 'ogrenci', tarih: serverTimestamp(), okundu: false, kocId: coachId }); inp.value=''; }
});
async function markMessagesAsRead() {
    const snap = await getDocs(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), where("gonderen", "==", "koc"), where("okundu", "==", false)));
    const b = writeBatch(db); snap.forEach(d => b.update(d.ref, { okundu: true })); await b.commit();
}

// --- AJANDA ---
function loadCalendarDataAndDraw(date) {
    const m = date.getMonth(), y = date.getFullYear();
    document.getElementById('currentMonthYear').textContent = date.toLocaleString('tr-TR', {month:'long', year:'numeric'});
    const s = new Date(y, m, 1).toISOString().split('T')[0];
    const e = new Date(y, m+1, 0).toISOString().split('T')[0];
    listeners.ajanda = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ajandam"), where("studentId", "==", studentDocId), where("tarih", ">=", s), where("tarih", "<=", e)), (snap) => {
        const appts = []; snap.forEach(d => appts.push(d.data()));
        const grid = document.getElementById('calendarGrid'); grid.innerHTML='';
        const days = new Date(y, m+1, 0).getDate(); const offset = new Date(y, m, 1).getDay() || 7;
        for(let i=1; i<offset; i++) grid.innerHTML += `<div class="bg-gray-50 min-h-[60px]"></div>`;
        for(let d=1; d<=days; d++) {
            const dateStr = `${y}-${(m+1).toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
            const has = appts.some(a => a.tarih === dateStr);
            grid.innerHTML += `<div class="bg-white min-h-[60px] border p-1 ${has?'bg-blue-50':''}"><span class="text-sm text-gray-700">${d}</span>${has?'<div class="w-2 h-2 bg-blue-500 rounded-full mx-auto"></div>':''}</div>`;
        }
        const list = document.getElementById('appointmentListContainer');
        const today = new Date().toISOString().split('T')[0];
        const up = appts.filter(a => a.tarih >= today).sort((a,b) => a.tarih.localeCompare(b.tarih));
        list.innerHTML = up.length ? up.map(a => `<div class="bg-white p-3 rounded border-l-4 border-blue-500 shadow-sm mb-2"><p class="font-bold text-sm">${a.tarih}</p><p class="text-xs">${a.baslangic} - ${a.baslik}</p></div>`).join('') : '<p class="text-center text-xs text-gray-400">Randevu yok.</p>';
    });
}
document.getElementById('prevMonth').onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth()-1); loadCalendarDataAndDraw(currentCalDate); };
document.getElementById('nextMonth').onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth()+1); loadCalendarDataAndDraw(currentCalDate); };

// =================================================================
// 8. MODALLAR VE HELPERLAR
// =================================================================
document.querySelectorAll('.close-modal').forEach(b => b.onclick=()=>b.closest('.fixed').classList.add('hidden'));
const openDenemeModal = () => { document.getElementById('modalDenemeEkle').classList.remove('hidden'); renderDenemeInputs('TYT'); document.getElementById('inpDenemeTarih').value=new Date().toISOString().split('T')[0]; };
function renderDenemeInputs(tur) {
    const c = document.getElementById('denemeDersContainer'); if(!c) return; c.innerHTML='';
    (SINAV_DERSLERI[tur]||SINAV_DERSLERI['Diger']).forEach(d => c.innerHTML+=`<div class="flex justify-between text-sm py-2 border-b"><span class="w-24 truncate">${d}</span><div class="flex gap-2"><input type="number" placeholder="D" class="inp-deneme-d w-12 p-1 border rounded text-center" data-ders="${d}"><input type="number" placeholder="Y" class="inp-deneme-y w-12 p-1 border rounded text-center" data-ders="${d}"><input type="number" placeholder="B" class="inp-deneme-b w-12 p-1 border rounded text-center" data-ders="${d}"></div></div>`);
}
document.getElementById('inpDenemeTur').onchange=(e)=>renderDenemeInputs(e.target.value);
document.getElementById('btnSaveDeneme').onclick = async () => {
    const ad = document.getElementById('inpDenemeAd').value||"Deneme", tur = document.getElementById('inpDenemeTur').value, tarih = document.getElementById('inpDenemeTarih').value;
    if(!tarih) return alert('Tarih seçin');
    let total=0, netler={}, k=tur==='LGS'?3:4;
    document.querySelectorAll('.inp-deneme-d').forEach(i => {
        const d=parseInt(i.value)||0, y=parseInt(i.parentElement.querySelector('.inp-deneme-y').value)||0;
        const n = d-(y/k); total+=n; netler[i.dataset.ders]={d,y,net:n.toFixed(2)};
    });
    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), {ad,tur,tarih,toplamNet:total,netler,onayDurumu:'bekliyor',kocId:coachId,studentId:studentDocId,studentAd:document.getElementById('headerStudentName').textContent,eklenmeTarihi:serverTimestamp()});
    document.getElementById('modalDenemeEkle').classList.add('hidden'); alert(`Kaydedildi: ${total.toFixed(2)} Net`);
};

const modalSoru = document.getElementById('modalSoruEkle');
document.getElementById('btnOpenSoruEkle').onclick = () => { 
    const select = document.getElementById('inpSoruDers');
    select.innerHTML = '<option value="" disabled selected>Ders veya Rutin Seç</option>';
    
    const grpDers = document.createElement('optgroup'); grpDers.label = "Dersler";
    const grpRutin = document.createElement('optgroup'); grpRutin.label = "Rutinler";
    
    studentDersler.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d; opt.textContent = d;
        grpDers.appendChild(opt);
    });
    
    studentRutinler.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r; opt.textContent = r;
        grpRutin.appendChild(opt);
    });
    
    select.appendChild(grpDers);
    select.appendChild(grpRutin);

    document.getElementById('inpSoruAdet').value=""; 
    document.getElementById('inpModalSoruTarih').value=new Date().toISOString().split('T')[0]; 
    modalSoru.classList.remove('hidden'); 
};

document.getElementById('btnSaveModalSoru').onclick = async () => {
    const d=document.getElementById('inpSoruDers').value, a=parseInt(document.getElementById('inpSoruAdet').value), t=document.getElementById('inpModalSoruTarih').value;
    if(d&&a) { await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), {tarih:t,ders:d,adet:a,konu:'Hızlı',onayDurumu:'bekliyor',kocId:coachId,eklenmeTarihi:serverTimestamp()}); modalSoru.classList.add('hidden'); alert('Kaydedildi'); }
};

window.toggleAccordion = (btn) => {
    const content = btn.nextElementSibling; const icon = btn.querySelector('i'); const isEx = btn.getAttribute('aria-expanded')==='true';
    if(isEx) { content.classList.add('hidden'); btn.setAttribute('aria-expanded','false'); icon.classList.remove('rotate-180'); btn.classList.replace('bg-purple-50','bg-white'); btn.classList.replace('text-purple-700','text-gray-800'); }
    else { content.classList.remove('hidden'); btn.setAttribute('aria-expanded','true'); icon.classList.add('rotate-180'); btn.classList.replace('bg-white','bg-purple-50'); btn.classList.replace('text-gray-800','text-purple-700'); }
};
window.saveInput = async (input) => {
    const val = parseInt(input.value)||0, old = parseInt(input.defaultValue)||0;
    if(val===old) return;
    const ref = collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi");
    if(input.dataset.docId) {
        if(val>0) await updateDoc(doc(ref, input.dataset.docId), {adet:val, onayDurumu:'bekliyor'});
        else { await deleteDoc(doc(ref, input.dataset.docId)); input.dataset.docId=""; }
    } else if(val>0) {
        const d = await addDoc(ref, {tarih:input.dataset.tarih, ders:input.dataset.ders, adet:val, konu:'Genel', onayDurumu:'bekliyor', eklenmeTarihi:serverTimestamp(), kocId:coachId});
        input.dataset.docId = d.id;
    }
    input.parentElement.classList.add('border-green-500'); setTimeout(()=>input.parentElement.classList.remove('border-green-500'),1000);
};
function getWeekDates(offset) {
    const d=['Paz','Sal','Çar','Per','Cum','Cmt','Paz'], w=[], t=new Date();
    const m = new Date(t.getFullYear(), t.getMonth(), t.getDate()-(t.getDay()||7)+1+(offset*7));
    for(let i=0; i<7; i++) { const c=new Date(m); c.setDate(m.getDate()+i); w.push({dateStr:c.toISOString().split('T')[0], dayName:d[i], dayNum:c.getDate(), isToday:c.toDateString()===t.toDateString()}); }
    return w;
}
async function loadWeekSoruData(s, e) {
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), where("tarih", ">=", s), where("tarih", "<=", e));
    const snap = await getDocs(q); const d=[]; snap.forEach(doc=>d.push({id:doc.id, ...doc.data()})); return d;
}
document.getElementById('btnLogout').onclick = () => signOut(auth);
