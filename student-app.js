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
let homeworkChart = null; 

const AVATAR_LIBRARY = [
    "👨‍🎓", "👩‍🎓", "🚀", "🦁", "⚡", "🌟", "🎯", "📚",
    "🦊", "🐱", "🐶", "🐼", "🐯", "⚽", "🏀", "🎮"
];

const studentRutinler = ["Paragraf", "Problem", "Kitap Okuma"];
const DERS_HAVUZU = { 
    'ORTAOKUL': ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "T.C. İnkılap", "Din Kültürü", "İngilizce"], 
    'LISE': ["Türk Dili ve Edebiyatı", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "İngilizce"] 
};

const EXAM_CONFIG = {
    'LGS': { wrongRatio: 3, subjects: [{name:'Türkçe',max:20},{name:'Matematik',max:20},{name:'Fen Bilimleri',max:20},{name:'T.C. İnkılap',max:10},{name:'Din Kültürü',max:10},{name:'İngilizce',max:10}] },
    'TYT': { wrongRatio: 4, subjects: [{name:'Türkçe',max:40},{name:'Matematik',max:40},{name:'Sosyal',max:20},{name:'Fen',max:20}] },
    'AYT': { wrongRatio: 4, subjects: [{name:'Matematik',max:40},{name:'Fizik',max:14},{name:'Kimya',max:13},{name:'Biyoloji',max:13},{name:'Edebiyat',max:24},{name:'Tarih-1',max:10},{name:'Coğrafya-1',max:6},{name:'Tarih-2',max:11},{name:'Coğrafya-2',max:11},{name:'Felsefe Gr.',max:12},{name:'Din',max:6}] },
    'YDS': { wrongRatio: 0, subjects: [{name:'Yabancı Dil',max:80}] },
    'Diger': { wrongRatio: 4, subjects: [] } // Diğer seçeneği dinamik input kullanır
};

let denemeChartInstance = null;
let currentCalDate = new Date();
let currentWeekOffset = 0;
let odevWeekOffset = 0;

let listeners = { chat: null, ajanda: null, hedefler: null, odevler: null, denemeler: null, upcomingAjanda: null, notifications: null, activeGoals: null, unreadMsg: null, notifHomework: null, notifGoals: null, notifAppt: null };

// =================================================================
// 3. KİMLİK DOĞRULAMA VE BAŞLATMA
// =================================================================
onAuthStateChanged(auth, async (user) => {
    if (user) { 
        currentUser = user; 
        const spinner = document.getElementById('loadingSpinner');
        if(spinner) spinner.style.display = 'none';
        await initializeStudentApp(user.uid); 
    } 
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
                initStudentNotifications(); 
            } else {
                // Profil eşleştirme hatası veya eksik veri
                alert("Öğrenci profili bulunamadı.");
                signOut(auth);
            }
        } else { signOut(auth); }
    } catch (e) { console.error(e); }
}

// =================================================================
// 4. HEADER & NAVİGASYON
// =================================================================
function enableHeaderIcons() {
    const btnMsg = document.getElementById('btnHeaderMessages');
    if(btnMsg) {
        btnMsg.onclick = (e) => { e.preventDefault(); window.navigateToTab('tab-messages'); };
        listenUnreadMessages();
    }

    const btnNotif = document.getElementById('btnHeaderNotifications');
    const dropNotif = document.getElementById('notificationDropdown');
    if(btnNotif && dropNotif) {
        btnNotif.onclick = (e) => { e.stopPropagation(); dropNotif.classList.toggle('hidden'); document.getElementById('headerNotificationDot').classList.add('hidden'); };
        document.getElementById('btnCloseNotifications').onclick = () => dropNotif.classList.add('hidden');
        document.addEventListener('click', (e) => { if (!dropNotif.contains(e.target) && !btnNotif.contains(e.target)) dropNotif.classList.add('hidden'); });
    }

    const btnChangeAvatar = document.getElementById('btnChangeAvatar');
    const modalAvatar = document.getElementById('modalAvatarSelect');
    if (btnChangeAvatar && modalAvatar) {
        btnChangeAvatar.onclick = () => {
            const grid = document.getElementById('avatarGrid');
            grid.innerHTML = AVATAR_LIBRARY.map(icon => `<button class="text-4xl p-2 hover:bg-gray-100 rounded-lg transition-colors" onclick="selectAvatar('${icon}')">${icon}</button>`).join('');
            modalAvatar.classList.remove('hidden');
        };
    }
}

