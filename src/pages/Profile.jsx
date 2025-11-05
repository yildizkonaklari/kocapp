import { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";

export default function Profile() {
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [phone, setPhone] = useState(""); // 🔹 yeni alan
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const docRef = doc(db, "coaches", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || "");
        setSchool(data.school || "");
        setPhone(data.phone || "");
        setLogoUrl(data.logoUrl || "");
      }
    };
    fetchProfile();
  }, [user]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    const fileRef = ref(storage, `logos/${user.uid}.png`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    setLogoUrl(url);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    await setDoc(doc(db, "coaches", user.uid), {
      name,
      school,
      phone,
      email: user.email, // 🔹 mail kaydı da tutulsun
      logoUrl,
      uid: user.uid,
    });
    await updateProfile(user, { displayName: name });
    alert("Profil güncellendi ✅");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">👤 Koç Profil Bilgileri</h1>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col items-center mb-5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Koç Logosu"
              className="w-24 h-24 rounded-full object-cover mb-3 border"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mb-3">
              Logo Yok
            </div>
          )}
          <label className="cursor-pointer text-blue-600 hover:underline">
            {uploading ? "Yükleniyor..." : "Logo Değiştir"}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </label>
        </div>

        <div className="space-y-4">
          {/* 🔹 Ad Soyad */}
          <div>
            <label className="block font-medium mb-1">Ad Soyad</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>

          {/* 🔹 Kurum / Okul */}
          <div>
            <label className="block font-medium mb-1">Kurum / Okul</label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>

          {/* 🔹 Mail (değiştirilemez) */}
          <div>
            <label className="block font-medium mb-1">E-posta</label>
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="border rounded p-2 w-full bg-gray-100 cursor-not-allowed"
            />
          </div>

          {/* 🔹 Telefon No */}
          <div>
            <label className="block font-medium mb-1">Telefon Numarası</label>
            <input
              type="tel"
              placeholder="05xx xxx xx xx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={uploading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-4 w-full"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
