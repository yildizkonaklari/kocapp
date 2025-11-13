// 1. Firebase Kütüphanelerini (SDK) içeri aktar
import { initializeApp, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc,
    addDoc,
    updateDoc,
    collection, 
    query, 
    where,
    onSnapshot,
    deleteDoc,
    orderBy,
    serverTimestamp,
    limit,
    increment,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// =================================================================
// 1. ADIM: firebaseConfig BİLGİLERİNİZ BURAYA EKLENDİ
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

// 2. DOM Elementlerini Seç
const loadingSpinner = document.getElementById("loadingSpinner");
const appContainer = document.getElementById("appContainer");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");
const mainContentTitle = document.getElementById("mainContentTitle");
const mainContentArea = document.getElementById("mainContentArea");

// Öğrenci Ekleme Modalı
const addStudentModal = document.getElementById("addStudentModal");
const closeModalButton = document.getElementById("closeModalButton");
const cancelModalButton = document.getElementById("cancelModalButton");
const saveStudentButton = document.getElementById("saveStudentButton");
const modalErrorMessage = document.getElementById("modalErrorMessage");
const studentDersSecimiContainer = document.getElementById("studentDersSecimiContainer"); // Ders seçimi

// Öğrenci Düzenleme Modalı
const editStudentModal = document.getElementById("editStudentModal");
const closeEditModalButton = document.getElementById("closeEditModalButton");
const cancelEditModalButton = document.getElementById("cancelEditModalButton");
const saveStudentChangesButton = document.getElementById("saveStudentChangesButton");
const editModalErrorMessage = document.getElementById("editModalErrorMessage");
const editStudentId = document.getElementById("editStudentId");
const editStudentName = document.getElementById("editStudentName");
const editStudentSurname = document.getElementById("editStudentSurname");
const editStudentClass = document.getElementById("editStudentClass");
const editStudentDersSecimiContainer = document.getElementById("editStudentDersSecimiContainer"); // Ders seçimi

// Deneme Ekleme Modalı
const addDenemeModal = document.getElementById("addDenemeModal");
const closeDenemeModalButton = document.getElementById("closeDenemeModalButton");
const cancelDenemeModalButton = document.getElementById("cancelDenemeModalButton");
const saveDenemeButton = document.getElementById("saveDenemeButton");
const denemeModalErrorMessage = document.getElementById("denemeModalErrorMessage");
const currentStudentIdForDeneme = document.getElementById("currentStudentIdForDeneme");
const denemeTuruSelect = document.getElementById("denemeTuru");
const denemeNetGirisAlani = document.getElementById("denemeNetGirisAlani");

// Soru Takibi Modalı
const addSoruModal = document.getElementById("addSoruModal");
const closeSoruModalButton = document.getElementById("closeSoruModalButton");
const cancelSoruModalButton = document.getElementById("cancelSoruModalButton");
const saveSoruButton = document.getElementById("saveSoruButton");
const soruModalErrorMessage = document.getElementById("soruModalErrorMessage");
const currentStudentIdForSoruTakibi = document.getElementById("currentStudentIdForSoruTakibi");

// Hedef Modalı
const addHedefModal = document.getElementById("addHedefModal");
const closeHedefModalButton = document.getElementById("closeHedefModalButton");
const cancelHedefModalButton = document.getElementById("cancelHedefModalButton");
const saveHedefButton = document.getElementById("saveHedefButton");
const hedefModalErrorMessage = document.getElementById("hedefModalErrorMessage");
const currentStudentIdForHedef = document.getElementById("currentStudentIdForHedef");

// Ödev Modalı
const addOdevModal = document.getElementById("addOdevModal");
const closeOdevModalButton = document.getElementById("closeOdevModalButton");
const cancelOdevModalButton = document.getElementById("cancelOdevModalButton");
const saveOdevButton = document.getElementById("saveOdevButton");
const odevModalErrorMessage = document.getElementById("odevModalErrorMessage");
const currentStudentIdForOdev = document.getElementById("currentStudentIdForOdev");

// Randevu Modalı
const addRandevuModal = document.getElementById("addRandevuModal");
const closeRandevuModalButton = document.getElementById("closeRandevuModalButton");
const cancelRandevuModalButton = document.getElementById("cancelRandevuModalButton");
const saveRandevuButton = document.getElementById("saveRandevuButton");
const randevuModalErrorMessage = document.getElementById("randevuModalErrorMessage");

// Muhasebe Modalları
const addTahsilatModal = document.getElementById("addTahsilatModal");
const closeTahsilatModalButton = document.getElementById("closeTahsilatModalButton");
const cancelTahsilatModalButton = document.getElementById("cancelTahsilatModalButton");
const saveTahsilatButton = document.getElementById("saveTahsilatButton");
const tahsilatModalErrorMessage = document.getElementById("tahsilatModalErrorMessage");

const addBorcModal = document.getElementById("addBorcModal");
const closeBorcModalButton = document.getElementById("closeBorcModalButton");
const cancelBorcModalButton = document.getElementById("cancelBorcModalButton");
const saveBorcButton = document.getElementById("saveBorcButton");
const borcModalErrorMessage = document.getElementById("borcModalErrorMessage");


// 3. Global Değişkenler
let auth;
let db;
let currentUserId = null; // Koçun kimliği (UID)
const appId = "kocluk-sistemi"; // Bu, student-auth.js ile eşleşmeli (veya config'den alınmalı)

const SINAV_DERSLERI = {
    'TYT': {
        netKural: 4,
        dersler: [
            { id: 'tyt_turkce', ad: 'Türkçe', soru: 40 },
            { id: 'tyt_tarih_sos', ad: 'Tarih (Sosyal)', soru: 5 },
            { id: 'tyt_cog_sos', ad: 'Coğrafya (Sosyal)', soru: 5 },
            { id: 'tyt_felsefe_sos', ad: 'Felsefe (Sosyal)', soru: 5 },
            { id: 'tyt_din_sos', ad: 'Din Kültürü (Sosyal)', soru: 5 },
            { id: 'tyt_temel_mat', ad: 'Temel Matematik', soru: 32 },
            { id: 'tyt_geometri', ad: 'Geometri (Mat)', soru: 8 },
            { id: 'tyt_fizik', ad: 'Fizik (Fen)', soru: 7 },
            { id: 'tyt_kimya', ad: 'Kimya (Fen)', soru: 7 },
            { id: 'tyt_biyoloji', ad: 'Biyoloji (Fen)', soru: 6 }
        ]
    },
    'AYT': {
        netKural: 4,
        dersler: [
            { id: 'ayt_edebiyat', ad: 'Türk Dili ve Edebiyatı', soru: 24 },
            { id: 'ayt_tarih1', ad: 'Tarih-1 (Edeb-Sos1)', soru: 10 },
            { id: 'ayt_cografya1', ad: 'Coğrafya-1 (Edeb-Sos1)', soru: 6 },
            { id: 'ayt_tarih2', ad: 'Tarih-2 (Sos-2)', soru: 11 },
            { id: 'ayt_cografya2', ad: 'Coğrafya-2 (Sos-2)', soru: 11 },
            { id: 'ayt_felsefe', ad: 'Felsefe Grubu (Sos-2)', soru: 12 },
            { id: 'ayt_din_sos2', ad: 'Din Kültürü (Sos-2)', soru: 6 },
            { id: 'ayt_mat', ad: 'Matematik (AYT)', soru: 40 },
            { id: 'ayt_fizik', ad: 'Fizik (Fen)', soru: 14 },
            { id: 'ayt_kimya', ad: 'Kimya (Fen)', soru: 13 },
            { id: 'ayt_biyoloji', ad: 'Biyoloji (Fen)', soru: 13 }
        ]
    },
    'LGS': {
        netKural: 3,
        dersler: [
            { id: 'lgs_turkce', ad: 'Türkçe', soru: 20 },
            { id: 'lgs_mat', ad: 'Matematik', soru: 20 },
            { id: 'lgs_fen', ad: 'Fen Bilimleri', soru: 20 },
            { id: 'lgs_inkilap', ad: 'T.C. İnkılap', soru: 10 },
            { id: 'lgs_din', ad: 'Din Kültürü', soru: 10 },
            { id: 'lgs_ingilizce', ad: 'Yabancı Dil', soru: 10 }
        ]
    },
    'YDS': {
        netKural: 0,
        dersler: [
            { id: 'yds_dil', ad: 'Yabancı Dil', soru: 80 }
        ]
    },
    'Diger': {
        netKural: 0,
        dersler: []
    }
};

const DERS_HAVUZU = {
    'ORTAOKUL': [ // 5, 6, 7, 8
        "Türkçe", "Matematik", "Fen Bilimleri", 
        "Sosyal Bilgiler", "T.C. İnkılap", "Din Kültürü", "İngilizce"
    ],
    'LISE': [ // 9, 10, 11, 12, Mezun
        "Türk Dili ve Edebiyatı", "Matematik", "Geometri",
        "Fizik", "Kimya", "Biyoloji",
        "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "İngilizce"
    ]
};

// Aktif dinleyicileri (unsubscribe functions) tutan global değişkenler
let studentUnsubscribe = null;
let soruTakibiUnsubscribe = null;
let hedeflerUnsubscribe = null;
let odevlerUnsubscribe = null;
let notlarUnsubscribe = null;
let ajandaUnsubscribe = null;
let muhasebeUnsubscribe = null;
let chatUnsubscribe = null;
let islemGecmisiUnsubscribe = null;

// Soru Takibi için Global Durum
let soruTakibiZaman = 'haftalik'; 
let soruTakibiOffset = 0; 

// ... (app.js dosyasının üst kısmı aynı) ...

// 4. Ana Uygulama Fonksiyonu (Başlatıcı)
async function main() {
    // Firebase'i başlat
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    setLogLevel('debug');

    // GİRİŞ KORUMASI (Auth Guard)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // KULLANICI GİRİŞ YAPMIŞ
            currentUserId = user.uid;
            console.log("Koç giriş yaptı, UID:", currentUserId);
            
            // DÜZELTME: Hata oluşsa bile arayüzü göstermek için
            // bu iki satırı EN BAŞA taşıdık.
            loadingSpinner.style.display = 'none';
            appContainer.style.display = 'flex';
            
            // Artık arayüzü ve verileri yükleyebiliriz
            updateUIForLoggedInUser(user);
            renderAnaSayfa(); // Ana Sayfa ile başla
            
        } else {
            // KULLANICI GİRİŞ YAPMAMIŞ
            console.log("Giriş yapan kullanıcı yok, login.html'e yönlendiriliyor.");
            window.location.href = 'login.html';
        }
    });
}

