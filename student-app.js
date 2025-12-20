// =================================================================
// 0. HATA VE AYARLAR
// =================================================================
window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('permissions')) return;
    console.error(e);
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, getDocs, collection, query, where, addDoc, updateDoc, 
    serverTimestamp, orderBy, limit, deleteDoc, writeBatch, onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { formatDateTR, cleanUpListeners, activeListeners, EXAM_CONFIG, SUBJECT_DATA, CLASS_LEVEL_RULES, openModalWithBackHistory } from './modules/helpers.js';
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

let currentUser = null, coachId = null, studentDocId = null;
let studentDersler = [], homeworkChart = null, denemeChartInstance = null;
let currentCalDate = new Date(), currentWeekOffset = 0, odevWeekOffset = 0;

const AVATAR_LIBRARY = ["👨‍🎓", "👩‍🎓", "🚀", "🦁", "⚡", "🌟", "🎯", "📚", "🦊", "🐱", "🐶", "🐼", "🐯", "⚽", "🏀", "🎮"];
const studentRutinler = ["Paragraf", "Problem", "Kitap Okuma"];

// --- TARİH VE MODAL YARDIMCILARI ---
function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

window.addEventListener('popstate', (event) => {
    // 1. Modalları Kapat
    const openModals = document.querySelectorAll('.fixed.inset-0:not(.hidden)');
    if (openModals.length > 0) {
        openModals.forEach(m => m.classList.add('hidden'));
        return; // Modal kapattıysak başka işlem yapma
    }

    // 2. Sekme (Tab) Geçmişi Varsa Geri Dön
    // Eğer history state içinde tab bilgisi varsa ona dön
    if (event.state && event.state.tab) {
        // Döngüye girmemek için pushState yapmadan sadece UI değiştiriyoruz
        switchTabUI(event.state.tab);
    } else {
        // Varsayılan olarak anasayfaya dön veya uygulamadan çık (tarayıcı yönetir)
        // Eğer hiçbir tab açık değilse (örneğin ilk yükleme), ana sayfaya atabiliriz
        if (!document.getElementById('tab-home').classList.contains('hidden')) {
             // Zaten ana sayfadayız, işlem yok.
        } else {
             switchTabUI('tab-home');
        }
    }
});



// =================================================================
// 1. BAŞLATMA
// =================================================================
onAuthStateChanged(auth, async (user) => {
    if (user) { 
        currentUser = user; 
        attachEventListeners(); 
        await initializeStudentApp(user.uid); 
    } 
    else { window.location.href = "student-login.html"; }
});

function attachEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = (e) => window.navigateToTab(e.currentTarget.dataset.target);
    });
    document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => window.history.back());
    
    // Hızlı Butonlar
    const btnQuickSoru = document.getElementById('btnQuickSoru');
    if(btnQuickSoru) btnQuickSoru.onclick = window.openSoruModal;
    
    // Deneme butonu artık Modal açmıyor, Deneme sayfasına gidiyor
    // const btnQuickDeneme = document.getElementById('btnQuickDeneme');
    // if(btnQuickDeneme) btnQuickDeneme.onclick = () => window.navigateToTab('tab-denemeler');

    document.getElementById('btnLogout').onclick = () => signOut(auth);
}

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
            } else { alert("Profil hatası."); signOut(auth); }
        } else { signOut(auth); }
    } catch (e) { console.error(e); }
}

// =================================================================
// 2. NAVİGASYON (Geri Tuşu Destekli)
// =================================================================

// 1. Yardımcı Fonksiyon: Sadece Ekranı ve Veriyi Günceller (History eklemez)
// Bu fonksiyon hem tıklamalarda hem de geri tuşuna basıldığında kullanılır.
function switchTabUI(tabId) {
    cleanUpListeners();
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(tabId)?.classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('text-indigo-600', 'active');
        b.classList.add('text-gray-400');
        if(b.dataset.target === tabId) {
            b.classList.add('text-indigo-600', 'active');
            b.classList.remove('text-gray-400');
        }
    });

    const centerBtn = document.querySelector('.bottom-nav-center-btn');
    if(centerBtn) {
        if(tabId==='tab-tracking') { centerBtn.classList.add('bg-indigo-700'); centerBtn.classList.remove('bg-indigo-600'); }
        else { centerBtn.classList.add('bg-indigo-600'); centerBtn.classList.remove('bg-indigo-700'); }
    }

    // İlgili sayfanın verilerini yükle
    if (tabId === 'tab-homework') { odevWeekOffset=0; loadHomeworksTab(); }
    else if (tabId === 'tab-messages') { markMessagesAsRead(); loadStudentMessages(); }
    else if (tabId === 'tab-tracking') { currentWeekOffset=0; renderSoruTakibiGrid(); }
    else if (tabId === 'tab-ajanda') { currentCalDate=new Date(); loadCalendarDataAndDraw(currentCalDate); }
    else if (tabId === 'tab-goals') loadGoalsTab();
    else if (tabId === 'tab-denemeler') loadDenemelerTab();
    else if (tabId === 'tab-home') loadDashboardData();
}

// 2. Ana Navigasyon: Tıklama ile çalışır ve Geçmişe Kaydeder
window.navigateToTab = function(tabId) {
    // Tarayıcı geçmişine (History) ekle - Bu satır geri tuşunun çalışmasını sağlar
    window.history.pushState({ tab: tabId }, '', `#${tabId.replace('tab-', '')}`);
    
    // UI'ı güncelle
    switchTabUI(tabId);
};

