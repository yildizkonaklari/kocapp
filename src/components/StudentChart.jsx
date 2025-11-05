import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function StudentChart({ studentId }) {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const q = query(
        collection(db, "tests"),
        where("studentId", "==", studentId),
        orderBy("date", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        ...doc.data(),
        date: doc.data().date || "",
        net: Number(doc.data().net) || 0,
      }));
      setChartData(data);
    };
    fetchData();
  }, [studentId]);

  if (chartData.length === 0)
    return (
      <p className="text-gray-500 mt-6">
        Grafik oluşturmak için yeterli deneme verisi bulunmuyor.
      </p>
    );

  return (
    <div className="bg-white p-5 rounded shadow mt-6">
      <h3 className="text-lg font-semibold mb-3">📈 Net Gelişim Grafiği</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 20]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="net"
            stroke="#2563eb"
            strokeWidth={2}
            activeDot={{ r: 6 }}
            name="Net Sayısı"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
