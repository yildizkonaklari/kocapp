import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [exam, setExam] = useState("");
  const [coachId, setCoachId] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) setCoachId(user.uid);
    });
  }, []);

  const fetchStudents = async () => {
    const querySnapshot = await getDocs(collection(db, "students"));
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    setStudents(list.filter((s) => s.coachId === coachId));
  };

  useEffect(() => {
    if (coachId) fetchStudents();
  }, [coachId]);

  const addStudent = async (e) => {
    e.preventDefault();
    if (!name || !exam) return;

    await addDoc(collection(db, "students"), {
      name,
      exam,
      coachId,
      createdAt: new Date(),
    });

    setName("");
    setExam("");
    fetchStudents();
  };

  const deleteStudent = async (id) => {
    await deleteDoc(doc(db, "students", id));
    fetchStudents();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Öğrencilerim</h1>

      <form onSubmit={addStudent} className="bg-white p-4 rounded-lg shadow flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Öğrenci Adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded p-2 flex-1 min-w-[200px]"
          required
        />
        <select
          value={exam}
          onChange={(e) => setExam(e.target.value)}
          className="border rounded p-2"
          required
        >
          <option value="">Sınav Türü</option>
          <option value="LGS">LGS</option>
          <option value="YKS">YKS</option>
          <option value="KPSS">KPSS</option>
          <option value="ALES">ALES</option>
          <option value="DGS">DGS</option>
        </select>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Ekle
        </button>
      </form>

      <div className="bg-white rounded-lg shadow">
        <table className="w-full text-left">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3">Ad Soyad</th>
              <th className="p-3">Sınav Türü</th>
              <th className="p-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.exam}</td>
                <td className="p-3 text-right">
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
                <td colSpan="3" className="p-4 text-center text-gray-500">
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
