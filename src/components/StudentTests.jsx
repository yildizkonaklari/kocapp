import TestProgressChart from "./TestProgressChart";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

export default function StudentTests({ studentId }) {
  const [tests, setTests] = useState([]);
  const [testName, setTestName] = useState("");
  const [net, setNet] = useState("");
  const [loading, setLoading] = useState(false);

  // Denemeleri çek
  const fetchTests = async () => {
    const q = query(
      collection(db, "students", studentId, "tests"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setTests(data);
  };

  useEffect(() => {
    fetchTests();
  }, [studentId]);

  // Deneme ekle
  const addTest = async (e) => {
    e.preventDefault();
    if (!testName || !net) return;

    setLoading(true);
    await addDoc(collection(db, "students", studentId, "tests"), {
      name: testName,
      net: parseFloat(net),
      createdAt: serverTimestamp(),
    });
    setTestName("");
    setNet("");
    await fetchTests();
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-xl font-semibold mb-4">📊 Denemeler</h2>

      <form onSubmit={addTest} className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Deneme Adı"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          className="border rounded p-2 flex-1 min-w-[180px]"
          required
        />
        <input
          type="number"
          placeholder="Toplam Net"
          value={net}
          onChange={(e) => setNet(e.target.value)}
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
              <th className="p-2 border">#</th>
              <th className="p-2 border">Deneme Adı</th>
              <th className="p-2 border">Net</th>
              <th className="p-2 border">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t, i) => (
              <tr key={t.id} className="border-t">
                <td className="p-2 border">{i + 1}</td>
                <td className="p-2 border">{t.name}</td>
                <td className="p-2 border">{t.net}</td>
                <td className="p-2 border">
                  {t.createdAt?.seconds
                    ? new Date(t.createdAt.seconds * 1000).toLocaleDateString()
                    : "-"}
                </td>
              </tr>
            ))}
            {tests.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center text-gray-500 p-3">
                  Henüz deneme eklenmedi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TestProgressChart data={tests} />
    </div>
  );
}
