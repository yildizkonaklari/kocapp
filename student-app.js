// =================================================================
// 1. FİREBASE KÜTÜPHANELERİ VE AYARLARI
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
    serverTimestamp, orderBy, limit, deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

// Başlatma
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "kocluk-sistemi";

// =================================================================
// 2. GLOBAL DEĞİŞKENLER VE SABİTLER
// =================================================================

// Kullanıcı Durumu
let currentUser = null;
let coachId = null;     
let studentDocId = null; 

// Veri Önbelleği (Cache)
let studentDersler = []; // Öğrencinin takip ettiği dersler
const studentRutinler = ["Paragraf", "Problem", "Kitap Okuma"]; // Sabit rutinler

// Dinleyiciler (Unsubscribe Functions)
let listeners = {
    chat: null,
    ajanda: null,
    hedefler: null,
    kpi: null
};

// Takvim ve Tablo Durumları
let currentCalDate = new Date();
let currentWeekOffset = 0; // 0 = bu hafta
let denemeChartInstance = null;

// Sabitler
const DERS_HAVUZU = {
    'ORTAOKUL': ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "T.C. İnkılap", "Din Kültürü", "İngilizce"],
    'LISE': ["Türk Dili ve Edebiyatı", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "İngilizce"]
};

const motivasyonSozleri = [
    "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.",
    "Geleceğini yaratmanın en iyi yolu, onu inşa etmektir.",
    "Bugünün acısı, yarının gücüdür. Çalışmaya devam et.",
    "Disiplin, hedefler ve başarı arasındaki köprüdür.",
    "Yapabileceğinin en iyisini yap. Gerisini merak etme.",
    "Hayal edebiliyorsan, yapabilirsin.",
    "Hiçbir engel, azminden daha güçlü değildir."
];


// --- BAŞLANGIÇ ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await initializeStudentApp(user.uid);
    } else {
        window.location.href = "student-login.html";
    }
});

// UYGULAMA BAŞLATMA VE EŞLEŞME KONTROLÜ
async function initializeStudentApp(uid) {
    try {
        console.log("Kullanıcı profili yükleniyor...");
        
        // 1. Öğrencinin Profil Ayarlarını Çek
        const profileRef = doc(db, "artifacts", appId, "users", uid, "settings", "profile");
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            coachId = profileData.kocId;
            studentDocId = profileData.linkedDocId;
            
            console.log("Koç ID:", coachId);
            console.log("Öğrenci Döküman ID:", studentDocId);

            if (coachId && studentDocId) {
                // Eşleşme tamam, dashboard verilerini yükle
                loadDashboardData(); 
            } else {
                // DİKKAT: Eşleşme yoksa Modalı AÇ
                console.warn("Öğrenci henüz eşleşmemiş. Modal açılıyor.");
                const modal = document.getElementById('modalMatchProfile');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.style.display = 'flex'; // Garanti olsun diye display flex yap
                } else {
                    console.error("HATA: modalMatchProfile bulunamadı!");
                }
            }
        } else {
            console.error("Profil ayar dosyası bulunamadı! Kayıt işlemi eksik olabilir.");
            alert("Profilinize erişilemedi. Lütfen tekrar giriş yapın.");
            signOut(auth);
        }
    } catch (error) { 
        console.error("Başlatma hatası:", error); 
        alert("Sistem başlatılırken hata oluştu: " + error.message);
    }
}

