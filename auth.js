// 1. Firebase Kütüphanelerini (SDK) içeri aktar
import { initializeApp } from "https.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// =================================================================
// 1. ADIM: BURAYI GÜNCELLE
// app.js'ye yapıştırdığınız 'firebaseConfig' objesinin
// AYNISINI buraya da yapıştırın.
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM Elementlerini Seç
const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const errorMessage = document.getElementById("errorMessage");

// --- GİRİŞ YAP SAYFASI (login.html) ---
if (loginButton) {
    loginButton.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        
        if (!email || !password) {
            showError("Lütfen tüm alanları doldurun.");
            return;
        }
        
        loginButton.disabled = true;
        loginButton.textContent = "Giriş Yapılıyor...";
        
        try {
            // Firebase ile giriş yap
            await signInWithEmailAndPassword(auth, email, password);
            // Başarılı giriş -> Ana panele (index.html) yönlendir
            window.location.href = "index.html";
        } catch (error) {
            handleFirebaseError(error);
            loginButton.disabled = false;
            loginButton.textContent = "Giriş Yap";
        }
    });
}

// --- KAYIT OL SAYFASI (signup.html) ---
if (signupButton) {
    signupButton.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const passwordConfirm = document.getElementById("passwordConfirm").value;

        if (!email || !password || !passwordConfirm) {
            showError("Lütfen tüm alanları doldurun.");
            return;
        }
        if (password !== passwordConfirm) {
            showError("Şifreler eşleşmiyor.");
            return;
        }

        signupButton.disabled = true;
        signupButton.textContent = "Hesap Oluşturuluyor...";

        try {
            // Firebase ile yeni kullanıcı oluştur
            await createUserWithEmailAndPassword(auth, email, password);
            // Başarılı kayıt -> Ana panele (index.html) yönlendir
            window.location.href = "index.html";
        } catch (error) {
            handleFirebaseError(error);
            signupButton.disabled = false;
            signupButton.textContent = "Hesap Oluştur";
        }
    });
}

// Hata gösterme fonksiyonu
function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.remove("hidden");
    }
}

// Firebase hata kodlarını Türkçeleştirme
function handleFirebaseError(error) {
    let message = "Bilinmeyen bir hata oluştu.";
    switch (error.code) {
        case "auth/invalid-email":
            message = "Geçersiz e-posta adresi.";
            break;
        case "auth/user-not-found":
            message = "Bu e-postaya kayıtlı kullanıcı bulunamadı.";
            break;
        case "auth/wrong-password":
            message = "Hatalı şifre.";
            break;
        case "auth/email-already-in-use":
            message = "Bu e-posta adresi zaten kullanımda.";
            break;
        case "auth/weak-password":
            message = "Şifre çok zayıf (en az 6 karakter olmalı).";
            break;
    }
    showError(message);
}
