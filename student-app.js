// =================================================================
// 0. HATA YAKALAMA (Debug İçin)
// =================================================================
window.addEventListener('error', (e) => {
    const errorBox = document.getElementById('globalErrorDisplay');
    if(errorBox) {
        errorBox.classList.remove('hidden');
        errorBox.innerHTML += `<p>${e.message} (${e.filename}:${e.lineno})</p>`;
    }
    console.error("Global Hata:", e);
});

// =================================================================
// 1. FİREBASE KÜTÜPHANELERİ VE AYARLAR
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, getDocs, collection, query, where, addDoc, updateDoc, 
    serverTimestamp, orderBy, limit, deleteDoc, writeBatch, onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// Aktif dinleyicileri saklar (Sekme değişiminde kapatmak için)
let listeners = {
    chat: null,
    ajanda: null,
    hedefler: null,
    odevler: null,
    denemeler: null,
    upcomingAjanda: null,
    notifications: null,
    activeGoals: null,
    unreadMsg: null
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
            const pd = profileSnap.data();
            coachId = pd.kocId;
            studentDocId = pd.linkedDocId;
            
            if (coachId && studentDocId) {
                loadDashboardData(); 
                enableHeaderIcons(); // Header ikonlarını aktifleştir
            } else {
                document.getElementById('modalMatchProfile').classList.remove('hidden');
                document.getElementById('modalMatchProfile').style.display = 'flex';
            }
        } else {
            console.error("Profil ayarı bulunamadı.");
            signOut(auth);
        }
    } catch (error) { console.error(error); }
}

// Profil Eşleştirme Butonu
const btnMatch = document.getElementById('btnMatchProfile');
if (btnMatch) {
    btnMatch.addEventListener('click', async () => {
        const name = document.getElementById('matchName').value.trim();
        const surname = document.getElementById('matchSurname').value.trim();
        if (!name || !surname) return alert("Ad soyad giriniz.");

        try {
            const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim"), where("ad", "==", name), where("soyad", "==", surname));
            const snap = await getDocs(q);

            if (!snap.empty) {
                studentDocId = snap.docs[0].id;
                await updateDoc(doc(db, "artifacts", appId, "users", currentUser.uid, "settings", "profile"), { linkedDocId: studentDocId });
                document.getElementById('modalMatchProfile').classList.add('hidden');
                alert("Başarıyla eşleştiniz!");
                loadDashboardData();
                enableHeaderIcons();
            } else {
                document.getElementById('matchError').classList.remove('hidden');
            }
        } catch (error) { console.error(error); }
    });
}

// =================================================================
// 4. HEADER VE BİLDİRİMLER
// =================================================================
function enableHeaderIcons() {
    // Mesajlar İkonu
    const btnMsg = document.getElementById('btnHeaderMessages');
    if(btnMsg) {
        btnMsg.onclick = (e) => {
            e.preventDefault();
            // Mesajlar sekmesine geçiş yap
            const msgTabBtn = document.querySelector('.nav-btn[data-target="tab-messages"]');
            if (msgTabBtn) msgTabBtn.click();
        };
        listenUnreadMessages();
    }

    // Bildirimler İkonu
    const btnNotif = document.getElementById('btnHeaderNotifications');
    const dropNotif = document.getElementById('notificationDropdown');
    
    if(btnNotif && dropNotif) {
        btnNotif.onclick = (e) => {
            e.stopPropagation();
            dropNotif.classList.toggle('hidden');
            document.getElementById('headerNotificationDot').classList.add('hidden');
        };
        document.getElementById('btnCloseNotifications').onclick = () => dropNotif.classList.add('hidden');
        document.addEventListener('click', (e) => {
            if (!dropNotif.contains(e.target) && !btnNotif.contains(e.target)) dropNotif.classList.add('hidden');
        });
        loadNotifications();
    }
}

function loadNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;

    // Koçun son eklediği hedefleri bildirim olarak göster
    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"),
        orderBy("olusturmaTarihi", "desc"),
        limit(5)
    );

    if(listeners.notifications) listeners.notifications();
    listeners.notifications = onSnapshot(q, (snap) => {
        let html = '';
        if(snap.empty) html = '<p class="text-center text-gray-400 text-xs py-4">Bildirim yok.</p>';
        
        snap.forEach(doc => {
            const d = doc.data();
            html += `
            <div class="p-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <p class="text-xs font-semibold text-gray-800">Yeni Hedef: ${d.title}</p>
                <p class="text-[10px] text-gray-400">${d.olusturmaTarihi ? new Date(d.olusturmaTarihi.toDate()).toLocaleDateString() : ''}</p>
            </div>`;
        });
        list.innerHTML = html;
        if(!snap.empty) document.getElementById('headerNotificationDot').classList.remove('hidden');
    });
}

function listenUnreadMessages() {
     const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), 
        where("gonderen", "==", "koc"), 
        where("okundu", "==", false)
    );
     
     if(listeners.unreadMsg) listeners.unreadMsg();
     listeners.unreadMsg = onSnapshot(q, (snap) => {
         const badge = document.getElementById('headerUnreadMsgCount');
         if(snap.size > 0) { 
             badge.textContent = snap.size; 
             badge.classList.remove('hidden'); 
             badge.classList.add('animate-pulse');
         } else {
             badge.classList.add('hidden');
         }
     });
}

// =================================================================
// 5. DASHBOARD VE PROFİL VERİLERİ
// =================================================================

async function loadDashboardData() {
    if (!coachId || !studentDocId) return;

    // 1. Motivasyon Sözü
    const soz = motivasyonSozleri[Math.floor(Math.random() * motivasyonSozleri.length)];
    if(document.getElementById('motivasyonSozu')) document.getElementById('motivasyonSozu').textContent = `"${soz}"`;

    // 2. Profil Bilgileri
    const studentRef = doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId);
    const studentSnap = await getDoc(studentRef);
    
    if (studentSnap.exists()) {
        const data = studentSnap.data();
        
        // Header
        if(document.getElementById('headerStudentName')) document.getElementById('headerStudentName').textContent = data.ad;
        
        // Profil Sayfası
        if(document.getElementById('profileName')) document.getElementById('profileName').textContent = `${data.ad} ${data.soyad}`;
        if(document.getElementById('profileClass')) document.getElementById('profileClass').textContent = data.sinif;
        if(document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = currentUser.email;
        if(document.getElementById('profileCoachName')) document.getElementById('profileCoachName').textContent = "Koçunuz"; 

        // Avatar
        const initials = (data.ad[0] || '') + (data.soyad[0] || '');
        if(document.getElementById('profileAvatar')) document.getElementById('profileAvatar').textContent = initials.toUpperCase();
        
        // Dersleri belirle
        studentDersler = data.takipDersleri || (['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(data.sinif) ? DERS_HAVUZU['ORTAOKUL'] : DERS_HAVUZU['LISE']);
    }
    
    // 3. Alt Bileşenleri Yükle
    updateHomeworkMetrics();
    loadActiveGoalsForDashboard();
}

async function updateHomeworkMetrics() {
    const listEl = document.getElementById('gecikmisOdevlerList');
    if(!listEl) return;
    
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"));
    const snapshot = await getDocs(q); // Ana sayfa için one-time fetch yeterli olabilir veya listener eklenebilir

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek).toISOString().split('T')[0];
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - dayOfWeek)).toISOString().split('T')[0];
    
    let weeklyTotal = 0;
    let weeklyDone = 0;
    let overdueList = [];

    snapshot.forEach(doc => {
        const odev = doc.data();
        const isDone = odev.durum === 'tamamlandi';

        // Haftalık İlerleme
        if (odev.bitisTarihi >= startOfWeek && odev.bitisTarihi <= endOfWeek) {
            weeklyTotal++;
            if (isDone) weeklyDone++;
        }

        // Gecikmiş Ödevler
        if (odev.bitisTarihi < todayStr && !isDone) {
            overdueList.push({ id: doc.id, ...odev });
        }
    });

    // İlerleme Çubuğu
    const progressPercent = weeklyTotal === 0 ? 0 : (weeklyDone / weeklyTotal) * 100;
    if(document.getElementById('haftalikIlerlemeText')) document.getElementById('haftalikIlerlemeText').textContent = `${weeklyDone} / ${weeklyTotal}`;
    if(document.getElementById('haftalikIlerlemeBar')) document.getElementById('haftalikIlerlemeBar').style.width = `${progressPercent}%`;
    
    // Profil Sayfasındaki İlerleme Çubuğu (Varsa)
    if(document.getElementById('haftalikIlerlemeText2')) document.getElementById('haftalikIlerlemeText2').textContent = `${weeklyDone} / ${weeklyTotal}`;
    if(document.getElementById('haftalikIlerlemeBar2')) document.getElementById('haftalikIlerlemeBar2').style.width = `${progressPercent}%`;

    // Gecikmiş Listesi
    if (overdueList.length > 0) {
        listEl.innerHTML = overdueList.sort((a,b) => a.bitisTarihi.localeCompare(b.bitisTarihi)).map(odev => `
            <div class="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex items-start gap-3 mb-2">
                <div class="mt-1 text-xl text-red-500"><i class="fa-solid fa-circle-exclamation"></i></div>
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800 text-sm">${odev.title}</h4>
                    <p class="text-xs text-red-500 font-medium">${formatDateTR(odev.bitisTarihi)} (Gecikti)</p>
                </div>
            </div>`).join('');
    } else {
        listEl.innerHTML = `<p class="text-center text-gray-400 text-sm py-4 bg-white rounded-xl shadow-sm border border-gray-100">Gecikmiş ödevin yok! 🎉</p>`;
    }
}

