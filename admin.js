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

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadCoaches();
    } else {
        window.location.href = "login.html";
    }
});

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

            const startDateVal = data.uyelikBaslangic || "";
            const endDateVal = data.uyelikBitis || "";
            const maxStudentVal = data.maxOgrenci || 1; // Varsayılan 1
            const paketAdiVal = data.paketAdi || "Deneme"; // Varsayılan Deneme

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
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex flex-col gap-2">
                            <input type="text" id="paket-${coachUid}" value="${paketAdiVal}" class="text-xs border rounded p-1 w-32 focus:ring-indigo-500" placeholder="Paket Adı">
                            <div class="flex items-center gap-1">
                                <span class="text-xs text-gray-500">Limit:</span>
                                <input type="number" id="max-${coachUid}" value="${maxStudentVal}" class="text-xs border rounded p-1 w-16 text-center focus:ring-indigo-500">
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-1">
                                <span class="text-xs text-gray-400 w-8">Baş:</span>
                                <input type="date" id="start-${coachUid}" value="${startDateVal}" class="text-xs border rounded p-1 w-28 focus:ring-indigo-500">
                            </div>
                            <div class="flex items-center gap-1">
                                <span class="text-xs text-gray-400 w-8">Bit:</span>
                                <input type="date" id="end-${coachUid}" value="${endDateVal}" class="text-xs border rounded p-1 w-28 focus:ring-indigo-500">
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-bold text-gray-900">${studentCount} Kayıtlı</div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div class="bg-${studentCount > maxStudentVal ? 'red' : 'green'}-500 h-1.5 rounded-full" style="width: ${Math.min((studentCount/maxStudentVal)*100, 100)}%"></div>
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
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Hata: ${error.message}</td></tr>`;
    }
}

window.saveCoach = async (uid) => {
    const start = document.getElementById(`start-${uid}`).value;
    const end = document.getElementById(`end-${uid}`).value;
    const max = parseInt(document.getElementById(`max-${uid}`).value);
    const paket = document.getElementById(`paket-${uid}`).value;

    if (max < 0) { alert("Limit 0'dan küçük olamaz."); return; }

    try {
        const ref = doc(db, "artifacts", appId, "users", uid, "settings", "profile");
        
        await updateDoc(ref, {
            paketAdi: paket,
            uyelikBaslangic: start,
            uyelikBitis: end,
            maxOgrenci: max
        });
        
        alert("Paket bilgileri güncellendi!");
    } catch (error) {
        console.error("Güncelleme hatası:", error);
        alert("Hata: " + error.message);
    }
};
