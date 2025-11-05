import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen p-5 flex flex-col justify-between">
      <nav className="space-y-3">
        <Link to="/" className="block p-2 hover:bg-gray-700 rounded">
          🏠 Ana Sayfa
        </Link>
        <Link to="/students" className="block p-2 hover:bg-gray-700 rounded">
          🎓 Öğrenciler
        </Link>
        <Link to="/courses" className="block p-2 hover:bg-gray-700 rounded">
          <BookOpen className="inline mr-2" />
          📘 Dersler
        </Link>
        <Link to="/profile" className="block p-2 hover:bg-gray-700 rounded">
          👤 Profil
        </Link>
      </nav>
    </div>
  );
}
