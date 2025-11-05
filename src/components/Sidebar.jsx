export default function Sidebar() {
  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen p-5 flex flex-col justify-between">
      <div>
        <div className="flex flex-col items-center mb-6">
          <img
            src="/coach-logo.png"
            alt="Koç Logosu"
            className="w-16 h-16 rounded-full border mb-2"
          />
          <h2 className="text-lg font-semibold">Koç Paneli</h2>
        </div>

        <nav className="space-y-3">
          <Link to="/" className="block p-2 hover:bg-gray-700 rounded">🏠 Ana Sayfa</Link>
          <Link to="/students" className="block p-2 hover:bg-gray-700 rounded">🎓 Öğrenciler</Link>
          <Link to="/courses" className="block p-2 hover:bg-gray-700 rounded">📘 Dersler</Link>
          <Link to="/profile" className="block p-2 hover:bg-gray-700 rounded">👤 Profil</Link>
        </nav>
      </div>
    </div>
  );
}
