import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
} from "firebase/storage";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function StudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [tests, setTests] = useState([]);
  const [notes, setNotes] = useState([]);
  const [plan, setPlan] = useState([]);
  const [files, setFiles] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  // form alanları
  const [testDate, setTestDate] = useState("");
  const [net, setNet] = useState("");
  const [testTotal, setTestTotal] = useState("");
  const [noteText, setNoteText] = useState("");
  const [task, setTask] = useState("");
  const [fileUpload, setFileUpload] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(3);

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDoc(doc(db, "students", id));
      if (snap.exists()) setStudent(snap.data());
      await Promise.all([
        fetchTests(),
        fetchNotes(),
        fetchPlan(),
        fetchFiles(),
        fetchFeedbacks(),
      ]);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // ---- DENEMELER ----
  const fetchTests = async () => {
    const q = query(
      collection(db, "students", id, "tests"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    setTests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const addTest = async (e) => {
    e.preventDefault();
    if (!testDate || !net) return;
    await addDoc(collection(db, "students", id, "tests"), {
      date: testDate,
      net: parseFloat(net),
      total: parseInt(testTotal) || 0,
      createdAt: serverTimestamp(),
    });
    setTestDate("");
    setNet("");
    setTestTotal("");
    fetchTests();
  };

  // ---- NOTLAR ----
  const fetchNotes = async () => {
    const q = query(
      collection(db, "students", id, "notes"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!noteText) return;
    const user = auth.currentUser;
    await addDoc(collection(db, "students", id, "notes"), {
      text: noteText,
      coach: user?.displayName || "Koç",
      createdAt: serverTimestamp(),
    });
    setNoteText("");
    fetchNotes();
  };

  // ---- PLAN ----
  const fetchPlan = async () => {
    const q = query(
      collection(db, "students", id, "plan"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    setPlan(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!task) return;
    await addDoc(collection(db, "students", id, "plan"), {
      text: task,
      done: false,
      createdAt: serverTimestamp(),
    });
    setTask("");
    fetchPlan();
  };

  // ---- DOSYALAR ----
  const fetchFiles = async () => {
    const folderRef = ref(storage, `students/${id}/files`);
    const res = await listAll(folderRef);
    const urls = await Promise.all(res.items.map(getDownloadURL));
    setFiles(urls);
  };

  const uploadFile = async (e) => {
    e.preventDefault();
    if (!fileUpload) return;
    const fileRef = ref(storage, `students/${id}/files/${fileUpload.name}`);
    await uploadBytes(fileRef, fileUpload);
    setFileUpload(null);
    fetchFiles();
  };

  // ---- GERİ BİLDİRİM ----
  const fetchFeedbacks = async () => {
    const q = query(
      collection(db, "students", id, "feedback"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    setFeedbacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const addFeedback = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    await addDoc(collection(db, "students", id, "feedback"), {
      text: feedbackText,
      rating,
      coach: user?.displayName || "Koç",
      createdAt: serverTimestamp(),
    });
    setFeedbackText("");
    setRating(3);
    fetchFeedbacks();
  };

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

  // ---- Trend Hesaplama ----
  const trend =
    tests.length > 2
      ? tests[0].net > tests[tests.length - 1].net
        ? "📈 Artış"
        : "📉 Düşüş"
      : "⚪ Stabil";

  const avgNet =
    tests.length > 0
      ? (
          tests.reduce((a, b) => a + (b.net || 0), 0) / tests.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="p-8 space-y-10">
      {/* 👤 Öğrenci Bilgileri */}
      <div className="bg-white shadow rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-4">{student.name}</h1>
        <div className="grid md:grid-cols-2 gap-4 text-gray-700">
          <p><strong>Sınav Türü:</strong> {student.exam}</p>
          <p><strong>Koç:</strong> {student.coachName}</p>
          <p><strong>Hedef Okul / Bölüm:</strong> {student.target || "-"}</p>
          <p><strong>Kayıt Tarihi:</strong> {student.createdAt?.toDate?.().toLocaleDateString?.() || "-"}</p>
        </div>
      </div>

      {/* 🔔 Özet Panel */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center shadow">
          <h3 className="font-semibold text-gray-700">Son Net Ortalaması</h3>
          <p className="text-2xl font-bold text-blue-700">{avgNet}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center shadow">
          <h3 className="font-semibold text-gray-700">Toplam Deneme</h3>
          <p className="text-2xl font-bold text-green-700">{tests.length}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center shadow">
          <h3 className="font-semibold text-gray-700">Gelişim Trendi</h3>
          <p className="text-xl">{trend}</p>
        </div>
      </div>

      {/* 🧠 Akademik Takip */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-3">📈 Deneme Net Grafiği</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={tests.map((t) => ({ name: t.date, net: t.net }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>

        <form onSubmit={addTest} className="flex flex-wrap gap-3 mt-5">
          <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className="border rounded p-2" required />
          <input type="number" placeholder="Net" value={net} onChange={(e) => setNet(e.target.value)} className="border rounded p-2" required />
          <input type="number" placeholder="Soru Sayısı" value={testTotal} onChange={(e) => setTestTotal(e.target.value)} className="border rounded p-2" />
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Ekle</button>
        </form>
      </div>

      {/* 📎 Dosyalar */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-3">📎 Dosyalar</h2>
        <form onSubmit={uploadFile} className="flex gap-3 mb-4">
          <input type="file" onChange={(e) => setFileUpload(e.target.files[0])} className="border rounded p-2 flex-1" />
          <button className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800">Yükle</button>
        </form>
        <div className="flex flex-wrap gap-4">
          {files.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              Dosya {i + 1}
            </a>
          ))}
          {files.length === 0 && <p className="text-gray-500">Henüz dosya yok.</p>}
        </div>
      </div>

      {/* 💬 Geri Bildirim */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-3">💬 Geri Bildirim</h2>
        <form onSubmit={addFeedback} className="flex flex-wrap gap-3 mb-3">
          <textarea placeholder="Koç veya öğrenci değerlendirmesi..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="border rounded p-2 flex-1 min-w-[200px]" required />
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border rounded p-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                {r} ⭐
              </option>
            ))}
          </select>
          <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Kaydet</button>
        </form>
        <ul className="divide-y">
          {feedbacks.map((f) => (
            <li key={f.id} className="py-2">
              <p>{f.text}</p>
              <p className="text-sm text-gray-500">
                {f.rating} ⭐ • {f.coach} • {f.createdAt?.toDate?.().toLocaleDateString?.()}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* 🗒️ Koç Notları */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-3">🗒️ Koç Notları</h2>
        <form onSubmit={addNote} className="flex gap-3 mb-3">
          <input type="text" placeholder="Not yaz..." value={noteText} onChange={(e) => setNoteText(e.target.value)} className="border rounded p-2 flex-1" required />
          <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Kaydet</button>
        </form>
        <ul className="divide-y">
          {notes.map((n) => (
            <li key={n.id} className="py-2">
              <p>{n.text}</p>
              <p className="text-sm text-gray-500">
                {n.coach} • {n.createdAt?.toDate?.().toLocaleDateString?.()}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
