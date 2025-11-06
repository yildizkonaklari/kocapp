import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db, auth } from "../firebase";
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
  const [loading, setLoading] = useState(true);

  // form alanları
  const [testDate, setTestDate] = useState("");
  const [net, setNet] = useState("");
  const [testTotal, setTestTotal] = useState("");
  const [noteText, setNoteText] = useState("");
  const [task, setTask] = useState("");

  // öğrenci bilgisi çek
  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDoc(doc(db, "students", id));
      if (snap.exists()) setStudent(snap.data());
      await fetchTests();
      await fetchNotes();
      await fetchPlan();
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // denemeler
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

  // notlar
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

  // plan
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

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

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
          <p className="text-2xl font-bold text-blue-700">
            {tests.length
              ? (
                  tests.reduce((a, b) => a + (b.net || 0), 0) / tests.length
                ).toFixed(1)
              : "0.0"}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center shadow">
          <h3 className="font-semibold text-gray-700">Toplam Deneme</h3>
          <p className="text-2xl font-bold text-green-700">{tests.length}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center shadow">
          <h3 className="font-semibold text-gray-700">Planlanan Görev</h3>
          <p className="text-2xl font-bold text-yellow-700">{plan.length}</p>
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
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="border rounded p-2"
            required
          />
          <input
            type="number"
            placeholder="Net"
            value={net}
            onChange={(e) => setNet(e.target.value)}
            className="border rounded p-2"
            required
          />
          <input
            type="number"
            placeholder="Soru Sayısı"
            value={testTotal}
            onChange={(e) => setTestTotal(e.target.value)}
            className="border rounded p-2"
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Ekle
          </button>
        </form>

        <table className="w-full mt-4 text-left border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Tarih</th>
              <th className="p-2 border">Net</th>
              <th className="p-2 border">Soru</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.id}>
                <td className="p-2 border">{t.date}</td>
                <td className="p-2 border">{t.net}</td>
                <td className="p-2 border">{t.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 📅 Çalışma Planı */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-3">📅 Çalışma Planı</h2>
        <form onSubmit={addTask} className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="Yeni görev ekle..."
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className="border rounded p-2 flex-1"
            required
          />
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Ekle
          </button>
        </form>

        <ul className="divide-y">
          {plan.map((p) => (
            <li key={p.id} className="py-2 flex justify-between">
              <span>{p.text}</span>
              <span className="text-sm text-gray-500">
                {p.done ? "✅" : "🕓"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 🗒️ Koç Notları */}
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-3">🗒️ Koç Notları</h2>
        <form onSubmit={addNote} className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="Not yaz..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="border rounded p-2 flex-1"
            required
          />
          <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            Kaydet
          </button>
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