// =================================================================
// 3. DASHBOARD
// =================================================================
function loadDashboardData() {
    const container = document.getElementById('tab-home');
    const user = firebase.auth().currentUser;
    if (!user) return;

    // --- MOTİVASYON SÖZLERİ ---
    const quotes = [
        "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.",
        "Gelecek, bugünden hazırlananlara aittir.",
        "Asla vazgeçme. Mucizeler her gün olur.",
        "Zirveye giden yol yokuştur ama manzarası güzeldir.",
        "İnanmak başarmanın yarısıdır. Kendine güven!"
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    // HTML İÇERİĞİ
    container.innerHTML = `
        <div class="space-y-6 pb-20">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Merhaba, ${user.displayName || 'Öğrenci'} 👋</h2>
                    <p class="text-gray-500 text-sm">Bugün hedeflerine bir adım daha yaklaş!</p>
                </div>
            </div>

            <div class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div class="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                <p class="text-lg font-medium italic relative z-10">"${randomQuote}"</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32" onclick="window.navigateToTab('tab-homework')">
                    <div class="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl mb-2">
                        <i class="fa-solid fa-list-check"></i>
                    </div>
                    <div>
                        <span class="text-2xl font-bold text-gray-800" id="homePendingHomeworks">-</span>
                        <p class="text-xs text-gray-500">Bekleyen Ödev</p>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32" onclick="window.navigateToTab('tab-tracking')">
                    <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl mb-2">
                        <i class="fa-solid fa-pen"></i>
                    </div>
                    <div>
                        <span class="text-2xl font-bold text-gray-800" id="homeTodayQuestions">-</span>
                        <p class="text-xs text-gray-500">Bugün Çözülen</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-gray-800">Hedeflerim</h3>
                    <button onclick="window.navigateToTab('tab-goals')" class="text-indigo-600 text-xs font-bold hover:underline">Tümü</button>
                </div>
                <div id="homeGoalsList" class="space-y-3">
                    <p class="text-center text-gray-400 text-xs py-4">Yükleniyor...</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform" onclick="window.navigateToTab('tab-denemeler')">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center"><i class="fa-solid fa-chart-line"></i></div>
                        <h4 class="font-bold text-gray-700 text-sm">Denemeler</h4>
                    </div>
                    <p class="text-xs text-gray-400">Netlerini takip et</p>
                </div>
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform" onclick="window.navigateToTab('tab-ajanda')">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center"><i class="fa-solid fa-calendar-days"></i></div>
                        <h4 class="font-bold text-gray-700 text-sm">Ajanda</h4>
                    </div>
                    <p class="text-xs text-gray-400">Programını gör</p>
                </div>
            </div>
        </div>
    `;

    // Verileri çek ve doldur (Dashboard verileri)
    // 1. Ödev Sayısı
    getDocs(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"), where("durum", "==", "devam"))).then(snap => {
        document.getElementById('homePendingHomeworks').textContent = snap.size;
    });

    // 2. Soru Sayısı (Bugün)
    const today = new Date().toISOString().split('T')[0];
    getDocs(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), where("tarih", "==", today))).then(snap => {
        let total = 0;
        snap.forEach(d => total += (parseInt(d.data().adet) || 0));
        document.getElementById('homeTodayQuestions').textContent = total;
    });

    // 3. Hedefler (Kısa Liste - Yeniden Eskiye)
    onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), where("durum", "==", "devam"), limit(3)), (snap) => {
        const list = document.getElementById('homeGoalsList');
        if(snap.empty) { list.innerHTML = '<p class="text-center text-gray-400 text-xs">Aktif hedef yok.</p>'; return; }
        
        let html = '';
        const goals = [];
        snap.forEach(d => goals.push(d.data()));
        
        // Sıralama (Yeniden Eskiye)
        goals.sort((a, b) => {
             const timeA = a.olusturmaTarihi?.seconds || new Date(a.bitisTarihi).getTime();
             const timeB = b.olusturmaTarihi?.seconds || new Date(b.bitisTarihi).getTime();
             return timeB - timeA; 
        });

        goals.forEach(g => {
            const percent = Math.min(100, Math.round((g.ilerleme / g.hedefDegeri) * 100)) || 0;
            html += `
            <div class="flex items-center gap-3 pb-2 border-b border-gray-50 last:border-0">
                <div class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 text-xs font-bold text-indigo-600 border-2 border-indigo-100">
                    %${percent}
                </div>
                <div class="flex-1">
                    <h4 class="text-sm font-bold text-gray-800 truncate">${g.title}</h4>
                    <div class="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                        <div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${percent}%"></div>
                    </div>
                </div>
            </div>`;
        });
        list.innerHTML = html;
    });
}
    updateHomeworkMetrics(); 
    loadStudentStats(db, coachId, appId, studentDocId, '30'); 
    loadUpcomingAppointments(db, coachId, appId, studentDocId);
    loadActiveGoalsForDashboard();
    loadOverdueHomeworks(db, coachId, appId, studentDocId);
}

// ... Dashboard Yardımcıları
function renderProfileLessons(dersler) {
    const profileTab = document.getElementById('tab-profile'); if(!profileTab) return;
    const oldSection = document.getElementById('profileLessonsContainer'); if(oldSection) oldSection.remove();
    const allDivs = profileTab.querySelectorAll('.bg-white.p-4');
    const targetEl = allDivs[allDivs.length - 1]; 
    if (targetEl) {
        const lessonsDiv = document.createElement('div'); lessonsDiv.id = 'profileLessonsContainer'; lessonsDiv.className = 'mt-4';
        lessonsDiv.innerHTML = `<h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Dersler</h3><div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><div class="flex flex-wrap gap-2">${dersler.map(d => `<span class="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">${d}</span>`).join('')}</div></div>`;
        targetEl.parentNode.insertBefore(lessonsDiv, targetEl.nextSibling);
    }
}

// DÜZELTME: Bu fonksiyonu yukarı taşıdık, artık erişilebilir.
async function loadUpcomingAppointments(db, uid, appId, sid) {
    const todayStr = getLocalDateString(new Date());
    const q = query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("studentId", "==", sid), where("tarih", ">=", todayStr), orderBy("tarih", "asc"), limit(3));
    const snap = await getDocs(q);
    const container = document.getElementById('upcomingAppointmentsList');
    if(!container) return;
    if (snap.empty) container.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Planlanmış seans yok.</p>';
    else container.innerHTML = snap.docs.map(doc => { const a=doc.data(); const isToday=a.tarih===todayStr; return `<div class="px-4 py-3 bg-white border border-gray-100 rounded-xl flex items-center justify-between shadow-sm mb-2"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full ${isToday?'bg-green-100 text-green-600':'bg-indigo-50 text-indigo-600'} flex items-center justify-center font-bold text-sm shrink-0">${a.tarih.split('-')[2]}</div><div><h4 class="text-sm font-bold text-gray-800 leading-none mb-1">${a.baslik||'Görüşme'}</h4><p class="text-xs text-gray-500 flex items-center gap-1"><i class="fa-regular fa-clock text-[10px]"></i> ${a.baslangic} - ${a.bitis}</p></div></div>${isToday?'<span class="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">BUGÜN</span>':''}</div>`; }).join('');
}

async function loadStudentStats(db, uid, appId, sid, period) {
    const now = new Date(); let startDate = null;
    if (period !== 'all') { const days = parseInt(period); const pastDate = new Date(now); pastDate.setDate(now.getDate() - days); startDate = getLocalDateString(pastDate); } else startDate = '2000-01-01';
    
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
    document.getElementById('kpiBestLesson').textContent = bestLesson.name !== '-' ? `${bestLesson.name} (${bestLesson.avg.toFixed(1)})` : '-';
}

