import { useState } from "react";
import { signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // 🔹 Giriş yap
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔹 Eğer kullanıcıda isim yoksa, e-posta adresinin baş kısmını displayName olarak kaydet
      if (!user.displayName) {
        const defaultName = email.split("@")[0];
        await updateProfile(user, { displayName: defaultName });
      }

      // 🔹 App.jsx'e kullanıcı bilgisini ilet
      onLogin(true);
    } catch (err) {
      console.error(err);
      setError("Giriş başarısız, bilgileri kontrol et.");
    }
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
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Giriş Yap
        </button>

        {error && (
          <p className="text-red-500 text-sm mt-3 text-center">{error}</p>
        )}
      </form>
    </div>
  );
}
