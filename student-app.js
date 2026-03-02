// =================================================================
// 0. HATA VE AYARLAR
// =================================================================
window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('permissions')) return;
    console.error(e);
});

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    doc, getDoc, getDocs, collection, query, where, addDoc, updateDoc,
    serverTimestamp, orderBy, limit, deleteDoc, writeBatch, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { app, auth, db, appId } from './modules/firebase-config.js';
import { formatDateTR, cleanUpListeners, activeListeners, EXAM_CONFIG, SUBJECT_DATA, CLASS_LEVEL_RULES, openModalWithBackHistory } from './modules/helpers.js';

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

// Sayfa Değiştirme (Geçmişe kaydeder)
window.navigateToTab = function (tabId) {
    // Açık menüleri kapat
    document.getElementById('notificationDropdown')?.classList.add('hidden');

    // Geçmişe ekle
    window.history.pushState({ tab: tabId }, '', `#${tabId.replace('tab-', '')}`);
    switchTabUI(tabId);
};

// GLOBAL GERİ TUŞU (NATIVE HİSSİYAT)
window.addEventListener('popstate', (event) => {
    // 1. Önce açık Modalları kapat
    const openModals = document.querySelectorAll('.fixed.inset-0:not(.hidden)');
    if (openModals.length > 0) {
        openModals.forEach(m => m.classList.add('hidden'));
        return;
    }

    // 2. Sekme Değişimi
    if (event.state && event.state.tab) {
        switchTabUI(event.state.tab);
    } else {
        switchTabUI('tab-home'); // Varsayılan
    }
});

if (typeof window.uiOpenDate === 'undefined') {
    window.uiOpenDate = null;
}

// Akordiyonu açıp kapatan ve tarihi hafızaya alan fonksiyon
window.handleAccordionClick = function (dateStr, btnElement) {
    // 1. Tarihi kaydet
    window.uiOpenDate = dateStr;

    // 2. Görsel aç/kapa (toggleAccordion fonksiyonunu çağır)
    // Eğer toggleAccordion fonksiyonunuz varsa onu kullanır, yoksa manuel yaparız:
    const item = btnElement.closest('.accordion-item');
    const content = item.querySelector('.accordion-content');
    const icon = btnElement.querySelector('.fa-chevron-down');

    // Diğerlerini kapat (Opsiyonel - Sadece biri açık kalsın isterseniz)
    // document.querySelectorAll('.accordion-content').forEach(c => c.classList.add('hidden'));

    content.classList.toggle('hidden');
    if (icon) icon.classList.toggle('rotate-180');
};

// Modal Açıcı (Helpers içinde yoksa burası çalışır)
if (!window.openModalWithBackHistory) {
    window.openModalWithBackHistory = function (modalId) {
        const m = document.getElementById(modalId);
        if (m) {
            window.history.pushState({ modal: modalId }, '', window.location.hash);
            m.classList.remove('hidden');
        }
    }
}

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

    // ESKİ: document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => window.history.back());

    // YENİ: event delegation (dinamik/sonradan açılan modallarda da çalışır)
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('.close-modal');
        if (!closeBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const modalEl = closeBtn.closest('.fixed.inset-0') || closeBtn.closest('[role="dialog"]');
        closeModalSmart(modalEl);
    }, true);

    // (Opsiyonel ama önerilir) Overlay'e tıklayınca kapat: sadece arka plan alanına tıklanınca
    document.addEventListener('click', (e) => {
        const overlay = e.target.closest('.modal-overlay');
        if (!overlay) return;

        // İçerik yerine overlay'in kendisine tıklanmışsa kapat
        if (e.target === overlay) {
            e.preventDefault();
            e.stopPropagation();
            closeModalSmart(overlay);
        }
    }, true);

    // Hızlı Butonlar
    const btnQuickSoru = document.getElementById('btnQuickSoru');
    if (btnQuickSoru) btnQuickSoru.onclick = window.openSoruModal;

    document.getElementById('btnLogout').onclick = () => { cleanUpListeners(); signOut(auth); };
}


// -----------------------------------------------------------------------------
// 1. BAŞLATMA VE YETKİ ONARIMI
// -----------------------------------------------------------------------------
async function initializeStudentApp(uid) {
    try {
        const profileRef = doc(db, "artifacts", appId, "users", uid, "settings", "profile");
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
            const pd = profileSnap.data();
            coachId = pd.kocId;
            studentDocId = pd.linkedDocId;

            if (coachId && studentDocId) {
                // KRİTİK DÜZELTME: Eski kayıtlarda yetki sorunu yaşamamak için authUid'yi onar
                await ensureAuthUidExists(coachId, studentDocId, uid);

                loadDashboardData();
                enableHeaderIcons();
                initStudentNotifications(); // Bildirimleri başlat
            } else {
                alert("Profil bağlantısı hatalı. Lütfen koçunuzla iletişime geçin.");
                cleanUpListeners(); signOut(auth);
            }
        } else {
            // Profil yoksa (henüz oluşturulmadıysa) giriş sayfasına at
            cleanUpListeners(); signOut(auth);
        }
    } catch (e) { console.error("Başlatma hatası:", e); }
}

// Yardımcı: Yetki onarım fonksiyonu (Sessizce çalışır)
async function ensureAuthUidExists(coachId, studentId, uid) {
    try {
        const ref = doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentId);
        // Sadece yazmayı dene, okumayı deneme (Hız ve güvenlik için)
        await updateDoc(ref, { authUid: uid });
    } catch (e) {
        // Hata olursa (yetki yoksa veya internet kesikse) sessizce geç
        console.log("Yetki kontrolü notu:", e.code);
    }
}

// =================================================================
// 2. NAVİGASYON VE SEKME YÖNETİMİ (GÜNCELLENMİŞ)
// =================================================================

// UI Değiştirme Yardımcısı
function switchTabUI(tabId) {
    cleanUpListeners();

    // 1. Sekmeleri Değiştir
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(tabId)?.classList.remove('hidden');

    // 2. Alt Menü İkonlarını Güncelle
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('text-indigo-600', 'active');
        b.classList.add('text-gray-400');
        if (b.dataset.target === tabId) {
            b.classList.add('text-indigo-600', 'active');
            b.classList.remove('text-gray-400');
        }
    });

    // 3. Orta Buton (Kalem) Rengi
    const centerBtn = document.querySelector('.bottom-nav-center-btn');
    if (centerBtn) {
        if (tabId === 'tab-tracking') { centerBtn.classList.add('bg-indigo-700'); centerBtn.classList.remove('bg-indigo-600'); }
        else { centerBtn.classList.add('bg-indigo-600'); centerBtn.classList.remove('bg-indigo-700'); }
    }

    // 4. İlgili Sayfa Verilerini Yükle
    if (tabId === 'tab-homework') { odevWeekOffset = 0; loadHomeworksTab(); }
    else if (tabId === 'tab-messages') { markMessagesAsRead(); loadStudentMessages(); }
    else if (tabId === 'tab-tracking') { currentWeekOffset = 0; renderSoruTakibiGrid(); }
    else if (tabId === 'tab-ajanda') { currentCalDate = new Date(); loadCalendarDataAndDraw(currentCalDate); }
    else if (tabId === 'tab-goals') loadGoalsTab();
    else if (tabId === 'tab-denemeler') loadDenemelerTab();
    else if (tabId === 'tab-home') loadDashboardData();
}

// Global Yönlendirme Fonksiyonu
window.navigateToTab = function (tabId) {
    // Açık olan bildirim menüsü varsa zorla kapat
    const notifDropdown = document.getElementById('notificationDropdown');
    if (notifDropdown) notifDropdown.classList.add('hidden');

    // Geçmişe ekle ve UI değiştir
    window.history.pushState({ tab: tabId }, '', `#${tabId.replace('tab-', '')}`);
    switchTabUI(tabId);
};