window.navigateToTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('active', 'text-indigo-600');
        b.classList.add('text-gray-400');
        if(b.dataset.target === tabId) {
            b.classList.add('active', 'text-indigo-600');
            b.classList.remove('text-gray-400');
        }
    });

    const centerIcon = document.querySelector('.bottom-nav-center-btn');
    if(centerIcon) {
        if (tabId === 'tab-tracking') {
            centerIcon.classList.remove('bg-white', 'text-indigo-600');
            centerIcon.classList.add('bg-indigo-600', 'text-white');
        } else {
            centerIcon.classList.remove('bg-indigo-600', 'text-white');
            centerIcon.classList.add('bg-white', 'text-indigo-600');
        }
    }

    if (tabId === 'tab-homework') { odevWeekOffset=0; loadHomeworksTab(); }
    else if (tabId === 'tab-messages') { markMessagesAsRead(); loadStudentMessages(); }
    else if (tabId === 'tab-tracking') { currentWeekOffset=0; renderSoruTakibiGrid(); }
    else if (tabId === 'tab-ajanda') { currentCalDate=new Date(); loadCalendarDataAndDraw(currentCalDate); }
    else if (tabId === 'tab-goals') loadGoalsTab();
    else if (tabId === 'tab-denemeler') loadDenemelerTab();
    else if (tabId === 'tab-home') loadDashboardData();
};

function initStudentNotifications() {
    const list = document.getElementById('notificationList');
    const dot = document.getElementById('headerNotificationDot');
    if(!list || !coachId || !studentDocId) return;

    let notifications = { homeworks: [], goals: [], appts: [] };

    const renderNotifications = () => {
        let all = [...notifications.appts, ...notifications.homeworks, ...notifications.goals];
        all.sort((a, b) => b.sortDate - a.sortDate);

        if (all.length > 0) {
            dot.classList.remove('hidden');
            list.innerHTML = all.map(item => `
                <div class="p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors group" onclick="navigateToTab('${item.targetTab}'); document.getElementById('notificationDropdown').classList.add('hidden');">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">${item.title}</p>
                            <p class="text-xs text-gray-500 line-clamp-1">${item.desc}</p>
                            ${item.dateText ? `<p class="text-[9px] text-gray-400 mt-0.5"><i class="fa-regular fa-calendar-plus mr-1"></i>Veriliş: ${item.dateText}</p>` : ''}
                        </div>
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-medium ${item.badgeClass}">${item.badgeText}</span>
                    </div>
                </div>`).join('');
        } else {
            dot.classList.add('hidden');
            list.innerHTML = `<div class="flex flex-col items-center justify-center py-8 text-gray-400"><i class="fa-regular fa-bell-slash text-2xl mb-2 opacity-20"></i><p class="text-xs">Yeni bildirim yok.</p></div>`;
        }
    };

    const qOdev = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"), where("durum", "==", "devam"), limit(5));
    listeners.notifHomework = onSnapshot(qOdev, (snap) => {
        notifications.homeworks = [];
        snap.forEach(d => {
            const data = d.data();
            const createdDate = data.eklenmeTarihi ? data.eklenmeTarihi.toDate() : new Date();
            notifications.homeworks.push({ title: 'Ödevin Var', desc: data.title, badgeText: 'Ödev', badgeClass: 'bg-orange-100 text-orange-700', targetTab: 'tab-homework', sortDate: createdDate, dateText: formatDateTR(createdDate.toISOString().split('T')[0]) });
        });
        renderNotifications();
    });

    const qHedef = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), where("durum", "==", "devam"), limit(3));
    listeners.notifGoals = onSnapshot(qHedef, (snap) => {
        notifications.goals = [];
        snap.forEach(d => {
            const data = d.data();
            const createdDate = data.olusturmaTarihi ? data.olusturmaTarihi.toDate() : new Date();
            notifications.goals.push({ title: 'Yeni Hedef', desc: data.title, badgeText: 'Hedef', badgeClass: 'bg-green-100 text-green-700', targetTab: 'tab-goals', sortDate: createdDate, dateText: formatDateTR(createdDate.toISOString().split('T')[0]) });
        });
        renderNotifications();
    });

    const today = new Date().toISOString().split('T')[0];
    const qAppt = query(collection(db, "artifacts", appId, "users", coachId, "ajandam"), where("studentId", "==", studentDocId), where("tarih", ">=", today), orderBy("tarih", "asc"), limit(1));
    listeners.notifAppt = onSnapshot(qAppt, (snap) => {
        notifications.appts = [];
        snap.forEach(d => {
            const data = d.data();
            const priorityDate = new Date(); priorityDate.setFullYear(priorityDate.getFullYear() + 1); 
            notifications.appts.push({ title: 'Yaklaşan Seans', desc: `${formatDateTR(data.tarih)} ${data.baslangic}`, badgeText: 'Seans', badgeClass: 'bg-blue-100 text-blue-700', targetTab: 'tab-ajanda', sortDate: priorityDate, dateText: null });
        });
        renderNotifications();
    });
}

