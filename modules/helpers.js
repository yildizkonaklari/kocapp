// === MODULES/HELPERS.JS ===

import { getDocs, collection, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 1. DERS HAVUZLARI VE SABİTLER ---
export const SUBJECT_DATA = {
    ORTAOKUL_5_6_7: ["Fen Bilimleri", "İngilizce", "Matematik", "Sosyal Bilgiler", "Türkçe"],
    LGS: ["Türkçe", "Matematik", "Fen Bilimleri", "Din Kültürü ve Ahlak Bilgisi", "İngilizce", "T.C. İnkılap Tarihi ve Atatürkçülük"],
    LISE_9_10: ["Biyoloji", "Coğrafya", "Fizik", "Kimya", "Matematik", "Tarih", "Türk Dili ve Edebiyatı"],
    LISE_11: ["Biyoloji", "Coğrafya", "Fizik", "Kimya", "Matematik", "Tarih", "Türk Dili ve Edebiyatı"],
    TYT: ["Türkçe", "Matematik", "Biyoloji", "Coğrafya", "Din Kültürü ve Ahlak Bilgisi", "Felsefe", "Fizik", "Geometri", "Kimya", "Tarih"],
    AYT: ["Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Geometri", "Mantık", "Psikoloji", "Sosyoloji"],
    YDS: ["Yabancı Dil Sınavı"]
};

export const ALANLAR = ["Sayısal (MF)", "Eşit Ağırlık (TM)", "Sözel (TS)", "Yabancı Dil"];

// --- 2. DİNAMİK SEÇENEK VE DERS RENDER FONKSİYONU ---
export function renderStudentOptions(sinif, optionsContainerId, subjectsContainerId, selectedSubjects = []) {
    const optionsContainer = document.getElementById(optionsContainerId);
    const subjectsContainer = document.getElementById(subjectsContainerId);
    
    if (!optionsContainer || !subjectsContainer) return;

    // 1. Seçenekler Alanını Temizle ve Yeniden Oluştur
    optionsContainer.innerHTML = '';
    let activeSubjects = new Set(); // Tekrarları önlemek için Set kullanıyoruz

    // --- 5, 6, 7. SINIF ---
    if (['5. Sınıf', '6. Sınıf', '7. Sınıf'].includes(sinif)) {
        // Varsayılan dersleri ekle
        SUBJECT_DATA.ORTAOKUL_5_6_7.forEach(d => activeSubjects.add(d));

        // 7. Sınıf için LGS Opsiyonu
        if (sinif === '7. Sınıf') {
            const div = document.createElement('div');
            div.className = "flex items-center mb-3 p-2 bg-purple-50 rounded border border-purple-100";
            div.innerHTML = `
                <input type="checkbox" id="opt-lgs-${optionsContainerId}" class="h-4 w-4 text-purple-600 rounded border-gray-300">
                <label for="opt-lgs-${optionsContainerId}" class="ml-2 text-sm text-gray-700 font-medium">LGS Hazırlık Dersleri Ekle</label>
            `;
            optionsContainer.appendChild(div);

            // Listener
            div.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    SUBJECT_DATA.LGS.forEach(d => activeSubjects.add(d));
                } else {
                    // Sadece LGS'ye özgü olanları çıkar (Ortak dersler kalabilir)
                    // Basitlik için: Listeyi sıfırla ve tekrar oluştur
                    activeSubjects.clear();
                    SUBJECT_DATA.ORTAOKUL_5_6_7.forEach(d => activeSubjects.add(d));
                }
                renderCheckboxes(activeSubjects, subjectsContainer, selectedSubjects);
            });
        }
    }

    // --- 8. SINIF ---
    else if (sinif === '8. Sınıf') {
        SUBJECT_DATA.LGS.forEach(d => activeSubjects.add(d));
    }

    // --- 9 ve 10. SINIF ---
    else if (['9. Sınıf', '10. Sınıf'].includes(sinif)) {
        SUBJECT_DATA.LISE_9_10.forEach(d => activeSubjects.add(d));
    }

    // --- 11. SINIF ---
    else if (sinif === '11. Sınıf') {
        // Alan Seçimi
        const areaDiv = createAreaSelect(optionsContainerId);
        optionsContainer.appendChild(areaDiv);

        // Varsayılan 11. Sınıf Dersleri
        SUBJECT_DATA.LISE_11.forEach(d => activeSubjects.add(d));

        // TYT Opsiyonu
        const tytDiv = document.createElement('div');
        tytDiv.className = "flex items-center mt-2 p-2 bg-blue-50 rounded border border-blue-100";
        tytDiv.innerHTML = `
            <input type="checkbox" id="opt-tyt-${optionsContainerId}" class="h-4 w-4 text-blue-600 rounded border-gray-300">
            <label for="opt-tyt-${optionsContainerId}" class="ml-2 text-sm text-gray-700 font-medium">TYT Çalışması Ekle</label>
        `;
        optionsContainer.appendChild(tytDiv);

        // Listener
        tytDiv.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) SUBJECT_DATA.TYT.forEach(d => activeSubjects.add(d));
            else {
                // Reset ve yeniden oluştur (Daha temiz)
                activeSubjects.clear();
                SUBJECT_DATA.LISE_11.forEach(d => activeSubjects.add(d));
            }
            renderCheckboxes(activeSubjects, subjectsContainer, selectedSubjects);
        });
    }

    // --- 12. SINIF ve MEZUN ---
    else if (['12. Sınıf', 'Mezun'].includes(sinif)) {
        // Alan Seçimi
        const areaDiv = createAreaSelect(optionsContainerId);
        optionsContainer.appendChild(areaDiv);

        // Sınav Seçenekleri (TYT, AYT, YDS)
        const examDiv = document.createElement('div');
        examDiv.className = "flex flex-wrap gap-4 mt-3 p-3 bg-gray-50 rounded border border-gray-200";
        examDiv.innerHTML = `
            <label class="flex items-center"><input type="checkbox" value="TYT" class="exam-opt h-4 w-4 text-indigo-600"><span class="ml-2 text-sm">TYT</span></label>
            <label class="flex items-center"><input type="checkbox" value="AYT" class="exam-opt h-4 w-4 text-indigo-600"><span class="ml-2 text-sm">AYT</span></label>
            <label class="flex items-center"><input type="checkbox" value="YDS" class="exam-opt h-4 w-4 text-indigo-600"><span class="ml-2 text-sm">YDS</span></label>
        `;
        optionsContainer.appendChild(examDiv);

        // Listener (Herhangi bir sınav kutucuğu değiştiğinde)
        examDiv.querySelectorAll('.exam-opt').forEach(cb => {
            cb.addEventListener('change', () => {
                activeSubjects.clear();
                
                const checkedExams = Array.from(examDiv.querySelectorAll('.exam-opt:checked')).map(c => c.value);
                
                if (checkedExams.includes('TYT')) SUBJECT_DATA.TYT.forEach(d => activeSubjects.add(d));
                if (checkedExams.includes('AYT')) SUBJECT_DATA.AYT.forEach(d => activeSubjects.add(d));
                if (checkedExams.includes('YDS')) SUBJECT_DATA.YDS.forEach(d => activeSubjects.add(d));

                renderCheckboxes(activeSubjects, subjectsContainer, selectedSubjects);
            });
        });
        
        // 12. Sınıf/Mezun için başlangıçta boş gelir, seçim yapıldıkça dolar.
        // İstersen varsayılan olarak TYT'yi seçili getirebiliriz:
        // examDiv.querySelector('input[value="TYT"]').click(); 
    }

    // İlk Render (Seçimler yapılmadan önceki varsayılanlar)
    renderCheckboxes(activeSubjects, subjectsContainer, selectedSubjects);
}

