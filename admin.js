import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc, 
    collectionGroup, 
    getCountFromServer 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "kocluk-sistemi";

// --- ADMIN AYARLARI ---
// Buraya kendi e-posta adresinizi yazın. Sadece bu kişi verileri görebilir.
// Eğer herkesin (tüm koçların) görmesini istiyorsanız bu kontrolü kaldırabilirsiniz.
const ADMIN_EMAIL = "koc99@gmail.com"; // Örnek: Kendi emailinizle değiştirin

// --- 1. GİRİŞ KONTROLÜ ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Kullanıcı giriş yapmış
        console.log("Admin paneli oturumu:", user.email);
        
        // Opsiyonel: Sadece belirli bir email girebilsin
        // if (user.email !== ADMIN_EMAIL) {
        //     alert("Bu sayfaya erişim yetkiniz yok!");
        //     window.location.href = "index.html";
        //     return;
        // }

        // Verileri Yükle
        loadCoaches();
    } else {
        // Giriş yapılmamış, Login sayfasına at
        alert("Lütfen önce giriş yapın.");
        window.location.href = "login.html";
    }
});

// --- 2. KOÇLARI YÜKLEME ---
async function loadCoaches() {
    const tableBody = document.getElementById('coachTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Veriler yükleniyor...</td></tr>';

    try {
        // 'settings' koleksiyon grubunda rolü 'koc' olanları bul
        const profilesQuery = query(collectionGroup(db, 'settings'), where('rol', '==', 'koc'));
        
        const querySnapshot = await getDocs(profilesQuery);
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Kayıtlı koç bulunamadı.</td></tr>';
            return;
        }

        let html = '';
        
        // Promise.all kullanarak tüm öğrenci sayılarını paralel çekelim (Performans için)
        const rowPromises = querySnapshot.docs.map(async (profileDoc) => {
            // Sadece 'profile' ID'li dökümanları al (Güvenlik)
            if (profileDoc.id !== 'profile') return null;

            const data = profileDoc.data();
            // hiyerarşi: users/{uid}/settings/profile -> parent.parent.id = uid
            const coachUid = profileDoc.ref.parent.parent.id; 
            
            // Öğrenci Sayısını Hesapla (Count Aggregation)
            let studentCount = 0;
            try {
                const studentsColl = collection(db, "artifacts", appId, "users", coachUid, "ogrencilerim");
                const snapshot = await getCountFromServer(studentsColl);
                studentCount = snapshot.data().count;
            } catch (err) {
                console.warn(`Öğrenci sayısı alınamadı (${coachUid}):`, err);
            }

            // Tarih Formatlama
            const formatDate = (timestamp) => {
                if (!timestamp) return "-";
                return new Date(timestamp.toDate()).toLocaleDateString('tr-TR');
            };

            const regDate = formatDate(data.kayitTarihi);
            const loginDate = formatDate(data.sonGirisTarihi);
            
            // Input Değerleri (Yoksa boş veya varsayılan)
            const startDateVal = data.uyelikBaslangic || "";
            const endDateVal = data.uyelikBitis || "";
            const maxStudentVal = data.maxOgrenci || 1;

            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                ${data.email ? data.email[0].toUpperCase() : '?'}
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${data.displayName || 'İsimsiz Koç'}</div>
                                <div class="text-sm text-gray-500">${data.email}</div>
                                <div class="text-xs text-gray-400 font-mono select-all cursor-pointer" title="ID'yi kopyala">${coachUid}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">Kayıt: ${regDate}</div>
                        <div class="text-xs text-gray-500">Son Giriş: ${loginDate}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-1">
                                <span class="text-xs text-gray-400 w-8">Baş:</span>
                                <input type="date" id="start-${coachUid}" value="${startDateVal}" class="text-xs border rounded p-1 w-28 focus:ring-indigo-500 focus:border-indigo-500">
                            </div>
                            <div class="flex items-center gap-1">
                                <span class="text-xs text-gray-400 w-8">Bit:</span>
                                <input type="date" id="end-${coachUid}" value="${endDateVal}" class="text-xs border rounded p-1 w-28 focus:ring-indigo-500 focus:border-indigo-500">
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <span class="text-sm font-bold text-gray-900 mr-2">${studentCount} /</span>
                            <input type="number" id="max-${coachUid}" value="${maxStudentVal}" class="text-sm border rounded p-1 w-16 text-center focus:ring-indigo-500 focus:border-indigo-500">
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div class="bg-indigo-600 h-1.5 rounded-full" style="width: ${Math.min((studentCount/maxStudentVal)*100, 100)}%"></div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="saveCoach('${coachUid}')" class="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm">
                            Kaydet
                        </button>
                    </td>
                </tr>
            `;
        });

        const rows = await Promise.all(rowPromises);
        tableBody.innerHTML = rows.filter(r => r !== null).join('');

    } catch (error) {
        console.error("Admin panel hatası:", error);
        
        // İNDEKS HATASI YÖNETİMİ
        if (error.code === 'failed-precondition') {
            // Hata mesajının içinden linki ayıkla
            const linkMatch = error.message.match(/https:\/\/[^\s]+/);
            const link = linkMatch ? linkMatch[0] : '#';
            
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center">
                        <div class="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 inline-block text-left">
                            <p class="font-bold mb-2">Veritabanı İndeksi Eksik</p>
                            <p class="text-sm mb-3">Bu sorguyu çalıştırmak için Firestore'da bir indeks oluşturulması gerekiyor.</p>
                            <a href="${link}" target="_blank" class="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition-colors inline-flex items-center">
                                <i class="fa-solid fa-wrench mr-2"></i> İndeksi Oluştur (Firebase)
                            </a>
                        </div>
                    </td>
                </tr>`;
        } else if (error.code === 'permission-denied') {
            tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-600 font-bold">Yetkiniz yok! Lütfen yönetici hesabıyla giriş yapın.</td></tr>`;
        } else {
            tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Hata: ${error.message}</td></tr>`;
        }
    }
}

// --- 3. KAYDETME İŞLEMİ ---
// Global window nesnesine atıyoruz ki HTML onclick görebilsin
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
        
        // Başarı mesajı (Toast veya Alert)
        alert("Bilgiler başarıyla güncellendi!");
        
    } catch (error) {
        console.error("Güncelleme hatası:", error);
        alert("Güncellenemedi: " + error.message);
    }
};
