export default function Students({ coachProfile }) {
  ...
  const isProfileIncomplete =
    !coachProfile?.name || !coachProfile?.school || !coachProfile?.phone;

  const addStudent = async (e) => {
    e.preventDefault();
    if (isProfileIncomplete) {
      alert("Profilinizi tamamlamadan öğrenciler ekleyemezsiniz.");
      return;
    }
    if (!name || !exam) return;

    const user = auth.currentUser;
    if (!user) {
      alert("Oturum bulunamadı, lütfen tekrar giriş yapın.");
      return;
    }

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
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">🎓 Öğrenci Listesi</h1>

      {isProfileIncomplete && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-3 rounded mb-4">
          ⚠️ Profilinizi tamamlamadan öğrenciler ekleyemezsiniz.
        </div>
      )}

      <form
        onSubmit={addStudent}
        className="flex flex-wrap gap-3 mb-6"
      >
        <input
          type="text"
          placeholder="Ad Soyad"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isProfileIncomplete}
          className="border rounded p-2 flex-1 min-w-[160px]"
          required
        />
        <input
          type="text"
          placeholder="Sınav Türü (LGS, YKS...)"
          value={exam}
          onChange={(e) => setExam(e.target.value)}
          disabled={isProfileIncomplete}
          className="border rounded p-2 flex-1 min-w-[160px]"
          required
        />
        <button
          disabled={loading || isProfileIncomplete}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Ekleniyor..." : "Ekle"}
        </button>
      </form>
  ...
