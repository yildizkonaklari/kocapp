// 1. Firebase Kütüphanelerini içeri aktar
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, getDoc, getDocs, collection, query, where, addDoc, updateDoc, 
    serverTimestamp, orderBy, limit, deleteDoc, writeBatch 
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

// 2. Firebase Başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "kocluk-sistemi";

// Global State
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
    "Yapabileceğinin en iyisini yap. Gerisini merak etme.",
    "Hayal edebiliyorsan, yapabilirsin.",
    "Hiçbir engel, azminden daha güçlü değildir."
];

// Takvim ve Tablo Durumları
let currentCalDate = new Date();
let currentWeekOffset = 0; // 0 = bu hafta
let denemeChartInstance = null;
let listeners = {
    chat: null,
    ajanda: null,
    hedefler: null,
    odevler: null,
    notlar: null
};

const DERS_HAVUZU = {
    'ORTAOKUL': ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "T.C. İnkılap", "Din Kültürü", "İngilizce"],
    'LISE': ["Türk Dili ve Edebiyatı", "Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "İngilizce"]
};


// --- 3. BAŞLANGIÇ ---
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
                // Eşleşme tamam, verileri yükle
                await loadDashboardData(); 
            } else {
                // Eşleşme yok, modalı aç
                document.getElementById('modalMatchProfile').classList.remove('hidden');
                document.getElementById('modalMatchProfile').style.display = 'flex';
            }
        } else {
            console.error("Profil ayarı bulunamadı.");
            alert("Hesap hatası. Lütfen tekrar giriş yapın.");
            signOut(auth);
        }
    } catch (error) { 
        console.error("Başlatma hatası:", error); 
    }
}

// --- PROFİL EŞLEŞTİRME ---
const btnMatch = document.getElementById('btnMatchProfile');
if (btnMatch) {
    btnMatch.addEventListener('click', async () => {
        const name = document.getElementById('matchName').value.trim();
        const surname = document.getElementById('matchSurname').value.trim();
        const errorEl = document.getElementById('matchError');

        if (!name || !surname) return;

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
                showToast("Eşleşme Başarılı!");
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

// --- 4. DASHBOARD YÖNETİMİ ---

async function loadDashboardData() {
    if (!coachId || !studentDocId) return;

    // Motivasyon Sözü
    const soz = motivasyonSozleri[Math.floor(Math.random() * motivasyonSozleri.length)];
    document.getElementById('motivasyonSozu').textContent = `"${soz}"`;

    // Profil Bilgilerini Çek
    try {
        const studentRef = doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
            const data = studentSnap.data();
            document.getElementById('headerStudentName').textContent = data.ad;
            document.getElementById('profileName').textContent = `${data.ad} ${data.soyad}`;
            document.getElementById('profileClass').textContent = data.sinif;
            document.getElementById('profileAvatar').textContent = (data.ad[0] || '') + (data.soyad[0] || '');
            
            // Dersleri belirle
            studentDersler = data.takipDersleri || (['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(data.sinif) ? DERS_HAVUZU['ORTAOKUL'] : DERS_HAVUZU['LISE']);
        }
        
        await updateHomeworkMetrics();
        loadActiveGoalsForDashboard();
    } catch(e) {
        console.error("Dashboard yükleme hatası:", e);
    }
}

async function updateHomeworkMetrics() {
    const listEl = document.getElementById('gecikmisOdevlerList');
    
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"));
    const snapshot = await getDocs(q);

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek).toISOString().split('T')[0];
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - dayOfWeek)).toISOString().split('T')[0];
    
    let weeklyTotal = 0, weeklyDone = 0, overdueList = [];

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
    document.getElementById('haftalikIlerlemeText').textContent = `${weeklyDone} / ${weeklyTotal}`;
    document.getElementById('haftalikIlerlemeBar').style.width = `${progressPercent}%`;
    
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
        const currentBtn = e.currentTarget.closest('.nav-btn');
        
        // Buton stillerini güncelle
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'text-indigo-600');
            b.classList.add('text-gray-400');
        });
        currentBtn.classList.add('active', 'text-indigo-600');
        currentBtn.classList.remove('text-gray-400');

        const targetId = currentBtn.dataset.target;
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        // Dinleyicileri temizle
        if (listeners.chat) { listeners.chat(); listeners.chat = null; }
        if (listeners.ajanda) { listeners.ajanda(); listeners.ajanda = null; }

        // Sekme Yüklemeleri
        if (targetId === 'tab-homework') loadHomeworksTab();
        else if (targetId === 'tab-messages') loadStudentMessages();
        else if (targetId === 'tab-tracking') { currentWeekOffset = 0; renderSoruTakibiGrid(); }
        else if (targetId === 'tab-ajanda') { currentCalDate = new Date(); loadCalendarDataAndDraw(currentCalDate); }
        else if (targetId === 'tab-goals') loadGoalsTab();
        else if (targetId === 'tab-denemeler') loadDenemelerTab(); // YENİ
    });
});


