import { 
    collection, collectionGroup, query, onSnapshot, updateDoc, deleteDoc, 
    where, orderBy, getDocs, doc, addDoc, serverTimestamp 
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

    await loadStudentMap(db, currentUserId, appId);
    startOdevListener(db, currentUserId, appId);

    document.getElementById('filterOdevStudent').addEventListener('change', () => renderOdevs(db));
    
    document.getElementById('btnAddNewOdev').addEventListener('click', async () => {
        const sid = document.getElementById('filterOdevStudent').value;
        document.getElementById('odevTitle').value = '';
        
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

    // İndeks Gerektiren Sorgu: odevler (Collection Group) -> kocId ASC, bitisTarihi ASC
    const q = query(
        collectionGroup(db, 'odevler'), 
        where('kocId', '==', uid), 
        orderBy('bitisTarihi', 'asc')
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
        if (error.code === 'failed-precondition') {
             container.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-center">
                    <p class="font-bold">Veritabanı İndeksi Eksik</p>
                    <p class="text-sm">Ödevleri listelemek için bir indeks gerekiyor. Lütfen aşağıdaki linke tıklayın:</p>
                    <a href="${error.message.match(/https:\/\/[^\s]+/)?.[0]}" target="_blank" class="text-blue-600 underline text-xs break-all mt-2 block">İndeks Oluşturmak İçin Tıklayın</a>
                </div>`;
        } else {
            container.innerHTML = `<p class="text-center text-red-500 p-8">Hata: ${error.message}</p>`;
        }
    });
}

function renderOdevs(db) {
    const container = document.getElementById('odevListContainer');
    const filter = document.getElementById('filterOdevStudent').value;
    
    const filtered = filter === 'all' ? allOdevs : allOdevs.filter(o => o.studentId === filter);
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 p-8">Kayıtlı ödev bulunamadı.</p>';
        return;
    }

    container.innerHTML = filtered.map(o => {
        const isDone = o.durum === 'tamamlandi';
        const sName = studentMap[o.studentId] || 'Öğrenci';
        const today = new Date().toISOString().split('T')[0];
        const isLate = !isDone && o.bitisTarihi < today;
        
        return `
        <div class="flex items-center justify-between bg-white p-4 rounded-xl border ${isLate ? 'border-red-200 bg-red-50' : 'border-gray-200'} shadow-sm transition-shadow hover:shadow-md">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">${sName}</span>
                    <span class="text-xs text-gray-500"><i class="fa-regular fa-calendar mr-1"></i>${formatDateTR(o.bitisTarihi)}</span>
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

export async function saveGlobalOdev(db, uid, appId) {
    let sid = document.getElementById('currentStudentIdForOdev').value;
    if (!document.getElementById('odevStudentSelectContainer').classList.contains('hidden')) {
        sid = document.getElementById('odevStudentSelect').value;
    }
    if (!sid) { alert('Öğrenci seçin'); return; }

    const data = {
        title: document.getElementById('odevTitle').value,
        aciklama: document.getElementById('odevAciklama').value,
        baslangicTarihi: document.getElementById('odevBaslangicTarihi').value,
        bitisTarihi: document.getElementById('odevBitisTarihi').value,
        link: document.getElementById('odevLink').value,
        turu: document.querySelector('input[name="odevTuru"]:checked').value,
        durum: 'devam',
        kocId: uid,
        eklenmeTarihi: serverTimestamp()
    };

    await addDoc(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), data);
    document.getElementById('addOdevModal').style.display = 'none';
}
