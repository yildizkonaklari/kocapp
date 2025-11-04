export default function DashboardCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-gray-500">{title}</p>
      <h2 className="text-3xl font-bold text-blue-600 mt-2">{value}</h2>
    </div>
  );
}
