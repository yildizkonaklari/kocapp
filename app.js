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
    serverTimestamp
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

// Koçluk Notu Modalı
const addNotModal = document.getElementById("addNotModal");
const closeNotModalButton = document.getElementById("closeNotModalButton");
const cancelNotModalButton = document.getElementById("cancelNotModalButton");
const saveNotButton = document.getElementById("saveNotButton");
const notModalErrorMessage = document.getElementById("notModalErrorMessage");
const currentStudentIdForNot = document.getElementById("currentStudentIdForNot");


// 3. Global Değişkenler
let auth;
let db;
let currentUserId = null; // Koçun kimliği (UID)
const appId = firebaseConfig.appId; 

const SINAV_DERSLERI = {
    'TYT': {
        netKural: 4, // 4 yanlış 1 doğruyu götürür
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
        netKural: 3, // 3 yanlış 1 doğruyu götürür
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
        netKural: 0, // Yanlış doğruyu götürmez
        dersler: [
            { id: 'yds_dil', ad: 'Yabancı Dil', soru: 80 }
        ]
    },
    'Diger': {
        netKural: 0, // Kural yok
        dersler: [] // 'Diger' için özel form gösterilecek
    }
};

// Soru takibi için durum (state) değişkenleri
let soruTakibiUnsubscribe = null;
let soruTakibiZaman = 'haftalik';
let soruTakibiOffset = 0;
// Hedefler/Ödevler için dinleyiciler
let hedeflerUnsubscribe = null;
let odevlerUnsubscribe = null;
// Koçluk Notları için dinleyici
let notlarUnsubscribe = null;


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
            
            updateUIForLoggedInUser(user);
            renderOgrenciSayfasi();
            
            loadingSpinner.style.display = 'none';
            appContainer.style.display = 'flex';
        } else {
            // KULLANICI GİRİŞ YAPMAMIŞ
            console.log("Giriş yapan kullanıcı yok, login.html'e yönlendiriliyor.");
            window.location.href = 'login.html';
        }
    });
}

// === 5. Arayüz Güncelleme Fonksiyonları ===
function updateUIForLoggedInUser(user) {
    if (user) {
        const displayName = user.isAnonymous ? "Demo Koç" : (user.email || user.uid);
        const displayEmail = user.isAnonymous ? "Anonim Oturum" : (user.email || "E-posta yok");
        
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
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'font-semibold'));
            link.classList.add('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
            
            const pageId = link.id.split('-')[1];
            
            switch(pageId) {
                case 'ogrencilerim':
                    renderOgrenciSayfasi();
                    break;
                default:
                    renderPlaceholderSayfasi(link.textContent.trim());
                    break;
            }
        });
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
        document.getElementById('studentClass').value = '12. Sınıf';
        modalErrorMessage.classList.add('hidden');
        addStudentModal.style.display = 'block';
    });
    
    loadOgrenciler();
}