function listenUnreadMessages() {
    listeners.unreadMsg = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), where("gonderen", "==", "koc"), where("okundu", "==", false)), (snap) => {
        const b = document.getElementById('headerUnreadMsgCount');
        if(snap.size>0) { b.textContent=snap.size; b.classList.remove('hidden'); } else b.classList.add('hidden');
    });
}

window.selectAvatar = async (icon) => {
    try {
        await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId), { avatarIcon: icon });
        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) { avatarEl.textContent = icon; avatarEl.style.backgroundColor = '#fff'; avatarEl.style.fontSize = '3rem'; }
        document.getElementById('modalAvatarSelect').classList.add('hidden');
        const headerLogo = document.querySelector('#headerLogoContainer i');
        if(headerLogo) { headerLogo.className = ''; headerLogo.textContent = icon; headerLogo.style.fontStyle = 'normal'; }
    } catch (e) { console.error(e); }
};

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
        if (d.avatarIcon) { avatarEl.textContent = d.avatarIcon; avatarEl.style.backgroundColor = '#fff'; avatarEl.style.fontSize = '3rem'; } 
        else { avatarEl.textContent = d.ad[0].toUpperCase(); avatarEl.style.fontSize = ''; }
        
        if (d.takipDersleri && Array.isArray(d.takipDersleri) && d.takipDersleri.length > 0) studentDersler = d.takipDersleri;
        else { const isOrtaokul = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(d.sinif); studentDersler = isOrtaokul ? DERS_HAVUZU['ORTAOKUL'] : DERS_HAVUZU['LISE']; }

        renderProfileLessons(studentDersler);
        const filterSelect = document.getElementById('dashboardTimeFilter');
        if (filterSelect) {
            const newFilterSelect = filterSelect.cloneNode(true);
            filterSelect.parentNode.replaceChild(newFilterSelect, filterSelect);
            newFilterSelect.addEventListener('change', () => loadStudentStats(db, coachId, appId, studentDocId, newFilterSelect.value));
        }
    }
    updateHomeworkMetrics(); 
    loadActiveGoalsForDashboard(); 
    loadStudentStats(db, coachId, appId, studentDocId, '30'); 
    loadUpcomingAppointments(db, coachId, appId, studentDocId);
    loadOverdueHomeworks(db, coachId, appId, studentDocId);
}

function renderProfileLessons(dersler) {
    const profileTab = document.getElementById('tab-profile'); if(!profileTab) return;
    const oldSection = document.getElementById('profileLessonsContainer'); if(oldSection) oldSection.remove();
    const infoCards = profileTab.querySelectorAll('.profile-info-card');
    const lastInfoCard = infoCards[infoCards.length - 1]; 
    if (lastInfoCard) {
        const lessonsDiv = document.createElement('div'); lessonsDiv.id = 'profileLessonsContainer'; lessonsDiv.className = 'mt-6';
        lessonsDiv.innerHTML = `<h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Takip Edilen Dersler</h3><div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><div class="flex flex-wrap gap-2">${dersler.map(d => `<span class="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">${d}</span>`).join('')}</div></div>`;
        lastInfoCard.parentNode.insertBefore(lessonsDiv, lastInfoCard.nextSibling);
    }
}

