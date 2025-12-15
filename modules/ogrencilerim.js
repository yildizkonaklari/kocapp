import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc, getDocs, getCountFromServer, writeBatch, setDoc,
    collection, query, orderBy, onSnapshot, serverTimestamp, where, collectionGroup, limit 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// İkincil App (Auth işlemleri için)
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
// 1. ÖĞRENCİ LİSTESİ SAYFASI
// =================================================================
export function renderOgrenciSayfasi(db, currentUserId, appId) {
    const titleEl = document.getElementById("mainContentTitle");
    const areaEl = document.getElementById("mainContentArea");
    
    if (titleEl) titleEl.textContent = "Öğrencilerim";
    if (areaEl) {
        areaEl.innerHTML = `
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
    }
    
    // --- MODAL AÇMA ---
    const btnShowAdd = document.getElementById('showAddStudentModalButton');
    if (btnShowAdd) {
        btnShowAdd.addEventListener('click', () => {
            // Formu Temizle
            const inpName = document.getElementById('studentName');
            const inpSurname = document.getElementById('studentSurname');
            const inpClass = document.getElementById('studentClass');
            const divOptions = document.getElementById('studentOptionsContainer');
            const divDersler = document.getElementById('studentDersSecimiContainer');

            if(inpName) inpName.value = '';
            if(inpSurname) inpSurname.value = '';
            if(inpClass) inpClass.value = '';
            if(divOptions) divOptions.innerHTML = '';
            if(divDersler) divDersler.innerHTML = '';
            
            openModalWithBackHistory('addStudentModal');
        });
    }

    // --- DERS SEÇİMİ TETİKLEYİCİSİ ---
    const classSelect = document.getElementById('studentClass');
    if(classSelect) {
        // Eski listenerları temizlemek için klonla
        const newSelect = classSelect.cloneNode(true);
        classSelect.parentNode.replaceChild(newSelect, classSelect);
        
        newSelect.addEventListener('change', (e) => {
            renderDersSecimi(e.target.value, 'studentOptionsContainer', 'studentDersSecimiContainer');
        });
    }

    // --- ARAMA ---
    const searchInput = document.getElementById('searchStudentInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.student-card').forEach(card => {
                const name = card.dataset.name.toLowerCase();
                card.style.display = name.includes(term) ? 'flex' : 'none';
            });
        });
    }

    // --- LİSTELEME ---
    const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
    
    if(activeListeners.studentUnsubscribe) activeListeners.studentUnsubscribe();
    
    activeListeners.studentUnsubscribe = onSnapshot(q, (snapshot) => {
        const container = document.getElementById('studentListContainer');
        // Eğer kullanıcı başka sayfaya geçtiyse ve container yoksa işlemi durdur (HATA ÇÖZÜMÜ)
        if (!container) return; 
        
        if(snapshot.empty) { 
            container.innerHTML = '<div class="col-span-full text-center py-12"><div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl text-gray-400"><i class="fa-solid fa-users-slash"></i></div><p class="text-gray-500 font-medium">Henüz öğrenci eklenmemiş.</p></div>'; 
            return; 
        }
        
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const s = doc.data();
            const bakiye = (s.toplamBorc || 0) - (s.toplamOdenen || 0);
            const initials = (s.ad?.[0] || '') + (s.soyad?.[0] || '');
            
            const card = document.createElement('div');
            card.className = "student-card bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]";
            card.dataset.name = `${s.ad} ${s.soyad}`;
            
            // Tıklama olayı
            card.onclick = () => {
                // Detay sayfasına gitmeden önce mevcut listener'ı kapatabiliriz (opsiyonel)
                if (typeof window.renderOgrenciDetaySayfasi === 'function') {
                    window.renderOgrenciDetaySayfasi(doc.id, `${s.ad} ${s.soyad}`);
                } else {
                    renderOgrenciDetaySayfasi(db, currentUserId, appId, doc.id, `${s.ad} ${s.soyad}`);
                }
            };
            
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
    getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId)).then(snap => {
        if(snap.exists()) {
            const s = snap.data();
            
            // Elementlerin varlığını kontrol et
            const inpId = document.getElementById('editStudentId');
            const inpName = document.getElementById('editStudentName');
            const inpSurname = document.getElementById('editStudentSurname');
            const classSelect = document.getElementById('editStudentClass');
            
            if(inpId) inpId.value = studentId;
            if(inpName) inpName.value = s.ad;
            if(inpSurname) inpSurname.value = s.soyad;
            
            if(classSelect) {
                // Listener yenileme
                const newSelect = classSelect.cloneNode(true);
                classSelect.parentNode.replaceChild(newSelect, classSelect);
                newSelect.addEventListener('change', (e) => {
                    renderDersSecimi(e.target.value, 'editStudentOptionsContainer', 'editStudentDersSecimiContainer');
                });
                newSelect.value = s.sinif;
                
                // Dersleri yükle
                renderDersSecimi(s.sinif, 'editStudentOptionsContainer', 'editStudentDersSecimiContainer', s.takipDersleri);
                
                if (s.alan) { 
                    setTimeout(() => {
                        const alanSelect = document.querySelector('#editStudentOptionsContainer select'); 
                        if (alanSelect) alanSelect.value = s.alan;
                    }, 200);
                }
            }
            openModalWithBackHistory('editStudentModal');
        }
    });
}

// =================================================================
// 3. KAYIT VE İŞLEM FONKSİYONLARI
// =================================================================

export async function saveNewStudent(db, currentUserId, appId) {
    const ad = document.getElementById('studentName').value.trim();
    const soyad = document.getElementById('studentSurname').value.trim();
    const sinif = document.getElementById('studentClass').value;
    
    // Dersleri topla
    const derslerCheckboxes = document.querySelectorAll('#studentDersSecimiContainer input:checked');
    const dersler = Array.from(derslerCheckboxes).map(cb => cb.value);
    
    const alanSelect = document.querySelector('#studentOptionsContainer select');
    const alan = alanSelect ? alanSelect.value : null;
    
    if(!ad || !soyad || !sinif) { alert('Lütfen Ad, Soyad ve Sınıf bilgilerini girin.'); return; }

    const btnSave = document.getElementById('saveStudentButton');
    if(btnSave) { btnSave.disabled = true; btnSave.textContent = "Kaydediliyor..."; }

    try {
        // --- LİMİT KONTROLÜ ---
        const profileRef = doc(db, "artifacts", appId, "users", currentUserId, "settings", "profile");
        const profileSnap = await getDoc(profileRef);
        let maxOgrenci = 10; 
        if (profileSnap.exists() && profileSnap.data().maxOgrenci !== undefined) { maxOgrenci = profileSnap.data().maxOgrenci; }
        
        const studentsColl = collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim");
        const snapshot = await getCountFromServer(studentsColl);
        
        if (snapshot.data().count >= maxOgrenci) {
            window.history.back(); // Modalı kapat
            if(confirm(`Öğrenci limitiniz doldu (${maxOgrenci}). Paketinizi yükseltmek ister misiniz?`)) {
                const upgradeBtn = document.getElementById('nav-paketyukselt');
                if(upgradeBtn) upgradeBtn.click();
            }
            return; 
        }

        // --- HESAP OLUŞTURMA (Secondary App) ---
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const cleanName = ad.toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/\s/g,'');
        const cleanSurname = soyad.toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/\s/g,'');
        const username = `${cleanName}.${cleanSurname}.${randomSuffix}`;
        const password = Math.random().toString(36).slice(-8);

        const studentUid = await createStudentAccount(username, password);

        // Firestore Kayıt
        const studentRef = await addDoc(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), {
            ad, soyad, sinif, alan: alan, takipDersleri: dersler, olusturmaTarihi: serverTimestamp(), toplamBorc: 0, toplamOdenen: 0, username: username, authUid: studentUid
        });

        // Öğrenci Profili
        await setDoc(doc(db, "artifacts", appId, "users", studentUid, "settings", "profile"), {
            email: `${username}@koc.com`, kocId: currentUserId, rol: "ogrenci", linkedDocId: studentRef.id, kayitTarihi: serverTimestamp()
        });

        window.history.back(); // Modalı kapat
        
        // Kimlik modalını güvenli şekilde göster
        setTimeout(() => {
            showCredentialsModal(username, password, "Öğrenci Eklendi");
        }, 500);

    } catch (error) {
        console.error("Kayıt hatası:", error);
        alert("Hata: " + error.message);
    } finally {
        if(btnSave) { btnSave.disabled = false; btnSave.textContent = "Kaydet"; }
    }
}

export async function saveStudentChanges(db, currentUserId, appId) {
    const id = document.getElementById('editStudentId').value;
    const ad = document.getElementById('editStudentName').value.trim();
    const soyad = document.getElementById('editStudentSurname').value.trim();
    const sinif = document.getElementById('editStudentClass').value;
    
    const dersler = Array.from(document.querySelectorAll('#editStudentDersSecimiContainer input:checked')).map(cb => cb.value);
    const alanSelect = document.querySelector('#editStudentOptionsContainer select');
    const alan = alanSelect ? alanSelect.value : null;
    
    try {
        await updateDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", id), {
            ad, soyad, sinif, alan: alan, takipDersleri: dersler
        });
        window.history.back(); // Modalı kapat
    } catch (e) {
        console.error("Güncelleme hatası", e);
        alert("Güncellenemedi.");
    }
}

export async function deleteStudentFull(db, currentUserId, appId) {
    const studentId = document.getElementById('editStudentId').value;
    if (!studentId) return;
    if (!confirm("DİKKAT! Bu öğrenci ve ona ait TÜM VERİLER kalıcı olarak silinecektir. \n\nBu işlem geri alınamaz. Onaylıyor musunuz?")) return;
    
    const btn = document.getElementById('btnDeleteStudent');
    if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Siliniyor...'; }
    
    try {
        const studentRef = doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId);
        const subCollections = ['odevler', 'denemeler', 'hedefler', 'soruTakibi', 'koclukNotlari', 'mesajlar'];
        
        for (const subColName of subCollections) {
            const q = query(collection(studentRef, subColName), limit(400));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        }
        await deleteDoc(studentRef);
        window.history.back(); // Modalı kapat
        alert("Öğrenci silindi.");
    } catch (error) { 
        console.error("Silme hatası:", error); 
        alert("Hata oluştu."); 
    } finally { 
        if(btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-trash mr-2"></i> Sil'; }
    }
}

// --- YARDIMCI FONKSİYONLAR ---

async function createStudentAccount(username, password) {
    const secondaryApp = initializeApp2(firebaseConfig, "StudentCreator");
    const secondaryAuth = getAuth2(secondaryApp);
    try {
        const cred = await createUser2(secondaryAuth, `${username}@koc.com`, password);
        const uid = cred.user.uid;
        await signOut2(secondaryAuth);
        return uid;
    } catch (error) { throw error; }
}

function showCredentialsModal(username, password, title) {
    // Varsa eskisini sil
    const old = document.getElementById('credentialModal');
    if(old) old.remove();

    const modalHtml = `
    <div id="credentialModal" class="fixed inset-0 bg-gray-900/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-scale-in">
        <div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div class="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><i class="fa-solid fa-check"></i></div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">${title}</h3>
            <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 text-left space-y-3">
                <div><p class="text-[10px] text-gray-400 font-bold uppercase">Kullanıcı Adı</p><p class="font-mono text-indigo-600 font-bold bg-white p-2 rounded border border-gray-200 select-all">${username}</p></div>
                <div><p class="text-[10px] text-gray-400 font-bold uppercase">Şifre</p><p class="font-mono text-indigo-600 font-bold bg-white p-2 rounded border border-gray-200 select-all">${password}</p></div>
            </div>
            
            <button id="btnCopyCreds" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mb-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">
                <i class="fa-regular fa-copy mr-2"></i> Bilgileri Kopyala
            </button>
            <button id="btnCloseCreds" class="w-full text-gray-500 py-2 rounded-xl font-medium hover:bg-gray-100 transition-colors">Kapat</button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Event Listenerları Güvenli Bağla (DOM'a eklenmesini bekle)
    setTimeout(() => {
        const btnCopy = document.getElementById('btnCopyCreds');
        if(btnCopy) {
            btnCopy.onclick = () => {
                const text = `Kullanıcı Adı: ${username}\nŞifre: ${password}`;
                navigator.clipboard.writeText(text).then(() => {
                    btnCopy.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Kopyalandı!';
                    btnCopy.classList.replace('bg-indigo-600', 'bg-green-600');
                });
            };
        }
        const btnClose = document.getElementById('btnCloseCreds');
        if(btnClose) {
            btnClose.onclick = () => {
                const m = document.getElementById('credentialModal');
                if(m) m.remove();
            };
        }
    }, 100);
}

// =================================================================
// 4. ÖĞRENCİ DETAY SAYFASI
// =================================================================
export function renderOgrenciDetaySayfasi(db, currentUserId, appId, studentId, studentName) {
    const titleEl = document.getElementById("mainContentTitle");
    const areaEl = document.getElementById("mainContentArea");
    
    if(titleEl) titleEl.textContent = `${studentName}`;
    if(areaEl) {
        areaEl.innerHTML = `
            <div class="mb-6 flex justify-between items-center">
                <button id="btnBackToList" class="flex items-center text-sm text-gray-600 hover:text-purple-600 font-medium transition-colors">
                    <i class="fa-solid fa-arrow-left mr-2"></i> Listeye Dön
                </button>
                <div class="flex gap-2">
                    <button id="btnResetAccess" class="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-200 transition-colors shadow-sm">
                        <i class="fa-solid fa-key mr-2"></i> Şifre
                    </button>
                    <button id="btnCreateReport" class="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-200 transition-colors shadow-sm">
                        <i class="fa-brands fa-whatsapp mr-2 text-lg"></i> Rapor
                    </button>
                </div>
            </div>
            
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center mb-6 gap-6 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div class="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-3xl shadow-lg relative z-10">
                    ${studentName[0]}
                </div>
                <div class="flex-1 text-center md:text-left z-10">
                    <h2 class="text-2xl font-bold text-gray-800">${studentName}</h2>
                    <div class="flex flex-col md:items-start items-center mt-1 gap-1">
                        <p class="text-sm text-gray-500 flex items-center gap-2">
                            <span id="studentDetailClass" class="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">...</span>
                            <span id="studentDetailJoinDate" class="text-gray-400 text-xs"></span>
                        </p>
                        <p id="studentUsernameDisplay" class="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded mt-1 cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-100" title="Tıkla Kopyala">
                            <i class="fa-solid fa-user-lock mr-1"></i> <span id="uNameText">Yükleniyor...</span>
                        </p>
                    </div>
                </div>
                <div class="flex gap-3 z-10">
                    <button id="btnEditStudentInDetail" class="bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 hover:text-purple-600 transition-colors shadow-sm">
                        <i class="fa-solid fa-pen mr-2"></i> Düzenle
                    </button>
                    <button id="btnMsgStudent" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                        <i class="fa-regular fa-paper-plane mr-2"></i> Mesaj
                    </button>
                </div>
            </div>

            <div class="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
                <button data-tab="ozet" class="tab-button active py-3 px-6 text-purple-600 border-b-2 border-purple-600 font-semibold transition-colors whitespace-nowrap">Özet & Analiz</button>
                <button data-tab="notlar" class="tab-button py-3 px-6 text-gray-500 hover:text-purple-600 font-medium transition-colors whitespace-nowrap">Koçluk Notları</button>
            </div>
            
            <div id="tabContentArea"></div>
            <div class="h-24"></div>
        `;
    }

    // --- LİSTENERLAR ---
    document.getElementById('btnBackToList').onclick = () => document.getElementById('nav-ogrencilerim').click();
    document.getElementById('btnEditStudentInDetail').onclick = () => showEditStudentModal(db, currentUserId, appId, studentId);
    
    document.getElementById('btnMsgStudent').onclick = () => {
        window.targetMessageStudentId = studentId; 
        document.getElementById('nav-mesajlar').click(); 
    };
    
    document.getElementById('btnResetAccess').onclick = () => resetStudentAccess(db, currentUserId, appId, studentId, studentName);
    
    // Rapor (Dynamic Import)
    const btnReport = document.getElementById('btnCreateReport');
    if(btnReport) {
        btnReport.onclick = () => {
            import('./rapor.js').then(module => {
                 module.openReportModal(db, currentUserId, studentId, studentName);
            }).catch(e => console.error("Rapor modülü yüklenemedi", e));
        };
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
            if(tab === 'ozet') renderOzetTab(db, currentUserId, appId, studentId);
            else if(tab === 'notlar') renderKoclukNotlariTab(db, currentUserId, appId, studentId);
        });
    });

    // İlk Tabı Yükle
    renderOzetTab(db, currentUserId, appId, studentId);
}

