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
    getCountFromServer,
    onSnapshot,
    orderBy,
    limit 
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
const ADMIN_EMAIL = "koc99@gmail.com"; 

// Dinleyicileri tutacak değişkenler (Sayfadan çıkılırsa kapatmak için)
let listeners = {
    demoRequests: null,
    coaches: null
};

// --- 1. GİRİŞ VE YETKİ KONTROLÜ ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // İstemci Tarafı Yetki Kontrolü
        // ÖNEMLİ: Firestore Security Rules tarafında da bu e-postayı kilitlemelisiniz.
        if (user.email !== ADMIN_EMAIL) {
            alert("Bu sayfaya erişim yetkiniz yok! Ana sayfaya yönlendiriliyorsunuz.");
            window.location.href = "index.html";
            return;
        }
        
        console.log("Admin oturumu açıldı:", user.email);
        
        // Verileri Yükle
        listenToDemoRequests();
        loadCoaches();
        
        // Çıkış Butonu Varsa Bağla
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if(logoutBtn) logoutBtn.onclick = () => signOut(auth).then(() => window.location.href='login.html');

    } else {
        // Oturum yoksa login'e at
        window.location.href = "login.html";
    }
});

// --- 2. DEMO TALEPLERİNİ DİNLEME (PERFORMANS İYİLEŞTİRMELİ) ---
function listenToDemoRequests() {
    const demoTableBody = document.getElementById('demoTableBody');
    const requestCountBadge = document.getElementById('requestCountBadge');

    // Son 50 talebi getir (Performans için limit)
    // Not: 'createdAt' alanına göre sıralama için Firestore'da index oluşturmanız gerekebilir.
    // Konsolda hata alırsanız çıkan linke tıklayarak index oluşturun.
    const requestsRef = collection(db, 'demoRequests'); 
    const q = query(requestsRef, orderBy('createdAt', 'desc'), limit(50));
    
    if(listeners.demoRequests) listeners.demoRequests(); // Varsa eskiyi kapat

    listeners.demoRequests = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            demoTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-10 text-center text-gray-400">
                        <i class="fa-regular fa-folder-open text-3xl mb-2"></i><br>
                        Henüz talep yok.
                    </td>
                </tr>`;
            if(requestCountBadge) requestCountBadge.textContent = "0";
            return;
        }

        const requests = [];
        snapshot.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
        });

        // Tabloyu Temizle ve Doldur
        demoTableBody.innerHTML = '';
        
        requests.forEach(req => {
            const date = req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' }) : '-';
            
            let roleClass = "bg-gray-100 text-gray-800";
            if(req.role && req.role.includes("Koç")) roleClass = "bg-purple-100 text-purple-800";
            else if(req.role && req.role.includes("Kurum")) roleClass = "bg-blue-100 text-blue-800";
            else if(req.role && req.role.includes("Okul")) roleClass = "bg-orange-100 text-orange-800";
            else if(req.role && req.role.includes("Aile")) roleClass = "bg-green-100 text-green-800";

            const row = `
                <tr class="hover:bg-indigo-50 transition-colors border-b last:border-b-0">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div class="flex items-center gap-2">
                            <i class="fa-regular fa-clock text-gray-400"></i> ${date}
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-bold text-gray-900">${req.name || 'İsimsiz'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900 flex items-center gap-2"><i class="fa-solid fa-envelope text-gray-400"></i> ${req.email || '-'}</div>
                        <div class="text-sm text-gray-500 mt-1 flex items-center gap-2"><i class="fa-solid fa-phone text-gray-400"></i> ${req.phone || '-'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${roleClass}">
                            ${req.role || 'Belirtilmemiş'}
                        </span>
                    </td>
                </tr>
            `;
            demoTableBody.innerHTML += row;
        });

        if(requestCountBadge) {
            requestCountBadge.textContent = `${requests.length} (Son 50)`;
            requestCountBadge.className = "bg-indigo-600 text-white py-1 px-3 rounded-full text-xs font-semibold shadow-sm";
        }

    }, (error) => {
        console.error("Demo talepleri hatası: ", error);
        demoTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Hata: ${error.message} (Konsolu kontrol edin)</td></tr>`;
    });
}

