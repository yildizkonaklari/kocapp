import { useState } from "react";

export default function Courses() {
  const [selectedCourses, setSelectedCourses] = useState([]);

  const allCourses = [
    "Türkçe",
    "Matematik",
    "Fen Bilimleri",
    "T.C. İnkılap Tarihi ve Atatürkçülük",
    "Yabancı Dil",
    "Din Kültürü ve Ahlak Bilgisi",
  ];

  const toggleCourse = (course) => {
    setSelectedCourses((prev) =>
      prev.includes(course)
        ? prev.filter((c) => c !== course)
        : [...prev, course]
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">📚 Dersler</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allCourses.map((course) => (
          <button
            key={course}
            onClick={() => toggleCourse(course)}
            className={`p-3 rounded-lg border ${
              selectedCourses.includes(course)
                ? "bg-green-600 text-white"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            {selectedCourses.includes(course) ? "✅ " : "⬜ "} {course}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Seçilen Dersler:</h2>
        {selectedCourses.length > 0 ? (
          <ul className="list-disc ml-6 text-gray-700">
            {selectedCourses.map((course) => (
              <li key={course}>{course}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Henüz ders seçilmedi.</p>
        )}
      </div>
    </div>
  );
}