async function updateHomeworkMetrics() {
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"));
    const snap = await getDocs(q);
    const today = new Date().toISOString().split('T')[0];
    let total=0, done=0, overdue=[];
    snap.forEach(doc => { const d = doc.data(); total++; if(d.durum==='tamamlandi') done++; if(d.bitisTarihi < today && d.durum!=='tamamlandi') overdue.push({...d}); });
    const p = total === 0 ? 0 : Math.round((done/total)*100);
    document.getElementById('homeworkChartPercent').textContent = `%${p}`;
    document.getElementById('homeworkChartText').textContent = `${done} Tamamlanan / ${total} Toplam`;
    const ctx = document.getElementById('weeklyHomeworkChart');
    if(ctx) {
        if(homeworkChart) homeworkChart.destroy();
        homeworkChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Tamamlanan', 'Kalan'], datasets: [{ data: [done, total - done], backgroundColor: ['#4f46e5', '#e5e7eb'], borderWidth: 0, cutout: '75%' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { animateScale: true, animateRotate: true } } });
    }
}

async function loadActiveGoalsForDashboard() {
    const list = document.getElementById('dashboardHedefList'); if(!list) return;
    listeners.activeGoals = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), where("durum","!=","tamamlandi"), limit(3)), (snap) => {
        list.innerHTML = snap.empty ? '<p class="text-center text-xs text-gray-400">Aktif hedef yok.</p>' : snap.docs.map(d=>`<div class="bg-white p-2 rounded shadow-sm border border-gray-100 mb-2"><p class="text-sm text-gray-700">${d.data().title}</p></div>`).join('');
    });
}

async function loadUpcomingAppointments(db, uid, appId, sid) {
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("studentId", "==", sid), where("tarih", ">=", todayStr), orderBy("tarih", "asc"), limit(3));
    const snap = await getDocs(q);
    const container = document.getElementById('upcomingAppointmentsList');
    if(!container) return;
    if (snap.empty) container.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">Planlanmış randevu yok.</p>';
    else container.innerHTML = snap.docs.map(doc => { const a=doc.data(); const isToday=a.tarih===todayStr; return `<div class="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full ${isToday?'bg-green-100 text-green-600':'bg-indigo-50 text-indigo-600'} flex items-center justify-center font-bold text-sm shrink-0">${a.tarih.split('-')[2]}</div><div><h4 class="text-sm font-bold text-gray-800 leading-none mb-1">${a.baslik||'Görüşme'}</h4><p class="text-xs text-gray-500 flex items-center gap-1"><i class="fa-regular fa-clock text-[10px]"></i> ${a.baslangic} - ${a.bitis}</p></div></div>${isToday?'<span class="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">BUGÜN</span>':''}</div>`; }).join('');
}

async function loadStudentStats(db, uid, appId, sid, period) {
    const now = new Date(); let startDate = null;
    if (period !== 'all') { const days = parseInt(period); const pastDate = new Date(now); pastDate.setDate(now.getDate() - days); startDate = pastDate.toISOString().split('T')[0]; } else startDate = '2000-01-01';
    const [snapGoals, snapHomework, snapExams, snapQuestions, snapSessions] = await Promise.all([
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "hedefler"), where("bitisTarihi", ">=", startDate))),
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), where("bitisTarihi", ">=", startDate))),
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "denemeler"), where("tarih", ">=", startDate))),
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "soruTakibi"), where("tarih", ">=", startDate))),
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("studentId", "==", sid)))
    ]);
    let completedGoals = 0; snapGoals.forEach(doc => { if (doc.data().durum === 'tamamlandi') completedGoals++; });
    document.getElementById('kpiCompletedGoals').textContent = completedGoals;
    let completedHomework = 0; snapHomework.forEach(doc => { if (doc.data().durum === 'tamamlandi') completedHomework++; });
    document.getElementById('kpiCompletedHomework').textContent = completedHomework;
    document.getElementById('kpiTotalExams').textContent = snapExams.size;
    let completedSessions = 0; snapSessions.forEach(doc => { const d = doc.data(); if (d.tarih >= startDate && d.durum === 'tamamlandi') completedSessions++; });
    document.getElementById('kpiTotalSessions').textContent = completedSessions;
    let totalQ = 0; let totalRead = 0;
    snapQuestions.forEach(doc => { const d = doc.data(); const adet = parseInt(d.adet) || 0; if (d.ders === 'Kitap Okuma' || (d.konu && d.konu.includes('Kitap'))) totalRead += adet; else totalQ += adet; });
    document.getElementById('kpiTotalQuestions').textContent = totalQ;
    document.getElementById('kpiReading').textContent = totalRead;
    let totalNet = 0; let subjectStats = {}; 
    snapExams.forEach(doc => { const d = doc.data(); if(d.analizHaric === true) return; totalNet += (parseFloat(d.toplamNet) || 0); if(d.netler) { for (const [ders, stats] of Object.entries(d.netler)) { if (!subjectStats[ders]) subjectStats[ders] = { total: 0, count: 0 }; subjectStats[ders].total += (parseFloat(stats.net) || 0); subjectStats[ders].count++; } } });
    const avgNet = snapExams.size > 0 ? (totalNet / snapExams.size).toFixed(2) : '-';
    document.getElementById('kpiAvgNet').textContent = avgNet;
    let bestLesson = { name: '-', avg: -Infinity };
    for (const [name, stat] of Object.entries(subjectStats)) { const avg = stat.total / stat.count; if (avg > bestLesson.avg) bestLesson = { name, avg }; }
    if (bestLesson.name !== '-') document.getElementById('kpiBestLesson').textContent = `${bestLesson.name} (${bestLesson.avg.toFixed(1)})`;
    else document.getElementById('kpiBestLesson').textContent = '-';
}