// Aktif olan tüm veritabanı dinleyicilerini (snapshotları) temizler.
function cleanUpListeners() {
    if (studentUnsubscribe) { studentUnsubscribe(); studentUnsubscribe = null; }
    if (soruTakibiUnsubscribe) { soruTakibiUnsubscribe(); soruTakibiUnsubscribe = null; }
    if (hedeflerUnsubscribe) { hedeflerUnsubscribe(); hedeflerUnsubscribe = null; }
    if (odevlerUnsubscribe) { odevlerUnsubscribe(); odevlerUnsubscribe = null; }
    if (notlarUnsubscribe) { notlarUnsubscribe(); notlarUnsubscribe = null; }
    if (ajandaUnsubscribe) { ajandaUnsubscribe(); ajandaUnsubscribe = null; }
    if (muhasebeUnsubscribe) { muhasebeUnsubscribe(); muhasebeUnsubscribe = null; }
    if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
    if (islemGecmisiUnsubscribe) { islemGecmisiUnsubscribe(); islemGecmisiUnsubscribe = null; }
    console.log("Tüm aktif dinleyiciler temizlendi.");
}
function updateUIForLoggedInUser(user) {
    if (user) {
        const displayName = user.email ? user.email.split('@')[0] : "Koç";
        const displayEmail = user.email || "E-posta yok";
        
        userName.textContent = displayName;
        userEmail.textContent = displayEmail;
        userAvatar.textContent = displayName[0].toUpperCase();
    }
    
    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("Çıkış yapıldı.");
            window.location.href = 'login.html';
        });
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Sayfa değiştirmeden önce tüm dinleyicileri kapat
            cleanUpListeners();

            // Aktif menü öğesini ayarla
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'font-semibold'));
            link.classList.add('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
            
            const pageId = link.id.split('-')[1];
            
            // İlgili sayfanın render fonksiyonunu çağır
            switch(pageId) {
                case 'anasayfa':
                    renderAnaSayfa();
                    break;
                case 'ogrencilerim':
                    renderOgrenciSayfasi();
                    break;
                case 'ajandam':
                    renderAjandaSayfasi();
                    break;
                case 'muhasebe':
                    renderMuhasebeSayfasi();
                    break;
                case 'mesajlar':
                    renderMesajlarSayfasi();
                    break;
                default:
                    renderPlaceholderSayfasi(link.textContent.trim());
                    break;
            }
        });
    });
}

