// =========================================================
// 1. Firebase SDK Import
// =========================================================
import {
    initializeApp, setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import {
    getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import {
    getFirestore, doc, getDoc, setDoc, addDoc, updateDoc,
    collection, query, where, onSnapshot, deleteDoc, orderBy,
    serverTimestamp, limit, increment, getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// =========================================================
// 2. Firebase Config
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

// =========================================================
// 3. DOM ELEMENTLERİ
// =========================================================
const loadingSpinner = document.getElementById("loadingSpinner");
const appContainer = document.getElementById("appContainer");

const userAvatar = document.getElementById("userAvatar");
const userName   = document.getElementById("userName");
const userEmail  = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");

const mainContentTitle = document.getElementById("mainContentTitle");
const mainContentArea  = document.getElementById("mainContentArea");


// ---------------------------------------------------------
// Modals – Öğrenci / Deneme / Soru / Hedef / Ödev / Randevu
// ---------------------------------------------------------
const addStudentModal = document.getElementById("addStudentModal");
const editStudentModal = document.getElementById("editStudentModal");

const studentDersSecimiContainer = document.getElementById("studentDersSecimiContainer");
const editStudentDersSecimiContainer = document.getElementById("editStudentDersSecimiContainer");

const addDenemeModal = document.getElementById("addDenemeModal");
const addSoruModal   = document.getElementById("addSoruModal");
const addHedefModal  = document.getElementById("addHedefModal");
const addOdevModal   = document.getElementById("addOdevModal");
const addRandevuModal = document.getElementById("addRandevuModal");


// =========================================================
// 4. GLOBAL STATE
// =========================================================
let auth, db;
let currentUserId = null;

let studentUnsubscribe = null;
let soruTakibiUnsubscribe = null;
let hedeflerUnsubscribe = null;
let odevlerUnsubscribe = null;
let notlarUnsubscribe = null;
let ajandaUnsubscribe = null;
let muhasebeUnsubscribe = null;
let chatUnsubscribe = null;


// =========================================================
// 5. Tüm Snapshot Dinleyicilerini Temizle
// =========================================================
function cleanUpListeners() {
    [
        studentUnsubscribe,
        soruTakibiUnsubscribe,
        hedeflerUnsubscribe,
        odevlerUnsubscribe,
        notlarUnsubscribe,
        ajandaUnsubscribe,
        muhasebeUnsubscribe,
        chatUnsubscribe
    ].forEach(u => { if (u) u(); });

    studentUnsubscribe = soruTakibiUnsubscribe = hedeflerUnsubscribe =
    odevlerUnsubscribe = notlarUnsubscribe = ajandaUnsubscribe =
    muhasebeUnsubscribe = chatUnsubscribe = null;

    console.log("🔥 Tüm dinleyiciler temizlendi.");
}


// =========================================================
// 6. Ana Başlatıcı
// =========================================================
async function main() {

    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    setLogLevel("debug");

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        currentUserId = user.uid;

        loadingSpinner.style.display = "none";
        appContainer.style.display = "flex";

        updateUIForLoggedInUser(user);
        renderAnaSayfa(); // Varsayılan sayfa
    });
}


// =========================================================
// 7. Üst Menü & Kullanıcı Bilgileri
// =========================================================
function updateUIForLoggedInUser(user) {

    const displayName = user.email.split("@")[0];
    userName.textContent = displayName;
    userEmail.textContent = user.email;
    userAvatar.textContent = displayName[0].toUpperCase();

    logoutButton.addEventListener("click", () => {
        signOut(auth).then(() => window.location.href = "login.html");
    });

    // Menüler
    document.querySelectorAll(".nav-link").forEach(menu => {
        menu.addEventListener("click", (e) => {
            e.preventDefault();

            cleanUpListeners();

            document.querySelectorAll(".nav-link")
                .forEach(m => m.classList.remove("active", "bg-purple-100"));

            menu.classList.add("active", "bg-purple-100");

            const sayfa = menu.id.replace("nav-", "");

            switch (sayfa) {
                case "anasayfa": renderAnaSayfa(); break;
                case "ogrencilerim": renderOgrenciSayfasi(); break;
                case "ajandam": renderAjandaSayfasi(); break;
                case "muhasebe": renderMuhasebeSayfasi(); break;
                case "mesajlar": renderMesajlarSayfasi(); break;
                default: renderPlaceholderSayfasi(sayfa);
            }
        });
    });
}
// =========================================================
// 8. Öğrenciler Sayfası
// =========================================================
function renderOgrenciSayfasi() {

    mainContentTitle.textContent = "Öğrencilerim";

    mainContentArea.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <input id="searchStudentInput" 
                   type="text" placeholder="Öğrenci ara..."
                   class="px-3 py-2 border rounded-lg w-1/3">

            <button id="showAddStudentModalButton"
                class="bg-purple-600 text-white px-4 py-2 rounded-lg">
                Yeni Öğrenci Ekle
            </button>
        </div>

        <div id="studentListContainer" 
            class="bg-white rounded-lg p-4 shadow">
            <p class="text-gray-500 text-center py-4">Öğrenciler yükleniyor...</p>
        </div>
    `;

    document.getElementById("showAddStudentModalButton").addEventListener("click", () => {
        document.getElementById("studentName").value = "";
        document.getElementById("studentSurname").value = "";
        document.getElementById("studentClass").value = "12. Sınıf";

        modalErrorMessage.classList.add("hidden");
        renderDersSecimi("12. Sınıf", studentDersSecimiContainer);

        addStudentModal.style.display = "block";
    });

    loadOgrenciler();
}


// =========================================================
// 9. Öğrencileri yükle ve liste oluştur
// =========================================================
function loadOgrenciler() {

    const container = document.getElementById("studentListContainer");

    const q = query(collection(db, "koclar", currentUserId, "ogrencilerim"));

    studentUnsubscribe = onSnapshot(q, (snapshot) => {
        const students = [];

        snapshot.forEach(d => students.push({ id: d.id, ...d.data() }));

        renderStudentList(students);
    });
}


// =========================================================
// 10. Öğrenci Listesini Render Et
// =========================================================
function renderStudentList(students) {

    let container = document.getElementById("studentListContainer");

    if (!students.length) {
        container.innerHTML = `<p class="text-gray-400 text-center py-4">Henüz öğrenci yok.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-2 text-left">Ad Soyad</th>
                    <th class="px-4 py-2 text-left">Sınıf</th>
                    <th class="px-4 py-2 text-left">Bakiye</th>
                    <th class="px-4 py-2"></th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
                ${students.map(s => {

                    const bakiye = (s.toplamBorc || 0) - (s.toplamOdenen || 0);
                    const bakiyeClass = bakiye > 0 ? "text-red-600 font-semibold" :
                                        bakiye < 0 ? "text-green-600 font-semibold" :
                                                    "text-gray-700";

                    return `
                        <tr>
                            <td class="px-4 py-2">${s.ad} ${s.soyad}</td>
                            <td class="px-4 py-2">${s.sinif}</td>
                            <td class="px-4 py-2 ${bakiyeClass}">
                                ${formatCurrency(bakiye)}
                            </td>
                            <td class="px-4 py-2 text-right">
                                <button 
                                    class="profilBtn text-purple-600" 
                                    data-id="${s.id}"
                                    data-name="${s.ad} ${s.soyad}">
                                    Profili Gör
                                </button>
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;

    document.querySelectorAll(".profilBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            renderOgrenciDetaySayfasi(btn.dataset.id, btn.dataset.name);
        });
    });
}


// =========================================================
// 11. Ders Seçimi Component
// =========================================================
function renderDersSecimi(sinif, container, selected = []) {

    container.innerHTML = "";

    const ORTAOKUL = ["Türkçe","Matematik","Fen Bilimleri","Sosyal Bilgiler","T.C. İnkılap","Din Kültürü","İngilizce"];
    const LISE = ["Türk Dili ve Edebiyatı","Matematik","Geometri","Fizik","Kimya","Biyoloji","Tarih","Coğrafya","Felsefe","Din Kültürü","İngilizce"];

    const dersler = ["5. Sınıf","6. Sınıf","7. Sınıf","8. Sınıf"].includes(sinif)
        ? ORTAOKUL : LISE;

    dersler.forEach(ders => {

        const id = "ders-" + ders.replace(/\s+/g, "-");

        const wrap = document.createElement("div");
        wrap.className = "flex items-center";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = ders;
        cb.id = id;
        cb.className = "student-ders-checkbox h-4 w-4 text-purple-600 border-gray-300 rounded";

        if (!selected.length || selected.includes(ders)) {
            cb.checked = true;
        }

        const label = document.createElement("label");
        label.textContent = ders;
        label.className = "ml-2 text-sm cursor-pointer";
        label.htmlFor = id;

        wrap.appendChild(cb);
        wrap.appendChild(label);
        container.appendChild(wrap);
    });
}


// =========================================================
// 12. Yeni Öğrenci Kaydet
// =========================================================
async function saveNewStudent() {

    const ad = studentName.value.trim();
    const soyad = studentSurname.value.trim();
    const sinif = studentClass.value;

    const dersler = [];
    studentDersSecimiContainer.querySelectorAll("input:checked")
        .forEach(cb => dersler.push(cb.value));

    if (!ad || !soyad) {
        modalErrorMessage.textContent = "Ad & Soyad zorunludur.";
        modalErrorMessage.classList.remove("hidden");
        return;
    }

    try {
        saveStudentButton.disabled = true;
        saveStudentButton.textContent = "Kaydediliyor...";

        await addDoc(collection(db, "koclar", currentUserId, "ogrencilerim"), {
            ad, soyad, sinif,
            takipDersleri: dersler,
            toplamBorc: 0,
            toplamOdenen: 0,
            olusturmaTarihi: serverTimestamp()
        });

        addStudentModal.style.display = "none";

    } finally {
        saveStudentButton.disabled = false;
        saveStudentButton.textContent = "Kaydet";
    }
}


// =========================================================
// 13. Öğrenci Detay Sayfası
// =========================================================
function renderOgrenciDetaySayfasi(studentId, studentName) {

    cleanUpListeners();

    mainContentTitle.textContent = studentName + " - Detay";

    mainContentArea.innerHTML = `
        <button id="geriDon" class="text-purple-600 mb-4">&larr; Geri</button>

        <div class="bg-white p-6 rounded-lg shadow flex items-center mb-6">
            <div class="h-16 w-16 bg-purple-100 text-purple-600 flex items-center justify-center rounded-full text-xl font-bold">
                ${studentName.split(" ").map(i => i[0]).join("")}
            </div>
            <div class="ml-4">
                <h2 class="text-3xl font-bold">${studentName}</h2>
                <p id="studentDetailClass" class="text-gray-500">Yükleniyor...</p>
            </div>
        </div>

        <p class="text-gray-500 text-center p-4">Detay modülleri (Denemeler, Soru Takibi, Hedefler...) eklenmek için hazır.</p>
    `;

    document.getElementById("geriDon").addEventListener("click", () => {
        renderOgrenciSayfasi();
    });

    getStudentClass(studentId);
}


// Öğrenci sınıfını tek sorgu ile doldur
async function getStudentClass(studentId) {
    const ref = doc(db, "koclar", currentUserId, "ogrencilerim", studentId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        document.getElementById("studentDetailClass").textContent = snap.data().sinif;
    }
}
// =========================================================
// 14. Format Yardımcısı
// =========================================================
function formatCurrency(n) {
    return "₺" + Number(n).toLocaleString("tr-TR");
}


// =========================================================
// 15. Placeholder (yakında gelecek sayfa)
// =========================================================
function renderPlaceholderSayfasi(text) {
    mainContentArea.innerHTML = `
        <div class="p-6 bg-white rounded-xl text-center">
            <h2 class="text-xl font-semibold text-purple-700">${text}</h2>
            <p class="text-gray-500 mt-2">Bu sayfa yakında eklenecek.</p>
        </div>
    `;
}


// =========================================================
// 16. Ajanda – Basit Yer Tutucu
// =========================================================
function renderAjandaSayfasi() {
    mainContentTitle.textContent = "Ajandam";
    mainContentArea.innerHTML = `
        <div class="p-6 bg-white rounded-xl text-center">
            <p class="text-gray-500">Ajanda modülü eklenmeye hazır.</p>
        </div>
    `;
}


// =========================================================
// 17. Muhasebe – Placeholder
// =========================================================
function renderMuhasebeSayfasi() {
    mainContentTitle.textContent = "Muhasebe";
    mainContentArea.innerHTML = `
        <div class="p-6 bg-white rounded-xl text-center">
            <p class="text-gray-500">Muhasebe modülü burada çalışacak.</p>
        </div>
    `;
}


// =========================================================
// 18. Mesajlar – Placeholder
// =========================================================
function renderMesajlarSayfasi() {
    mainContentTitle.textContent = "Mesajlar";
    mainContentArea.innerHTML = `
        <div class="p-6 bg-white rounded-xl text-center">
            <p class="text-gray-500">Mesajlaşma modülü eklenmeye hazır.</p>
        </div>
    `;
}


// =========================================================
// 19. Uygulama Başlat
// =========================================================
main();
