export default function Students({ coachProfile }) {
  ...
  const addStudent = async (e) => {
    e.preventDefault();
    if (!name || !exam) return;

    const user = auth.currentUser;
    if (!user) {
      alert("Lütfen tekrar giriş yapın (koç bilgisi bulunamadı).");
      return;
    }

    // 🔹 Profilden koç adını çek
    const coachName = coachProfile?.name || user.displayName || "Koç Bilgisi Yok";

    setLoading(true);
    await addDoc(collection(db, "students"), {
      name,
      exam,
      coachId: coachName,
      createdAt: serverTimestamp(),
    });
    setLoading(false);

    setName("");
    setExam("");
    await fetchStudents();
  };
  ...
}