// --- 3. KOÇLARI YÜKLEME ---
async function loadCoaches() {
    const tableBody = document.getElementById('coachTableBody');
    if(!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500"><i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';

    try {
        // Tüm ayarları değil, sadece koç profillerini çek
        const profilesQuery = query(collectionGroup(db, 'settings'), where('rol', '==', 'koc'), limit(20));
        const querySnapshot = await getDocs(profilesQuery);
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Kayıtlı koç bulunamadı.</td></tr>';
            return;
        }

        const rowPromises = querySnapshot.docs.map(async (profileDoc) => {
            // Sadece 'profile' ID'li dökümanları işle (settings koleksiyonu altında başka dökümanlar varsa ele)
            if (profileDoc.id !== 'profile') return null;

            const data = profileDoc.data();
            // Parent'ın Parent'ı User ID'sidir: users/{uid}/settings/profile
            const coachUid = profileDoc.ref.parent.parent.id; 
            
            let studentCount = 0;
            try {
                // Alt koleksiyon sayımı (Count sorgusu hafiftir)
                const studentsColl = collection(db, "artifacts", appId, "users", coachUid, "ogrencilerim");
                const snapshot = await getCountFromServer(studentsColl);
                studentCount = snapshot.data().count;
            } catch (err) { console.warn("Öğrenci sayısı alınamadı:", err); }

            const formatDate = (timestamp) => {
                if (!timestamp) return "-";
                // Timestamp objesi kontrolü
                const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                return date.toLocaleDateString('tr-TR');
            };

            const regDate = formatDate(data.kayitTarihi);
            const loginDate = formatDate(data.sonGirisTarihi);
            
            const startDateVal = data.uyelikBaslangic || "";
            const endDateVal = data.uyelikBitis || "";
            const maxStudentVal = data.maxOgrenci || 1;
            const paketAdiVal = data.paketAdi || "Deneme";

            return `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                ${data.email ? data.email[0].toUpperCase() : '?'}
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${data.displayName || 'İsimsiz'}</div>
                                <div class="text-sm text-gray-500">${data.email}</div>
                                <div class="text-[10px] text-gray-400 font-mono cursor-pointer select-all" title="Kopyalamak için çift tıkla">${coachUid}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex flex-col gap-2">
                            <input type="text" id="paket-${coachUid}" value="${paketAdiVal}" class="text-xs border rounded p-1.5 w-24 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Paket">
                            <div class="flex items-center gap-1">
                                <span class="text-xs text-gray-500">Limit:</span>
                                <input type="number" id="max-${coachUid}" value="${maxStudentVal}" class="text-xs border rounded p-1.5 w-16 text-center focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-1"><span class="text-xs text-gray-400 w-6">Baş:</span><input type="date" id="start-${coachUid}" value="${startDateVal}" class="text-xs border rounded p-1 w-28 text-gray-600"></div>
                            <div class="flex items-center gap-1"><span class="text-xs text-gray-400 w-6">Bit:</span><input type="date" id="end-${coachUid}" value="${endDateVal}" class="text-xs border rounded p-1 w-28 text-gray-600"></div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-bold text-gray-900">${studentCount} / ${maxStudentVal}</div>
                        <div class="text-[10px] text-gray-400 mt-1">Kayıt: ${regDate}</div>
                        <div class="text-[10px] text-gray-400">Son Giriş: ${loginDate}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="saveCoach('${coachUid}')" class="text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95">
                            <i class="fa-solid fa-floppy-disk mr-1"></i> Kaydet
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

// --- 4. KAYDETME İŞLEMİ (GLOBAL) ---
window.saveCoach = async (uid) => {
    const start = document.getElementById(`start-${uid}`).value;
    const end = document.getElementById(`end-${uid}`).value;
    const max = parseInt(document.getElementById(`max-${uid}`).value);
    const paket = document.getElementById(`paket-${uid}`).value;

    if (max < 0) { alert("Limit 0'dan küçük olamaz."); return; }

    try {
        const ref = doc(db, "artifacts", appId, "users", uid, "settings", "profile");
        await updateDoc(ref, { 
            uyelikBaslangic: start, 
            uyelikBitis: end, 
            maxOgrenci: max, 
            paketAdi: paket 
        });
        alert("Bilgiler başarıyla güncellendi!");
        // Tabloyu tamamen yenilemek yerine sadece ilgili satırı güncellemek daha iyi olabilir ama
        // şimdilik basitlik adına yeniden yüklüyoruz.
        loadCoaches(); 
    } catch (error) {
        console.error("Güncelleme hatası:", error);
        alert("Hata: " + error.message);
    }
};