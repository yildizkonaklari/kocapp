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
const motivasyonSozleri = ["Başarı bir yolculuktur.", "Bugün dünden daha iyi ol."];
let denemeChartInstance = null;
let currentCalDate = new Date();
let currentWeekOffset = 0;

// Dinleyiciler
let listeners = { chat: null, ajanda: null, hedefler: null, odevler: null, denemeler: null, upcomingAjanda: null, notifications: null, activeGoals: null, unreadMsg: null };
const DERS_HAVUZU = { 'ORTAOKUL': ["Türkçe", "Matematik"], 'LISE': ["Türk Dili ve Edebiyatı", "Matematik"] };
const SINAV_DERSLERI = { 'TYT': ['Türkçe', 'Sosyal', 'Matematik', 'Fen'], 'AYT': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'], 'LGS': ['Türkçe', 'Matematik', 'Fen'] };

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
// 4. HEADER
// =================================================================
function enableHeaderIcons() {
    const btnMsg = document.getElementById('btnHeaderMessages');
    if(btnMsg) btnMsg.onclick = () => document.querySelector('.nav-btn[data-target="tab-messages"]')?.click();

    const btnNotif = document.getElementById('btnHeaderNotifications');
    const dropNotif = document.getElementById('notificationDropdown');
    if(btnNotif) {
        btnNotif.onclick = (e) => { e.stopPropagation(); dropNotif.classList.toggle('hidden'); document.getElementById('headerNotificationDot').classList.add('hidden'); };
        document.getElementById('btnCloseNotifications').onclick = () => dropNotif.classList.add('hidden');
        document.addEventListener('click', (e) => { if (!dropNotif.contains(e.target) && !btnNotif.contains(e.target)) dropNotif.classList.add('hidden'); });
        loadNotifications();
    }
    listenUnreadMessages();
}
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
// 5. DASHBOARD
// =================================================================
async function loadDashboardData() {
    if (!coachId || !studentDocId) return;
    if(document.getElementById('motivasyonSozu')) document.getElementById('motivasyonSozu').textContent = `"${motivasyonSozleri[0]}"`;
    
    const snap = await getDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId));
    if (snap.exists()) {
        const d = snap.data();
        if(document.getElementById('headerStudentName')) document.getElementById('headerStudentName').textContent = d.ad;
        if(document.getElementById('profileName')) document.getElementById('profileName').textContent = `${d.ad} ${d.soyad}`;
        if(document.getElementById('profileClass')) document.getElementById('profileClass').textContent = d.sinif;
        if(document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = currentUser.email;
        if(document.getElementById('profileAvatar')) document.getElementById('profileAvatar').textContent = d.ad[0].toUpperCase();
        studentDersler = d.takipDersleri || DERS_HAVUZU['LISE'];
    }
    updateHomeworkMetrics();
    loadActiveGoalsForDashboard();
}

async function updateHomeworkMetrics() {
    const q = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"));
    const snap = await getDocs(q);
    const today = new Date().toISOString().split('T')[0];
    let total=0, done=0, overdue=[];
    snap.forEach(doc => {
        const d = doc.data(); total++;
        if(d.durum==='tamamlandi') done++;
        if(d.bitisTarihi < today && d.durum!=='tamamlandi') overdue.push({...d});
    });
    const p = total===0 ? 0 : (done/total)*100;
    if(document.getElementById('haftalikIlerlemeText')) document.getElementById('haftalikIlerlemeText').textContent = `${done}/${total}`;
    if(document.getElementById('haftalikIlerlemeBar')) document.getElementById('haftalikIlerlemeBar').style.width = `${p}%`;
    const list = document.getElementById('gecikmisOdevlerList');
    if(list) list.innerHTML = overdue.length ? overdue.map(o=>`<div class="bg-red-50 p-2 rounded text-xs text-red-700 mb-1 border border-red-100">${o.title}</div>`).join('') : '<p class="text-center text-xs text-gray-400">Gecikmiş ödev yok.</p>';
}

function loadActiveGoalsForDashboard() {
    const list = document.getElementById('dashboardHedefList'); if(!list) return;
    listeners.activeGoals = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "hedefler"), where("durum","!=","tamamlandi"), limit(3)), (snap) => {
        list.innerHTML = snap.empty ? '<p class="text-center text-xs text-gray-400">Aktif hedef yok.</p>' : snap.docs.map(d=>`<div class="bg-white p-2 rounded shadow-sm border border-gray-100 mb-2"><p class="text-sm text-gray-700">${d.data().title}</p></div>`).join('');
    });
}

