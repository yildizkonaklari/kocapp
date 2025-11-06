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

export default function Students() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [exam, setExam] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [coachName, setCoachName] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (user) setCoachName(user.displayName || user.email.split("@")[0]);
    fetchStudents();
  }, []);

  // 🔹 Öğrencileri Firestore'dan çek
  const fetchStudents = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // sadece giriş yapan koçun öğrencilerini çek
      const q = query(
        collection(db, "students"),
        where("coachEmail", "==", user.email),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      setStudents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Öğrenciler yüklenemedi:", err);
    }
  };

  // 🔹 Yeni öğrenci ekle
  const addStudent = async (e) => {
    e.preventDefault();
    if (!name || !exam) return;
    try {
      setLoading(true);
      const user = auth.currentUser;

      await addDoc(collection(db, "students"), {
        name,
        exam,
        target,
        coachName: user.displayName || "Koç",
        coachEmail: user.email,
        createdAt: serverTimestamp(),
      });

      setName("");
      setExam("");
      setTarget("");
      await fetchStudents();
    } catch (err) {
      console.error("Öğrenci eklenemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Öğrenci sil
  const deleteStudent = async (id) => {
    if (!window.confirm("Bu öğrenciyi silmek istediğine emin misin?")) return;
    await deleteDoc(doc(db, "students", id));
    fetchStudents();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">🎓 Öğrencilerim</h1>

      {/* ➕ Yeni Öğrenci Ekle */}
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

      {/* 📋 Öğrenci Listesi */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Ad Soyad</th>
              <th className="p-2 border">Sınav Türü</th>
              <th className="p-2 border">Hedef</th>
              <th className="p-2 border">Koç</th>
              <th className="p-2 border text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id} className="border-t hover:bg-gray-50 transition">
                <td className="p-2 border">{i + 1}</td>
                <td className="p-2 border font-medium text-gray-800">
                  {s.name}
                </td>
                <td className="p-2 border">{s.exam}</td>
                <td className="p-2 border">{s.target || "-"}</td>
                <td className="p-2 border text-gray-600">{s.coachName}</td>
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