// === 5.1 ANA SAYFA (DASHBOARD) ===

async function renderAnaSayfa() {
    mainContentTitle.textContent = "Kontrol Paneli";
    
    // İskeleti Oluştur
    mainContentArea.innerHTML = `
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg mb-8 flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold mb-1">Hoş geldin, Hocam! 👋</h2>
                <p class="text-purple-100 text-sm">Bugün öğrencilerinin başarısı için harika bir gün.</p>
            </div>
            <div class="hidden md:block text-right">
                <p class="text-3xl font-bold" id="dashDateDay">--</p>
                <p class="text-sm text-purple-200" id="dashDateFull">--</p>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-users"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Aktif Öğrenci</p><h3 class="text-2xl font-bold text-gray-800" id="dashTotalStudent">...</h3></div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-regular fa-calendar-check"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Bugünkü Randevular</p><h3 class="text-2xl font-bold text-gray-800" id="dashTodayAppt">...</h3></div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-turkish-lira-sign"></i></div>
                <div><p class="text-sm text-gray-500 font-medium">Bekleyen Alacak</p><h3 class="text-2xl font-bold text-gray-800" id="dashPendingPayment">...</h3></div>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2"><span class="w-2 h-6 bg-orange-500 rounded-full"></span>Bugünkü Programım</h3>
                        <button id="btnDashGoAjanda" class="text-sm text-purple-600 hover:text-purple-800 font-medium">Tümünü Gör</button>
                    </div>
                    <div id="dashAgendaList" class="p-2 max-h-80 overflow-y-auto"><p class="text-center text-gray-400 py-8">Yükleniyor...</p></div>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-100"><h3 class="font-bold text-gray-800 flex items-center gap-2"><span class="w-2 h-6 bg-blue-500 rounded-full"></span>Öğrenci Durum Özeti</h3></div>
                    <div class="overflow-x-auto"><table class="min-w-full text-sm text-left"><thead class="bg-gray-50 text-gray-500 font-medium"><tr><th class="px-6 py-3">Öğrenci</th><th class="px-6 py-3">Sınıf</th><th class="px-6 py-3 text-center">İşlem</th></tr></thead><tbody id="dashStudentTableBody" class="divide-y divide-gray-100"></tbody></table></div>
                </div>
            </div>
            <div class="space-y-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 class="font-bold text-gray-800 mb-4">Hızlı İşlemler</h3>
                    <div class="space-y-3">
                        <button id="btnDashAddStudent" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors group"><div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3 group-hover:bg-purple-600 group-hover:text-white transition-colors"><i class="fa-solid fa-user-plus"></i></div><span class="font-medium text-gray-700 group-hover:text-purple-700">Yeni Öğrenci Ekle</span></button>
                        <button id="btnDashAddRandevu" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-200 transition-colors group"><div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-3 group-hover:bg-orange-600 group-hover:text-white transition-colors"><i class="fa-regular fa-calendar-plus"></i></div><span class="font-medium text-gray-700 group-hover:text-orange-700">Randevu Oluştur</span></button>
                        <button id="btnDashGoMesajlar" class="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group"><div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors"><i class="fa-regular fa-envelope"></i></div><span class="font-medium text-gray-700 group-hover:text-blue-700">Mesajları Oku</span></button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Tarih Bilgisi
    const now = new Date();
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    document.getElementById('dashDateDay').textContent = days[now.getDay()];
    document.getElementById('dashDateFull').textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    // Hızlı Eylem Butonları
    document.getElementById('btnDashAddStudent').addEventListener('click', () => {
        document.getElementById('studentName').value = '';
        document.getElementById('studentSurname').value = '';
        document.getElementById('studentClass').value = '12. Sınıf';
        modalErrorMessage.classList.add('hidden');
        renderDersSecimi('12. Sınıf', studentDersSecimiContainer);
        addStudentModal.style.display = 'block';
    });
    document.getElementById('btnDashAddRandevu').addEventListener('click', () => {
        populateStudentSelect('randevuStudentId'); 
        document.getElementById('addRandevuModal').style.display = 'block';
    });
    document.getElementById('btnDashGoAjanda').addEventListener('click', () => document.getElementById('nav-ajandam').click());
    document.getElementById('btnDashGoMesajlar').addEventListener('click', () => document.getElementById('nav-mesajlar').click());

    // Verileri Yükle
    loadDashboardStats();
    loadTodayAgenda();
}

function loadDashboardStats() {
    const studentTableBody = document.getElementById('dashStudentTableBody');
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    studentUnsubscribe = onSnapshot(q, (snapshot) => {
        let totalStudents = 0, totalAlacak = 0, tableHtml = '';
        snapshot.forEach(doc => {
            const s = doc.data();
            totalStudents++;
            const bakiye = (s.toplamBorc || 0) - (s.toplamOdenen || 0);
            if (bakiye > 0) totalAlacak += bakiye;
            
            tableHtml += `
                <tr class="hover:bg-gray-50 transition-colors group cursor-pointer dash-student-link" data-id="${doc.id}" data-name="${s.ad} ${s.soyad}">
                    <td class="px-6 py-3 whitespace-nowrap"><div class="flex items-center"><div class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold mr-3 group-hover:bg-purple-100 group-hover:text-purple-600">${s.ad[0]}${s.soyad[0]}</div><div><div class="text-sm font-medium text-gray-900">${s.ad} ${s.soyad}</div></div></div></td>
                    <td class="px-6 py-3 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700">${s.sinif}</span></td>
                    <td class="px-6 py-3 whitespace-nowrap text-center text-sm text-gray-500"><i class="fa-solid fa-chevron-right text-xs text-gray-300 group-hover:text-purple-500"></i></td>
                </tr>
            `;
        });

        document.getElementById('dashTotalStudent').textContent = totalStudents;
        document.getElementById('dashPendingPayment').textContent = formatCurrency(totalAlacak);
        studentTableBody.innerHTML = tableHtml || '<tr><td colspan="3" class="text-center py-4 text-gray-400">Henüz öğrenci yok.</td></tr>';
    
        // Dashboard'dan öğrenci profiline gitmek için Event Listener
        studentTableBody.querySelectorAll('.dash-student-link').forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = e.currentTarget.dataset.id;
                const studentName = e.currentTarget.dataset.name;
                renderOgrenciDetaySayfasi(studentId, studentName);
            });
        });
        
    });
}

function loadTodayAgenda() {
    const listContainer = document.getElementById('dashAgendaList');
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(
        collection(db, "koclar", currentUserId, "ajandam"),
        where("tarih", "==", todayStr),
        orderBy("baslangic")
    );
    
    ajandaUnsubscribe = onSnapshot(q, (snapshot) => {
        let count = 0, html = '';
        snapshot.forEach(doc => {
            const randevu = doc.data();
            count++;
            html += `
                <div class="flex items-start p-3 bg-orange-50 rounded-lg border border-orange-100 mb-2 relative overflow-hidden group cursor-pointer hover:shadow-sm transition-shadow">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-orange-400"></div>
                    <div class="ml-2 flex-1">
                        <div class="flex justify-between items-center">
                            <h4 class="font-bold text-gray-800 text-sm">${randevu.ogrenciAd}</h4>
                            <span class="text-xs font-mono text-orange-700 bg-orange-100 px-2 py-0.5 rounded">${randevu.baslangic} - ${randevu.bitis}</span>
                        </div>
                        <p class="text-xs text-gray-600 mt-1 line-clamp-1">${randevu.baslik}</p>
                    </div>
                </div>
            `;
        });
        document.getElementById('dashTodayAppt').textContent = count;
        listContainer.innerHTML = html || `<div class="flex flex-col items-center justify-center py-6 text-gray-400"><i class="fa-regular fa-calendar text-3xl mb-2 opacity-30"></i><p class="text-sm">Bugün için planlanmış randevu yok.</p></div>`;
    });
}


// === 6. "ÖĞRENCİLERİM" SAYFASI FONKSİYONLARI ===
function renderOgrenciSayfasi() {
    if (!currentUserId) return;
    mainContentTitle.textContent = "Öğrencilerim";
    mainContentArea.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div class="relative w-full md:w-1/3">
                <input type="text" id="searchStudentInput" placeholder="Öğrenci ara (Ad, Soyad...)" class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>
            <button id="showAddStudentModalButton" class="w-full md:w-auto bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Yeni Öğrenci Ekle
            </button>
        </div>
        <div id="studentListContainer" class="bg-white p-4 rounded-lg shadow">
            <p class="text-gray-500 text-center py-4">Öğrenciler yükleniyor...</p>
        </div>
    `;
    
    document.getElementById('showAddStudentModalButton').addEventListener('click', () => {
        document.getElementById('studentName').value = '';
        document.getElementById('studentSurname').value = '';
        const defaultClass = '12. Sınıf';
        document.getElementById('studentClass').value = defaultClass;
        renderDersSecimi(defaultClass, studentDersSecimiContainer); // Dersleri yükle
        modalErrorMessage.classList.add('hidden');
        addStudentModal.style.display = 'block';
    });

    // Sınıf seçimi değiştikçe dersleri güncelle (Ekleme Modalı)
    document.getElementById('studentClass').addEventListener('change', (e) => {
        renderDersSecimi(e.target.value, studentDersSecimiContainer);
    });
    
    loadOgrenciler();
}

