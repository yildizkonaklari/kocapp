document.addEventListener("DOMContentLoaded", () => {
    
    const errorMessage = document.getElementById("errorMessage");

    // --- KAYIT OL SAYFASI (signup.html) ---
    const signupButton = document.getElementById("signupButton");
    if (signupButton) {
        signupButton.addEventListener("click", () => {
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            if (!email || !password) {
                showError("Lütfen tüm alanları doldurun.");
                return;
            }

            // Firebase ile yeni kullanıcı oluştur
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Başarılı kayıt
                    console.log("Kullanıcı oluşturuldu:", userCredential.user);
                    // Kayıttan sonra doğrudan ana sayfaya yönlendir
                    window.location.href = "dashboard.html";
                })
                .catch((error) => {
                    // Hata yönetimi
                    handleFirebaseError(error);
                });
        });
    }

    // --- GİRİŞ YAP SAYFASI (index.html) ---
    const loginButton = document.getElementById("loginButton");
    if (loginButton) {
        loginButton.addEventListener("click", () => {
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            if (!email || !password) {
                showError("Lütfen tüm alanları doldurun.");
                return;
            }

            // Firebase ile giriş yap
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Başarılı giriş
                    console.log("Giriş yapıldı:", userCredential.user);
                    // Ana sayfaya yönlendir
                    window.location.href = "dashboard.html";
                })
                .catch((error) => {
                    // Hata yönetimi
                    handleFirebaseError(error);
                });
        });
    }

    // Hata gösterme fonksiyonu
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
    }

    // Firebase hata kodlarını Türkçeleştirme
    function handleFirebaseError(error) {
        let message = "Bilinmeyen bir hata oluştu.";
        switch (error.code) {
            case "auth/invalid-email":
                message = "Geçersiz e-posta adresi.";
                break;
            case "auth/user-not-found":
                message = "Bu e-postaya kayıtlı bir kullanıcı bulunamadı.";
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
});
