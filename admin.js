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
// GÜVENLİK: Buraya kendi admin e-posta adresinizi yazın.
const ADMIN_EMAIL = "admin@kocluk.com"; 

// --- 1. GİRİŞ VE YETKİ KONTROLÜ ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Yetki Kontrolü
        if (user.email !== ADMIN_EMAIL) {
            alert("Bu sayfaya erişim yetkiniz yok! Ana sayfaya yönlendiriliyorsunuz.");
            window.location.href = "index.html";
            return;
        }
        
        console.log("Admin oturumu açıldı:", user.email);
        loadCoaches();
    } else {
        alert("Lütfen önce giriş yapın.");
        window.location.href = "login.html";
    }
});

// --- 2. KOÇLARI YÜKLEME ---
async function loadCoaches() {
    const tableBody = document.getElementById('coachTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Veriler yükleniyor...</td></tr>';

    try {
        const profilesQuery = query(collectionGroup(db, 'settings'), where('rol', '==', 'koc'));
        const querySnapshot = await getDocs(profilesQuery);
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Kayıtlı koç bulunamadı.</td></tr>';
            return;
        }

        const rowPromises = querySnapshot.docs.map(async (profileDoc) => {
            if (profileDoc.id !== 'profile') return null;

            const data = profileDoc.data();
            const coachUid = profileDoc.ref.parent.parent.id; 
            
            let studentCount = 0;
            try {
                const studentsColl = collection(db, "artifacts", appId, "users", coachUid, "ogrencilerim");
                const snapshot = await getCountFromServer(studentsColl);
                studentCount = snapshot.data().count;
            } catch (err) { console.warn(err); }

            const formatDate = (timestamp) => {
                if (!timestamp) return "-";
                return new Date(timestamp.toDate()).toLocaleDateString('tr-TR');
            };

            const regDate = formatDate(data.kayitTarihi);
            const loginDate = formatDate(data.sonGirisTarihi);
            
            const startDateVal = data.uyelikBaslangic || "";
            const endDateVal = data.uyelikBitis || "";
            const maxStudentVal = data.maxOgrenci || 1;
            const paketAdiVal = data.paketAdi || "Deneme";

            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                ${data.email ? data.email[0].toUpperCase() : '?'}
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${data.displayName || 'İsimsiz'}</div>
                                <div class="text-sm text-gray-500">${data.email}</div>
                                <div class="text-xs text-gray-400 font-mono select-all cursor-pointer" title="ID">${coachUid}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex flex-col gap-2">
                            <input type="text" id="paket-${coachUid}" value="${paketAdiVal}" class="text-xs border rounded p-1 w-24 focus:ring-indigo-500" placeholder="Paket">
                            <div class="flex items-center gap-1">
                                <span class="text-xs text-gray-500">Limit:</span>
                                <input type="number" id="max-${coachUid}" value="${maxStudentVal}" class="text-xs border rounded p-1 w-12 text-center focus:ring-indigo-500">
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-1"><span class="text-xs text-gray-400 w-6">Baş:</span><input type="date" id="start-${coachUid}" value="${startDateVal}" class="text-xs border rounded p-1 w-28"></div>
                            <div class="flex items-center gap-1"><span class="text-xs text-gray-400 w-6">Bit:</span><input type="date" id="end-${coachUid}" value="${endDateVal}" class="text-xs border rounded p-1 w-28"></div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-bold text-gray-900">${studentCount} / ${maxStudentVal}</div>
                        <div class="text-xs text-gray-500">Kayıt: ${regDate}</div>
                        <div class="text-xs text-gray-500">Son: ${loginDate}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="saveCoach('${coachUid}')" class="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm">Kaydet</button>
                    </td>
                </tr>
            `;
        });

        const rows = await Promise.all(rowPromises);
        tableBody.innerHTML = rows.filter(r => r !== null).join('');

    } catch (error) {
        console.error("Admin panel hatası:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Hata: ${error.message}</td></tr>`;
    }
}

// --- 3. KAYDETME İŞLEMİ ---
window.saveCoach = async (uid) => {
    const start = document.getElementById(`start-${uid}`).value;
    const end = document.getElementById(`end-${uid}`).value;
    const max = parseInt(document.getElementById(`max-${uid}`).value);
    const paket = document.getElementById(`paket-${uid}`).value;

    if (max < 0) { alert("Limit 0'dan küçük olamaz."); return; }

    try {
        const ref = doc(db, "artifacts", appId, "users", uid, "settings", "profile");
        await updateDoc(ref, { uyelikBaslangic: start, uyelikBitis: end, maxOgrenci: max, paketAdi: paket });
        alert("Bilgiler güncellendi!");
        loadCoaches(); // Tabloyu yenile
    } catch (error) {
        console.error("Güncelleme hatası:", error);
        alert("Hata: " + error.message);
    }
};
