import DashboardCard from "../components/DashboardCard";

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Genel Görünüm</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard title="Toplam Öğrenci" value="12" />
        <DashboardCard title="Aktif Öğrenci" value="9" />
        <DashboardCard title="Bu Hafta Eklenen Denemeler" value="6" />
      </div>

      <div className="mt-10 bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">Performans Grafiği (Yakında)</h2>
        <div className="h-40 flex items-center justify-center text-gray-400">
          Grafik Alanı (Chart.js)
        </div>
      </div>
    </div>
  );
}
