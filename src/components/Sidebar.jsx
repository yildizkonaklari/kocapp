import { Home, Users, BarChart2, Settings } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen p-5 flex flex-col justify-between">
      <div>
        <h1 className="text-2xl font-bold mb-10">Koç Paneli</h1>
        <ul className="space-y-4">
          <li className="flex items-center gap-3 cursor-pointer hover:text-blue-400">
            <Home size={20} /> Dashboard
          </li>
          <li className="flex items-center gap-3 cursor-pointer hover:text-blue-400">
            <Users size={20} /> Öğrenciler
          </li>
          <li className="flex items-center gap-3 cursor-pointer hover:text-blue-400">
            <BarChart2 size={20} /> Analizler
          </li>
          <li className="flex items-center gap-3 cursor-pointer hover:text-blue-400">
            <Settings size={20} /> Ayarlar
          </li>
        </ul>
      </div>
      <p className="text-sm text-gray-500 mt-10">© TYOSİS Coach System</p>
    </div>
  );
}
import { Link } from "react-router-dom";
import { Home, Users, BarChart2, Settings } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen p-5 flex flex-col justify-between">
      <div>
        <h1 className="text-2xl font-bold mb-10">Koç Paneli</h1>
        <ul className="space-y-4">
          <li><Link to="/" className="flex items-center gap-3 hover:text-blue-400"><Home size={20}/> Dashboard</Link></li>
          <li><Link to="/students" className="flex items-center gap-3 hover:text-blue-400"><Users size={20}/> Öğrenciler</Link></li>
        </ul>
      </div>
      <p className="text-sm text-gray-500 mt-10">© TYOSİS Coach System</p>
    </div>
  );
}
