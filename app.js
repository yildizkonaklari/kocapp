/* =====================================================================
   FIREBASE – BAĞLANTI VE TEMEL AYARLAR
===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* =====================================================================
   SENİN FIREBASE AYARLARIN (DEĞİŞTİR)
===================================================================== */
const firebaseConfig = {
apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

/* =====================================================================
   GLOBAL HTML ELEMENTLERİ
===================================================================== */
const loadingSpinner = document.getElementById("loadingSpinner");
const appContainer   = document.getElementById("appContainer");
const mainTitle      = document.getElementById("mainContentTitle");
const mainArea       = document.getElementById("mainContentArea");

/* =====================================================================
   OTURUM KONTROLÜ
===================================================================== */
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loadingSpinner.classList.add("hidden");
        appContainer.classList.remove("hidden");

        document.getElementById("userName").textContent = user.displayName || "Koç";
        document.getElementById("userEmail").textContent = user.email;

        loadStudentsPage();  
    } else {
        window.location.href = "login.html";
    }
});

/* =====================================================================
   ÇIKIŞ YAP
===================================================================== */
document.getElementById("logoutButton").addEventListener("click", async () => {
    await signOut(auth);
});

/* =====================================================================
   NAVİGASYON SİSTEMİ
===================================================================== */
const navLinks = {
    "nav-anasayfa": () => loadHomePage(),
    "nav-ajandam": () => loadAjandaPage(),
    "nav-muhasebe": () => loadMuhasebePage(),
    "nav-ogrencilerim": () => loadStudentsPage(),
    "nav-mesajlar": () => loadMesajlarPage(),
};

Object.keys(navLinks).forEach(id => {
    document.getElementById(id).addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelectorAll(".nav-link").forEach(n => n.classList.remove("active", "bg-purple-100", "text-purple-700"));

        document.getElementById(id).classList.add("active", "bg-purple-100", "text-purple-700");
        navLinks[id]();
    });
});

/* =====================================================================
   SAYFA YÜKLEYİCİ FONKSİYONLAR (BOŞ İSKELET)
===================================================================== */

function loadHomePage() {
    mainTitle.textContent = "Ana Sayfa";
    mainArea.innerHTML = `<p class="text-gray-500">Dashboard yakında...</p>`;
}

function loadAjandaPage() {
    mainTitle.textContent = "Ajandam";
    mainArea.innerHTML = `<p class="text-gray-500">Ajanda sistemi hazırlanıyor...</p>`;
}

function loadMuhasebePage() {
    mainTitle.textContent = "Muhasebe";
    mainArea.innerHTML = `<p class="text-gray-500">Gelir - gider sistemi hazırlanıyor...</p>`;
}

function loadMesajlarPage() {
    mainTitle.textContent = "Mesajlar";
    mainArea.innerHTML = `<p class="text-gray-500">Mesajlaşma sistemi hazırlanıyor...</p>`;
}

/* =====================================================================
   ÖĞRENCİLER SAYFASI – ANA YÜKLEYİCİ
===================================================================== */
async function loadStudentsPage() {
    mainTitle.textContent = "Öğrencilerim";

    mainArea.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Öğrenci Listesi</h2>
            <button id="openAddStudentModal"
                class="px-4 py-2 bg-purple-600 text-white rounded-md shadow hover:bg-purple-700">
                + Yeni Öğrenci
            </button>
        </div>

        <div id="studentsList" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
    `;

    loadStudentsSnapshot();
}

/* =====================================================================
   FIRESTORE'DAN ÖĞRENCİLERİ ANLIK ÇEK (Gerçek zamanlı)
===================================================================== */
function loadStudentsSnapshot() {
    const listArea = document.getElementById("studentsList");

    const q = query(
        collection(db, "students"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
        listArea.innerHTML = "";

        if (snapshot.empty) {
            listArea.innerHTML = `<p class="text-gray-500">Kayıtlı öğrenci bulunmuyor.</p>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const std = docSnap.data();

            listArea.innerHTML += `
                <div class="p-4 bg-white shadow rounded-md border">
                    <p class="text-lg font-semibold">${std.name} ${std.surname}</p>
                    <p class="text-sm text-gray-500">${std.class}</p>

                    <button onclick="openStudentDetail('${docSnap.id}')"
                        class="mt-3 text-sm text-purple-600 hover:underline">Detay</button>
                </div>
            `;
        });
    });
}