function loadActiveGoalsForDashboard() {
    const listEl = document.getElementById('dashboardHedefList');
    if(!listEl) return;
    
    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"),
        where("durum", "!=", "tamamlandi"),
        orderBy("durum"), // İndeks gereksinimi için
        limit(3)
    );

    if(listeners.activeGoals) listeners.activeGoals();

    listeners.activeGoals = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            listEl.innerHTML = `<p class="text-center text-gray-400 text-sm py-4 bg-white rounded-xl shadow-sm border border-gray-100">Aktif hedefin yok.</p>`;
            return;
        }
        listEl.innerHTML = snapshot.docs.map(doc => {
            const hedef = doc.data();
            return `
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 mb-2">
                <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs"><i class="fa-solid fa-bullseye"></i></div>
                <div class="flex-1"><p class="text-sm font-medium text-gray-700">${hedef.title}</p></div>
            </div>`;
        }).join('');
    });
}


// =================================================================
// 6. TAB NAVİGASYONU (SADELEŞTİRİLMİŞ VE DİNAMİK)
// =================================================================

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const currentBtn = e.currentTarget.closest('.nav-btn');
        const targetId = currentBtn.dataset.target;
        
        // 1. Tüm butonların stilini sıfırla
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'text-indigo-600');
            b.classList.add('text-gray-400');
            const icon = b.querySelector('.bottom-nav-center-btn');
            if(icon) {
                // Orta butonu pasif yap (Beyaz zemin, Mor ikon)
                icon.classList.remove('bg-indigo-600', 'text-white');
                icon.classList.add('bg-white', 'text-indigo-600');
            }
        });
        
        // 2. Tıklanan butonu aktif yap
        currentBtn.classList.add('active', 'text-indigo-600');
        currentBtn.classList.remove('text-gray-400');
        
        // Eğer orta butonsa stilini değiştir (Mor zemin, Beyaz ikon)
        const centerIcon = currentBtn.querySelector('.bottom-nav-center-btn'); 
        if(centerIcon) {
            centerIcon.classList.remove('bg-white', 'text-indigo-600');
            centerIcon.classList.add('bg-indigo-600', 'text-white');
        }

        // 3. İçeriği Göster
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        // 4. Gereksiz Dinleyicileri Temizle (Bildirimler hariç)
        for(let key in listeners) { 
            if(listeners[key] && key !== 'notifications' && key !== 'activeGoals' && key !== 'unreadMsg') { 
                listeners[key](); listeners[key]=null; 
            } 
        }

        // 5. İlgili Veriyi Yükle
        if (targetId === 'tab-homework') loadHomeworksTab();
        else if (targetId === 'tab-messages') { markMessagesAsRead(); loadStudentMessages(); }
        else if (targetId === 'tab-tracking') { currentWeekOffset = 0; renderSoruTakibiGrid(); }
        else if (targetId === 'tab-ajanda') { currentCalDate = new Date(); loadCalendarDataAndDraw(currentCalDate); }
        else if (targetId === 'tab-goals') loadGoalsTab();
        else if (targetId === 'tab-denemeler') loadDenemelerTab();
        else if (targetId === 'tab-home') loadDashboardData();
    });
});