// =================================================================
// 3. DASHBOARD
// =================================================================
async function loadDashboardData() {
    if (!coachId || !studentDocId) return;
    const snap = await getDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId));
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById('headerStudentName').textContent = d.ad;
        if (document.getElementById('profileName')) {
            document.getElementById('profileName').textContent = `${d.ad} ${d.soyad}`;
            document.getElementById('profileClass').textContent = d.sinif;
            document.getElementById('profileEmail').textContent = currentUser.email;
            if (d.kocAdi) document.getElementById('profileCoachName').textContent = d.kocAdi;
            else {
                getDoc(doc(db, "artifacts", appId, "users", coachId, "settings", "profile")).then(s => {
                    if (s.exists()) document.getElementById('profileCoachName').textContent = s.data().displayName || "Koç";
                });
            }
        }
        const avatarEl = document.getElementById('profileAvatar');
        const headerLogo = document.getElementById('headerLogoContainer');
        if (d.avatarIcon) {
            if (avatarEl) { avatarEl.textContent = d.avatarIcon; avatarEl.style.backgroundColor = '#fff'; }
            if (headerLogo) { headerLogo.innerHTML = `<span class="text-2xl">${d.avatarIcon}</span>`; headerLogo.style.background = 'transparent'; headerLogo.style.border = 'none'; }
        }
        const isOrtaokul = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(d.sinif);
        studentDersler = d.takipDersleri || (isOrtaokul ? SUBJECT_DATA['ORTAOKUL_5_6_7'] : SUBJECT_DATA['LISE_9_10']);
        renderProfileLessons(studentDersler);
        const filterSelect = document.getElementById('dashboardTimeFilter');
        if (filterSelect) {
            filterSelect.onchange = () => loadStudentStats(db, coachId, appId, studentDocId, filterSelect.value);
        }
    }
    updateHomeworkMetrics();
    loadStudentStats(db, coachId, appId, studentDocId, '30');
    loadUpcomingAppointments(db, coachId, appId, studentDocId);
    loadActiveGoalsForDashboard();
    loadOverdueHomeworks(db, coachId, appId, studentDocId);
}

// ... Dashboard Yardımcıları
function renderProfileLessons(dersler) {
    const profileTab = document.getElementById('tab-profile'); if (!profileTab) return;
    const oldSection = document.getElementById('profileLessonsContainer'); if (oldSection) oldSection.remove();
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
    if (!container) return;
    if (snap.empty) container.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Planlanmış seans yok.</p>';
    else container.innerHTML = snap.docs.map(doc => { const a = doc.data(); const isToday = a.tarih === todayStr; return `<div class="px-4 py-3 bg-white border border-gray-100 rounded-xl flex items-center justify-between shadow-sm mb-2"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full ${isToday ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600'} flex items-center justify-center font-bold text-sm shrink-0">${a.tarih.split('-')[2]}</div><div><h4 class="text-sm font-bold text-gray-800 leading-none mb-1">${a.baslik || 'Görüşme'}</h4><p class="text-xs text-gray-500 flex items-center gap-1"><i class="fa-regular fa-clock text-[10px]"></i> ${a.baslangic} - ${a.bitis}</p></div></div>${isToday ? '<span class="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">BUGÜN</span>' : ''}</div>`; }).join('');
}