async function loadOverdueHomeworks(db, uid, appId, sid) {
    const today = new Date().toISOString().split('T')[0];
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), where("durum", "!=", "tamamlandi"), where("bitisTarihi", "<", today), orderBy("bitisTarihi", "asc"));
    const snap = await getDocs(q);
    const container = document.getElementById('gecikmisOdevlerList'); if(!container) return;
    if (snap.empty) container.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Gecikmiş ödev yok.</p>';
    else container.innerHTML = snap.docs.map(doc => { const d = doc.data(); return `<div class="bg-red-50 p-2.5 rounded-lg border border-red-100 mb-1.5 flex justify-between items-center"><div class="flex-1 min-w-0 pr-2"><p class="text-sm font-bold text-red-700 truncate">${d.title}</p><p class="text-[10px] text-red-500 flex items-center gap-1"><i class="fa-solid fa-calendar-xmark"></i> ${formatDateTR(d.bitisTarihi)}</p></div></div>`; }).join('');
}

// =================================================================
// 6. TAB NAVİGASYONU
// =================================================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        window.navigateToTab(targetId);
    });
});

// =================================================================
// 7. MODAL YÖNETİMİ & HELPERLAR (DÜZELTİLDİ: Fonksiyon Tanımları)
// =================================================================
document.querySelectorAll('.close-modal').forEach(b => b.onclick=()=>b.closest('.fixed').classList.add('hidden'));

// FONKSİYON OLARAK TANIMLANDI (Identifier error çözümü)
function openDenemeModal() { 
    document.getElementById('modalDenemeEkle').classList.remove('hidden'); 
    
    // Profil kartından sınıf bilgisini al
    const profileClass = document.getElementById('profileClass').textContent;
    // Sınıf seviyesi kontrolü
    const isOrtaokul = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(profileClass);
    
    // Select seçeneklerini ayarla
    const types = isOrtaokul ? ['LGS', 'Diger'] : ['TYT', 'AYT', 'YDS', 'Diger'];
    const sel = document.getElementById('inpDenemeTur');
    sel.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
    
    // İlk render
    renderDenemeInputs(types[0], isOrtaokul); 
    document.getElementById('inpDenemeTarih').value = new Date().toISOString().split('T')[0]; 
}

