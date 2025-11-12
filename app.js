// 1. Firebase Kütüphanelerini (SDK) içeri aktar
import { initializeApp, setLogLevel } from "https.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    signOut
} from "https.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
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
} from "https.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// =================================================================
// 1. ADIM: BURAYI GÜNCELLE
// Firebase projenizin ayarlarından "firebaseConfig" objesini
// kopyalayıp buraya yapıştırın.
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
// ... (Tüm diğer DOM seçicileri (userName, mainContentArea, tüm modallar vb.) ... )
// (Bu kısım, bir önceki app.js dosyanızdakiyle aynı,
// eksiksiz olduğundan emin olun.)
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");
const mainContentTitle = document.getElementById("mainContentTitle");
const mainContentArea = document.getElementById("mainContentArea");
// ... (Tüm modal seçicileri buraya gelmeli) ...
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
// GÜNCELLENDİ: appId artık config'den geliyor
const appId = firebaseConfig.appId; 

// (SINAV_DERSLERI, soruTakibi state'leri vb. öncekiyle aynı...)
const SINAV_DERSLERI = { /* ... (Tüm sınav dersleri objesi buraya) ... */ };
let soruTakibiUnsubscribe = null;
let soruTakibiZaman = 'haftalik';
let soruTakibiOffset = 0;
let hedeflerUnsubscribe = null;
let odevlerUnsubscribe = null;
let notlarUnsubscribe = null;


// 4. Ana Uygulama Fonksiyonu (Başlatıcı)
async function main() {
    // Firebase'i başlat
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    setLogLevel('debug');

    // GÜNCELLENDİ: GİRİŞ KORUMASI (Auth Guard)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // KULLANICI GİRİŞ YAPMIŞ
            currentUserId = user.uid;
            console.log("Koç giriş yaptı, UID:", currentUserId);
            
            // Kullanıcı bilgilerini arayüze yaz
            updateUIForLoggedInUser(user);
            // Öğrencilerim sayfasını varsayılan olarak yükle
            renderOgrenciSayfasi();
            // Yükleniyor ekranını gizle, ana paneli göster
            loadingSpinner.style.display = 'none';
            appContainer.style.display = 'flex';
        } else {
            // KULLANICI GİRİŞ YAPMAMIŞ
            // Canlı sitede, giriş yapmayan kimse bu sayfayı (index.html) göremez.
            console.log("Giriş yapan kullanıcı yok, login.html'e yönlendiriliyor.");
            // Hemen login.html'e yönlendir!
            window.location.href = 'login.html';
        }
    });

    // GÜNCELLENDİ: Canvas'a özel otomatik giriş kodları kaldırıldı.
    // Artık sadece onAuthStateChanged dinleyicisi çalışıyor.
}

// ... (Buradan sonraki tüm kodlar: updateUIForLoggedInUser, renderOgrenciSayfasi,
// loadOgrenciler, renderStudentList, saveNewStudent, renderOgrenciDetaySayfasi,
// tüm sekme (tab) fonksiyonları (denemeler, soru takibi, hedefler, notlar),
// tüm modal kaydetme fonksiyonları (saveNewDeneme, saveNewSoruTakibi vb.)
// ve modal kontrolleri... hepsi bir önceki app.js dosyanızdakiyle AYNI)

// (Önceki app.js dosyanızdaki kodun tamamını buraya kopyalayın)
// ÖNEMLİ: Sadece 'main' fonksiyonu yukarıdaki gibi güncellenmiş olmalı.
// Geri kalan tüm render... ve save... fonksiyonları olduğu gibi kalacak.

// === 5. Arayüz Güncelleme Fonksiyonları ===
function updateUIForLoggedInUser(user) {
    // ... (kod öncekiyle aynı) ...
}

// === 6. "ÖĞRENCİLERİM" SAYFASI FONKSİYONLARI ===
function renderOgrenciSayfasi() {
    // ... (kod öncekiyle aynı) ...
}
function loadOgrenciler() {
    // ... (kod öncekiyle aynı) ...
}
function renderStudentList(students) {
    // ... (kod öncekiyle aynı) ...
}
async function saveNewStudent() {
    // ... (kod öncekiyle aynı) ...
}

// === 7. "ÖĞRENCİ DETAY" SAYFASI (ve tüm alt sekmeleri) ===
function renderOgrenciDetaySayfasi(studentId, studentName) {
    // ... (kod öncekiyle aynı) ...
}
async function renderOzetTab(studentId) {
    // ... (kod öncekiyle aynı) ...
}
function renderDenemelerTab(studentId, studentName) {
    // ... (kod öncekiyle aynı) ...
}
function renderDenemeNetInputs(tur) {
    // ... (kod öncekiyle aynı) ...
}
function loadDenemeler(studentId) {
    // ... (kod öncekiyle aynı) ...
}
function renderDenemeList(denemeler, studentId) {
    // ... (kod öncekiyle aynı) ...
}
async function saveNewDeneme() {
    // ... (kod öncekiyle aynı) ...
}
// ... (Tüm Soru Takibi fonksiyonları) ...
// ... (Tüm Hedefler & Ödevler fonksiyonları) ...
// ... (Tüm Koçluk Notları fonksiyonları) ...
// ... (Tüm Düzenleme fonksiyonları) ...
// ... (Tüm Placeholder fonksiyonları) ...
// ... (Tüm Modal Kontrolleri) ...


// === 10. UYGULAMAYI BAŞLAT ===
main();