async function loadStudentStats(db, uid, appId, sid, period) {
    const now = new Date();
    let startDate = null;

    // 1. DASHBOARD İÇİN TARİH FİLTRESİ
    if (period !== 'all') {
        const days = parseInt(period);
        const pastDate = new Date(now);
        pastDate.setDate(now.getDate() - days);
        startDate = getLocalDateString(pastDate);
    } else {
        startDate = '2000-01-01';
    }

    // --------------------------------------------------------------------------
    // A) VERİ ÇEKME (KPI ve ROZETLER İÇİN AYRI AYRI)
    // --------------------------------------------------------------------------
    const [
        // KPI SNAPS (Tarih Filtreli - Dashboard Kartları İçin)
        snapKpiGoals,
        snapKpiHomework,
        snapKpiExams,
        snapKpiQuestions,
        snapKpiSessions,

        // ROZET SNAPS (Tüm Zamanlar - Rozetler İçin)
        snapAllGoals,
        snapAllHomework,
        snapAllQuestions
    ] = await Promise.all([
        // KPI Sorguları (startDate filtresi var)
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "hedefler"), where("bitisTarihi", ">=", startDate))),
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), where("bitisTarihi", ">=", startDate))),
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "denemeler"), where("tarih", ">=", startDate))),
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "soruTakibi"), where("tarih", ">=", startDate))),
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("studentId", "==", sid))),

        // Rozet Sorguları (Tarih filtresi YOK - Sadece tamamlananlar)
        // Not: Sadece 'tamamlandi' olanları çekmek performans açısından daha iyidir.
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "hedefler"), where("durum", "==", "tamamlandi"))),
        getDocs(query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), where("durum", "==", "tamamlandi"))),
        // Soru takibinde durum olmadığı için hepsini çekip toplayacağız
        getDocs(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "soruTakibi"))
    ]);

    // --------------------------------------------------------------------------
    // B) DASHBOARD KARTLARINI GÜNCELLE (FİLTRELİ VERİ)
    // --------------------------------------------------------------------------

    // KPI: Tamamlanan Hedefler
    let kpiCompletedGoals = 0;
    snapKpiGoals.forEach(doc => { if (doc.data().durum === 'tamamlandi') kpiCompletedGoals++; });
    document.getElementById('kpiCompletedGoals').textContent = kpiCompletedGoals;

    // KPI: Tamamlanan Ödevler
    let kpiCompletedHomework = 0;
    snapKpiHomework.forEach(doc => { if (doc.data().durum === 'tamamlandi') kpiCompletedHomework++; });
    document.getElementById('kpiCompletedHomework').textContent = kpiCompletedHomework;

    // KPI: Toplam Deneme
    document.getElementById('kpiTotalExams').textContent = snapKpiExams.size;

    // KPI: Tamamlanan Seanslar
    let completedSessions = 0;
    snapKpiSessions.forEach(doc => { const d = doc.data(); if (d.tarih >= startDate && d.durum === 'tamamlandi') completedSessions++; });
    document.getElementById('kpiTotalSessions').textContent = completedSessions;

    // KPI: Soru ve Kitap Sayıları
    let kpiTotalQ = 0;
    let kpiTotalRead = 0;
    snapKpiQuestions.forEach(doc => {
        const d = doc.data();
        const adet = parseInt(d.adet) || 0;
        if (d.ders === 'Kitap Okuma' || (d.konu && d.konu.includes('Kitap'))) kpiTotalRead += adet;
        else kpiTotalQ += adet;
    });
    document.getElementById('kpiTotalQuestions').textContent = kpiTotalQ;
    document.getElementById('kpiReading').textContent = kpiTotalRead;

    // KPI: Ortalama Net
    let totalNet = 0;
    let subjectStats = {};
    snapKpiExams.forEach(doc => {
        const d = doc.data();
        if (d.analizHaric === true) return;
        totalNet += (parseFloat(d.toplamNet) || 0);
        if (d.netler) {
            for (const [ders, stats] of Object.entries(d.netler)) {
                if (!subjectStats[ders]) subjectStats[ders] = { total: 0, count: 0 };
                subjectStats[ders].total += (parseFloat(stats.net) || 0);
                subjectStats[ders].count++;
            }
        }
    });

    const avgNet = snapKpiExams.size > 0 ? (totalNet / snapKpiExams.size).toFixed(2) : '-';
    document.getElementById('kpiAvgNet').textContent = avgNet;

    // KPI: En İyi Ders
    let bestLesson = { name: '-', avg: -Infinity };
    for (const [name, stat] of Object.entries(subjectStats)) {
        const avg = stat.total / stat.count;
        if (avg > bestLesson.avg) bestLesson = { name, avg };
    }
    document.getElementById('kpiBestLesson').textContent = bestLesson.name !== '-' ? `${bestLesson.name} (${bestLesson.avg.toFixed(1)})` : '-';

    // --------------------------------------------------------------------------
    // C) ROZET HESAPLAMA (TÜM ZAMANLAR - FİLTRESİZ VERİ)
    // --------------------------------------------------------------------------

    // Rozet Verileri (All Time)
    const allTimeCompletedGoals = snapAllGoals.size; // Zaten 'tamamlandi' filtresiyle çektik
    const allTimeCompletedHomework = snapAllHomework.size; // Zaten 'tamamlandi' filtresiyle çektik

    let allTimeTotalQ = 0;
    snapAllQuestions.forEach(doc => {
        const d = doc.data();
        // Kitap okuma hariç sadece soruları topla
        if (!(d.ders === 'Kitap Okuma' || (d.konu && d.konu.includes('Kitap')))) {
            allTimeTotalQ += (parseInt(d.adet) || 0);
        }
    });

    // 1. Rozet Kuralları ve Seviyeleri
    const badgeRules = {
        goals: {
            title: 'Hedef Ustası',
            icon: 'fa-bullseye',
            levels: [
                { limit: 5, label: 'Bronz', color: 'text-orange-700 bg-orange-100 border-orange-200' },
                { limit: 15, label: 'Gümüş', color: 'text-gray-600 bg-gray-100 border-gray-300' },
                { limit: 30, label: 'Altın', color: 'text-yellow-600 bg-yellow-100 border-yellow-300' },
                { limit: 60, label: 'Elmas', color: 'text-blue-600 bg-blue-100 border-blue-300' },
                { limit: 100, label: 'Efsane', color: 'text-purple-600 bg-purple-100 border-purple-300' }
            ]
        },
        homework: {
            title: 'Ödev Canavarı',
            icon: 'fa-book-open',
            levels: [
                { limit: 10, label: 'Bronz', color: 'text-orange-700 bg-orange-100 border-orange-200' },
                { limit: 30, label: 'Gümüş', color: 'text-gray-600 bg-gray-100 border-gray-300' },
                { limit: 60, label: 'Altın', color: 'text-yellow-600 bg-yellow-100 border-yellow-300' },
                { limit: 120, label: 'Elmas', color: 'text-blue-600 bg-blue-100 border-blue-300' },
                { limit: 250, label: 'Efsane', color: 'text-purple-600 bg-purple-100 border-purple-300' }
            ]
        },
        questions: {
            title: 'Soru Kurdu',
            icon: 'fa-brain',
            levels: [
                { limit: 100, label: 'Bronz', color: 'text-orange-700 bg-orange-100 border-orange-200' },
                { limit: 500, label: 'Gümüş', color: 'text-gray-600 bg-gray-100 border-gray-300' },
                { limit: 2500, label: 'Altın', color: 'text-yellow-600 bg-yellow-100 border-yellow-300' },
                { limit: 5000, label: 'Elmas', color: 'text-blue-600 bg-blue-100 border-blue-300' },
                { limit: 10000, label: 'Efsane', color: 'text-purple-600 bg-purple-100 border-purple-300' }
            ]
        }
    };

    // 2. Seviye Hesaplama Fonksiyonu
    const calculateLevel = (currentVal, rules) => {
        let currentLevel = null;
        let nextLevel = rules[0];

        for (let i = 0; i < rules.length; i++) {
            if (currentVal >= rules[i].limit) {
                currentLevel = rules[i];
                nextLevel = rules[i + 1] || null;
            } else {
                nextLevel = rules[i];
                break;
            }
        }
        return { current: currentLevel, next: nextLevel };
    };

    // 3. Durumları Hesapla (DÜZELTİLDİ: Artık AllTime değişkenlerini kullanıyor)
    const statusGoals = calculateLevel(allTimeCompletedGoals, badgeRules.goals.levels);
    const statusHomework = calculateLevel(allTimeCompletedHomework, badgeRules.homework.levels);
    const statusQuestions = calculateLevel(allTimeTotalQ, badgeRules.questions.levels);

    // 4. HTML Oluşturucu (Yardımcı) - BELİRGİN OK VE SAYILAR
    // 4. HTML Oluşturucu (Yardımcı) - RENKLİ İLERLEME ÇUBUKLARI
    const createBadgeHTML = (rule, status, currentVal) => {
        // DURUM 1: Henüz hiç seviye atlamamış (Başlangıç)
        if (!status.current) {
            const nextLevel = status.next;
            const progress = Math.min(100, (currentVal / nextLevel.limit) * 100);
            return `
            <div class="p-3 bg-gray-50 rounded-xl border border-gray-200 relative overflow-hidden group hover:shadow-md transition-all">
                 <div class="flex justify-between items-center mb-3">
                     <h4 class="text-[10px] uppercase tracking-wider text-gray-500 font-bold">${rule.title}</h4>
                     <span class="text-[11px] font-black text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm">${currentVal} / ${nextLevel.limit}</span>
                 </div>
                 
                 <div class="flex items-center justify-between gap-2">
                     <div class="flex flex-col items-center opacity-60">
                        <div class="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-lg font-bold">
                            <i class="fa-solid fa-play"></i>
                        </div>
                        <span class="text-[9px] font-bold mt-1 text-gray-500">Başlangıç</span>
                     </div>

                     <div class="flex-1 flex flex-col items-center px-1">
                        <i class="fa-solid fa-chevron-right text-gray-400 text-sm mb-1 animate-pulse font-bold"></i>
                        <div class="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden border border-gray-300">
                            <div class="bg-indigo-500 h-full transition-all duration-500" style="width: ${progress}%"></div>
                        </div>
                     </div>

                     <div class="flex flex-col items-center relative grayscale opacity-70">
                         <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm border border-gray-200 ${nextLevel.color.replace('text-', 'bg-').split(' ')[0]} text-white relative">
                             <i class="fa-solid ${rule.icon}"></i>
                              <div class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                                <i class="fa-solid fa-lock text-xs text-white/90"></i>
                              </div>
                         </div>
                         <span class="text-[9px] font-bold mt-1 text-gray-600">${nextLevel.label}</span>
                     </div>
                 </div>
            </div>`;
        }

        const isMax = !status.next;

        // DURUM 2: Maksimum Seviye (Efsane - Tamamlandı)
        if (isMax) {
            return `
            <div class="p-3 bg-gradient-to-br from-white to-purple-50 rounded-xl border border-purple-100 shadow-sm relative overflow-hidden text-center hover:scale-[1.02] transition-transform">
                <div class="absolute inset-0 opacity-10 bg-repeat z-0" style="background-image: url('https://www.transparenttextures.com/patterns/cubes.png');"></div>
                <h4 class="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2 relative z-10">${rule.title}</h4>
                <div class="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl mb-2 shadow-lg relative z-10 ${status.current.color} animate-wiggle-slow">
                    <i class="fa-solid ${rule.icon}"></i>
                    <i class="fa-solid fa-crown absolute -top-2 -right-2 text-yellow-400 text-sm bg-white rounded-full p-0.5 border border-yellow-100"></i>
                </div>
                <h4 class="text-sm font-black text-gray-800 relative z-10">${status.current.label}</h4>
                <span class="text-[9px] font-bold text-green-600 mt-1 inline-block bg-green-50 px-2 py-0.5 rounded-full relative z-10">TAMAMLANDI! 🏆</span>
            </div>`;
        }

        // DURUM 3: İlerleme Halinde (RENKLİ GÖRÜNÜM)
        const limit = status.next.limit;
        const progress = Math.min(100, (currentVal / limit) * 100);

        // Rengi dinamik olarak ayıkla (Örn: 'orange', 'blue' vb.)
        // status.current.color stringi şöyledir: "text-orange-700 bg-orange-100 ..."
        // Biz buradan 'orange' kelimesini çekip kendi canlı renklerimizi üreteceğiz.
        const colorClass = status.current.color;
        const baseColor = colorClass.match(/bg-(\w+)-100/)?.[1] || 'indigo'; // Renk ismini bul (bulamazsa indigo yap)

        // Canlı renkleri oluştur
        const barColor = `bg-${baseColor}-500`;           // İlerleme çubuğu (Canlı)
        const counterBg = `bg-${baseColor}-50`;           // Sayaç Arka Planı (Soluk)
        const counterText = `text-${baseColor}-700`;      // Sayaç Yazısı (Koyu)
        const counterBorder = `border-${baseColor}-200`;  // Sayaç Kenarlığı
        const arrowColor = `text-${baseColor}-400`;       // Ok Rengi

        return `
        <div class="p-3 bg-white rounded-xl border shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-1 group">
             <div class="flex justify-between items-center mb-3">
                 <h4 class="text-[10px] uppercase tracking-wider text-gray-500 font-bold">${rule.title}</h4>
                 
                 <span class="text-[11px] font-black ${counterText} ${counterBg} border ${counterBorder} px-2.5 py-0.5 rounded shadow-sm">
                    ${currentVal} / ${limit}
                 </span>
             </div>

             <div class="flex items-center justify-between gap-2">
                 <div class="flex flex-col items-center relative z-10">
                     <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md ${status.current.color} transition-transform group-hover:scale-110">
                         <i class="fa-solid ${rule.icon}"></i>
                     </div>
                     <span class="text-[9px] font-bold mt-1 ${status.current.color.split(' ')[0]}">${status.current.label}</span>
                 </div>

                 <div class="flex-1 flex flex-col items-center px-1">
                    <i class="fa-solid fa-chevron-right ${arrowColor} text-sm mb-1 animate-pulse font-extrabold drop-shadow-sm"></i>
                    
                    <div class="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden shadow-inner border border-gray-200">
                        <div class="h-full rounded-full ${barColor} transition-all duration-1000 ease-out relative" style="width: ${progress}%">
                            <div class="absolute inset-0 bg-white/30 animate-shimmer" style="background-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);"></div>
                        </div>
                    </div>
                 </div>

                 <div class="flex flex-col items-center relative filter grayscale opacity-60 hover:opacity-100 transition-all cursor-help" title="Sonraki Hedef: ${status.next.label}">
                     <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 relative">
                         <i class="fa-solid ${rule.icon}"></i>
                         <div class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
                            <i class="fa-solid fa-lock text-[9px] text-gray-400"></i>
                         </div>
                     </div>
                     <span class="text-[9px] font-bold mt-1 text-gray-600">${status.next.label}</span>
                 </div>
             </div>
        </div>`;
    };

    // --------------------------------------------------------------------------
    // 5. ROZET ALANINI EKRANA BAS (GÜNCELLENMİŞ: BİLGİLENDİRME MODALI İLE)
    // --------------------------------------------------------------------------
    const profileTab = document.getElementById('tab-profile');
    let badgeContainer = document.getElementById('studentBadgesContainer');

    // Rozet Container'ı Yoksa Oluştur
    if (!badgeContainer && profileTab) {
        badgeContainer = document.createElement('div');
        badgeContainer.id = 'studentBadgesContainer';
        badgeContainer.className = 'grid grid-cols-1 md:grid-cols-3 gap-3 mt-4';

        const settingsHeader = Array.from(profileTab.querySelectorAll('h4')).find(h => h.textContent.includes('Ayarlar'));
        if (settingsHeader) {
            settingsHeader.parentNode.insertBefore(badgeContainer, settingsHeader);

            // --- YENİ: BİLGİ İKONLU BAŞLIK ---
            const titleContainer = document.createElement('div');
            titleContainer.className = "flex items-center gap-2 mb-2 mt-4 pl-1";
            titleContainer.innerHTML = `
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Başarı Rozetleri</h4>
                <button onclick="window.showBadgeRules()" class="text-indigo-400 hover:text-indigo-600 transition-colors">
                    <i class="fa-solid fa-circle-info text-sm"></i>
                </button>
            `;
            badgeContainer.parentNode.insertBefore(titleContainer, badgeContainer);
        }
    }

    // Rozetleri Render Et
    if (badgeContainer) {
        badgeContainer.innerHTML =
            createBadgeHTML(badgeRules.goals, statusGoals, allTimeCompletedGoals) +
            createBadgeHTML(badgeRules.homework, statusHomework, allTimeCompletedHomework) +
            createBadgeHTML(badgeRules.questions, statusQuestions, allTimeTotalQ);
    }

    // --- YENİ: KURALLARI GÖSTEREN FONKSİYON VE MODAL ---
    window.showBadgeRules = () => {
        // Mevcut modal varsa sil (tekrar açılmasın)
        const existing = document.getElementById('badgeRulesModal');
        if (existing) existing.remove();

        // Kural tablosu oluşturucu
        const createRuleTable = (rule) => {
            return `
            <div class="mb-4 last:mb-0">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">
                        <i class="fa-solid ${rule.icon}"></i>
                    </div>
                    <h5 class="font-bold text-gray-700 text-sm">${rule.title}</h5>
                </div>
                <div class="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs">
                    ${rule.levels.map(l => `
                        <div class="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                            <span class="${l.color.split(' ')[0]} font-bold">${l.label}</span>
                            <span class="text-gray-500">${l.limit} ${rule.title.includes('Soru') ? 'Soru' : (rule.title.includes('Hedef') ? 'Hedef' : 'Ödev')}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        };

        const modalHtml = `
        <div id="badgeRulesModal" class="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onclick="if(event.target === this) this.remove()">
            <div class="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl">
                <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 class="font-bold text-gray-800">Nasıl Rozet Kazanırım?</h3>
                    <button onclick="document.getElementById('badgeRulesModal').remove()" class="w-8 h-8 rounded-full bg-white text-gray-500 hover:text-red-500 flex items-center justify-center shadow-sm transition-colors">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="p-5 overflow-y-auto custom-scrollbar">
                    <p class="text-xs text-gray-500 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <i class="fa-solid fa-circle-info mr-1"></i> 
                        Rozetler <strong>tüm zamanlardaki</strong> başarılarına göre verilir.
                    </p>
                    ${createRuleTable(badgeRules.goals)}
                    ${createRuleTable(badgeRules.homework)}
                    ${createRuleTable(badgeRules.questions)}
                </div>
                <div class="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                    <button onclick="document.getElementById('badgeRulesModal').remove()" class="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
                        Tamam, Anladım 👍
                    </button>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    // --------------------------------------------------------------------------
    // D) KUTLAMA VE BİLDİRİM (CONFETTI)
    // --------------------------------------------------------------------------

    const triggerCelebration = (badgeName, levelName, iconClass, colorClass) => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;
        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);

        const modalHtml = `
        <div id="celebrationModal" class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-scale-in">
            <div class="bg-white rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl border-4 border-yellow-400">
                <div class="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white shadow-lg text-4xl text-white animate-bounce">
                    <i class="fa-solid fa-trophy"></i>
                </div>
                <h2 class="text-2xl font-black text-gray-800 mt-8 mb-2">TEBRİKLER! 🎉</h2>
                <p class="text-gray-500 text-sm mb-6">Harika gidiyorsun! Yeni bir seviyeye ulaştın.</p>
                <div class="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                    <div class="text-4xl mb-2 ${colorClass}"><i class="fa-solid ${iconClass}"></i></div>
                    <h3 class="text-lg font-bold text-gray-800">${badgeName}</h3>
                    <div class="text-sm font-bold text-indigo-600 uppercase tracking-widest">${levelName} SEVİYESİ</div>
                </div>
                <button onclick="document.getElementById('celebrationModal').remove()" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:scale-105 transition-transform">
                    Harikayım! 😎
                </button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    const checkAndCelebrate = (key, status, rule) => {
        if (!status.current) return;
        const storageKey = `badge_${studentDocId}_${key}`;
        const lastLevel = localStorage.getItem(storageKey);
        const currentLabel = status.current.label;

        if (lastLevel !== currentLabel) {
            localStorage.setItem(storageKey, currentLabel);
            triggerCelebration(rule.title, currentLabel, rule.icon, status.current.color.split(' ')[0]);
        }
    };

    checkAndCelebrate('goals', statusGoals, badgeRules.goals);
    checkAndCelebrate('homework', statusHomework, badgeRules.homework);
    checkAndCelebrate('questions', statusQuestions, badgeRules.questions);
}

