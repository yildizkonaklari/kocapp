// === MODULES/HELPERS.JS (MERKEZİ YAPILANDIRMA VE YARDIMCILAR) ===

import { getDocs, collection, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// =================================================================
// 1. SABİT VERİLER (CONFIG)
// =================================================================

// Alanlar Listesi
export const ALANLAR = ["Sayısal (MF)", "Eşit Ağırlık (TM)", "Sözel (TS)", "Yabancı Dil"];

// Ders Havuzları (Sınıflara Göre)
export const SUBJECT_DATA = {
    ORTAOKUL_5_6_7: ["Fen Bilimleri", "İngilizce", "Matematik", "Sosyal Bilgiler", "Türkçe", "Din Kültürü"],
    LGS: ["Türkçe", "Matematik", "Fen Bilimleri", "Din Kültürü", "İngilizce", "T.C. İnkılap Tarihi"],
    LISE_9_10: ["Biyoloji", "Coğrafya", "Fizik", "Kimya", "Matematik", "Tarih", "Türk Dili ve Edebiyatı", "Din Kültürü", "İngilizce", "Felsefe"],
    LISE_11: ["Biyoloji", "Coğrafya", "Fizik", "Kimya", "Matematik", "Tarih", "Türk Dili ve Edebiyatı", "Felsefe", "Din Kültürü", "İngilizce"],
    TYT: ["Türkçe", "Matematik", "Biyoloji", "Coğrafya", "Din Kültürü", "Felsefe", "Fizik", "Geometri", "Kimya", "Tarih"],
    AYT: ["Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih-1", "Coğrafya-1", "Tarih-2", "Coğrafya-2", "Felsefe Grubu", "Din Kültürü"],
    YDS: ["Yabancı Dil"]
};

// Sınav Kuralları ve Katsayılar (Merkezi Yönetim)
export const EXAM_CONFIG = {
    'LGS': { 
        wrongRatio: 3, // 3 Yanlış 1 Doğruyu Götürür
        subjects: [
            {name:'Türkçe', max:20}, {name:'Matematik', max:20}, {name:'Fen Bilimleri', max:20},
            {name:'T.C. İnkılap', max:10}, {name:'Din Kültürü', max:10}, {name:'İngilizce', max:10}
        ] 
    },
    'TYT': { 
        wrongRatio: 4, 
        subjects: [
            {name:'Türkçe', max:40}, {name:'Matematik', max:40}, 
            {name:'Sosyal', max:20}, {name:'Fen', max:20}
        ] 
    },
    'AYT': { 
        wrongRatio: 4, 
        subjects: [
            {name:'Matematik', max:40}, {name:'Fizik', max:14}, {name:'Kimya', max:13}, {name:'Biyoloji', max:13},
            {name:'Edebiyat', max:24}, {name:'Tarih-1', max:10}, {name:'Coğrafya-1', max:6},
            {name:'Tarih-2', max:11}, {name:'Coğrafya-2', max:11}, 
            {name:'Felsefe Gr.', max:12}, {name:'Din', max:6}
        ] 
    },
    'YDS': { 
        wrongRatio: 0, // Yanlış doğruyu götürmez (Genelde)
        subjects: [{name:'Yabancı Dil', max:80}] 
    },
    'Diger': { 
        wrongRatio: 4, 
        subjects: [] // Dinamik
    }
};

// Sınıf Seviyesine Göre Sınav Türleri
export const CLASS_LEVEL_RULES = {
    'ORTAOKUL': { types: ['LGS', 'Diger'], defaultRatio: 3 },
    'LISE': { types: ['TYT', 'AYT', 'YDS', 'Diger'], defaultRatio: 4 }
};

// =================================================================
// 2. DOM MANİPÜLASYON YARDIMCILARI
// =================================================================

// Dinamik Ders Seçimi Render Fonksiyonu
// Dinamik Ders Seçimi Render Fonksiyonu
export function renderStudentOptions(sinif, optionsContainerId, subjectsContainerId, selectedSubjects = []) {
    const optionsContainer = document.getElementById(optionsContainerId);
    const subjectsContainer = document.getElementById(subjectsContainerId);
    
    if (!optionsContainer || !subjectsContainer) return;

    optionsContainer.innerHTML = '';
    let activeSubjects = new Set(); 

    // --- ORTAOKUL (5-8) ---
    if (['5. Sınıf', '6. Sınıf', '7. Sınıf'].includes(sinif)) {
        SUBJECT_DATA.ORTAOKUL_5_6_7.forEach(d => activeSubjects.add(d));
        
        // 7. Sınıf LGS Seçeneği
        if (sinif === '7. Sınıf') {
            // Ana dersleri korumak için "protectedSet" oluşturuyoruz
            const protectedSet = new Set(activeSubjects);
            addCheckboxOption(optionsContainer, "LGS Hazırlık Dersleri Ekle", SUBJECT_DATA.LGS, activeSubjects, subjectsContainer, selectedSubjects, protectedSet);
        }
    }
    else if (sinif === '8. Sınıf' || sinif === '8. Sınıf (LGS)') {
        SUBJECT_DATA.LGS.forEach(d => activeSubjects.add(d));
    }

    // --- LİSE (9-12 & MEZUN) ---
    else if (['9. Sınıf', '10. Sınıf'].includes(sinif)) {
        SUBJECT_DATA.LISE_9_10.forEach(d => activeSubjects.add(d));
    }
    else if (sinif === '11. Sınıf') {
        optionsContainer.appendChild(createAreaSelect());
        SUBJECT_DATA.LISE_11.forEach(d => activeSubjects.add(d));
        
        // TYT Seçeneği
        // Ana dersleri korumak için "protectedSet" oluşturuyoruz
        const protectedSet = new Set(activeSubjects);
        addCheckboxOption(optionsContainer, "TYT Çalışması Ekle", SUBJECT_DATA.TYT, activeSubjects, subjectsContainer, selectedSubjects, protectedSet);
    }
    else if (['12. Sınıf', '12. Sınıf (YKS)', 'Mezun'].includes(sinif)) {
        optionsContainer.appendChild(createAreaSelect());
        
        // Sınav Seçenekleri (TYT, AYT, YDS)
        const examDiv = document.createElement('div');
        examDiv.className = "flex flex-wrap gap-4 mt-3 p-3 bg-gray-50 rounded border border-gray-200";
        examDiv.innerHTML = `
            <label class="flex items-center cursor-pointer"><input type="checkbox" value="TYT" class="exam-opt h-4 w-4 text-indigo-600 rounded border-gray-300"><span class="ml-2 text-sm">TYT</span></label>
            <label class="flex items-center cursor-pointer"><input type="checkbox" value="AYT" class="exam-opt h-4 w-4 text-indigo-600 rounded border-gray-300"><span class="ml-2 text-sm">AYT</span></label>
            <label class="flex items-center cursor-pointer"><input type="checkbox" value="YDS" class="exam-opt h-4 w-4 text-indigo-600 rounded border-gray-300"><span class="ml-2 text-sm">YDS</span></label>
        `;
        optionsContainer.appendChild(examDiv);

        const updateExams = () => {
            activeSubjects.clear();
            const checked = Array.from(examDiv.querySelectorAll('.exam-opt:checked')).map(c => c.value);
            if (checked.includes('TYT')) SUBJECT_DATA.TYT.forEach(d => activeSubjects.add(d));
            if (checked.includes('AYT')) SUBJECT_DATA.AYT.forEach(d => activeSubjects.add(d));
            if (checked.includes('YDS')) SUBJECT_DATA.YDS.forEach(d => activeSubjects.add(d));
            renderCheckboxes(activeSubjects, subjectsContainer, selectedSubjects);
        };

        examDiv.querySelectorAll('.exam-opt').forEach(cb => cb.addEventListener('change', updateExams));
        
        if (selectedSubjects.length > 0) {
            if (selectedSubjects.some(s => SUBJECT_DATA.TYT.includes(s))) examDiv.querySelector('input[value="TYT"]').checked = true;
            if (selectedSubjects.some(s => SUBJECT_DATA.AYT.includes(s))) examDiv.querySelector('input[value="AYT"]').checked = true;
            if (selectedSubjects.some(s => SUBJECT_DATA.YDS.includes(s))) examDiv.querySelector('input[value="YDS"]').checked = true;
            updateExams();
        } else {
            examDiv.querySelector('input[value="TYT"]').click();
        }
        return; 
    }

    renderCheckboxes(activeSubjects, subjectsContainer, selectedSubjects);
}

// Yardımcı: Checkbox Opsiyonu Ekleme (GÜNCELLENEN KISIM)
function addCheckboxOption(container, labelText, dataSet, activeSet, renderTarget, selectedList, protectedSet = null) {
    const div = document.createElement('div');
    div.className = "flex items-center mt-2 p-2 bg-indigo-50 rounded border border-indigo-100 animate-fade-in";
    const uniqueId = `opt-${Math.random().toString(36).substr(2,9)}`;
    div.innerHTML = `
        <input type="checkbox" id="${uniqueId}" class="h-4 w-4 text-indigo-600 rounded border-gray-300 cursor-pointer">
        <label for="${uniqueId}" class="ml-2 text-sm text-gray-700 font-medium cursor-pointer select-none">${labelText}</label>
    `;
    container.appendChild(div);
    
    div.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) {
            // Seçilirse listeye ekle
            dataSet.forEach(d => activeSet.add(d));
        } else {
            // --- DÜZELTİLEN KISIM: TİK KALDIRILIRSA SİL ---
            dataSet.forEach(d => {
                // Eğer bu ders "korunan" (ana sınıf dersi) değilse sil.
                // Örneğin: 7. Sınıfta "Matematik" zaten var. LGS seçilip kaldırılsa bile Matematik silinmemeli.
                if (protectedSet && !protectedSet.has(d)) {
                    activeSet.delete(d);
                } else if (!protectedSet) {
                    activeSet.delete(d);
                }
            });
        }
        renderCheckboxes(activeSet, renderTarget, selectedList);
    });
}

