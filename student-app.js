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
    "Bugünün acısı, yarının gücüdür. Çalışmaya devam et."
];

let denemeChartInstance = null;
let currentCalDate = new Date();
let currentWeekOffset = 0;

// Dinleyiciler
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
                loadNotifications(); // Bildirimleri başlat
                listenUnreadMessages(); // Mesajları dinle
            } else {
                document.getElementById('modalMatchProfile').classList.remove('hidden');
                document.getElementById('modalMatchProfile').style.display = 'flex';
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
        if (!name || !surname) return alert("Ad soyad giriniz.");

        try {
            const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim"), where("ad", "==", name), where("soyad", "==", surname));
            const snap = await getDocs(q);

            if (!snap.empty) {
                studentDocId = snap.docs[0].id;
                await updateDoc(doc(db, "artifacts", appId, "users", currentUser.uid, "settings", "profile"), { linkedDocId: studentDocId });
                document.getElementById('modalMatchProfile').classList.add('hidden');
                document.getElementById('modalMatchProfile').style.display = 'none';
                alert("Eşleşme başarılı!");
                loadDashboardData(); 
            } else {
                document.getElementById('matchError').classList.remove('hidden');
            }
        } catch (e) { console.error(e); }
    });
}


// =================================================================
// 4. SEKMELERİ YÜKLEME FONKSİYONLARI (Tanımlamalar)
// =================================================================

// --- ÖDEVLER SEKMESİ ---
async function loadHomeworksTab() {
    const listEl = document.getElementById('studentOdevList');
    if (!listEl) return;
    listEl.innerHTML = '<p class="text-center text-gray-400 py-4">Yükleniyor...</p>';
    
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"), orderBy("bitisTarihi"));
    
    if (listeners.odevler) listeners.odevler(); // Eski dinleyiciyi temizle

    listeners.odevler = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) { 
            listEl.innerHTML = '<p class="text-center text-gray-400 py-4">Henüz ödev yok.</p>'; 
            return; 
        }

        const todayStr = new Date().toISOString().split('T')[0];
        listEl.innerHTML = snapshot.docs.map(doc => {
            const d = doc.data();
            const isDone = d.durum === 'tamamlandi';
            const isLate = !isDone && d.bitisTarihi < todayStr;
            const icon = isDone ? 'fa-solid fa-circle-check text-green-500' : (isLate ? 'fa-solid fa-circle-exclamation text-red-500' : 'fa-regular fa-circle text-gray-300');
            
            return `
            <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3 ${isDone ? 'opacity-60' : ''}">
                <button class="mt-1 text-xl transition-colors hover:scale-110" onclick="toggleOdev('${doc.id}', '${d.durum}')">
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

// --- HEDEFLER SEKMESİ ---
function loadGoalsTab() {
    const listEl = document.getElementById('studentHedefList');
    if(!listEl) return;
    listEl.innerHTML = '<p class="text-center text-gray-400 py-4">Yükleniyor...</p>';

    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), orderBy("olusturmaTarihi", "desc"));
    
    if (listeners.hedefler) listeners.hedefler();

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
                        <p class="text-[10px] text-gray-400 mt-2 text-right">${formatDateTR(h.bitisTarihi)}</p>
                    </div>
                </div>
            </div>`;
        }).join('');
    });
}

// --- DENEMELER SEKMESİ ---
function loadDenemelerTab() {
    const listEl = document.getElementById('studentDenemeList');
    if (!listEl) return;
    listEl.innerHTML = '<p class="text-center text-gray-400 py-4">Yükleniyor...</p>';

    // Yeni Ekle Butonu Bağlantısı
    const btnAdd = document.getElementById('btnAddNewDeneme');
    if(btnAdd) {
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.addEventListener('click', openDenemeModal);
    }

    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), orderBy("tarih", "desc"));

    if (listeners.denemeler) listeners.denemeler();

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
            
            // Akordiyon Detayları
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
                        <span class="text-[10px] px-2 py-1 rounded-full font-medium ${isPending ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-800'}">
                            ${isPending ? 'Onay Bekliyor' : 'Onaylandı'}
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

// --- MESAJLAR SEKMESİ ---
function loadStudentMessages() {
    const container = document.getElementById('studentMessagesContainer');
    if(!container) return;
    
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), orderBy("tarih"));
    
    if (listeners.chat) listeners.chat();

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

