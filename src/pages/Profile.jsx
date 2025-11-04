import { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Profile() {
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
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
    await setDoc(doc(db, "coaches", user.uid), {
      name,
      school,
      logoUrl: url,
      uid: user.uid,
    });
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    await setDoc(doc(db, "coaches", user.uid), {
      name,
      school,
      logoUrl,
      uid: user.uid,
    });
    alert("Profil güncellendi ✅");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">👤 Koç Profil Bilgileri</h1>

      <div className="bg-white p-6 rounded-lg shadow max-w-lg">
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
          <div>
            <label className="block font-medium mb-1">Ad Soyad</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Kurum / Okul</label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
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