async function loadActiveGoalsForDashboard() {
    const list = document.getElementById('dashboardHedefList'); if(!list) return;
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), where("durum","!=","tamamlandi"), limit(3));
    const snap = await getDocs(q);
    list.innerHTML = snap.empty ? '<p class="text-center text-gray-400 text-xs py-4">Hedef bulunamadı.</p>' : snap.docs.map(d=>`<div class="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-green-500"></div><p class="text-xs font-bold text-gray-700 truncate">${d.data().title}</p></div>`).join('');
}

async function loadOverdueHomeworks(db, uid, appId, sid) {
    const today = getLocalDateString(new Date());
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), where("durum", "!=", "tamamlandi"), where("bitisTarihi", "<", today), orderBy("bitisTarihi", "asc"));
    const snap = await getDocs(q);
    const container = document.getElementById('gecikmisOdevlerList'); if(!container) return;
    if (snap.empty) container.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">Gecikmiş ödev yok.</p>';
    else container.innerHTML = snap.docs.map(doc => { const d = doc.data(); return `<div class="bg-red-50 p-2.5 rounded-lg border border-red-100 mb-1.5 flex justify-between items-center"><div class="flex-1 min-w-0 pr-2"><p class="text-xs font-bold text-red-700 truncate">${d.title}</p><p class="text-[9px] text-red-500 flex items-center gap-1"><i class="fa-solid fa-calendar-xmark"></i> ${formatDateTR(d.bitisTarihi)}</p></div></div>`; }).join('');
}

// =================================================================
// 4. SORU TAKİBİ
// =================================================================
function getWeekDates(offset) {
    const d = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const w = [];
    const today = new Date();
    const currentDay = today.getDay() || 7; 
    const mondayDate = new Date(today);
    mondayDate.setDate(today.getDate() - currentDay + 1 + (offset * 7));

    for (let i = 0; i < 7; i++) {
        const loopDate = new Date(mondayDate);
        loopDate.setDate(mondayDate.getDate() + i);
        const dateStr = getLocalDateString(loopDate);
        const isToday = dateStr === getLocalDateString(new Date());
        w.push({ dateStr, dayName: d[i], dayNum: loopDate.getDate(), isToday });
    }
    return w;
}

async function renderSoruTakibiGrid() {
    const container = document.getElementById('weeklyAccordion'); if(!container) return;
    container.innerHTML = '<p class="text-center text-gray-400">Yükleniyor...</p>';
    const dates = getWeekDates(currentWeekOffset);
    document.getElementById('weekRangeTitle').textContent = `${formatDateTR(dates[0].dateStr)} - ${formatDateTR(dates[6].dateStr)}`;
    
    document.getElementById('prevWeekBtn').onclick = () => { currentWeekOffset--; renderSoruTakibiGrid(); };
    const next = document.getElementById('nextWeekBtn');
    next.onclick = () => { currentWeekOffset++; renderSoruTakibiGrid(); };
    next.disabled = currentWeekOffset >= 0;

    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), where("tarih", ">=", dates[0].dateStr), where("tarih", "<=", dates[6].dateStr));
    
    activeListeners.soruTakibiUnsubscribe = onSnapshot(q, (snap) => {
        const data = []; snap.forEach(d => data.push({id:d.id, ...d.data()}));
        
        container.innerHTML = dates.map(day => {
            const isToday = day.isToday;
            const createCard = (label, isRoutine = false) => {
                const r = data.find(d => d.tarih === day.dateStr && d.ders === label);
                const val = r ? r.adet : '';
                const isApproved = r && r.onayDurumu === 'onaylandi';
                let borderClass = 'border-orange-100 bg-orange-50';
                let textClass = 'text-orange-600';
                
                if (isApproved) { borderClass = 'border-green-100 bg-green-50'; textClass = 'text-green-600'; } 
                else if(val) { borderClass = 'border-orange-200 bg-white'; }

                return `<div class="flex flex-col items-center justify-center p-2 rounded-xl border ${borderClass} shadow-sm aspect-square relative">
                    ${isRoutine ? '<i class="fa-solid fa-star text-[8px] text-orange-400 absolute top-1 right-1"></i>' : ''}
                    <label class="text-[9px] font-bold text-gray-600 mb-1 text-center w-full truncate">${label}</label>
                    <input type="number" class="w-full text-center bg-transparent font-bold text-xl ${textClass} focus:outline-none p-0" placeholder="-" value="${val}" data-tarih="${day.dateStr}" data-ders="${label}" data-doc-id="${r ? r.id : ''}" ${isApproved ? 'disabled' : ''} onblur="saveInput(this)">
                    <span class="text-[8px] text-gray-400 uppercase tracking-wide">${label === 'Kitap Okuma' ? 'Sayfa' : 'Soru'}</span>
                </div>`;
            };

            return `<div class="accordion-item border-b border-gray-100 last:border-0"><button class="accordion-header w-full flex justify-between items-center p-4 ${isToday ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'bg-white text-gray-700'}" onclick="toggleAccordion(this)"><div class="flex items-center gap-3"><span class="text-lg font-bold">${day.dayNum}</span><span class="text-sm font-medium opacity-80">${day.dayName}</span></div><i class="fa-solid fa-chevron-down transition-transform ${isToday ? 'rotate-180' : ''}"></i></button><div class="accordion-content ${isToday ? '' : 'hidden'} px-4 pb-4 bg-white pt-2"><div class="mb-4"><h4 class="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2 flex items-center gap-1"><i class="fa-solid fa-star"></i> Rutinler</h4><div class="grid grid-cols-3 gap-2">${studentRutinler.map(r => createCard(r, true)).join('')}</div></div><div><h4 class="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 flex items-center gap-1"><i class="fa-solid fa-book"></i> Dersler</h4><div class="grid grid-cols-3 gap-2">${studentDersler.length > 0 ? studentDersler.map(d => createCard(d)).join('') : '<p class="text-xs text-gray-400 col-span-3">Ders eklenmemiş.</p>'}</div></div></div></div>`;
        }).join('');
    });
}

window.saveInput = async (input) => {
    const val = parseInt(input.value)||0;
    const ref = collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi");
    if(input.dataset.docId) {
        if(val>0) await updateDoc(doc(ref, input.dataset.docId), {adet:val, onayDurumu:'bekliyor'});
        else { await deleteDoc(doc(ref, input.dataset.docId)); input.dataset.docId=""; }
    } else if(val>0) {
        const d = await addDoc(ref, {tarih:input.dataset.tarih, ders:input.dataset.ders, adet:val, konu:'Genel', onayDurumu:'bekliyor', eklenmeTarihi:serverTimestamp(), kocId:coachId});
        input.dataset.docId = d.id;
    }
};

window.toggleAccordion = (btn) => {
    const content = btn.nextElementSibling;
    const icon = btn.querySelector('i');
    content.classList.toggle('hidden');
    icon.classList.toggle('rotate-180');
};

