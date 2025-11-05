import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import StudentTests from "../components/StudentTests";
import StudentChart from "../components/StudentChart";

export default function StudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [coachLessons, setCoachLessons] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const studentSnap = await getDoc(doc(db, "students", id));
      if (studentSnap.exists()) {
        const data = studentSnap.data();
        setStudent(data);

        // 🔹 Koçun ders listesi
        const coachSnap = await getDoc(doc(db, "coaches", data.coachId));
        if (coachSnap.exists()) {
          setCoachLessons(coachSnap.data().lessons || []);
        }
      }
    };
    fetchData();
  }, [id]);

  if (!student)
    return <div className="p-6 text-gray-600">Öğrenci bilgileri yükleniyor...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">{student.name}</h1>
      <p className="text-gray-600 mb-6">Sınav Türü: {student.exam}</p>

      {/* 🔹 Deneme ekleme ve listeleme */}
      <StudentTests studentId={id} coachLessons={coachLessons} />

      {/* 🔹 Net gelişim grafiği */}
      <StudentChart studentId={id} />
    </div>
  );
}
