// =================================================================
// 0. HATA YAKALAMA (Tablette Debug İçin)
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
// 1. FİREBASE KÜTÜPHANELERİ VE KONFİGÜRASYON
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

// Dinleyicileri saklamak için obje
let listeners = {
    chat: null,
    ajanda: null,
    hedefler: null,
    odevler: null,
    denemeler: null,
    upcomingAjanda: null,
    notifications: null,
    activeGoals: null
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
                enableHeaderIcons(); // Bildirim ve Mesaj İkonlarını Aktifleştir
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

// --- PROFİL EŞLEŞTİRME BUTONU ---
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
                
                // Sayfayı yenilemeye gerek kalmadan yükle
                loadDashboardData(); 
                enableHeaderIcons();

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
// 4. HEADER: BİLDİRİMLER VE MESAJLAR
// =================================================================

function enableHeaderIcons() {
    // 1. MESAJLAR İKONU
    const btnMsg = document.getElementById('btnHeaderMessages');
    if(btnMsg) {
        btnMsg.onclick = (e) => {
            e.preventDefault();
            
            // Manuel Sayfa Değişimi (Nav butonuna ihtiyaç duymadan)
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            const msgTab = document.getElementById('tab-messages');
            if(msgTab) msgTab.classList.remove('hidden');
            
            // Alt menüdeki aktiflikleri kaldır
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('active', 'text-indigo-600');
                b.classList.add('text-gray-400');
                const centerIcon = b.querySelector('.bottom-nav-center-btn');
                if(centerIcon) {
                    centerIcon.classList.replace('bg-indigo-600', 'bg-white');
                    centerIcon.classList.remove('text-white');
                }
            });

            // Dinleyicileri temizle ve mesajları yükle
            for(let k in listeners) { if(listeners[k] && k!=='notifications') { listeners[k](); listeners[k]=null; } }
            markMessagesAsRead();
            loadStudentMessages();
        };
        listenUnreadMessages();
    }

    // Bildirim İkonu
    const btnNotif = document.getElementById('btnHeaderNotifications');
    const dropNotif = document.getElementById('notificationDropdown');
    
    if(btnNotif && dropNotif) {
        btnNotif.onclick = (e) => {
            e.stopPropagation();
            dropNotif.classList.toggle('hidden');
            document.getElementById('headerNotificationDot').classList.add('hidden');
        };
        
        const closeBtn = document.getElementById('btnCloseNotifications');
        if(closeBtn) closeBtn.onclick = () => dropNotif.classList.add('hidden');
        
        document.addEventListener('click', (e) => {
            if (!dropNotif.contains(e.target) && !btnNotif.contains(e.target)) {
                dropNotif.classList.add('hidden');
            }
        });
        
        loadNotifications();
    }
}

function loadNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;

    // Son 5 hedefi bildirim olarak göster (Örnek)
    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"),
        orderBy("olusturmaTarihi", "desc"),
        limit(5)
    );

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
     const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), where("gonderen", "==", "koc"), where("okundu", "==", false));
     onSnapshot(q, (snap) => {
         const badge = document.getElementById('headerUnreadMsgCount');
         if(snap.size > 0) { badge.textContent = snap.size; badge.classList.remove('hidden'); }
         else badge.classList.add('hidden');
     });
}