// --- PROFİL EŞLEŞTİRME İŞLEMİ ---
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
            // Koçun 'ogrencilerim' koleksiyonunda İsim/Soyisim araması yap
            // ÖNEMLİ: İsimler büyük/küçük harfe duyarlıdır.
            const q = query(
                collection(db, "artifacts", appId, "users", coachId, "ogrencilerim"),
                where("ad", "==", name),
                where("soyad", "==", surname)
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Eşleşme bulundu!
                const matchDoc = querySnapshot.docs[0];
                studentDocId = matchDoc.id;

                // Eşleşmeyi kaydet
                await updateDoc(doc(db, "artifacts", appId, "users", currentUser.uid, "settings", "profile"), {
                    linkedDocId: studentDocId
                });

                // Modalı kapat
                document.getElementById('modalMatchProfile').classList.add('hidden');
                document.getElementById('modalMatchProfile').style.display = 'none';
                
                alert("Başarıyla eşleştiniz! Hoş geldiniz.");
                loadDashboardData(); // Verileri yüklemeye başla

            } else {
                errorEl.textContent = `Koçunuzun listesinde "${name} ${surname}" bulunamadı. Lütfen koçunuzun girdiği ismin aynısını (büyük/küçük harf dahil) yazın.`;
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
// 4. DASHBOARD (ANA SAYFA) YÖNETİMİ
// =================================================================

async function loadDashboardData() {
    if (!coachId || !studentDocId) return;

    // 1. Motivasyon Sözü
async function loadDashboardData() {
    // ... (Önceki kodun aynısı) ...
    if (!coachId || !studentDocId) return;

    const soz = motivasyonSozleri[Math.floor(Math.random() * motivasyonSozleri.length)];
    document.getElementById('motivasyonSozu').textContent = `"${soz}"`;

    const studentRef = doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId);
    const studentSnap = await getDoc(studentRef);
    
    if (studentSnap.exists()) {
        const data = studentSnap.data();
        document.getElementById('headerStudentName').textContent = data.ad;
        document.getElementById('profileName').textContent = `${data.ad} ${data.soyad}`;
        document.getElementById('profileClass').textContent = data.sinif;
        document.getElementById('profileAvatar').textContent = (data.ad[0] || '') + (data.soyad[0] || '');
        studentDersler = data.takipDersleri || (['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(data.sinif) ? DERS_HAVUZU['ORTAOKUL'] : DERS_HAVUZU['LISE']);
    }
    await updateHomeworkMetrics();
    loadActiveGoalsForDashboard();
    loadStats(); // Bunu en son çağır
}

// Ödev İstatistikleri (Gecikenler ve İlerleme)
async function updateHomeworkMetrics() {
    const listEl = document.getElementById('gecikmisOdevlerList');
    
    // Tüm ödevleri bir kerede çek
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

    // UI Güncelle: İlerleme Çubuğu
    const progressPercent = weeklyTotal === 0 ? 0 : (weeklyDone / weeklyTotal) * 100;
    document.getElementById('haftalikIlerlemeText').textContent = `${weeklyDone} / ${weeklyTotal}`;
    document.getElementById('haftalikIlerlemeBar').style.width = `${progressPercent}%`;
    
    const hText2 = document.getElementById('haftalikIlerlemeText2');
    const hBar2 = document.getElementById('haftalikIlerlemeBar2');
    if(hText2) hText2.textContent = `${weeklyDone} / ${weeklyTotal}`;
    if(hBar2) hBar2.style.width = `${progressPercent}%`;

    // UI Güncelle: Gecikmiş Listesi
    if (overdueList.length > 0) {
        listEl.innerHTML = overdueList
            .sort((a,b) => a.bitisTarihi.localeCompare(b.bitisTarihi))
            .map(odev => `
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

// Ana Sayfa İçin Aktif Hedefler
function loadActiveGoalsForDashboard() {
    const listEl = document.getElementById('dashboardHedefList');
    
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
                <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">
                    <i class="fa-solid fa-bullseye"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-700">${hedef.title}</p>
                    ${hedef.bitisTarihi ? `<p class="text-[10px] text-gray-400">Bitiş: ${formatDateTR(hedef.bitisTarihi)}</p>` : ''}
                </div>
            </div>
            `;
        }).join('');
    });
}


// =================================================================
// 5. NAVİGASYON VE SEKME YÖNETİMİ
// =================================================================

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 1. Aktif butonu güncelle
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'text-indigo-600');
            b.classList.add('text-gray-400');
        });
        const currentBtn = e.currentTarget.closest('.nav-btn');
        currentBtn.classList.add('active', 'text-indigo-600');
        currentBtn.classList.remove('text-gray-400');

        // 2. Sekmeyi göster
        const targetId = currentBtn.dataset.target;
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        // 3. Dinleyicileri temizle (performans için)
        if (targetId !== 'tab-messages' && listeners.chat) { listeners.chat(); listeners.chat = null; }

        // 4. Sekmeye özel yüklemeler
        if (targetId === 'tab-homework') {
            loadHomeworksTab();
        } else if (targetId === 'tab-messages') {
            loadStudentMessages();
        } else if (targetId === 'tab-tracking') {
            currentWeekOffset = 0;
            renderSoruTakibiGrid(); 
        } else if (targetId === 'tab-ajanda') {
            currentCalDate = new Date();
            loadCalendarDataAndDraw(currentCalDate);
        } else if (targetId === 'tab-goals') {
            loadGoalsTab();
        }
    });
});


