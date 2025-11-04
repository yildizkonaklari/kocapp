import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export default function WeeklyPlan({ studentId }) {
  const [topics, setTopics] = useState([]);
  const [grouped, setGrouped] = useState({});

  // Verileri çek
  const fetchTopics = async () => {
    const q = query(
      collection(db, "students", studentId, "topics"),
      orderBy("week", "asc")
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => d.data());
    setTopics(data);
  };

  // Haftalara göre grupla
  useEffect(() => {
    if (topics.length === 0) return;
    const groupedData = topics.reduce((acc, t) => {
      if (!acc[t.week]) acc[t.week] = [];
      acc[t.week].push(t);
      return acc;
    }, {});
    setGrouped(groupedData);
  }, [topics]);

  useEffect(() => {
    fetchTopics();
  }, [studentId]);

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-xl font-semibold mb-4">📅 Haftalık Plan Görünümü</h2>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-gray-500">Henüz konu eklenmedi.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border w-[150px]">Hafta</th>
                <th className="p-3 border">Konu Planı</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(grouped).map((week) => (
                <tr key={week} className="border-t align-top">
                  <td className="p-3 font-semibold">{week}</td>
                  <td className="p-3 space-y-2">
                    {grouped[week].map((t, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded border ${
                          t.status === "Tamamlandı"
                            ? "bg-green-100 border-green-400"
                            : t.status === "Devam Ediyor"
                            ? "bg-blue-100 border-blue-400"
                            : "bg-red-100 border-red-400"
                        }`}
                      >
                        <span className="font-medium">{t.subject}</span> – {t.topic}
                        <span className="text-sm text-gray-600 ml-2">
                          ({t.status})
                        </span>
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
