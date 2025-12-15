import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc, getDocs, getCountFromServer, writeBatch, setDoc,
    collection, query, orderBy, onSnapshot, serverTimestamp, where, collectionGroup, limit 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// İkincil App (Auth için)
import { initializeApp as initializeApp2 } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth as getAuth2, createUserWithEmailAndPassword as createUser2, signOut as signOut2 } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import { activeListeners, formatDateTR, formatCurrency, renderDersSecimi, openModalWithBackHistory } from './helpers.js';

const firebaseConfig = {
  apiKey: "AIzaSyD1pCaPISV86eoBNqN2qbDu5hbkx3Z4u2U",
  authDomain: "kocluk-99ad2.firebaseapp.com",
  projectId: "kocluk-99ad2",
  storageBucket: "kocluk-99ad2.firebasestorage.app",
  messagingSenderId: "784379379600",
  appId: "1:784379379600:web:a2cbe572454c92d7c4bd15"
};

// =================================================================
// 1. ÖĞRENCİ LİSTESİ SAYFASI (MOBİL UYUMLU KART YAPISI)
// =================================================================
export function renderOgrenciSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Öğrencilerim";
    document.getElementById("mainContentArea").innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div class="relative w-full md:w-1/3">
                <input type="text" id="searchStudentInput" placeholder="Öğrenci ara..." class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm transition-shadow">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i class="fa-solid fa-magnifying-glass text-gray-400"></i></div>
            </div>
            <button id="showAddStudentModalButton" class="w-full md:w-auto bg-purple-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center shadow-lg shadow-purple-200 active:scale-95">
                <i class="fa-solid fa-user-plus mr-2"></i>Yeni Öğrenci
            </button>
        </div>

        <div id="studentListContainer" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-24">
            <p class="text-gray-500 text-center col-span-full py-8">Yükleniyor...</p>
        </div>
    `;
    
    // --- MODAL AÇMA VE DERS LİSTESİ BAĞLANTISI ---
    document.getElementById('showAddStudentModalButton').addEventListener('click', () => {
        // Formu Temizle
        document.getElementById('studentName').value = '';
        document.getElementById('studentSurname').value = '';
        document.getElementById('studentClass').value = '';
        document.getElementById('studentOptionsContainer').innerHTML = '';
        document.getElementById('studentDersSecimiContainer').innerHTML = '';
        
        // Modal Aç (History Destekli)
        openModalWithBackHistory('addStudentModal');
    });

    // --- DERS SEÇİMİ TETİKLEYİCİSİ (ÖNEMLİ DÜZELTME) ---
    // Sınıf seçildiğinde dersleri getiren listener
    const classSelect = document.getElementById('studentClass');
    if(classSelect) {
        // Önce eski listenerları temizlemek için klonla (Çakışmayı önler)
        const newSelect = classSelect.cloneNode(true);
        classSelect.parentNode.replaceChild(newSelect, classSelect);
        
        newSelect.addEventListener('change', (e) => {
            renderDersSecimi(e.target.value, 'studentOptionsContainer', 'studentDersSecimiContainer');
        });
    }

    // --- MODAL KAPATMA BUTONLARI (MANUEL BAĞLAMA) ---
    const closeBtns = [
        'closeModalButton', 'cancelModalButton', // Ekle Modalı
        'closeEditModalButton', 'cancelEditModalButton' // Düzenle Modalı
    ];
    closeBtns.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if(btn) {
            btn.onclick = (e) => {
                e.preventDefault();
                window.history.back(); // History API ile kapat
            };
        }
    });

    // --- ARAMA ---
    document.getElementById('searchStudentInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.student-card').forEach(card => {
            const name = card.dataset.name.toLowerCase();
            card.style.display = name.includes(term) ? 'flex' : 'none';
        });
    });

    // --- LİSTELEME ---
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    activeListeners.studentUnsubscribe = onSnapshot(q, (snapshot) => {
        const container = document.getElementById('studentListContainer');
        if(snapshot.empty) { 
            container.innerHTML = '<div class="col-span-full text-center py-12"><div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl text-gray-400"><i class="fa-solid fa-users-slash"></i></div><p class="text-gray-500 font-medium">Henüz öğrenci eklenmemiş.</p></div>'; 
            return; 
        }
        
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const s = doc.data();
            const bakiye = (s.toplamBorc || 0) - (s.toplamOdenen || 0);
            const initials = (s.ad[0] || '') + (s.soyad[0] || '');
            
            // Mobil Uyumlu Kart HTML
            const card = document.createElement('div');
            card.className = "student-card bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]";
            card.dataset.name = `${s.ad} ${s.soyad}`;
            card.onclick = () => window.renderOgrenciDetaySayfasi(doc.id, `${s.ad} ${s.soyad}`);
            
            card.innerHTML = `
                <div class="flex items-center gap-4 overflow-hidden">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold text-lg border border-white shadow-sm shrink-0">
                        ${s.avatarIcon || initials}
                    </div>
                    <div class="min-w-0">
                        <h4 class="font-bold text-gray-800 text-base truncate">${s.ad} ${s.soyad}</h4>
                        <span class="inline-block bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border border-gray-200 mt-0.5">
                            ${s.sinif}
                        </span>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <p class="text-xs text-gray-400 font-medium mb-0.5">Bakiye</p>
                    <p class="font-bold text-sm ${bakiye > 0 ? 'text-red-500' : 'text-green-600'}">
                        ${formatCurrency(bakiye)}
                    </p>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