function createAreaSelect() {
    const div = document.createElement('div');
    div.innerHTML = `
        <label class="block text-xs font-bold text-gray-500 mb-1">Alan Seçimi</label>
        <select class="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">Alan Seçiniz...</option>
            ${ALANLAR.map(a => `<option>${a}</option>`).join('')}
        </select>
    `;
    return div;
}

function renderCheckboxes(subjectSet, container, selectedList = []) {
    container.innerHTML = '';
    if (subjectSet.size === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 col-span-2 text-center py-4">Lütfen ders/sınav türü seçiniz.</p>';
        return;
    }

    Array.from(subjectSet).sort().forEach(ders => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors';
        const uniqueId = `chk-${ders.replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2,5)}`;
        
        const isChecked = selectedList.length > 0 ? selectedList.includes(ders) : true;

        wrapper.innerHTML = `
            <input type="checkbox" id="${uniqueId}" value="${ders}" class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer" ${isChecked ? 'checked' : ''}>
            <label for="${uniqueId}" class="ml-2 block text-sm text-gray-700 cursor-pointer select-none w-full">${ders}</label>
        `;
        container.appendChild(wrapper);
    });
}

// =================================================================
// 3. GENEL YARDIMCILAR & UTILS
// =================================================================

export let activeListeners = {
    studentUnsubscribe: null,
    soruTakibiUnsubscribe: null,
    hedeflerUnsubscribe: null,
    odevlerUnsubscribe: null,
    notlarUnsubscribe: null,
    ajandaUnsubscribe: null,
    muhasebeUnsubscribe: null,
    chatUnsubscribe: null,
    islemGecmisiUnsubscribe: null,
    upcomingAjandaUnsubscribe: null,
    pendingOdevUnsubscribe: null,
    pendingSoruListUnsubscribe: null,
    pendingDenemeListUnsubscribe: null,
    pendingOdevListUnsubscribe: null,
    completedHomeworksUnsubscribe: null,
    denemelerUnsubscribe: null,
    unreadMessagesUnsubscribe: null
};

