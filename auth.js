// 1. Firebase Kütüphanelerini (SDK) içeri aktar
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, updateDoc, serverTimestamp, getDoc 
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

const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const errorMessage = document.getElementById("errorMessage");

// --- GİRİŞ YAP ---
if (loginButton) {
    loginButton.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        
        if (!email || !password) { showError("Lütfen tüm alanları doldurun."); return; }
        
        loginButton.disabled = true;
        loginButton.textContent = "Giriş Yapılıyor...";
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // YENİ: Son Giriş Tarihini Güncelle
            const userRef = doc(db, "artifacts", appId, "users", userCredential.user.uid, "settings", "profile");
            // Belge var mı kontrol et, yoksa oluştur (Eski kullanıcılar için)
            const docSnap = await getDoc(userRef);
            
            if (docSnap.exists()) {
                await updateDoc(userRef, { sonGirisTarihi: serverTimestamp() });
            } else {
                await setDoc(userRef, {
                    email: email,
                    rol: 'koc',
                    kayitTarihi: serverTimestamp(),
                    sonGirisTarihi: serverTimestamp(),
                    maxOgrenci: 10 // Varsayılan kota
                });
            }

            window.location.href = "index.html";
        } catch (error) {
            handleFirebaseError(error);
            loginButton.disabled = false;
            loginButton.textContent = "Giriş Yap";
        }
    });
}

// --- KAYIT OL ---
if (signupButton) {
    signupButton.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const passwordConfirm = document.getElementById("passwordConfirm").value;

        if (!email || !password || !passwordConfirm) { showError("Lütfen tüm alanları doldurun."); return; }
        if (password !== passwordConfirm) { showError("Şifreler eşleşmiyor."); return; }

        signupButton.disabled = true;
        signupButton.textContent = "Hesap Oluşturuluyor...";

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user; 
            
            // Profil Adı
            const defaultDisplayName = email.split('@')[0];
            await updateProfile(user, { displayName: defaultDisplayName });
            
            // YENİ: Firestore'a Koç Profili Oluştur
            await setDoc(doc(db, "artifacts", appId, "users", user.uid, "settings", "profile"), {
                email: email,
                rol: 'koc',
                kayitTarihi: serverTimestamp(),
                sonGirisTarihi: serverTimestamp(),
                uyelikBaslangic: null,
                uyelikBitis: null,
                maxOgrenci: 10 // Varsayılan
            });
            
            window.location.href = "index.html";
        } catch (error) {
            handleFirebaseError(error);
            signupButton.disabled = false;
            signupButton.textContent = "Hesap Oluştur";
        }
    });
}

function showError(message) {
    if (errorMessage) { errorMessage.textContent = message; errorMessage.classList.remove("hidden"); }
}

function handleFirebaseError(error) {
    let message = "Hata oluştu: " + error.code;
    if (error.code === "auth/invalid-email") message = "Geçersiz e-posta.";
    else if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") message = "Hatalı bilgi.";
    else if (error.code === "auth/email-already-in-use") message = "Bu e-posta zaten kayıtlı.";
    else if (error.code === "auth/weak-password") message = "Şifre en az 6 karakter olmalı.";
    showError(message);
}
