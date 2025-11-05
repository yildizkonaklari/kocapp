import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";

export default function NotificationPanel() {
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const user = auth.currentUser;

  const fetchNotifications = async () => {
    const snapshot = await getDocs(collection(db, "notifications"));
    setNotifications(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const addNotification = async (e) => {
    e.preventDefault();
    if (!message) return;
    await addDoc(collection(db, "notifications"), {
      coachId: user?.uid,
      message,
      createdAt: serverTimestamp(),
    });
    setMessage("");
    fetchNotifications();
  };

  return (
    <div className="mt-8 bg-white p-5 rounded shadow">
      <h2 className="text-xl font-semibold mb-3">🔔 Koç Bildirimleri</h2>

      <form onSubmit={addNotification} className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Öğrenciler için hatırlatma..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="border rounded p-2 flex-1"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Ekle
        </button>
      </form>

      {notifications.length === 0 ? (
        <p className="text-gray-500 text-sm">Henüz bildirim yok.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {notifications
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5)
            .map((n) => (
              <li key={n.id} className="p-2 bg-gray-50 rounded border">
                {n.message}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
