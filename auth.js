// =================================================================
// KOÇ GİRİŞ & KAYIT YÖNETİMİ (auth.js)
// =================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, updateDoc, serverTimestamp, getDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase Yapılandırması
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

// DOM Elementleri
const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const errorMessage = document.getElementById("errorMessage");

// Oturum Durumu Kontrolü (Zaten giriş yapmışsa yönlendir)
onAuthStateChanged(auth, async (user) => {
    if (user && (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html'))) {
        // Kullanıcı zaten giriş yapmış, rolüne bak
        try {
            const docSnap = await getDoc(doc(db, "artifacts", appId, "users", user.uid, "settings", "profile"));
            if(docSnap.exists() && docSnap.data().rol === 'koc') {
                window.location.href = "coach-dashboard.html";
            }
        } catch (e) { console.error(e); }
    }
});

// --- GİRİŞ YAPMA İŞLEMİ ---
if (loginButton) {
    loginButton.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const rememberMe = document.getElementById("rememberMe")?.checked;
        
        if (!email || !password) { 
            showError("Lütfen e-posta ve şifrenizi girin."); 
            return; 
        }
        
        // Buton Durumu
        const originalText = loginButton.innerHTML;
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Giriş Yapılıyor...';
        
        try {
            // Beni Hatırla Ayarı
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

            // Giriş Yap
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // Son Giriş Tarihini Güncelle & Rol Kontrolü
            const userRef = doc(db, "artifacts", appId, "users", userCredential.user.uid, "settings", "profile");
            const docSnap = await getDoc(userRef);
            
            if (docSnap.exists()) {
                const userData = docSnap.data();
                if(userData.rol !== 'koc') {
                    throw new Error("NOT_COACH");
                }
                await updateDoc(userRef, { sonGirisTarihi: serverTimestamp() });
            } else {
                // Eski/Eksik profil onarımı
                await setDoc(userRef, {
                    email: email,
                    rol: 'koc',
                    kayitTarihi: serverTimestamp(),
                    sonGirisTarihi: serverTimestamp(),
                    paketAdi: 'Standart',
                    maxOgrenci: 10
                });
            }

            // Yönlendirme
            window.location.href = "coach-dashboard.html";

        } catch (error) {
            if (error.message === "NOT_COACH") {
                showError("Bu giriş sadece Eğitim Koçları içindir. Öğrenci girişi yapınız.");
                auth.signOut();
            } else {
                handleFirebaseError(error);
            }
            loginButton.disabled = false;
            loginButton.innerHTML = originalText;
        }
    });
}

// --- KAYIT OLMA İŞLEMİ ---
if (signupButton) {
    signupButton.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const passwordConfirm = document.getElementById("passwordConfirm").value;

        if (!email || !password || !passwordConfirm) { showError("Lütfen tüm alanları doldurun."); return; }
        if (password !== passwordConfirm) { showError("Şifreler eşleşmiyor."); return; }
        if (password.length < 6) { showError("Şifre en az 6 karakter olmalıdır."); return; }

        const originalText = signupButton.innerHTML;
        signupButton.disabled = true;
        signupButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Hesap Oluşturuluyor...';

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user; 
            
            const defaultDisplayName = email.split('@')[0];
            await updateProfile(user, { displayName: defaultDisplayName });
            
            // Deneme Paketi Tanımlama (15 Gün)
            const today = new Date();
            const next15Days = new Date();
            next15Days.setDate(today.getDate() + 15);
            const formatDate = (d) => d.toISOString().split('T')[0];

            await setDoc(doc(db, "artifacts", appId, "users", user.uid, "settings", "profile"), {
                email: email,
                rol: 'koc',
                displayName: defaultDisplayName,
                kayitTarihi: serverTimestamp(),
                sonGirisTarihi: serverTimestamp(),
                paketAdi: 'Deneme',
                uyelikBaslangic: formatDate(today),
                uyelikBitis: formatDate(next15Days),
                maxOgrenci: 5 // Deneme limiti
            });
            
            window.location.href = "coach-dashboard.html";

        } catch (error) {
            handleFirebaseError(error);
            signupButton.disabled = false;
            signupButton.innerHTML = originalText;
        }
    });
}

// --- YARDIMCI FONKSİYONLAR ---
function showError(message) {
    if (errorMessage) {
        // Hata kutusu içindeki span'i bul veya direkt textContent yap
        const textSpan = errorMessage.querySelector('span');
        if(textSpan) textSpan.textContent = message;
        else errorMessage.textContent = message;
        
        errorMessage.classList.remove("hidden");
        // Küçük bir sallanma efekti (css class varsa)
        errorMessage.classList.add('animate-pulse');
        setTimeout(() => errorMessage.classList.remove('animate-pulse'), 500);
    } else {
        alert(message);
    }
}

function handleFirebaseError(error) {
    let message = "Bir hata oluştu.";
    switch (error.code) {
        case "auth/invalid-email": message = "Geçersiz e-posta adresi."; break;
        case "auth/user-not-found": message = "Kullanıcı bulunamadı."; break;
        case "auth/wrong-password": message = "Hatalı şifre."; break;
        case "auth/invalid-credential": message = "E-posta veya şifre hatalı."; break;
        case "auth/email-already-in-use": message = "Bu e-posta adresi zaten kayıtlı."; break;
        case "auth/weak-password": message = "Şifre çok zayıf."; break;
        case "auth/too-many-requests": message = "Çok fazla deneme yaptınız. Lütfen bekleyin."; break;
        case "auth/network-request-failed": message = "İnternet bağlantınızı kontrol edin."; break;
        default: message = "Hata: " + error.message;
    }
    showError(message);
}