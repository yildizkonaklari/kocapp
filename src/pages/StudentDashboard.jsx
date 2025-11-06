import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchStudent = async () => {
      if (!user) return;
      const ref = doc(db, "students", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setStudent(snap.data());
      setLoading(false);
    };
    fetchStudent();
  }, [user]);

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-blue-700 mb-6">
        👋 Hoş geldin, {student?.name || user?.email.split("@")[0]}!
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-4 border-t-4 border-blue-500">
          <h3 className="text-gray-600 font-semibold mb-2">Son Net Ortalaman</h3>
          <p className="text-3xl font-bold text-blue-700">{student?.averageNet || "0.0"}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-4 border-t-4 border-green-500">
          <h3 className="text-gray-600 font-semibold mb-2">Bu Hafta Görevlerin</h3>
          <p className="text-3xl font-bold text-green-700">{student?.weeklyTasks || 0}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-4 border-t-4 border-yellow-500">
          <h3 className="text-gray-600 font-semibold mb-2">Motivasyon</h3>
          <p className="text-xl text-yellow-600">
            “{student?.quote || "Küçük adımlar büyük farklar yaratır."}”
          </p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-3 text-gray-700">📅 Planlanan Görevler</h2>
        <ul className="bg-white rounded-lg shadow divide-y">
          {(student?.tasks || []).length > 0 ? (
            student.tasks.map((t, i) => (
              <li key={i} className="p-3 flex justify-between">
                <span>{t.text}</span>
                <span>{t.done ? "✅" : "🕓"}</span>
              </li>
            ))
          ) : (
            <li className="p-3 text-gray-500 text-center">Henüz görev bulunmuyor.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
