import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Login from "./pages/Login";
import StudentDetail from "./pages/StudentDetail";
import Profile from "./pages/Profile";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 useEffect içine alınmalı
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => signOut(auth);

  if (loading) return <div className="p-10 text-center text-gray-500">Yükleniyor...</div>;

  if (!user) return <Login />;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-gray-100 min-h-screen">
        <Navbar onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/:id" element={<StudentDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}
