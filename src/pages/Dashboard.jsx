import { TrendingUp, Users, BookOpen } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="h1">Hoş Geldiniz 👋</h1>
      <p className="text-gray-600 mb-6">
        Bugünün özetini aşağıda bulabilirsiniz.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <Users className="text-primary" size={36} />
          <div>
            <p className="text-sm text-gray-500">Toplam Öğrenci</p>
            <h2 className="text-2xl font-bold">18</h2>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <BookOpen className="text-accent" size={36} />
          <div>
            <p className="text-sm text-gray-500">Toplam Deneme</p>
            <h2 className="text-2xl font-bold">47</h2>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <TrendingUp className="text-success" size={36} />
          <div>
            <p className="text-sm text-gray-500">Ortalama Net</p>
            <h2 className="text-2xl font-bold">14.2</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
