import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import StudentCard from "../components/StudentCard";
import AnalyticsPanel from "../components/AnalyticsPanel";
import NotificationPanel from "../components/NotificationPanel";

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const q = query(collection(db, "students"), where("coachId", "==", user.displayName));
      const snapshot = await getDocs(q);
      setStudents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <p className="p-6 text-gray-500">Yükleniyor...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">🏠 Koç Paneli</h1>

      <AnalyticsPanel students={students} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {students.map((s) => (
          <StudentCard key={s.id} student={s} />
        ))}
      </div>

      <NotificationPanel />
    </div>
  );
}
