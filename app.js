// 1. Firebase Kütüphanelerini (SDK) içeri aktar
import { initializeApp, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 2. Modülleri ve Yardımcıları İçeri Aktar
import { cleanUpListeners, populateStudentSelect, DERS_HAVUZU, SINAV_DERSLERI, renderDersSecimi } from './modules/helpers.js';
import { renderAnaSayfa } from './modules/anasayfa.js';
import { renderOgrenciSayfasi, saveNewStudent, saveStudentChanges } from './modules/ogrencilerim.js';
import { renderAjandaSayfasi, saveNewRandevu } from './modules/ajanda.js';
import { renderMuhasebeSayfasi, saveNewBorc, saveNewTahsilat } from './modules/muhasebe.js';
import { renderMesajlarSayfasi } from './modules/mesajlar.js';

// =================================================================
// 1. ADIM: firebaseConfig BİLGİLERİNİZ
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

// 2. DOM Elementlerini Seç (Sadece Ana Panel ve Modalların Dış Kontrolleri)
const loadingSpinner = document.getElementById("loadingSpinner");
const appContainer = document.getElementById("appContainer");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");

// 3. Global Değişkenler
let auth;
let db;
let currentUserId = null;
const appId = "kocluk-sistemi";

// Global window objesine modül fonksiyonlarını ekle (HTML inline onclick'leri için)
// Bu, modül yapısında gereklidir.
window.renderOgrenciDetaySayfasi = (id, name) => {
    // ogrencilerim.js'den import edilen fonksiyonu çağır
    import('./modules/ogrencilerim.js').then(module => {
        module.renderOgrenciDetaySayfasi(db, currentUserId, appId, id, name);
    });
};


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
            currentUserId = user.uid;
            console.log("Koç giriş yaptı, UID:", currentUserId);
            
            loadingSpinner.style.display = 'none';
            appContainer.style.display = 'flex';
            
            updateUIForLoggedInUser(user);
            // Ana Sayfa ile başla (anasayfa.js modülünden)
            renderAnaSayfa(db, currentUserId, appId);
        } else {
            console.log("Giriş yapan kullanıcı yok, login.html'e yönlendiriliyor.");
            window.location.href = 'login.html';
        }
    });
}

// === 5. Arayüz Güncelleme ve ANA NAVİGASYON ===

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

    // Ana Navigasyon Yönlendiricisi
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            cleanUpListeners(); // helpers.js'den

            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'bg-purple-100', 'text-purple-700', 'font-semibold'));
            link.classList.add('active', 'bg-purple-100', 'text-purple-700', 'font-semibold');
            
            const pageId = link.id.split('-')[1];
            
            // İlgili modülün render fonksiyonunu çağır
            switch(pageId) {
                case 'anasayfa':
                    renderAnaSayfa(db, currentUserId, appId);
                    break;
                case 'ogrencilerim':
                    renderOgrenciSayfasi(db, currentUserId, appId);
                    break;
                case 'ajandam':
                    renderAjandaSayfasi(db, currentUserId, appId);
                    break;
                case 'muhasebe':
                    renderMuhasebeSayfasi(db, currentUserId, appId);
                    break;
                case 'mesajlar':
                    renderMesajlarSayfasi(db, currentUserId, appId);
                    break;
                default:
                    // helpers.js'den
                    import('./modules/helpers.js').then(module => {
                        module.renderPlaceholderSayfasi(link.textContent.trim());
                    });
                    break;
            }
        });
    });
}


// === 6. MODAL KONTROLLERİ (Event Listeners) ===
// Bu kısım app.js'de kalmalı çünkü modallar index.html'de

// Öğrenci Ekleme Modalı
document.getElementById('closeModalButton').addEventListener('click', () => { document.getElementById('addStudentModal').style.display = 'none'; });
document.getElementById('cancelModalButton').addEventListener('click', () => { document.getElementById('addStudentModal').style.display = 'none'; });
document.getElementById('saveStudentButton').addEventListener('click', () => saveNewStudent(db, currentUserId, appId)); // ogrencilerim.js'den