// =================================================================
// 5. HEDEFLER
// =================================================================
function loadGoalsTab() {
    const list = document.getElementById('studentHedefList'); if(!list) return;
    activeListeners.hedeflerUnsubscribe = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), orderBy("bitisTarihi", "asc")), (snap) => {
        const goals = []; snap.forEach(doc => goals.push({ id: doc.id, ...doc.data() }));
goals.sort((a, b) => {
            // 1. Sabitleme Önceliği
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            
            // 2. Yeniden Eskiye (Oluşturma Tarihine Göre, yoksa Bitiş Tarihine Göre)
            // Timestamp kontrolü yapıyoruz
            const timeA = a.olusturmaTarihi?.seconds || new Date(a.bitisTarihi).getTime() / 1000;
            const timeB = b.olusturmaTarihi?.seconds || new Date(b.bitisTarihi).getTime() / 1000;
            return timeB - timeA; // Büyük olan (yeni) üstte
        });
            if (goals.length === 0) { list.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm">Henüz hedef atanmamış.</p>'; return; }
        list.innerHTML = goals.map(h => { 
            const isDone = h.durum === 'tamamlandi';
            const isPinned = h.isPinned === true;
            let bgClass = isDone ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100';
            let iconClass = isDone ? 'bg-green-100 text-green-600 fa-check' : 'bg-yellow-100 text-yellow-600 fa-bullseye';
            if (!isDone && !isPinned) { bgClass = 'bg-white border-gray-100'; iconClass = 'bg-purple-100 text-purple-600 fa-bullseye'; }
            return `<div class="p-4 rounded-xl border ${bgClass} shadow-sm mb-3 relative group transition-all">${isPinned ? '<div class="absolute top-0 right-0 w-8 h-8 bg-yellow-400 text-white rounded-bl-xl rounded-tr-xl flex items-center justify-center shadow-sm"><i class="fa-solid fa-thumbtack text-sm"></i></div>' : ''}<div class="flex items-start gap-4"><div class="w-12 h-12 rounded-full ${iconClass.split(' ').slice(0,2).join(' ')} flex items-center justify-center text-xl shrink-0"><i class="fa-solid ${iconClass.split(' ').pop()}"></i></div><div class="flex-1"><div class="flex justify-between items-start pr-6"><h4 class="font-bold text-gray-800 text-sm leading-tight">${h.title}</h4>${isDone ? '<span class="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Tamamlandı</span>' : ''}</div><p class="text-xs text-gray-600 mt-1 mb-2 leading-relaxed">${h.aciklama || ''}</p><div class="flex items-center gap-4 text-[10px] text-gray-400 font-medium"><span class="flex items-center gap-1"><i class="fa-regular fa-calendar text-purple-400"></i> ${formatDateTR(h.olusturmaTarihi?.toDate ? getLocalDateString(h.olusturmaTarihi.toDate()) : '')}</span><span class="flex items-center gap-1 ${!isDone ? 'text-orange-500' : ''}"><i class="fa-regular fa-flag"></i> ${formatDateTR(h.bitisTarihi)}</span></div></div></div></div>`; 
        }).join('');
    });
}

// =================================================================
// 6. DENEMELER
// =================================================================
function loadDenemelerTab() {
    const list = document.getElementById('studentDenemeList'); if(!list) return;
    const btn = document.getElementById('btnAddNewDeneme'); if(btn) btn.onclick = window.openDenemeModal;

    activeListeners.denemelerUnsubscribe = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), orderBy("tarih", "desc")), (snap) => {
        const data = []; snap.forEach(d => data.push({id:d.id, ...d.data()}));
        const validData = data.filter(x => x.onayDurumu === 'onaylandi' && x.analizHaric !== true);
        let totalNet = 0, maxNet = 0;
        validData.forEach(x => { const n = parseFloat(x.toplamNet); totalNet += n; if(n > maxNet) maxNet = n; });

        if(document.getElementById('studentKpiAvg')) document.getElementById('studentKpiAvg').textContent = (validData.length ? (totalNet/validData.length) : 0).toFixed(2);
        if(document.getElementById('studentKpiMax')) document.getElementById('studentKpiMax').textContent = maxNet.toFixed(2);
        if(document.getElementById('studentKpiTotal')) document.getElementById('studentKpiTotal').textContent = validData.length;

        const ctx = document.getElementById('studentDenemeChart');
        if(ctx && validData.length > 0) {
            const sorted = [...validData].sort((a,b) => a.tarih.localeCompare(b.tarih)).slice(-10);
            if(denemeChartInstance) denemeChartInstance.destroy();
            denemeChartInstance = new Chart(ctx, { 
                type: 'line', 
                data: { labels: sorted.map(d=>formatDateTR(d.tarih).slice(0,5)), datasets: [{ label: 'Net', data: sorted.map(d=>d.toplamNet), borderColor: '#9333ea', backgroundColor: 'rgba(147, 51, 234, 0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#fff', pointBorderColor: '#9333ea', pointBorderWidth: 2 }] }, 
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, grid: { color: '#f3f4f6' } }, x: { grid: {display: false} } } } 
            });
        }

        list.innerHTML = data.length === 0 ? '<p class="text-center text-gray-400 text-sm py-4">Henüz deneme girilmemiş.</p>' : data.map(d => {
            const pending = d.onayDurumu === 'bekliyor'; 
            const isExcluded = d.analizHaric === true;
            const net = parseFloat(d.toplamNet) || 0;
            let detailsHtml = '';
            if (d.netler) {
                detailsHtml = '<div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 hidden animate-fade-in">';
                for (const [ders, stats] of Object.entries(d.netler)) { if (stats.d > 0 || stats.y > 0) detailsHtml += `<div class="text-[10px] bg-gray-50 p-2 rounded-lg flex justify-between items-center"><span class="font-bold truncate w-20 text-gray-700">${ders}</span><span class="text-gray-500"><span class="text-green-600 font-bold">${stats.d}D</span> <span class="text-red-500 font-bold">${stats.y}Y</span> = ${stats.net}</span></div>`; }
                detailsHtml += '</div>';
            } else { detailsHtml = `<div class="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 hidden animate-fade-in flex justify-around"><span>Soru: ${d.soruSayisi}</span><span>D: ${d.dogru}</span><span>Y: ${d.yanlis}</span></div>`; }
            return `<div class="bg-white p-4 rounded-xl border ${isExcluded ? 'border-orange-200 bg-orange-50' : (pending ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200')} shadow-sm mb-2 cursor-pointer transition-all active:scale-[0.99]" onclick="this.querySelector('.animate-fade-in').classList.toggle('hidden')"><div class="flex justify-between items-center"><div class="flex flex-col"><span class="font-bold text-sm text-gray-800">${d.ad}</span><span class="text-[10px] text-gray-500 font-medium">${formatDateTR(d.tarih)} • ${d.tur}</span></div><div class="flex flex-col items-end gap-1">${pending ? '<span class="text-[9px] px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800 font-bold">Bekliyor</span>' : ''}${isExcluded ? '<span class="text-[9px] px-2 py-0.5 rounded-full bg-orange-200 text-orange-800 font-bold">Analiz Dışı</span>' : ''}<span class="font-bold text-indigo-600 text-xl">${net.toFixed(2)}</span></div></div>${detailsHtml}</div>`;
        }).join('');
    });
}