function loadOgrenciler() {
    const studentListContainer = document.getElementById('studentListContainer');
    if (!studentListContainer) return;
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim"));
    
    studentUnsubscribe = onSnapshot(q, (querySnapshot) => {
        const students = [];
        querySnapshot.forEach((doc) => {
            students.push({ id: doc.id, ...doc.data() });
        });
        renderStudentList(students);
    }, (error) => {
        console.error("Öğrencileri yüklerken hata:", error);
        studentListContainer.innerHTML = `<p class="text-red-500 text-center py-4">Veri okuma izni alınamadı. Güvenlik kurallarınızı kontrol edin.</p>`;
    });
}

function renderStudentList(students) {
    const studentListContainer = document.getElementById('studentListContainer');
    if (students.length === 0) {
        studentListContainer.innerHTML = `<p class="text-gray-500 text-center py-4">Henüz öğrenci eklememişsiniz. "Yeni Öğrenci Ekle" butonu ile başlayın.</p>`;
        return;
    }
    studentListContainer.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bakiye</th>
                        <th scope="col" class="relative px-6 py-3"><span class="sr-only">Eylemler</span></th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${students.map(student => {
                        const bakiye = (student.toplamBorc || 0) - (student.toplamOdenen || 0);
                        let bakiyeClass = 'text-gray-500';
                        if (bakiye > 0) bakiyeClass = 'text-red-600 font-medium';
                        if (bakiye < 0) bakiyeClass = 'text-green-600 font-medium';
                        
                        return `
                        <tr id="student-row-${student.id}">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0 h-10 w-10 bg-purple-100 text-purple-600 flex items-center justify-center rounded-full font-bold">
                                        ${student.ad[0] || ''}${student.soyad[0] || ''}
                                    </div>
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-gray-900">${student.ad} ${student.soyad}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    ${student.sinif}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm ${bakiyeClass}">
                                ${formatCurrency(bakiye)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button data-id="${student.id}" data-ad="${student.ad} ${student.soyad}" class="profil-gor-button text-purple-600 hover:text-purple-900">Profili Gör</button>
                                <button data-id="${student.id}" class="delete-student-button text-red-600 hover:text-red-900 ml-4">Sil</button>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    document.querySelectorAll('.delete-student-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const studentId = e.target.dataset.id;
            if (confirm("Bu öğrenciyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
                try {
                    const studentDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
                    await deleteDoc(studentDocRef);
                } catch (error) {
                    console.error("Silme hatası:", error);
                    alert("Öğrenci silinirken bir hata oluştu.");
                }
            }
        });
    });

    document.querySelectorAll('.profil-gor-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const studentId = e.target.dataset.id;
            const studentName = e.target.dataset.ad;
            renderOgrenciDetaySayfasi(studentId, studentName);
        });
    });
}

// === YARDIMCI: DERS SEÇİM LİSTESİ OLUŞTUR ===
function renderDersSecimi(sinif, container, selectedDersler = []) {
    container.innerHTML = '';
    let dersler = [];
    if (['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(sinif)) {
        dersler = DERS_HAVUZU['ORTAOKUL'];
    } else {
        dersler = DERS_HAVUZU['LISE'];
    }
    dersler.forEach(ders => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `ders-${ders.replace(/\s+/g, '-')}`;
        checkbox.value = ders;
        checkbox.className = 'student-ders-checkbox h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded';
        
        if (selectedDersler.length > 0) {
            if (selectedDersler.includes(ders)) checkbox.checked = true;
        } else {
            checkbox.checked = true; // Varsayılan olarak hepsi seçili
        }
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.className = 'ml-2 block text-sm text-gray-900 cursor-pointer';
        label.textContent = ders;
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
}

async function saveNewStudent() {
    const ad = document.getElementById('studentName').value.trim();
    const soyad = document.getElementById('studentSurname').value.trim();
    const sinif = document.getElementById('studentClass').value;
    
    const selectedDersler = [];
    studentDersSecimiContainer.querySelectorAll('.student-ders-checkbox:checked').forEach(cb => {
        selectedDersler.push(cb.value);
    });

    if (!ad || !soyad) {
        modalErrorMessage.textContent = "Ad ve Soyad alanları zorunludur.";
        modalErrorMessage.classList.remove('hidden');
        return;
    }
    try {
        saveStudentButton.disabled = true;
        saveStudentButton.textContent = "Kaydediliyor...";
        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim"), {
            ad: ad,
            soyad: soyad,
            sinif: sinif,
            takipDersleri: selectedDersler,
            olusturmaTarihi: serverTimestamp(),
            toplamBorc: 0,
            toplamOdenen: 0
        });
        addStudentModal.style.display = 'none';
    } catch (error) {
        console.error("Öğrenci ekleme hatası: ", error);
        modalErrorMessage.textContent = `Bir hata oluştu: ${error.message}`;
        modalErrorMessage.classList.remove('hidden');
    } finally {
        saveStudentButton.disabled = false;
        saveStudentButton.textContent = "Kaydet";
    }
}


// === 7. "ÖĞRENCİ DETAY" SAYFASI ===
function renderOgrenciDetaySayfasi(studentId, studentName) {
    mainContentTitle.textContent = `${studentName} - Detay Profili`;
    
    // Sayfa değişti, tüm dinleyicileri temizle
    cleanUpListeners();

    mainContentArea.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <button id="geriDonOgrenciListesi" class="flex items-center text-sm text-gray-600 hover:text-purple-600 font-medium">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                Öğrenci Listesine Geri Dön
            </button>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row items-center mb-6 gap-4">
            <div class="flex-shrink-0 h-16 w-16 bg-purple-100 text-purple-600 flex items-center justify-center rounded-full font-bold text-2xl" id="studentDetailAvatar">
                ${studentName.split(' ').map(n => n[0]).join('')}
            </div>
            <div class="text-center md:text-left flex-1">
                <h2 class="text-3xl font-bold text-gray-800" id="studentDetailName">${studentName}</h2>
                <p class="text-lg text-gray-500" id="studentDetailClass">Yükleniyor...</p>
            </div>
            <div class="ml-0 md:ml-auto flex flex-col sm:flex-row gap-2">
                <button id="showEditStudentModalButton" data-student-id="${studentId}" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 border border-gray-200">Bilgileri Düzenle</button>
                <button class="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 border border-purple-200">Mesaj Gönder</button>
                <button id="btnStudentRandevuPlanla" class="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 border border-green-200 flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Randevu Planla
                </button>
            </div>
        </div>
        <div class="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
            <button data-tab="ozet" data-student-id="${studentId}" class="tab-button active flex-shrink-0 py-3 px-5 text-purple-600 border-b-2 border-purple-600 font-semibold">Özet</button>
            <button data-tab="denemeler" data-student-id="${studentId}" class="tab-button flex-shrink-0 py-3 px-5 text-gray-500 hover:text-purple-600">Denemeler</button>
            <button data-tab="soru-takibi" data-student-id="${studentId}" class="tab-button flex-shrink-0 py-3 px-5 text-gray-500 hover:text-purple-600">Soru Takibi</button>
            <button data-tab="hedefler" data-student-id="${studentId}" class="tab-button flex-shrink-0 py-3 px-5 text-gray-500 hover:text-purple-600">Hedefler & Ödevler</button>
            <button data-tab="notlar" data-student-id="${studentId}" class="tab-button flex-shrink-0 py-3 px-5 text-gray-500 hover:text-purple-600">Koçluk Notları (Özel)</button>
        </div>
        <div id="tabContentArea"></div>
    `;

    document.getElementById('geriDonOgrenciListesi').addEventListener('click', () => {
        cleanUpListeners(); // Detaydan listeye dönerken de temizle
        renderOgrenciSayfasi();
    });

    document.getElementById('showEditStudentModalButton').addEventListener('click', (e) => {
        showEditStudentModal(e.currentTarget.dataset.studentId);
    });

    // Randevu Planla Butonu
    document.getElementById('btnStudentRandevuPlanla').addEventListener('click', async () => {
        const modal = document.getElementById('addRandevuModal');
        const selectId = 'randevuStudentId';
        await populateStudentSelect(selectId);
        const select = document.getElementById(selectId);
        if(select) { select.value = studentId; }
        document.getElementById('randevuBaslik').value = 'Birebir Koçluk Görüşmesi';
        document.getElementById('randevuTarih').value = new Date().toISOString().split('T')[0];
        document.getElementById('randevuBaslangic').value = '09:00';
        document.getElementById('randevuBitis').value = '10:00';
        document.getElementById('randevuNot').value = '';
        document.getElementById('randevuModalErrorMessage').classList.add('hidden');
        modal.style.display = 'block';
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            // Sekme değiştirirken de dinleyicileri temizle
            cleanUpListeners(); 
            
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active', 'text-purple-600', 'border-purple-600', 'font-semibold');
                btn.classList.add('text-gray-500');
            });
            e.currentTarget.classList.add('active', 'text-purple-600', 'border-purple-600', 'font-semibold');
            e.currentTarget.classList.remove('text-gray-500');
            
            const tabId = e.currentTarget.dataset.tab;
            const studentId = e.currentTarget.dataset.studentId;
            
            switch(tabId) {
                case 'ozet': renderOzetTab(studentId); break;
                case 'denemeler': renderDenemelerTab(studentId, studentName); break;
                case 'soru-takibi': 
                    soruTakibiZaman = 'haftalik';
                    soruTakibiOffset = 0;
                    renderSoruTakibiTab(studentId, studentName); 
                    break;
                case 'hedefler': renderHedeflerOdevlerTab(studentId, studentName); break;
                case 'notlar': renderKoclukNotlariTab(studentId, studentName); break;
                default: renderPlaceholderTab(tabId); break;
            }
        });
    });
    
    renderOzetTab(studentId);
}

