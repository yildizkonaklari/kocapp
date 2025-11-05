import jsPDF from "jspdf";
import "jspdf-autotable";

export default function StudentReport({ student, tests }) {
  const createPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Öğrenci Raporu: ${student.name}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Sınav Türü: ${student.exam}`, 14, 28);
    doc.text(`Koç: ${student.coachId}`, 14, 34);
    doc.autoTable({
      startY: 42,
      head: [["Tarih", "Ders", "Soru", "Net", "Notlar"]],
      body: tests.map((t) => [t.date, t.lesson, t.questions, t.net, t.notes]),
    });
    doc.save(`${student.name}-Rapor.pdf`);
  };

  return (
    <button
      onClick={createPDF}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mt-4"
    >
      📄 PDF Raporu İndir
    </button>
  );
}