// =================================================================
// 7. ÖDEVLER
// =================================================================
function loadHomeworksTab() {
    const container = document.getElementById('studentOdevList'); if(!container) return;
    container.innerHTML = `<div class="flex justify-between items-center mb-4 bg-white p-3 rounded-xl shadow-sm border border-gray-100"><button id="btnOdevPrevWeek" class="p-2 hover:bg-gray-100 rounded-full text-gray-600 active:scale-95"><i class="fa-solid fa-chevron-left"></i></button><h3 id="odevWeekRangeDisplay" class="font-bold text-gray-800 text-sm">...</h3><button id="btnOdevNextWeek" class="p-2 hover:bg-gray-100 rounded-full text-gray-600 active:scale-95"><i class="fa-solid fa-chevron-right"></i></button></div><div id="odevWeeklyGrid" class="space-y-4 pb-20"><p class="text-center text-gray-400 py-8">Yükleniyor...</p></div>`;
    document.getElementById('btnOdevPrevWeek').onclick = () => { odevWeekOffset--; renderOdevCalendar(); };
    document.getElementById('btnOdevNextWeek').onclick = () => { odevWeekOffset++; renderOdevCalendar(); };
    renderOdevCalendar();
}

function renderOdevCalendar() {
    const grid = document.getElementById('odevWeeklyGrid'); 
    const rangeDisplay = document.getElementById('odevWeekRangeDisplay');
    const today = new Date(); 
    const currentDay = today.getDay() || 7; 
    const mondayDate = new Date(today);
    mondayDate.setDate(today.getDate() - currentDay + 1 + (odevWeekOffset * 7));
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    rangeDisplay.textContent = `${formatDateTR(getLocalDateString(mondayDate))} - ${formatDateTR(getLocalDateString(sundayDate))}`;
    
    activeListeners.odevlerUnsubscribe = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler")), (snap) => {
        const allOdevs = []; snap.forEach(doc => allOdevs.push({id: doc.id, ...doc.data()})); 
        grid.innerHTML = ''; 
        for (let i = 0; i < 7; i++) {
            const loopDate = new Date(mondayDate); loopDate.setDate(mondayDate.getDate() + i); 
            const dateStr = getLocalDateString(loopDate);
            const dayName = loopDate.toLocaleDateString('tr-TR', { weekday: 'long' }); 
            const isToday = dateStr === getLocalDateString(new Date());
            const dailyOdevs = allOdevs.filter(o => o.bitisTarihi === dateStr);
            const dayCard = document.createElement('div'); dayCard.className = `bg-white rounded-xl border ${isToday ? 'border-indigo-300 ring-2 ring-indigo-50 shadow-md' : 'border-gray-200'} overflow-hidden`;
            let contentHtml = `<div class="p-3 ${isToday ? 'bg-indigo-50' : 'bg-gray-50'} border-b border-gray-100 flex justify-between items-center"><span class="font-bold text-sm ${isToday ? 'text-indigo-700' : 'text-gray-700'}">${dayName}</span><span class="text-xs text-gray-500 font-mono">${formatDateTR(dateStr)}</span></div><div class="p-3 space-y-2">`;
            if (dailyOdevs.length === 0) contentHtml += `<p class="text-center text-xs text-gray-400 py-2 italic">Ödev yok.</p>`; 
            else dailyOdevs.forEach(o => { 
                let statusClass = "bg-blue-50 border-blue-100 text-blue-800"; let statusText = "Yapılacak"; let actionBtn = `<button class="w-full mt-2 bg-blue-600 text-white text-xs py-2 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-sm active:scale-95" onclick="completeOdev('${o.id}')">Tamamladım</button>`; 
                if (o.durum === 'tamamlandi') { if (o.onayDurumu === 'onaylandi') { statusClass = "bg-green-50 border-green-100 text-green-800"; statusText = '<i class="fa-solid fa-check-double mr-1"></i> Tamamlandı'; actionBtn = ''; } else { statusClass = "bg-orange-50 border-orange-100 text-orange-800"; statusText = '<i class="fa-solid fa-clock mr-1"></i> Onay Bekliyor'; actionBtn = ''; } }
                contentHtml += `<div class="border rounded-lg p-3 ${statusClass}"><div class="flex justify-between items-start mb-1"><h4 class="font-bold text-sm leading-tight flex items-center w-full pr-2">${o.title}</h4><span class="text-[9px] font-bold px-1.5 py-0.5 bg-white bg-opacity-60 rounded whitespace-nowrap ml-1">${statusText}</span></div><p class="text-xs opacity-80 mb-1 leading-relaxed">${o.aciklama || ''}</p>${actionBtn}</div>`; 
            });
            contentHtml += `</div>`; dayCard.innerHTML = contentHtml; grid.appendChild(dayCard);
        }
    });
}