// =================================================================
// 2. DÜZENLEME MODALI
// =================================================================
function showEditStudentModal(db, currentUserId, appId, studentId) {
    const modal = document.getElementById('editStudentModal');
    if(!modal) return;

    getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId)).then(snap => {
        if(snap.exists()) {
            const s = snap.data();
            document.getElementById('editStudentId').value = studentId;
            document.getElementById('editStudentName').value = s.ad;
            document.getElementById('editStudentSurname').value = s.soyad;
            
            // Sınıfı Seç ve Dersleri Tetikle
            const classSelect = document.getElementById('editStudentClass');
            classSelect.value = s.sinif;
            
            // Listener'ı burada da bağla (Düzeltme)
            const newSelect = classSelect.cloneNode(true);
            classSelect.parentNode.replaceChild(newSelect, classSelect);
            newSelect.addEventListener('change', (e) => {
                renderDersSecimi(e.target.value, 'editStudentOptionsContainer', 'editStudentDersSecimiContainer');
            });
            newSelect.value = s.sinif; // Tekrar set et

            // Dersleri Render Et
            renderDersSecimi(s.sinif, 'editStudentOptionsContainer', 'editStudentDersSecimiContainer', s.takipDersleri);
            
            if (s.alan) { 
                setTimeout(() => {
                    const alanSelect = document.querySelector('#editStudentOptionsContainer select'); 
                    if (alanSelect) alanSelect.value = s.alan;
                }, 100);
            }
            
            openModalWithBackHistory('editStudentModal');
        }
    });
}


export async function saveStudentChanges(db, currentUserId, appId) {
    const id = document.getElementById('editStudentId').value;
    const ad = document.getElementById('editStudentName').value.trim();
    const soyad = document.getElementById('editStudentSurname').value.trim();
    const sinif = document.getElementById('editStudentClass').value;
    const dersler = Array.from(document.querySelectorAll('#editStudentDersSecimiContainer input:checked')).map(cb => cb.value);
    const alanSelect = document.querySelector('#editStudentOptionsContainer select');
    const alan = alanSelect ? alanSelect.value : null;
    
    await updateDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", id), {
        ad, soyad, sinif, alan: alan, takipDersleri: dersler
    });
    window.history.back(); // Modalı kapat
}

export async function deleteStudentFull(db, currentUserId, appId) {
    const studentId = document.getElementById('editStudentId').value;
    if (!studentId) return;
    if (!confirm("Öğrenci ve tüm verileri silinecek. Emin misiniz?")) return;
    
    const btn = document.getElementById('btnDeleteStudent');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    try {
        const studentRef = doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId);
        const subCollections = ['odevler', 'denemeler', 'hedefler', 'soruTakibi', 'koclukNotlari', 'mesajlar'];
        
        for (const subColName of subCollections) {
            const q = query(collection(studentRef, subColName), limit(100));
            const snapshot = await getDocs(q); // Basit silme (daha fazlası için cloud function gerekir)
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        await deleteDoc(studentRef);
        window.history.back(); // Modalı kapat
        alert("Silindi.");
    } catch (error) { console.error(error); alert("Hata."); } 
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-trash mr-2"></i> Sil'; }
}

// --- YARDIMCI FONKSİYONLAR ---



