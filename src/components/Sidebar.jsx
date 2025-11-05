import { Link, useLocation } from "react-router-dom";
import { Home, Users, BookOpen, Settings } from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Ana Sayfa", icon: <Home size={18} /> },
    { path: "/students", label: "Öğrenciler", icon: <Users size={18} /> },
    { path: "/lessons", label: "Dersler", icon: <BookOpen size={18} /> },
    { path: "/profile", label: "Profil", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="bg-secondary text-gray-100 w-64 min-h-screen p-5 flex flex-col justify-between">
      <nav className="space-y-3">
        {navItems.map(({ path, label, icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-2 p-2 rounded-lg transition ${
              location.pathname === path
                ? "bg-primary text-white"
                : "hover:bg-gray-700"
            }`}
          >
            {icon}
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <p className="text-xs text-gray-400 mt-4">
        © 2025 TYOSİS – Takip Yönetim Sistemi
      </p>
    </aside>
  );
}