async function loadActiveGoalsForDashboard() {
    const list = document.getElementById('dashboardHedefList'); if (!list) return;
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), where("durum", "!=", "tamamlandi"), limit(3));
    const snap = await getDocs(q);
    list.innerHTML = snap.empty ? '<p class="text-center text-gray-400 text-xs py-4">Hedef bulunamadı.</p>' : snap.docs.map(d => `<div class="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-green-500"></div><p class="text-xs font-bold text-gray-700 truncate">${d.data().title}</p></div>`).join('');
}

async function loadOverdueHomeworks(db, uid, appId, sid) {
    const today = getLocalDateString(new Date());
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), where("durum", "!=", "tamamlandi"), where("bitisTarihi", "<", today), orderBy("bitisTarihi", "asc"));
    const snap = await getDocs(q);
    const container = document.getElementById('gecikmisOdevlerList'); if (!container) return;
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
    const container = document.getElementById('weeklyAccordion'); if (!container) return;

    // 1. DÜZELTME: Global değişkeni kullan
    if (!window.uiOpenDate) window.uiOpenDate = getLocalDateString(new Date());

    const dates = getWeekDates(currentWeekOffset);
    document.getElementById('weekRangeTitle').textContent = `${formatDateTR(dates[0].dateStr)} - ${formatDateTR(dates[6].dateStr)}`;

    document.getElementById('prevWeekBtn').onclick = () => { currentWeekOffset--; renderSoruTakibiGrid(); };
    const next = document.getElementById('nextWeekBtn');
    next.onclick = () => { currentWeekOffset++; renderSoruTakibiGrid(); };
    next.disabled = currentWeekOffset >= 0;

    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), where("tarih", ">=", dates[0].dateStr), where("tarih", "<=", dates[6].dateStr));

    if (activeListeners.soruTakibiUnsubscribe) activeListeners.soruTakibiUnsubscribe();

    activeListeners.soruTakibiUnsubscribe = onSnapshot(q, (snap) => {
        const data = []; snap.forEach(d => data.push({ id: d.id, ...d.data() }));

        container.innerHTML = dates.map(day => {
            const isToday = day.isToday;
            // 2. DÜZELTME: Açık kalma durumunu global değişkene göre kontrol et
            const isOpen = day.dateStr === window.uiOpenDate;

            const createCard = (label, isRoutine = false) => {
                const r = data.find(d => d.tarih === day.dateStr && d.ders === label);
                const val = r ? r.adet : '';
                const isApproved = r && r.onayDurumu === 'onaylandi';
                let borderClass = 'border-orange-100 bg-orange-50';
                let textClass = 'text-orange-600';

                if (isApproved) { borderClass = 'border-green-100 bg-green-50'; textClass = 'text-green-600'; }
                else if (val) { borderClass = 'border-orange-200 bg-white'; }

                return `<div class="flex flex-col items-center justify-center p-2 rounded-xl border ${borderClass} shadow-sm aspect-square relative">
                    ${isRoutine ? '<i class="fa-solid fa-star text-[8px] text-orange-400 absolute top-1 right-1"></i>' : ''}
                    <label class="text-[9px] font-bold text-gray-600 mb-1 text-center w-full truncate">${label}</label>
                    <input type="number" class="w-full text-center bg-transparent font-bold text-xl ${textClass} focus:outline-none p-0" placeholder="-" value="${val}" data-tarih="${day.dateStr}" data-ders="${label}" data-doc-id="${r ? r.id : ''}" ${isApproved ? 'disabled' : ''} onblur="saveInput(this)">
                    <span class="text-[8px] text-gray-400 uppercase tracking-wide">${label === 'Kitap Okuma' ? 'Sayfa' : 'Soru'}</span>
                </div>`;
            };

            // 3. DÜZELTME: onclick olayını yeni global fonksiyona bağla
            return `
            <div class="accordion-item border-b border-gray-100 last:border-0">
                <button class="accordion-header w-full flex justify-between items-center p-4 ${isToday ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'bg-white text-gray-700'}" 
                        onclick="window.handleAccordionClick('${day.dateStr}', this)">
                    <div class="flex items-center gap-3">
                        <span class="text-lg font-bold">${day.dayNum}</span>
                        <span class="text-sm font-medium opacity-80">${day.dayName}</span>
                    </div>
                    <i class="fa-solid fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}"></i>
                </button>
                
                <div class="accordion-content ${isOpen ? '' : 'hidden'} px-4 pb-4 bg-white pt-2">
                    <div class="mb-4">
                        <h4 class="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2 flex items-center gap-1"><i class="fa-solid fa-star"></i> Rutinler</h4>
                        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            ${studentRutinler.map(r => createCard(r, true)).join('')}
                        </div>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 flex items-center gap-1"><i class="fa-solid fa-book"></i> Dersler</h4>
                        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            ${studentDersler.length > 0 ? studentDersler.map(d => createCard(d)).join('') : '<p class="text-xs text-gray-400 col-span-3">Ders eklenmemiş.</p>'}
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    });
}

window.saveInput = async (input) => {
    const val = parseInt(input.value) || 0;
    const ref = collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi");
    if (input.dataset.docId) {
        if (val > 0) await updateDoc(doc(ref, input.dataset.docId), { adet: val, onayDurumu: 'bekliyor' });
        else { await deleteDoc(doc(ref, input.dataset.docId)); input.dataset.docId = ""; }
    } else if (val > 0) {
        const d = await addDoc(ref, { tarih: input.dataset.tarih, ders: input.dataset.ders, adet: val, konu: 'Genel', onayDurumu: 'bekliyor', eklenmeTarihi: serverTimestamp(), kocId: coachId });
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
    const list = document.getElementById('studentHedefList'); if (!list) return;
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
            return `<div class="p-4 rounded-xl border ${bgClass} shadow-sm mb-3 relative group transition-all">${isPinned ? '<div class="absolute top-0 right-0 w-8 h-8 bg-yellow-400 text-white rounded-bl-xl rounded-tr-xl flex items-center justify-center shadow-sm"><i class="fa-solid fa-thumbtack text-sm"></i></div>' : ''}<div class="flex items-start gap-4"><div class="w-12 h-12 rounded-full ${iconClass.split(' ').slice(0, 2).join(' ')} flex items-center justify-center text-xl shrink-0"><i class="fa-solid ${iconClass.split(' ').pop()}"></i></div><div class="flex-1"><div class="flex justify-between items-start pr-6"><h4 class="font-bold text-gray-800 text-sm leading-tight">${h.title}</h4>${isDone ? '<span class="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Tamamlandı</span>' : ''}</div><p class="text-xs text-gray-600 mt-1 mb-2 leading-relaxed">${h.aciklama || ''}</p><div class="flex items-center gap-4 text-[10px] text-gray-400 font-medium"><span class="flex items-center gap-1"><i class="fa-regular fa-calendar text-purple-400"></i> ${formatDateTR(h.olusturmaTarihi?.toDate ? getLocalDateString(h.olusturmaTarihi.toDate()) : '')}</span><span class="flex items-center gap-1 ${!isDone ? 'text-orange-500' : ''}"><i class="fa-regular fa-flag"></i> ${formatDateTR(h.bitisTarihi)}</span></div></div></div></div>`;
        }).join('');
    });
}

// =================================================================
// 6. DENEMELER
// =================================================================
function loadDenemelerTab() {
    const list = document.getElementById('studentDenemeList'); if (!list) return;
    const btn = document.getElementById('btnAddNewDeneme'); if (btn) btn.onclick = window.openDenemeModal;

    activeListeners.denemelerUnsubscribe = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), orderBy("tarih", "desc")), (snap) => {
        const data = []; snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        const validData = data.filter(x => x.onayDurumu === 'onaylandi' && x.analizHaric !== true);
        let totalNet = 0, maxNet = 0;
        validData.forEach(x => { const n = parseFloat(x.toplamNet); totalNet += n; if (n > maxNet) maxNet = n; });

        if (document.getElementById('studentKpiAvg')) document.getElementById('studentKpiAvg').textContent = (validData.length ? (totalNet / validData.length) : 0).toFixed(2);
        if (document.getElementById('studentKpiMax')) document.getElementById('studentKpiMax').textContent = maxNet.toFixed(2);
        if (document.getElementById('studentKpiTotal')) document.getElementById('studentKpiTotal').textContent = validData.length;

        const ctx = document.getElementById('studentDenemeChart');
        if (ctx && validData.length > 0) {
            const sorted = [...validData].sort((a, b) => a.tarih.localeCompare(b.tarih)).slice(-10);
            if (denemeChartInstance) denemeChartInstance.destroy();
            denemeChartInstance = new Chart(ctx, {
                type: 'line',
                data: { labels: sorted.map(d => formatDateTR(d.tarih).slice(0, 5)), datasets: [{ label: 'Net', data: sorted.map(d => d.toplamNet), borderColor: '#9333ea', backgroundColor: 'rgba(147, 51, 234, 0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#fff', pointBorderColor: '#9333ea', pointBorderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } } }
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
    const container = document.getElementById('studentOdevList'); if (!container) return;
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

    if (activeListeners.odevlerUnsubscribe) activeListeners.odevlerUnsubscribe();

    activeListeners.odevlerUnsubscribe = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler")), (snap) => {
        const allOdevs = [];
        snap.forEach(doc => allOdevs.push({ id: doc.id, ...doc.data() }));

        grid.innerHTML = '';

        for (let i = 0; i < 7; i++) {
            const loopDate = new Date(mondayDate);
            loopDate.setDate(mondayDate.getDate() + i);
            const dateStr = getLocalDateString(loopDate);
            const dayName = loopDate.toLocaleDateString('tr-TR', { weekday: 'long' });
            const isToday = dateStr === getLocalDateString(new Date());
            const dailyOdevs = allOdevs.filter(o => o.bitisTarihi === dateStr);

            const dayCard = document.createElement('div');
            dayCard.className = `bg-white rounded-xl border ${isToday ? 'border-indigo-300 ring-2 ring-indigo-50 shadow-md' : 'border-gray-200'} overflow-hidden`;

            let contentHtml = `
                <div class="p-3 ${isToday ? 'bg-indigo-50' : 'bg-gray-50'} border-b border-gray-100 flex justify-between items-center">
                    <span class="font-bold text-sm ${isToday ? 'text-indigo-700' : 'text-gray-700'}">${dayName}</span>
                    <span class="text-xs text-gray-500 font-mono">${formatDateTR(dateStr)}</span>
                </div>
                <div class="p-3 space-y-2">`;

            if (dailyOdevs.length === 0) {
                contentHtml += `<p class="text-center text-xs text-gray-400 py-2 italic">Ödev yok.</p>`;
            } else {
                dailyOdevs.forEach(o => {
                    let statusClass = "bg-blue-50 border-blue-100 text-blue-800";
                    let statusText = "Yapılacak";
                    let actionBtn = `<button class="w-full mt-2 bg-blue-600 text-white text-xs py-2 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-sm active:scale-95" onclick="completeOdev('${o.id}')">Tamamladım</button>`;

                    if (o.durum === 'tamamlandi') {
                        if (o.onayDurumu === 'onaylandi') {
                            statusClass = "bg-green-50 border-green-100 text-green-800";
                            statusText = '<i class="fa-solid fa-check-double mr-1"></i> Tamamlandı';
                            actionBtn = '';
                        } else {
                            statusClass = "bg-orange-50 border-orange-100 text-orange-800";
                            statusText = '<i class="fa-solid fa-clock mr-1"></i> Onay Bekliyor';
                            actionBtn = '';
                        }
                    }

                    // --- URL ALGILAMA VE LİNK GÖSTERİMİ ---
                    let description = o.aciklama || '';

                    // 1. Açıklama içindeki linkleri taranabilir yap (Regex ile)
                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                    const formattedDesc = description.replace(urlRegex, (url) => {
                        return `<a href="${url}" target="_blank" class="text-indigo-600 underline hover:text-indigo-800 break-all" onclick="event.stopPropagation();">${url}</a>`;
                    });

                    // 2. Eğer veritabanında ayrı bir 'link' alanı varsa onu da buton olarak ekle
                    let extraLinkBtn = '';
                    if (o.link && o.link.trim() !== '') {
                        let safeLink = o.link.startsWith('http') ? o.link : `https://${o.link}`;
                        extraLinkBtn = `
                            <a href="${safeLink}" target="_blank" class="flex items-center gap-2 mt-2 p-2 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-100 hover:bg-indigo-100 transition-colors w-max max-w-full">
                                <i class="fa-solid fa-link"></i>
                                <span class="truncate">Bağlantıyı Aç</span>
                            </a>`;
                    }

                    contentHtml += `
                        <div class="border rounded-lg p-3 ${statusClass} flex flex-col gap-1">
                            <div class="flex justify-between items-start mb-1">
                                <h4 class="font-bold text-sm leading-tight flex items-center w-full pr-2">${o.title}</h4>
                                <span class="text-[9px] font-bold px-1.5 py-0.5 bg-white bg-opacity-60 rounded whitespace-nowrap ml-1 shrink-0">${statusText}</span>
                            </div>
                            
                            <p class="text-xs opacity-80 mb-1 leading-relaxed break-words">${formattedDesc}</p>
                            
                            ${extraLinkBtn}
                            
                            ${actionBtn}
                        </div>`;
                });
            }
            contentHtml += `</div>`;
            dayCard.innerHTML = contentHtml;
            grid.appendChild(dayCard);
        }
    });
}