function renderDenemeInputs(tur, isOrtaokul) {
    const c = document.getElementById('denemeDersContainer'); if(!c) return; c.innerHTML='';
    const ratio = isOrtaokul ? 3 : 4;
    
    if (tur === 'Diger') {
        c.innerHTML = `
            <div class="bg-orange-50 p-2 rounded text-xs text-orange-700 mb-2 text-center">Genel analize dahil edilmez. (${ratio}Y 1D götürür)</div>
            <input type="number" id="inpDigerSoru" placeholder="Soru Sayısı" class="w-full p-2 mb-2 bg-white border rounded">
            <div class="flex gap-2">
                <input type="number" id="inpDigerDogru" placeholder="Doğru" class="w-1/2 p-2 bg-white border border-green-200 rounded">
                <input type="number" id="inpDigerYanlis" placeholder="Yanlış" class="w-1/2 p-2 bg-white border border-red-200 rounded">
            </div>
        `;
    } else {
        const config = EXAM_CONFIG[tur] || EXAM_CONFIG['Diger']; 
        c.innerHTML = `<p class="text-xs text-gray-400 mb-2 text-center">${ratio} yanlış 1 doğruyu götürür.</p>`;
        config.subjects.forEach(sub => {
            c.innerHTML += `<div class="flex justify-between text-sm py-2 border-b items-center"><span class="w-24 truncate font-bold text-gray-700">${sub.name}</span><div class="flex gap-1"><input type="number" placeholder="D" class="inp-deneme-d w-10 p-1 border-green-200 border rounded text-center text-green-700 font-bold outline-none" data-ders="${sub.name}"><input type="number" placeholder="Y" class="inp-deneme-y w-10 p-1 border-red-200 border rounded text-center text-red-700 font-bold outline-none" data-ders="${sub.name}"></div></div>`;
        });
    }
}

document.getElementById('inpDenemeTur').onchange = (e) => {
    const profileClass = document.getElementById('profileClass').textContent;
    const isOrtaokul = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(profileClass);
    renderDenemeInputs(e.target.value, isOrtaokul);
};

// Kaydet Butonu
document.getElementById('btnSaveDeneme').onclick = async () => {
    const ad = document.getElementById('inpDenemeAd').value || "Deneme";
    const tur = document.getElementById('inpDenemeTur').value;
    const tarih = document.getElementById('inpDenemeTarih').value;
    
    const profileClass = document.getElementById('profileClass').textContent;
    const isOrtaokul = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(profileClass);
    const ratio = isOrtaokul ? 3 : 4;

    if(!tarih) return alert('Tarih seçin');
    
    let payload = { ad, tur, tarih, onayDurumu: 'bekliyor', kocId: coachId, studentId: studentDocId, studentAd: document.getElementById('headerStudentName').textContent, eklenmeTarihi: serverTimestamp() };
    
    if (tur === 'Diger') {
        const s = parseInt(document.getElementById('inpDigerSoru').value)||0;
        const d = parseInt(document.getElementById('inpDigerDogru').value)||0;
        const y = parseInt(document.getElementById('inpDigerYanlis').value)||0;
        const net = d - (y/ratio);
        payload.soruSayisi = s; payload.dogru = d; payload.yanlis = y; payload.toplamNet = net.toFixed(2);
        payload.analizHaric = true;
    } else {
        let totalNet=0, netler={};
        document.querySelectorAll('.inp-deneme-d').forEach(i => {
            const d=parseInt(i.value)||0, y=parseInt(i.parentElement.querySelector('.inp-deneme-y').value)||0;
            if(d>0 || y>0) {
                const n = d - (y/ratio || 0); 
                totalNet+=n; 
                netler[i.dataset.ders]={d,y,net:n.toFixed(2)};
            }
        });
        payload.toplamNet = totalNet.toFixed(2);
        payload.netler = netler;
        payload.analizHaric = false;
    }
    
    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), payload);
    document.getElementById('modalDenemeEkle').classList.add('hidden'); 
    alert(`Kaydedildi. (${payload.analizHaric ? 'Analiz Dışı' : payload.toplamNet + ' Net'})`);
};

// ... (Soru Takibi Modalları - Eski kodlarla aynı) ...
const modalSoru = document.getElementById('modalSoruEkle');
document.getElementById('btnOpenSoruEkle').onclick = () => { 
    const select = document.getElementById('inpSoruDers');
    select.innerHTML = '<option value="" disabled selected>Ders veya Rutin Seç</option>';
    const grpDers = document.createElement('optgroup'); grpDers.label = "Dersler";
    const grpRutin = document.createElement('optgroup'); grpRutin.label = "Rutinler";
    studentDersler.forEach(d => { const opt = document.createElement('option'); opt.value = d; opt.textContent = d; grpDers.appendChild(opt); });
    studentRutinler.forEach(r => { const opt = document.createElement('option'); opt.value = r; opt.textContent = r; grpRutin.appendChild(opt); });
    select.appendChild(grpDers); select.appendChild(grpRutin);
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
document.getElementById('btnLogout').onclick = () => signOut(auth);