// =================================================================
// 5. TAB NAVİGASYONU
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
        for(let key in listeners) { if(listeners[key] && key !== 'notifications') { listeners[key](); listeners[key]=null; } }

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
// 6. DASHBOARD VE DİĞER FONKSİYONLAR
// =================================================================

async function loadDashboardData() {
    if (!coachId || !studentDocId) return;

    const soz = motivasyonSozleri[Math.floor(Math.random() * motivasyonSozleri.length)];
    if(document.getElementById('motivasyonSozu')) document.getElementById('motivasyonSozu').textContent = `"${soz}"`;

    const studentRef = doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId);
    getDoc(studentRef).then(snap => {
        if (snap.exists()) {
            const d = snap.data();
            if(document.getElementById('headerStudentName')) document.getElementById('headerStudentName').textContent = d.ad;
            if(document.getElementById('profileName')) document.getElementById('profileName').textContent = `${d.ad} ${d.soyad}`;
            studentDersler = d.takipDersleri || DERS_HAVUZU['LISE'];
        }
    });
    
    updateHomeworkMetrics();
    loadActiveGoalsForDashboard();
}

function updateHomeworkMetrics() {
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"));
    getDocs(q).then(snapshot => {
        let total = 0, done = 0;
        const today = new Date().toISOString().split('T')[0];
        let overdueHtml = '';
        
        snapshot.forEach(doc => {
            const d = doc.data();
            // Basit haftalık hesaplama
            total++;
            if(d.durum === 'tamamlandi') done++;
            
            if(d.bitisTarihi < today && d.durum !== 'tamamlandi') {
                overdueHtml += `<div class="bg-red-50 p-2 rounded text-xs text-red-700 border border-red-100 mb-1 flex justify-between"><span>${d.title}</span><span>${formatDateTR(d.bitisTarihi)}</span></div>`;
            }
        });
        
        const percent = total === 0 ? 0 : (done / total) * 100;
        document.getElementById('haftalikIlerlemeText').textContent = `${done} / ${total}`;
        document.getElementById('haftalikIlerlemeBar').style.width = `${percent}%`;
        document.getElementById('gecikmisOdevlerList').innerHTML = overdueHtml || '<p class="text-center text-gray-400 text-xs">Gecikmiş ödev yok.</p>';
    });
}

function loadActiveGoalsForDashboard() {
    const list = document.getElementById('dashboardHedefList');
    if(!list) return;
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), where("durum", "!=", "tamamlandi"), limit(3));
    
    if(listeners.activeGoals) listeners.activeGoals();
    listeners.activeGoals = onSnapshot(q, (snap) => {
        if(snap.empty) { list.innerHTML = '<p class="text-center text-gray-400 text-xs">Aktif hedef yok.</p>'; return; }
        list.innerHTML = snap.docs.map(d => `<div class="bg-white p-3 rounded shadow-sm border border-gray-100 mb-2"><p class="text-sm font-medium">${d.data().title}</p></div>`).join('');
    });
}


// =================================================================
// 7. MODAL İŞLEMLERİ VE GLOBAL HELPERLAR
// =================================================================

// Helper Fonksiyonları Global Scope'a Ekle
window.toggleOdev = async (id, status) => {
    await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler", id), {
        durum: status === 'tamamlandi' ? 'devam' : 'tamamlandi'
    });
    // Otomatik dinleyici güncelleyecektir
};

window.toggleAccordion = (btn) => {
    const content = btn.nextElementSibling;
    const icon = btn.querySelector('i');
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) { content.classList.add('hidden'); btn.setAttribute('aria-expanded', 'false'); icon.classList.remove('rotate-180'); btn.classList.replace('bg-purple-50', 'bg-white'); }
    else { content.classList.remove('hidden'); btn.setAttribute('aria-expanded', 'true'); icon.classList.add('rotate-180'); btn.classList.replace('bg-white', 'bg-purple-50'); }
};

