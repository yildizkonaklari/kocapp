// ... (Mevcut Firebase importları) ...
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, getDoc, getDocs, collection, query, where, addDoc, updateDoc, serverTimestamp, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FİREBASE AYARLARI (GÜNCELLEYİN) ---
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

// Global State
let currentUser = null;
let coachId = null;
let studentDocId = null;

// --- BAŞLANGIÇ ---
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
                document.getElementById('modalMatchProfile').classList.remove('hidden');
            }
        }
    } catch (error) { console.error(error); }
}

// --- DASHBOARD VERİLERİ ---
async function loadDashboardData() {
    // Profil Bilgileri
    const studentRef = doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
        const data = studentSnap.data();
        document.getElementById('headerStudentName').textContent = data.ad;
        document.getElementById('profileName').textContent = `${data.ad} ${data.soyad}`;
        document.getElementById('profileClass').textContent = data.sinif;
        document.getElementById('profileAvatar').textContent = data.ad[0] + data.soyad[0];
    }

    loadHomeworks();
    loadStats();
}

// ... (loadHomeworks fonksiyonu aynı kalacak) ...
async function loadHomeworks() {
    const listEl = document.getElementById('studentOdevList');
    const countEl = document.getElementById('cardPendingOdev');
    
    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler"),
        orderBy("bitisTarihi", "asc"),
        limit(20)
    );

    const snapshot = await getDocs(q);
    let html = '';
    let pendingCount = 0;

    if (snapshot.empty) {
        html = '<p class="text-center text-gray-400 text-sm py-4">Henüz ödevin yok.</p>';
    } else {
        snapshot.forEach(doc => {
            const odev = doc.data();
            const isDone = odev.durum === 'tamamlandi';
            if (!isDone) pendingCount++;

            const typeClass = isDone ? 'opacity-50' : '';
            const iconClass = isDone ? 'fa-circle-check text-green-500' : 'fa-circle text-gray-300';

            html += `
                <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3 ${typeClass}">
                    <button class="mt-1 text-xl ${iconClass} btn-toggle-odev" data-id="${doc.id}" data-status="${odev.durum}">
                        <i class="${isDone ? 'fa-solid' : 'fa-regular'}"></i>
                    </button>
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-800 text-sm ${isDone ? 'line-through' : ''}">${odev.title}</h4>
                        <p class="text-xs text-gray-500 mt-1 line-clamp-2">${odev.aciklama || ''}</p>
                        <div class="flex items-center gap-2 mt-2">
                             ${odev.link ? `<a href="${odev.link}" target="_blank" class="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded">Link</a>` : ''}
                             <span class="text-xs text-gray-400 ml-auto">${odev.bitisTarihi}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    listEl.innerHTML = html;
    countEl.textContent = pendingCount;

    // Listenerlar
    document.querySelectorAll('.btn-toggle-odev').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const newStatus = e.currentTarget.dataset.status === 'tamamlandi' ? 'devam' : 'tamamlandi';
            await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "odevler", id), { durum: newStatus });
            loadHomeworks(); 
        });
    });
}

async function loadStats() {
    // Son girilenleri alıp "Son Hareketler" listesine ekleyelim
    const qSoru = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), orderBy("eklenmeTarihi", "desc"), limit(5));
    const snapSoru = await getDocs(qSoru);
    
    let totalSoru = 0;
    let activityHtml = '';

    snapSoru.forEach(doc => {
        const data = doc.data();
        const toplam = data.dogru + data.yanlis + data.bos;
        totalSoru += toplam;
        
        activityHtml += `
            <div class="flex justify-between items-center p-3">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">
                        <i class="fa-solid fa-pen"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-800">${data.ders}</p>
                        <p class="text-xs text-gray-500">${toplam} Soru • ${data.konu}</p>
                    </div>
                </div>
                <span class="text-xs text-gray-400">${new Date(data.tarih).toLocaleDateString('tr-TR', {day:'numeric', month:'short'})}</span>
            </div>
        `;
    });

    document.getElementById('cardTotalSoru').textContent = totalSoru; // Basit toplama (geliştirilebilir)
    
    const activityEl = document.getElementById('recentActivityList');
    if(activityHtml) activityEl.innerHTML = activityHtml;
}

// --- MODAL YÖNETİMİ ---
document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', () => {
    document.getElementById('modalSoruEkle').classList.add('hidden');
    document.getElementById('modalDenemeEkle').classList.add('hidden');
    document.getElementById('modalPomodoro').classList.add('hidden');
}));

// Soru Ekleme (Mevcut)
document.getElementById('btnOpenSoruEkle').addEventListener('click', () => document.getElementById('modalSoruEkle').classList.remove('hidden'));
document.getElementById('btnSaveSoru').addEventListener('click', async () => {
    // ... (Mevcut kaydetme mantığı) ...
    const ders = document.getElementById('inpSoruDers').value;
    const konu = document.getElementById('inpSoruKonu').value;
    const d = parseInt(document.getElementById('inpSoruD').value) || 0;
    const y = parseInt(document.getElementById('inpSoruY').value) || 0;
    const b = parseInt(document.getElementById('inpSoruB').value) || 0;

    if(!ders) return showToast('Ders seçin');

    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), {
        tarih: new Date().toISOString().split('T')[0],
        ders, konu, dogru: d, yanlis: y, bos: b,
        eklenmeTarihi: serverTimestamp()
    });
    document.getElementById('modalSoruEkle').classList.add('hidden');
    showToast('Soru Kaydedildi');
    loadStats();
});

// --- YENİ: DENEME EKLEME ---
const dersListeleri = {
    'TYT': ['Türkçe', 'Sosyal', 'Matematik', 'Fen'],
    'AYT': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Edebiyat', 'Tarih-1', 'Coğrafya-1'],
    'LGS': ['Türkçe', 'Matematik', 'Fen', 'İnkılap', 'Din', 'İngilizce'],
    'Diger': ['Genel']
};

document.getElementById('btnOpenDenemeEkle').addEventListener('click', () => {
    document.getElementById('modalDenemeEkle').classList.remove('hidden');
    renderDenemeInputs('TYT'); // Varsayılan
});

document.getElementById('inpDenemeTur').addEventListener('change', (e) => {
    renderDenemeInputs(e.target.value);
});

function renderDenemeInputs(tur) {
    const container = document.getElementById('denemeDersContainer');
    container.innerHTML = '';
    const dersler = dersListeleri[tur] || dersListeleri['Diger'];

    dersler.forEach(ders => {
        container.innerHTML += `
            <div class="flex items-center justify-between text-sm">
                <span class="text-gray-700 w-24 truncate">${ders}</span>
                <div class="flex gap-2">
                    <input type="number" placeholder="D" class="inp-deneme-d w-14 p-2 bg-white border border-gray-200 rounded-lg text-center text-sm focus:border-indigo-500 outline-none" data-ders="${ders}">
                    <input type="number" placeholder="Y" class="inp-deneme-y w-14 p-2 bg-white border border-gray-200 rounded-lg text-center text-sm focus:border-indigo-500 outline-none" data-ders="${ders}">
                </div>
            </div>
        `;
    });
}

document.getElementById('btnSaveDeneme').addEventListener('click', async () => {
    const ad = document.getElementById('inpDenemeAd').value || "Deneme";
    const tur = document.getElementById('inpDenemeTur').value;
    const tarih = document.getElementById('inpDenemeTarih').value || new Date().toISOString().split('T')[0];
    
    let totalNet = 0;
    const netler = {};
    const katsayi = tur === 'LGS' ? 3 : 4;

    document.querySelectorAll('.inp-deneme-d').forEach(input => {
        const ders = input.dataset.ders;
        const d = parseInt(input.value) || 0;
        // Yanlış inputunu bul
        const yInput = input.parentElement.querySelector('.inp-deneme-y');
        const y = parseInt(yInput.value) || 0;
        
        const net = d - (y / katsayi);
        totalNet += net;
        
        // Format: turkce_d, turkce_y
        const safeKey = ders.toLowerCase().replace(/ /g, '_').replace(/-/g, '_').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
        netler[`${safeKey}_d`] = d;
        netler[`${safeKey}_y`] = y;
    });

    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "denemeler"), {
        ad, tur, tarih,
        toplamNet: totalNet,
        netler: netler,
        eklenmeTarihi: serverTimestamp()
    });

    document.getElementById('modalDenemeEkle').classList.add('hidden');
    showToast(`Deneme Kaydedildi: ${totalNet.toFixed(2)} Net`);
});

// --- YENİ: POMODORO SAYACI ---
let timerInterval;
let timeLeft = 25 * 60; // 25 dakika
let isTimerRunning = false;

document.getElementById('btnOpenPomodoro').addEventListener('click', () => document.getElementById('modalPomodoro').classList.remove('hidden'));

document.getElementById('btnTimerStart').addEventListener('click', () => {
    if (isTimerRunning) {
        // Durdur
        clearInterval(timerInterval);
        isTimerRunning = false;
        document.getElementById('btnTimerStart').innerHTML = '<i class="fa-solid fa-play"></i>';
        document.getElementById('timerCircle').classList.remove('timer-active');
    } else {
        // Başlat
        isTimerRunning = true;
        document.getElementById('btnTimerStart').innerHTML = '<i class="fa-solid fa-pause"></i>';
        document.getElementById('timerCircle').classList.add('timer-active');
        
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                isTimerRunning = false;
                document.getElementById('timerCircle').classList.remove('timer-active');
                document.getElementById('timerStatus').textContent = "MOLA ZAMANI!";
                // Ses çalınabilir
            }
        }, 1000);
    }
});

document.getElementById('btnTimerReset').addEventListener('click', () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timeLeft = 25 * 60;
    updateTimerDisplay();
    document.getElementById('btnTimerStart').innerHTML = '<i class="fa-solid fa-play"></i>';
    document.getElementById('timerCircle').classList.remove('timer-active');
    document.getElementById('timerStatus').textContent = "DERS";
});

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timerDisplay').textContent = `${m}:${s}`;
}

// --- YARDIMCILAR ---
// ... (showToast, Tab Navigation vs. aynı) ...
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    t.classList.remove('opacity-0');
    setTimeout(() => {
        t.classList.add('opacity-0');
        setTimeout(() => t.classList.add('hidden'), 300);
    }, 2000);
}

document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'text-indigo-600');
            b.classList.add('text-gray-400');
        });
        e.currentTarget.classList.add('active', 'text-indigo-600');
        e.currentTarget.classList.remove('text-gray-400');
        
        const targetId = e.currentTarget.dataset.target;
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');
    });
});
// ... (Mevcut kodlar) ...

// --- SORU KAYDETME (GÜNCELLENDİ) ---
document.getElementById('btnSaveSoru').addEventListener('click', async () => {
    const ders = document.getElementById('inpSoruDers').value;
    const konu = document.getElementById('inpSoruKonu').value;
    const d = parseInt(document.getElementById('inpSoruD').value) || 0;
    const y = parseInt(document.getElementById('inpSoruY').value) || 0;
    const b = parseInt(document.getElementById('inpSoruB').value) || 0;

    if(!ders) return showToast('Ders seçin');

    await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), {
        tarih: new Date().toISOString().split('T')[0],
        ders, konu, dogru: d, yanlis: y, bos: b,
        onayDurumu: 'bekliyor', // YENİ: Varsayılan olarak onay bekliyor
        eklenmeTarihi: serverTimestamp()
    });

    document.getElementById('modalSoruEkle').classList.add('hidden');
    showToast('Soru kaydedildi, koç onayı bekleniyor.'); // Mesaj güncellendi
    loadStats();
});

// --- İSTATİSTİKLER VE SON HAREKETLER (GÜNCELLENDİ) ---
async function loadStats() {
    const qSoru = query(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), orderBy("eklenmeTarihi", "desc"), limit(5));
    const snapSoru = await getDocs(qSoru);
    
    let totalSoru = 0;
    let activityHtml = '';

    snapSoru.forEach(doc => {
        const data = doc.data();
        const toplam = data.dogru + data.yanlis + data.bos;
        
        // Sadece onaylanmış soruları toplam sayıya dahil et (Opsiyonel, şimdilik hepsini sayalım motive olsun)
        totalSoru += toplam; 
        
        // Durum İkonu
        let statusIcon = '';
        if (data.onayDurumu === 'bekliyor') {
            statusIcon = `<span class="text-yellow-500 text-xs ml-2" title="Onay Bekliyor"><i class="fa-solid fa-clock"></i></span>`;
        } else {
            statusIcon = `<span class="text-green-500 text-xs ml-2" title="Onaylandı"><i class="fa-solid fa-circle-check"></i></span>`;
        }
        
        activityHtml += `
            <div class="flex justify-between items-center p-3">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full ${data.onayDurumu === 'bekliyor' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'} flex items-center justify-center text-xs">
                        <i class="fa-solid fa-pen"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-800">
                            ${data.ders} ${statusIcon}
                        </p>
                        <p class="text-xs text-gray-500">${toplam} Soru • ${data.konu}</p>
                    </div>
                </div>
                <span class="text-xs text-gray-400">${new Date(data.tarih).toLocaleDateString('tr-TR', {day:'numeric', month:'short'})}</span>
            </div>
        `;
    });

    document.getElementById('cardTotalSoru').textContent = totalSoru;
    const activityEl = document.getElementById('recentActivityList');
    if(activityHtml) activityEl.innerHTML = activityHtml;
}
// ... (Mevcut kodlar) ...

// --- MODAL İŞLEMLERİ ---

// YENİ: Ders seçimi değişince arayüzü güncelle (Kitap Okuma Kontrolü)
document.getElementById('inpSoruDers').addEventListener('change', (e) => {
    const val = e.target.value;
    const divSoru = document.getElementById('divSoruInputs');
    const divKitap = document.getElementById('divKitapInputs');
    const inpKonu = document.getElementById('inpSoruKonu');

    if (val === 'Kitap Okuma') {
        // Kitap modu: D/Y/B gizle, Sayfa Sayısı göster
        divSoru.classList.add('hidden');
        divKitap.classList.remove('hidden');
        inpKonu.placeholder = "Kitap Adı (Opsiyonel)";
    } else {
        // Standart mod
        divSoru.classList.remove('hidden');
        divKitap.classList.add('hidden');
        inpKonu.placeholder = "Konu (Örn: Türev)";
    }
});

// YENİ: Kaydetme Fonksiyonu (Rutin Desteğiyle)
document.getElementById('btnSaveSoru').addEventListener('click', async () => {
    const ders = document.getElementById('inpSoruDers').value;
    let konu = document.getElementById('inpSoruKonu').value.trim();
    
    let d = 0, y = 0, b = 0;

    if (!ders) return showToast('Lütfen ders veya rutin seçin');

    if (ders === 'Kitap Okuma') {
        // Kitap okumada "Doğru" alanını "Sayfa Sayısı" olarak kullanıyoruz
        d = parseInt(document.getElementById('inpSayfaSayisi').value) || 0;
        if (d === 0) return showToast('Sayfa sayısı giriniz');
        if (!konu) konu = "Genel Okuma"; // Kitap adı girilmezse
    } else {
        // Standart soru girişi
        d = parseInt(document.getElementById('inpSoruD').value) || 0;
        y = parseInt(document.getElementById('inpSoruY').value) || 0;
        b = parseInt(document.getElementById('inpSoruB').value) || 0;
        
        if (!konu) {
            if (ders === 'Paragraf' || ders === 'Problem') konu = "Günlük Rutin";
            else konu = "Genel Tekrar";
        }
    }

    try {
        await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "soruTakibi"), {
            tarih: new Date().toISOString().split('T')[0],
            ders: ders,
            konu: konu,
            dogru: d, // Kitap için sayfa sayısı, diğerleri için doğru sayısı
            yanlis: y,
            bos: b,
            onayDurumu: 'bekliyor',
            eklenmeTarihi: serverTimestamp()
        });

        // Formu temizle ve kapat
        document.getElementById('modalSoruEkle').classList.add('hidden');
        document.getElementById('inpSoruDers').value = "";
        document.getElementById('inpSoruKonu').value = "";
        document.getElementById('inpSoruD').value = "";
        document.getElementById('inpSoruY').value = "";
        document.getElementById('inpSoruB').value = "";
        document.getElementById('inpSayfaSayisi').value = "";
        // UI'ı resetle
        document.getElementById('divSoruInputs').classList.remove('hidden');
        document.getElementById('divKitapInputs').classList.add('hidden');

        showToast('Kaydedildi, onay bekleniyor.');
        loadStats();

    } catch (error) {
        console.error("Hata:", error);
        showToast("Bir hata oluştu.");
    }
});

// ... (Kalan loadStats vb. kodlar aynı, data.ders 'Kitap Okuma' ise UI'da farklı gösterebiliriz ama şimdilik standart listeleme de iş görür) ...
// ... (Mevcut kodlar) ...

// --- MESAJLAŞMA (YENİ EKLENDİ) ---
let studentChatUnsubscribe = null;

// Sekme değiştirme dinleyicisi (Mesajlar sekmesine geçince yükle)
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        if (targetId === 'tab-messages') {
            loadStudentMessages();
        }
    });
});

// Mesaj Gönderme
document.getElementById('studentChatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('studentMessageInput');
    const text = input.value.trim();
    
    if (!text) return;

    try {
        input.value = ''; // Temizle
        // Mesajı koçun altındaki öğrenci dökümanına ekle
        await addDoc(collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"), {
            text: text,
            gonderen: 'ogrenci', // Öğrenci gönderiyor
            tarih: serverTimestamp()
        });
        
        // Scroll en alta
        const container = document.getElementById('studentMessagesContainer');
        container.scrollTop = container.scrollHeight;

    } catch (error) {
        console.error("Mesaj hatası:", error);
        showToast("Mesaj gönderilemedi");
    }
});

function loadStudentMessages() {
    if (studentChatUnsubscribe) return; // Zaten dinleniyorsa tekrar başlatma

    const container = document.getElementById('studentMessagesContainer');
    const q = query(
        collection(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId, "mesajlar"),
        orderBy("tarih", "asc")
    );

    studentChatUnsubscribe = onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 opacity-60">
                    <i class="fa-regular fa-comments text-4xl"></i>
                    <p class="text-sm">Koçunla sohbete başla</p>
                </div>
            `;
            return;
        }

        snapshot.forEach(doc => {
            const msg = doc.data();
            const isMe = msg.gonderen === 'ogrenci';
            
            const div = document.createElement('div');
            div.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'}`;
            
            // Koç mesajları beyaz/gri, Öğrenci mesajları mavi/indigo
            div.innerHTML = `
                <div class="max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}">
                    <p>${msg.text}</p>
                    <p class="text-[10px] mt-1 ${isMe ? 'text-indigo-200 text-right' : 'text-gray-400'}">
                        ${msg.tarih ? new Date(msg.tarih.toDate()).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : ''}
                    </p>
                </div>
            `;
            container.appendChild(div);
        });

        // En alta kaydır
        container.scrollTop = container.scrollHeight;
    });
}