function showCredentialsModal(username, password, title) {
    const modalHtml = `
    <div id="credentialModal" class="fixed inset-0 bg-gray-900/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-scale-in">
        <div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div class="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><i class="fa-solid fa-check"></i></div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">${title}</h3>
            <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 text-left space-y-3">
                <div><p class="text-[10px] text-gray-400 font-bold uppercase">Kullanıcı Adı</p><p class="font-mono text-indigo-600 font-bold bg-white p-2 rounded border border-gray-200 select-all">${username}</p></div>
                <div><p class="text-[10px] text-gray-400 font-bold uppercase">Şifre</p><p class="font-mono text-indigo-600 font-bold bg-white p-2 rounded border border-gray-200 select-all">${password}</p></div>
            </div>
            <button onclick="document.getElementById('credentialModal').remove()" class="w-full bg-gray-800 text-white py-3 rounded-xl font-bold">Kapat</button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('btnCopyAllCreds').onclick = () => {
        const textToCopy = `Merhaba! Koçluk sistemi giriş bilgilerin:\n\n👤 Kullanıcı Adı: ${username}\n🔑 Şifre: ${password}\n\nUygulamayı indirip giriş yapabilirsin. Başarılar!`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const btn = document.getElementById('btnCopyAllCreds');
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Kopyalandı!';
            btn.classList.replace('bg-indigo-600', 'bg-green-600');
            setTimeout(() => {
                btn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Tümünü Kopyala';
                btn.classList.replace('bg-green-600', 'bg-indigo-600');
            }, 2000);
        });
    };
}

// =================================================================
// YENİ: ÖĞRENCİ HESABI OLUŞTURUCU (SECONDARY APP)
// =================================================================
async function createStudentAccount(username, password) {
    const secondaryApp = initializeApp2(firebaseConfig, "StudentCreator");
    const secondaryAuth = getAuth2(secondaryApp);
    
    try {
        const email = `${username}@koc.com`; 
        const userCredential = await createUser2(secondaryAuth, email, password);
        const uid = userCredential.user.uid;
        await signOut2(secondaryAuth);
        return uid;
    } catch (error) {
        console.error("Hesap oluşturma hatası:", error);
        throw error; 
    }
}

// =================================================================
// 1. ÖĞRENCİ DETAY SAYFASI
// =================================================================
export function renderOgrenciDetaySayfasi(db, currentUserId, appId, studentId, studentName) {
    document.getElementById("mainContentTitle").textContent = `${studentName} - Detay`;
    const area = document.getElementById("mainContentArea");
    
    area.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <button onclick="document.getElementById('nav-ogrencilerim').click()" class="flex items-center text-sm text-gray-600 hover:text-purple-600 font-medium">
                <i class="fa-solid fa-arrow-left mr-1"></i> Listeye Dön
            </button>
            <div class="flex gap-2">
                <button id="btnResetAccess" class="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-200 transition-colors flex items-center shadow-sm border border-yellow-200">
                    <i class="fa-solid fa-key mr-2"></i> Şifre Yenile
                </button>
                <button id="btnCreateReport" class="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-200 transition-colors flex items-center shadow-sm border border-green-200">
                    <i class="fa-brands fa-whatsapp mr-2 text-lg"></i> Rapor Oluştur
                </button>
            </div>
        </div>
        
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center mb-6 gap-6 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div class="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-3xl shadow-lg relative z-10">
                ${studentName.split(' ').map(n=>n[0]).join('')}
            </div>
            <div class="flex-1 text-center md:text-left z-10">
                <h2 class="text-2xl font-bold text-gray-800">${studentName}</h2>
                <div class="flex flex-col md:items-start items-center mt-1 gap-1">
                    <p class="text-sm text-gray-500 flex items-center gap-2">
                        <span id="studentDetailClass" class="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">...</span>
                        <span id="studentDetailJoinDate" class="text-gray-400 text-xs"></span>
                    </p>
                    <p id="studentDetailArea" class="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded hidden"></p>
                    
                    <p id="studentUsernameDisplay" class="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded mt-1 cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-100" title="Tıkla Kopyala">
                        <i class="fa-solid fa-user-lock mr-1"></i> <span id="uNameText">Yükleniyor...</span>
                    </p>
                </div>
            </div>
            <div class="flex gap-3 z-10">
                <button id="btnEditStudent" class="bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 hover:text-purple-600 transition-colors shadow-sm">
                    <i class="fa-solid fa-pen mr-2"></i> Düzenle
                </button>
                <button id="btnMsgStudent" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                    <i class="fa-regular fa-paper-plane mr-2"></i> Mesaj Gönder
                </button>
            </div>
        </div>

        <div class="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
            <button data-tab="ozet" class="tab-button active py-3 px-6 text-purple-600 border-b-2 border-purple-600 font-semibold transition-colors">Özet & Analiz</button>
            <button data-tab="notlar" class="tab-button py-3 px-6 text-gray-500 hover:text-purple-600 font-medium transition-colors">Koçluk Notları</button>
        </div>
        
        <div id="tabContentArea"></div>
        <div class="h-24"></div>
    `;

    // --- LISTENERLAR ---
    
    // Düzenle Butonu
    document.getElementById('btnEditStudent').addEventListener('click', () => {
        showEditStudentModal(db, currentUserId, appId, studentId);
    });

    // Mesaj Gönder Butonu (Direkt Yönlendirme)
    document.getElementById('btnMsgStudent').addEventListener('click', () => {
        window.targetMessageStudentId = studentId; // Global ID Ata
        document.getElementById('nav-mesajlar').click(); // Mesajlar sayfasına git
    });
    
    // Şifre Yenileme
    document.getElementById('btnResetAccess').addEventListener('click', () => resetStudentAccess(db, currentUserId, appId, studentId, studentName));
    
    // Kullanıcı Adı Kopyala
    document.getElementById('studentUsernameDisplay').addEventListener('click', function() {
        const txt = document.getElementById('uNameText').textContent;
        if(txt && txt !== 'Yükleniyor...') {
            navigator.clipboard.writeText(txt);
            alert("Kullanıcı adı kopyalandı!");
        }
    });

    // Rapor Oluştur
    const btnReport = document.getElementById('btnCreateReport');
    if(btnReport) {
        import('./rapor.js').then(module => {
             btnReport.addEventListener('click', () => module.openReportModal(db, currentUserId, studentId, studentName));
        });
    }

    // Tab Geçişleri
    const tabBtns = document.querySelectorAll('.tab-button');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (activeListeners.notlarUnsubscribe) activeListeners.notlarUnsubscribe();
            tabBtns.forEach(b => { b.classList.remove('active', 'text-purple-600', 'border-purple-600'); b.classList.add('text-gray-500'); });
            e.currentTarget.classList.add('active', 'text-purple-600', 'border-purple-600');
            e.currentTarget.classList.remove('text-gray-500');
            
            const tab = e.currentTarget.dataset.tab;
            const contentArea = document.getElementById('tabContentArea');
            if (contentArea) {
                if(tab === 'ozet') renderOzetTab(db, currentUserId, appId, studentId);
                else if(tab === 'notlar') renderKoclukNotlariTab(db, currentUserId, appId, studentId);
            }
        });
    });

    renderOzetTab(db, currentUserId, appId, studentId);
}