// =================================================================
// 6. SORU TAKİBİ (HAFTALIK ÇİZELGE) MANTIĞI
// =================================================================

async function renderSoruTakibiGrid() {
    const container = document.getElementById('trackingGridContainer');
    container.innerHTML = '<p class="text-center text-gray-400 p-8">Yükleniyor...</p>';

    // 1. Haftayı Hesapla
    const weekDates = getWeekDates(currentWeekOffset);
    document.getElementById('weekRangeTitle').textContent = `${formatDateTR(weekDates[0].dateStr)} - ${formatDateTR(weekDates[6].dateStr)}`;
    
    // Navigasyon Butonları
    document.getElementById('prevWeekBtn').onclick = () => { currentWeekOffset--; renderSoruTakibiGrid(); };
    document.getElementById('nextWeekBtn').onclick = () => { currentWeekOffset++; renderSoruTakibiGrid(); };
    document.getElementById('nextWeekBtn').disabled = currentWeekOffset >= 0;

    // 2. Verileri Çek
    const weekData = await loadWeekSoruData(weekDates[0].dateStr, weekDates[6].dateStr);

    // 3. Tabloyu Oluştur
    const allHeaders = [...studentDersler, ...studentRutinler];
    let headerHtml = '<div class="grid grid-cols-tracking-table sticky top-0 bg-gray-50 z-10 border-b border-gray-200">';
    
    // Üst Başlıklar
    headerHtml += '<div class="tracking-header sticky left-0 z-20 bg-gray-50 border-r">TARİH</div>';
    headerHtml += `<div class="tracking-header-group" style="grid-column: span ${studentDersler.length}">Dersler</div>`;
    headerHtml += `<div class="tracking-header-group" style="grid-column: span ${studentRutinler.length}">Rutinler</div>`;
    headerHtml += '<div class="tracking-header-group">TOPLAM</div>';
    
    // Alt Başlıklar
    headerHtml += '<div class="tracking-header-sub sticky left-0 z-20 bg-gray-50 border-r"></div>'; 
    allHeaders.forEach(ders => {
        headerHtml += `<div class="tracking-header-sub" title="${ders}">${ders.substring(0, 10)}${ders.length>10?'.':''}</div>`;
    });
    headerHtml += '<div class="tracking-header-sub sticky right-0 bg-gray-50"></div></div>'; 

    // Satırlar
    let bodyHtml = '<div class="grid grid-cols-tracking-table">';
    const haftalikToplamlar = new Array(allHeaders.length).fill(0);
    
    weekDates.forEach(day => {
        let gunlukToplam = 0;
        
        // Tarih
        bodyHtml += `<div class="tracking-cell-date sticky left-0 z-10 ${day.isToday ? 'bg-indigo-50 text-indigo-700' : 'bg-white'}">
                        ${day.dayName} <span class="font-bold">${day.dayNum}</span>
                     </div>`;
        
        // Hücreler
        allHeaders.forEach((ders, index) => {
            const data = weekData.find(d => d.tarih === day.dateStr && d.ders === ders);
            const adet = data ? (data.adet || 0) : 0;
            const onay = data ? data.onayDurumu : null;
            
            gunlukToplam += adet;
            haftalikToplamlar[index] += adet;

            let borderClass = 'border-transparent';
            if (onay === 'bekliyor') borderClass = 'border-yellow-400 bg-yellow-50';
            if (onay === 'onaylandi') borderClass = 'border-green-400 bg-green-50';

            bodyHtml += `
                <div class="tracking-cell">
                    <input type="number" inputmode="numeric"
                           class="tracking-input ${borderClass}" 
                           value="${adet > 0 ? adet : ''}" 
                           data-tarih="${day.dateStr}" 
                           data-ders="${ders}"
                           data-doc-id="${data ? data.id : ''}">
                </div>
            `;
        });
        
        // Günlük Toplam
        bodyHtml += `<div class="tracking-cell-total sticky right-0 z-10 ${day.isToday ? 'bg-indigo-50' : 'bg-white'}">${gunlukToplam}</div>`;
    });

    // Footer (Haftalık Toplam)
    bodyHtml += `<div class="tracking-cell-footer sticky left-0 z-10">TOPLAM</div>`;
    haftalikToplamlar.forEach(t => { bodyHtml += `<div class="tracking-cell-footer">${t}</div>`; });
    bodyHtml += `<div class="tracking-cell-footer sticky right-0 z-10">${haftalikToplamlar.reduce((a,b)=>a+b,0)}</div>`;
    
    bodyHtml += '</div>';

    // CSS Grid Ayarı (Dinamik Kolon Sayısı)
    const colCount = allHeaders.length + 2;
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `.grid-cols-tracking-table { grid-template-columns: 70px repeat(${colCount-2}, minmax(60px, 1fr)) 60px; }`;
    
    container.innerHTML = "";
    container.appendChild(styleEl);
    container.insertAdjacentHTML('beforeend', headerHtml + bodyHtml);

    // Listener Ekle
    addTrackingInputListeners();
}