function loadOgrenciler() {
    const studentListContainer = document.getElementById('studentListContainer');
    if (!studentListContainer) return;
    
    // Veriyi /koclar/{kocID}/ogrencilerim yolundan okuyoruz
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim"));
    
    onSnapshot(q, (querySnapshot) => {
        const students = [];
        querySnapshot.forEach((doc) => {
            students.push({ id: doc.id, ...doc.data() });
        });
        renderStudentList(students);

    }, (error) => {
        console.error("Öğrencileri yüklerken hata:", error);
        if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
             studentListContainer.innerHTML = `<p class="text-red-500 text-center py-4">Veri okuma izni alınamadı. Lütfen Firebase Güvenlik Kurallarınızı kontrol edin.</p>`;
        } else {
             studentListContainer.innerHTML = `<p class="text-red-500 text-center py-4">Öğrenciler yüklenemedi. (Hata: ${error.message}).</p>`;
        }
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
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İlerleme</th>
                        <th scope="col" class="relative px-6 py-3"><span class="sr-only">Eylemler</span></th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${students.map(student => `
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
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="w-32 bg-gray-200 rounded-full h-2.5">
                                    <div class="bg-purple-600 h-2.5 rounded-full" style="width: 45%"></div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button data-id="${student.id}" data-ad="${student.ad} ${student.soyad}" class="profil-gor-button text-purple-600 hover:text-purple-900">Profili Gör</button>
                                <button data-id="${student.id}" class="delete-student-button text-red-600 hover:text-red-900 ml-4">Sil</button>
                            </td>
                        </tr>
                    `).join('')}
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

async function saveNewStudent() {
    const ad = document.getElementById('studentName').value.trim();
    const soyad = document.getElementById('studentSurname').value.trim();
    const sinif = document.getElementById('studentClass').value;

    if (!ad || !soyad) {
        modalErrorMessage.textContent = "Ad ve Soyad alanları zorunludur.";
        modalErrorMessage.classList.remove('hidden');
        return;
    }

    try {
        saveStudentButton.disabled = true;
        saveStudentButton.textContent = "Kaydediliyor...";
        
        const docRef = await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim"), {
            ad: ad,
            soyad: soyad,
            sinif: sinif,
            olusturmaTarihi: serverTimestamp()
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
            <div class="text-center md:text-left">
                <h2 class="text-3xl font-bold text-gray-800" id="studentDetailName">${studentName}</h2>
                <p class="text-lg text-gray-500" id="studentDetailClass"></p>
            </div>
            <div class="ml-0 md:ml-auto flex flex-col sm:flex-row gap-2">
                <button id="showEditStudentModalButton" data-student-id="${studentId}" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Bilgileri Düzenle</button>
                <button class="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-200">Mesaj Gönder</button>
                <button class="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200">Randevu Planla</button>
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
        renderOgrenciSayfasi();
    });

    document.getElementById('showEditStudentModalButton').addEventListener('click', (e) => {
        showEditStudentModal(e.currentTarget.dataset.studentId);
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            if (soruTakibiUnsubscribe) { soruTakibiUnsubscribe(); soruTakibiUnsubscribe = null; }
            if (hedeflerUnsubscribe) { hedeflerUnsubscribe(); hedeflerUnsubscribe = null; }
            if (odevlerUnsubscribe) { odevlerUnsubscribe(); odevlerUnsubscribe = null; }
            if (notlarUnsubscribe) { notlarUnsubscribe(); notlarUnsubscribe = null; }
            
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
        const docSnap = await getDoc(studentDocRef);

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
                        <p class="text-sm font-medium text-gray-500">Genel İlerleme</p>
                        <div class="w-full bg-gray-200 rounded-full h-4 mt-2">
                            <div class="bg-purple-600 h-4 rounded-full" style="width: 45%"></div>
                        </div>
                        <p class="text-right text-sm text-gray-600 mt-1">45%</p>
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
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "denemeler"));

    onSnapshot(q, (querySnapshot) => {
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

function renderDenemeList(denemeler, studentId) {
    const denemeListContainer = document.getElementById('denemeListContainer');
    if (denemeler.length === 0) {
        denemeListContainer.innerHTML = `<p class="text-gray-500 text-center py-4">Bu öğrenci için henüz deneme sonucu girilmemiş.</p>`;
        return;
    }
    denemeListContainer.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınav Adı</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Net</th>
                    <th class="relative px-6 py-3"><span class="sr-only">Eylemler</span></th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${denemeler.map(deneme => {
                    const toplamNetStr = (deneme.toplamNet || 0).toFixed(2);
                    let turClass = 'bg-gray-100 text-gray-800';
                    if (deneme.tur === 'TYT') turClass = 'bg-blue-100 text-blue-800';
                    else if (deneme.tur === 'AYT') turClass = 'bg-red-100 text-red-800';
                    else if (deneme.tur === 'LGS') turClass = 'bg-green-100 text-green-800';
                    else if (deneme.tur === 'YDS') turClass = 'bg-yellow-100 text-yellow-800';
                    return `
                        <tr id="deneme-row-${deneme.id}">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${deneme.tarih || 'Bilinmiyor'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${deneme.ad}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${turClass}">${deneme.tur}</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${toplamNetStr}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button data-id="${deneme.id}" class="text-purple-600 hover:text-purple-900">Düzenle</button>
                                <button data-id="${deneme.id}" class="delete-deneme-button text-red-600 hover:text-red-900 ml-4">Sil</button>
                            </td>
                        </tr>
                    `
                }).join('')}
            </tbody>
        </table>
    `;
    document.querySelectorAll('.delete-deneme-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const denemeId = e.target.dataset.id;
            if (confirm("Bu deneme sonucunu silmek istediğinize emin misiniz?")) {
                try {
                    const denemeDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "denemeler", denemeId);
                    await deleteDoc(denemeDocRef);
                } catch (error) {
                    console.error("Deneme silme hatası:", error);
                }
            }
        });
    });
}

async function saveNewDeneme() {
    const studentId = currentStudentIdForDeneme.value;
    const ad = document.getElementById('denemeAdi').value.trim();
    const tarih = document.getElementById('denemeTarihi').value;
    const tur = denemeTuruSelect.value;

    if (!studentId || !ad || !tarih) {
        denemeModalErrorMessage.textContent = "Sınav Adı ve Tarihi alanları zorunludur.";
        denemeModalErrorMessage.classList.remove('hidden');
        return;
    }
    let denemeVerisi = {
        ad: ad,
        tarih: tarih,
        tur: tur,
        eklenmeTarihi: serverTimestamp(),
        netler: {},
        toplamNet: 0
    };
    try {
        saveDenemeButton.disabled = true;
        saveDenemeButton.textContent = "Kaydediliyor...";
        const sinav = SINAV_DERSLERI[tur];
        if (tur === 'Diger') {
            const toplamNet = parseFloat(document.getElementById('net-diger-toplam').value) || 0;
            denemeVerisi.toplamNet = toplamNet;
            denemeVerisi.netler['diger_toplam'] = { ad: 'Toplam Net', d: 0, y: 0, b: 0, net: toplamNet };
        } else if (sinav) {
            let toplamNetHesabi = 0;
            const kural = sinav.netKural;
            sinav.dersler.forEach(ders => {
                const d = parseInt(document.getElementById(`net-${ders.id}-d`).value) || 0;
                const y = parseInt(document.getElementById(`net-${ders.id}-y`).value) || 0;
                const b = Math.max(0, ders.soru - (d + y));
                let net = 0;
                if (kural === 0) { net = d; }
                else { net = d - (y / kural); }
                denemeVerisi.netler[ders.id] = { ad: ders.ad, soru: ders.soru, d, y, b, net };
                if (!isNaN(net)) {
                    toplamNetHesabi += net;
                }
            });
            denemeVerisi.toplamNet = toplamNetHesabi;
        }
        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "denemeler"), denemeVerisi);
        addDenemeModal.style.display = 'none';
    } catch (error) {
        console.error("Deneme ekleme hatası: ", error);
        denemeModalErrorMessage.textContent = `Bir hata oluştu: ${error.message}`;
        denemeModalErrorMessage.classList.remove('hidden');
    } finally {
        saveDenemeButton.disabled = false;
        saveDenemeButton.textContent = "Denemeyi Kaydet";
    }
}


// === 7.3. SORU TAKİBİ SEKMESİ ===
function getSoruTakibiDateRange(zaman, offset) {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    if (zaman === 'haftalik') {
        const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
        startDate.setDate(today.getDate() - dayOfWeek + (offset * 7));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
    } else {
        startDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1 + offset, 0);
    }
    const formatForUI = (date) => date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    const formatForFirestore = (date) => date.toISOString().split('T')[0];
    return {
        start: formatForFirestore(startDate),
        end: formatForFirestore(endDate),
        uiText: `${formatForUI(startDate)} - ${formatForUI(endDate)}`
    };
}

function renderDonutChart(percent, elementId) {
    const container = document.getElementById(elementId);
    if (!container) return;
    const cleanPercent = Math.max(0, Math.min(100, percent || 0));
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (cleanPercent / 100) * circumference;
    container.innerHTML = `
        <svg class="w-full h-full" viewBox="0 0 100 100">
            <circle class="text-gray-200" stroke-width="12" stroke="currentColor" fill="transparent" r="${radius}" cx="50" cy="50" />
            <circle class="text-purple-600"
                stroke-width="12"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                stroke-linecap="round"
                stroke="currentColor"
                fill="transparent"
                r="${radius}"
                cx="50"
                cy="50"
                transform="rotate(-90 50 50)"
            />
            <text x="50" y="50" font-family="sans-serif" font-size="20" fill="currentColor" text-anchor="middle" dy=".3em" class="font-bold text-purple-700">
                ${cleanPercent.toFixed(0)}%
            </text>
        </svg>
    `;
}

function renderSoruTakibiSummary(soruVerileri) {
    let totalSoru = 0, totalDogru = 0, totalYanlis = 0;
    soruVerileri.forEach(veri => {
        const d = veri.dogru || 0;
        const y = veri.yanlis || 0;
        const b = veri.bos || 0;
        totalDogru += d;
        totalYanlis += y;
        totalSoru += (d + y + b);
    });
    const basariOrani = (totalDogru + totalYanlis) === 0 ? 0 : (totalDogru / (totalDogru + totalYanlis)) * 100;
    const summaryToplamSoruEl = document.getElementById('summaryToplamSoru');
    const summaryBasariOraniEl = document.getElementById('summaryBasariOrani');
    if(summaryToplamSoruEl) summaryToplamSoruEl.textContent = totalSoru;
    if(summaryBasariOraniEl) summaryBasariOraniEl.textContent = `${basariOrani.toFixed(0)}%`;
    renderDonutChart(basariOrani, 'summaryDonutChart');
}

function renderSoruTakibiTab(studentId, studentName) {
    const tabContentArea = document.getElementById('tabContentArea');
    if (!tabContentArea) return;
    tabContentArea.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div class="flex items-center p-1 bg-gray-200 rounded-lg">
                <button data-zaman="haftalik" class="soru-zaman-toggle active px-3 py-1 text-sm font-semibold text-white bg-purple-600 rounded-md shadow">Haftalık</button>
                <button data-zaman="aylik" class="soru-zaman-toggle px-3 py-1 text-sm font-semibold text-gray-600 rounded-md">Aylık</button>
            </div>
            <div class="flex items-center">
                <button id="soru-tarih-geri" class="soru-tarih-nav p-2 text-gray-500 hover:text-purple-600 rounded-full" data-yon="-1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <span id="soru-tarih-araligi" class="text-sm font-semibold text-gray-700 mx-2 w-28 text-center">Yükleniyor...</span>
                <button id="soru-tarih-ileri" class="soru-tarih-nav p-2 text-gray-500 hover:text-purple-600 rounded-full" data-yon="1">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
            <button id="showAddSoruModalButton" class="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center text-sm">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Yeni Veri Ekle
            </button>
        </div>
        <div id="soruTakibiSummary" class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-gray-500">Toplam Çözülen Soru</p>
                <p id="summaryToplamSoru" class="text-2xl md:text-3xl font-bold text-gray-800">0</p>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-gray-500">Genel Başarı Oranı</p>
                <p id="summaryBasariOrani" class="text-2xl md:text-3xl font-bold text-purple-600">0%</p>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm flex justify-center items-center col-span-2 md:col-span-1">
                <div id="summaryDonutChart" class="w-24 h-24"></div>
            </div>
        </div>
        <div id="soruListContainer" class="bg-white p-4 rounded-lg shadow">
            <p class="text-gray-500 text-center py-4">Soru verileri yükleniyor...</p>
        </div>
    `;
    document.getElementById('showAddSoruModalButton').addEventListener('click', () => {
        soruModalErrorMessage.classList.add('hidden');
        document.getElementById('soruTarihi').value = new Date().toISOString().split('T')[0];
        document.getElementById('soruDers').value = '';
        document.getElementById('soruKonu').value = '';
        document.getElementById('soruDogru').value = '';
        document.getElementById('soruYanlis').value = '';
        document.getElementById('soruBos').value = '';
        currentStudentIdForSoruTakibi.value = studentId;
        addSoruModal.style.display = 'block';
    });
    document.querySelectorAll('.soru-zaman-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            soruTakibiZaman = e.currentTarget.dataset.zaman;
            soruTakibiOffset = 0;
            document.querySelectorAll('.soru-zaman-toggle').forEach(btn => {
                btn.classList.remove('active', 'bg-purple-600', 'text-white', 'shadow');
                btn.classList.add('text-gray-600');
            });
            e.currentTarget.classList.add('active', 'bg-purple-600', 'text-white', 'shadow');
            loadSoruTakibi(studentId);
        });
    });
    document.querySelectorAll('.soru-tarih-nav').forEach(button => {
        button.addEventListener('click', (e) => {
            soruTakibiOffset += parseInt(e.currentTarget.dataset.yon);
            loadSoruTakibi(studentId);
        });
    });
    loadSoruTakibi(studentId);
}

function loadSoruTakibi(studentId) {
    const soruListContainer = document.getElementById('soruListContainer');
    if (!soruListContainer) return;
    if (soruTakibiUnsubscribe) {
        soruTakibiUnsubscribe();
    }
    const dateRange = getSoruTakibiDateRange(soruTakibiZaman, soruTakibiOffset);
    const tarihAraligiEl = document.getElementById('soru-tarih-araligi');
    if(tarihAraligiEl) tarihAraligiEl.textContent = dateRange.uiText;
    const ileriButton = document.getElementById('soru-tarih-ileri');
    if(ileriButton) ileriButton.disabled = (soruTakibiOffset >= 0);
    const q = query(
        collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "soruTakibi"),
        where("tarih", ">=", dateRange.start),
        where("tarih", "<=", dateRange.end),
        orderBy("tarih", "desc")
    );
    soruTakibiUnsubscribe = onSnapshot(q, (querySnapshot) => {
        const soruVerileri = [];
        querySnapshot.forEach((doc) => {
            soruVerileri.push({ id: doc.id, ...doc.data() });
        });
        renderSoruTakibiSummary(soruVerileri);
        renderSoruTakibiList(soruVerileri, studentId);
    }, (error) => {
        console.error("Soru verilerini yüklerken hata:", error);
        if (error.code === 'failed-precondition') {
            soruListContainer.innerHTML = `<p class="text-red-500 text-center py-4">Veriler yüklenemedi. Firestore index'i gerekiyor. Lütfen konsoldaki linki takip edin.</p>`;
        } else {
            soruListContainer.innerHTML = `<p class="text-red-500 text-center py-4">Veriler yüklenemedi. (Hata: ${error.message}).</p>`;
        }
    });
}

