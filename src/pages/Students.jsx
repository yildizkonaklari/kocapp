import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
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

export default function Students({ coachProfile }) {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [exam, setExam] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Profil kontrolü
  const isProfileIncomplete =
    !coachProfile?.name || !coachProfile?.school || !coachProfile?.phone;

  // 🔹 Firestore'dan öğrencileri getir
  const fetchStudents = async () => {
    const q = query(collection(db, "students"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setStudents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // 🔹 Yeni öğrenci ekleme
  const addStudent = async (e) => {
    e.preventDefault();

    if (isProfileIncomplete) {
      alert("Profilinizi tamamlamadan öğrenciler ekleyemezsiniz.");
      return;
    }

    if (!name || !exam) return;

    const user = auth.currentUser;
    if (!user) {
      alert("Lütfen tekrar giriş yapın (koç bilgisi bulunamadı).");
      return;
    }

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

  // 🔹 Öğrenci silme
  const deleteStudent = async (id) => {
    if (window.confirm("Bu öğrenciyi silmek istediğinize emin misiniz?")) {
      await deleteDoc(doc(db, "students", id));
      await fetchStudents();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">🎓 Öğrenci Listesi</h1>

      {/* 🔹 Profil eksik uyarısı */}
      {isProfileIncomplete && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-3 rounded mb-4">
          ⚠️ Profilinizi tamamlamadan öğrenciler ekleyemezsiniz.
        </div>
      )}

      {/* 🔹 Öğrenci Ekleme Formu */}
      <form
        onSubmit={addStudent}
        className="flex flex-wrap gap-3 mb-6 bg-white p-4 rounded shadow"
      >
        <input
          type="text"
          placeholder="Ad Soyad"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isProfileIncomplete}
          className="border rounded p-2 flex-1 min-w-[160px]"
          required
        />
        <input
          type="text"
          placeholder="Sınav Türü (LGS, YKS, KPSS...)"
          value={exam}
          onChange={(e) => setExam(e.target.value)}
          disabled={isProfileIncomplete}
          className="border rounded p-2 flex-1 min-w-[160px]"
          required
        />
        <button
          type="submit"
          disabled={loading || isProfileIncomplete}
          className={`px-4 py-2 rounded text-white ${
            loading || isProfileIncomplete
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Ekleniyor..." : "Ekle"}
        </button>
      </form>

      {/* 🔹 Öğrenci Listesi */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Ad Soyad</th>
              <th className="p-2 border">Sınav Türü</th>
              <th className="p-2 border">Koç</th>
              <th className="p-2 border text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="p-2 border">{i + 1}</td>
                <td className="p-2 border">{s.name}</td>
                <td className="p-2 border">{s.exam}</td>
                <td className="p-2 border">{s.coachId}</td>
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
                <td colSpan="5" className="text-center text-gray-500 p-4">
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
