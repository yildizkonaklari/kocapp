import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, collectionGroup, getCountFromServer } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = "kocluk-sistemi";

async function loadCoaches() {
    const tableBody = document.getElementById('coachTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Veriler yükleniyor...</td></tr>';

    try {
        // Tüm kullanıcıların profil ayarlarını çek (rol: koc olanlar)
        // Not: Bu sorgu için Firestore'da 'settings' koleksiyon grubu için bir indeks gerekebilir.
        // Hata alırsanız konsoldaki linke tıklayıp indeksi oluşturun.
        const q = query(collectionGroup(db, 'settings'), where('rol', '==', 'koc')); // Veya collectionGroup('profile') değil, settings altındaki 'profile' dökümanı olduğu için collectionGroup 'settings' kullanıp doc ID kontrolü yapabiliriz ama collectionGroup doc ID filtresi desteklemez.
        
        // Alternatif Yöntem (Daha Güvenli):
        // users koleksiyonunu çekip içindeki settings/profile'a bakmak çok maliyetli olur.
        // En iyisi: collectionGroup('settings') değil, çünkü 'settings' bir koleksiyon.
        // Bizim verimiz: .../settings/profile (belge).
        // Collection Group sorgusu BELGE arar. Yani 'settings' koleksiyonundaki tüm belgeleri ararız.
        // Ancak belge ID'si 'profile'.
        
        // DÜZELTME: Doğrudan 'users' altında arama yapmak yerine, structure gereği collectionGroup sorgusu ile 'settings' koleksiyonundaki tüm 'profile' dökümanlarını alalım.
        // Ancak collectionGroup('settings') tüm settings koleksiyonlarındaki TÜM belgeleri getirir.
        
        // ÇÖZÜM:
        // 'settings' bir koleksiyon adıdır. Bu koleksiyonun içindeki dökümanları sorgulayacağız.
        const profilesQuery = query(collectionGroup(db, 'settings'), where('rol', '==', 'koc'));
        
        const querySnapshot = await getDocs(profilesQuery);
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Kayıtlı koç bulunamadı.</td></tr>';
            return;
        }

        let html = '';
        
        for (const profileDoc of querySnapshot.docs) {
            // Document ID 'profile' olmalı (Bizim yapımızda)
            if (profileDoc.id !== 'profile') continue;

            const data = profileDoc.data();
            const coachUid = profileDoc.ref.parent.parent.id; // .../users/{uid}/settings/profile -> parent.parent.id = uid
            
            // Öğrenci Sayısını Hesapla
            const studentsColl = collection(db, "artifacts", appId, "users", coachUid, "ogrencilerim");
            const snapshot = await getCountFromServer(studentsColl);
            const studentCount = snapshot.data().count;

            // Tarih Formatlama
            const formatDate = (timestamp) => {
                if (!timestamp) return "-";
                return new Date(timestamp.toDate()).toLocaleDateString('tr-TR');
            };

            const regDate = formatDate(data.kayitTarihi);
            const loginDate = formatDate(data.sonGirisTarihi);
            
            // Input Değerleri
            const startDateVal = data.uyelikBaslangic ? data.uyelikBaslangic : "";
            const endDateVal = data.uyelikBitis ? data.uyelikBitis : "";
            const maxStudentVal = data.maxOgrenci || 10;

            html += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                ${data.email[0].toUpperCase()}
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${data.displayName || 'İsimsiz Koç'}</div>
                                <div class="text-sm text-gray-500">${data.email}</div>
                                <div class="text-xs text-gray-400 font-mono select-all cursor-pointer" title="Kopyalamak için çift tıkla">${coachUid}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">Kayıt: ${regDate}</div>
                        <div class="text-xs text-gray-500">Son Giriş: ${loginDate}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex flex-col gap-2">
                            <input type="date" id="start-${coachUid}" value="${startDateVal}" class="text-xs border rounded p-1 w-32 focus:ring-indigo-500 focus:border-indigo-500">
                            <input type="date" id="end-${coachUid}" value="${endDateVal}" class="text-xs border rounded p-1 w-32 focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <span class="text-sm font-bold text-gray-900 mr-2">${studentCount} /</span>
                            <input type="number" id="max-${coachUid}" value="${maxStudentVal}" class="text-sm border rounded p-1 w-16 text-center focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div class="bg-indigo-600 h-1.5 rounded-full" style="width: ${(studentCount/maxStudentVal)*100}%"></div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="saveCoach('${coachUid}')" class="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                            Kaydet
                        </button>
                    </td>
                </tr>
            `;
        }
        
        tableBody.innerHTML = html;

    } catch (error) {
        console.error("Admin panel hatası:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Veriler yüklenirken hata oluştu: ${error.message}</td></tr>`;
    }
}

// Global Fonksiyon (HTML'den erişilebilsin diye window'a atıyoruz)
window.saveCoach = async (uid) => {
    const start = document.getElementById(`start-${uid}`).value;
    const end = document.getElementById(`end-${uid}`).value;
    const max = parseInt(document.getElementById(`max-${uid}`).value);

    if (max < 0) { alert("Maksimum öğrenci sayısı 0'dan küçük olamaz."); return; }

    try {
        const ref = doc(db, "artifacts", appId, "users", uid, "settings", "profile");
        
        await updateDoc(ref, {
            uyelikBaslangic: start,
            uyelikBitis: end,
            maxOgrenci: max
        });
        
        alert("Bilgiler güncellendi!");
        // İsteğe bağlı: loadCoaches(); // Tabloyu yenile
    } catch (error) {
        console.error("Güncelleme hatası:", error);
        alert("Güncellenemedi: " + error.message);
    }
};

// Başlat
loadCoaches();
