export default function Navbar({ onLogout }) {
  return (
    <header className="bg-white shadow-soft sticky top-0 z-40">
      <div className="flex justify-between items-center px-6 py-3">
        <h1 className="text-primary text-xl font-bold tracking-tight">
          TYOSİS – Koç Paneli
        </h1>
        <button
          onClick={onLogout}
          className="bg-danger text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          Çıkış Yap
        </button>
      </div>
    </header>
  );
}