function getWeekDates(offset) {
    const days = ['Paz', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const week = [];
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek + (offset * 7));
    
    for (let i = 0; i < 7; i++) {
        const current = new Date(monday);
        current.setDate(monday.getDate() + i);
        week.push({
            dateStr: current.toISOString().split('T')[0],
            dayName: days[i],
            dayNum: current.getDate(),
            isToday: current.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
        });
    }
    return week;
}

async function loadWeekSoruData(startDate, endDate) {
    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"),
        where("tarih", ">=", startDate),
        where("tarih", "<=", endDate)
    );
    const snapshot = await getDocs(q);
    const data = [];
    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    return data;
}

function addTrackingInputListeners() {
    document.querySelectorAll('.tracking-input').forEach(input => {
        input.addEventListener('blur', (e) => {
            const el = e.target;
            const val = parseInt(el.value) || 0;
            const oldVal = parseInt(el.defaultValue) || 0;
            
            // Sadece değer değişmişse kaydet
            if (val !== oldVal) {
                saveSoruData(el.dataset.docId, el.dataset.tarih, el.dataset.ders, val, el);
            }
        });
    });
}

async function saveSoruData(docId, tarih, ders, adet, inputEl) {
    const collectionRef = collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi");
    
    try {
        if (docId) {
            if (adet > 0) {
                // Varolanı güncelle
                await updateDoc(doc(collectionRef, docId), { 
                    adet: adet, 
                    onayDurumu: 'bekliyor' // Değişiklik olunca tekrar onaya düşer
                });
            } else {
                // Sıfır girildiyse sil
                await deleteDoc(doc(collectionRef, docId));
                inputEl.dataset.docId = ""; 
            }
        } else if (adet > 0) {
            // Yeni kayıt ekle
            const docRef = await addDoc(collectionRef, {
                tarih, ders, adet,
                konu: studentRutinler.includes(ders) ? ders : "Genel",
                onayDurumu: 'bekliyor',
                eklenmeTarihi: serverTimestamp(),
                kocId: coachId 
            });
            inputEl.dataset.docId = docRef.id;
        }
        
        // Görsel Geri Bildirim (Sarı = Bekliyor)
        inputEl.className = 'tracking-input border-yellow-400 bg-yellow-50';
        showToast('Kaydedildi');

    } catch (error) {
        console.error("Kayıt hatası:", error);
        showToast('Hata oluştu!', true);
        inputEl.classList.add('border-red-500');
    }
}


// =================================================================
// 7. AJANDA (TAKVİM) YÖNETİMİ
// =================================================================

function loadCalendarDataAndDraw(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

    document.getElementById('currentMonthYear').textContent = date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

    if (listeners.ajanda) listeners.ajanda();

    // Öğrenci SADECE KENDİSİNE ait randevuları çeker
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
    });
}

function drawCalendarGrid(year, month, appointments) {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const todayStr = new Date().toISOString().split('T')[0];

    for(let i=0; i<offset; i++) grid.innerHTML += `<div class="calendar-day other-month"></div>`;

    for(let day=1; day<=daysInMonth; day++) {
        const dateStr = `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
        const dayAppts = appointments.filter(a => a.tarih === dateStr);
        
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${dateStr === todayStr ? 'today' : ''}`;
        
        let dotsHtml = '';
        dayAppts.forEach(a => {
            const color = a.durum === 'tamamlandi' ? 'dot-green' : (a.tarih < todayStr ? 'dot-red' : 'dot-blue');
            dotsHtml += `<div class="dot ${color}"></div>`;
        });

        dayEl.innerHTML = `<div class="day-number">${day}</div><div class="appointment-dots">${dotsHtml}</div>`;
        
        // Tıklayınca detay göster (Alert veya Modal yapılabilir)
        if(dayAppts.length > 0) {
            dayEl.onclick = () => {
                const msg = dayAppts.map(a => `${a.baslangic}: ${a.baslik}`).join('\n');
                alert(`${formatDateTR(dateStr)}\n\n${msg}`);
            };
        }

        grid.appendChild(dayEl);
    }
}