// =================================================================
// 5. DASHBOARD VE PROFİL YÖNETİMİ
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
        
        const initials = (data.ad[0] || '') + (data.soyad[0] || '');
        if(document.getElementById('profileAvatar')) document.getElementById('profileAvatar').textContent = initials.toUpperCase();
        
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

        if (odev.bitisTarihi >= startOfWeek && odev.bitisTarihi <= endOfWeek) {
            weeklyTotal++;
            if (isDone) weeklyDone++;
        }

        if (odev.bitisTarihi < todayStr && !isDone) {
            overdueList.push({ id: doc.id, ...odev });
        }
    });

    const progressPercent = weeklyTotal === 0 ? 0 : (weeklyDone / weeklyTotal) * 100;
    const hText = document.getElementById('haftalikIlerlemeText');
    const hBar = document.getElementById('haftalikIlerlemeBar');
    if(hText) hText.textContent = `${weeklyDone} / ${weeklyTotal}`;
    if(hBar) hBar.style.width = `${progressPercent}%`;
    
    // Profil sekmesindeki progress bar için
    const hText2 = document.getElementById('haftalikIlerlemeText2');
    const hBar2 = document.getElementById('haftalikIlerlemeBar2');
    if(hText2) hText2.textContent = `${weeklyDone} / ${weeklyTotal}`;
    if(hBar2) hBar2.style.width = `${progressPercent}%`;

    if (overdueList.length > 0) {
        listEl.innerHTML = overdueList.sort((a,b) => a.bitisTarihi.localeCompare(b.bitisTarihi)).map(odev => `
            <div class="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex items-start gap-3">
                <div class="mt-1 text-xl text-red-500"><i class="fa-solid fa-circle-exclamation"></i></div>
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800 text-sm">${odev.title}</h4>
                    <p class="text-xs text-red-500 font-medium">${formatDateTR(odev.bitisTarihi)} (Gecikti)</p>
                </div>
            </div>
        `).join('');
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
        orderBy("durum"),
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
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs"><i class="fa-solid fa-bullseye"></i></div>
                <div class="flex-1"><p class="text-sm font-medium text-gray-700">${hedef.title}</p></div>
            </div>`;
        }).join('');
    });
}


// =================================================================
// 6. TAB NAVİGASYONU
// =================================================================

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const currentBtn = e.currentTarget.closest('.nav-btn');
        const targetId = currentBtn.dataset.target;
        
        // Stil Güncelleme
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'text-indigo-600');
            b.classList.add('text-gray-400');
            const icon = b.querySelector('.bottom-nav-center-btn');
            if(icon) { icon.classList.remove('bg-indigo-600', 'text-white'); icon.classList.add('bg-white', 'text-indigo-600'); }
        });
        
        currentBtn.classList.add('active', 'text-indigo-600');
        currentBtn.classList.remove('text-gray-400');
        const centerIcon = currentBtn.querySelector('.bottom-nav-center-btn'); 
        if(centerIcon) { centerIcon.classList.replace('bg-white', 'bg-indigo-600'); centerIcon.classList.add('text-white'); }

        // Sekme Değişimi
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        // Dinleyicileri Temizle
        for(let key in listeners) { 
            if(listeners[key] && key !== 'notifications' && key !== 'activeGoals') { 
                listeners[key](); listeners[key]=null; 
            } 
        }

        // İlgili Fonksiyonu Çağır
        if (targetId === 'tab-homework') loadHomeworksTab();
        else if (targetId === 'tab-messages') { markMessagesAsRead(); loadStudentMessages(); }
        else if (targetId === 'tab-tracking') { currentWeekOffset = 0; renderSoruTakibiGrid(); }
        else if (targetId === 'tab-ajanda') { currentCalDate = new Date(); loadCalendarDataAndDraw(currentCalDate); }
        else if (targetId === 'tab-goals') loadGoalsTab();
        else if (targetId === 'tab-denemeler') loadDenemelerTab();
        else if (targetId === 'tab-home') { loadDashboardData(); }
    });
});


// =================================================================
// 7. SEKMELERİN İÇERİĞİ (ÖDEV, HEDEF, DENEME, AJANDA, SORU, MESAJ)
// =================================================================

// --- ÖDEVLER ---
async function loadHomeworksTab() {
    const listEl = document.getElementById('studentOdevList');
    if (!listEl) return;
    listEl.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Yükleniyor...</p>';
    
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"), orderBy("bitisTarihi"));
    
    if(listeners.odevler) listeners.odevler();
    
    listeners.odevler = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) { listEl.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Ödev yok.</p>'; return; }

        const todayStr = new Date().toISOString().split('T')[0];
        listEl.innerHTML = snapshot.docs.map(doc => {
            const d = doc.data();
            const isDone = d.durum === 'tamamlandi';
            const isLate = !isDone && d.bitisTarihi < todayStr;
            const icon = isDone ? 'fa-solid fa-circle-check text-green-500' : (isLate ? 'fa-regular fa-circle text-red-500' : 'fa-regular fa-circle text-gray-300');
            
            return `
            <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3 ${isDone ? 'opacity-50' : ''}">
                <button class="mt-1 text-xl" onclick="toggleOdev('${doc.id}', '${d.durum}')"><i class="${icon}"></i></button>
                <div class="flex-1">
                    <h4 class="font-semibold text-sm ${isDone?'line-through':''}">${d.title}</h4>
                    <p class="text-xs text-gray-500 mt-1">${d.aciklama || ''}</p>
                    <div class="flex justify-between mt-2 text-xs text-gray-400">
                        ${d.link ? `<a href="${d.link}" target="_blank" class="text-indigo-500">Link</a>` : '<span></span>'}
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
    // Liste listener sayesinde otomatik güncellenir
};

