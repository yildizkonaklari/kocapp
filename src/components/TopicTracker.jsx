import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export default function TopicTracker({ studentId }) {
  const [topics, setTopics] = useState([]);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("Devam Ediyor");
  const [week, setWeek] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTopics = async () => {
    const q = query(
      collection(db, "students", studentId, "topics"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    setTopics(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchTopics();
  }, [studentId]);

  const addTopic = async (e) => {
    e.preventDefault();
    if (!subject || !topic || !week) return;
    setLoading(true);
    await addDoc(collection(db, "students", studentId, "topics"), {
      subject,
      topic,
      status,
      week,
      createdAt: serverTimestamp(),
    });
    setSubject("");
    setTopic("");
    setStatus("Devam Ediyor");
    setWeek("");
    await fetchTopics();
    setLoading(false);
  };

  const deleteTopic = async (id) => {
    await deleteDoc(doc(db, "students", studentId, "topics", id));
    fetchTopics();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-xl font-semibold mb-4">📘 Konu Takibi</h2>

      <form onSubmit={addTopic} className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Ders (Matematik, Türkçe...)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border rounded p-2 flex-1 min-w-[160px]"
          required
        />
        <input
          type="text"
          placeholder="Konu Adı"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="border rounded p-2 flex-1 min-w-[160px]"
          required
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded p-2"
        >
          <option>Devam Ediyor</option>
          <option>Tamamlandı</option>
          <option>Eksik</option>
        </select>
        <input
          type="text"
          placeholder="Hafta (örnek: Hafta 5)"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          className="border rounded p-2 w-[120px]"
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
              <th className="p-2 border">Ders</th>
              <th className="p-2 border">Konu</th>
              <th className="p-2 border">Durum</th>
              <th className="p-2 border">Hafta</th>
              <th className="p-2 border text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2 border">{t.subject}</td>
                <td className="p-2 border">{t.topic}</td>
                <td className="p-2 border">
                  {t.status === "Tamamlandı" && (
                    <span className="text-green-600 font-medium">✅ Tamamlandı</span>
                  )}
                  {t.status === "Devam Ediyor" && (
                    <span className="text-blue-600 font-medium">⏳ Devam Ediyor</span>
                  )}
                  {t.status === "Eksik" && (
                    <span className="text-red-500 font-medium">❌ Eksik</span>
                  )}
                </td>
                <td className="p-2 border">{t.week}</td>
                <td className="p-2 border text-right">
                  <button
                    onClick={() => deleteTopic(t.id)}
                    className="text-red-500 hover:underline"
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {topics.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-gray-500 p-4">
                  Henüz konu eklenmedi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