function renderUpcomingAppointments(appointments) {
    const listEl = document.getElementById('appointmentListContainer');
    const todayStr = new Date().toISOString().split('T')[0];
    
    const upcoming = appointments
        .filter(a => a.tarih >= todayStr && a.durum !== 'tamamlandi')
        .sort((a,b) => a.tarih.localeCompare(b.tarih));
        
    if (upcoming.length === 0) {
        listEl.innerHTML = '<p class="text-center text-gray-400 text-xs py-2">Bu ay için yaklaşan randevu yok.</p>';
        return;
    }

    listEl.innerHTML = upcoming.map(a => `
        <div class="p-3 bg-white border border-l-4 border-indigo-500 rounded shadow-sm">
            <div class="flex justify-between">
                <span class="font-bold text-gray-800 text-sm">${formatDateTR(a.tarih)}</span>
                <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">${a.baslangic}</span>
            </div>
            <p class="text-xs text-gray-600 mt-1">${a.baslik}</p>
        </div>
    `).join('');
}


// =================================================================
// 8. DİĞER SEKMELER (ÖDEVLER, HEDEFLER, MESAJLAR)
// =================================================================

// --- ÖDEVLER ---
async function loadHomeworksTab() {
    const listEl = document.getElementById('studentOdevList');
    if (!listEl) return;
    listEl.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Yükleniyor...</p>';
    
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"), orderBy("bitisTarihi"));
    const snapshot = await getDocs(q);
    
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
}
window.toggleOdev = async (id, status) => {
    await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler", id), {
        durum: status === 'tamamlandi' ? 'devam' : 'tamamlandi'
    });
    loadHomeworksTab(); updateHomeworkMetrics();
};

// --- HEDEFLER ---
function loadGoalsTab() {
    const listEl = document.getElementById('studentHedefList');
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), orderBy("olusturmaTarihi", "desc"));
    
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
                    </div>
                </div>
            </div>`;
        }).join('');
    });
}

// --- MESAJLAR ---
function loadStudentMessages() {
    if (listeners.chat) return;
    const container = document.getElementById('studentMessagesContainer');
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), orderBy("tarih"));
    
    listeners.chat = onSnapshot(q, (snap) => {
        container.innerHTML = '';
        snap.forEach(doc => {
            const m = doc.data();
            const isMe = m.gonderen === 'ogrenci';
            container.innerHTML += `
                <div class="flex w-full ${isMe ? 'justify-end' : 'justify-start'}">
                    <div class="max-w-[80%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-white border'}">
                        <p>${m.text}</p>
                        <p class="text-[9px] opacity-70 text-right mt-1">${m.tarih?.toDate().toLocaleTimeString().slice(0,5)}</p>
                    </div>
                </div>`;
        });
        container.scrollTop = container.scrollHeight;
    });
}

document.getElementById('studentChatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('studentMessageInput');
    if(!input.value.trim()) return;
    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), {
        text: input.value, gonderen: 'ogrenci', tarih: serverTimestamp(), okundu: false, kocId: coachId
    });
    input.value = '';
});


// --- YARDIMCILAR ---
function showToast(msg, isError=false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-sm z-50 transition-opacity duration-300 ${isError ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`;
    t.classList.remove('hidden', 'opacity-0');
    setTimeout(() => { t.classList.add('opacity-0'); setTimeout(() => t.classList.add('hidden'), 300); }, 2000);
}

function formatDateTR(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
}

// Deneme Ekleme (Koç onayı için kaydet)
document.getElementById('btnOpenDenemeEkle').addEventListener('click', () => document.getElementById('modalDenemeEkle').classList.remove('hidden'));
document.getElementById('btnSaveDeneme').addEventListener('click', async () => {
    const ad = document.getElementById('inpDenemeAd').value;
    const tur = document.getElementById('inpDenemeTur').value;
    const tarih = document.getElementById('inpDenemeTarih').value;
    
    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), {
        ad, tur, tarih, toplamNet: 0, onayDurumu: 'bekliyor', kocId: coachId, eklenmeTari: serverTimestamp()
    });
    document.getElementById('modalDenemeEkle').classList.add('hidden');
    showToast('Deneme kaydedildi, onay bekleniyor.');
});

document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => b.closest('.fixed').classList.add('hidden'));
document.getElementById('btnLogout').onclick = () => signOut(auth);