window.completeOdev = async (odevId) => { 
    if(!confirm("Ödevi tamamladın mı?")) return; 
    try { await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler", odevId), { durum: 'tamamlandi', onayDurumu: 'bekliyor' }); } 
    catch (e) { console.error(e); alert("Hata oluştu."); } 
};

async function updateHomeworkMetrics() {
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"));
    const snap = await getDocs(q);
    let total=0, done=0;
    snap.forEach(doc => { const d = doc.data(); total++; if(d.durum==='tamamlandi') done++; });
    const p = total === 0 ? 0 : Math.round((done/total)*100);
    if(document.getElementById('homeworkChartPercent')) document.getElementById('homeworkChartPercent').textContent = `%${p}`;
    if(document.getElementById('homeworkChartText')) document.getElementById('homeworkChartText').textContent = `${done} Tamamlanan / ${total} Toplam`;
    const ctx = document.getElementById('weeklyHomeworkChart');
    if(ctx) {
        if(homeworkChart) homeworkChart.destroy();
        homeworkChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Tamamlanan', 'Kalan'], datasets: [{ data: [done, total - done], backgroundColor: ['#4f46e5', '#e5e7eb'], borderWidth: 0, cutout: '75%' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { animateScale: true, animateRotate: true } } });
    }
}

// =================================================================
// 8. MESAJLAR, AJANDA VE MODALLAR
// =================================================================
// =================================================================
// YENİ WHATSAPP TARZI MESAJLAŞMA & BİLDİRİM
// =================================================================

function loadStudentMessages() {
    const tabContainer = document.getElementById('tab-messages');
    if (!tabContainer) return;

    // 1. WhatsApp Tarzı HTML Yapısını Oluştur (Mevcut içeriği eziyoruz)
    tabContainer.innerHTML = `
        <div class="flex flex-col h-[calc(100vh-140px)] bg-[#efeae2] relative rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <div class="absolute inset-0 opacity-5 pointer-events-none" style="background-image: url('https://www.transparenttextures.com/patterns/cubes.png');"></div>
            
            <div id="studentMessagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3 z-10 custom-scrollbar scroll-smooth">
                <div class="flex justify-center"><i class="fa-solid fa-spinner fa-spin text-gray-400"></i></div>
            </div>

            <div class="bg-white p-2 px-3 border-t border-gray-200 z-20 shrink-0">
                <form id="studentChatForm" class="flex items-end gap-2">
                    <input type="text" id="studentMessageInput" 
                        class="flex-1 bg-gray-100 text-gray-800 text-sm rounded-2xl px-4 py-3 border-0 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all max-h-32 overflow-y-auto" 
                        placeholder="Mesaj yaz..." autocomplete="off">
                    <button type="submit" class="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-indigo-700 shadow-md active:scale-95 transition-all shrink-0 mb-0.5">
                        <i class="fa-solid fa-paper-plane text-sm ml-0.5"></i>
                    </button>
                </form>
            </div>
        </div>
    `;

    const container = document.getElementById('studentMessagesContainer');
    const form = document.getElementById('studentChatForm');
    const input = document.getElementById('studentMessageInput');

    // 2. Mesaj Gönderme Listener'ı (HTML'i yeni oluşturduğumuz için buraya ekliyoruz)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        try {
            input.value = '';
            input.focus();
            await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), {
                text: text,
                gonderen: 'ogrenci',
                tarih: serverTimestamp(),
                okundu: false,
                kocId: coachId
            });
        } catch (error) {
            console.error("Mesaj hatası:", error);
        }
    });

    // 3. Mesajları Dinle ve Render Et
    if (activeListeners.chatUnsubscribe) activeListeners.chatUnsubscribe();

    activeListeners.chatUnsubscribe = onSnapshot(query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), 
        orderBy("tarih", "asc")
    ), (snap) => {
        if (snap.empty) {
            container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-gray-400 opacity-60"><i class="fa-solid fa-comments text-4xl mb-2"></i><p class="text-xs">Henüz mesaj yok.</p></div>';
            return;
        }

        let html = '';
        let lastDate = null;

        snap.docs.forEach(d => {
            const m = d.data();
            const me = m.gonderen === 'ogrenci';
            const dateObj = m.tarih ? m.tarih.toDate() : new Date();
            const dateStr = formatDateTR(dateObj.toISOString().split('T')[0]);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Tarih Ayracı
            if (dateStr !== lastDate) {
                html += `<div class="flex justify-center my-4"><span class="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded shadow-sm opacity-80">${dateStr}</span></div>`;
                lastDate = dateStr;
            }

            // Mesaj Balonu
            html += `
            <div class="flex w-full ${me ? 'justify-end' : 'justify-start'} animate-fade-in group">
                <div class="max-w-[80%] px-3 py-1.5 rounded-lg text-sm shadow-sm relative break-words 
                    ${me ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}">
                    <p class="leading-relaxed text-[13px]">${m.text}</p>
                    <div class="flex items-center justify-end gap-1 mt-0.5 opacity-70">
                        <span class="text-[9px]">${timeStr}</span>
                        ${me ? (m.okundu ? '<i class="fa-solid fa-check-double text-[9px]"></i>' : '<i class="fa-solid fa-check text-[9px]"></i>') : ''}
                    </div>
                </div>
            </div>`;
        });

        container.innerHTML = html;
        
        // En alta kaydır
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    });
}

async function markMessagesAsRead() {
    const snap = await getDocs(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), where("gonderen", "==", "koc"), where("okundu", "==", false)));
    const b = writeBatch(db); snap.forEach(d => b.update(d.ref, { okundu: true })); await b.commit();
}

