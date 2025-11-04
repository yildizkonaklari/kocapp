import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

export default function CoachNotes({ studentId }) {
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(false);

  // Notları getir
  const fetchNotes = async () => {
    const q = query(
      collection(db, "students", studentId, "notes"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setNotes(data);
  };

  useEffect(() => {
    fetchNotes();
  }, [studentId]);

  // Not ekle
  const addNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setLoading(true);
    await addDoc(collection(db, "students", studentId, "notes"), {
      text: noteText,
      createdAt: serverTimestamp(),
    });
    setNoteText("");
    await fetchNotes();
    setLoading(false);
  };

  // Not sil
  const deleteNote = async (id) => {
    await deleteDoc(doc(db, "students", studentId, "notes", id));
    fetchNotes();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-xl font-semibold mb-4">🧠 Koç Notları</h2>

      <form onSubmit={addNote} className="flex flex-wrap items-center gap-3 mb-5">
        <textarea
          placeholder="Gözlemlerini veya motivasyon mesajını buraya yaz..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="border rounded p-2 flex-1 min-w-[250px] h-[80px]"
          required
        />
        <button
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 h-[40px]"
        >
          {loading ? "Ekleniyor..." : "Ekle"}
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="text-gray-500">Henüz not eklenmedi.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div
              key={n.id}
              className="border rounded p-3 flex justify-between items-start bg-gray-50"
            >
              <div>
                <p className="text-gray-700">{n.text}</p>
                <span className="text-xs text-gray-500">
                  {n.createdAt?.seconds
                    ? new Date(n.createdAt.seconds * 1000).toLocaleString("tr-TR")
                    : ""}
                </span>
              </div>
              <button
                onClick={() => deleteNote(n.id)}
                className="text-red-500 text-sm hover:underline"
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