window.saveInput = (input) => {
    const val = parseInt(input.value) || 0;
    if (val !== parseInt(input.defaultValue)) {
        const ref = collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi");
        const data = { tarih: input.dataset.tarih, ders: input.dataset.ders, adet: val, konu: "Genel", onayDurumu: 'bekliyor', kocId: coachId, eklenmeTarihi: serverTimestamp() };
        if(input.dataset.docId) updateDoc(doc(ref, input.dataset.docId), { adet: val, onayDurumu: 'bekliyor' });
        else addDoc(ref, data).then(d => input.dataset.docId = d.id);
        input.parentElement.classList.add('border-green-500'); setTimeout(() => input.parentElement.classList.remove('border-green-500'), 1000);
    }
};
window.toggleRoutines = (btn) => { btn.nextElementSibling.classList.toggle('hidden'); };

// Modal Kapatıcılar
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => e.currentTarget.closest('.fixed').classList.add('hidden'));
});

// Deneme Modal Aç
const openDenemeModal = () => {
    document.getElementById('modalDenemeEkle').classList.remove('hidden');
    renderDenemeInputs('TYT');
    document.getElementById('inpDenemeTarih').value = new Date().toISOString().split('T')[0];
};
if(document.getElementById('btnOpenDenemeEkle')) document.getElementById('btnOpenDenemeEkle').onclick = openDenemeModal;

function renderDenemeInputs(tur) {
    const container = document.getElementById('denemeDersContainer');
    if(!container) return;
    container.innerHTML = '';
    const dersler = SINAV_DERSLERI[tur] || SINAV_DERSLERI['Diger'];
    dersler.forEach(ders => {
        container.innerHTML += `<div class="flex items-center justify-between text-sm py-2 border-b last:border-0"><span class="w-24 truncate">${ders}</span><div class="flex gap-2"><input type="number" placeholder="D" class="inp-deneme-d w-12 p-1 border rounded text-center" data-ders="${ders}"><input type="number" placeholder="Y" class="inp-deneme-y w-12 p-1 border rounded text-center" data-ders="${ders}"><input type="number" placeholder="B" class="inp-deneme-b w-12 p-1 border rounded text-center" data-ders="${ders}"></div></div>`;
    });
}
document.getElementById('inpDenemeTur').onchange = (e) => renderDenemeInputs(e.target.value);
document.getElementById('btnSaveDeneme').onclick = async () => {
    const ad = document.getElementById('inpDenemeAd').value || "Deneme";
    const tur = document.getElementById('inpDenemeTur').value;
    const tarih = document.getElementById('inpDenemeTarih').value;
    let totalNet = 0; const netler = {};
    document.querySelectorAll('.inp-deneme-d').forEach(inp => {
        const d = parseInt(inp.value)||0, y = parseInt(inp.parentElement.querySelector('.inp-deneme-y').value)||0;
        const net = d - (y / (tur==='LGS'?3:4)); totalNet += net;
        netler[inp.dataset.ders] = {d, y, net: net.toFixed(2)};
    });
    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), { ad, tur, tarih, toplamNet: totalNet, netler, onayDurumu: 'bekliyor', kocId: coachId, studentAd: document.getElementById('headerStudentName').textContent, eklenmeTarihi: serverTimestamp() });
    document.getElementById('modalDenemeEkle').classList.add('hidden');
    showToast(`Kaydedildi: ${totalNet.toFixed(2)} Net`);
};

// Soru Modal
const modalSoru = document.getElementById('modalSoruEkle');
if(document.getElementById('btnOpenSoruEkle')) document.getElementById('btnOpenSoruEkle').onclick = () => modalSoru.classList.remove('hidden');
document.getElementById('btnSaveModalSoru').onclick = async () => {
    const ders = document.getElementById('inpSoruDers').value;
    const adet = parseInt(document.getElementById('inpSoruAdet').value);
    const tarih = document.getElementById('inpModalSoruTarih').value;
    if(ders && adet) {
        await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), { tarih, ders, adet, konu: "Hızlı", onayDurumu: 'bekliyor', kocId: coachId, eklenmeTarihi: serverTimestamp() });
        modalSoru.classList.add('hidden'); showToast('Kaydedildi');
    }
};

