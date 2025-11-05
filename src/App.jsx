import { Link } from "react-router-dom";
import { Home, Users, BarChart2, Settings } from "lucide-react";

export default function Sidebar({ coachProfile }) {
  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen p-5 flex flex-col justify-between">
      <div>
        {/* 🔹 PROFİL KISMI */}
        <div className="flex flex-col items-center mb-8">
          {coachProfile?.logoUrl ? (
            <img
              src={coachProfile.logoUrl}
              alt="Koç Logosu"
              className="w-16 h-16 rounded-full object-cover border border-gray-600 mb-2"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-xl font-semibold mb-2">
              {coachProfile?.name
                ? coachProfile.name.charAt(0).toUpperCase()
                : "K"}
            </div>
          )}

          <p className="text-sm font-semibold">
            {coachProfile?.name || "Koç Adı"}
          </p>
          <p className="text-xs text-gray-400">
            {coachProfile?.email || ""}
          </p>
        </div>

        {/* 🔹 MENÜ */}
        <h2 className="text-xl font-semibold mb-6 text-center text-gray-300">
          TYOSİS
        </h2>
        <nav className="space-y-4">
          <Link
            to="/"
            className="flex items-center gap-3 hover:text-blue-400 transition"
          >
            <Home size={20} /> Anasayfa
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
            to="/profile"
            className="flex items-center gap-3 hover:text-blue-400 transition"
          >
            <Settings size={20} /> Profil
          </Link>
        </nav>
      </div>

      {/* Alt Bilgi */}
      <p className="text-xs text-gray-500 text-center mt-10">
        © 2025 TYOSİS
      </p>
    </div>
  );
}
