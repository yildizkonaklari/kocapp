import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc, 
    collection, query, orderBy, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { activeListeners, formatDateTR, formatCurrency, renderDersSecimi } from './helpers.js';

// --- ÖĞRENCİ DETAY SAYFASI ---
export function renderOgrenciDetaySayfasi(db, currentUserId, appId, studentId, studentName) {
    document.getElementById("mainContentTitle").textContent = `${studentName} - Detay`;
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <button onclick="document.getElementById('nav-ogrencilerim').click()" class="flex items-center text-sm text-gray-600 hover:text-purple-600 font-medium">
                <i class="fa-solid fa-arrow-left mr-1"></i> Listeye Dön
            </button>
        </div>
        
        <div class="bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row items-center mb-6 gap-4">
            <div class="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-2xl">
                ${studentName.split(' ').map(n=>n[0]).join('')}
            </div>
            <div class="flex-1 text-center md:text-left">
                <h2 class="text-3xl font-bold text-gray-800">${studentName}</h2>
                <p class="text-lg text-gray-500" id="studentDetailClass">...</p>
            </div>
            <div class="flex gap-2">
                <button id="btnEditStudent" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 border">Düzenle</button>
                <button id="btnMsgStudent" class="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm hover:bg-purple-200 border border-purple-200">Mesaj</button>
            </div>
        </div>

        <!-- SEKME MENÜSÜ (SADELEŞTİRİLDİ) -->
        <div class="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
            <button data-tab="ozet" class="tab-button active py-3 px-5 text-purple-600 border-b-2 border-purple-600 font-semibold">Özet</button>
            <button data-tab="notlar" class="tab-button py-3 px-5 text-gray-500 hover:text-purple-600">Koçluk Notları</button>
        </div>
        
        <div id="tabContentArea"></div>
    `;

    // Event Listeners
    document.getElementById('btnEditStudent').addEventListener('click', () => showEditStudentModal(db, currentUserId, appId, studentId));
    document.getElementById('btnMsgStudent').addEventListener('click', () => document.getElementById('nav-mesajlar').click()); // Mesajlara yönlendir

    // Tab Geçişleri
    const tabBtns = document.querySelectorAll('.tab-button');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Temizlik
            if (activeListeners.notlarUnsubscribe) activeListeners.notlarUnsubscribe();
            
            tabBtns.forEach(b => { b.classList.remove('active', 'text-purple-600', 'border-purple-600'); b.classList.add('text-gray-500'); });
            e.currentTarget.classList.add('active', 'text-purple-600', 'border-purple-600');
            e.currentTarget.classList.remove('text-gray-500');
            
            const tab = e.currentTarget.dataset.tab;
            if(tab === 'ozet') renderOzetTab(db, currentUserId, appId, studentId);
            else if(tab === 'notlar') renderKoclukNotlariTab(db, currentUserId, appId, studentId);
        });
    });

    // İlk açılış
    renderOzetTab(db, currentUserId, appId, studentId);
}

// --- ÖZET TAB ---
async function renderOzetTab(db, currentUserId, appId, studentId) {
    const area = document.getElementById('tabContentArea');
    const snap = await getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId));
    
    if (snap.exists()) {
        const d = snap.data();
        if(document.getElementById('studentDetailClass')) document.getElementById('studentDetailClass').textContent = d.sinif;
        
        const bakiye = (d.toplamBorc || 0) - (d.toplamOdenen || 0);
        
        area.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
                    <p class="text-sm font-medium text-gray-500">Sınıf</p>
                    <p class="text-lg font-semibold">${d.sinif}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
                    <p class="text-sm font-medium text-gray-500">Kayıt Tarihi</p>
                    <p class="text-lg font-semibold">${formatDateTR(d.olusturmaTarihi?.toDate().toISOString().split('T')[0])}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
                    <p class="text-sm font-medium text-gray-500">Bakiye</p>
                    <p class="text-lg font-semibold ${bakiye > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(bakiye)}</p>
                </div>
            </div>
            
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 class="font-bold text-blue-800 mb-2">Takip Edilen Dersler</h4>
                <div class="flex flex-wrap gap-2">
                    ${(d.takipDersleri || []).map(ders => `<span class="px-3 py-1 bg-white text-blue-600 rounded-full text-sm shadow-sm border border-blue-100">${ders}</span>`).join('')}
                </div>
            </div>
        `;
    }
}

