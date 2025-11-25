// === GLOBAL SORU TAKİBİ MODÜLÜ ===

import { 
    doc, 
    collection, 
    collectionGroup, 
    query, 
    onSnapshot, 
    updateDoc, 
    deleteDoc,
    where, 
    orderBy,
    writeBatch,
    getDocs,
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR, populateStudentSelect } from './helpers.js';

// Modül Seviyesi Değişkenler
let allSoruData = [];
let studentMap = {}; 
let pendingDocsPaths = [];

export async function renderSoruTakibiSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Genel Soru Takibi";
    
    mainContentArea.innerHTML = `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="w-full md:w-1/3">
                <label for="filterStudentSelect" class="block text-sm font-medium text-gray-700 mb-1">Öğrenci Filtrele</label>
                <select id="filterStudentSelect" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-white">
                    <option value="all">Tüm Öğrenciler</option>
                    <option disabled>Yükleniyor...</option>
                </select>
            </div>
            <div class="flex gap-2">
                 <button id="btnApproveAll" class="hidden bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm transition-colors flex items-center">
                    <i class="fa-solid fa-check-double mr-2"></i> Onayla
                </button>
                <button id="btnAddNewSoru" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center">
                    <i class="fa-solid fa-plus mr-2"></i> Soru Girişi
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Bu Hafta Çözülen</p>
                <h3 id="kpiThisWeek" class="text-3xl font-bold text-purple-600">...</h3>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Geçen Haftaya Göre</p>
                <div class="flex items-center mt-1">
                    <h3 id="kpiComparison" class="text-2xl font-bold text-gray-800 mr-2">...</h3>
                    <span id="kpiArrow" class="text-sm font-medium"></span>
                </div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Bekleyen Onaylar</p>
                <h3 id="kpiPendingApprovals" class="text-3xl font-bold text-yellow-600">...</h3>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
            <div class="px-6 py-4 border-b border-gray-100 bg-gray-50"><h3 class="font-semibold text-gray-800" id="listTitle">Tüm Girişler</h3></div>
            <div id="globalSoruListContainer">
                <p class="text-center text-gray-400 p-8">Veriler yükleniyor...</p>
            </div>
        </div>
    `;

    await loadStudentsAndMap(db, currentUserId, appId);
    startSoruListener(db, currentUserId, appId);
    
    // Event Listeners
    document.getElementById('filterStudentSelect').addEventListener('change', () => applyFilterAndRender(db));
    document.getElementById('btnApproveAll').addEventListener('click', () => approveFilteredPending(db));
    
    // YENİ: Soru Ekle Butonu
    document.getElementById('btnAddNewSoru').addEventListener('click', async () => {
        const selectedStudentId = document.getElementById('filterStudentSelect').value;
        const modal = document.getElementById('addSoruModal');
        const selectContainer = document.getElementById('soruStudentSelectContainer');
        
        // Formu Temizle
        document.getElementById('soruDers').value = '';
        document.getElementById('soruKonu').value = '';
        document.getElementById('soruAdet').value = '';
        // DÜZELTME 1: ID 'soruTarihi' değil 'soruTarih' olmalı
        document.getElementById('soruTarih').value = new Date().toISOString().split('T')[0];

        if (selectedStudentId === 'all') {
            selectContainer.classList.remove('hidden');
            await populateStudentSelect(db, currentUserId, appId, 'soruStudentSelect');
        } else {
            selectContainer.classList.add('hidden');
            document.getElementById('currentStudentIdForSoruTakibi').value = selectedStudentId;
        }
        
        modal.style.display = 'block';
    });
}

// --- KAYDETME FONKSİYONU (Globalden Çağrılacak) ---
export async function saveGlobalSoru(db, currentUserId, appId) {
    let studentId = document.getElementById('currentStudentIdForSoruTakibi').value;
    const selectContainer = document.getElementById('soruStudentSelectContainer');
    
    if (!selectContainer.classList.contains('hidden')) {
        studentId = document.getElementById('soruStudentSelect').value;
    }

    if (!studentId) { alert("Lütfen bir öğrenci seçin."); return; }

    const data = {
        // DÜZELTME 2: ID 'soruTarihi' değil 'soruTarih' olmalı
        tarih: document.getElementById('soruTarih').value,
        ders: document.getElementById('soruDers').value,
        konu: document.getElementById('soruKonu').value,
        adet: parseInt(document.getElementById('soruAdet').value) || 0,
        onayDurumu: 'onaylandi', // Koç girdiği için onaylı
        kocId: currentUserId,
        eklenmeTarihi: serverTimestamp()
    };

    await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "soruTakibi"), data);
    document.getElementById('addSoruModal').style.display = 'none';
}

