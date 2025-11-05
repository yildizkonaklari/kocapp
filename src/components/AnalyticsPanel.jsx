import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, where, query } from "firebase/firestore";
import { TrendingUp, Users, FileText } from "lucide-react";

export default function AnalyticsPanel({ students }) {
  const [averageNet, setAverageNet] = useState(0);
  const [totalTests, setTotalTests] = useState(0);

  useEffect(() => {
    const fetchTests = async () => {
      const q = query(collection(db, "tests"));
      const snapshot = await getDocs(q);
      const allTests = snapshot.docs.map((d) => d.data());
      setTotalTests(allTests.length);
      if (allTests.length > 0) {
        const avg = allTests.reduce((sum, t) => sum + (t.net || 0), 0) / allTests.length;
        setAverageNet(avg.toFixed(1));
      }
    };
    fetchTests();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded shadow flex items-center gap-3">
        <Users size={36} className="text-blue-600" />
        <div>
          <p className="text-gray-500 text-sm">Aktif Öğrenci</p>
          <h2 className="text-xl font-semibold">{students.length}</h2>
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow flex items-center gap-3">
        <FileText size={36} className="text-green-600" />
        <div>
          <p className="text-gray-500 text-sm">Toplam Deneme</p>
          <h2 className="text-xl font-semibold">{totalTests}</h2>
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow flex items-center gap-3">
        <TrendingUp size={36} className="text-orange-500" />
        <div>
          <p className="text-gray-500 text-sm">Ortalama Net</p>
          <h2 className="text-xl font-semibold">{averageNet}</h2>
        </div>
      </div>
    </div>
  );
}
