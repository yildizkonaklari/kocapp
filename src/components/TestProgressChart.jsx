import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function TestProgressChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 text-center p-6">
        Grafik için yeterli veri yok.
      </div>
    );
  }

  const chartData = data.map((t, index) => ({
    name: t.name || `Deneme ${index + 1}`,
    net: t.net,
  })).reverse(); // son eklenen en sağda

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4">📈 Net Artış Grafiği</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" domain={["auto", "auto"]} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="net"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 5, fill: "#2563eb" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
