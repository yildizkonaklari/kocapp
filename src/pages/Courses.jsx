import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function Courses() {
  const [newCourse, setNewCourse] = useState("");
  const [allCourses, setAllCourses] = useState([
    "Türkçe",
    "Matematik",
    "Fen Bilimleri",
    "T.C. İnkılap Tarihi ve Atatürkçülük",
    "Yabancı Dil",
    "Din Kültürü ve Ahlak Bilgisi",
  ]);

  const addCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.trim()) return;
    setAllCourses((prev) => [...prev, newCourse]);
    await addDoc(collection(db, "courses"), {
      name: newCourse,
      createdAt: serverTimestamp(),
    });
    setNewCourse("");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">📚 Dersler</h1>

      <form onSubmit={addCourse} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Yeni Ders Ekle"
          value={newCourse}
          onChange={(e) => setNewCourse(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <button className="bg-green-600 text-white px-4 rounded">Ekle</button>
      </form>

      <ul className="list-disc ml-6">
        {allCourses.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </div>
  );
}
