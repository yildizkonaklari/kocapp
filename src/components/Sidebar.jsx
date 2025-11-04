import { Link } from "react-router-dom";
import { Home, Users, BarChart2, Settings } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen p-5 flex flex-col justify-between">
      <div>
        <h2 className="text-2xl font-semibold mb-8 text-center">Koç Paneli</h2>
        <nav className="space-y-4">
          <Link
            to="/"
            className="flex items-center gap-3 hover:text-blue-400 transition"
          >
            <Home size={20} /> Anasayfa
          </Link>
          <Link
  to="/profile"
  className="flex items-center gap-3 hover:text-blue-400 transition"
>
  <Settings size={20} /> Profil
</Link>
          <Link
            to="/students"
            className="flex items-center gap-3 hover:text-blue-400 transition"
          >
            <Users size={20} /> Öğrenciler
          </Link>
          <Link
            to="/reports"
            className="flex items-center gap-3 hover:text-blue-400 transition"
          >
            <BarChart2 size={20} /> Raporlar
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 hover:text-blue-400 transition"
          >
            <Settings size={20} /> Ayarlar
          </Link>
        </nav>
      </div>

      <p className="text-sm text-gray-400 text-center mt-6">
        © 2025 TYOSİS
      </p>
    </div>
  );
}
