import { useState, useEffect } from "react";
import { db, auth } from "../firebase"; // ✅ auth eklendi
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [exam, setExam] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchStudents = async () => {
    const q = query(collection(db, "students"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setStudents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // ✅ öğrenci ekleme
const addStudent = async (e) => {
    e.preventDefault();
    if (!name || !exam) return;

    const user = auth.currentUser;
    if (!user) {
      alert("Lütfen tekrar giriş yapın (koç bilgisi bulunamadı).");
      return;
    }

    // 🔹 Profilden koç adını çek
    const coachName = coachProfile?.name || user.displayName || "Koç Bilgisi Yok";

    setLoading(true);
    await addDoc(collection(db, "students"), {
      name,
      exam,
      coachId: coachName,
      createdAt: serverTimestamp(),
    });
    setLoading(false);

    setName("");
    setExam("");
    await fetchStudents();
  };

  // ✅ öğrenci silme
  const deleteStudent = async (id) => {
    await deleteDoc(doc(db, "students", id));
    fetchStudents();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">🎓 Öğrenci Listesi</h1>

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
        <button
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Ekleniyor..." : "Ekle"}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Ad Soyad</th>
              <th className="p-2 border">Sınav Türü</th>
              <th className="p-2 border text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id} className="border-t">
                <td className="p-2 border">{i + 1}</td>
                <td className="p-2 border">{s.name}</td>
                <td className="p-2 border">{s.exam}</td>
                <td className="p-2 border text-right">
                  <button
                    onClick={() => deleteStudent(s.id)}
                    className="text-red-500 hover:underline mr-2"
                  >
                    Sil
                  </button>
                  <button
                    onClick={() => (window.location.href = `/students/${s.id}`)}
                    className="text-blue-600 hover:underline"
                  >
                    Detay
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center text-gray-500 p-3">
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