// =================================================================
// 7. SEKME İÇERİKLERİ VE FONKSİYONLARI
// =================================================================

// --- ÖDEVLER ---
async function loadHomeworksTab() {
    const listEl = document.getElementById('studentOdevList');
    if (!listEl) return;
    listEl.innerHTML = '<p class="text-center text-gray-400 py-4">Yükleniyor...</p>';
    
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"), orderBy("bitisTarihi"));
    
    if(listeners.odevler) listeners.odevler();
    listeners.odevler = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) { listEl.innerHTML = '<p class="text-center text-gray-400 py-4">Henüz ödev yok.</p>'; return; }
        
        const today = new Date().toISOString().split('T')[0];
        listEl.innerHTML = snapshot.docs.map(doc => {
            const d = doc.data();
            const isDone = d.durum === 'tamamlandi';
            const isLate = !isDone && d.bitisTarihi < today;
            const icon = isDone ? 'fa-solid fa-circle-check text-green-500' : (isLate ? 'fa-solid fa-circle-exclamation text-red-500' : 'fa-regular fa-circle text-gray-300');
            
            return `
            <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3 ${isDone ? 'opacity-60' : ''}">
                <button class="mt-1 text-xl transition-transform active:scale-95" onclick="toggleOdev('${doc.id}', '${d.durum}')">
                    <i class="${icon}"></i>
                </button>
                <div class="flex-1">
                    <h4 class="font-semibold text-sm ${isDone?'line-through text-gray-500':'text-gray-800'}">${d.title}</h4>
                    <p class="text-xs text-gray-500 mt-1">${d.aciklama || ''}</p>
                    <div class="flex justify-between mt-2 text-xs text-gray-400">
                        ${d.link ? `<a href="${d.link}" target="_blank" class="text-indigo-500 hover:underline">Link</a>` : '<span></span>'}
                        <span class="${isLate?'text-red-500 font-bold':''}">${formatDateTR(d.bitisTarihi)}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    });
}
window.toggleOdev = async (id, status) => {
    await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler", id), {
        durum: status === 'tamamlandi' ? 'devam' : 'tamamlandi'
    });
};

// --- HEDEFLER ---
function loadGoalsTab() {
    const listEl = document.getElementById('studentHedefList');
    if(!listEl) return;
    listEl.innerHTML = '<p class="text-center text-gray-400 py-4">Yükleniyor...</p>';

    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), orderBy("olusturmaTarihi", "desc"));
    
    if(listeners.hedefler) listeners.hedefler();
    listeners.hedefler = onSnapshot(q, (snap) => {
        if (snap.empty) { listEl.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Henüz hedef yok.</p>'; return; }
        listEl.innerHTML = snap.docs.map(doc => {
            const h = doc.data();
            const isDone = h.durum === 'tamamlandi';
            return `
            <div class="bg-white p-4 rounded-xl border ${isDone ? 'border-green-200 bg-green-50' : 'border-gray-100'} shadow-sm mb-2">
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full ${isDone?'bg-green-100 text-green-600':'bg-purple-100 text-purple-600'} flex items-center justify-center text-sm">
                        <i class="fa-solid ${isDone?'fa-check':'fa-bullseye'}"></i>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-sm ${isDone?'text-gray-500 line-through':''}">${h.title}</h4>
                        <p class="text-xs text-gray-500 mt-1">${h.aciklama || ''}</p>
                        <p class="text-[10px] text-gray-400 mt-2 text-right">Bitiş: ${formatDateTR(h.bitisTarihi)}</p>
                    </div>
                </div>
            </div>`;
        }).join('');
    });
}

// --- DENEMELER ---
async function loadDenemelerTab() {
    const listEl = document.getElementById('studentDenemeList');
    if (!listEl) return;
    listEl.innerHTML = '<p class="text-center text-gray-400 py-4">Yükleniyor...</p>';

    const btnAdd = document.getElementById('btnAddNewDeneme');
    if(btnAdd) {
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.addEventListener('click', openDenemeModal);
    }

    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), orderBy("tarih", "desc"));

    if(listeners.denemeler) listeners.denemeler();
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
            let detailsHtml = d.netler ? 
                `<div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
                    ${Object.entries(d.netler).map(([ders, stats]) => `
                        <div class="flex justify-between bg-gray-50 p-2 rounded">
                            <span class="truncate mr-1 font-medium">${ders}</span>
                            <span class="font-bold text-indigo-600">${stats.net} N</span>
                        </div>
                    `).join('')}
                </div>` : '<p class="text-xs text-gray-400 mt-2 text-center">Detay yok.</p>';

            return `
                <div class="bg-white p-4 rounded-xl border ${isPending ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'} shadow-sm transition-all mb-3 cursor-pointer group" onclick="this.querySelector('.deneme-details').classList.toggle('hidden')">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-bold text-gray-800 text-sm truncate pr-2">${d.ad}</h4>
                        <span class="text-[10px] px-2 py-1 rounded-full font-medium ${isPending ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-800'}">
                            ${isPending ? 'Bekliyor' : 'Onaylı'}
                        </span>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500 items-end">
                        <div><span class="bg-gray-100 px-1.5 py-0.5 rounded">${d.tur}</span> <span class="ml-1">${formatDateTR(d.tarih)}</span></div>
                        <span class="font-bold text-indigo-600 text-lg">${net.toFixed(2)} Net</span>
                    </div>
                    <div class="deneme-details hidden animate-fade-in">${detailsHtml}</div>
                </div>
            `;
        }).join('');
    });
}
function calculateDenemeStats(d) {
    const onayli = d.filter(x => x.onayDurumu === 'onaylandi');
    let max = 0, total = 0; onayli.forEach(x => { const n = parseFloat(x.toplamNet); total += n; if(n > max) max = n; });
    const avg = onayli.length ? (total/onayli.length) : 0;
    if(document.getElementById('studentKpiAvg')) document.getElementById('studentKpiAvg').textContent = avg.toFixed(2);
    if(document.getElementById('studentKpiMax')) document.getElementById('studentKpiMax').textContent = max.toFixed(2);
    if(document.getElementById('studentKpiTotal')) document.getElementById('studentKpiTotal').textContent = d.length;
    renderStudentDenemeChart(onayli);
}
function renderStudentDenemeChart(data) {
    const ctx = document.getElementById('studentDenemeChart'); if(!ctx) return;
    const sorted = data.sort((a,b) => a.tarih.localeCompare(b.tarih)).slice(-10);
    if (denemeChartInstance) denemeChartInstance.destroy();
    denemeChartInstance = new Chart(ctx, { type: 'line', data: { labels: sorted.map(d => formatDateTR(d.tarih).slice(0,5)), datasets: [{ label: 'Net', data: sorted.map(d => d.toplamNet), borderColor: '#7c3aed', tension: 0.4, fill: true, backgroundColor: 'rgba(124, 58, 237, 0.1)' }] }, options: { plugins: { legend: { display: false } }, scales: { x: { display: false } }, responsive: true, maintainAspectRatio: false } });
}

// --- SORU TAKİBİ (AKORDİYON) ---
async function renderSoruTakibiGrid() {
    const container = document.getElementById('weeklyAccordion');
    if(!container) return;
    if(!coachId || !studentDocId) { container.innerHTML='<p class="p-4 text-center text-red-500">Hata.</p>'; return; }
    container.innerHTML = '<p class="p-4 text-center text-gray-400">Yükleniyor...</p>';
    
    const dates = getWeekDates(currentWeekOffset);
    document.getElementById('weekRangeTitle').textContent = `${formatDateTR(dates[0].dateStr)} - ${formatDateTR(dates[6].dateStr)}`;
    const prevBtn = document.getElementById('prevWeekBtn');
    const nextBtn = document.getElementById('nextWeekBtn');
    if(prevBtn) prevBtn.onclick = () => { currentWeekOffset--; renderSoruTakibiGrid(); };
    if(nextBtn) { nextBtn.onclick = () => { currentWeekOffset++; renderSoruTakibiGrid(); }; nextBtn.disabled = currentWeekOffset >= 0; }
    
    const weekData = await loadWeekSoruData(dates[0].dateStr, dates[6].dateStr);
    let html = '';
    
    dates.forEach(day => {
        const dayData = weekData.filter(d => d.tarih === day.dateStr);
        const isExpanded = day.isToday;
        html += `
        <div class="accordion-item border-b border-gray-100 last:border-0">
            <button class="accordion-header w-full flex justify-between items-center p-4 rounded-xl border mb-2 text-left ${isExpanded ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-200'}" onclick="toggleAccordion(this)" aria-expanded="${isExpanded}">
                <span class="font-bold text-lg">${day.dayNum} ${day.dayName}</span><i class="fa-solid fa-chevron-down transition-transform ${isExpanded ? 'rotate-180' : ''}"></i>
            </button>
            <div class="accordion-content ${isExpanded ? '' : 'hidden'} px-1 pb-4">
                <div class="grid grid-cols-2 gap-3 mb-4">
                    ${studentDersler.map(ders => {
                        const r = dayData.find(d => d.ders === ders);
                        return `<div class="subject-card"><label class="block text-xs font-semibold text-gray-500 mb-1 uppercase text-center truncate w-full">${ders}</label><input type="number" class="text-3xl font-bold text-center text-gray-800 w-full outline-none bg-transparent placeholder-gray-200" placeholder="0" value="${r?r.adet:''}" data-tarih="${day.dateStr}" data-ders="${ders}" data-doc-id="${r?r.id:''}" onblur="saveInput(this)"></div>`;
                    }).join('')}
                </div>
                <div class="text-left">
                    <button class="routine-btn" onclick="toggleRoutines(this)"><i class="fa-solid fa-list-check mr-2"></i> Rutinler</button>
                    <div class="hidden mt-3 grid grid-cols-2 gap-3 p-3 bg-gray-100 rounded-xl border border-gray-200">
                         ${studentRutinler.map(rutin => {
                            const r = dayData.find(d => d.ders === rutin);
                            return `<div class="subject-card bg-white"><label class="block text-xs font-semibold text-gray-500 mb-1 uppercase text-center">${rutin}</label><input type="number" class="text-2xl font-bold text-center text-gray-800 w-full outline-none placeholder-gray-200" placeholder="0" value="${r?r.adet:''}" data-tarih="${day.dateStr}" data-ders="${rutin}" data-doc-id="${r?r.id:''}" onblur="saveInput(this)"></div>`;
                         }).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// --- MESAJLAR ---
function loadStudentMessages() {
    const container = document.getElementById('studentMessagesContainer'); if(!container) return;
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), orderBy("tarih"));
    if(listeners.chat) listeners.chat();
    listeners.chat = onSnapshot(q, (snap) => {
        container.innerHTML = '';
        snap.forEach(doc => {
            const m = doc.data(); const isMe = m.gonderen === 'ogrenci';
            container.innerHTML += `<div class="flex w-full ${isMe ? 'justify-end' : 'justify-start'}"><div class="max-w-[80%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-white border'}"><p>${m.text}</p><p class="text-[9px] opacity-70 text-right mt-1">${m.tarih?.toDate().toLocaleTimeString().slice(0,5)}</p></div></div>`;
        });
        container.scrollTop = container.scrollHeight;
    });
}
const chatForm = document.getElementById('studentChatForm');
if(chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const input = document.getElementById('studentMessageInput'); if(!input.value.trim()) return;
        await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), { text: input.value, gonderen: 'ogrenci', tarih: serverTimestamp(), okundu: false, kocId: coachId });
        input.value = '';
    });
}
async function markMessagesAsRead() {
    const batch = writeBatch(db);
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), where("gonderen", "==", "koc"), where("okundu", "==", false));
    const snap = await getDocs(q);
    snap.forEach(doc => batch.update(doc.ref, { okundu: true }));
    await batch.commit();
}