async function loadStudentsAndMap(db, uid, appId) {
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim"), orderBy("ad"));
    const snap = await getDocs(q);
    const select = document.getElementById('filterStudentSelect');
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

function startSoruListener(db, uid, appId) {
    const q = query(
        collectionGroup(db, 'soruTakibi'),
        where('kocId', '==', uid),
        orderBy('onayDurumu', 'asc'),
        orderBy('eklenmeTarihi', 'desc')
    );
    
    if(activeListeners.soruTakibiUnsubscribe) activeListeners.soruTakibiUnsubscribe();
    
    activeListeners.soruTakibiUnsubscribe = onSnapshot(q, (snap) => {
        allSoruData = [];
        snap.forEach(doc => {
            const sid = doc.ref.parent.parent.id;
            allSoruData.push({
                id: doc.id, ...doc.data(),
                studentId: sid,
                studentName: studentMap[sid] || 'Bilinmiyor',
                path: doc.ref.path
            });
        });
        applyFilterAndRender(db);
    });
}

function applyFilterAndRender(db) {
    const filter = document.getElementById('filterStudentSelect').value;
    const listTitle = document.getElementById('listTitle');
    
    let filtered = [];
    pendingDocsPaths = [];

    if (filter === 'all') {
        filtered = allSoruData;
        listTitle.textContent = "Tüm Girişler";
    } else {
        filtered = allSoruData.filter(i => i.studentId === filter);
        listTitle.textContent = `${studentMap[filter] || 'Seçili'} - Girişler`;
    }

    filtered.forEach(i => { if(i.onayDurumu==='bekliyor') pendingDocsPaths.push(i.path); });
    
    const btn = document.getElementById('btnApproveAll');
    if(pendingDocsPaths.length > 0) {
        btn.classList.remove('hidden');
        btn.innerHTML = `<i class="fa-solid fa-check-double mr-2"></i> ${pendingDocsPaths.length} Onayla`;
    } else {
        btn.classList.add('hidden');
    }

    renderGlobalSoruList(filtered, db);
    calculateStats(filtered);
}

function renderGlobalSoruList(entries, db) {
    const container = document.getElementById('globalSoruListContainer');
    if(entries.length===0) { container.innerHTML='<p class="text-gray-400 text-center p-8">Kayıt yok.</p>'; return; }
    
    container.innerHTML = `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öğrenci</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ders</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konu</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adet</th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
        <th class="px-6 py-3"></th>
    </tr></thead><tbody class="bg-white divide-y divide-gray-200">${entries.map(e => {
        const isPending = e.onayDurumu === 'bekliyor';
        const adet = e.adet || (e.dogru+e.yanlis+e.bos) || 0;
        return `<tr class="${isPending?'bg-yellow-50':''}">
            <td class="px-6 py-4 text-sm text-gray-600">${formatDateTR(e.tarih)}</td>
            <td class="px-6 py-4 text-sm font-bold text-gray-800">${e.studentName}</td>
            <td class="px-6 py-4 text-sm font-medium">${e.ders}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${e.konu||'-'}</td>
            <td class="px-6 py-4 text-sm font-bold text-blue-600">${adet}</td>
            <td class="px-6 py-4 text-sm">${isPending?'<span class="text-yellow-700 bg-yellow-100 px-2 py-1 rounded text-xs">Bekliyor</span>':'<span class="text-green-700 bg-green-100 px-2 py-1 rounded text-xs">Onaylı</span>'}</td>
            <td class="px-6 py-4 text-right text-sm">
                ${isPending ? `<button class="text-green-600 font-bold mr-3 btn-approve" data-path="${e.path}">Onayla</button>`:''}
                <button class="text-red-400 hover:text-red-600 btn-delete" data-path="${e.path}"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('')}</tbody></table></div>`;

    container.querySelectorAll('.btn-approve').forEach(b => b.onclick = async () => await updateDoc(doc(db, b.dataset.path), {onayDurumu:'onaylandi'}));
    container.querySelectorAll('.btn-delete').forEach(b => b.onclick = async () => { if(confirm('Silinsin mi?')) await deleteDoc(doc(db, b.dataset.path)); });
}

function calculateStats(entries) {
    let total = 0, pending = 0;
    entries.forEach(e => {
        if(e.onayDurumu==='bekliyor') pending++;
        else if(e.onayDurumu==='onaylandi') total += (e.adet || 0);
    });
    document.getElementById('kpiThisWeek').textContent = total;
    document.getElementById('kpiPendingApprovals').textContent = pending;
    document.getElementById('kpiComparison').textContent = "-"; 
}

async function approveFilteredPending(db) {
    if(pendingDocsPaths.length===0) return;
    if(!confirm('Hepsini onayla?')) return;
    const batch = writeBatch(db);
    pendingDocsPaths.forEach(p => batch.update(doc(db, p), {onayDurumu:'onaylandi'}));
    await batch.commit();
}