// --- SEKME 1: ÖZET & ANALİZ ---
async function renderOzetTab(db, currentUserId, appId, studentId) {
    const area = document.getElementById('tabContentArea');
    if (!area) return; 

    const studentSnap = await getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId));
    const studentData = studentSnap.exists() ? studentSnap.data() : {};
    
    if(document.getElementById('studentDetailClass')) document.getElementById('studentDetailClass').textContent = studentData.sinif || 'Sınıf Yok';
    if(document.getElementById('studentDetailJoinDate') && studentData.olusturmaTarihi) {
        document.getElementById('studentDetailJoinDate').textContent = `Kayıt: ${formatDateTR(studentData.olusturmaTarihi.toDate().toISOString().split('T')[0])}`;
    }
    if(studentData.alan) {
        const areaEl = document.getElementById('studentDetailArea');
        if(areaEl) { areaEl.textContent = studentData.alan; areaEl.classList.remove('hidden'); }
    }
    if(studentData.username) {
        document.getElementById('uNameText').textContent = studentData.username;
    } else {
        document.getElementById('uNameText').textContent = "Henüz oluşturulmadı";
    }

    area.innerHTML = `
        <div class="flex justify-end mb-4">
            <select id="summaryTimeFilter" class="p-2 pl-3 pr-8 border border-gray-200 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer text-gray-600 font-medium">
                <option value="all">Tüm Zamanlar</option>
                <option value="month" selected>Bu Ay</option>
                <option value="week">Bu Hafta</option>
            </select>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            ${renderKpiCard('Tamamlanan Hedef','0','bg-green-100 text-green-600','fa-bullseye','kpi-goal')}
            ${renderKpiCard('Tamamlanan Ödev','0','bg-blue-100 text-blue-600','fa-list-check','kpi-homework')}
            ${renderKpiCard('Deneme Sayısı','0','bg-purple-100 text-purple-600','fa-file-lines','kpi-exam-count')}
            ${renderKpiCard('Çözülen Soru','0','bg-orange-100 text-orange-600','fa-pen','kpi-question')}
            ${renderKpiCard('Tamamlanan Seans','0','bg-pink-100 text-pink-600','fa-calendar-check','kpi-session')}
        </div>

        <div class="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 mb-6 shadow-sm relative overflow-hidden">
            <div class="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white rounded-full opacity-50 blur-xl"></div>
            <h4 class="text-indigo-800 font-bold flex items-center gap-2 mb-3">
                <i class="fa-solid fa-wand-magic-sparkles text-indigo-600"></i> Yapay Zeka Performans Asistanı
            </h4>
            <div id="aiAssistantContent" class="text-sm text-gray-700 leading-relaxed space-y-2">
                <div class="flex items-center gap-2 text-gray-500"><i class="fa-solid fa-spinner fa-spin"></i> Veriler analiz ediliyor...</div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Ortalama Net</p>
                <h3 id="stat-avg-net" class="text-3xl font-bold text-indigo-600 tracking-tight">-</h3>
                <p class="text-[10px] text-gray-400 mt-1">Tüm denemeler</p>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Okuma (Sayfa)</p>
                <h3 id="stat-reading" class="text-3xl font-bold text-teal-600 tracking-tight">-</h3>
                <p class="text-[10px] text-gray-400 mt-1">Rutin takibi</p>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">En Başarılı Ders</p>
                <h3 id="stat-best-lesson" class="text-lg font-bold text-green-600 mb-2">-</h3>
                <div class="w-full bg-green-50 h-1.5 rounded-full overflow-hidden"><div class="bg-green-500 h-full rounded-full" style="width: 80%"></div></div>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Geliştirilecek Ders</p>
                <h3 id="stat-worst-lesson" class="text-lg font-bold text-red-500 mb-2">-</h3>
                <div class="w-full bg-red-50 h-1.5 rounded-full overflow-hidden"><div class="bg-red-500 h-full rounded-full" style="width: 40%"></div></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="space-y-6">
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 class="font-bold text-gray-800 mb-4 text-sm flex items-center"><i class="fa-solid fa-wallet mr-2 text-gray-400"></i> Finansal Durum</h4>
                    <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                        <span class="text-sm text-gray-500">Güncel Bakiye</span>
                        <span class="font-bold text-lg ${((studentData.toplamBorc||0)-(studentData.toplamOdenen||0)) > 0 ? 'text-red-600':'text-green-600'}">
                            ${formatCurrency((studentData.toplamBorc||0)-(studentData.toplamOdenen||0))}
                        </span>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 class="font-bold text-gray-800 mb-4 text-sm flex items-center"><i class="fa-solid fa-book-open mr-2 text-gray-400"></i> Takip Edilen Dersler</h4>
                    <div class="flex flex-wrap gap-2">
                        ${(studentData.takipDersleri || []).map(d => `<span class="px-2.5 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200">${d}</span>`).join('')}
                    </div>
                </div>
            </div>
            
            <div class="lg:col-span-2 bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden flex flex-col h-full">
                <div class="bg-red-50 px-5 py-4 border-b border-red-100 flex justify-between items-center">
                    <h4 class="font-bold text-red-800 flex items-center gap-2 text-sm"><i class="fa-solid fa-triangle-exclamation"></i> Gecikmiş / Tamamlanmamış Ödevler</h4>
                    <span id="overdue-count" class="bg-white text-red-600 text-xs px-2.5 py-1 rounded-lg font-bold shadow-sm border border-red-100">0</span>
                </div>
                <div id="overdue-list" class="p-3 flex-1 overflow-y-auto max-h-80 space-y-2">
                    <p class="text-center text-gray-400 text-sm py-10">Yükleniyor...</p>
                </div>
            </div>
        </div>
    `;

    const filterSelect = document.getElementById('summaryTimeFilter');
    if(filterSelect) {
        filterSelect.addEventListener('change', () => loadStats(db, currentUserId, appId, studentId, filterSelect.value));
    }

    loadStats(db, currentUserId, appId, studentId, 'month'); 
    loadOverdueHomeworks(db, currentUserId, appId, studentId);
}