export function cleanUpListeners() {
    for (const key in activeListeners) {
        if (activeListeners[key]) {
            activeListeners[key]();
            activeListeners[key] = null;
        }
    }
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0);
}

export function formatDateTR(dateStr) {
    if (!dateStr) return '';
    try {
        const [year, month, day] = dateStr.split('-');
        return `${day}.${month}.${year}`;
    } catch (e) { return dateStr; }
}

export async function populateStudentSelect(db, currentUserId, appId, selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Yükleniyor...</option>';
    
    try {
        const q = query(collection(db, "artifacts", appId, "users", currentUserId, "ogrencilerim"), orderBy("ad"));
        const snapshot = await getDocs(q);
        
        select.innerHTML = '<option value="" disabled selected>Öğrenci seçin</option>';
        
        if (snapshot.empty) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Öğrenci Bulunamadı";
            opt.disabled = true;
            select.appendChild(opt);
            return;
        }
        
        snapshot.forEach(doc => {
            const s = doc.data();
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = `${s.ad} ${s.soyad}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Öğrenci listesi hatası:", error);
        select.innerHTML = '<option value="">Hata oluştu</option>';
    }
}

export function renderPlaceholderSayfasi(sayfaAdi) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    mainContentTitle.textContent = sayfaAdi;
    mainContentArea.innerHTML = `
        <div class="flex flex-col items-center justify-center h-96 text-gray-400">
            <i class="fa-solid fa-person-digging text-4xl mb-4 opacity-50"></i>
            <h2 class="text-xl font-semibold text-gray-600">${sayfaAdi}</h2>
            <p class="mt-2 text-sm">Bu modül yapım aşamasındadır.</p>
        </div>`;
}

// Geriye dönük uyumluluk
export const renderDersSecimi = renderStudentOptions;

// =================================================================
// 4. MODAL & NAVİGASYON GEÇMİŞİ YÖNETİMİ
// =================================================================

export function openModalWithBackHistory(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; 
        // URL'yi değiştirmeden history'e durum ekle
        window.history.pushState({ modalId: modalId }, '', window.location.href);
    }
}

export function closeModalWithBackHistory(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        // Manuel kapatmalarda history back yapmaya gerek yok, 
        // kullanıcı "Geri" tuşuna basarsa popstate eventi yakalar.
    }
}

// Global Popstate Listener (Sadece bir kez tanımlanmalı, app.js içinde zaten var ama burada referans olsun)
// window.addEventListener('popstate', ...) -> app.js içinde yönetiliyor.