function renderSoruTakibiList(soruVerileri, studentId) {
    const soruListContainer = document.getElementById('soruListContainer');
    if (soruVerileri.length === 0) {
        soruListContainer.innerHTML = `<p class="text-gray-500 text-center py-4">Seçili tarih aralığı için soru verisi bulunamadı.</p>`;
        return;
    }
    soruListContainer.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ders</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konu</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">D</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Y</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">B</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başarı %</th>
                        <th class="relative px-6 py-3"><span class="sr-only">Eylemler</span></th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${soruVerileri.map(veri => {
                        const d = veri.dogru || 0;
                        const y = veri.yanlis || 0;
                        const b = veri.bos || 0;
                        const toplam = d + y + b;
                        const basari = (d + y) === 0 ? 0 : (d / (d+y)) * 100;
                        return `
                            <tr id="soru-row-${veri.id}">
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${veri.tarih || 'Bilinmiyor'}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${veri.ders}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${veri.konu}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">${d}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">${y}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${b}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">${toplam}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${basari > 70 ? 'text-green-700' : (basari > 0 ? 'text-orange-600' : 'text-gray-500')}">
                                    ${basari > 0 ? basari.toFixed(0) + '%' : '-'}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button data-id="${veri.id}" class="delete-soru-button text-red-600 hover:text-red-900 ml-4">Sil</button>
                                </td>
                            </tr>
                        `
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    document.querySelectorAll('.delete-soru-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const veriId = e.target.dataset.id;
            if (confirm("Bu soru verisini silmek istediğinize emin misiniz?")) {
                try {
                    const soruDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "soruTakibi", veriId);
                    await deleteDoc(soruDocRef);
                } catch (error) {
                    console.error("Soru verisi silme hatası:", error);
                }
            }
        });
    });
}