// Grafik ve İstatistik
function calculateDenemeStats(denemeler) {
    const onayli = denemeler.filter(d => d.onayDurumu === 'onaylandi');
    let max = 0, total = 0;
    onayli.forEach(d => { const n = parseFloat(d.toplamNet); total += n; if(n > max) max = n; });
    const avg = onayli.length ? (total/onayli.length) : 0;
    document.getElementById('studentKpiAvg').textContent = avg.toFixed(2);
    document.getElementById('studentKpiMax').textContent = max.toFixed(2);
    document.getElementById('studentKpiTotal').textContent = denemeler.length;
    renderStudentDenemeChart(onayli);
}
function renderStudentDenemeChart(denemeler) {
    const ctx = document.getElementById('studentDenemeChart'); if(!ctx) return;
    const data = denemeler.sort((a,b) => a.tarih.localeCompare(b.tarih)).slice(-10);
    if (denemeChartInstance) denemeChartInstance.destroy();
    denemeChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: data.map(d => formatDateTR(d.tarih).slice(0,5)), datasets: [{ label: 'Net', data: data.map(d => d.toplamNet), borderColor: '#7c3aed', tension: 0.4 }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { display: false } } }
    });
}

// Soru Takibi Grid
async function renderSoruTakibiGrid() {
    const container = document.getElementById('weeklyAccordion'); if(!container) return;
    container.innerHTML = '<p class="text-center py-4 text-gray-400">Yükleniyor...</p>';
    const dates = getWeekDates(currentWeekOffset);
    document.getElementById('weekRangeTitle').textContent = `${formatDateTR(dates[0].dateStr)} - ${formatDateTR(dates[6].dateStr)}`;
    document.getElementById('prevWeekBtn').onclick = () => { currentWeekOffset--; renderSoruTakibiGrid(); };
    document.getElementById('nextWeekBtn').onclick = () => { currentWeekOffset++; renderSoruTakibiGrid(); };

    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), where("tarih", ">=", dates[0].dateStr), where("tarih", "<=", dates[6].dateStr));
    const snap = await getDocs(q);
    const data = []; snap.forEach(d => data.push({id: d.id, ...d.data()}));

    container.innerHTML = dates.map(day => {
        const isToday = day.isToday;
        return `
        <div class="accordion-item border-b last:border-0">
            <button class="accordion-header w-full flex justify-between p-4 rounded-xl border mb-2 ${isToday?'bg-purple-50 border-purple-500 text-purple-700':'bg-white border-gray-200'}" onclick="toggleAccordion(this)" aria-expanded="${isToday}">
                <span class="font-bold">${day.dayNum} ${day.dayName}</span><i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="accordion-content ${isToday?'':'hidden'} px-1 pb-4">
                <div class="grid grid-cols-2 gap-3 mb-4">
                    ${studentDersler.map(ders => {
                        const r = data.find(d => d.tarih === day.dateStr && d.ders === ders);
                        return `<div class="subject-card"><label class="text-xs font-bold text-center w-full truncate">${ders}</label><input type="number" class="text-3xl font-bold text-center w-full outline-none" placeholder="0" value="${r?r.adet:''}" data-tarih="${day.dateStr}" data-ders="${ders}" data-doc-id="${r?r.id:''}" onblur="saveInput(this)"></div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    }).join('');
}
function getWeekDates(offset) {
    const d = ['Paz','Sal','Çar','Per','Cum','Cmt','Paz'], w = [], t = new Date();
    const m = new Date(t.getFullYear(), t.getMonth(), t.getDate() - (t.getDay()||7) + 1 + (offset*7));
    for(let i=0; i<7; i++) { const c = new Date(m); c.setDate(m.getDate()+i); w.push({dateStr:c.toISOString().split('T')[0], dayName:d[i], dayNum:c.getDate(), isToday:c.toDateString()===t.toDateString()}); }
    return w;
}

// Bildirim ve Mesaj
function loadNotifications() { /* ... */ }
function listenUnreadMessages() { /* ... */ }
async function markMessagesAsRead() { /* ... */ }
function showToast(msg, isError) { 
    const t = document.getElementById('toast'); if(!t) return; t.textContent = msg; t.classList.remove('hidden', 'opacity-0');
    setTimeout(() => t.classList.add('hidden'), 2000);
}
function formatDateTR(d) { if(!d) return ''; const [y,m,da] = d.split('-'); return `${da}.${m}.${y}`; }

document.getElementById('btnLogout').onclick = () => signOut(auth);
