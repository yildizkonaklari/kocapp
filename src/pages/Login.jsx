import { useState } from "react";
import { signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 🔹 Firebase kimlik doğrulama
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔹 Eğer kullanıcı adı boşsa, e-postadan otomatik isim türet
      if (!user.displayName) {
        const defaultName = email.split("@")[0];
        await updateProfile(user, { displayName: defaultName });
      }

      // 🔹 Kullanıcı bilgisi üst bileşene aktarılır
      onLogin(user);
    } catch (err) {
      console.error("Login error:", err.code, err.message);
      if (err.code === "auth/user-not-found") setError("Kullanıcı bulunamadı.");
      else if (err.code === "auth/wrong-password") setError("Yanlış şifre.");
      else if (err.code === "auth/invalid-email") setError("E-posta adresi geçersiz.");
      else setError("Giriş başarısız. Lütfen tekrar deneyin.");
    }

    setLoading(false);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-lg shadow-md w-80"
      >
        <h2 className="text-2xl font-bold mb-5 text-center">Koç Girişi</h2>

        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-3 border rounded"
          required
        />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>

        {error && (
          <p className="text-red-500 text-sm mt-3 text-center">{error}</p>
        )}
      </form>
    </div>
  );
}
