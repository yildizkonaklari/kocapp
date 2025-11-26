import { 
    collection, collectionGroup, query, onSnapshot, updateDoc, deleteDoc, 
    where, orderBy, getDocs, doc, addDoc, serverTimestamp, writeBatch 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { activeListeners, formatDateTR, populateStudentSelect } from './helpers.js';

let allOdevs = [];
let studentMap = {};

export async function renderOdevlerSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Ödev Takibi";
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div class="w-full md:w-1/3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Öğrenci Filtrele</label>
                <select id="filterOdevStudent" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500">
                    <option value="all">Tüm Öğrenciler</option>
                </select>
            </div>
            <button id="btnAddNewOdev" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-sm flex items-center">
                <i class="fa-solid fa-plus mr-2"></i> Yeni Ödev Ata
            </button>
        </div>
        <div id="odevListContainer" class="space-y-2">
            <p class="text-center text-gray-400 p-8">Ödevler yükleniyor...</p>
        </div>
    `;

    // Modal İçeriğini Güncelle (Sadece Günlük ve Haftalık)
    updateModalContent();

    await loadStudentMap(db, currentUserId, appId);
    startOdevListener(db, currentUserId, appId);

    document.getElementById('filterOdevStudent').addEventListener('change', () => renderOdevs(db));
    
    document.getElementById('btnAddNewOdev').addEventListener('click', async () => {
        const sid = document.getElementById('filterOdevStudent').value;
        
        // Formu Temizle
        document.getElementById('odevTitle').value = '';
        document.getElementById('odevAciklama').value = '';
        document.getElementById('odevLink').value = '';
        document.getElementById('odevBaslangicTarihi').value = new Date().toISOString().split('T')[0];
        document.getElementById('odevBitisTarihi').value = new Date().toISOString().split('T')[0];
        
        if (sid === 'all') {
            document.getElementById('odevStudentSelectContainer').classList.remove('hidden');
            await populateStudentSelect(db, currentUserId, appId, 'odevStudentSelect');
        } else {
            document.getElementById('odevStudentSelectContainer').classList.add('hidden');
            document.getElementById('currentStudentIdForOdev').value = sid;
        }
        document.getElementById('addOdevModal').style.display = 'block';
    });
}

// Modal HTML yapısını JS ile güncelle (Serbest seçeneğini kaldır)
function updateModalContent() {
    const modalBody = document.querySelector('#addOdevModal .mt-4');
    if (!modalBody) return;

    // Mevcut radyo butonları alanını bul ve değiştir
    const radioContainer = modalBody.querySelector('div:nth-child(3)'); // Tahmini sıra
    if (radioContainer && radioContainer.innerHTML.includes('radio')) {
        radioContainer.innerHTML = `
            <label class="block text-sm font-medium mb-1">Ödev Türü</label>
            <div class="grid grid-cols-2 gap-2">
                <label class="border p-2 rounded flex items-center justify-center cursor-pointer hover:bg-gray-50 has-[:checked]">
                    <input type="radio" name="odevTuru" value="gunluk" checked class="mr-2 text-purple-600 focus:ring-purple-500">
                    <span class="font-medium">Günlük (Tekrar)</span>
                </label>
                <label class="border p-2 rounded flex items-center justify-center cursor-pointer hover:bg-gray-50 has-[:checked]">
                    <input type="radio" name="odevTuru" value="haftalik" class="mr-2 text-purple-600 focus:ring-purple-500">
                    <span class="font-medium">Haftalık</span>
                </label>
            </div>
            <p class="text-xs text-gray-500 mt-1 ml-1" id="odevTuruInfo">Seçilen tarih aralığındaki her gün için ayrı ödev oluşturur.</p>
        `;

        // Bilgilendirme yazısını değiştirme
        const radios = radioContainer.querySelectorAll('input[name="odevTuru"]');
        radios.forEach(r => {
            r.addEventListener('change', (e) => {
                const info = document.getElementById('odevTuruInfo');
                if(e.target.value === 'gunluk') info.textContent = "Seçilen tarih aralığındaki her gün için ayrı ödev oluşturur.";
                else info.textContent = "Seçilen tarih aralığını haftalık periyotlara böler.";
            });
        });
    }
}

async function loadStudentMap(db, uid, appId) {
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim"), orderBy("ad"));
    const snap = await getDocs(q);
    const select = document.getElementById('filterOdevStudent');
    select.innerHTML = '<option value="all">Tüm Öğrenciler</option>';
    studentMap = {};
    snap.forEach(doc => {
        const name = `${doc.data().ad} ${doc.data().soyad}`;
        studentMap[doc.id] = name;
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

function startOdevListener(db, uid, appId) {
    const container = document.getElementById('odevListContainer');

    const q = query(
        collectionGroup(db, 'odevler'), 
        where('kocId', '==', uid), 
        orderBy('bitisTarihi', 'desc') // En yakın tarih üstte olsun diye desc daha mantıklı olabilir, veya asc
    );
    
    if (activeListeners.odevlerUnsubscribe) activeListeners.odevlerUnsubscribe();
    
    activeListeners.odevlerUnsubscribe = onSnapshot(q, (snap) => {
        allOdevs = [];
        snap.forEach(doc => {
            const sid = doc.ref.parent.parent.id;
            allOdevs.push({ id: doc.id, ...doc.data(), studentId: sid, path: doc.ref.path });
        });
        renderOdevs(db);
    }, (error) => {
        console.error("Ödevler yüklenirken hata:", error);
        container.innerHTML = `<p class="text-center text-red-500 p-8">Hata: ${error.message}</p>`;
    });
}

function renderOdevs(db) {
    const container = document.getElementById('odevListContainer');
    const filter = document.getElementById('filterOdevStudent').value;
    
    let filtered = filter === 'all' ? allOdevs : allOdevs.filter(o => o.studentId === filter);
    
    // Tarihe göre sırala (Yeniden Eskiye veya Eskiden Yeniye)
    filtered.sort((a, b) => b.bitisTarihi.localeCompare(a.bitisTarihi));

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 p-8">Kayıtlı ödev bulunamadı.</p>';
        return;
    }

    container.innerHTML = filtered.map(o => {
        const isDone = o.durum === 'tamamlandi';
        const sName = studentMap[o.studentId] || 'Öğrenci';
        const today = new Date().toISOString().split('T')[0];
        const isLate = !isDone && o.bitisTarihi < today;
        
        // Tür rozeti rengi
        const typeBadge = o.turu === 'gunluk' 
            ? '<span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-2">Günlük</span>'
            : '<span class="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-2">Haftalık</span>';

        return `
        <div class="flex items-center justify-between bg-white p-4 rounded-xl border ${isLate ? 'border-red-200 bg-red-50' : 'border-gray-200'} shadow-sm transition-shadow hover:shadow-md">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">${sName}</span>
                    <span class="text-xs text-gray-500 flex items-center"><i class="fa-regular fa-calendar mr-1"></i>${formatDateTR(o.bitisTarihi)}</span>
                    ${typeBadge}
                    ${isLate ? '<span class="text-xs text-red-600 font-bold bg-red-100 px-1 rounded">Gecikti</span>' : ''}
                </div>
                <h4 class="font-medium text-gray-800 ${isDone ? 'line-through text-gray-400' : ''}">${o.title}</h4>
                <p class="text-xs text-gray-500 mt-1">${o.aciklama || ''}</p>
            </div>
            <div class="flex items-center gap-3 ml-4">
                <button class="w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'}" 
                        onclick="toggleGlobalGoalStatus('${o.path}', '${o.durum}')" title="${isDone ? 'Geri Al' : 'Tamamla'}">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="text-gray-400 hover:text-red-500 transition-colors" onclick="deleteGlobalDoc('${o.path}')" title="Sil">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// --- YENİ KAYDETME FONKSİYONU ---
export async function saveGlobalOdev(db, uid, appId) {
    let sid = document.getElementById('currentStudentIdForOdev').value;
    if (!document.getElementById('odevStudentSelectContainer').classList.contains('hidden')) {
        sid = document.getElementById('odevStudentSelect').value;
    }
    if (!sid) { alert('Öğrenci seçin'); return; }

    const title = document.getElementById('odevTitle').value.trim();
    const aciklama = document.getElementById('odevAciklama').value.trim();
    const link = document.getElementById('odevLink').value.trim();
    const startStr = document.getElementById('odevBaslangicTarihi').value;
    const endStr = document.getElementById('odevBitisTarihi').value;
    
    // Radyo butonundan değeri al
    const turRadio = document.querySelector('input[name="odevTuru"]:checked');
    const turu = turRadio ? turRadio.value : 'gunluk';

    if(!title || !startStr || !endStr) { alert('Lütfen başlık ve tarihleri girin.'); return; }

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    
    if (endDate < startDate) { alert('Bitiş tarihi başlangıçtan önce olamaz.'); return; }

    const collectionRef = collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler");
    const batch = writeBatch(db);
    
    let count = 0;

    if (turu === 'gunluk') {
        // GÜNLÜK: Her gün için bir kayıt
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, {
                title, aciklama, link,
                baslangicTarihi: dateStr,
                bitisTarihi: dateStr, // Günlük ödev o gün biter
                turu: 'gunluk',
                durum: 'devam',
                kocId: uid,
                eklenmeTarihi: serverTimestamp()
            });
            count++;
        }
    } else {
        // HAFTALIK: 7 günlük periyotlar
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
            const weekStart = new Date(d);
            const weekEnd = new Date(d);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            // Eğer hafta bitişi, seçilen bitiş tarihini geçerse kırp
            const actualEnd = weekEnd > endDate ? endDate : weekEnd;
            
            const sStr = weekStart.toISOString().split('T')[0];
            const eStr = actualEnd.toISOString().split('T')[0];

            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, {
                title, aciklama, link,
                baslangicTarihi: sStr,
                bitisTarihi: eStr,
                turu: 'haftalik',
                durum: 'devam',
                kocId: uid,
                eklenmeTarihi: serverTimestamp()
            });
            count++;
        }
    }

    // Batch limiti (500) kontrolü basitçe yapılabilir ama bu senaryoda nadiren aşılır.
    if (count > 400) { alert("Çok fazla tarih aralığı seçtiniz. Lütfen aralığı daraltın."); return; }

    await batch.commit();
    document.getElementById('addOdevModal').style.display = 'none';
    // alert(`${count} adet ödev oluşturuldu.`); // İsteğe bağlı bildirim
}
