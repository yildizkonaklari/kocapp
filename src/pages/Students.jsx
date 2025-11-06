import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [exam, setExam] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [coach, setCoach] = useState(null);
  const [message, setMessage] = useState("");

  // 🔹 Giriş yapan koçu al
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setCoach({
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
      });
      fetchStudents(user.email);
    }
  }, []);

  // 🔹 Öğrencileri çek
  const fetchStudents = async (coachEmail) => {
    try {
      const q = query(
        collection(db, "students"),
        where("coachEmail", "==", coachEmail),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      setStudents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Listeleme hatası:", err);
    }
  };

  // 🔹 Yeni öğrenci oluştur (Auth + Firestore)
  const addStudent = async (e) => {
    e.preventDefault();
    if (!name || !exam) return;
    if (!coach) {
      alert("Koç bilgisi bulunamadı. Lütfen yeniden giriş yapın.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Otomatik email ve şifre oluştur
      const email =
        name.toLowerCase().replace(/\s+/g, ".") + "@ogrenci.com";
      const password = "ogrenci123";

      // Firebase Auth'ta öğrenci hesabı oluştur
      const newStudent = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(newStudent.user, { displayName: name });

      // Firestore’a öğrenci kaydı
      await addDoc(collection(db, "students"), {
        uid: newStudent.user.uid,
        name,
        exam,
        target,
        email,
        password, // isteğe bağlı (yalnızca koç görür)
        coachName: coach.name,
        coachEmail: coach.email,
        createdAt: serverTimestamp(),
      });

      setMessage(
        `✅ ${name} eklendi. Giriş bilgileri: ${email} / ${password}`
      );
      setName("");
      setExam("");
      setTarget("");

      // Listeyi yenile
      await fetchStudents(coach.email);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setMessage("⚠️ Bu öğrenci zaten kayıtlı.");
      } else {
        setMessage("❌ Öğrenci eklenirken hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Öğrenci sil
  const deleteStudent = async (id) => {
    if (!window.confirm("Bu öğrenciyi silmek istediğine emin misin?")) return;
    await deleteDoc(doc(db, "students", id));
    await fetchStudents(coach.email);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6 text-blue-700">
        🎓 Öğrencilerim
      </h1>

      <form onSubmit={addStudent} className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Ad Soyad"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded p-2 flex-1 min-w-[160px]"
          required
        />
        <input
          type="text"
          placeholder="Sınav Türü (LGS, YKS...)"
          value={exam}
          onChange={(e) => setExam(e.target.value)}
          className="border rounded p-2 flex-1 min-w-[160px]"
          required
        />
        <input
          type="text"
          placeholder="Hedef Okul / Bölüm"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="border rounded p-2 flex-1 min-w-[160px]"
        />
        <button
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Ekleniyor..." : "Ekle"}
        </button>
      </form>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.startsWith("✅")
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Ad Soyad</th>
              <th className="p-2 border">E-posta</th>
              <th className="p-2 border">Sınav Türü</th>
              <th className="p-2 border">Hedef</th>
              <th className="p-2 border text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr
                key={s.id}
                className="border-t hover:bg-gray-50 transition text-sm"
              >
                <td className="p-2 border">{i + 1}</td>
                <td className="p-2 border font-medium text-gray-800">
                  {s.name}
                </td>
                <td className="p-2 border text-gray-600">{s.email}</td>
                <td className="p-2 border">{s.exam}</td>
                <td className="p-2 border">{s.target || "-"}</td>
                <td className="p-2 border text-right">
                  <button
                    onClick={() =>
                      (window.location.href = `/students/${s.id}`)
                    }
                    className="text-blue-600 hover:underline mr-3"
                  >
                    Detay
                  </button>
                  <button
                    onClick={() => deleteStudent(s.id)}
                    className="text-red-500 hover:underline"
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  className="text-center text-gray-500 p-4 italic"
                >
                  Henüz öğrenci eklenmedi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
