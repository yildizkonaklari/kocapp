import { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Profile({ user }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setEmail(currentUser.email);
      fetchProfile(currentUser.uid);
    }
  }, []);

  const fetchProfile = async (uid) => {
    try {
      const refDoc = doc(db, "coaches", uid);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || "");
        setPhone(data.phone || "");
        setPhotoURL(data.photoURL || "");
      }
    } catch (error) {
      console.error("Profil yüklenemedi:", error);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("Giriş yapmanız gerekiyor!");
      return;
    }

    try {
      const fileRef = ref(storage, `coachPhotos/${uid}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setPhotoURL(url);
      setMessage("Fotoğraf yüklendi ✅");
    } catch (error) {
      console.error("Fotoğraf yüklenemedi:", error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("Giriş yapmanız gerekiyor!");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await setDoc(doc(db, "coaches", uid), {
        name,
        phone,
        email,
        photoURL,
        updatedAt: new Date().toISOString(),
      });

      setMessage("Profil başarıyla kaydedildi ✅");
    } catch (error) {
      console.error("Kayıt hatası:", error);
      alert("Profil kaydedilemedi. Firestore izinlerini kontrol edin.");
    }

    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">👤 Profil Bilgileri</h1>
      <form onSubmit={handleSave} className="max-w-md space-y-4">
        <div>
          <label className="block mb-1 font-medium">Ad Soyad</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Telefon</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">E-posta</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full border rounded p-2 bg-gray-100 text-gray-500"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Profil Fotoğrafı</label>
          <input type="file" accept="image/*" onChange={handlePhotoUpload} />
          {photoURL && (
            <img
              src={photoURL}
              alt="Profil"
              className="mt-2 w-24 h-24 rounded-full object-cover border"
            />
          )}