async function saveNewSoruTakibi() {
    const studentId = currentStudentIdForSoruTakibi.value;
    const tarih = document.getElementById('soruTarihi').value;
    const ders = document.getElementById('soruDers').value.trim();
    const konu = document.getElementById('soruKonu').value.trim();
    const dogru = parseInt(document.getElementById('soruDogru').value) || 0;
    const yanlis = parseInt(document.getElementById('soruYanlis').value) || 0;
    const bos = parseInt(document.getElementById('soruBos').value) || 0;
    if (!studentId || !tarih || !ders || !konu) {
        soruModalErrorMessage.textContent = "Tarih, Ders ve Konu alanları zorunludur.";
        soruModalErrorMessage.classList.remove('hidden');
        return;
    }
    try {
        saveSoruButton.disabled = true;
        saveSoruButton.textContent = "Kaydediliyor...";
        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "soruTakibi"), {
            tarih: tarih,
            ders: ders,
            konu: konu,
            dogru: dogru,
            yanlis: yanlis,
            bos: bos,
            eklenmeTarihi: serverTimestamp()
        });
        addSoruModal.style.display = 'none';
    } catch (error) {
        console.error("Soru verisi ekleme hatası: ", error);
        soruModalErrorMessage.textContent = `Bir hata oluştu: ${error.message}`;
        soruModalErrorMessage.classList.remove('hidden');
    } finally {
        saveSoruButton.disabled = false;
        saveSoruButton.textContent = "Veriyi Kaydet";
    }
}


