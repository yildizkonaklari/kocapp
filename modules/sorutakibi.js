// === GLOBAL SORU TAKİBİ MODÜLÜ ===
// Bu dosya, TÜM öğrencilerden gelen soru girişlerini onaylama ve analiz etme sayfasını yönetir.

// 1. GEREKLİ IMPORTLAR
import { 
    doc, 
    collectionGroup, // YENİ: Tüm 'soruTakibi' koleksiyonlarını sorgulamak için
    query, 
    onSnapshot, 
    updateDoc, 
    deleteDoc,
    where, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    activeListeners, 
    formatDateTR 
} from './helpers.js';

// --- 2. ANA FONKSİYON: SORU TAKİBİ SAYFASI ---

export function renderSoruTakibiSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Genel Soru Takibi";
    
    // HTML İskeleti
    mainContentArea.innerHTML = `
        <!-- KPI Kartları -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Toplam Çözülen (Onaylı)</p>
                <h3 id="kpiTotalQuestions" class="text-3xl font-bold text-purple-600">...</h3>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">Bekleyen Onaylar</p>
                <h3 id="kpiPendingApprovals" class="text-3xl font-bold text-yellow-600">...</h3>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">En Çok Çalışılan Ders</p>
                <h3 id="kpiTopSubject" class="text-2xl font-bold text-gray-800">...</h3>
            </div>
        </div>

        <!-- Soru Girişleri Listesi (Onay Bekleyenler Üstte) -->
        <div>
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold text-gray-800">Öğrenci Soru Girişleri</h3>
                <!-- Filtreleme (İleride eklenebilir) -->
            </div>
            <div id="globalSoruListContainer" class="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <p class="text-center text-gray-400 p-8">Veriler yükleniyor...</p>
            </div>
        </div>
    `;

    // Verileri yükle
    loadAllSoruTakibi(db, currentUserId, appId);
}

/**
 * Tüm öğrencilerin 'soruTakibi' alt koleksiyonlarını CollectionGroup sorgusu ile çeker.
 */
function loadAllSoruTakibi(db, currentUserId, appId) {
    const listContainer = document.getElementById("globalSoruListContainer");

    // DİKKAT: Bu sorgu için de bir İNDEKS gerekir (kocId ASC, onayDurumu ASC).
    // Daha önce "Onay Bekleyenler" kartı için bu indeksi oluşturmuş olmalısınız.
    const q = query(
        collectionGroup(db, 'soruTakibi'),
        where('kocId', '==', currentUserId),
        orderBy('onayDurumu', 'asc'), // 'bekliyor' olanlar üste gelsin
        orderBy('eklenmeTarihi', 'desc')
    );

    activeListeners.soruTakibiUnsubscribe = onSnapshot(q, (snapshot) => {
        const allEntries = [];
        snapshot.forEach(doc => {
            // Öğrenci adını bulmak için parent path veya veri içindeki bilgiyi kullanabiliriz.
            // Veri kaydederken 'studentAd' eklemediysek burada göstermek zor olabilir.
            // Ancak şimdilik sadece veriyi listeleyelim.
            allEntries.push({ id: doc.id, ...doc.data(), path: doc.ref.path });
        });
        
        renderGlobalSoruList(allEntries, db);
        calculateAndRenderStats(allEntries);

    }, (error) => {
        console.error("Tüm sorular yüklenirken hata:", error);
        listContainer.innerHTML = `<p class="text-red-500 text-center p-8">Hata: ${error.message}. Konsolu kontrol edin (İndeks eksik olabilir).</p>`;
    });
}

/**
 * KPI Kartlarını hesaplar.
 */
function calculateAndRenderStats(entries) {
    let totalQuestions = 0;
    let pendingCount = 0;
    const subjectCounts = {};

    entries.forEach(e => {
        if (e.onayDurumu === 'onaylandi') {
            totalQuestions += (e.adet || (e.dogru + e.yanlis + e.bos) || 0);
            
            // En çok çalışılan ders hesabı
            if(e.ders) {
                subjectCounts[e.ders] = (subjectCounts[e.ders] || 0) + (e.adet || 0);
            }
        } else if (e.onayDurumu === 'bekliyor') {
            pendingCount++;
        }
    });

    // En popüler dersi bul
    let topSubject = '-';
    let maxCount = 0;
    for (const [subject, count] of Object.entries(subjectCounts)) {
        if (count > maxCount) {
            maxCount = count;
            topSubject = subject;
        }
    }

    document.getElementById('kpiTotalQuestions').textContent = totalQuestions;
    document.getElementById('kpiPendingApprovals').textContent = pendingCount;
    document.getElementById('kpiTopSubject').textContent = topSubject;
}

/**
 * Listeyi çizer.
 */
function renderGlobalSoruList(entries, db) {
    const container = document.getElementById("globalSoruListContainer");

    if (entries.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center p-8">Henüz veri girişi yok.</p>';
        return;
    }

    container.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ders</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konu</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adet</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlem</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${entries.map(e => {
                    const isPending = e.onayDurumu === 'bekliyor';
                    const adet = e.adet || (e.dogru + e.yanlis + e.bos) || 0;
                    
                    return `
                    <tr class="${isPending ? 'bg-yellow-50' : 'hover:bg-gray-50'}">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatDateTR(e.tarih)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${e.ders}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${e.konu || '-'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">${adet}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            ${isPending ? 
                                '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Onay Bekliyor</span>' : 
                                '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Onaylandı</span>'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
                            ${isPending ? 
                                `<button data-path="${e.path}" class="btn-global-onayla text-green-600 hover:text-green-800 font-bold mr-2">Onayla</button>
                                 <button data-path="${e.path}" class="btn-global-sil text-red-600 hover:text-red-800">Sil</button>` :
                                `<button data-path="${e.path}" class="btn-global-sil text-gray-400 hover:text-red-600">Sil</button>`}
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    // Event Listeners
    document.querySelectorAll('.btn-global-onayla').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const path = e.currentTarget.dataset.path;
            await updateDoc(doc(db, path), { onayDurumu: 'onaylandi' });
        });
    });
    
    document.querySelectorAll('.btn-global-sil').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const path = e.currentTarget.dataset.path;
            if (confirm("Bu kaydı silmek istediğinize emin misiniz?")) {
                await deleteDoc(doc(db, path));
            }
        });
    });
}
