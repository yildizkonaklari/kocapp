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

// Deneme Türleri ve Dersleri
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
    // ... (Ödev metrikleri hesaplama mantığı öncekiyle aynı, yer kazanmak için kısaltıyorum)
    // Burası zaten çalışıyordu.
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
        const currentBtn = e.currentTarget.closest('.nav-btn');
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'text-indigo-600');
            b.classList.add('text-gray-400');
        });
        currentBtn.classList.add('active', 'text-indigo-600');
        currentBtn.classList.remove('text-gray-400');

        const targetId = currentBtn.dataset.target;
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        // Temizlik
        if (listeners.chat) { listeners.chat(); listeners.chat = null; }
        if (listeners.ajanda) { listeners.ajanda(); listeners.ajanda = null; }

        // Yüklemeler
        if (targetId === 'tab-homework') loadHomeworksTab();
        else if (targetId === 'tab-messages') loadStudentMessages();
        else if (targetId === 'tab-tracking') { currentWeekOffset = 0; renderSoruTakibiGrid(); }
        else if (targetId === 'tab-ajanda') { currentCalDate = new Date(); loadCalendarDataAndDraw(currentCalDate); }
        else if (targetId === 'tab-goals') loadGoalsTab();
        else if (targetId === 'tab-denemeler') loadDenemelerTab();
    });
});


// =================================================================
// 6. MODAL VE DENEME EKLEME İŞLEMLERİ (DÜZELTİLEN BÖLÜM)
// =================================================================

// Modal Kapatma
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.currentTarget.closest('.fixed').classList.add('hidden');
    });
});

// --- DENEME EKLEME ---

// 1. Modalı Açma
const openDenemeModal = () => {
    document.getElementById('modalDenemeEkle').classList.remove('hidden');
    const turSelect = document.getElementById('inpDenemeTur');
    renderDenemeInputs(turSelect.value || 'TYT'); // Varsayılan olarak seçili olanı render et
    document.getElementById('inpDenemeTarih').value = new Date().toISOString().split('T')[0];
};

const btnDeneme1 = document.getElementById('btnOpenDenemeEkle'); // Ana Sayfa
if(btnDeneme1) btnDeneme1.addEventListener('click', openDenemeModal);

// 2. Dersleri Render Etme Fonksiyonu
function renderDenemeInputs(tur) {
    const container = document.getElementById('denemeDersContainer');
    if(!container) return;
    
    container.innerHTML = '';
    const dersler = SINAV_DERSLERI[tur] || SINAV_DERSLERI['Diger'];

    dersler.forEach(ders => {
        container.innerHTML += `
            <div class="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                <span class="text-gray-700 w-24 truncate font-medium">${ders}</span>
                <div class="flex gap-2">
                    <input type="number" placeholder="D" class="inp-deneme-d w-12 p-2 bg-green-50 border border-green-100 rounded text-center text-sm outline-none focus:ring-1 focus:ring-green-400" data-ders="${ders}">
                    <input type="number" placeholder="Y" class="inp-deneme-y w-12 p-2 bg-red-50 border border-red-100 rounded text-center text-sm outline-none focus:ring-1 focus:ring-red-400" data-ders="${ders}">
                    <input type="number" placeholder="B" class="inp-deneme-b w-12 p-2 bg-gray-50 border border-gray-200 rounded text-center text-sm outline-none focus:ring-1 focus:ring-gray-400" data-ders="${ders}">
                </div>
            </div>
        `;
    });
}

// 3. Tür Değişince Inputları Yenile
document.getElementById('inpDenemeTur').addEventListener('change', (e) => {
    renderDenemeInputs(e.target.value);
});

// 4. Kaydetme
document.getElementById('btnSaveDeneme').addEventListener('click', async () => {
    const ad = document.getElementById('inpDenemeAd').value || "Deneme";
    const tur = document.getElementById('inpDenemeTur').value;
    const tarih = document.getElementById('inpDenemeTarih').value;
    const studentAd = document.getElementById('headerStudentName').textContent;
    const sinif = document.getElementById('profileClass').textContent;

    if(!tarih) { showToast('Lütfen tarih seçin', true); return; }

    let totalNet = 0;
    const netler = {};
    const katsayi = tur === 'LGS' ? 3 : 4;

    document.querySelectorAll('.inp-deneme-d').forEach(input => {
        const ders = input.dataset.ders;
        const d = parseInt(input.value) || 0;
        const y = parseInt(input.parentElement.querySelector('.inp-deneme-y').value) || 0;
        const b = parseInt(input.parentElement.querySelector('.inp-deneme-b').value) || 0;
        
        const net = d - (y / katsayi);
        totalNet += net;
        
        netler[ders] = { d, y, b, net: net.toFixed(2) };
    });

    try {
        await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), {
            ad, tur, tarih,
            toplamNet: totalNet,
            netler: netler,
            onayDurumu: 'bekliyor',
            kocId: coachId,
            studentId: studentDocId,
            studentAd: studentAd,
            sinif: sinif,
            eklenmeTarihi: serverTimestamp()
        });

        document.getElementById('modalDenemeEkle').classList.add('hidden');
        showToast(`Deneme kaydedildi: ${totalNet.toFixed(2)} Net`);
        
        // Eğer Deneme sekmesi açıksa listeyi yenile
        if (!document.getElementById('tab-denemeler').classList.contains('hidden')) {
            loadDenemelerTab();
        }
    } catch (e) {
        console.error(e);
        showToast("Kayıt hatası", true);
    }
});


