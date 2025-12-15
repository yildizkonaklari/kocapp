import { 
    collection, query, onSnapshot, updateDoc, deleteDoc, 
    where, orderBy, getDocs, doc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR, openModalWithBackHistory } from './helpers.js';

let currentDb = null; 

// Fonksiyonun dışa aktarıldığından (export) eminiz
export async function renderHedeflerSayfasi(db, currentUserId, appId) {
    currentDb = db;
    document.getElementById("mainContentTitle").textContent = "Hedef Yönetimi";
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-20">
            
            <div class="w-full md:w-1/3 relative">
                <label class="block text-xs font-bold text-gray-500 mb-1 ml-1">Öğrenci Seçin</label>
                
                <button id="customSelectTrigger" class="w-full flex justify-between items-center bg-white border border-gray-300 text-gray-700 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm">
                    <span id="selectedStudentText">Bir öğrenci seçin...</span>
                    <i class="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                </button>

                <input type="hidden" id="filterGoalStudentId">

                <div id="customSelectDropdown" class="hidden absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
                    <div class="p-2 border-b border-gray-100 bg-gray-50">
                        <div class="relative">
                            <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                            <input type="text" id="customSelectSearch" placeholder="Öğrenci ara..." class="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500">
                        </div>
                    </div>
                    <div id="customSelectList" class="max-h-60 overflow-y-auto custom-scrollbar">
                        <div class="p-3 text-center text-gray-400 text-xs">Yükleniyor...</div>
                    </div>
                </div>
            </div>

            <button id="btnAddNewGoal" class="hidden w-full md:w-auto bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center justify-center transition-transform active:scale-95 text-sm font-medium">
                <i class="fa-solid fa-plus mr-2"></i> Yeni Hedef Ata
            </button>
        </div>

        <div id="goalsListContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 pb-20">
            <div id="goalEmptyState" class="col-span-full text-center text-gray-400 py-12">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i class="fa-solid fa-bullseye text-3xl opacity-30"></i>
                </div>
                <p>Hedefleri görmek için listeden bir öğrenci seçin.</p>
            </div>
        </div>
    `;

    await setupSearchableDropdown(db, currentUserId, appId);

    const btnAdd = document.getElementById('btnAddNewGoal');
    if(btnAdd) {
        // Event listener temizliği (cloneNode ile)
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.addEventListener('click', openAddModal);
    }
}

// --- ARAMALI DROPDOWN MANTIĞI ---
async function setupSearchableDropdown(db, uid, appId) {
    const triggerBtn = document.getElementById('customSelectTrigger');
    const dropdown = document.getElementById('customSelectDropdown');
    const searchInput = document.getElementById('customSelectSearch');
    const listContainer = document.getElementById('customSelectList');
    const hiddenInput = document.getElementById('filterGoalStudentId');
    const labelSpan = document.getElementById('selectedStudentText');

    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim"), orderBy("ad"));
    const snapshot = await getDocs(q);
    const students = [];
    snapshot.forEach(doc => students.push({ id: doc.id, name: `${doc.data().ad} ${doc.data().soyad}` }));

    const renderList = (filter = "") => {
        listContainer.innerHTML = "";
        const filtered = students.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));

        if (filtered.length === 0) {
            listContainer.innerHTML = `<div class="p-3 text-center text-gray-400 text-xs">Sonuç bulunamadı.</div>`;
            return;
        }

        filtered.forEach(s => {
            const item = document.createElement('div');
            item.className = "px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer border-b border-gray-50 last:border-0 transition-colors";
            item.textContent = s.name;
            item.onclick = () => {
                hiddenInput.value = s.id;
                labelSpan.textContent = s.name;
                labelSpan.classList.add('font-bold', 'text-purple-700');
                dropdown.classList.add('hidden'); 
                
                document.getElementById('btnAddNewGoal').classList.remove('hidden');
                startGoalListener(db, uid, appId, s.id);
            };
            listContainer.appendChild(item);
        });
    };

    renderList(); 

    triggerBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if(!dropdown.classList.contains('hidden')) {
            searchInput.focus(); 
        }
    };

    searchInput.oninput = (e) => {
        renderList(e.target.value);
    };

    document.addEventListener('click', (e) => {
        if (!triggerBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

function startGoalListener(db, uid, appId, studentId) {
    const container = document.getElementById('goalsListContainer');
    container.innerHTML = '<p class="col-span-full text-center text-gray-400 p-8">Yükleniyor...</p>';

    const q = query(
        collection(db, "artifacts", appId, "users", uid, "ogrencilerim", studentId, "hedefler"),
        orderBy('bitisTarihi', 'asc')
    );
    
    if (activeListeners.hedeflerUnsubscribe) activeListeners.hedeflerUnsubscribe();
    
    activeListeners.hedeflerUnsubscribe = onSnapshot(q, (snap) => {
        const goals = [];
        snap.forEach(doc => {
            goals.push({ id: doc.id, ...doc.data(), path: doc.ref.path });
        });
        renderGoals(goals); 
    }, (error) => {
        console.error("Hedefler yüklenirken hata:", error);
        container.innerHTML = `<p class="col-span-full text-center text-red-500 p-8">Veriler yüklenemedi.</p>`;
    });
}

function renderGoals(goals) {
    const container = document.getElementById('goalsListContainer');
    
    if (goals.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-400 py-12 flex flex-col items-center">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <i class="fa-solid fa-clipboard-list text-3xl opacity-30"></i>
                </div>
                <p>Bu öğrenciye atanmış hedef bulunmuyor.</p>
            </div>`;
        return;
    }

    goals.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(a.bitisTarihi) - new Date(b.bitisTarihi);
    });

    container.innerHTML = goals.map(g => {
        const isDone = g.durum === 'tamamlandi';
        const isPinned = g.isPinned === true;
        
        let cardClass = isDone ? 'border-green-100 bg-green-50 opacity-80' : 'border-gray-200 bg-white';
        if (isPinned && !isDone) cardClass = 'border-yellow-300 bg-yellow-50 shadow-md ring-1 ring-yellow-200'; 

        return `
        <div class="p-4 rounded-xl border shadow-sm relative group transition-all hover:shadow-md ${cardClass}">
            ${isPinned ? '<div class="absolute -top-2 -right-2 bg-yellow-400 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm text-xs z-10"><i class="fa-solid fa-thumbtack"></i></div>' : ''}
            <div class="flex justify-between items-start mb-2">
                <span class="text-xs text-gray-500 flex items-center gap-1 bg-white/50 px-2 py-1 rounded font-mono border border-gray-100">
                    <i class="fa-regular fa-calendar"></i> ${formatDateTR(g.bitisTarihi)}
                </span>
                ${isDone ? '<span class="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">Tamamlandı</span>' : ''}
            </div>
            <h4 class="font-bold text-gray-800 ${isDone ? 'line-through text-gray-500' : ''} mb-1 line-clamp-2">${g.title}</h4>
            <p class="text-sm text-gray-600 line-clamp-3 mb-4 min-h-[3rem]">${g.aciklama || ''}</p>
            <div class="flex justify-between items-center pt-3 border-t border-gray-100/50">
                <button class="text-gray-400 hover:text-yellow-500 transition-colors p-1" 
                        onclick="toggleGoalPin('${g.path}', ${isPinned})" 
                        title="${isPinned ? 'Başa tutturmayı kaldır' : 'Başa tuttur'}">
                    <i class="fa-solid fa-thumbtack ${isPinned ? 'text-yellow-500' : ''}"></i>
                </button>
                <div class="flex gap-2">
                    <button class="text-xs px-3 py-1.5 rounded border font-medium transition-colors ${isDone ? 'border-gray-300 text-gray-500 hover:bg-gray-100' : 'border-green-500 text-green-600 hover:bg-green-50 bg-white'}" 
                            onclick="toggleGlobalGoalStatus('${g.path}', '${g.durum}')">
                        ${isDone ? 'Geri Al' : '<i class="fa-solid fa-check mr-1"></i> Tamamla'}
                    </button>
                    <button class="text-xs px-3 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 bg-white transition-colors" 
                            onclick="deleteGlobalDoc('${g.path}')">Sil</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- MODAL AÇMA ---
function openAddModal() {
    const sid = document.getElementById('filterGoalStudentId').value;
    if (!sid) { alert("Lütfen önce öğrenci seçin."); return; }

    const modal = document.getElementById('addHedefModal');
    if (!modal) { console.error("Modal bulunamadı!"); return; }

    // Formu Temizle
    document.getElementById('hedefTitle').value = '';
    document.getElementById('hedefAciklama').value = '';
    document.getElementById('hedefBitisTarihi').value = '';
    document.getElementById('currentStudentIdForHedef').value = sid;
    
    openModalWithBackHistory('addHedefModal');

    // Kapatma butonu listener'ı (Manuel ekleme)
    const closeBtn = document.getElementById('closeHedefModalButton');
    const cancelBtn = document.getElementById('cancelHedefModalButton');
    const handleClose = (e) => { e.preventDefault(); window.history.back(); };

    if(closeBtn) closeBtn.onclick = handleClose;
    if(cancelBtn) cancelBtn.onclick = handleClose;
}

// --- GLOBAL FONKSİYONLAR ---
window.toggleGlobalGoalStatus = async (path, current) => {
    if (!currentDb) return;
    await updateDoc(doc(currentDb, path), { durum: current === 'tamamlandi' ? 'devam' : 'tamamlandi' });
};

window.deleteGlobalDoc = async (path) => {
    if (!currentDb) return;
    if(confirm('Bu hedefi silmek istediğinize emin misiniz?')) await deleteDoc(doc(currentDb, path));
};

window.toggleGoalPin = async (path, currentStatus) => {
    if (!currentDb) return;
    await updateDoc(doc(currentDb, path), { isPinned: !currentStatus });
};

// --- KAYDETME FONKSİYONU ---
export async function saveGlobalHedef(db, uid, appId) {
    let sid = document.getElementById('currentStudentIdForHedef').value;
    if (!sid) sid = document.getElementById('filterGoalStudentId').value;
    
    if (!sid) { alert('Öğrenci seçimi hatası.'); return; }

    const title = document.getElementById('hedefTitle').value.trim();
    const date = document.getElementById('hedefBitisTarihi').value;
    
    if(!title || !date) { alert("Başlık ve Bitiş Tarihi zorunludur."); return; }

    const btn = document.getElementById('saveHedefButton');
    btn.disabled = true;
    btn.textContent = "Kaydediliyor...";

    try {
        await addDoc(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "hedefler"), {
            title: title,
            aciklama: document.getElementById('hedefAciklama').value,
            bitisTarihi: date,
            durum: 'devam',
            isPinned: false,
            kocId: uid,
            olusturmaTarihi: serverTimestamp()
        });
        window.history.back();
    } catch (e) {
        console.error(e);
        alert("Hata oluştu.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Kaydet";
    }
}