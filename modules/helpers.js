// === MODULES/HELPERS.JS ===

import { getDocs, collection, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- SABİTLER ---
export const SINAV_DERSLERI = {
    'TYT': {
        netKural: 4,
        dersler: [
            { id: 'tyt_turkce', ad: 'Türkçe', soru: 40 },
            { id: 'tyt_tarih_sos', ad: 'Tarih (Sosyal)', soru: 5 },
            { id: 'tyt_cog_sos', ad: 'Coğrafya (Sosyal)', soru: 5 },
            { id: 'tyt_felsefe_sos', ad: 'Felsefe (Sosyal)', soru: 5 },
            { id: 'tyt_din_sos', ad: 'Din Kültürü (Sosyal)', soru: 5 },
            { id: 'tyt_temel_mat', ad: 'Temel Matematik', soru: 32 },
            { id: 'tyt_geometri', ad: 'Geometri (Mat)', soru: 8 },
            { id: 'tyt_fizik', ad: 'Fizik (Fen)', soru: 7 },
            { id: 'tyt_kimya', ad: 'Kimya (Fen)', soru: 7 },
            { id: 'tyt_biyoloji', ad: 'Biyoloji (Fen)', soru: 6 }
        ]
    },
    'AYT': {
        netKural: 4,
        dersler: [
            { id: 'ayt_edebiyat', ad: 'Türk Dili ve Edebiyatı', soru: 24 },
            { id: 'ayt_tarih1', ad: 'Tarih-1 (Edeb-Sos1)', soru: 10 },
            { id: 'ayt_cografya1', ad: 'Coğrafya-1 (Edeb-Sos1)', soru: 6 },
            { id: 'ayt_tarih2', ad: 'Tarih-2 (Sos-2)', soru: 11 },
            { id: 'ayt_cografya2', ad: 'Coğrafya-2 (Sos-2)', soru: 11 },
            { id: 'ayt_felsefe', ad: 'Felsefe Grubu (Sos-2)', soru: 12 },
            { id: 'ayt_din_sos2', ad: 'Din Kültürü (Sos-2)', soru: 6 },
            { id: 'ayt_mat', ad: 'Matematik (AYT)', soru: 40 },
            { id: 'ayt_fizik', ad: 'Fizik (Fen)', soru: 14 },
            { id: 'ayt_kimya', ad: 'Kimya (Fen)', soru: 13 },
            { id: 'ayt_biyoloji', ad: 'Biyoloji (Fen)', soru: 13 }
        ]
    },
    'LGS': {
        netKural: 3,
        dersler: [
            { id: 'lgs_turkce', ad: 'Türkçe', soru: 20 },
            { id: 'lgs_mat', ad: 'Matematik', soru: 20 },
            { id: 'lgs_fen', ad: 'Fen Bilimleri', soru: 20 },
            { id: 'lgs_inkilap', ad: 'T.C. İnkılap', soru: 10 },
            { id: 'lgs_din', ad: 'Din Kültürü', soru: 10 },
            { id: 'lgs_ingilizce', ad: 'Yabancı Dil', soru: 10 }
        ]
    },
    'YDS': {
        netKural: 0,
        dersler: [
            { id: 'yds_dil', ad: 'Yabancı Dil', soru: 80 }
        ]
    },
    'Diger': {
        netKural: 0,
        dersler: []
    }
};

export const DERS_HAVUZU = {
    'ORTAOKUL': [
        "Türkçe", "Matematik", "Fen Bilimleri", 
        "Sosyal Bilgiler", "T.C. İnkılap", "Din Kültürü", "İngilizce"
    ],
    'LISE': [
        "Türk Dili ve Edebiyatı", "Matematik", "Geometri",
        "Fizik", "Kimya", "Biyoloji",
        "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "İngilizce"
    ]
};

// --- DİNLEYİCİ YÖNETİMİ ---
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
    pendingSoruUnsubscribe: null,
    pendingDenemeUnsubscribe: null,
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

// --- FORMATLAMA ---
export function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0);
}

export function formatDateTR(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
}

// --- SELECT DOLDURMA ---
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
        select.innerHTML = '<option value="">Listeleme Hatası</option>';
    }
}

// --- DERS SEÇİMİ ---
export function renderDersSecimi(sinif, container, selectedDersler = []) {
    if (!container) return;
    container.innerHTML = '';
    let dersler = [];
    
    if (['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'].includes(sinif)) {
        dersler = DERS_HAVUZU['ORTAOKUL'];
    } else {
        dersler = DERS_HAVUZU['LISE'];
    }
    
    dersler.forEach(ders => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center';
        
        const uniqueId = `ders-${ders.replace(/[^a-zA-Z0-9]/g, '-')}-${container.id}-${Math.random().toString(36).substr(2, 5)}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = uniqueId;
        checkbox.value = ders;
        checkbox.className = 'student-ders-checkbox h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded';
        
        if (selectedDersler.length > 0) {
            if (selectedDersler.includes(ders)) checkbox.checked = true;
        } else {
            checkbox.checked = true;
        }

        const label = document.createElement('label');
        label.htmlFor = uniqueId;
        label.className = 'ml-2 block text-sm text-gray-900 cursor-pointer';
        label.textContent = ders;

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
}

export function renderPlaceholderSayfasi(sayfaAdi) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = sayfaAdi;
    mainContentArea.innerHTML = `
        <div class="bg-white p-10 rounded-lg shadow text-center">
            <h2 class="text-2xl font-semibold text-gray-700">${sayfaAdi}</h2>
            <p class="mt-4 text-gray-500">Bu bölüm şu anda yapım aşamasındadır.</p>
        </div>
    `;
}