// --- SEKME 1: ÖZET ---
async function renderOzetTab(db, currentUserId, appId, studentId) {
    const area = document.getElementById('tabContentArea');
    if (!area) return;

    // Veri Çekme
    const studentSnap = await getDoc(doc(db, "artifacts", appId, "users", currentUserId, "ogrencilerim", studentId));
    const studentData = studentSnap.exists() ? studentSnap.data() : {};
    
    // UI Güncelleme (Safe Check)
    if(document.getElementById('studentDetailClass')) document.getElementById('studentDetailClass').textContent = studentData.sinif || '-';
    if(document.getElementById('uNameText')) document.getElementById('uNameText').textContent = studentData.username || '...';
    if(document.getElementById('studentDetailJoinDate') && studentData.olusturmaTarihi) {
        document.getElementById('studentDetailJoinDate').textContent = `Kayıt: ${formatDateTR(studentData.olusturmaTarihi.toDate().toISOString().split('T')[0])}`;
    }

    area.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                <p class="text-xs text-gray-400 font-bold uppercase">Bakiye</p>
                <h3 class="text-xl font-bold ${((studentData.toplamBorc||0)-(studentData.toplamOdenen||0)) > 0 ? 'text-red-600':'text-green-600'}">
                    ${formatCurrency((studentData.toplamBorc||0)-(studentData.toplamOdenen||0))}
                </h3>
            </div>
            </div>
        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center text-gray-400">
            <i class="fa-solid fa-chart-simple text-4xl mb-2 opacity-20"></i>
            <p>Detaylı analiz grafikleri yakında burada olacak.</p>
        </div>
    `;
}

// --- SEKME 2: NOTLAR ---
function renderKoclukNotlariTab(db, currentUserId, appId, studentId) {
    const area = document.getElementById('tabContentArea');
    if(!area) return;

    area.innerHTML = `
        <div class="mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <textarea id="newNoteInput" class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm resize-none" rows="2" placeholder="Not ekle..."></textarea>
            <div class="flex justify-end mt-2">
                <button id="btnSaveNote" class="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors">Ekle</button>
            </div>
        </div>
        <div id="noteList" class="space-y-3"></div>
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
    
    if(activeListeners.notlarUnsubscribe) activeListeners.notlarUnsubscribe();
    
    activeListeners.notlarUnsubscribe = onSnapshot(q, (snap) => {
        const container = document.getElementById('noteList');
        if(!container) return; // Sayfa değişmişse dur
        
        if(snap.empty) { container.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">Not yok.</p>'; return; }
        
        container.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div');
            div.className = 'p-3 bg-yellow-50 border border-yellow-100 rounded-lg relative group';
            div.innerHTML = `
                <p class="text-gray-800 text-sm">${d.icerik}</p>
                <p class="text-[10px] text-gray-400 mt-1">${d.tarih ? d.tarih.toDate().toLocaleString() : ''}</p>
                <button class="delete-note absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100" data-id="${doc.id}"><i class="fa-solid fa-trash"></i></button>
            `;
            div.querySelector('.delete-note').onclick = async () => {
                if(confirm('Silinsin mi?')) await deleteDoc(doc.ref);
            };
            container.appendChild(div);
        });
    });
}

// Şifre Yenileme (Bağımsız Fonksiyon)
async function resetStudentAccess(db, coachId, appId, studentDocId, studentName) {
    if(!confirm(`${studentName} için yeni şifre oluşturulsun mu?`)) return;
    
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
        
        // UI Güncelle
        const uNameText = document.getElementById('uNameText');
        if(uNameText) uNameText.textContent = username;
        
        showCredentialsModal(username, password, "Şifre Yenilendi");
        
    } catch (error) { 
        console.error("Yenileme hatası:", error); 
        alert("İşlem başarısız: " + error.message); 
    }
}