// --- NOTLAR TAB ---
function renderKoclukNotlariTab(db, currentUserId, appId, studentId) {
    const area = document.getElementById('tabContentArea');
    area.innerHTML = `
        <div class="mb-4">
            <h3 class="font-bold text-gray-800 mb-2">Yeni Not Ekle</h3>
            <div class="flex gap-2">
                <textarea id="newNoteInput" class="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" rows="2" placeholder="Öğrenci hakkında notlar..."></textarea>
                <button id="btnSaveNote" class="bg-purple-600 text-white px-6 rounded-lg font-semibold hover:bg-purple-700">Kaydet</button>
            </div>
        </div>
        <div id="noteList" class="space-y-3">
            <p class="text-center text-gray-400 py-4">Notlar yükleniyor...</p>
        </div>
    `;

    // Kaydet Butonu
    document.getElementById('btnSaveNote').onclick = async () => {
        const txt = document.getElementById('newNoteInput').value.trim();
        if(!txt) return;
        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "koclukNotlari"), {
            icerik: txt, tarih: serverTimestamp()
        });
        document.getElementById('newNoteInput').value = '';
    };

    // Listeleme
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "koclukNotlari"), orderBy("tarih", "desc"));
    activeListeners.notlarUnsubscribe = onSnapshot(q, (snap) => {
        const container = document.getElementById('noteList');
        if(snap.empty) { container.innerHTML = '<p class="text-center text-gray-400 py-4">Henüz not yok.</p>'; return; }
        
        container.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
                <div class="p-4 bg-yellow-50 border border-yellow-100 rounded-lg relative group">
                    <p class="text-gray-800 whitespace-pre-wrap">${d.icerik}</p>
                    <p class="text-xs text-gray-400 mt-2">${d.tarih?.toDate().toLocaleString()}</p>
                    <button class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" 
                            onclick="if(confirm('Silinsin mi?')) deleteDoc(doc(db, 'artifacts', '${appId}', 'users', '${currentUserId}', 'ogrencilerim', '${studentId}', 'koclukNotlari', '${doc.id}'))">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>`;
        }).join('');
    });
}

// --- ÖĞRENCİ LİSTESİ (SAYFA) ---
export function renderOgrenciSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Öğrencilerim";
    document.getElementById("mainContentArea").innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div class="relative w-full md:w-1/3">
                <input type="text" id="searchStudentInput" placeholder="Öğrenci ara..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i class="fa-solid fa-magnifying-glass text-gray-400"></i></div>
            </div>
            <button id="showAddStudentModalButton" class="w-full md:w-auto bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center">
                <i class="fa-solid fa-plus mr-2"></i>Yeni Öğrenci Ekle
            </button>
        </div>
        <div id="studentListContainer" class="bg-white p-4 rounded-lg shadow">
            <p class="text-gray-500 text-center py-4">Yükleniyor...</p>
        </div>
    `;
    
    // Modal Açma
    document.getElementById('showAddStudentModalButton').addEventListener('click', () => {
        document.getElementById('studentName').value = '';
        document.getElementById('studentSurname').value = '';
        document.getElementById('studentClass').value = '12. Sınıf';
        renderDersSecimi('12. Sınıf', document.getElementById('studentDersSecimiContainer'));
        document.getElementById('addStudentModal').style.display = 'block';
    });

    // Arama
    document.getElementById('searchStudentInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#studentListContainer tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    });

    // Listeyi Yükle
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    activeListeners.studentUnsubscribe = onSnapshot(q, (snapshot) => {
        const container = document.getElementById('studentListContainer');
        if(snapshot.empty) { container.innerHTML = '<p class="text-gray-500 text-center py-4">Henüz öğrenci yok.</p>'; return; }
        
        let html = `<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Soyad</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sınıf</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bakiye</th><th class="relative px-6 py-3"><span class="sr-only">Eylemler</span></th></tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
        
        snapshot.forEach(doc => {
            const s = doc.data();
            const bakiye = (s.toplamBorc || 0) - (s.toplamOdenen || 0);
            html += `
                <tr class="hover:bg-gray-50 cursor-pointer transition-colors" onclick="renderOgrenciDetaySayfasi('${doc.id}', '${s.ad} ${s.soyad}')">
                    <td class="px-6 py-4 whitespace-nowrap"><div class="flex items-center"><div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold mr-3">${s.ad[0]}${s.soyad[0]}</div><div class="text-sm font-medium text-gray-900">${s.ad} ${s.soyad}</div></div></td>
                    <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">${s.sinif}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-bold ${bakiye > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(bakiye)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <i class="fa-solid fa-chevron-right text-gray-300"></i>
                    </td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    });
}

// --- YARDIMCI: DÜZENLEME MODALI AÇ ---
function showEditStudentModal(db, currentUserId, appId, studentId) {
    const modal = document.getElementById('editStudentModal');
    const dersContainer = document.getElementById('editStudentDersSecimiContainer');
    
    getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId)).then(snap => {
        if(snap.exists()) {
            const s = snap.data();
            document.getElementById('editStudentId').value = studentId;
            document.getElementById('editStudentName').value = s.ad;
            document.getElementById('editStudentSurname').value = s.soyad;
            document.getElementById('editStudentClass').value = s.sinif;
            renderDersSecimi(s.sinif, dersContainer, s.takipDersleri);
            modal.style.display = 'block';
        }
    });
}

// --- KAYIT FONKSİYONLARI (app.js kullanır) ---
export async function saveNewStudent(db, currentUserId, appId) {
    const ad = document.getElementById('studentName').value.trim();
    const soyad = document.getElementById('studentSurname').value.trim();
    const sinif = document.getElementById('studentClass').value;
    const dersler = Array.from(document.querySelectorAll('#studentDersSecimiContainer input:checked')).map(cb => cb.value);
    
    if(!ad || !soyad) { alert('Ad soyad girin'); return; }
    
    await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), {
        ad, soyad, sinif, takipDersleri: dersler, olusturmaTarihi: serverTimestamp(), toplamBorc: 0, toplamOdenen: 0
    });
    document.getElementById('addStudentModal').style.display = 'none';
}

export async function saveStudentChanges(db, currentUserId, appId) {
    const id = document.getElementById('editStudentId').value;
    const ad = document.getElementById('editStudentName').value.trim();
    const soyad = document.getElementById('editStudentSurname').value.trim();
    const sinif = document.getElementById('editStudentClass').value;
    const dersler = Array.from(document.querySelectorAll('#editStudentDersSecimiContainer input:checked')).map(cb => cb.value);
    
    await updateDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", id), {
        ad, soyad, sinif, takipDersleri: dersler
    });
    document.getElementById('editStudentModal').style.display = 'none';
    // Sayfayı yenilemeye gerek yok, listener güncelleyecek
}