// === 7.1. ÖZET SEKMESİ ===
async function renderOzetTab(studentId) {
    const tabContentArea = document.getElementById('tabContentArea');
    if (!tabContentArea) return;
    tabContentArea.innerHTML = `<p class="text-gray-600 p-4">Öğrenci detayları yükleniyor...</p>`;
    try {
        const studentDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
        const docSnap = await getDoc(studentDocRef); // Tek seferlik okuma
        if (docSnap.exists()) {
            const studentData = docSnap.data();
            const classElement = document.getElementById('studentDetailClass');
            if (classElement) {
                classElement.textContent = `${studentData.sinif} Öğrencisi`;
            }
            tabContentArea.innerHTML = `
                <h3 class="text-xl font-semibold mb-4 text-gray-700">Öğrenci Özeti</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
                        <p class="text-sm font-medium text-gray-500">Sınıf</p>
                        <p class="text-lg font-semibold text-gray-800">${studentData.sinif}</p>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
                        <p class="text-sm font-medium text-gray-500">Kayıt Tarihi</p>
                        <p class="text-lg font-semibold text-gray-800">${studentData.olusturmaTarihi ? studentData.olusturmaTarihi.toDate().toLocaleDateString('tr-TR') : 'Bilinmiyor'}</p>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
                        <p class="text-sm font-medium text-gray-500">Genel Bakiye</p>
                        <p class="text-lg font-semibold text-gray-800 ${((studentData.toplamBorc || 0) - (studentData.toplamOdenen || 0)) > 0 ? 'text-red-600' : 'text-green-600'}">
                            ${formatCurrency((studentData.toplamBorc || 0) - (studentData.toplamOdenen || 0))}
                        </p>
                    </div>
                </div>
            `;
        } else {
            tabContentArea.innerHTML = `<p class="text-red-500">Öğrenci detayları bulunamadı.</p>`;
        }
    } catch (error) {
        console.error("Öğrenci detayı yüklenirken hata:", error);
        tabContentArea.innerHTML = `<p class="text-red-500">Öğrenci detayları yüklenirken bir hata oluştu: ${error.message}</p>`;
    }
}