window.completeOdev = async (odevId) => {
    if (!confirm("Ödevi tamamladın mı?")) return;
    try { await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler", odevId), { durum: 'tamamlandi', onayDurumu: 'bekliyor' }); }
    catch (e) { console.error(e); alert("Hata oluştu."); }
};

async function updateHomeworkMetrics() {
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"));
    const snap = await getDocs(q);
    let total = 0, done = 0;
    snap.forEach(doc => { const d = doc.data(); total++; if (d.durum === 'tamamlandi') done++; });
    const p = total === 0 ? 0 : Math.round((done / total) * 100);
    if (document.getElementById('homeworkChartPercent')) document.getElementById('homeworkChartPercent').textContent = `%${p}`;
    if (document.getElementById('homeworkChartText')) document.getElementById('homeworkChartText').textContent = `${done} Tamamlanan / ${total} Toplam`;
    const ctx = document.getElementById('weeklyHomeworkChart');
    if (ctx) {
        if (homeworkChart) homeworkChart.destroy();
        homeworkChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Tamamlanan', 'Kalan'], datasets: [{ data: [done, total - done], backgroundColor: ['#4f46e5', '#e5e7eb'], borderWidth: 0, cutout: '75%' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { animateScale: true, animateRotate: true } } });
    }
}

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
        // --- YENİ EKLENEN KISIM BAŞLANGICI ---
        // Koçtan gelen ve okunmamış mesajları bulup "okundu" yapıyoruz.
        const unreadDocs = snap.docs.filter(d => d.data().gonderen === 'koc' && d.data().okundu === false);

        if (unreadDocs.length > 0) {
            // Görsel olarak kırmızı noktaları hemen gizle (Hız hissi için)
            const headerBadge = document.querySelector('#btnHeaderMessages .badge-dot');
            const dashBadge = document.getElementById('dashUnreadCount');
            if (headerBadge) headerBadge.classList.add('hidden');
            if (dashBadge) dashBadge.classList.add('hidden');

            // Veritabanını güncelle
            const batch = writeBatch(db);
            unreadDocs.forEach(d => {
                batch.update(d.ref, { okundu: true });
            });
            // Hata olursa konsola bas ama akışı bozma
            batch.commit().catch(e => console.log("Okundu bilgisi güncellenemedi", e));
        }
        // --- YENİ EKLENEN KISIM BİTİŞİ ---
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
            const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
    if (!coachId || !studentDocId) return;

    getDocs(query(collection(db, "artifacts", appId, "users", coachId, "ajandam"), where("studentId", "==", studentDocId), where("tarih", ">=", todayStr), orderBy("tarih", "asc"))).then(snap => {
        if (snap.empty) {
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

    if (btnNotif && drop) {
        btnNotif.onclick = (e) => { e.stopPropagation(); drop.classList.toggle('hidden'); document.getElementById('headerNotificationDot').classList.add('hidden'); };
        if (close) close.onclick = () => drop.classList.add('hidden');
        document.addEventListener('click', (e) => { if (!drop.contains(e.target) && !btnNotif.contains(e.target)) drop.classList.add('hidden'); });
    }
    // Mesaj İkonu İşlevi
    const btnMsg = document.getElementById('btnHeaderMessages');
    if (btnMsg) {
        btnMsg.onclick = () => window.navigateToTab('tab-messages');
    }
    const btnChangeAvatar = document.getElementById('btnChangeAvatar');
    if (btnChangeAvatar) {
        btnChangeAvatar.onclick = () => {
            const grid = document.getElementById('avatarGrid');
            if (grid) {
                grid.innerHTML = AVATAR_LIBRARY.map(icon => `<button class="text-4xl p-2 hover:bg-gray-100 rounded-lg transition-colors active:scale-95" onclick="selectAvatar('${icon}')">${icon}</button>`).join('');
                openModalWithBackHistory('modalAvatarSelect');
            }
        };
    }
}

// =================================================================
// BİLDİRİM VE KPI SİSTEMİ (TEK VE MERKEZİ FONKSİYON)
// =================================================================
function initStudentNotifications() {
    const list = document.getElementById('notificationList');
    const dot = document.getElementById('headerNotificationDot');

    // Dashboard'daki sayı elementleri
    const dashOdevCount = document.getElementById('dashPendingOdev');
    const dashMsgCount = document.getElementById('dashUnreadCount');

    if (!list || !coachId || !studentDocId) return;

    let notifications = [];

    // Listeyi Ekrana Basan Render Fonksiyonu
    const render = () => {
        // Tarihe göre sırala (En yeni en üstte)
        notifications.sort((a, b) => {
            // Eğer tarih string ise (YYYY-MM-DD) karşılaştır, değilse olduğu gibi bırak
            if (a.date && b.date) return new Date(b.date) - new Date(a.date);
            return 0;
        });

        if (notifications.length > 0) {
            dot.classList.remove('hidden');
            list.innerHTML = notifications.map(n => `
                <div class="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors group" onclick="navigateToTab('${n.tab}')">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-bold text-gray-800 group-hover:text-indigo-600">${n.title}</p>
                            <p class="text-xs text-gray-500 line-clamp-1">${n.desc}</p>
                        </div>
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-medium ${n.bg}">${n.badge}</span>
                    </div>
                </div>`).join('');
        } else {
            dot.classList.add('hidden');
            list.innerHTML = `<div class="flex flex-col items-center justify-center py-8 text-gray-400"><i class="fa-regular fa-bell-slash text-2xl mb-2 opacity-20"></i><p class="text-xs">Bildirim yok.</p></div>`;
        }
    };

    // --- 1. MESAJ BİLDİRİMİ (HEADER + DASHBOARD + DROPDOWN) ---
    const msgBtn = document.getElementById('btnHeaderMessages');
    let msgBadge = msgBtn?.querySelector('.badge-dot');

    // Header ikonunda kırmızı nokta yoksa oluştur
    if (msgBtn && !msgBadge) {
        msgBadge = document.createElement('span');
        msgBadge.className = "badge-dot hidden absolute top-2 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white";
        msgBtn.style.position = "relative";
        msgBtn.appendChild(msgBadge);
    }

    if (activeListeners.unreadMessagesUnsubscribe) activeListeners.unreadMessagesUnsubscribe();

    activeListeners.unreadMessagesUnsubscribe = onSnapshot(query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"),
        where("gonderen", "==", "koc"),
        where("okundu", "==", false)
    ), (snap) => {
        const count = snap.size;

        // A) Header İkonundaki Nokta
        if (msgBadge) {
            if (count > 0) msgBadge.classList.remove('hidden');
            else msgBadge.classList.add('hidden');
        }

        // B) Dashboard Kartındaki Sayı (dashUnreadCount)
        if (dashMsgCount) {
            if (count > 0) {
                dashMsgCount.textContent = count > 9 ? '9+' : count;
                dashMsgCount.classList.remove('hidden');
            } else {
                dashMsgCount.classList.add('hidden');
            }
        }

        // C) Bildirim Listesine Ekleme (Opsiyonel: Mesajları da bildirim listesinde görmek isterseniz)
        /*
        notifications = notifications.filter(n => n.type !== 'mesaj');
        if (count > 0) {
            notifications.push({ 
                type: 'mesaj', 
                title: 'Yeni Mesaj', 
                desc: `${count} okunmamış mesajınız var.`, 
                badge: 'Mesaj', 
                bg: 'bg-indigo-100 text-indigo-700', 
                tab: 'tab-messages', 
                date: new Date().toISOString() 
            });
        }
        render();
        */
    });

    // --- 2. ÖDEVLER (DROPDOWN + DASHBOARD) ---
    const todayStr = getLocalDateString(new Date());
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);

    if (activeListeners.notifHomework) activeListeners.notifHomework();

    activeListeners.notifHomework = onSnapshot(query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"),
        where("durum", "==", "devam")
    ), (snap) => {
        notifications = notifications.filter(n => n.type !== 'odev');
        let overdueCount = 0; // Tarihi geçmiş ödev sayısı

        snap.forEach(doc => {
            const d = doc.data();

            // Dashboard sayacı için tarihi geçmişleri say
            if (d.bitisTarihi < todayStr) {
                overdueCount++;
            }

            // Bildirim Listesi İçin Sınıflandırma
            if (d.bitisTarihi === todayStr) {
                notifications.push({ type: 'odev', title: 'Son Gün', desc: `Teslim tarihi bugün: ${d.title}`, badge: 'Acil', bg: 'bg-red-100 text-red-700', tab: 'tab-homework', date: d.bitisTarihi });
            } else if (d.bitisTarihi === tomorrowStr) {
                notifications.push({ type: 'odev', title: 'Yarın Teslim', desc: `Yarın teslim: ${d.title}`, badge: 'Yarın', bg: 'bg-orange-100 text-orange-700', tab: 'tab-homework', date: d.bitisTarihi });
            } else if (d.bitisTarihi > todayStr) {
                notifications.push({ type: 'odev', title: 'Ödev Eklendi', desc: `${d.title}`, badge: 'Ödev', bg: 'bg-blue-100 text-blue-700', tab: 'tab-homework', date: d.bitisTarihi });
            } else {
                // Tarihi geçmiş (Gecikmiş)
                notifications.push({ type: 'odev', title: 'Gecikmiş Ödev', desc: `${d.title}`, badge: 'Gecikti', bg: 'bg-red-200 text-red-800', tab: 'tab-homework', date: d.bitisTarihi });
            }
        });

        // Dashboard Kartındaki Sayıyı Güncelle (dashPendingOdev)
        if (dashOdevCount) {
            dashOdevCount.textContent = overdueCount;
        }

        render();
    });

    // --- 3. HEDEFLER (Sadece Bildirim Listesi) ---
    if (activeListeners.notifGoals) activeListeners.notifGoals();

    activeListeners.notifGoals = onSnapshot(query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"),
        where("durum", "==", "devam")
    ), (snap) => {
        notifications = notifications.filter(n => n.type !== 'hedef');
        snap.forEach(doc => {
            const d = doc.data();
            if (d.bitisTarihi === todayStr) {
                notifications.push({ type: 'hedef', title: 'Hedef Süresi', desc: `Bugün son gün: ${d.title}`, badge: 'Acil', bg: 'bg-red-100 text-red-700', tab: 'tab-goals', date: d.bitisTarihi });
            } else {
                notifications.push({ type: 'hedef', title: 'Yeni Hedef', desc: `${d.title}`, badge: 'Hedef', bg: 'bg-purple-100 text-purple-700', tab: 'tab-goals', date: d.bitisTarihi });
            }
        });
        render();
    });

    // --- 4. SEANSLAR (Sadece Bildirim Listesi) ---
    if (activeListeners.notifSession) activeListeners.notifSession();

    activeListeners.notifSession = onSnapshot(query(
        collection(db, "artifacts", appId, "users", coachId, "ajandam"),
        where("studentId", "==", studentDocId),
        where("tarih", ">=", todayStr)
    ), (snap) => {
        notifications = notifications.filter(n => n.type !== 'seans');
        snap.forEach(doc => {
            const d = doc.data();
            if (d.tarih === todayStr) {
                notifications.push({ type: 'seans', title: 'Bugünkü Seans', desc: `${d.baslik || 'Görüşme'} - Saat: ${d.baslangic}`, badge: 'Bugün', bg: 'bg-green-100 text-green-700', tab: 'tab-ajanda', date: d.tarih });
            } else {
                notifications.push({ type: 'seans', title: 'Planlandı', desc: `${formatDateTR(d.tarih)} tarihli seans.`, badge: 'Randevu', bg: 'bg-indigo-100 text-indigo-700', tab: 'tab-ajanda', date: d.tarih });
            }
        });
        render();
    });
}

