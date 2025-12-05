// 1. Firebase Kütüphanelerini içeri aktar
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc,
    getDoc, // EKLENDİ: Rol kontrolü için gerekli
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FİREBASE AYARLARI ---
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

// Kayıt işlemi bayrağı
let isRegistering = false;

// 4. GİRİŞ KONTROLÜ VE YÖNLENDİRME (DÖNGÜ SORUNU ÇÖZÜMÜ)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (isRegistering) return;

        // Kullanıcı var, ama kim? (Koç mu Öğrenci mi?)
        try {
            const profileRef = doc(db, "artifacts", appId, "users", user.uid, "settings", "profile");
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                const userData = profileSnap.data();
                
                // EĞER KULLANICI KOÇ İSE -> OTURUMU KAPAT VE GİRİŞTE KAL
                if (userData.rol === 'koc') {
                    await signOut(auth);
                    showError("Koç hesabınızla öğrenci paneline giriş yapamazsınız. Oturumunuz sonlandırıldı.");
                    return; // Yönlendirme yapma, döngüyü kır.
                }
                
                // EĞER ÖĞRENCİ İSE -> DASHBOARD'A GİT
                if (userData.rol === 'ogrenci') {
                    console.log("Öğrenci girişi doğrulandı, yönlendiriliyor...");
                    window.location.href = "student-dashboard.html";
                }
            } else {
                // Profil yoksa güvenli değil, çıkış yap
                await signOut(auth);
            }
        } catch (error) {
            console.error("Rol kontrolü hatası:", error);
            // Hata durumunda güvenlik için çıkış yap
            await signOut(auth);
        }
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
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            showError("Lütfen kullanıcı adı ve şifrenizi girin.");
            return;
        }

        // Kullanıcı adını e-postaya çevir (Sanal Domain)
        const email = `${username}@koc.com`;

        try {
            loginButton.disabled = true;
            loginButton.textContent = "Giriş Yapılıyor...";
            
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged yönlendirmeyi yapacak

        } catch (error) {
            console.error("Giriş Hatası:", error);
            let msg = "Giriş yapılamadı.";
            if(error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                msg = "Kullanıcı adı veya şifre hatalı.";
            }
            showError(msg);
            loginButton.disabled = false;
            loginButton.textContent = "Giriş Yap";
        }
    });
}

// --- 7. KAYIT OLMA İŞLEMİ ---
// (Bu bölüm artık sadece manuel kayıt denemeleri için duruyor, normalde koç ekler)
if (signupButton) {
    signupButton.addEventListener('click', async () => {
        // Bu fonksiyon öğrenci panelinde genellikle kullanılmaz çünkü koç ekler.
        // Ancak kod bütünlüğü için bırakılmıştır.
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        const kocDavetKodu = document.getElementById('kocDavetKodu')?.value.trim();

        if (!email || !password || !kocDavetKodu) {
            showError("Lütfen tüm alanları doldurun.");
            return;
        }

        try {
            isRegistering = true;
            signupButton.disabled = true;
            signupButton.textContent = "Hesap Oluşturuluyor...";

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "artifacts", appId, "users", user.uid, "settings", "profile"), {
                email: email,
                kocId: kocDavetKodu,
                rol: "ogrenci",
                linkedDocId: null, 
                kayitTarihi: serverTimestamp()
            });

            window.location.href = "student-dashboard.html";

        } catch (error) {
            console.error("Kayıt Hatası:", error);
            isRegistering = false;
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
        case "auth/invalid-credential": message = "Bilgiler hatalı."; break;
        case "auth/wrong-password": message = "Hatalı şifre."; break;
        case "auth/email-already-in-use": message = "Bu hesap zaten mevcut."; break;
        case "auth/weak-password": message = "Şifre çok zayıf."; break;
    }
    showError(message);
}