// =================================================================
// YENİ: DENEMELER SEKMESİ (ANALİZ VE GRAFİK)
// =================================================================

async function loadDenemelerTab() {
    const listEl = document.getElementById('studentDenemeList');
    if (!listEl) return;
    
    // Yeni Ekle Butonu
    const btnAdd = document.getElementById('btnAddNewDeneme');
    if(btnAdd) {
        // Event listener'ı temizleyip yeniden ekle (çoklu eklemeyi önlemek için cloneNode)
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.addEventListener('click', () => {
             document.getElementById('modalDenemeEkle').classList.remove('hidden');
             renderDenemeInputs('TYT');
             document.getElementById('inpDenemeTarih').value = new Date().toISOString().split('T')[0];
        });
    }

    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"),
        orderBy("tarih", "desc")
    );

    onSnapshot(q, (snapshot) => {
        const denemeler = [];
        snapshot.forEach(doc => denemeler.push({ id: doc.id, ...doc.data() }));

        // İstatistik Hesapla
        calculateDenemeStats(denemeler);

        // Listeyi Doldur
        if (denemeler.length === 0) {
            listEl.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm">Henüz deneme girilmemiş.</p>';
            return;
        }

        listEl.innerHTML = denemeler.map(d => {
            const isPending = d.onayDurumu === 'bekliyor';
            const net = parseFloat(d.toplamNet) || 0;
            return `
                <div class="bg-white p-4 rounded-xl border ${isPending ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'} shadow-sm transition-shadow hover:shadow-md">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-bold text-gray-800 text-sm">${d.ad}</h4>
                        <span class="text-[10px] px-2 py-1 rounded-full font-medium ${isPending ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-800'}">
                            ${isPending ? 'Onay Bekliyor' : 'Onaylandı'}
                        </span>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500">
                        <div class="flex gap-2">
                            <span class="bg-gray-100 px-2 py-0.5 rounded">${d.tur}</span>
                            <span>${formatDateTR(d.tarih)}</span>
                        </div>
                        <span class="font-bold text-indigo-600 text-base">${net.toFixed(2)} Net</span>
                    </div>
                </div>
            `;
        }).join('');
    });
}

function calculateDenemeStats(denemeler) {
    // Sadece onaylı denemeleri dikkate al
    const onayli = denemeler.filter(d => d.onayDurumu === 'onaylandi');
    
    let totalNet = 0;
    let maxNet = 0;

    onayli.forEach(d => {
        const net = parseFloat(d.toplamNet) || 0;
        totalNet += net;
        if (net > maxNet) maxNet = net;
    });

    const avg = onayli.length > 0 ? (totalNet / onayli.length) : 0;

    document.getElementById('studentKpiAvg').textContent = avg.toFixed(2);
    document.getElementById('studentKpiMax').textContent = maxNet.toFixed(2);
    document.getElementById('studentKpiTotal').textContent = denemeler.length; // Toplamda bekleyenler de sayılır

    // Grafik Çiz
    renderStudentDenemeChart(onayli);
}