function loadCalendarDataAndDraw(date) {
    const m = date.getMonth(), y = date.getFullYear();
    document.getElementById('currentMonthYear').textContent = date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
    const s = getLocalDateString(new Date(y, m, 1));
    const e = getLocalDateString(new Date(y, m + 1, 0));
    
    activeListeners.ajandaUnsubscribe = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ajandam"), where("studentId", "==", studentDocId), where("tarih", ">=", s), where("tarih", "<=", e)), (snap) => {
        const appts = []; snap.forEach(d => appts.push({ id: d.id, ...d.data() }));
        const grid = document.getElementById('calendarGrid'); grid.innerHTML = '';
        const days = new Date(y, m + 1, 0).getDate(); const offset = new Date(y, m, 1).getDay() || 7;
        const emptyCells = offset === 0 ? 6 : offset - 1;

        for (let i = 0; i < emptyCells; i++) grid.innerHTML += `<div class="min-h-[40px]"></div>`;

        for (let d = 1; d <= days; d++) {
            const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const dailyAppts = appts.filter(a => a.tarih === dateStr);
            let dots = '';
            dailyAppts.forEach(a => { let color = 'bg-blue-500'; if (a.durum === 'tamamlandi') color = 'bg-green-500'; else if (a.tarih < getLocalDateString(new Date())) color = 'bg-red-500'; dots += `<div class="w-1.5 h-1.5 rounded-full ${color} mx-auto mt-1"></div>`; });
            grid.innerHTML += `<div class="min-h-[40px] flex flex-col items-center justify-center rounded-lg ${dateStr === getLocalDateString(new Date()) ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-700'}"><span class="text-sm font-bold">${d}</span><div class="flex flex-wrap gap-0.5 justify-center w-full h-2">${dots}</div></div>`;
        }
        
        // Düzeltme: Fonksiyonu doğru sırada çağırıyoruz
        const listContainer = document.getElementById('appointmentListContainer');
        if (listContainer) loadAllUpcomingAppointments(listContainer, getLocalDateString(new Date()));
    });
}
// Eksik Fonksiyon Tanımlaması
function loadAllUpcomingAppointments(container, todayStr) {
    if(!coachId || !studentDocId) return;
    
    getDocs(query(collection(db, "artifacts", appId, "users", coachId, "ajandam"), where("studentId", "==", studentDocId), where("tarih", ">=", todayStr), orderBy("tarih", "asc"))).then(snap => {
        if(snap.empty) {
            container.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">Yaklaşan seans yok.</p>';
        } else {
            container.innerHTML = snap.docs.map(doc => {
                const a = doc.data();
                const isToday = a.tarih === todayStr;
                return `
                <div class="p-3 bg-white border border-gray-100 rounded-xl flex items-center justify-between shadow-sm mb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full ${isToday ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600'} flex items-center justify-center font-bold text-sm">
                            ${a.tarih.split('-')[2]}
                        </div>
                        <div>
                            <h4 class="text-sm font-bold text-gray-800">${a.baslik || 'Görüşme'}</h4>
                            <p class="text-xs text-gray-500">${formatDateTR(a.tarih)} • ${a.baslangic}-${a.bitis}</p>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
    });
}
document.getElementById('prevMonth').onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() - 1); loadCalendarDataAndDraw(currentCalDate); };
document.getElementById('nextMonth').onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() + 1); loadCalendarDataAndDraw(currentCalDate); };

function enableHeaderIcons() {
    const btnNotif = document.getElementById('btnHeaderNotifications');
    const drop = document.getElementById('notificationDropdown');
    const close = document.getElementById('btnCloseNotifications');
    
    if(btnNotif && drop) {
        btnNotif.onclick = (e) => { e.stopPropagation(); drop.classList.toggle('hidden'); document.getElementById('headerNotificationDot').classList.add('hidden'); };
        if(close) close.onclick = () => drop.classList.add('hidden');
        document.addEventListener('click', (e) => { if (!drop.contains(e.target) && !btnNotif.contains(e.target)) drop.classList.add('hidden'); });
    }
// Mesaj İkonu İşlevi
    const btnMsg = document.getElementById('btnHeaderMessages');
    if(btnMsg) {
        btnMsg.onclick = () => window.navigateToTab('tab-messages');
    }
    const btnChangeAvatar = document.getElementById('btnChangeAvatar');
    if (btnChangeAvatar) {
        btnChangeAvatar.onclick = () => {
            const grid = document.getElementById('avatarGrid');
            if(grid) {
                grid.innerHTML = AVATAR_LIBRARY.map(icon => `<button class="text-4xl p-2 hover:bg-gray-100 rounded-lg transition-colors active:scale-95" onclick="selectAvatar('${icon}')">${icon}</button>`).join('');
                openModalWithBackHistory('modalAvatarSelect');
            }
        };
    }
}

function initStudentNotifications() {
    const list = document.getElementById('notificationList');
    const dot = document.getElementById('headerNotificationDot');
    if(!list || !coachId || !studentDocId) return;

    let notifications = [];
    const render = () => {
        const list = document.getElementById('notificationList');
        const badge = document.getElementById('notificationBadge');
        
        if (notifications.length > 0) {
            badge.classList.remove('hidden');
            list.innerHTML = notifications.map(n => `
                <div class="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors" 
                     onclick="document.getElementById('notificationDropdown').classList.add('hidden'); window.navigateToTab('${n.tab}')">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${n.bg}">${n.badge}</span>
                        <span class="text-[9px] text-gray-400">${n.date ? formatDateTR(n.date) : ''}</span>
                    </div>
                    <h4 class="text-xs font-bold text-gray-800">${n.title}</h4>
                    <p class="text-[10px] text-gray-500 line-clamp-2">${n.desc}</p>
                </div>
            `).join('');
        } else {
            badge.classList.add('hidden');
            list.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">Bildirim yok.</p>';
        }
    };
// --- 4. MESAJ BİLDİRİMİ (KOÇTAN GELEN OKUNMAMIŞLAR) ---
    const msgBtn = document.getElementById('btnHeaderMessages'); // Header'daki mesaj butonu ID'si
    // Butonun içinde kırmızı nokta için bir span var mı kontrol et, yoksa ekle
    let msgBadge = msgBtn.querySelector('.badge-dot');
    if (!msgBadge) {
        msgBadge = document.createElement('span');
        msgBadge.className = "badge-dot hidden absolute top-2 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white";
        msgBtn.style.position = "relative";
        msgBtn.appendChild(msgBadge);
    }

    activeListeners.unreadMessagesUnsubscribe = onSnapshot(query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"),
        where("gonderen", "==", "koc"),
        where("okundu", "==", false)
    ), (snap) => {
        if (!snap.empty) {
            msgBadge.classList.remove('hidden');
            // İstersen bildirim listesine de ekleyebilirsin:
            // notifications.push({ type: 'mesaj', title: 'Yeni Mesaj', desc: 'Koçunuzdan yeni mesaj var.', badge: 'Mesaj', bg: 'bg-indigo-100 text-indigo-700', tab: 'tab-messages', date: getLocalDateString(new Date()) });
            // render();
        } else {
            msgBadge.classList.add('hidden');
        }
    });
   // --- Gelişmiş Bildirimler ---
    const todayStr = getLocalDateString(new Date());
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);

    // 1. ÖDEVLER (Yeni Eklenenler + Son Günü Gelenler)
    activeListeners.notifHomework = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"), where("durum", "==", "devam")), (snap) => {
        notifications = notifications.filter(n => n.type !== 'odev');
        snap.forEach(doc => {
            const d = doc.data();
            // Yeni Eklendi (Son 2 gün içinde eklenenler gibi düşünülebilir veya direkt gösterilebilir)
            // Basitlik için tüm aktif ödevleri listeliyoruz ama metinleri tarihe göre ayarlıyoruz.
            
            if (d.bitisTarihi === todayStr) {
                notifications.push({ type: 'odev', title: 'Hatırlatma', desc: `Son teslim tarihi bugün olan ödeviniz var: ${d.title}`, badge: 'Acil', bg: 'bg-red-100 text-red-700', tab: 'tab-homework', date: d.bitisTarihi });
            } else if (d.bitisTarihi === tomorrowStr) {
                notifications.push({ type: 'odev', title: 'Hatırlatma', desc: `Yarın teslim edilecek ödev: ${d.title}`, badge: 'Yarın', bg: 'bg-orange-100 text-orange-700', tab: 'tab-homework', date: d.bitisTarihi });
            } else {
                notifications.push({ type: 'odev', title: 'Ödev Eklendi', desc: `Son Teslim Tarihi ${formatDateTR(d.bitisTarihi)} - ${d.title}`, badge: 'Ödev', bg: 'bg-blue-100 text-blue-700', tab: 'tab-homework', date: d.bitisTarihi });
            }
        });
        render();
    });

    // 2. HEDEFLER
    activeListeners.notifGoals = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), where("durum", "==", "devam")), (snap) => {
        notifications = notifications.filter(n => n.type !== 'hedef');
        snap.forEach(doc => {
            const d = doc.data();
            if (d.bitisTarihi === todayStr) {
                notifications.push({ type: 'hedef', title: 'Hatırlatma', desc: `Son teslim tarihi bugün olan hedefiniz var: ${d.title}`, badge: 'Acil', bg: 'bg-red-100 text-red-700', tab: 'tab-goals', date: d.bitisTarihi });
            } else {
                notifications.push({ type: 'hedef', title: 'Hedef Eklendi', desc: `${d.title} - Son Tarih: ${formatDateTR(d.bitisTarihi)}`, badge: 'Hedef', bg: 'bg-purple-100 text-purple-700', tab: 'tab-goals', date: d.bitisTarihi });
            }
        });
        render();
    });

    // 3. SEANSLAR (Ajanda)
    activeListeners.notifSession = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ajandam"), where("studentId", "==", studentDocId), where("tarih", ">=", todayStr)), (snap) => {
        notifications = notifications.filter(n => n.type !== 'seans');
        snap.forEach(doc => {
            const d = doc.data();
            if (d.tarih === todayStr) {
                notifications.push({ type: 'seans', title: 'Bugünkü Seans', desc: `${d.baslik || 'Görüşme'} - Saat: ${d.baslangic}`, badge: 'Bugün', bg: 'bg-green-100 text-green-700', tab: 'tab-ajanda', date: d.tarih });
            } else {
                notifications.push({ type: 'seans', title: 'Seans Eklendi', desc: `${formatDateTR(d.tarih)} tarihli seans eklendi.`, badge: 'Randevu', bg: 'bg-indigo-100 text-indigo-700', tab: 'tab-ajanda', date: d.tarih });
            }
        });
        // Tarihe göre sırala (Yakın tarih üstte)
        notifications.sort((a, b) => new Date(a.date) - new Date(b.date));
        render();
    });
}

// Global Modallar
window.openDenemeModal = function () {
    const profileClass = document.getElementById('profileClass').textContent;
    const isOrtaokul = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(profileClass);
    const types = CLASS_LEVEL_RULES[isOrtaokul ? 'ORTAOKUL' : 'LISE'].types;
    document.getElementById('inpDenemeTur').innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
    renderDenemeInputs(types[0]);
    document.getElementById('inpDenemeTarih').value = getLocalDateString(new Date());
    openModalWithBackHistory('modalDenemeEkle');
};

function renderDenemeInputs(tur) {
    const c = document.getElementById('denemeDersContainer'); if (!c) return; c.innerHTML = '';
    const config = EXAM_CONFIG[tur]; if (!config) return;
    if (tur === 'Diger') {
        c.innerHTML = `<div class="bg-orange-50 p-3 rounded-xl text-xs text-orange-700 mb-2 text-center">Analiz dışı.</div><div class="flex gap-2"><input type="number" id="inpDigerDogru" placeholder="Doğru" class="w-1/2 p-3 border rounded-xl"><input type="number" id="inpDigerYanlis" placeholder="Yanlış" class="w-1/2 p-3 border rounded-xl"></div>`;
    } else {
        config.subjects.forEach(sub => {
            c.innerHTML += `<div class="flex justify-between items-center py-2 border-b border-gray-100"><span class="text-sm font-bold text-gray-700 w-24 truncate">${sub.name}</span><div class="flex gap-2"><input type="number" placeholder="D" class="inp-deneme-d w-12 p-2 border border-green-200 rounded-lg text-center font-bold text-green-700 bg-green-50"><input type="number" placeholder="Y" class="inp-deneme-y w-12 p-2 border border-red-200 rounded-lg text-center font-bold text-red-700 bg-red-50"></div></div>`;
        });
    }
}

document.getElementById('inpDenemeTur').onchange = (e) => renderDenemeInputs(e.target.value);

document.getElementById('btnSaveDeneme').onclick = async () => {
    const tur = document.getElementById('inpDenemeTur').value;
    const tarih = document.getElementById('inpDenemeTarih').value;
    if (!tarih) return alert('Tarih seçin');
    
    let payload = { ad: document.getElementById('inpDenemeAd').value || "Deneme", tur, tarih, onayDurumu: 'bekliyor', kocId: coachId, studentId: studentDocId, studentAd: document.getElementById('headerStudentName').textContent, eklenmeTarihi: serverTimestamp() };
    const config = EXAM_CONFIG[tur];

    if (tur === 'Diger') {
        const d = parseInt(document.getElementById('inpDigerDogru').value)||0;
        const y = parseInt(document.getElementById('inpDigerYanlis').value)||0;
        payload.toplamNet = (d - (y/config.wrongRatio)).toFixed(2);
        payload.analizHaric = true;
    } else {
        let totalNet=0, netler={};
        document.querySelectorAll('.inp-deneme-d').forEach(i => {
            const d=parseInt(i.value)||0, y=parseInt(i.parentElement.querySelector('.inp-deneme-y').value)||0;
            if(d>0 || y>0) { const n = d - (y/config.wrongRatio || 0); totalNet+=n; netler[i.dataset.ders]={d,y,net:n.toFixed(2)}; }
        });
        payload.toplamNet = totalNet.toFixed(2);
        payload.netler = netler;
        payload.analizHaric = false;
    }
    
    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), payload);
    window.history.back();
};

window.openSoruModal = function () {
    document.getElementById('inpModalSoruTarih').value = getLocalDateString(new Date());
    const sel = document.getElementById('inpSoruDers');
    sel.innerHTML = '<option disabled selected>Ders Seç</option>';
    const optGroupRoutine = document.createElement('optgroup'); optGroupRoutine.label = "Rutinler";
    studentRutinler.forEach(r => { const o=document.createElement('option'); o.value=r; o.textContent=r; optGroupRoutine.appendChild(o); });
    sel.appendChild(optGroupRoutine);
    const optGroupLesson = document.createElement('optgroup'); optGroupLesson.label = "Dersler";
    studentDersler.forEach(d => { const o=document.createElement('option'); o.value=d; o.textContent=d; optGroupLesson.appendChild(o); });
    sel.appendChild(optGroupLesson);
    openModalWithBackHistory('modalSoruEkle');
}

document.getElementById('btnSaveModalSoru')?.addEventListener('click', async () => {
    const tarih = document.getElementById('inpModalSoruTarih').value;
    const ders = document.getElementById('inpSoruDers').value;
    const adet = parseInt(document.getElementById('inpSoruAdet').value);
    if (!tarih || !ders || !adet) return alert("Alanları doldurun");
    
    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), {
        tarih, ders, adet, konu: 'Hızlı Giriş', onayDurumu: 'bekliyor', eklenmeTarihi: serverTimestamp(), kocId: coachId
    });
    window.history.back();
    if (!document.getElementById('tab-tracking').classList.contains('hidden')) renderSoruTakibiGrid();
});
window.selectAvatar = async (icon) => { await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId), { avatarIcon: icon }); window.history.back(); loadDashboardData(); };