/* =====================================================================
   YENİ ÖĞRENCİ MODALINI AÇ
===================================================================== */
document.addEventListener("click", (e) => {
    if (e.target.id === "openAddStudentModal") {
        document.getElementById("addStudentModal").classList.remove("hidden");
    }
});
/* =====================================================================
   DERS HAVUZU (Sınıfa göre takip edilecek dersler)
===================================================================== */
const DERS_HAVUZU = {
    ORTAOKUL: [ // 5–8. sınıflar
        "Türkçe",
        "Matematik",
        "Fen Bilimleri",
        "Sosyal Bilgiler",
        "T.C. İnkılap Tarihi",
        "Din Kültürü",
        "İngilizce"
    ],
    LISE: [ // 9–12 ve Mezun
        "Türk Dili ve Edebiyatı",
        "Matematik",
        "Geometri",
        "Fizik",
        "Kimya",
        "Biyoloji",
        "Tarih",
        "Coğrafya",
        "Felsefe",
        "Din Kültürü",
        "İngilizce"
    ]
};

/* =====================================================================
   YARDIMCI: Sınıfa göre hangi ders listesi gelecek?
===================================================================== */
function getDersListByClass(className) {
    const ortaokulSiniflar = ["5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf"];
    if (ortaokulSiniflar.includes(className)) return DERS_HAVUZU.ORTAOKUL;
    return DERS_HAVUZU.LISE;
}

