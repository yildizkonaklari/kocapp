// 1. Firebase Kütüphanelerini içeri aktar
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FİREBASE AYARLARI (Sizin Projeniz) ---
const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

// 2. Firebase Başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "kocluk-sistemi"; 

// 3. DOM Elementleri
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const authErrorMessage = document.getElementById('authErrorMessage');
const authErrorText = document.getElementById('authErrorText');
const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');

// 4. Giriş Kontrolü (Yönlendirme Mantığı Düzeltildi)
// Sayfa yüklendiğinde kullanıcı zaten giriş yapmışsa direkt panele at.
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Kullanıcı oturumu açık, panele yönlendiriliyor...");
        window.location.href = "student-dashboard.html";
    }
});


// 5. Form Geçişleri
if (showSignupLink) {
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        hideError();
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        hideError();
    });
}


// --- 6. GİRİŞ YAPMA İŞLEMİ ---
if (loginButton) {
    loginButton.addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showError("Lütfen e-posta ve şifrenizi girin.");
            return;
        }

        try {
            loginButton.disabled = true;
            loginButton.textContent = "Giriş Yapılıyor...";
            
            // Firebase Auth ile giriş
            await signInWithEmailAndPassword(auth, email, password);
            
            // Başarılı olursa onAuthStateChanged tetiklenir ve yönlendirir.
            // Ancak biz işi garantiye almak için manuel de yönlendirelim:
            window.location.href = "student-dashboard.html";

        } catch (error) {
            console.error("Giriş Hatası:", error);
            handleAuthError(error);
            loginButton.disabled = false;
            loginButton.textContent = "Giriş Yap";
        }
    });
}


// --- 7. KAYIT OLMA İŞLEMİ ---
if (signupButton) {
    signupButton.addEventListener('click', async () => {
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const kocDavetKodu = document.getElementById('kocDavetKodu').value.trim();

        if (!email || !password) {
            showError("Lütfen tüm alanları doldurun.");
            return;
        }
        
        if (!kocDavetKodu) {
            showError("Koç Davet Kodu zorunludur. Lütfen koçunuzdan isteyin.");
            return;
        }

        try {
            signupButton.disabled = true;
            signupButton.textContent = "Hesap Oluşturuluyor...";

            // 1. Kullanıcı oluştur
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Profil ayar dosyasını oluştur
            // Bu dosya, öğrencinin hangi koça ait olduğunu tutar.
            await setDoc(doc(db, "artifacts", appId, "users", user.uid, "settings", "profile"), {
                email: email,
                kocId: kocDavetKodu,
                rol: "ogrenci",
                linkedDocId: null, // Henüz eşleşmedi
                kayitTarihi: serverTimestamp()
            });

            console.log("Kayıt başarılı, yönlendiriliyor...");
            window.location.href = "student-dashboard.html";

        } catch (error) {
            console.error("Kayıt Hatası:", error);
            handleAuthError(error);
            signupButton.disabled = false;
            signupButton.textContent = "Kaydol ve Başla";
        }
    });
}


// --- 8. YARDIMCI FONKSİYONLAR ---
function showError(message) {
    if (authErrorText && authErrorMessage) {
        authErrorText.textContent = message;
        authErrorMessage.classList.remove('hidden');
    } else {
        alert(message);
    }
}

function hideError() {
    if (authErrorMessage) {
        authErrorMessage.classList.add('hidden');
    }
}

function handleAuthError(error) {
    let message = "Bir hata oluştu.";
    switch (error.code) {
        case "auth/invalid-email": message = "Geçersiz e-posta adresi."; break;
        case "auth/user-not-found":
        case "auth/invalid-credential": message = "E-posta veya şifre hatalı."; break;
        case "auth/wrong-password": message = "Hatalı şifre."; break;
        case "auth/email-already-in-use": message = "Bu e-posta adresi zaten kullanımda."; break;
        case "auth/weak-password": message = "Şifre çok zayıf (en az 6 karakter)."; break;
        case "permission-denied": message = "Veritabanına yazma izniniz yok."; break;
    }
    showError(message);
}