// === 7.4. HEDEFLER & ÖDEVLER SEKMESİ ===
function renderHedeflerOdevlerTab(studentId, studentName) {
    const tabContentArea = document.getElementById('tabContentArea');
    if (!tabContentArea) return;
    tabContentArea.innerHTML = `
        <div class="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
            <button data-subtab="hedefler" data-student-id="${studentId}" class="subtab-button active flex-shrink-0 py-3 px-5 text-purple-600 border-b-2 border-purple-600 font-semibold">🎯 Hedefler</button>
            <button data-subtab="odevler" data-student-id="${studentId}" class="subtab-button flex-shrink-0 py-3 px-5 text-gray-500 hover:text-purple-600">📝 Ödevler</button>
        </div>
        <div id="subTabContentArea"></div>
    `;
    document.querySelectorAll('.subtab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            if (hedeflerUnsubscribe) hedeflerUnsubscribe();
            if (odevlerUnsubscribe) odevlerUnsubscribe();
            document.querySelectorAll('.subtab-button').forEach(btn => {
                btn.classList.remove('active', 'text-purple-600', 'border-purple-600', 'font-semibold');
                btn.classList.add('text-gray-500');
            });
            e.currentTarget.classList.add('active', 'text-purple-600', 'border-purple-600', 'font-semibold');
            const subTabId = e.currentTarget.dataset.subtab;
            if (subTabId === 'hedefler') {
                renderHedeflerSubTab(studentId, studentName);
            } else {
                renderOdevlerSubTab(studentId, studentName);
            }
        });
    });
    renderHedeflerSubTab(studentId, studentName);
}

function renderHedeflerSubTab(studentId, studentName) {
    const subTabContentArea = document.getElementById('subTabContentArea');
    if (!subTabContentArea) return;
    subTabContentArea.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-semibold text-gray-700">${studentName} - Hedefler</h3>
            <button id="showAddHedefModalButton" class="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center text-sm">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Yeni Hedef Ekle
            </button>
        </div>
        <div id="hedefListContainer"><p class="text-gray-500 text-center py-4">Hedefler yükleniyor...</p></div>
    `;
    document.getElementById('showAddHedefModalButton').addEventListener('click', () => {
        hedefModalErrorMessage.classList.add('hidden');
        document.getElementById('hedefTitle').value = '';
        document.getElementById('hedefBitisTarihi').value = '';
        document.getElementById('hedefAciklama').value = '';
        currentStudentIdForHedef.value = studentId;
        addHedefModal.style.display = 'block';
    });
    loadHedefler(studentId);
}

function renderOdevlerSubTab(studentId, studentName) {
    const subTabContentArea = document.getElementById('subTabContentArea');
    if (!subTabContentArea) return;
    subTabContentArea.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-semibold text-gray-700">${studentName} - Ödevler</h3>
            <button id="showAddOdevModalButton" class="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center text-sm">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Yeni Ödev Ekle
            </button>
        </div>
        <div id="odevListContainer"><p class="text-gray-500 text-center py-4">Ödevler yükleniyor...</p></div>
    `;
    document.getElementById('showAddOdevModalButton').addEventListener('click', () => {
        odevModalErrorMessage.classList.add('hidden');
        document.getElementById('odevTitle').value = '';
        document.getElementById('odevBitisTarihi').value = new Date().toISOString().split('T')[0];
        document.getElementById('odevAciklama').value = '';
        currentStudentIdForOdev.value = studentId;
        addOdevModal.style.display = 'block';
    });
    loadOdevler(studentId);
}

function loadHedefler(studentId) {
    const listContainer = document.getElementById('hedefListContainer');
    if (!listContainer) return;
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "hedefler"), orderBy("olusturmaTarihi", "desc"));
    hedeflerUnsubscribe = onSnapshot(q, (snapshot) => {
        const hedefler = [];
        snapshot.forEach(doc => hedefler.push({ id: doc.id, ...doc.data() }));
        renderHedeflerList(hedefler, studentId);
    }, (error) => console.error("Hedefler yüklenirken hata:", error));
}

function loadOdevler(studentId) {
    const listContainer = document.getElementById('odevListContainer');
    if (!listContainer) return;
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "odevler"), orderBy("bitisTarihi", "asc"));
    odevlerUnsubscribe = onSnapshot(q, (snapshot) => {
        const odevler = [];
        snapshot.forEach(doc => odevler.push({ id: doc.id, ...doc.data() }));
        renderOdevlerList(odevler, studentId);
    }, (error) => console.error("Ödevler yüklenirken hata:", error));
}

