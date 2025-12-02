import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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

// DOM
const loginButton = document.getElementById('loginButton');
const authErrorMessage = document.getElementById('authErrorMessage');
const authErrorText = document.getElementById('authErrorText');

// Giriş Kontrolü
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "student-dashboard.html";
    }
});

// Giriş Yap
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
            window.location.href = "student-dashboard.html";

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

function showError(message) {
    if (authErrorText && authErrorMessage) {
        authErrorText.textContent = message;
        authErrorMessage.classList.remove('hidden');
    } else {
        alert(message);
    }
}