// =================================================================
// DENEME EKLEME VE KAYDETME (DÜZELTİLMİŞ VERSİYON)
// =================================================================

// 1. Modalı Açma Fonksiyonu
window.openDenemeModal = function () {
    // Öğrencinin sınıf seviyesini belirle (Ortaokul mu Lise mi?)
    const profileClassElem = document.getElementById('profileClass');
    const profileClass = profileClassElem ? profileClassElem.textContent : '12. Sınıf'; // Varsayılan 12
    const isOrtaokul = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(profileClass);

    // Config'den uygun deneme türlerini al (TYT, AYT, LGS vb.)
    const types = CLASS_LEVEL_RULES[isOrtaokul ? 'ORTAOKUL' : 'LISE'].types;

    // Select kutusunu doldur
    const selectBox = document.getElementById('inpDenemeTur');
    selectBox.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');

    // İlk seçeneğe göre inputları oluştur
    renderDenemeInputs(types[0]);

    // Tarihi bugüne ayarla
    document.getElementById('inpDenemeTarih').value = new Date().toISOString().split('T')[0];

    // Değişiklik olunca inputları yeniden çiz (Listener burada eklenmeli)
    selectBox.onchange = (e) => renderDenemeInputs(e.target.value);

    // Modalı aç
    openModalWithBackHistory('modalDenemeEkle');
};