function renderHedeflerList(hedefler, studentId) {
    const listContainer = document.getElementById('hedefListContainer');
    if (hedefler.length === 0) {
        listContainer.innerHTML = `<p class="text-gray-500 text-center py-4">Henüz hedef oluşturulmamış.</p>`;
        return;
    }
    listContainer.innerHTML = `<div class="space-y-4">
        ${hedefler.map(hedef => `
            <div class="bg-white p-4 rounded-lg shadow-sm border ${hedef.durum === 'tamamlandi' ? 'border-green-200 bg-green-50' : 'border-gray-200'}">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-lg ${hedef.durum === 'tamamlandi' ? 'text-gray-500 line-through' : 'text-gray-800'}">${hedef.title}</h4>
                        <p class="text-sm text-gray-600">${hedef.aciklama || ''}</p>
                        ${hedef.bitisTarihi ? `<p class="text-xs text-gray-500 mt-1">Bitiş: ${hedef.bitisTarihi}</p>` : ''}
                    </div>
                    <div class="flex-shrink-0 ml-4 flex gap-2">
                        <button data-id="${hedef.id}" data-status="${hedef.durum === 'tamamlandi' ? 'devam' : 'tamamlandi'}" class="toggle-hedef-button p-2 rounded-md ${hedef.durum === 'tamamlandi' ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-green-100 text-green-600 hover:bg-green-200'}" title="${hedef.durum === 'tamamlandi' ? 'Geri Al' : 'Tamamla'}">
                            ${hedef.durum === 'tamamlandi' ? 
                                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' :
                                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                            }
                        </button>
                        <button data-id="${hedef.id}" class="delete-hedef-button p-2 rounded-md bg-red-100 text-red-600 hover:bg-red-200" title="Sil">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>`;
    document.querySelectorAll('.toggle-hedef-button').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const newStatus = e.currentTarget.dataset.status;
        const hedefDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "hedefler", id);
        updateDoc(hedefDocRef, { durum: newStatus });
    }));
    document.querySelectorAll('.delete-hedef-button').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Bu hedefi silmek istediğinize emin misiniz?')) {
            const hedefDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "hedefler", id);
            await deleteDoc(hedefDocRef);
        }
    }));
}

function renderOdevlerList(odevler, studentId) {
    const listContainer = document.getElementById('odevListContainer');
    if (odevler.length === 0) {
        listContainer.innerHTML = `<p class="text-gray-500 text-center py-4">Henüz ödev oluşturulmamış.</p>`;
        return;
    }
    listContainer.innerHTML = `<div class="space-y-4">
        ${odevler.map(odev => {
            const isGecikti = odev.durum !== 'tamamlandi' && odev.bitisTarihi < new Date().toISOString().split('T')[0];
            return `
            <div class="bg-white p-4 rounded-lg shadow-sm border ${odev.durum === 'tamamlandi' ? 'border-green-200 bg-green-50' : (isGecikti ? 'border-red-200 bg-red-50' : 'border-gray-200')}">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold text-lg ${odev.durum === 'tamamlandi' ? 'text-gray-500 line-through' : 'text-gray-800'}">${odev.title}</h4>
                        <p class="text-sm text-gray-600">${odev.aciklama || ''}</p>
                        <p class="text-xs ${isGecikti ? 'text-red-600 font-semibold' : 'text-gray-500'} mt-1">
                            Bitiş: ${odev.bitisTarihi} ${isGecikti ? '(GECİKTİ)' : ''}
                        </p>
                    </div>
                    <div class="flex-shrink-0 ml-4 flex gap-2">
                        <button data-id="${odev.id}" data-status="${odev.durum === 'tamamlandi' ? 'devam' : 'tamamlandi'}" class="toggle-odev-button p-2 rounded-md ${odev.durum === 'tamamlandi' ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-green-100 text-green-600 hover:bg-green-200'}" title="${odev.durum === 'tamamlandi' ? 'Geri Al' : 'Tamamla'}">
                            ${odev.durum === 'tamamlandi' ? 
                                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' :
                                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                            }
                        </button>
                        <button data-id="${odev.id}" class="delete-odev-button p-2 rounded-md bg-red-100 text-red-600 hover:bg-red-200" title="Sil">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        `}).join('')}
    </div>`;
    document.querySelectorAll('.toggle-odev-button').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const newStatus = e.currentTarget.dataset.status;
        const odevDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "odevler", id);
        updateDoc(odevDocRef, { durum: newStatus });
    }));
    document.querySelectorAll('.delete-odev-button').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Bu ödevi silmek istediğinize emin misiniz?')) {
            const odevDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "odevler", id);
            await deleteDoc(odevDocRef);
        }
    }));
}

async function saveNewHedef() {
    const studentId = currentStudentIdForHedef.value;
    const title = document.getElementById('hedefTitle').value.trim();
    const bitisTarihi = document.getElementById('hedefBitisTarihi').value;
    const aciklama = document.getElementById('hedefAciklama').value.trim();
    if (!studentId || !title) {
        hedefModalErrorMessage.textContent = "Hedef Başlığı zorunludur.";
        hedefModalErrorMessage.classList.remove('hidden');
        return;
    }
    try {
        saveHedefButton.disabled = true;
        saveHedefButton.textContent = "Kaydediliyor...";
        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "hedefler"), {
            title: title,
            bitisTarihi: bitisTarihi || null,
            aciklama: aciklama,
            durum: "devam",
            olusturmaTarihi: serverTimestamp()
        });
        addHedefModal.style.display = 'none';
    } catch (error) {
        console.error("Hedef ekleme hatası:", error);
        hedefModalErrorMessage.textContent = `Bir hata oluştu: ${error.message}`;
        hedefModalErrorMessage.classList.remove('hidden');
    } finally {
        saveHedefButton.disabled = false;
        saveHedefButton.textContent = "Hedefi Kaydet";
    }
}

async function saveNewOdev() {
    const studentId = currentStudentIdForOdev.value;
    const title = document.getElementById('odevTitle').value.trim();
    const bitisTarihi = document.getElementById('odevBitisTarihi').value;
    const aciklama = document.getElementById('odevAciklama').value.trim();
    if (!studentId || !title || !bitisTarihi) {
        odevModalErrorMessage.textContent = "Ödev Başlığı ve Bitiş Tarihi zorunludur.";
        odevModalErrorMessage.classList.remove('hidden');
        return;
    }
    try {
        saveOdevButton.disabled = true;
        saveOdevButton.textContent = "Kaydediliyor...";
        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "odevler"), {
            title: title,
            bitisTarihi: bitisTarihi,
            aciklama: aciklama,
            durum: "devam",
            olusturmaTarihi: serverTimestamp()
        });
        addOdevModal.style.display = 'none';
    } catch (error) {
        console.error("Ödev ekleme hatası:", error);
        odevModalErrorMessage.textContent = `Bir hata oluştu: ${error.message}`;
        odevModalErrorMessage.classList.remove('hidden');
    } finally {
        saveOdevButton.disabled = false;
        saveOdevButton.textContent = "Ödevi Kaydet";
    }
}


// === 7.5. KOÇLUK NOTLARI SEKMESİ ===
function renderKoclukNotlariTab(studentId, studentName) {
    const tabContentArea = document.getElementById('tabContentArea');
    if (!tabContentArea) return;
    tabContentArea.innerHTML = `
        <h3 class="text-xl font-semibold text-gray-700 mb-4">Koçluk Notları (Sadece Siz Görürsünüz)</h3>
        <!-- YENİ HTML: Formu modal yerine doğrudan sayfaya ekle -->
        <div class="bg-white p-4 rounded-lg shadow-sm mb-6">
            <textarea id="newNotIcerik" rows="4" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="${studentName} ile ilgili yeni bir not ekle..."></textarea>
            <p id="newNotErrorMessage" class="text-sm text-red-600 hidden"></p>
            <div class="flex justify-end mt-2">
                <button id="saveNewNotButton" class="bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700">Notu Kaydet</button>
            </div>
        </div>
        <!-- Not Listesi -->
        <div id="notListContainer">
            <p class="text-gray-500 text-center py-4">Notlar yükleniyor...</p>
        </div>
    `;
    
    // Butonu bağla
    document.getElementById('saveNewNotButton').addEventListener('click', () => {
        saveNewKoclukNotu(studentId);
    });
    
    // Notları yükle
    loadKoclukNotlari(studentId);
}

function loadKoclukNotlari(studentId) {
    const listContainer = document.getElementById('notListContainer');
    if (!listContainer) return;
    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "koclukNotlari"), orderBy("tarih", "desc"));
    notlarUnsubscribe = onSnapshot(q, (snapshot) => {
        const notlar = [];
        snapshot.forEach(doc => notlar.push({ id: doc.id, ...doc.data() }));
        renderKoclukNotlariList(notlar, studentId);
    }, (error) => console.error("Koçluk notları yüklenirken hata:", error));
}

function renderKoclukNotlariList(notlar, studentId) {
    const listContainer = document.getElementById('notListContainer');
    if (notlar.length === 0) {
        listContainer.innerHTML = `<p class="text-gray-500 text-center py-4">Henüz koçluk notu eklenmemiş.</p>`;
        return;
    }
    listContainer.innerHTML = `<div class="space-y-4">
        ${notlar.map(not => `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div class="flex justify-between items-center mb-2">
                    <p class="text-sm font-semibold text-gray-700">${not.tarih.toDate().toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}</p>
                    <button data-id="${not.id}" class="delete-not-button p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-100" title="Notu Sil">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <p class="text-gray-800 whitespace-pre-wrap">${not.icerik}</p>
            </div>
        `).join('')}
    </div>`;
    
    // Sil butonlarını bağla
    document.querySelectorAll('.delete-not-button').forEach(btn => btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Bu koçluk notunu silmek istediğinize emin misiniz?')) {
            const notDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId, "koclukNotlari", id);
            await deleteDoc(notDocRef);
        }
    }));
}

async function saveNewKoclukNotu(studentId) {
    const icerikEl = document.getElementById('newNotIcerik');
    const errorEl = document.getElementById('newNotErrorMessage');
    const saveButton = document.getElementById('saveNewNotButton');
    const icerik = icerikEl.value.trim();
    if (!icerik) {
        errorEl.textContent = "Not içeriği boş olamaz.";
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    try {
        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";
        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim", studentId, "koclukNotlari"), {
            icerik: icerik,
            tarih: serverTimestamp()
        });
        icerikEl.value = ""; // Formu temizle
    } catch (error) {
        console.error("Koçluk notu ekleme hatası:", error);
        errorEl.textContent = `Bir hata oluştu: ${error.message}`;
        errorEl.classList.remove('hidden');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Notu Kaydet";
    }
}


// === 7.6. ÖĞRENCİ DÜZENLEME FONKSİYONLARI ===
async function showEditStudentModal(studentId) {
    editModalErrorMessage.classList.add('hidden');
    try {
        const studentDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
        const docSnap = await getDoc(studentDocRef);
        if (docSnap.exists()) {
            const studentData = docSnap.data();
            editStudentName.value = studentData.ad;
            editStudentSurname.value = studentData.soyad;
            editStudentClass.value = studentData.sinif;
            editStudentId.value = studentId;
            editStudentModal.style.display = 'block';
        } else {
            alert("Öğrenci verisi bulunamadı.");
        }
    } catch (error) {
        console.error("Öğrenci verisi çekerken hata: ", error);
        alert("Veri yüklenirken bir hata oluştu.");
    }
}

async function saveStudentChanges() {
    const studentId = editStudentId.value;
    const ad = editStudentName.value.trim();
    const soyad = editStudentSurname.value.trim();
    const sinif = editStudentClass.value;
    if (!studentId || !ad || !soyad) {
        editModalErrorMessage.textContent = "Ad ve Soyad alanları zorunludur.";
        editModalErrorMessage.classList.remove('hidden');
        return;
    }
    try {
        saveStudentChangesButton.disabled = true;
        saveStudentChangesButton.textContent = "Kaydediliyor...";
        const studentDocRef = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
        await updateDoc(studentDocRef, {
            ad: ad,
            soyad: soyad,
            sinif: sinif
        });
        editStudentModal.style.display = 'none';
        const headerName = document.getElementById('studentDetailName');
        if (headerName && headerName.textContent !== `${ad} ${soyad}`) {
            mainContentTitle.textContent = `${ad} ${soyad} - Detay Profili`;
            headerName.textContent = `${ad} ${soyad}`;
            document.getElementById('studentDetailAvatar').textContent = `${ad[0] || ''}${soyad[0] || ''}`;
            document.getElementById('studentDetailClass').textContent = `${sinif} Öğrencisi`;
        }
    } catch (error) {
        console.error("Öğrenci güncelleme hatası: ", error);
        editModalErrorMessage.textContent = `Bir hata oluştu: ${error.message}`;
        editModalErrorMessage.classList.remove('hidden');
    } finally {
        saveStudentChangesButton.disabled = false;
        saveStudentChangesButton.textContent = "Değişiklikleri Kaydet";
    }
}

// === 7.7. DİĞER SEKMELER (Placeholder) ===
function renderPlaceholderTab(tabId) {
     const tabContentArea = document.getElementById('tabContentArea');
     if (!tabContentArea) return;
     tabContentArea.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow text-center">
            <h2 class="text-xl font-semibold text-gray-700">${tabId}</h2>
            <p class="mt-2 text-gray-500">Bu sekme yapım aşamasındadır.</p>
        </div>
     `;
}


