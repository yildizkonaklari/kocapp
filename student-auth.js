// 1. Firebase Kütüphanelerini içeri aktar
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc // Rol kontrolü için gerekli
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
const authErrorMessage = document.getElementById('authErrorMessage');
const authErrorText = document.getElementById('authErrorText');
const loginButton = document.getElementById('loginButton');

// 4. GİRİŞ KONTROLÜ VE YÖNLENDİRME
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Kullanıcı var, ama kim? (Koç mu Öğrenci mi?)
        try {
            const profileRef = doc(db, "artifacts", appId, "users", user.uid, "settings", "profile");
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                const userData = profileSnap.data();
                
                // EĞER KULLANICI KOÇ İSE -> OTURUMU KAPAT
                if (userData.rol === 'koc') {
                    await signOut(auth);
                    showError("Koç hesabınızla öğrenci paneline giriş yapamazsınız.");
                    return; 
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
            await signOut(auth);
        }
    }
});

// --- 5. GİRİŞ YAPMA İŞLEMİ ---
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
            if(error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-email') {
                msg = "Kullanıcı adı veya şifre hatalı.";
            } else if (error.code === 'auth/too-many-requests') {
                msg = "Çok fazla başarısız deneme. Lütfen biraz bekleyin.";
            }
            showError(msg);
            loginButton.disabled = false;
            loginButton.textContent = "Giriş Yap";
        }
    });
}

// --- 6. YARDIMCI FONKSİYONLAR ---
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