// --- HEDEFLER ---
function loadGoalsTab() {
    const listEl = document.getElementById('studentHedefList');
    if(!listEl) return;
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), orderBy("olusturmaTarihi", "desc"));
    
    if(listeners.hedefler) listeners.hedefler();

    listeners.hedefler = onSnapshot(q, (snap) => {
        if (snap.empty) { listEl.innerHTML = '<p class="text-center text-gray-400 text-sm">Hedef yok.</p>'; return; }
        listEl.innerHTML = snap.docs.map(doc => {
            const h = doc.data();
            const isDone = h.durum === 'tamamlandi';
            return `
            <div class="bg-white p-4 rounded-xl border ${isDone ? 'border-green-200 bg-green-50' : 'border-gray-100'}">
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full ${isDone?'bg-green-100 text-green-600':'bg-purple-100 text-purple-600'} flex items-center justify-center text-sm">
                        <i class="fa-solid ${isDone?'fa-star':'fa-bullseye'}"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-sm ${isDone?'text-gray-500 line-through':''}">${h.title}</h4>
                        <p class="text-xs text-gray-500">${h.aciklama || ''}</p>
                        <p class="text-[10px] text-gray-400 mt-1">Bitiş: ${formatDateTR(h.bitisTarihi)}</p>
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

    if(!coachId || !studentDocId) {
        listEl.innerHTML = '<p class="text-center text-red-500 py-4">Profil hatası. Lütfen yenileyin.</p>';
        return;
    }

    // Ekle Butonu
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
            
            let detailsHtml = '';
            if (d.netler) {
                detailsHtml = `<div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">`;
                for (const [ders, stats] of Object.entries(d.netler)) {
                    detailsHtml += `
                        <div class="flex justify-between bg-gray-50 p-2 rounded">
                            <span class="font-medium truncate mr-1">${ders}</span>
                            <span class="font-bold text-indigo-600">${stats.net} N</span>
                        </div>`;
                }
                detailsHtml += `</div>`;
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

// --- AJANDA ---
function loadCalendarDataAndDraw(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

    document.getElementById('currentMonthYear').textContent = date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

    if (listeners.ajanda) listeners.ajanda();

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
    }, (error) => console.error("Takvim hatası:", error));
}

function drawCalendarGrid(year, month, appointments) {
    const grid = document.getElementById('calendarGrid'); if (!grid) return; grid.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const offset = firstDay === 0 ? 6 : firstDay - 1; const todayStr = new Date().toISOString().split('T')[0];
    for (let i = 0; i < offset; i++) grid.innerHTML += `<div class="bg-gray-50 min-h-[80px]"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayAppts = appointments.filter(a => a.tarih === dateStr);
        const isToday = dateStr === todayStr;
        let dotsHtml = `<div class="flex flex-wrap gap-1 mt-1 px-1">`; dayAppts.forEach(a => { const color = a.durum === 'tamamlandi' ? 'bg-green-500' : (a.tarih < todayStr ? 'bg-red-400' : 'bg-blue-500'); dotsHtml += `<div class="h-2 w-2 rounded-full ${color}"></div>`; }); dotsHtml += `</div>`;
        const dayEl = document.createElement('div');
        dayEl.className = `bg-white min-h-[80px] p-1 border border-gray-100`;
        dayEl.innerHTML = `<div class="flex justify-between items-start"><span class="text-sm font-medium ${isToday ? 'bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-700'}">${day}</span></div>${dotsHtml}`;
        if (dayAppts.length > 0) dayEl.onclick = () => alert(`📅 ${formatDateTR(dateStr)}\n\n${dayAppts.map(a => `⏰ ${a.baslangic}: ${a.baslik}`).join('\n')}`);
        grid.appendChild(dayEl);
    }
}

function renderUpcomingAppointments(appointments) {
    const listEl = document.getElementById('appointmentListContainer'); if(!listEl) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = appointments.filter(a => a.tarih >= todayStr && a.durum !== 'tamamlandi').sort((a,b) => a.tarih.localeCompare(b.tarih));
    if (upcoming.length === 0) { listEl.innerHTML = '<p class="text-center text-gray-400 text-xs py-2">Yaklaşan randevu yok.</p>'; return; }
    listEl.innerHTML = upcoming.map(a => `<div class="p-3 bg-white border-l-4 border-indigo-500 rounded shadow-sm mb-2"><div class="flex justify-between"><span class="font-bold text-gray-800 text-sm">${formatDateTR(a.tarih)}</span><span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">${a.baslangic}</span></div><p class="text-xs text-gray-600 mt-1">${a.baslik}</p></div>`).join('');
}

// --- MESAJLAR ---
function loadStudentMessages() {
    if (listeners.chat) return;
    const container = document.getElementById('studentMessagesContainer'); if(!container) return;
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), orderBy("tarih"));
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

// --- SORU TAKİBİ (AKORDİYON) ---
async function renderSoruTakibiGrid() {
    const container = document.getElementById('weeklyAccordion');
    if(!container) return;
    if(!coachId || !studentDocId) { container.innerHTML='<p class="p-4 text-center">Profil hatası.</p>'; return; }
    
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

// --- MODAL VE KAYIT İŞLEMLERİ ---

// Deneme Modal
const openDenemeModal = () => {
    document.getElementById('modalDenemeEkle').classList.remove('hidden');
    renderDenemeInputs('TYT');
    document.getElementById('inpDenemeTarih').value = new Date().toISOString().split('T')[0];
};
const btnDeneme1 = document.getElementById('btnOpenDenemeEkle'); 
if(btnDeneme1) btnDeneme1.onclick = openDenemeModal;

function renderDenemeInputs(tur) {
    const container = document.getElementById('denemeDersContainer');
    if(!container) return;
    container.innerHTML = '';
    const dersler = SINAV_DERSLERI[tur] || SINAV_DERSLERI['Diger'];
    dersler.forEach(ders => {
        container.innerHTML += `<div class="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"><span class="text-gray-700 w-24 truncate font-medium">${ders}</span><div class="flex gap-2"><input type="number" placeholder="D" class="inp-deneme-d w-12 p-2 bg-green-50 border border-green-100 rounded text-center text-sm outline-none" data-ders="${ders}"><input type="number" placeholder="Y" class="inp-deneme-y w-12 p-2 bg-red-50 border border-red-100 rounded text-center text-sm outline-none" data-ders="${ders}"><input type="number" placeholder="B" class="inp-deneme-b w-12 p-2 bg-gray-50 border border-gray-200 rounded text-center text-sm outline-none" data-ders="${ders}"></div></div>`;
    });
}
document.getElementById('inpDenemeTur').onchange = (e) => renderDenemeInputs(e.target.value);
document.getElementById('btnSaveDeneme').onclick = async () => {
    const ad = document.getElementById('inpDenemeAd').value || "Deneme";
    const tur = document.getElementById('inpDenemeTur').value;
    const tarih = document.getElementById('inpDenemeTarih').value;
    const studentAd = document.getElementById('headerStudentName').textContent;
    const sinif = document.getElementById('profileClass').textContent;
    let totalNet = 0; const netler = {}; const katsayi = tur === 'LGS' ? 3 : 4;
    document.querySelectorAll('.inp-deneme-d').forEach(input => {
        const ders = input.dataset.ders;
        const d = parseInt(input.value)||0, y = parseInt(input.parentElement.querySelector('.inp-deneme-y').value)||0;
        const net = d - (y / katsayi); totalNet += net;
        netler[ders] = { d, y, net: net.toFixed(2) };
    });
    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), {
        ad, tur, tarih, toplamNet: totalNet, netler, onayDurumu: 'bekliyor', kocId: coachId, studentId: studentDocId, studentAd, sinif, eklenmeTarihi: serverTimestamp()
    });
    document.getElementById('modalDenemeEkle').classList.add('hidden');
    showToast(`Deneme kaydedildi: ${totalNet.toFixed(2)} Net`);
    if (!document.getElementById('tab-denemeler').classList.contains('hidden')) loadDenemelerTab();
};

