import { 
    collection, collectionGroup, query, onSnapshot, updateDoc, deleteDoc, 
    where, orderBy, getDocs, doc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { activeListeners, formatDateTR, populateStudentSelect } from './helpers.js';

let allGoals = [];
let studentMap = {};

export async function renderHedeflerSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Hedef Yönetimi";
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div class="w-full md:w-1/3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Öğrenci Filtrele</label>
                <select id="filterGoalStudent" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500">
                    <option value="all">Tüm Öğrenciler</option>
                </select>
            </div>
            <button id="btnAddNewGoal" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-sm flex items-center">
                <i class="fa-solid fa-plus mr-2"></i> Yeni Hedef Ata
            </button>
        </div>
        <div id="goalsListContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <p class="col-span-full text-center text-gray-400 p-8">Hedefler yükleniyor...</p>
        </div>
    `;

    await loadStudentMap(db, currentUserId, appId);
    startGoalListener(db, currentUserId, appId);

    document.getElementById('filterGoalStudent').addEventListener('change', () => renderGoals(db));
    
    // Ekle Butonu
    document.getElementById('btnAddNewGoal').addEventListener('click', async () => {
        const sid = document.getElementById('filterGoalStudent').value;
        const modal = document.getElementById('addHedefModal');
        
        document.getElementById('hedefTitle').value = '';
        document.getElementById('hedefAciklama').value = '';
        document.getElementById('hedefBitisTarihi').value = '';

        if (sid === 'all') {
            document.getElementById('hedefStudentSelectContainer').classList.remove('hidden');
            await populateStudentSelect(db, currentUserId, appId, 'hedefStudentSelect');
        } else {
            document.getElementById('hedefStudentSelectContainer').classList.add('hidden');
            document.getElementById('currentStudentIdForHedef').value = sid;
        }
        modal.style.display = 'block';
    });
}

async function loadStudentMap(db, uid, appId) {
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim"), orderBy("ad"));
    const snap = await getDocs(q);
    const select = document.getElementById('filterGoalStudent');
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

function startGoalListener(db, uid, appId) {
    // İndeks gerektirebilir: collectionGroup 'hedefler' orderBy 'olusturmaTarihi'
    const q = query(collectionGroup(db, 'hedefler'), where('kocId', '==', uid), orderBy('olusturmaTarihi', 'desc'));
    
    if (activeListeners.hedeflerUnsubscribe) activeListeners.hedeflerUnsubscribe();
    
    activeListeners.hedeflerUnsubscribe = onSnapshot(q, (snap) => {
        allGoals = [];
        snap.forEach(doc => {
            // Parent ID'den öğrenciyi bul
            const sid = doc.ref.parent.parent.id; 
            allGoals.push({ id: doc.id, ...doc.data(), studentId: sid, path: doc.ref.path });
        });
        renderGoals(db);
    });
}

function renderGoals(db) {
    const container = document.getElementById('goalsListContainer');
    const filter = document.getElementById('filterGoalStudent').value;
    
    const filtered = filter === 'all' ? allGoals : allGoals.filter(g => g.studentId === filter);
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-400 p-8">Hedef bulunamadı.</p>';
        return;
    }

    container.innerHTML = filtered.map(g => {
        const isDone = g.durum === 'tamamlandi';
        const sName = studentMap[g.studentId] || 'Öğrenci';
        return `
        <div class="bg-white p-4 rounded-xl border ${isDone ? 'border-green-200 bg-green-50' : 'border-gray-200'} shadow-sm relative group">
            <div class="flex justify-between items-start mb-2">
                <span class="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">${sName}</span>
                <span class="text-xs text-gray-500">${formatDateTR(g.bitisTarihi)}</span>
            </div>
            <h4 class="font-bold text-gray-800 ${isDone ? 'line-through text-gray-500' : ''}">${g.title}</h4>
            <p class="text-sm text-gray-600 mt-1">${g.aciklama || ''}</p>
            <div class="mt-4 flex justify-end gap-2">
                <button class="text-xs px-3 py-1 rounded border ${isDone ? 'border-gray-400 text-gray-600' : 'border-green-500 text-green-600 hover:bg-green-50'}" 
                        onclick="toggleGlobalGoalStatus('${g.path}', '${g.durum}')">
                    ${isDone ? 'Geri Al' : 'Tamamla'}
                </button>
                <button class="text-xs px-3 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50" 
                        onclick="deleteGlobalDoc('${g.path}')">Sil</button>
            </div>
        </div>
        `;
    }).join('');
    
    // Window fonksiyonlarını ata (app.js'de tanımlı olmayanlar için helper)
    window.toggleGlobalGoalStatus = async (path, current) => {
        await updateDoc(doc(db, path), { durum: current === 'tamamlandi' ? 'devam' : 'tamamlandi' });
    };
    window.deleteGlobalDoc = async (path) => {
        if(confirm('Silinsin mi?')) await deleteDoc(doc(db, path));
    };
}

// Kaydetme Fonksiyonu
export async function saveGlobalHedef(db, uid, appId) {
    let sid = document.getElementById('currentStudentIdForHedef').value;
    if (!document.getElementById('hedefStudentSelectContainer').classList.contains('hidden')) {
        sid = document.getElementById('hedefStudentSelect').value;
    }
    if (!sid) { alert('Öğrenci seçin'); return; }

    await addDoc(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "hedefler"), {
        title: document.getElementById('hedefTitle').value,
        aciklama: document.getElementById('hedefAciklama').value,
        bitisTarihi: document.getElementById('hedefBitisTarihi').value,
        durum: 'devam',
        kocId: uid,
        olusturmaTarihi: serverTimestamp()
    });
    document.getElementById('addHedefModal').style.display = 'none';
}