// === 8. DİĞER SAYFALAR (Placeholder) ===
function renderPlaceholderSayfasi(sayfaAdi) {
    mainContentTitle.textContent = sayfaAdi;
    mainContentArea.innerHTML = `
        <div class="bg-white p-10 rounded-lg shadow text-center">
            <h2 class="text-2xl font-semibold text-gray-700">${sayfaAdi}</h2>
            <p class="mt-4 text-gray-500">Bu bölüm şu anda yapım aşamasındadır.</p>
        </div>
    `;
}


// === 9. MODAL KONTROLLERİ ===
closeModalButton.addEventListener('click', () => { addStudentModal.style.display = 'none'; });
cancelModalButton.addEventListener('click', () => { addStudentModal.style.display = 'none'; });
saveStudentButton.addEventListener('click', saveNewStudent);

closeEditModalButton.addEventListener('click', () => { editStudentModal.style.display = 'none'; });
cancelEditModalButton.addEventListener('click', () => { editStudentModal.style.display = 'none'; });
saveStudentChangesButton.addEventListener('click', saveStudentChanges);

closeDenemeModalButton.addEventListener('click', () => { addDenemeModal.style.display = 'none'; });
cancelDenemeModalButton.addEventListener('click', () => { addDenemeModal.style.display = 'none'; });
saveDenemeButton.addEventListener('click', saveNewDeneme);

