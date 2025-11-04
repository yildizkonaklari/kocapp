export default function Navbar() {
  return (
    <div className="flex justify-between items-center bg-white shadow px-6 py-3">
      <h2 className="text-xl font-semibold text-gray-800">Hoş geldin, Koç!</h2>
      <div className="flex items-center gap-4">
        <button className="text-sm font-medium text-blue-600 hover:underline">Profil</button>
        <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">Çıkış</button>
      </div>
    </div>
  );
}