// Soru Modal
const modalSoru = document.getElementById('modalSoruEkle');
document.getElementById('btnOpenSoruEkle').onclick = () => {
    document.getElementById('inpSoruDers').value = "";
    document.getElementById('inpSoruAdet').value = "";
    document.getElementById('inpModalSoruTarih').value = new Date().toISOString().split('T')[0];
    modalSoru.classList.remove('hidden');
};
document.getElementById('btnSaveModalSoru').onclick = async () => {
    const ders = document.getElementById('inpSoruDers').value;
    const adet = parseInt(document.getElementById('inpSoruAdet').value);
    const tarih = document.getElementById('inpModalSoruTarih').value;
    if(ders && adet) {
        await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), {
            tarih, ders, adet, konu: "Hızlı", onayDurumu: 'bekliyor', kocId: coachId, eklenmeTarihi: serverTimestamp()
        });
        modalSoru.classList.add('hidden'); showToast('Kaydedildi');
        if(!document.getElementById('tab-tracking').classList.contains('hidden')) renderSoruTakibiGrid();
    }
};

// Helperlar
window.toggleAccordion = (btn) => {
    const content = btn.nextElementSibling;
    const isEx = btn.getAttribute('aria-expanded')==='true';
    content.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', !isEx);
    btn.querySelector('i').classList.toggle('rotate-180');
    if(isEx) { btn.classList.remove('bg-purple-50','border-purple-500','text-purple-700'); btn.classList.add('bg-white','border-gray-200'); }
    else { btn.classList.remove('bg-white','border-gray-200'); btn.classList.add('bg-purple-50','border-purple-500','text-purple-700'); }
};
window.toggleRoutines = (btn) => { btn.nextElementSibling.classList.toggle('hidden'); };
window.saveInput = async (input) => {
    const val = parseInt(input.value)||0, old = parseInt(input.defaultValue)||0;
    if(val===old) return;
    const ref = collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi");
    if(input.dataset.docId) {
        if(val>0) await updateDoc(doc(ref, input.dataset.docId), {adet:val, onayDurumu:'bekliyor'});
        else { await deleteDoc(doc(ref, input.dataset.docId)); input.dataset.docId=""; }
    } else if(val>0) {
        const d = await addDoc(ref, {tarih:input.dataset.tarih, ders:input.dataset.ders, adet:val, konu:'Genel', onayDurumu:'bekliyor', kocId:coachId});
        input.dataset.docId = d.id;
    }
    input.parentElement.style.borderColor = '#4ade80'; setTimeout(()=>input.parentElement.style.borderColor='#e5e7eb', 1000);
};
function getWeekDates(offset) {
    const d = ['Paz','Sal','Çar','Per','Cum','Cmt','Paz'], w = [], t = new Date();
    const m = new Date(t.getFullYear(), t.getMonth(), t.getDate() - (t.getDay()||7) + 1 + (offset*7));
    for(let i=0; i<7; i++) { const c = new Date(m); c.setDate(m.getDate()+i); w.push({dateStr:c.toISOString().split('T')[0], dayName:d[i], dayNum:c.getDate(), isToday:c.toDateString()===t.toDateString()}); }
    return w;
}
async function loadWeekSoruData(s, e) {
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), where("tarih", ">=", s), where("tarih", "<=", e));
    const snap = await getDocs(q); const data = []; snap.forEach(doc => data.push({id: doc.id, ...doc.data()})); return data;
}
function showToast(msg, isError=false) {
    const t = document.getElementById('toast'); if(!t) return; t.textContent = msg;
    t.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-sm z-50 transition-opacity duration-300 ${isError ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`;
    t.classList.remove('hidden', 'opacity-0'); setTimeout(() => { t.classList.add('opacity-0'); setTimeout(() => t.classList.add('hidden'), 300); }, 2000);
}
function formatDateTR(d) { if(!d) return ''; const [y, m, da] = d.split('-'); return `${da}.${m}.${y}`; }

document.querySelectorAll('.close-modal').forEach(b => b.onclick=()=>b.closest('.fixed').classList.add('hidden'));
document.getElementById('btnLogout').onclick = () => signOut(auth);