function renderStudentDenemeChart(denemeler) {
    const ctx = document.getElementById('studentDenemeChart');
    if (!ctx) return;
    
    // Tarihe göre eskiden yeniye sırala
    const sortedData = [...denemeler].sort((a,b) => a.tarih.localeCompare(b.tarih)).slice(-10); // Son 10
    
    const labels = sortedData.map(d => formatDateTR(d.tarih).substring(0, 5)); // Sadece Gün.Ay
    const dataPoints = sortedData.map(d => (parseFloat(d.toplamNet) || 0).toFixed(2));

    if (denemeChartInstance) denemeChartInstance.destroy();

    denemeChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Net',
                data: dataPoints,
                borderColor: '#7c3aed', // Indigo/Purple
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#7c3aed',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
}
// =================================================================
// 6. SORU TAKİBİ (YENİ AKORDİYON SİSTEMİ)
// =================================================================

async function renderSoruTakibiGrid() {
    const container = document.getElementById('weeklyAccordion');
    if (!container) {
        console.error("weeklyAccordion container bulunamadı");
        return;
    }

    // Güvenlik kontrolü
    if (!coachId || !studentDocId) {
        container.innerHTML = '<p class="text-red-500 text-center p-8">Profil bilgileri yüklenemedi. Lütfen sayfayı yenileyin.</p>';
        return;
    }

    container.innerHTML = '<p class="text-center text-gray-400 p-8">Yükleniyor...</p>';

    try {
        const weekDates = getWeekDates(currentWeekOffset);
        document.getElementById('weekRangeTitle').textContent = `${formatDateTR(weekDates[0].dateStr)} - ${formatDateTR(weekDates[6].dateStr)}`;
        
        document.getElementById('prevWeekBtn').onclick = () => { currentWeekOffset--; renderSoruTakibiGrid(); };
        document.getElementById('nextWeekBtn').onclick = () => { currentWeekOffset++; renderSoruTakibiGrid(); };
        document.getElementById('nextWeekBtn').disabled = currentWeekOffset >= 0;

        const weekData = await loadWeekSoruData(weekDates[0].dateStr, weekDates[6].dateStr);

        let html = '';
        weekDates.forEach(day => {
            const dayData = weekData.filter(d => d.tarih === day.dateStr);
            const isExpanded = day.isToday; 

            html += `
                <div class="accordion-item border-b border-gray-100 last:border-0">
                    <button class="accordion-header w-full flex justify-between items-center p-4 rounded-xl border mb-2 text-left ${isExpanded ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-200'}" 
                            onclick="toggleAccordion(this)" 
                            aria-expanded="${isExpanded}">
                        <span class="font-bold text-lg">${day.dayNum} ${day.dayName}</span>
                        <i class="fa-solid fa-chevron-down transition-transform ${isExpanded ? 'rotate-180' : ''}"></i>
                    </button>
                    
                    <div class="accordion-content ${isExpanded ? '' : 'hidden'} px-1 pb-4">
                        <!-- DERSLER -->
                        <div class="grid grid-cols-2 gap-3 mb-4">
                            ${studentDersler.map(ders => {
                                const record = dayData.find(d => d.ders === ders);
                                const val = record ? record.adet : '';
                                const docId = record ? record.id : '';
                                return `
                                <div class="subject-card">
                                    <label class="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide text-center w-full truncate">${ders}</label>
                                    <input type="number" 
                                           class="text-3xl font-bold text-center text-gray-800 w-full outline-none bg-transparent placeholder-gray-200" 
                                           placeholder="0"
                                           value="${val}"
                                           data-tarih="${day.dateStr}"
                                           data-ders="${ders}"
                                           data-konu="Genel"
                                           data-doc-id="${docId}"
                                           onblur="saveInput(this)">
                                </div>`;
                            }).join('')}
                        </div>

                        <!-- RUTİNLER -->
                        <div class="text-left">
                            <button class="routine-btn" onclick="toggleRoutines(this)"><i class="fa-solid fa-list-check mr-2"></i> Rutinler</button>
                            <div class="hidden mt-3 grid grid-cols-2 gap-3 p-3 bg-gray-100 rounded-xl border border-gray-200">
                                 ${studentRutinler.map(rutin => {
                                    const record = dayData.find(d => d.ders === rutin);
                                    const val = record ? record.adet : '';
                                    const docId = record ? record.id : '';
                                    return `
                                    <div class="subject-card bg-white">
                                        <label class="block text-xs font-semibold text-gray-500 mb-1 uppercase text-center">${rutin}</label>
                                        <input type="number" class="text-2xl font-bold text-center text-gray-800 w-full outline-none placeholder-gray-200" placeholder="0" value="${val}" data-tarih="${day.dateStr}" data-ders="${rutin}" data-konu="${rutin}" data-doc-id="${docId}" onblur="saveInput(this)">
                                    </div>`;
                                 }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        
    } catch (error) {
        console.error("Tablo oluşturma hatası:", error);
        container.innerHTML = `<p class="text-red-500 text-center p-8">Hata: ${error.message}</p>`;
    }
}

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

window.toggleRoutines = (btn) => {
    const container = btn.nextElementSibling;
    container.classList.toggle('hidden');
};

window.saveInput = (input) => {
    const val = parseInt(input.value) || 0;
    const oldVal = parseInt(input.defaultValue) || 0;
    if (val !== oldVal) {
        saveSoruData(input.dataset.docId, input.dataset.tarih, input.dataset.ders, val, input);
    }
};

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

async function saveSoruData(docId, tarih, ders, adet, inputEl) {
    const collectionRef = collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi");
    
    // Görsel Bildirim
    inputEl.parentElement.classList.add('border-indigo-500', 'shadow-md');

    try {
        if (docId) {
            if (adet > 0) {
                await updateDoc(doc(collectionRef, docId), { adet: adet, onayDurumu: 'bekliyor' });
            } else {
                await deleteDoc(doc(collectionRef, docId));
                inputEl.dataset.docId = ""; 
            }
        } else if (adet > 0) {
            const docRef = await addDoc(collectionRef, {
                tarih, ders, adet,
                konu: "Genel",
                onayDurumu: 'bekliyor',
                eklenmeTarihi: serverTimestamp(),
                kocId: coachId 
            });
            inputEl.dataset.docId = docRef.id;
        }
        
        // Başarılı
        inputEl.parentElement.classList.remove('border-indigo-500', 'shadow-md');
        inputEl.parentElement.classList.add('border-green-500');
        setTimeout(() => inputEl.parentElement.classList.remove('border-green-500'), 1000);

    } catch (error) {
        console.error("Kayıt hatası:", error);
        inputEl.parentElement.classList.remove('border-indigo-500');
        inputEl.parentElement.classList.add('border-red-500');
        showToast('Hata oluştu!', true);
    }
}

// =================================================================
// 7. AJANDA (TAKVİM)
// =================================================================

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
// 8. DİĞER FONKSİYONLAR
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
    
    // Koçun görmesi için öğrenci adını ekle
    const studentAd = document.getElementById('headerStudentName').textContent;
    const sinif = document.getElementById('profileClass').textContent;

    if(!tarih) { showToast('Tarih seçiniz', true); return; }

    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), {
        ad, tur, tarih, 
        toplamNet: 0, // Şimdilik 0
        onayDurumu: 'bekliyor', 
        kocId: coachId, 
        studentId: studentDocId, // Onaylarken gerekli
        studentAd: studentAd,
        sinif: sinif,
        eklenmeTarihi: serverTimestamp()
    });
    document.getElementById('modalDenemeEkle').classList.add('hidden');
    showToast('Deneme kaydedildi, onay bekleniyor.');
});

document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => b.closest('.fixed').classList.add('hidden'));
document.getElementById('btnLogout').onclick = () => signOut(auth);