closeSoruModalButton.addEventListener('click', () => { addSoruModal.style.display = 'none'; });
cancelSoruModalButton.addEventListener('click', () => { addSoruModal.style.display = 'none'; });
saveSoruButton.addEventListener('click', saveNewSoruTakibi);

closeHedefModalButton.addEventListener('click', () => { addHedefModal.style.display = 'none'; });
cancelHedefModalButton.addEventListener('click', () => { addHedefModal.style.display = 'none'; });
saveHedefButton.addEventListener('click', saveNewHedef);

closeOdevModalButton.addEventListener('click', () => { addOdevModal.style.display = 'none'; });
cancelOdevModalButton.addEventListener('click', () => { addOdevModal.style.display = 'none'; });
saveOdevButton.addEventListener('click', saveNewOdev);

closeNotModalButton.addEventListener('click', () => { addNotModal.style.display = 'none'; });
cancelNotModalButton.addEventListener('click', () => { addNotModal.style.display = 'none'; });
saveNotButton.addEventListener('click', (e) => {
    // Bu butonu, not sekmesi oluşturulurken dinamik olarak bağlıyoruz.
    // O yüzden burada 'saveNewKoclukNotu' çağırmıyoruz.
    // Bu sadece modalı kapatmak için. (Not: Bu butonu modal'dan sildik, renderKoclukNotlariTab içine taşıdık)
});

denemeTuruSelect.addEventListener('change', (e) => {
    renderDenemeNetInputs(e.target.value);
});


// === 10. UYGULAMAYI BAŞLAT ===
main();
