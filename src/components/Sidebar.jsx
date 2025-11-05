import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function Sidebar() {
  const [coach, setCoach] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const docRef = doc(db, "coaches", user.uid);
        const unsubscribeDoc = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            setCoach(snapshot.data());
          }
        });
        return unsubscribeDoc;
      } else {
        setCoach(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen p-5 flex flex-col justify-between">
      <div>
        <div className="flex flex-col items-center mb-6">
          <img
            src={coach?.photoURL || "/avatar.svg"}
            alt="Koç Avatar"
            className="w-20 h-20 rounded-full border mb-2 object-cover shadow"
          />
          <h2 className="text-lg font-semibold text-center">
            Hoş geldin{coach?.name ? `, ${coach.name}` : ""}
          </h2>
        </div>

        <nav className="space-y-3">
          <Link to="/" className="block p-2 hover:bg-gray-700 rounded transition">
            🏠 Ana Sayfa
          </Link>
          <Link to="/students" className="block p-2 hover:bg-gray-700 rounded transition">
            🎓 Öğrenciler
          </Link>
          <Link to="/courses" className="block p-2 hover:bg-gray-700 rounded transition">
            📘 Dersler
          </Link>
          <Link to="/profile" className="block p-2 hover:bg-gray-700 rounded transition">
            👤 Profil
          </Link>
        </nav>
      </div>
    </div>
  );
}
