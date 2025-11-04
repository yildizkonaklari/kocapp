import StudentTests from "../components/StudentTests";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      const docRef = doc(db, "students", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setStudent(docSnap.data());
      }
      setLoading(false);
    };
    fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        Yükleniyor...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-10 text-center text-red-500">
        Öğrenci bulunamadı.
      </div>
    );
  }

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 hover:underline mb-4"
      >
        ← Geri
      </button>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold mb-4">{student.name}</h1>
        <p><strong>Sınav Türü:</strong> {student.exam}</p>
        <p><strong>Koç ID:</strong> {student.coachId}</p>
        <p><strong>Oluşturulma:</strong> {new Date(student.createdAt.seconds * 1000).toLocaleDateString()}</p>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
  <StudentTests studentId={id} />
  <div className="bg-white p-5 rounded-lg shadow">
    <h2 className="text-xl font-semibold mb-3">🧠 Koç Notları</h2>
    <p className="text-gray-500">Henüz not eklenmedi.</p>
  </div>
</div>
        <div className="bg-white p-5 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">🧠 Koç Notları</h2>
          <p className="text-gray-500">Henüz not eklenmedi.</p>
        </div>
      </div>
    </div>
  );
}