// =================================================================
// 6. TAB NAVİGASYONU (BUTON RENK DEĞİŞTİRME)
// =================================================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const currentBtn = e.currentTarget.closest('.nav-btn');
        const targetId = currentBtn.dataset.target;

        // Tüm butonları pasif yap
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'text-indigo-600');
            b.classList.add('text-gray-400');
        });
        
        // Tıklananı aktif yap
        currentBtn.classList.add('active', 'text-indigo-600');
        currentBtn.classList.remove('text-gray-400');

        // ORTA BUTON RENK YÖNETİMİ
        const centerIcon = document.querySelector('.bottom-nav-center-btn');
        if(centerIcon) {
            if (targetId === 'tab-tracking') {
                // Takip sayfasındaysak: Mavi Zemin, Beyaz İkon
                centerIcon.classList.remove('bg-white', 'text-indigo-600');
                centerIcon.classList.add('bg-indigo-600', 'text-white');
            } else {
                // Diğer sayfalardaysak: Beyaz Zemin, Mavi İkon
                centerIcon.classList.remove('bg-indigo-600', 'text-white');
                centerIcon.classList.add('bg-white', 'text-indigo-600');
            }
        }

        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        for(let k in listeners) if(listeners[k] && k!=='notifications' && k!=='activeGoals' && k!=='unreadMsg') { listeners[k](); listeners[k]=null; }

        if (targetId === 'tab-homework') loadHomeworksTab();
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

// --- ÖDEVLER ---
function loadHomeworksTab() {
    const list = document.getElementById('studentOdevList'); if(!list) return;
    list.innerHTML = '<p class="text-center py-4 text-gray-400">Yükleniyor...</p>';
    listeners.odevler = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"), orderBy("bitisTarihi")), (snap) => {
        list.innerHTML = snap.empty ? '<p class="text-center text-gray-400">Ödev yok.</p>' : snap.docs.map(d => {
            const data = d.data(); const isDone = data.durum==='tamamlandi';
            return `<div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3 ${isDone?'opacity-60':''}"><button class="text-xl" onclick="toggleOdev('${d.id}','${data.durum}')"><i class="${isDone?'fa-solid fa-circle-check text-green-500':'fa-regular fa-circle text-gray-300'}"></i></button><div class="flex-1"><h4 class="font-bold text-sm ${isDone?'line-through':''}">${data.title}</h4><p class="text-xs text-gray-500">${data.aciklama||''}</p></div></div>`;
        }).join('');
    });
}
window.toggleOdev = async (id, status) => { await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler", id), { durum: status==='tamamlandi'?'devam':'tamamlandi' }); };

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
    // Ekle butonu
    const btn = document.getElementById('btnAddNewDeneme');
    if(btn) { const n=btn.cloneNode(true); btn.parentNode.replaceChild(n,btn); n.onclick=openDenemeModal; }
    
    listeners.denemeler = onSnapshot(query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), orderBy("tarih", "desc")), (snap) => {
        const data = []; snap.forEach(d => data.push({id:d.id, ...d.data()}));
        // KPI
        const onayli = data.filter(x=>x.onayDurumu==='onaylandi');
        let totalNet=0, maxNet=0; onayli.forEach(x=>{ const n=parseFloat(x.toplamNet); totalNet+=n; if(n>maxNet) maxNet=n; });
        if(document.getElementById('studentKpiAvg')) document.getElementById('studentKpiAvg').textContent = (onayli.length ? (totalNet/onayli.length) : 0).toFixed(2);
        if(document.getElementById('studentKpiMax')) document.getElementById('studentKpiMax').textContent = maxNet.toFixed(2);
        if(document.getElementById('studentKpiTotal')) document.getElementById('studentKpiTotal').textContent = data.length;
        
        // Grafik
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
        return `<div class="accordion-item border-b last:border-0"><button class="accordion-header w-full flex justify-between p-4 rounded-xl border mb-2 ${isToday?'bg-purple-50 border-purple-500 text-purple-700':'bg-white border-gray-200'}" onclick="toggleAccordion(this)" aria-expanded="${isToday}"><span class="font-bold">${day.dayNum} ${day.dayName}</span><i class="fa-solid fa-chevron-down"></i></button><div class="accordion-content ${isToday?'':'hidden'} px-1 pb-4"><div class="grid grid-cols-2 gap-3 mb-4">${studentDersler.map(ders => {
            const r = data.find(d => d.tarih === day.dateStr && d.ders === ders);
            return `<div class="subject-card"><label class="text-xs font-bold text-center w-full truncate">${ders}</label><input type="number" class="text-3xl font-bold text-center w-full outline-none bg-transparent placeholder-gray-200" placeholder="0" value="${r?r.adet:''}" data-tarih="${day.dateStr}" data-ders="${ders}" data-doc-id="${r?r.id:''}" onblur="saveInput(this)"></div>`;
        }).join('')}</div></div></div>`;
    }).join('');
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
document.getElementById('btnOpenSoruEkle').onclick = () => { document.getElementById('inpSoruDers').value=""; document.getElementById('inpSoruAdet').value=""; document.getElementById('inpModalSoruTarih').value=new Date().toISOString().split('T')[0]; modalSoru.classList.remove('hidden'); };
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