function renderKpiCard(title, valueId, colorClass, icon, id) { 
    return `<div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-32 transition-transform hover:-translate-y-1">
        <div class="w-10 h-10 rounded-full ${colorClass} bg-opacity-20 flex items-center justify-center mb-3 text-lg"><i class="fa-solid ${icon}"></i></div>
        <h4 class="text-2xl font-bold text-gray-800 leading-none mb-1.5" id="${id}">0</h4>
        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">${title}</p>
    </div>`; 
}

// --- ISTATISTIK FONKSİYONLARI ---
function generateAIAnalysis(stats) { 
    let advice = []; 
    const hwRate = stats.totalHomework > 0 ? (stats.completedHomework / stats.totalHomework) : 0; 
    const hwPercent = Math.round(hwRate * 100); 
    
    if (stats.totalHomework === 0) { advice.push("⚠️ <strong>Ödev Durumu:</strong> Henüz sistemde kayıtlı veya tamamlanmış ödev bulunmuyor. Öğrenciye ilk görevlerini atayarak süreci başlatmanızı öneririm."); } 
    else if (hwRate < 0.5) { advice.push(`📉 <strong>Ödev Takibi:</strong> Tamamlama oranı düşük (%${hwPercent}). Öğrenciyle zaman yönetimi veya motivasyon eksikliği üzerine bir görüşme planlamanız faydalı olabilir.`); } 
    else if (hwRate > 0.9) { advice.push(`🌟 <strong>Ödev Disiplini:</strong> Tamamlama oranı harika (%${hwPercent}). Öğrencinin bu istikrarını koruması için onu takdir edebilir, daha zorlu hedefler verebilirsiniz.`); } 
    else { advice.push(`👍 <strong>Ödev Takibi:</strong> Ödev ilerleyişi istikrarlı (%${hwPercent}). Rutini bozmadan devam etmesi için teşvik edici geri bildirimlerde bulunabilirsiniz.`); } 
    
    if (stats.totalQuestions > 500) { advice.push(`🔥 <strong>Soru Çözümü:</strong> Toplam ${stats.totalQuestions} soru ile performansı çok yüksek. Soru çeşitliliğini artırmak veya deneme sıklığını yükseltmek gelişimi hızlandırabilir.`); } 
    else if (stats.totalQuestions < 100 && stats.totalQuestions > 0) { advice.push(`💡 <strong>Soru Çözümü:</strong> Toplam ${stats.totalQuestions} soru çözülmüş. Günlük soru hedeflerini artırarak pratik yapma alışkanlığını güçlendirmenizi öneririm.`); } 
    else if (stats.totalQuestions === 0) { advice.push(`❓ <strong>Soru Çözümü:</strong> Henüz soru girişi yapılmamış. Öğrenciye soru takip sistemini kullanmayı hatırlatabilirsiniz.`); } 
    
    if (stats.bestLesson && stats.bestLesson !== '-') { advice.push(`✅ <strong>Güçlü Yön:</strong> Öğrenci <strong>${stats.bestLesson}</strong> dersinde oldukça başarılı. Bu dersteki çalışma stratejisini diğer derslere uyarlaması için rehberlik edebilirsiniz.`); } 
    if (stats.worstLesson && stats.worstLesson !== '-') { advice.push(`🎯 <strong>Gelişim Alanı:</strong> <strong>${stats.worstLesson}</strong> dersinde netler düşük görünüyor. Bu ders için özel bir konu tekrarı veya ek kaynak takviyesi planlamanız gerekebilir.`); } 
    
    if(advice.length === 0) { advice.push("Veri girişi arttıkça size daha detaylı, öğrenciye özel koçluk önerileri sunacağım."); } 
    return advice.map(a => `<p class="mb-2 last:mb-0">${a}</p>`).join(''); 
}