// --- SORU EKLEME MODALI ---
const modalSoru = document.getElementById('modalSoruEkle');
document.getElementById('btnOpenSoruEkle').addEventListener('click', () => {
    document.getElementById('inpSoruDers').value = "";
    document.getElementById('inpSoruAdet').value = "";
    document.getElementById('inpModalSoruTarih').value = new Date().toISOString().split('T')[0];
    modalSoru.classList.remove('hidden');
});

document.getElementById('btnSaveModalSoru').addEventListener('click', async () => {
    const ders = document.getElementById('inpSoruDers').value;
    const adet = parseInt(document.getElementById('inpSoruAdet').value) || 0;
    const tarih = document.getElementById('inpModalSoruTarih').value;

    if (!ders || !tarih) { return showToast('Lütfen ders ve tarih seçin', true); }
    if (adet <= 0) { return showToast('Soru sayısı girin', true); }

    try {
        await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), {
            tarih, ders, adet,
            konu: "Hızlı Giriş",
            onayDurumu: 'bekliyor',
            eklenmeTarihi: serverTimestamp(),
            kocId: coachId
        });
        modalSoru.classList.add('hidden');
        showToast('Soru kaydedildi!');
        if(!document.getElementById('tab-tracking').classList.contains('hidden')) {
             renderSoruTakibiGrid();
        }
    } catch (error) {
        console.error("Hata:", error);
        showToast("Bir hata oluştu", true);
    }
});


// =================================================================
// 7. DENEME SEKME YÖNETİMİ
// =================================================================

async function loadDenemelerTab() {
    const listEl = document.getElementById('studentDenemeList');
    if (!listEl) return;

    // Yeni Ekle Butonu (Denemeler sekmesi içindeki)
    const btnAdd = document.getElementById('btnAddNewDeneme');
    if(btnAdd) {
        // Temiz bir event listener eklemek için butonu klonla ve değiştir
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.addEventListener('click', openDenemeModal);
    }

    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"),
        orderBy("tarih", "desc")
    );

    onSnapshot(q, (snapshot) => {
        const denemeler = [];
        snapshot.forEach(doc => denemeler.push({ id: doc.id, ...doc.data() }));
        
        // İstatistik
        calculateDenemeStats(denemeler);

        // Liste
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
    const onayli = denemeler.filter(d => d.onayDurumu === 'onaylandi');
    let totalNet = 0, maxNet = 0;
    onayli.forEach(d => {
        const net = parseFloat(d.toplamNet) || 0;
        totalNet += net;
        if (net > maxNet) maxNet = net;
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
            datasets: [{
                label: 'Net',
                data: dataPoints,
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: false, grid: { display: false } }, x: { grid: { display: false } } }
        }
    });
}


// =================================================================
// 8. DİĞER FONKSİYONLAR
// =================================================================

// ... (Soru Takip, Ajanda, Mesajlar, Hedefler, Ödevler kodları buraya AYNEN gelecek) ...
// Kodun tamamını korumak için önceki cevaptaki (bölüm 6, 7, 8) kodları buraya yapıştırdığınızdan emin olun.
// Aşağıya sadece renderSoruTakibiGrid ve diğerlerinin çalıştığını varsayarak kısa hallerini ekliyorum.

async function renderSoruTakibiGrid() {
    // ... (Önceki cevaptaki renderSoruTakibiGrid fonksiyonu) ...
    const container = document.getElementById('weeklyAccordion');
    if(!container) return;
    if(!coachId || !studentDocId) { container.innerHTML='<p class="p-4">Hata</p>'; return; }
    
    const weekDates = getWeekDates(currentWeekOffset);
    document.getElementById('weekRangeTitle').textContent = `${formatDateTR(weekDates[0].dateStr)} - ${formatDateTR(weekDates[6].dateStr)}`;
    
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

function showToast(msg, isError=false) {
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-sm z-50 transition-opacity duration-300 ${isError ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`;
    t.classList.remove('hidden', 'opacity-0');
    setTimeout(() => { t.classList.add('opacity-0'); setTimeout(() => t.classList.add('hidden'), 300); }, 2000);
}
function formatDateTR(d) { if(!d) return ''; const [y,m,da] = d.split('-'); return `${da}.${m}.${y}`; }

// Çıkış
document.getElementById('btnLogout').onclick = () => signOut(auth);
