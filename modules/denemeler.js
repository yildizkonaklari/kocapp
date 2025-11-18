// === DENEMELER MODÜLÜ (GLOBAL) ===
// Bu dosya, TÜM öğrencilerden gelen denemeleri onaylama ve analiz etme sayfasını yönetir.

// 1. GEREKLİ IMPORTLAR
import { 
    doc, 
    collectionGroup, // YENİ: Tüm 'denemeler' koleksiyonlarını sorgulamak için
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

// Chart.js instance'ını tutmak için (Global değişken)
let denemeBarChart = null;

// --- 2. ANA FONKSİYON: DENEMELER SAYFASI ---

/**
 * "Genel Denemeler" sayfasının ana HTML iskeletini çizer ve verileri yükler.
 * @param {object} db - Firestore veritabanı referansı
 * @param {string} currentUserId - Giriş yapmış koçun UID'si
 * @param {string} appId - Uygulama ID'si
 */
export function renderDenemelerSayfasi(db, currentUserId, appId) {
    const mainContentTitle = document.getElementById("mainContentTitle");
    const mainContentArea = document.getElementById("mainContentArea");
    
    mainContentTitle.textContent = "Genel Deneme Analizi";
    
    // HTML İskeleti
    mainContentArea.innerHTML = `
        <!-- KPI Kartları -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-chart-line"></i></div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">Ortalama Net (Onaylı)</p>
                    <h3 id="kpiAvgNet" class="text-2xl font-bold text-gray-800">0.00</h3>
                </div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-trophy"></i></div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">En Yüksek Net (Onaylı)</p>
                    <h3 id="kpiMaxNet" class="text-2xl font-bold text-gray-800">0.00</h3>
                </div>
            </div>
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
                <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl mr-4"><i class="fa-solid fa-file-signature"></i></div>
                <div>
                    <p class="text-sm text-gray-500 font-medium">Toplam Sınav (Onaylı)</p>
                    <h3 id="kpiTotalExams" class="text-2xl font-bold text-gray-800">0</h3>
                </div>
            </div>
        </div>

        <!-- Grafik ve Filtreler -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <!-- Grafik Alanı -->
            <div class="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 class="font-semibold text-gray-800 mb-4">Onaylı Netlerin Dağılımı (Son 10)</h3>
                <div class="h-64 relative">
                    <canvas id="denemeBarChart"></canvas>
                </div>
            </div>
            
            <!-- Bilgi/Filtre Alanı -->
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 class="font-semibold text-gray-800 mb-4">Bilgilendirme</h3>
                <div class="space-y-4 text-sm text-gray-600">
                    <p>Burada, <b>tüm öğrencilerinizin</b> girdiği deneme sınavlarını tek bir listede görebilirsiniz.</p>
                    <ul class="list-disc pl-5 space-y-2">
                        <li>Sarı satırlar öğrenci tarafından girilen ve <b>onayınızı bekleyen</b> sınavlardır.</li>
                        <li>Grafikler sadece <b>onaylanmış</b> sınavları baz alır.</li>
                        <li>Yanlış girilen sınavları "Reddet/Sil" butonu ile silebilirsiniz.</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Deneme Girişleri Listesi -->
        <div>
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Deneme Girişleri</h3>
            <div id="denemelerListContainer" class="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <p class="text-center text-gray-400 p-8">Tüm denemeler yükleniyor...</p>
            </div>
        </div>
    `;

    // Verileri yükle
    loadAllDenemeler(db, currentUserId, appId);
}

/**
 * Tüm öğrencilerin 'denemeler' alt koleksiyonlarını CollectionGroup sorgusu ile çeker.
 */
function loadAllDenemeler(db, currentUserId, appId) {
    const listContainer = document.getElementById("denemelerListContainer");

    // DİKKAT: Bu sorgu, 'denemeler' koleksiyon grubu için bir İNDEKS gerektirir.
    // İndeks: kocId (ASC), onayDurumu (ASC), eklenmeTarihi (DESC)
    // Eğer indeks yoksa konsolda bir link belirecektir.
    const q = query(
        collectionGroup(db, 'denemeler'),
        where('kocId', '==', currentUserId),
        orderBy('onayDurumu', 'asc'), // 'bekliyor' olanlar üste gelsin
        orderBy('eklenmeTarihi', 'desc')
    );
    
    // Önceki dinleyiciyi temizle
    if (activeListeners.denemeUnsubscribe) activeListeners.denemeUnsubscribe();

    activeListeners.denemeUnsubscribe = onSnapshot(q, (snapshot) => {
        const allDenemeler = [];
        snapshot.forEach(doc => {
            // parent.parent.id ile öğrenci ID'sini bulabiliriz ama 
            // veriyi kaydederken 'studentAd' ve 'sinif' eklediğimiz için gerek yok.
            allDenemeler.push({ id: doc.id, ...doc.data(), path: doc.ref.path });
        });
        
        // 1. Listeyi çiz
        renderDenemelerList(allDenemeler, db);
        
        // 2. Sadece ONAYLANMIŞ olanlarla istatistikleri ve grafiği hesapla
        const onayliDenemeler = allDenemeler.filter(d => d.onayDurumu === 'onaylandi');
        calculateAndRenderStats(onayliDenemeler);
        renderDenemelerChart(onayliDenemeler);

    }, (error) => {
        console.error("Tüm denemeler yüklenirken hata:", error);
        if (error.code === 'failed-precondition') {
            listContainer.innerHTML = `<p class="text-red-500 text-center p-8"><b>Veri Yüklenemedi!</b><br>Bu sayfanın çalışması için bir Firebase İndeksi gerekiyor. Lütfen F12 > Konsol'u açın ve görünen linke tıklayarak indeksi oluşturun.</p>`;
        } else {
            listContainer.innerHTML = `<p class="text-red-500 text-center p-8">Hata: ${error.message}</p>`;
        }
    });
}

/**
 * KPI Kartlarını (Ortalama, Max, Toplam) hesaplar ve doldurur.
 */
function calculateAndRenderStats(onayliDenemeler) {
    if (onayliDenemeler.length === 0) {
        document.getElementById('kpiAvgNet').textContent = "0.00";
        document.getElementById('kpiMaxNet').textContent = "0.00";
        document.getElementById('kpiTotalExams').textContent = "0";
        return;
    }

    let totalNet = 0;
    let maxNet = 0;
    
    onayliDenemeler.forEach(d => {
        // Net değerini güvenli bir şekilde sayıya çevir
        const net = parseFloat(d.toplamNet) || 0;
        totalNet += net;
        if (net > maxNet) {
            maxNet = net;
        }
    });

    const avgNet = totalNet / onayliDenemeler.length;

    document.getElementById('kpiAvgNet').textContent = avgNet.toFixed(2);
    document.getElementById('kpiMaxNet').textContent = maxNet.toFixed(2);
    document.getElementById('kpiTotalExams').textContent = onayliDenemeler.length;
}

/**
 * Onaylı denemelerin grafiğini çizer.
 */
function renderDenemelerChart(onayliDenemeler) {
    const ctx = document.getElementById('denemeBarChart');
    if (!ctx) return;
    
    // Grafiği çizmeden önce eskisini yok et
    if (denemeBarChart) {
        denemeBarChart.destroy();
    }

    // Veriyi tarihe göre sırala ve son 10 tanesini al
    const sortedData = onayliDenemeler
        .sort((a,b) => a.tarih.localeCompare(b.tarih))
        .slice(-10); // Son 10
    
    const labels = sortedData.map(d => `${formatDateTR(d.tarih)} (${d.studentAd ? d.studentAd.split(' ')[0] : '?'})`);
    const dataPoints = sortedData.map(d => (parseFloat(d.toplamNet) || 0).toFixed(2));
    
    denemeBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Toplam Net',
                data: dataPoints,
                backgroundColor: 'rgba(124, 58, 237, 0.6)', // purple-600 with opacity
                borderColor: '#7c3aed',
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 20,
            }]
        },
        options: {
            indexAxis: 'y', // Yatay Bar Grafik
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { beginAtZero: true, grid: { display: true, color: '#f3f4f6' } },
                y: { grid: { display: false } }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    padding: 12,
                    titleFont: { size: 13 },
                    bodyFont: { size: 13 }
                }
            }
        }
    });
}