async function loadStats(db, uid, appId, sid, period) { 
    const now = new Date(); let startDate = null; 
    if (period === 'week') { const day = now.getDay() || 7; if(day !== 1) now.setHours(-24 * (day - 1)); startDate = now.toISOString().split('T')[0]; } 
    else if (period === 'month') { startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; } 
    else { startDate = '2000-01-01'; } 
    
    const qGoals = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "hedefler"), where("bitisTarihi", ">=", startDate)); 
    const qHomework = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), where("bitisTarihi", ">=", startDate)); 
    const qExams = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "denemeler"), where("tarih", ">=", startDate)); 
    const qQuestions = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "soruTakibi"), where("tarih", ">=", startDate)); 
    const qSessions = query(collection(db, "artifacts", appId, "users", uid, "ajandam"), where("studentId", "==", sid), where("tarih", ">=", startDate), where("durum", "==", "tamamlandi")); 
    
    try { 
        const [snapGoals, snapHomework, snapExams, snapQuestions, snapSessions] = await Promise.all([ getDocs(qGoals), getDocs(qHomework), getDocs(qExams), getDocs(qQuestions), getDocs(qSessions) ]); 
        
        let completedGoals = 0; snapGoals.forEach(doc => { if (doc.data().durum === 'tamamlandi') completedGoals++; }); 
        document.getElementById('kpi-goal').textContent = completedGoals; 
        
        let completedHomework = 0; snapHomework.forEach(doc => { if (doc.data().durum === 'tamamlandi') completedHomework++; }); 
        document.getElementById('kpi-homework').textContent = completedHomework; 
        
        document.getElementById('kpi-exam-count').textContent = snapExams.size; 
        
        let completedSessions = 0; snapSessions.forEach(doc => { const d = doc.data(); if (d.tarih >= startDate && d.durum === 'tamamlandi') completedSessions++; }); 
        document.getElementById('kpi-session').textContent = completedSessions; 
        
        let totalQuestions = 0; let totalRead = 0; 
        snapQuestions.forEach(doc => { const d = doc.data(); const adet = parseInt(d.adet) || 0; if (d.ders === 'Kitap Okuma' || (d.konu && d.konu.includes('Kitap'))) totalRead += adet; else totalQuestions += adet; }); 
        document.getElementById('kpi-question').textContent = totalQuestions; 
        document.getElementById('stat-reading').textContent = totalRead; 
        
        let totalNet = 0; let subjectStats = {}; 
        snapExams.forEach(doc => { const d = doc.data(); if(d.analizHaric === true) return; totalNet += (parseFloat(d.toplamNet) || 0); if (d.netler) { for (const [ders, stats] of Object.entries(d.netler)) { if (!subjectStats[ders]) subjectStats[ders] = { total: 0, count: 0 }; subjectStats[ders].total += (parseFloat(stats.net) || 0); subjectStats[ders].count += 1; } } }); 
        const avgNet = snapExams.size > 0 ? (totalNet / snapExams.size).toFixed(2) : '-'; 
        document.getElementById('stat-avg-net').textContent = avgNet; 
        
        let bestLesson = { name: '-', avg: -Infinity }; let worstLesson = { name: '-', avg: Infinity }; 
        for (const [name, stat] of Object.entries(subjectStats)) { const avg = stat.total / stat.count; if (avg > bestLesson.avg) bestLesson = { name, avg }; if (avg < worstLesson.avg) worstLesson = { name, avg }; } 
        if (bestLesson.name !== '-') { document.getElementById('stat-best-lesson').textContent = `${bestLesson.name} (${bestLesson.avg.toFixed(1)})`; document.getElementById('stat-worst-lesson').textContent = `${worstLesson.name} (${worstLesson.avg.toFixed(1)})`; } 
        else { document.getElementById('stat-best-lesson').textContent = '-'; document.getElementById('stat-worst-lesson').textContent = '-'; } 
        
        const aiAnalysis = generateAIAnalysis({ completedHomework: completedHomework, totalHomework: snapHomework.size, totalQuestions: totalQuestions, bestLesson: bestLesson.name, worstLesson: worstLesson.name }); 
        document.getElementById('aiAssistantContent').innerHTML = aiAnalysis; 
    } catch (err) { console.error("Dashboard istatistik hatası:", err); } 
}