// 2. Inputları Oluşturan Fonksiyon
function renderDenemeInputs(tur) {
    const c = document.getElementById('denemeDersContainer');
    if (!c) return;
    c.innerHTML = ''; // Önce temizle

    const config = EXAM_CONFIG[tur];
    if (!config) return;

    if (tur === 'Diger') {
        // Analiz dışı manuel giriş
        c.innerHTML = `
            <div class="bg-orange-50 p-3 rounded-xl text-xs text-orange-700 mb-2 text-center">Analiz dışı deneme.</div>
            <div class="flex gap-2">
                <input type="number" id="inpDigerDogru" placeholder="Doğru" class="w-1/2 p-3 border rounded-xl text-center">
                <input type="number" id="inpDigerYanlis" placeholder="Yanlış" class="w-1/2 p-3 border rounded-xl text-center">
            </div>`;
    } else {
        // Ders bazlı giriş (TYT, AYT vb.)
        config.subjects.forEach(sub => {
            // KRİTİK DÜZELTME: data-ders="${sub.name}" özelliği eklendi.
            // Bu olmadan kaydederken hangi dersin neti olduğunu anlayamazsınız.
            c.innerHTML += `
            <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span class="text-sm font-bold text-gray-700 w-24 truncate">${sub.name}</span>
                <div class="flex gap-2">
                    <input type="number" data-ders="${sub.name}" placeholder="D" class="inp-deneme-d w-14 p-2 border border-green-200 rounded-lg text-center font-bold text-green-700 bg-green-50 focus:ring-2 focus:ring-green-500 outline-none">
                    <input type="number" placeholder="Y" class="inp-deneme-y w-14 p-2 border border-red-200 rounded-lg text-center font-bold text-red-700 bg-red-50 focus:ring-2 focus:ring-red-500 outline-none">
                </div>
            </div>`;
        });
    }
}