// --- AJANDA ---
function loadCalendarDataAndDraw(date) {
    const m = date.getMonth(), y = date.getFullYear();
    document.getElementById('currentMonthYear').textContent = date.toLocaleString('tr-TR', {month:'long', year:'numeric'});
    const s = new Date(y, m, 1).toISOString().split('T')[0];
    const e = new Date(y, m+1, 0).toISOString().split('T')[0];
    
    if(listeners.ajanda) listeners.ajanda();
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ajandam"), where("studentId", "==", studentDocId), where("tarih", ">=", s), where("tarih", "<=", e));
    listeners.ajanda = onSnapshot(q, (snap) => {
        const appts = []; snap.forEach(d => appts.push({id:d.id, ...d.data()}));
        drawCalendarGrid(y, m, appts);
        renderUpcomingAppointments(appts);
    });
}
function drawCalendarGrid(y, m, appts) {
    const grid = document.getElementById('calendarGrid'); if(!grid) return; grid.innerHTML = '';
    const days = new Date(y, m+1, 0).getDate();
    const start = new Date(y, m, 1).getDay();
    const offset = start === 0 ? 6 : start - 1;
    const today = new Date().toISOString().split('T')[0];
    
    for(let i=0; i<offset; i++) grid.innerHTML += `<div class="bg-gray-50 min-h-[80px]"></div>`;
    for(let d=1; d<=days; d++) {
        const dateStr = `${y}-${(m+1).toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
        const dayAppts = appts.filter(a => a.tarih === dateStr);
        const isToday = dateStr === today;
        let dots = `<div class="flex flex-wrap gap-1 mt-1 px-1">`; dayAppts.forEach(a => dots += `<div class="h-1.5 w-1.5 rounded-full ${a.durum==='tamamlandi'?'bg-green-500':'bg-blue-500'}"></div>`); dots += `</div>`;
        const el = document.createElement('div'); el.className = `bg-white min-h-[80px] p-1 border border-gray-100 relative`;
        el.innerHTML = `<div class="flex justify-between"><span class="text-sm font-medium ${isToday?'bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center':'text-gray-700'}">${d}</span></div>${dots}`;
        if(dayAppts.length) el.onclick = () => alert(`📅 ${formatDateTR(dateStr)}\n\n${dayAppts.map(a=>`⏰ ${a.baslangic}: ${a.baslik}`).join('\n')}`);
        grid.appendChild(el);
    }
}
function renderUpcomingAppointments(appts) {
    const list = document.getElementById('appointmentListContainer'); if(!list) return;
    const today = new Date().toISOString().split('T')[0];
    const up = appts.filter(a => a.tarih >= today && a.durum !== 'tamamlandi').sort((a,b) => a.tarih.localeCompare(b.tarih));
    if(up.length===0) { list.innerHTML='<p class="text-center text-gray-400 text-xs py-2">Randevu yok.</p>'; return; }
    list.innerHTML = up.map(a => `<div class="p-3 bg-white border-l-4 border-indigo-500 rounded shadow-sm mb-2"><div class="flex justify-between"><span class="font-bold text-gray-800 text-sm">${formatDateTR(a.tarih)}</span><span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">${a.baslangic}</span></div><p class="text-xs text-gray-600 mt-1">${a.baslik}</p></div>`).join('');
}

// =================================================================
// 8. HELPER FONKSİYONLAR VE MODALLAR
// =================================================================

// Helperlar
window.toggleAccordion = (btn) => {
    const content = btn.nextElementSibling; const icon = btn.querySelector('i'); const isEx = btn.getAttribute('aria-expanded')==='true';
    if(isEx) { content.classList.add('hidden'); btn.setAttribute('aria-expanded','false'); icon.classList.remove('rotate-180'); btn.classList.replace('bg-purple-50','bg-white'); btn.classList.replace('text-purple-700','text-gray-800'); }
    else { content.classList.remove('hidden'); btn.setAttribute('aria-expanded','true'); icon.classList.add('rotate-180'); btn.classList.replace('bg-white','bg-purple-50'); btn.classList.replace('text-gray-800','text-purple-700'); }
};
window.toggleRoutines = (btn) => btn.nextElementSibling.classList.toggle('hidden');
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
function showToast(msg, isError) {
    const t = document.getElementById('toast'); if(!t) return; t.textContent = msg;
    t.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-sm z-50 transition-opacity duration-300 ${isError?'bg-red-600 text-white':'bg-gray-800 text-white'}`;
    t.classList.remove('hidden','opacity-0'); setTimeout(()=>t.classList.add('hidden'), 2000);
}
function formatDateTR(d) { if(!d) return ''; const [y,m,da] = d.split('-'); return `${da}.${m}.${y}`; }

// Modallar
document.querySelectorAll('.close-modal').forEach(b => b.onclick=()=>b.closest('.fixed').classList.add('hidden'));
const openDenemeModal = () => { document.getElementById('modalDenemeEkle').classList.remove('hidden'); renderDenemeInputs('TYT'); document.getElementById('inpDenemeTarih').value=new Date().toISOString().split('T')[0]; };
if(document.getElementById('btnOpenDenemeEkle')) document.getElementById('btnOpenDenemeEkle').onclick=openDenemeModal;
function renderDenemeInputs(tur) {
    const c = document.getElementById('denemeDersContainer'); if(!c) return; c.innerHTML='';
    (SINAV_DERSLERI[tur]||SINAV_DERSLERI['Diger']).forEach(d => c.innerHTML+=`<div class="flex justify-between text-sm py-2 border-b"><span class="w-24 truncate">${d}</span><div class="flex gap-2"><input type="number" placeholder="D" class="inp-deneme-d w-12 p-1 border rounded text-center" data-ders="${d}"><input type="number" placeholder="Y" class="inp-deneme-y w-12 p-1 border rounded text-center" data-ders="${d}"><input type="number" placeholder="B" class="inp-deneme-b w-12 p-1 border rounded text-center" data-ders="${d}"></div></div>`);
}
document.getElementById('inpDenemeTur').onchange=(e)=>renderDenemeInputs(e.target.value);
document.getElementById('btnSaveDeneme').onclick = async () => {
    const ad = document.getElementById('inpDenemeAd').value||"Deneme", tur = document.getElementById('inpDenemeTur').value, tarih = document.getElementById('inpDenemeTarih').value;
    if(!tarih) { showToast('Tarih seçin', true); return; }
    let total=0, netler={}, k=tur==='LGS'?3:4;
    document.querySelectorAll('.inp-deneme-d').forEach(i => {
        const d=parseInt(i.value)||0, y=parseInt(i.parentElement.querySelector('.inp-deneme-y').value)||0;
        const n = d-(y/k); total+=n; netler[i.dataset.ders]={d,y,net:n.toFixed(2)};
    });
    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), {ad,tur,tarih,toplamNet:total,netler,onayDurumu:'bekliyor',kocId:coachId,studentId:studentDocId,studentAd:document.getElementById('headerStudentName').textContent,eklenmeTarihi:serverTimestamp()});
    document.getElementById('modalDenemeEkle').classList.add('hidden'); showToast(`Kaydedildi: ${total.toFixed(2)} Net`);
};

const modalSoru = document.getElementById('modalSoruEkle');
document.getElementById('btnOpenSoruEkle').onclick = () => { document.getElementById('inpSoruDers').value=""; document.getElementById('inpSoruAdet').value=""; document.getElementById('inpModalSoruTarih').value=new Date().toISOString().split('T')[0]; modalSoru.classList.remove('hidden'); };
document.getElementById('btnSaveModalSoru').onclick = async () => {
    const d=document.getElementById('inpSoruDers').value, a=parseInt(document.getElementById('inpSoruAdet').value), t=document.getElementById('inpModalSoruTarih').value;
    if(d&&a) { await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), {tarih:t,ders:d,adet:a,konu:'Hızlı',onayDurumu:'bekliyor',kocId:coachId,eklenmeTarihi:serverTimestamp()}); modalSoru.classList.add('hidden'); showToast('Kaydedildi'); }
};

// Profil
const btnMatch = document.getElementById('btnMatchProfile');
if(btnMatch) {
    btnMatch.onclick = async () => {
        const n = document.getElementById('matchName').value.trim(), s = document.getElementById('matchSurname').value.trim();
        if(!n||!s) return;
        const snap = await getDocs(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim"), where("ad", "==", n), where("soyad", "==", s)));
        if(!snap.empty) {
            studentDocId = snap.docs[0].id;
            await updateDoc(doc(db, "artifacts", appId, "users", currentUser.uid, "settings", "profile"), {linkedDocId:studentDocId});
            document.getElementById('modalMatchProfile').classList.add('hidden'); loadDashboardData();
        } else document.getElementById('matchError').classList.remove('hidden');
    };
}

document.getElementById('btnLogout').onclick = () => signOut(auth);