/**
 * Onaylama ve listeleme arayüzünü çizer.
 */
function renderDenemelerList(allDenemeler, db) {
    const container = document.getElementById("denemelerListContainer");

    if (allDenemeler.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center p-8">Henüz girilmiş deneme yok.</p>';
        return;
    }

    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öğrenci</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınav Adı</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${allDenemeler.map(d => {
                        const isPending = d.onayDurumu === 'bekliyor';
                        const netVal = parseFloat(d.toplamNet) || 0;
                        
                        return `
                        <tr class="${isPending ? 'bg-yellow-50' : 'hover:bg-gray-50'} transition-colors">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatDateTR(d.tarih)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">${d.studentAd || 'Bilinmiyor'}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${d.ad}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                <span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">${d.tur}</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">${netVal.toFixed(2)}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                                ${isPending ? 
                                    '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200"><i class="fa-regular fa-clock mr-1"></i>Onay Bekliyor</span>' : 
                                    '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200"><i class="fa-solid fa-check mr-1"></i>Onaylandı</span>'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
                                ${isPending ? 
                                    `<button data-path="${d.path}" class="btn-onayla-deneme text-green-600 hover:text-green-800 font-bold mr-3 transition-colors" title="Onayla"><i class="fa-solid fa-check"></i></button>
                                     <button data-path="${d.path}" class="btn-sil-deneme text-red-600 hover:text-red-800 transition-colors" title="Reddet/Sil"><i class="fa-solid fa-trash"></i></button>` :
                                    `<button data-path="${d.path}" class="btn-sil-deneme text-gray-400 hover:text-red-600 transition-colors" title="Sil"><i class="fa-regular fa-trash-can"></i></button>`}
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Event Listeners - Onayla
    document.querySelectorAll('.btn-onayla-deneme').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const path = e.currentTarget.dataset.path;
            try {
                // Belge yolunu (path) kullanarak direkt güncelleme yapıyoruz
                await updateDoc(doc(db, path), { onayDurumu: 'onaylandi' });
                // onSnapshot tabloyu otomatik güncelleyecektir
            } catch (error) {
                console.error("Onay hatası:", error);
                alert("Onaylanırken bir hata oluştu.");
            }
        });
    });
    
    // Event Listeners - Sil
    document.querySelectorAll('.btn-sil-deneme').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const path = e.currentTarget.dataset.path;
            if (confirm("Bu deneme girişini silmek istediğinize emin misiniz?")) {
                try {
                    await deleteDoc(doc(db, path));
                } catch (error) {
                    console.error("Silme hatası:", error);
                    alert("Silinirken bir hata oluştu.");
                }
            }
        });
    });
}