// 3. KAYDETME İŞLEMİ (GARANTİLİ YÖNTEM)
// HTML'de buton ID'si 'btnSaveDeneme' veya 'saveDenemeButton' olabilir. İkisini de kontrol ediyoruz.
const btnSave = document.getElementById('btnSaveDeneme') || document.getElementById('saveDenemeButton');

if (btnSave) {
    btnSave.onclick = async () => {
        // A) Validasyon
        const tur = document.getElementById('inpDenemeTur').value;
        const tarih = document.getElementById('inpDenemeTarih').value;
        const ad = document.getElementById('inpDenemeAd').value || `${tur} Denemesi`;

        if (!tarih) { alert('Lütfen tarih seçiniz.'); return; }

        // B) Butonu Kilitle
        btnSave.disabled = true;
        btnSave.textContent = "Kaydediliyor...";

        try {
            // C) Veri Hazırlığı
            let payload = {
                ad: ad,
                tur: tur,
                tarih: tarih,
                onayDurumu: 'bekliyor',
                kocId: coachId,
                studentId: studentDocId,
                // Öğrenci adı header'dan alınamazsa varsayılanı kullan
                studentAd: document.getElementById('headerStudentName')?.textContent || "Öğrenci",
                eklenmeTarihi: serverTimestamp()
            };

            const config = EXAM_CONFIG[tur];

            if (tur === 'Diger') {
                const d = parseInt(document.getElementById('inpDigerDogru')?.value) || 0;
                const y = parseInt(document.getElementById('inpDigerYanlis')?.value) || 0;

                const ratio = config?.wrongRatio || 4;
                const net = d - (y / ratio);

                payload.dogru = d;
                payload.yanlis = y;
                payload.soruSayisi = d + y;
                payload.toplamNet = net.toFixed(2);
                payload.analizHaric = true;
            } else {
                // Standart sınav hesaplama
                let totalNet = 0;
                let netler = {};
                let hasEntry = false;

                // Tüm doğru inputlarını gez
                document.querySelectorAll('.inp-deneme-d').forEach(inpDogru => {
                    const dersAdi = inpDogru.dataset.ders; // Veri özelliğinden ders adını al
                    const dogru = parseInt(inpDogru.value) || 0;
                    // Yanlış inputunu bul (Aynı satırdaki kardeşi)
                    const inpYanlis = inpDogru.parentElement.querySelector('.inp-deneme-y');
                    const yanlis = parseInt(inpYanlis.value) || 0;

                    if (dogru > 0 || yanlis > 0) {
                        hasEntry = true;
                        const ratio = config?.wrongRatio || 4;
                        const net = dogru - (yanlis / ratio);
                        totalNet += net;

                        // Objeye kaydet
                        netler[dersAdi] = {
                            d: dogru,
                            y: yanlis,
                            net: net.toFixed(2)
                        };
                    }
                });

                if (!hasEntry) {
                    throw new Error("Lütfen en az bir ders için doğru/yanlış giriniz.");
                }

                payload.toplamNet = totalNet.toFixed(2);
                payload.netler = netler;
                payload.analizHaric = false;
            }

            // D) Firestore'a Yaz
            await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), payload);

            // E) Başarı Durumu
            alert("Deneme başarıyla kaydedildi!");
            const modal = document.getElementById('modalDenemeEkle');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }


            // Eğer denemeler listesi açıksa yenile
            const denemeTab = document.getElementById('tab-denemeler');
            if (denemeTab && !denemeTab.classList.contains('hidden')) {
                loadDenemelerTab();
            }

        } catch (error) {
            console.error("Kayıt Hatası:", error);
            alert("Hata: " + error.message);
        } finally {
            // F) Butonu Aç
            btnSave.disabled = false;
            btnSave.textContent = "Kaydet";
        }
    };
}

window.openSoruModal = function () {
    document.getElementById('inpModalSoruTarih').value = getLocalDateString(new Date());
    const sel = document.getElementById('inpSoruDers');
    sel.innerHTML = '<option disabled selected>Ders Seç</option>';
    const optGroupRoutine = document.createElement('optgroup'); optGroupRoutine.label = "Rutinler";
    studentRutinler.forEach(r => { const o = document.createElement('option'); o.value = r; o.textContent = r; optGroupRoutine.appendChild(o); });
    sel.appendChild(optGroupRoutine);
    const optGroupLesson = document.createElement('optgroup'); optGroupLesson.label = "Dersler";
    studentDersler.forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = d; optGroupLesson.appendChild(o); });
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
function closeModalSmart(modalEl) {
    if (!modalEl) return;

    // Modal'ı kapat (garanti)
    modalEl.classList.add('hidden');
    modalEl.style.display = 'none';

    // Eğer bu modal history üzerinden açıldıysa geri al (popstate zaten açık modalı kapatıyor)
    // Ama history yoksa/uyumsuzsa sadece hide yeterli.
    const st = window.history.state || {};
    if (st && (st.modal === modalEl.id || st.modalId === modalEl.id)) {
        // Bu durumda back ile geri alalım; popstate handler kapatır.
        try { window.history.back(); } catch (e) { }
    }
}

// =================================================================
// GLOBAL MODAL KAPATMA SİSTEMİ (X, İPTAL, DIŞ TIKLAMA)
// =================================================================
function initGlobalModalCloseHandlers() {

    // X ve İptal butonları
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.history.back(); // 🔥 ASIL OLAY BU
        };
    });

    // Modal dışına tıklayınca kapat (mobil native hissi)
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                window.history.back();
            }
        };
    });
}

// Sayfa yüklenince bir kez çalıştır
document.addEventListener('DOMContentLoaded', initGlobalModalCloseHandlers);

// =================================================================
// GLOBAL AVATAR SEÇİM FONKSİYONU
// =================================================================
window.selectAvatar = async (icon) => {
    console.log("Avatar seçiliyor:", icon);

    // 1. Modalı hemen gizle
    const modal = document.getElementById('modalAvatarSelect');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none'; // Garanti olsun diye
    }

    // 2. Veritabanını güncelle
    try {
        await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId), { avatarIcon: icon });
    } catch (e) {
        console.error("Avatar kayıt hatası:", e);
    }

    // 3. Geçmişten (History) sil
    if (window.history.state && window.history.state.modal === 'modalAvatarSelect') {
        window.history.back();
    }

    // 4. Sayfayı yenile (Profil resmini güncellemek için)
    loadDashboardData();
};
