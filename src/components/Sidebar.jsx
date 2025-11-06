import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";

export default function Sidebar() {
  const [coach, setCoach] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsub = onSnapshot(doc(db, "coaches", user.uid), (snap) => {
      if (snap.exists()) setCoach(snap.data());
    });

    return () => unsub();
  }, []);

  return (
    <div className="w-64 bg-white border-r h-screen flex flex-col justify-between">
      <div>
        <div className="p-6 flex flex-col items-center border-b">
          {coach?.photoURL ? (
            <img
              src={coach.photoURL}
              alt="Koç"
              className="w-20 h-20 rounded-full mb-2 object-cover border"
            />
          ) : (
            <img
              src="/avatar.svg"
              alt="Avatar"
              className="w-20 h-20 rounded-full mb-2 border"
            />
          )}
          <h2 className="text-lg font-semibold">{coach?.name || "Koç"}</h2>
          <p className="text-sm text-gray-500">{coach?.email}</p>
        </div>

        <nav className="mt-4 px-4 space-y-2">
          <Link className="block p-2 rounded hover:bg-gray-100" to="/">
            🏠 Dashboard
          </Link>
          <Link className="block p-2 rounded hover:bg-gray-100" to="/students">
            🎓 Öğrenciler
          </Link>
          <Link className="block p-2 rounded hover:bg-gray-100" to="/courses">
            📘 Dersler
          </Link>
          <Link className="block p-2 rounded hover:bg-gray-100" to="/profile">
            👤 Profil
          </Link>
        </nav>
      </div>

      <div className="text-center text-xs text-gray-400 py-3 border-t">
        TYOSİS • Koç Paneli
      </div>
    </div>
  );
}
