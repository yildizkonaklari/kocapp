import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import StudentDetail from "./pages/StudentDetail";

export default function App() {
  const [user, setUser] = useState(null);
  const [coachProfile, setCoachProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // 🔹 Profil bilgilerini Firestore'dan çek
        const docRef = doc(db, "coaches", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCoachProfile(docSnap.data());
          // 🔹 Ad-soyad boşsa profil sayfasına yönlendir
          if (!docSnap.data().name) {
            navigate("/profile");
          }
        } else {
          // 🔹 Hiç profil kaydı yoksa profil sayfasına yönlendir
          navigate("/profile");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = () => signOut(auth);

  if (loading)
    return <div className="p-10 text-center text-gray-500">Yükleniyor...</div>;

  if (!user) return <Login />;

  return (
    <div className="flex">
      <Sidebar coachProfile={coachProfile} />
      <div className="flex-1 flex flex-col bg-gray-100 min-h-screen">
        <Navbar onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students coachProfile={coachProfile} />} />
          <Route path="/students/:id" element={<StudentDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}