// --- Yardımcı: Alan Seçimi HTML Oluşturucu ---
function createAreaSelect(idSuffix) {
    const div = document.createElement('div');
    div.innerHTML = `
        <label class="block text-xs font-bold text-gray-500 mb-1">Alan Seçimi</label>
        <select class="w-full p-2 border border-gray-300 rounded text-sm bg-white">
            <option value="">Alan Seçiniz...</option>
            ${ALANLAR.map(a => `<option>${a}</option>`).join('')}
        </select>
    `;
    return div;
}

// --- Yardımcı: Checkbox'ları Render Et ---
function renderCheckboxes(subjectSet, container, selectedList = []) {
    container.innerHTML = '';
    
    if (subjectSet.size === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 col-span-2 text-center py-2">Lütfen yukarıdan seçim yapınız.</p>';
        return;
    }

    // Set'i Array'e çevir ve sırala
    const sortedSubjects = Array.from(subjectSet).sort();

    sortedSubjects.forEach(ders => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center p-1 hover:bg-gray-50 rounded';
        
        const uniqueId = `chk-${ders.replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2,5)}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = uniqueId;
        checkbox.value = ders;
        checkbox.className = 'h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer';
        
        // Eğer düzenleme modundaysak ve bu ders öğrencinin listesinde varsa seçili yap
        // Yeni öğrenciyse, varsayılan olarak hepsini seçili yap (veya isteğe bağlı boş)
        if (selectedList.length > 0) {
            if (selectedList.includes(ders)) checkbox.checked = true;
        } else {
            checkbox.checked = true; // Varsayılan: Hepsi seçili
        }

        const label = document.createElement('label');
        label.htmlFor = uniqueId;
        label.className = 'ml-2 block text-sm text-gray-700 cursor-pointer select-none w-full';
        label.textContent = ders;

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
}

// --- DİĞER YARDIMCILAR (Önceki dosyadakilerle aynı) ---
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

export function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0);
}

export function formatDateTR(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
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

export function renderPlaceholderSayfasi(sayfaAdi) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    mainContentTitle.textContent = sayfaAdi;
    mainContentArea.innerHTML = `<div class="bg-white p-10 rounded-lg shadow text-center"><h2 class="text-2xl font-semibold text-gray-700">${sayfaAdi}</h2><p class="mt-4 text-gray-500">Bu bölüm şu anda yapım aşamasındadır.</p></div>`;
}

// renderDersSecimi fonksiyonu artık renderStudentOptions ile değiştirildiği için kaldırıldı veya alias yapılabilir.
// Geriye dönük uyumluluk için boş bir fonksiyon bırakabiliriz ama app.js'i güncelleyeceğiz.
export const renderDersSecimi = renderStudentOptions;

// =================================================================
// MOBİL GERİ TUŞU VE MODAL YÖNETİMİ
// =================================================================

// 1. Modal Açma Fonksiyonu (History Push Yapar)
export function openModalWithBackHistory(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // Flex ile ortalama yapıyorduk
        
        // Tarayıcı geçmişine sahte bir durum ekle
        // Bu sayede geri tuşuna basınca uygulama kapanmaz, sadece bu durum silinir
        window.history.pushState({ modalId: modalId }, '', window.location.href);
    }
}

// 2. Modal Kapatma Fonksiyonu (History Back Yapar - Eğer gerekirse)
export function closeModalWithBackHistory(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        
        // Eğer modal açıkken kodla kapatılıyorsa (iptal butonu vb.)
        // History'yi geri almalıyız ki stack şişmesin.
        // Ancak popstate eventi zaten tetiklendiyse (geri tuşuyla) bunu yapmamalıyız.
        // Bunu kontrol etmek zor olduğu için basitçe manuel kapatmalarda history.back() yapabiliriz
        // AMA: Kullanıcı geri tuşuna basmadıysa back() yapmak sayfayı değiştirebilir.
        // O yüzden en temiz yöntem: Sadece UI'ı kapatmak, history'yi back tuşuna bırakmak.
        // Veya: window.history.back(); (Dikkatli kullanılmalı)
    }
}

// 3. Geri Tuşunu Dinle (Popstate Event)
window.addEventListener('popstate', (event) => {
    // Eğer history state içinde bir modal ID varsa veya
    // Sayfada açık bir modal varsa onu kapat.
    
    // Tüm açık modalları bul
    const openModals = document.querySelectorAll('.fixed.inset-0:not(.hidden)');
    
    if (openModals.length > 0) {
        // En üstteki modalı kapat (Z-index'e göre veya son açılan)
        openModals.forEach(modal => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        });
        // Eventi tüket, başka işlem yapma
    } else {
        // Eğer açık modal yoksa ve geri tuşuna basıldıysa:
        // Sayfa değiştirmek istiyor olabilir veya uygulamadan çıkacak.
        // Single Page App (SPA) mantığında tab değişimi için de kullanılabilir.
    }
});