// === 7.2. DENEMELER SEKMESİ ===
function renderDenemelerTab(studentId, studentName) {
    const tabContentArea = document.getElementById('tabContentArea');
    if (!tabContentArea) return;
    tabContentArea.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-semibold text-gray-700">${studentName} - Deneme Sınavları</h3>
            <button id="showAddDenemeModalButton" class="bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center text-sm">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Yeni Deneme Ekle
            </button>
        </div>
        <div id="denemeListContainer" class="bg-white p-4 rounded-lg shadow">
            <p class="text-gray-500 text-center py-4">Denemeler yükleniyor...</p>
        </div>
    `;
    document.getElementById('showAddDenemeModalButton').addEventListener('click', () => {
        denemeModalErrorMessage.classList.add('hidden');
        document.getElementById('denemeAdi').value = '';
        document.getElementById('denemeTarihi').value = new Date().toISOString().split('T')[0];
        denemeTuruSelect.value = 'TYT'; 
        renderDenemeNetInputs('TYT');
        currentStudentIdForDeneme.value = studentId;
        addDenemeModal.style.display = 'block';
    });
    loadDenemeler(studentId);
}

function renderDenemeNetInputs(tur) {
    const sinav = SINAV_DERSLERI[tur];
    let html = `<p class="text-gray-700 font-medium">Net Girişi (${tur})</p>`;
    if (tur === 'Diger') {
        html += `
            <div class="mt-4">
                <label for="net-diger-toplam" class="block text-sm font-medium text-gray-700">Toplam Net</label>
                <input type="number" id="net-diger-toplam" data-ders-id="diger_toplam" class="net-input-diger mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" placeholder="Örn: 75.25">
                <p class="text-xs text-gray-500 mt-2">Diğer sınav türleri için sadece toplam neti girin.</p>
            </div>`;
    } else if (sinav && sinav.dersler.length > 0) {
        const kuralText = sinav.netKural === 0 ? "Yanlış doğruyu götürmez" : `${sinav.netKural} Yanlış 1 Doğruyu götürür`;
        html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 mt-4">`;
        sinav.dersler.forEach(ders => {
            html += `
                <div class="md:col-span-1">
                    <label for="net-${ders.id}-d" class="block text-xs font-medium text-gray-600">${ders.ad} (D)</label>
                    <input type="number" id="net-${ders.id}-d" data-ders-id="${ders.id}" data-type="d" data-max-soru="${ders.soru}" class="net-input mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" min="0" max="${ders.soru}">
                </div>
                <div class="md:col-span-1">
                    <label for="net-${ders.id}-y" class="block text-xs font-medium text-gray-600">${ders.ad} (Y)</label>
                    <input type="number" id="net-${ders.id}-y" data-ders-id="${ders.id}" data-type="y" data-max-soru="${ders.soru}" class="net-input mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" min="0">
                </div>`;
        });
        html += `</div>`;
        html += `<p class="text-xs text-gray-500 mt-3">Boş ve Net sayıları otomatik hesaplanacaktır. (${kuralText})</p>`;
    } else {
        html = '<p class="text-gray-500">Bu sınav türü için ders girişi tanımlanmamış.</p>';
    }
    denemeNetGirisAlani.innerHTML = html;
}

function loadDenemeler(studentId) {
    const denemeListContainer = document.getElementById('denemeListContainer');
    if (!denemeListContainer) return;
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "denemeler"), orderBy("tarih", "desc"));
    
    studentUnsubscribe = onSnapshot(q, (querySnapshot) => { // 'studentUnsubscribe' kullanılıyor
        const denemeler = [];
        querySnapshot.forEach((doc) => {
            denemeler.push({ id: doc.id, ...doc.data() });
        });
        renderDenemeList(denemeler, studentId);
    }, (error) => {
        console.error("Denemeleri yüklerken hata:", error);
        denemeListContainer.innerHTML = `<p class="text-red-500 text-center py-4">Denemeler yüklenemedi. (Hata: ${error.message}).</p>`;
    });
}