async function loadOverdueHomeworks(db, uid, appId, sid) { 
    const today = new Date().toISOString().split('T')[0]; 
    const q = query(collection(db, "artifacts", appId, "users", uid, "ogrencilerim", sid, "odevler"), where("durum", "!=", "tamamlandi"), where("bitisTarihi", "<", today), orderBy("bitisTarihi", "asc")); 
    const snap = await getDocs(q); 
    const container = document.getElementById('overdue-list'); if (!container) return; 
    document.getElementById('overdue-count').textContent = snap.size;
    if (snap.empty) { container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-gray-300 py-10"><i class="fa-regular fa-circle-check text-4xl mb-3 text-green-100"></i><p class="text-sm">Gecikmiş ödev bulunmuyor.</p></div>'; } 
    else { container.innerHTML = snap.docs.map(doc => { const d = doc.data(); return ` <div class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-red-300 transition-colors group"> <div class="flex justify-between items-start"> <h5 class="font-bold text-gray-800 text-sm line-clamp-1">${d.title}</h5> <span class="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-medium whitespace-nowrap">Gecikti</span> </div> <div class="flex justify-between items-center mt-2"> <span class="text-xs text-gray-500 flex items-center"><i class="fa-regular fa-calendar mr-1.5"></i> ${formatDateTR(d.bitisTarihi)}</span> <button class="text-xs font-bold text-indigo-600 hover:text-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity" onclick="document.getElementById('nav-odevler').click()">Görüntüle <i class="fa-solid fa-arrow-right ml-1"></i></button> </div> </div>`; }).join(''); } 
}

// --- SEKME 2: KOÇLUK NOTLARI ---
function renderKoclukNotlariTab(db, currentUserId, appId, studentId) {
    const area = document.getElementById('tabContentArea');
    area.innerHTML = `
        <div class="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 class="font-bold text-gray-800 mb-3 text-sm">Yeni Not Ekle</h3>
            <div class="flex flex-col gap-3">
                <textarea id="newNoteInput" class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm resize-none" rows="3" placeholder="Öğrenci hakkında gözlemleriniz..."></textarea>
                <div class="flex justify-end">
                    <button id="btnSaveNote" class="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm">Notu Kaydet</button>
                </div>
            </div>
        </div>
        <div id="noteList" class="space-y-3">
            <p class="text-center text-gray-400 py-8">Notlar yükleniyor...</p>
        </div>
        <div class="h-24"></div>
    `;

    document.getElementById('btnSaveNote').onclick = async () => {
        const txt = document.getElementById('newNoteInput').value.trim();
        if(!txt) return;
        await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "koclukNotlari"), {
            icerik: txt, tarih: serverTimestamp()
        });
        document.getElementById('newNoteInput').value = '';
    };

    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId, "koclukNotlari"), orderBy("tarih", "desc"));
    activeListeners.notlarUnsubscribe = onSnapshot(q, (snap) => {
        const container = document.getElementById('noteList');
        if(snap.empty) { container.innerHTML = '<div class="text-center text-gray-400 py-10 flex flex-col items-center"><i class="fa-regular fa-note-sticky text-3xl mb-2 opacity-20"></i><p class="text-sm">Henüz not eklenmemiş.</p></div>'; return; }
        
        container.innerHTML = ''; 
        snap.forEach(doc => {
            const d = doc.data();
            const noteDiv = document.createElement('div');
            noteDiv.className = 'p-4 bg-yellow-50 border border-yellow-100 rounded-xl relative group hover:shadow-md transition-all';
            noteDiv.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="mt-1 text-yellow-500"><i class="fa-solid fa-quote-left"></i></div>
                    <div class="flex-1">
                        <p class="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">${d.icerik}</p>
                        <p class="text-[10px] text-gray-400 mt-2 flex items-center gap-1 font-medium"><i class="fa-regular fa-clock"></i> ${d.tarih?.toDate().toLocaleString()}</p>
                    </div>
                </div>
                <button class="delete-note-btn absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm" 
                        data-id="${doc.id}">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            `;
            
            noteDiv.querySelector('.delete-note-btn').addEventListener('click', async () => {
                if(confirm('Silinsin mi?')) {
                    await deleteDoc(doc.ref); 
                }
            });

            container.appendChild(noteDiv);
        });
    });
}


// --- KAYIT & ŞİFRE & SİLME FONKSİYONLARI ---

export async function saveNewStudent(db, currentUserId, appId) {
    const ad = document.getElementById('studentName').value.trim();
    const soyad = document.getElementById('studentSurname').value.trim();
    const sinif = document.getElementById('studentClass').value;
    const dersler = Array.from(document.querySelectorAll('#studentDersSecimiContainer input:checked')).map(cb => cb.value);
    const alanSelect = document.querySelector('#studentOptionsContainer select');
    const alan = alanSelect ? alanSelect.value : null;
    
    if(!ad || !soyad || !sinif) { alert('Lütfen Ad, Soyad ve Sınıf bilgilerini girin.'); return; }

    // Limit Kontrolü
    try {
        const profileRef = doc(db, "artifacts", appId, "users", currentUserId, "settings", "profile");
        const profileSnap = await getDoc(profileRef);
        let maxOgrenci = 10; 
        if (profileSnap.exists() && profileSnap.data().maxOgrenci !== undefined) { maxOgrenci = profileSnap.data().maxOgrenci; }
        const studentsColl = collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim");
        const snapshot = await getCountFromServer(studentsColl);
        if (snapshot.data().count >= maxOgrenci) {
            document.getElementById('addStudentModal').style.display = 'none'; 
            if(confirm(`Limit doldu (${maxOgrenci}). Paketinizi yükseltmek ister misiniz?`)) {
                const upgradeBtn = document.getElementById('nav-paketyukselt');
                if(upgradeBtn) upgradeBtn.click();
            }
            return; 
        }
    } catch (e) { console.error("Limit hatası:", e); return; }

    // Kullanıcı Oluşturma (Secondary App)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const cleanName = ad.toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/\s/g,'');
    const cleanSurname = soyad.toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/\s/g,'');
    const username = `${cleanName}.${cleanSurname}.${randomSuffix}`;
    const password = Math.random().toString(36).slice(-8);

    try {
        const btnSave = document.getElementById('saveStudentButton');
        btnSave.disabled = true; btnSave.textContent = "Hesap Oluşturuluyor...";

        const studentUid = await createStudentAccount(username, password);

        const studentRef = await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), {
            ad, soyad, sinif, alan: alan, takipDersleri: dersler, olusturmaTarihi: serverTimestamp(), toplamBorc: 0, toplamOdenen: 0, username: username, authUid: studentUid
        });

        await setDoc(doc(db, "artifacts", appId, "users", studentUid, "settings", "profile"), {
            email: `${username}@koc.com`, kocId: currentUserId, rol: "ogrenci", linkedDocId: studentRef.id, kayitTarihi: serverTimestamp()
        });

        document.getElementById('addStudentModal').style.display = 'none';
        showCredentialsModal(username, password, "Öğrenci Başarıyla Kaydedildi");

    } catch (error) {
        console.error("Kayıt hatası:", error);
        alert("Hata: " + error.message);
    } finally {
        const btnSave = document.getElementById('saveStudentButton');
        btnSave.disabled = false; btnSave.textContent = "Kaydet";
    }
}


async function resetStudentAccess(db, coachId, appId, studentDocId, studentName) {
    if(!confirm(`${studentName} için yeni bir giriş şifresi oluşturulacak. Eski şifre geçersiz olacak. Devam edilsin mi?`)) return;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const baseName = studentName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const username = `${baseName}.${randomSuffix}`;
    const password = Math.random().toString(36).slice(-8);
    try {
        const newUid = await createStudentAccount(username, password);
        await setDoc(doc(db, "artifacts", appId, "users", newUid, "settings", "profile"), {
            email: `${username}@koc.com`, kocId: coachId, rol: "ogrenci", linkedDocId: studentDocId, kayitTarihi: serverTimestamp()
        });
        await updateDoc(doc(db, "artifacts", appId, "users", coachId, "ogrencilerim", studentDocId), { username: username, authUid: newUid });
        
        // UI Güncelle (Eğer o an detay sayfasındaysa)
        const uNameText = document.getElementById('uNameText');
        if(uNameText) uNameText.textContent = username;
        
        showCredentialsModal(username, password, "Erişim Bilgileri Yenilendi");
    } catch (error) { console.error("Yenileme hatası:", error); alert("İşlem başarısız: " + error.message); }
}