/* =====================================================================
   YARDIMCI: Ders seçim alanını doldur
===================================================================== */
function renderDersSecimi(container, className, selectedDersler = []) {
    if (!container) return;

    const dersler = getDersListByClass(className);
    container.innerHTML = "";

    dersler.forEach(ders => {
        const idSafe = ders.replace(/\s+/g, "-").toLowerCase();

        const wrapper = document.createElement("div");
        wrapper.className = "flex items-center";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = ders;
        input.id = `ders-${idSafe}`;
        input.className = "student-ders-checkbox h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded";

        // Eğer düzenle modunda seçili dersler geldiyse ona göre işaretle
        if (selectedDersler.length > 0) {
            if (selectedDersler.includes(ders)) {
                input.checked = true;
            }
        } else {
            // Yeni öğrencide varsayılan: hepsi seçili
            input.checked = true;
        }

        const label = document.createElement("label");
        label.htmlFor = input.id;
        label.className = "ml-2 block text-sm text-gray-900 cursor-pointer";
        label.textContent = ders;

        wrapper.appendChild(input);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
}

/* =====================================================================
   MODAL ELEMENTLERİ (Öğrenci ekle / düzenle)
===================================================================== */
const addStudentModalEl          = document.getElementById("addStudentModal");
const closeModalButtonEl         = document.getElementById("closeModalButton");
const cancelModalButtonEl        = document.getElementById("cancelModalButton");
const saveStudentButtonEl        = document.getElementById("saveStudentButton");
const modalErrorMessageEl        = document.getElementById("modalErrorMessage");
const studentClassSelectEl       = document.getElementById("studentClass");
const studentDersSecimiContainer = document.getElementById("studentDersSecimiContainer");

const editStudentModalEl          = document.getElementById("editStudentModal");
const closeEditModalButtonEl      = document.getElementById("closeEditModalButton");
const cancelEditModalButtonEl     = document.getElementById("cancelEditModalButton");
const saveStudentChangesButtonEl  = document.getElementById("saveStudentChangesButton");
const editModalErrorMessageEl     = document.getElementById("editModalErrorMessage");
const editStudentIdEl             = document.getElementById("editStudentId");
const editStudentNameEl           = document.getElementById("editStudentName");
const editStudentSurnameEl        = document.getElementById("editStudentSurname");
const editStudentClassSelectEl    = document.getElementById("editStudentClass");
const editStudentDersContainerEl  = document.getElementById("editStudentDersSecimiContainer");

/* =====================================================================
   YENİ ÖĞRENCİ MODALINI HAZIRLA & AÇ
===================================================================== */
function openAddStudentModal() {
    if (!addStudentModalEl) return;

    // Alanları temizle
    document.getElementById("studentName").value    = "";
    document.getElementById("studentSurname").value = "";
    studentClassSelectEl.value = "12. Sınıf";

    // Dersleri doldur
    renderDersSecimi(studentDersSecimiContainer, studentClassSelectEl.value);

    // Hata mesajını gizle
    modalErrorMessageEl.classList.add("hidden");
    modalErrorMessageEl.textContent = "";

    // Modal göster
    addStudentModalEl.classList.remove("hidden");
}

/* openAddStudentModal tetikleme – Bölüm 1’deki event’e ek güç veriyoruz */
document.addEventListener("click", (e) => {
    if (e.target.id === "openAddStudentModal") {
        // Modal’ı hazırlayıp aç
        openAddStudentModal();
    }
});

/* Sınıf değiştikçe dersleri yeniden çiz */
if (studentClassSelectEl) {
    studentClassSelectEl.addEventListener("change", () => {
        renderDersSecimi(studentDersSecimiContainer, studentClassSelectEl.value);
    });
}

/* Modal kapatma (x ve İptal) */
if (closeModalButtonEl) {
    closeModalButtonEl.addEventListener("click", () => {
        addStudentModalEl.classList.add("hidden");
    });
}
if (cancelModalButtonEl) {
    cancelModalButtonEl.addEventListener("click", () => {
        addStudentModalEl.classList.add("hidden");
    });
}

/* =====================================================================
   YENİ ÖĞRENCİYİ FIRESTORE'A KAYDET
===================================================================== */
async function saveNewStudent() {
    const name    = document.getElementById("studentName").value.trim();
    const surname = document.getElementById("studentSurname").value.trim();
    const sinif   = studentClassSelectEl.value;

    if (!name || !surname) {
        modalErrorMessageEl.textContent = "Ad ve Soyad alanları zorunludur.";
        modalErrorMessageEl.classList.remove("hidden");
        return;
    }

    // Seçilen dersleri topla
    const selectedDersler = [];
    studentDersSecimiContainer
        .querySelectorAll(".student-ders-checkbox:checked")
        .forEach(cb => selectedDersler.push(cb.value));

    try {
        saveStudentButtonEl.disabled = true;
        saveStudentButtonEl.textContent = "Kaydediliyor...";

        await addDoc(collection(db, "students"), {
            name,
            surname,
            class: sinif,
            takipDersleri: selectedDersler,
            createdAt: Date.now()
        });

        // Modalı kapat
        addStudentModalEl.classList.add("hidden");
    } catch (err) {
        console.error("Öğrenci ekleme hatası:", err);
        modalErrorMessageEl.textContent = "Öğrenci eklenirken bir hata oluştu: " + err.message;
        modalErrorMessageEl.classList.remove("hidden");
    } finally {
        saveStudentButtonEl.disabled = false;
        saveStudentButtonEl.textContent = "Kaydet";
    }
}

/* Kaydet butonu */
if (saveStudentButtonEl) {
    saveStudentButtonEl.addEventListener("click", (e) => {
        e.preventDefault();
        saveNewStudent();
    });
}

/* =====================================================================
   ÖĞRENCİ DETAY SAYFASI + DÜZENLEME MODALI
===================================================================== */

// Detay sayfası, Bölüm 1'deki "openStudentDetail" çağrısına yanıt verir
async function openStudentDetail(studentId) {
    try {
        const ref  = doc(db, "students", studentId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            mainArea.innerHTML = `<p class="text-red-500">Öğrenci bulunamadı.</p>`;
            return;
        }

        const data = snap.data();
        mainTitle.textContent = `${data.name} ${data.surname} - Profil`;

        mainArea.innerHTML = `
            <div class="mb-4">
                <button id="backToStudents"
                    class="text-sm text-gray-600 hover:text-purple-600 flex items-center">
                    <i class="fa-solid fa-arrow-left mr-1"></i> Öğrenci listesine dön
                </button>
            </div>

            <div class="bg-white p-5 rounded-md shadow border mb-4 flex items-center">
                <div class="h-14 w-14 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-2xl font-bold mr-4">
                    ${data.name[0] ?? ""}${data.surname[0] ?? ""}
                </div>
                <div class="flex-1">
                    <p class="text-xl font-semibold text-gray-800">${data.name} ${data.surname}</p>
                    <p class="text-sm text-gray-500">${data.class} öğrencisi</p>
                    <p class="text-xs text-gray-400 mt-1">
                        Takip edilen dersler: ${Array.isArray(data.takipDersleri) && data.takipDersleri.length > 0
                            ? data.takipDersleri.join(", ")
                            : "Henüz seçilmemiş"}
                    </p>
                </div>
                <div>
                    <button id="openEditStudentModalBtn"
                        class="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700">
                        Bilgileri Düzenle
                    </button>
                </div>
            </div>

            <div class="bg-white p-4 rounded-md shadow border">
                <p class="text-gray-500 text-sm">
                    Buraya ilerleyen bölümlerde <strong>Denemeler, Soru Takibi, Ödevler, Notlar</strong> sekmeleri gelecek.
                </p>
            </div>
        `;

        // Geri dön
        document.getElementById("backToStudents").addEventListener("click", () => {
            loadStudentsPage();
        });

        // Düzenleme modalını aç
        document.getElementById("openEditStudentModalBtn").addEventListener("click", () => {
            openEditStudentModal(studentId, data);
        });

    } catch (err) {
        console.error("Öğrenci detayı alınırken hata:", err);
        mainArea.innerHTML = `<p class="text-red-500">Öğrenci detayı yüklenirken hata oluştu: ${err.message}</p>`;
    }
}

// openStudentDetail'i global'e at (HTML içi onclick kullanıyor)
window.openStudentDetail = openStudentDetail;

/* =====================================================================
   ÖĞRENCİ DÜZENLEME MODALINI AÇ
===================================================================== */
function openEditStudentModal(studentId, studentData) {
    if (!editStudentModalEl) return;

    editStudentIdEl.value         = studentId;
    editStudentNameEl.value       = studentData.name;
    editStudentSurnameEl.value    = studentData.surname;
    editStudentClassSelectEl.value = studentData.class || "12. Sınıf";

    // Dersleri doldur
    const mevcutDersler = Array.isArray(studentData.takipDersleri) ? studentData.takipDersleri : [];
    renderDersSecimi(editStudentDersContainerEl, editStudentClassSelectEl.value, mevcutDersler);

    editModalErrorMessageEl.classList.add("hidden");
    editModalErrorMessageEl.textContent = "";

    editStudentModalEl.classList.remove("hidden");
}

/* Sınıf değiştikçe edit modalında dersleri yeniden çiz */
if (editStudentClassSelectEl) {
    editStudentClassSelectEl.addEventListener("change", () => {
        const mevcutSecimler = []; // sınıf değişince hepsini sıfırdan seçtirebiliriz
        renderDersSecimi(editStudentDersContainerEl, editStudentClassSelectEl.value, mevcutSecimler);
    });
}

/* Düzenleme modali kapatma */
if (closeEditModalButtonEl) {
    closeEditModalButtonEl.addEventListener("click", () => {
        editStudentModalEl.classList.add("hidden");
    });
}
if (cancelEditModalButtonEl) {
    cancelEditModalButtonEl.addEventListener("click", () => {
        editStudentModalEl.classList.add("hidden");
    });
}

/* =====================================================================
   ÖĞRENCİ BİLGİLERİNİ GÜNCELLE
===================================================================== */
async function saveStudentChanges() {
    const id      = editStudentIdEl.value;
    const name    = editStudentNameEl.value.trim();
    const surname = editStudentSurnameEl.value.trim();
    const sinif   = editStudentClassSelectEl.value;

    if (!name || !surname) {
        editModalErrorMessageEl.textContent = "Ad ve Soyad alanları zorunludur.";
        editModalErrorMessageEl.classList.remove("hidden");
        return;
    }

    const selectedDersler = [];
    editStudentDersContainerEl
        .querySelectorAll(".student-ders-checkbox:checked")
        .forEach(cb => selectedDersler.push(cb.value));

    try {
        saveStudentChangesButtonEl.disabled = true;
        saveStudentChangesButtonEl.textContent = "Güncelleniyor...";

        const ref = doc(db, "students", id);
        await updateDoc(ref, {
            name,
            surname,
            class: sinif,
            takipDersleri: selectedDersler
        });

        editStudentModalEl.classList.add("hidden");

        // Detay sayfası açıksa bilgileri güncellemek için tekrar aç
        openStudentDetail(id);
    } catch (err) {
        console.error("Öğrenci güncelleme hatası:", err);
        editModalErrorMessageEl.textContent = "Güncelleme sırasında hata oluştu: " + err.message;
        editModalErrorMessageEl.classList.remove("hidden");
    } finally {
        saveStudentChangesButtonEl.disabled = false;
        saveStudentChangesButtonEl.textContent = "Değişiklikleri Kaydet";
    }
}

if (saveStudentChangesButtonEl) {
    saveStudentChangesButtonEl.addEventListener("click", (e) => {
        e.preventDefault();
        saveStudentChanges();
    });
}
/* =====================================================================
   ======================  S O R U   T A K İ B İ  ======================
   ===================================================================== */

/* ---------------------------------------------------------------
   Sınıfa göre yanlış – doğru kırpma kuralı
-----------------------------------------------------------------*/
function calculateGecerliDogru(sinif, dogru, yanlis) {
    const ortaokul = ["5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf"];

    let oran = ortaokul.includes(sinif) ? 3 : 4;
    let kaybolan = Math.floor(yanlis / oran);

    let gecerliDogru = dogru - kaybolan;
    if (gecerliDogru < 0) gecerliDogru = 0;

    return gecerliDogru;
}

/* =====================================================================
   ÖĞRENCİ PROFİLİNE "SORU TAKİBİ" SEKME ALANI EKLE
===================================================================== */
function renderSoruTakibiTab(studentId, studentData) {
    return `
        <div class="mt-6">
            <div class="flex justify-between items-center mb-3">
                <h2 class="text-lg font-semibold text-gray-800">Soru Takibi</h2>

                <button onclick="openAddSoruModal('${studentId}')"
                    class="px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700">
                    + Veri Ekle
                </button>
            </div>

            <div id="soruTakipListesi" class="space-y-3">
                <p class="text-gray-400 text-sm">Veriler yükleniyor...</p>
            </div>
        </div>
    `;
}

/* =====================================================================
   SORU TAKİBİ MODALINI AÇ
===================================================================== */
function openAddSoruModal(studentId) {
    document.getElementById("currentStudentIdForSoruTakibi").value = studentId;

    document.getElementById("soruTarihi").value  = "";
    document.getElementById("soruDers").value    = "";
    document.getElementById("soruKonu").value    = "";
    document.getElementById("soruDogru").value   = "";
    document.getElementById("soruYanlis").value  = "";
    document.getElementById("soruBos").value     = "";

    document.getElementById("soruModalErrorMessage").classList.add("hidden");

    document.getElementById("addSoruModal").classList.remove("hidden");
}

window.openAddSoruModal = openAddSoruModal;

/* =====================================================================
   SORU TAKİBİ VERİSİ EKLE
===================================================================== */
async function saveSoruTakibi() {
    const studentId = document.getElementById("currentStudentIdForSoruTakibi").value;

    const tarih  = document.getElementById("soruTarihi").value;
    const ders   = document.getElementById("soruDers").value.trim();
    const konu   = document.getElementById("soruKonu").value.trim();
    const dogru  = parseInt(document.getElementById("soruDogru").value || 0);
    const yanlis = parseInt(document.getElementById("soruYanlis").value || 0);
    const bos    = parseInt(document.getElementById("soruBos").value || 0);

    const errEl = document.getElementById("soruModalErrorMessage");

    if (!tarih || !ders || !konu) {
        errEl.textContent = "Tarih, ders ve konu zorunludur.";
        errEl.classList.remove("hidden");
        return;
    }

    try {
        // Öğrencinin sınıfı lazim
        const ref  = doc(db, "students", studentId);
        const snap = await getDoc(ref);
        const data = snap.data();
        const sinif = data.class;

        // Senin kural: geçerli doğru (NET DEĞİL!)
        const gecerliDogru = calculateGecerliDogru(sinif, dogru, yanlis);

        await addDoc(collection(db, "students", studentId, "soruTakibi"), {
            tarih,
            ders,
            konu,
            dogru,
            yanlis,
            bos,
            gecerliDogru,
            createdAt: Date.now()
        });

        document.getElementById("addSoruModal").classList.add("hidden");

        // Listeyi yeniden yükle
        loadSoruTakipListesi(studentId);

    } catch (err) {
        errEl.textContent = "Kayıt sırasında hata oluştu: " + err.message;
        errEl.classList.remove("hidden");
    }
}

document.getElementById("saveSoruButton").addEventListener("click", saveSoruTakibi);

document.getElementById("cancelSoruModalButton").addEventListener("click", () => {
    document.getElementById("addSoruModal").classList.add("hidden");
});
document.getElementById("closeSoruModalButton").addEventListener("click", () => {
    document.getElementById("addSoruModal").classList.add("hidden");
});

/* =====================================================================
   SORU TAKİBİ VERİLERİNİ ÖĞRENCİ DETAYINDA GÖSTER
===================================================================== */
async function loadSoruTakipListesi(studentId) {
    const container = document.getElementById("soruTakipListesi");
    if (!container) return;

    const q = query(
        collection(db, "students", studentId, "soruTakibi"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snap) => {
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<p class="text-gray-400 text-sm">Henüz veri eklenmemiş.</p>`;
            return;
        }

        snap.forEach(docSnap => {
            const s = docSnap.data();

            container.innerHTML += `
                <div class="p-3 bg-white shadow border rounded-md">
                    <p class="text-sm text-gray-600">
                        <strong>${s.ders}</strong> – ${s.konu}
                    </p>

                    <p class="text-xs text-gray-500 mt-1">
                        Tarih: ${s.tarih}
                    </p>

                    <div class="flex gap-4 text-xs mt-2">
                        <span class="text-green-700">Doğru: ${s.dogru}</span>
                        <span class="text-red-600">Yanlış: ${s.yanlis}</span>
                        <span class="text-gray-700">Boş: ${s.bos}</span>
                    </div>

                    <p class="text-xs text-purple-700 mt-1">
                        <strong>Geçerli Doğru:</strong> ${s.gecerliDogru}
                    </p>
                </div>
            `;
        });
    });
}

/* =====================================================================
   ÖĞRENCİ DETAYINA Soru Takibi sekmesini otomatik eklemek için
   openStudentDetail fonksiyonunu PATCH’liyoruz
===================================================================== */
const originalOpenStudentDetail = openStudentDetail;

openStudentDetail = async function (studentId) {
    await originalOpenStudentDetail(studentId);

    // Öğrenci data ve detay alanı tekrar çekiliyor
    const ref  = doc(db, "students", studentId);
    const snap = await getDoc(ref);
    const data = snap.data();

    // Soru takibi HTML'ini mevcut profilin altına ekliyoruz
    const el = document.createElement("div");
    el.innerHTML = renderSoruTakibiTab(studentId, data);
    mainArea.appendChild(el);

    // Listeyi yükle
    loadSoruTakipListesi(studentId);
};
/* =====================================================================
   ===========================  Ö D E V L E R  ==========================
   ===================================================================== */

/*
 ÖDEV TÜRLERİ:
 - serbest → Tek seferlik görev
 - gunluk  → Her gün için otomatik görev üretir
 - haftalik → Haftalık görev
*/

/* =====================================================================
   ÖDEV SEKMESİ – HTML OLUŞTUR
===================================================================== */
function renderOdevlerTab(studentId) {
    return `
        <div class="mt-6">
            
            <div class="flex justify-between items-center mb-3">
                <h2 class="text-lg font-semibold text-gray-800">Hedefler & Ödevler</h2>

                <button onclick="openAddOdevModal('${studentId}')"
                    class="px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700">
                    + Yeni Ödev
                </button>
            </div>

            <div id="odevListesi" class="space-y-3">
                <p class="text-gray-400">Veriler yükleniyor...</p>
            </div>
        </div>
    `;
}

/* =====================================================================
   MODAL AÇ
===================================================================== */
function openAddOdevModal(studentId) {
    document.getElementById("currentStudentIdForOdev").value = studentId;

    document.getElementById("odevTitle").value = "";
    document.getElementById("odevBaslangicTarihi").value = "";
    document.getElementById("odevBitisTarihi").value = "";
    document.getElementById("odevAciklama").value = "";
    document.getElementById("odevLink").value = "";
    document.getElementById("odevModalErrorMessage").classList.add("hidden");

    document.getElementById("addOdevModal").classList.remove("hidden");
}

window.openAddOdevModal = openAddOdevModal;

/* =====================================================================
   ÖDEV KAYDET
===================================================================== */
async function saveOdev() {
    const studentId = document.getElementById("currentStudentIdForOdev").value;

    const odevTuru = document.querySelector("input[name='odevTuru']:checked").value;
    const title     = document.getElementById("odevTitle").value.trim();
    const baslangic = document.getElementById("odevBaslangicTarihi").value;
    const bitis     = document.getElementById("odevBitisTarihi").value;
    const aciklama  = document.getElementById("odevAciklama").value.trim();
    const link      = document.getElementById("odevLink").value.trim();

    const err = document.getElementById("odevModalErrorMessage");

    if (!title || !baslangic) {
        err.textContent = "Başlık ve başlangıç tarihi zorunludur.";
        err.classList.remove("hidden");
        return;
    }

    try {
        await addDoc(collection(db, "students", studentId, "odevler"), {
            title,
            odevTuru,
            baslangic,
            bitis: bitis || null,
            aciklama,
            link,
            tamamlananGunler: [],
            createdAt: Date.now()
        });

        document.getElementById("addOdevModal").classList.add("hidden");

        loadOdevListesi(studentId);

    } catch (e) {
        err.textContent = "Kayıt hatası: " + e.message;
        err.classList.remove("hidden");
    }
}

document.getElementById("saveOdevButton").addEventListener("click", saveOdev);
document.getElementById("cancelOdevModalButton").addEventListener("click", () => {
    document.getElementById("addOdevModal").classList.add("hidden");
});
document.getElementById("closeOdevModalButton").addEventListener("click", () => {
    document.getElementById("addOdevModal").classList.add("hidden");
});

/* =====================================================================
   ÖDEV LİSTESİNİ YÜKLE (Gerçek zamanlı)
===================================================================== */
function loadOdevListesi(studentId) {
    const container = document.getElementById("odevListesi");
    if (!container) return;

    const q = query(
        collection(db, "students", studentId, "odevler"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snap) => {
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<p class="text-gray-400">Henüz ödev eklenmemiş.</p>`;
            return;
        }

        snap.forEach(docSnap => {
            const o = docSnap.data();
            const id = docSnap.id;

            container.innerHTML += renderOdevCard(studentId, id, o);
        });
    });
}

/* =====================================================================
   ÖDEV KARTI OLUŞTUR
===================================================================== */
function renderOdevCard(studentId, odevId, o) {
    const today = new Date().toISOString().split("T")[0];

    let statusColor = "text-gray-600";
    let badge = "";

    // Gecikme kontrolü
    if (o.bitis && today > o.bitis) {
        badge = `<span class="text-red-700 font-semibold">SÜRESİ GEÇTİ</span>`;
        statusColor = "text-red-700";
    }

    return `
        <div class="p-4 bg-white border rounded-lg shadow">

            <div class="flex justify-between items-center">
                <h3 class="text-md font-semibold text-gray-800">${o.title}</h3>
                ${badge}
            </div>

            <p class="text-sm text-gray-600 mt-1">${o.aciklama || ""}</p>

            ${o.link ? `<a href="${o.link}" target="_blank" class="text-purple-700 underline text-sm mt-1 block">Kaynak Aç</a>` : ""}

            <p class="text-xs mt-2 text-gray-500">
                Başlangıç: ${o.baslangic} <br>
                ${o.bitis ? "Bitiş: " + o.bitis : ""}
            </p>

            ${renderOdevRoutineUI(studentId, odevId, o)}
        </div>
    `;
}

/* =====================================================================
   RUTİN ÖDEV GÖRÜNÜMÜ
===================================================================== */
function renderOdevRoutineUI(studentId, odevId, o) {
    if (o.odevTuru === "serbest") {
        return `
            <button onclick="markOdevDone('${studentId}', '${odevId}')"
                class="mt-3 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                Tamamlandı
            </button>
        `;
    }

    // Günlük ve Haftalık için:
    const today = new Date().toISOString().split("T")[0];
    const isDoneToday = o.tamamlananGunler?.includes(today);

    return `
        <div class="mt-3 flex items-center gap-2">

            <button onclick="markOdevRoutine('${studentId}', '${odevId}')"
                class="px-3 py-2 ${isDoneToday ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"} 
                       text-white text-sm rounded">
                ${isDoneToday ? "Bugün Tamamlandı" : "Bugünü İşaretle"}
            </button>

            ${!isDoneToday && o.bitis && today > o.bitis
                ? `<span class="text-red-700 text-xs font-semibold">GEÇ KALINDI</span>`
                : ""}
        </div>
    `;
}

/* =====================================================================
   TEK SEFERLİK ÖDEV TAMAMLAMA
===================================================================== */
async function markOdevDone(studentId, odevId) {
    await updateDoc(doc(db, "students", studentId, "odevler", odevId), {
        tamamlananGunler: ["done"], // işaretli
    });
}

/* =====================================================================
   GÜNLÜK / HAFTALIK RUTİN TAMAMLAMA
===================================================================== */
async function markOdevRoutine(studentId, odevId) {
    const today = new Date().toISOString().split("T")[0];

    const ref = doc(db, "students", studentId, "odevler", odevId);
    const snap = await getDoc(ref);
    const data = snap.data();

    let arr = data.tamamlananGunler || [];
    if (!arr.includes(today)) arr.push(today);

    await updateDoc(ref, {
        tamamlananGunler: arr
    });
}

/* =====================================================================
   ÖĞRENCİ DETAYINA ÖDEV SEKMESİNİ OTOMATİK EKLE
===================================================================== */
const originalOpenStudentDetailOdev = openStudentDetail;

openStudentDetail = async function (studentId) {
    await originalOpenStudentDetailOdev(studentId);

    const el = document.createElement("div");
    el.innerHTML = renderOdevlerTab(studentId);
    mainArea.appendChild(el);

    loadOdevListesi(studentId);
};
/* =====================================================================
   =========================  H E D E F L E R  =========================
   ===================================================================== */

/* =====================================================================
   HEDEF SEKMESİ – HTML OLUŞTUR
===================================================================== */
function renderHedeflerTab(studentId) {
    return `
        <div class="mt-10">
            
            <div class="flex justify-between items-center mb-3">
                <h2 class="text-lg font-semibold text-gray-800">Hedefler</h2>

                <button onclick="openAddHedefModal('${studentId}')"
                    class="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                    + Yeni Hedef
                </button>
            </div>

            <div id="hedefListesi" class="space-y-3">
                <p class="text-gray-400 text-sm">Veriler yükleniyor...</p>
            </div>
        </div>
    `;
}

/* =====================================================================
   HEDEF EKLEME MODALINI AÇ
===================================================================== */
function openAddHedefModal(studentId) {
    document.getElementById("currentStudentIdForHedef").value = studentId;

    document.getElementById("hedefTitle").value = "";
    document.getElementById("hedefBitisTarihi").value = "";
    document.getElementById("hedefAciklama").value = "";
    document.getElementById("hedefModalErrorMessage").classList.add("hidden");

    document.getElementById("addHedefModal").classList.remove("hidden");
}

window.openAddHedefModal = openAddHedefModal;

/* =====================================================================
   HEDEF KAYDET
===================================================================== */
async function saveHedef() {
    const studentId = document.getElementById("currentStudentIdForHedef").value;

    const title     = document.getElementById("hedefTitle").value.trim();
    const bitis     = document.getElementById("hedefBitisTarihi").value;
    const aciklama  = document.getElementById("hedefAciklama").value.trim();

    const err = document.getElementById("hedefModalErrorMessage");

    if (!title) {
        err.textContent = "Hedef başlığı zorunludur.";
        err.classList.remove("hidden");
        return;
    }

    try {
        await addDoc(collection(db, "students", studentId, "hedefler"), {
            title,
            bitis: bitis || null,
            aciklama,
            createdAt: Date.now(),
            tamamlandi: false
        });

        document.getElementById("addHedefModal").classList.add("hidden");

        loadHedefListesi(studentId);

    } catch (e) {
        err.textContent = "Kayıt hatası: " + e.message;
        err.classList.remove("hidden");
    }
}

document.getElementById("saveHedefButton").addEventListener("click", saveHedef);

document.getElementById("cancelHedefModalButton").addEventListener("click", () => {
    document.getElementById("addHedefModal").classList.add("hidden");
});
document.getElementById("closeHedefModalButton").addEventListener("click", () => {
    document.getElementById("addHedefModal").classList.add("hidden");
});


/* =====================================================================
   HEDEF LİSTESİNİ YÜKLE
===================================================================== */
function loadHedefListesi(studentId) {
    const container = document.getElementById("hedefListesi");
    if (!container) return;

    const q = query(
        collection(db, "students", studentId, "hedefler"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snap) => {
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<p class="text-gray-400">Henüz hedef eklenmemiş.</p>`;
            return;
        }

        snap.forEach(docSnap => {
            const h = docSnap.data();
            const id = docSnap.id;

            container.innerHTML += renderHedefCard(studentId, id, h);
        });
    });
}

/* =====================================================================
   HEDEF KARTI
===================================================================== */
function renderHedefCard(studentId, hedefId, h) {
    const today = new Date().toISOString().split("T")[0];

    let badge = "";
    let borderColor = "border-gray-200";

    if (h.tamamlandi) {
        badge = `<span class="text-green-700 font-semibold">Tamamlandı</span>`;
        borderColor = "border-green-500";
    }
    else if (h.bitis && today > h.bitis) {
        badge = `<span class="text-red-700 font-semibold">SÜRESİ GEÇTİ</span>`;
        borderColor = "border-red-500";
    }
    else if (h.bitis) {
        // Yaklaşan hedef (son 3 gün)
        const fark = (new Date(h.bitis) - new Date(today)) / (1000 * 60 * 60 * 24);

        if (fark <= 3 && fark >= 0) {
            badge = `<span class="text-yellow-600 font-semibold">Tarih Yaklaşıyor</span>`;
            borderColor = "border-yellow-500";
        }
    }

    return `
        <div class="p-4 bg-white border ${borderColor} rounded-lg shadow">

            <div class="flex justify-between items-center">
                <h3 class="text-md font-semibold text-gray-800">${h.title}</h3>
                ${badge}
            </div>

            <p class="text-sm mt-1 text-gray-600">${h.aciklama || ""}</p>

            <p class="text-xs mt-2 text-gray-500">
                ${h.bitis ? "Bitiş Tarihi: " + h.bitis : ""}
            </p>

            <div class="flex gap-3 mt-3">

                <button onclick="markHedefDone('${studentId}', '${hedefId}')"
                    class="px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                    Tamamla
                </button>

                <button onclick="openEditHedef('${studentId}', '${hedefId}')"
                    class="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                    Düzenle
                </button>

            </div>

        </div>
    `;
}

/* =====================================================================
   HEDEF TAMAMLAMA
===================================================================== */
async function markHedefDone(studentId, hedefId) {
    await updateDoc(doc(db, "students", studentId, "hedefler", hedefId), {
        tamamlandi: true
    });
}

/* =====================================================================
   HEDEF DÜZENLEME MODALINI AÇ
===================================================================== */
async function openEditHedef(studentId, hedefId) {
    const ref = doc(db, "students", studentId, "hedefler", hedefId);
    const snap = await getDoc(ref);
    const h = snap.data();

    document.getElementById("editHedefId").value = hedefId;

    document.getElementById("editHedefTitle").value = h.title;
    document.getElementById("editHedefBitisTarihi").value = h.bitis || "";
    document.getElementById("editHedefAciklama").value = h.aciklama || "";
    document.getElementById("editHedefModal").classList.remove("hidden");
}

window.openEditHedef = openEditHedef;

document.getElementById("closeEditHedefModalButton").addEventListener("click", () => {
    document.getElementById("editHedefModal").classList.add("hidden");
});
document.getElementById("cancelEditHedefModalButton").addEventListener("click", () => {
    document.getElementById("editHedefModal").classList.add("hidden");
});

/* =====================================================================
   HEDEF DÜZENLE
===================================================================== */
async function saveHedefChanges() {
    const hedefId = document.getElementById("editHedefId").value;
    const studentId = window.currentStudentDetailId;

    const title = document.getElementById("editHedefTitle").value.trim();
    const bitis = document.getElementById("editHedefBitisTarihi").value;
    const aciklama = document.getElementById("editHedefAciklama").value.trim();

    const err = document.getElementById("editHedefModalErrorMessage");

    if (!title) {
        err.textContent = "Başlık zorunludur.";
        err.classList.remove("hidden");
        return;
    }

    await updateDoc(doc(db, "students", studentId, "hedefler", hedefId), {
        title,
        bitis: bitis || null,
        aciklama
    });

    document.getElementById("editHedefModal").classList.add("hidden");
}

document.getElementById("saveHedefChangesButton").addEventListener("click", saveHedefChanges);


/* =====================================================================
   ÖĞRENCİ DETAYINA HEDEF SEKMESİ EKLEME
===================================================================== */
const originalOpenStudentDetailHedef = openStudentDetail;

openStudentDetail = async function (studentId) {
    await originalOpenStudentDetailHedef(studentId);

    window.currentStudentDetailId = studentId;

    const el = document.createElement("div");
    el.innerHTML = renderHedeflerTab(studentId);
    mainArea.appendChild(el);

    loadHedefListesi(studentId);
};