// Öğrenci Düzenleme Modalı
document.getElementById('closeEditModalButton').addEventListener('click', () => { document.getElementById('editStudentModal').style.display = 'none'; });
document.getElementById('cancelEditModalButton').addEventListener('click', () => { document.getElementById('editStudentModal').style.display = 'none'; });
document.getElementById('saveStudentChangesButton').addEventListener('click', () => saveStudentChanges(db, currentUserId, appId)); // ogrencilerim.js'den

// Sınıf seçimi değiştikçe dersleri güncelle (Her iki modal için)
document.getElementById('studentClass').addEventListener('change', (e) => {
    renderDersSecimi(e.target.value, document.getElementById('studentDersSecimiContainer'));
});
document.getElementById('editStudentClass').addEventListener('change', (e) => {
    renderDersSecimi(e.target.value, document.getElementById('editStudentDersSecimiContainer'));
});

// Deneme Modalı
document.getElementById('closeDenemeModalButton').addEventListener('click', () => { document.getElementById('addDenemeModal').style.display = 'none'; });
document.getElementById('cancelDenemeModalButton').addEventListener('click', () => { document.getElementById('addDenemeModal').style.display = 'none'; });
document.getElementById('saveDenemeButton').addEventListener('click', () => {
    import('./modules/ogrencilerim.js').then(module => module.saveNewDeneme(db, currentUserId, appId));
});
document.getElementById('denemeTuru').addEventListener('change', (e) => {
    import('./modules/ogrencilerim.js').then(module => module.renderDenemeNetInputs(e.target.value));
});

// Soru Takibi Modalı
document.getElementById('closeSoruModalButton').addEventListener('click', () => { document.getElementById('addSoruModal').style.display = 'none'; });
document.getElementById('cancelSoruModalButton').addEventListener('click', () => { document.getElementById('addSoruModal').style.display = 'none'; });
document.getElementById('saveSoruButton').addEventListener('click', () => {
    import('./modules/ogrencilerim.js').then(module => module.saveNewSoruTakibi(db, currentUserId, appId));
});

// Hedef Modalı
document.getElementById('closeHedefModalButton').addEventListener('click', () => { document.getElementById('addHedefModal').style.display = 'none'; });
document.getElementById('cancelHedefModalButton').addEventListener('click', () => { document.getElementById('addHedefModal').style.display = 'none'; });
document.getElementById('saveHedefButton').addEventListener('click', () => {
    import('./modules/ogrencilerim.js').then(module => module.saveNewHedef(db, currentUserId, appId));
});

// Ödev Modalı
document.getElementById('closeOdevModalButton').addEventListener('click', () => { document.getElementById('addOdevModal').style.display = 'none'; });
document.getElementById('cancelOdevModalButton').addEventListener('click', () => { document.getElementById('addOdevModal').style.display = 'none'; });
document.getElementById('saveOdevButton').addEventListener('click', () => {
    import('./modules/ogrencilerim.js').then(module => module.saveNewOdev(db, currentUserId, appId));
});

// Randevu Modalı
document.getElementById('closeRandevuModalButton').addEventListener('click', () => { document.getElementById('addRandevuModal').style.display = 'none'; });
document.getElementById('cancelRandevuModalButton').addEventListener('click', () => { document.getElementById('addRandevuModal').style.display = 'none'; });
document.getElementById('saveRandevuButton').addEventListener('click', () => saveNewRandevu(db, currentUserId, appId)); // ajanda.js'den

// Muhasebe Modalları
document.getElementById('closeTahsilatModalButton').addEventListener("click", () => document.getElementById('addTahsilatModal').style.display = "none");
document.getElementById('cancelTahsilatModalButton').addEventListener("click", () => document.getElementById('addTahsilatModal').style.display = "none");
document.getElementById('saveTahsilatButton').addEventListener("click", () => saveNewTahsilat(db, currentUserId, appId)); // muhasebe.js'den

document.getElementById('closeBorcModalButton').addEventListener("click", () => document.getElementById('addBorcModal').style.display = "none");
document.getElementById('cancelBorcModalButton').addEventListener("click", () => document.getElementById('addBorcModal').style.display = "none");
document.getElementById('saveBorcButton').addEventListener("click", () => saveNewBorc(db, currentUserId, appId)); // muhasebe.js'den

// === 7. UYGULAMAYI BAŞLAT ===
main();
