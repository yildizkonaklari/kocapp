import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

export default function Courses() {
  const [newCourse, setNewCourse] = useState("");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCourses = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "courses"),
      where("coachId", "==", user.uid)
    );
    const snapshot = await getDocs(q);
    setCourses(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchCourses();
    });
    return () => unsubscribe();
  }, []);

  const addCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      alert("Lütfen giriş yapın!");
      return;
    }

    setLoading(true);
    await addDoc(collection(db, "courses"), {
      name: newCourse,
      coachId: user.uid,
      createdAt: serverTimestamp(),
    });
    setNewCourse("");
    await fetchCourses();
    setLoading(false);
  };

  const deleteCourse = async (id) => {
    if (confirm("Bu dersi silmek istediğinize emin misiniz?")) {
      await deleteDoc(doc(db, "courses", id));
      fetchCourses();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">📘 Dersler</h1>

      <form onSubmit={addCourse} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Yeni Ders Ekle"
          value={newCourse}
          onChange={(e) => setNewCourse(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <button
          disabled={loading}
          className="bg-green-600 text-white px-4 rounded hover:bg-green-700"
        >
          {loading ? "Ekleniyor..." : "Ekle"}
        </button>
      </form>

      <table className="w-full border text-left">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">#</th>
            <th className="p-2 border">Ders Adı</th>
            <th className="p-2 border text-right">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c, i) => (
            <tr key={c.id} className="border-t">
              <td className="p-2 border">{i + 1}</td>
              <td className="p-2 border">{c.name}</td>
              <td className="p-2 border text-right">
                <button
                  onClick={() => deleteCourse(c.id)}
                  className="text-red-500 hover:underline"
                >
                  Sil
                </button>
                {/* İleri seviye için: <button className="ml-3 text-blue-600 hover:underline">Düzenle</button> */}
              </td>
            </tr>
          ))}
          {courses.length === 0 && (
            <tr>
              <td colSpan="3" className="text-center text-gray-500 p-3">
                Henüz ders eklenmemiş.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
