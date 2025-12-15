// === MODULES/PAKET.JS ===
import { formatCurrency, openModalWithBackHistory } from './helpers.js';

export function renderPaketSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Paket Yükselt";
    const area = document.getElementById("mainContentArea");

    area.innerHTML = `
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg mb-8 relative overflow-hidden animate-fade-in-up">
            <div class="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div class="relative z-10">
                <h2 class="text-2xl md:text-3xl font-bold mb-4">İşinizi Büyütün! 🚀</h2>
                <p class="text-indigo-100 mb-6 text-sm md:text-lg">Sınırsız öğrenci yönetimi ve yapay zeka destekli analizler ile koçluk kalitenizi artırın.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Sınırsız Öğrenci Ekleme</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Detaylı Deneme Analizleri</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Otomatik Ödev Takibi</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> 7/24 Teknik Destek</div>
                </div>
            </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 animate-fade-in-up" style="animation-delay: 0.1s;">
            <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">Fiyat Hesapla</h3>
            
            <div class="max-w-md mx-auto">
                <label class="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider text-center">Öğrenci Sayısı</label>
                <div class="relative flex items-center justify-center">
                    <button class="w-10 h-10 bg-gray-100 rounded-l-xl text-gray-600 hover:bg-gray-200 transition-colors" onclick="document.getElementById('inputStudentCount').stepDown(); document.getElementById('inputStudentCount').dispatchEvent(new Event('input'));"><i class="fa-solid fa-minus"></i></button>
                    <input type="number" id="inputStudentCount" min="2" value="10" class="w-24 p-2 text-center text-2xl font-bold border-y border-gray-200 focus:ring-0 outline-none text-indigo-600 appearance-none m-0">
                    <button class="w-10 h-10 bg-gray-100 rounded-r-xl text-gray-600 hover:bg-gray-200 transition-colors" onclick="document.getElementById('inputStudentCount').stepUp(); document.getElementById('inputStudentCount').dispatchEvent(new Event('input'));"><i class="fa-solid fa-plus"></i></button>
                </div>
                <p class="text-xs text-gray-400 mt-3 text-center">* En az 2 öğrenci. Birim fiyat: 33₺ / Ay</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
            
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col animate-fade-in-up" style="animation-delay: 0.2s;">
                <div class="text-center mb-4">
                    <span class="bg-gray-100 text-gray-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase">Esnek Plan</span>
                    <h4 class="text-lg font-bold text-gray-800 mt-3">Aylık Ödeme</h4>
                </div>
                <div class="text-center my-4">
                    <span class="text-3xl font-bold text-gray-900" id="priceMonthly">330₺</span>
                    <span class="text-gray-500 text-sm">/ay</span>
                </div>
                <p class="text-center text-xs text-gray-400 mb-6 flex-1">Her ay yenilenir, istediğin zaman iptal et.</p>
                <button class="btn-contact-modal w-full py-3 rounded-xl font-bold border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-colors">
                    Aylık Başla
                </button>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-lg border-2 border-indigo-500 relative flex flex-col transform md:-translate-y-4 animate-fade-in-up" style="animation-delay: 0.3s;">
                <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                    EN ÇOK TERCİH EDİLEN
                </div>
                <div class="text-center mb-4 mt-2">
                    <span class="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase">%5 İndirim</span>
                    <h4 class="text-lg font-bold text-gray-800 mt-3">6 Aylık Ödeme</h4>
                </div>
                <div class="text-center my-4">
                    <p class="text-xs text-gray-400 line-through mb-1" id="priceSixOld">1.980₺</p>
                    <span class="text-3xl font-bold text-indigo-600" id="priceSixTotal">1.881₺</span>
                    <div class="text-xs text-gray-500 mt-1">Toplam Fiyat</div>
                </div>
                <p class="text-center text-xs text-gray-400 mb-6 flex-1">Uzun vadeli planlama yapanlar için ideal.</p>
                <button class="btn-contact-modal w-full py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                    6 Aylık Başla
                </button>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col animate-fade-in-up" style="animation-delay: 0.4s;">
                <div class="text-center mb-4">
                    <span class="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase">%20 İndirim</span>
                    <h4 class="text-lg font-bold text-gray-800 mt-3">Yıllık Ödeme</h4>
                </div>
                <div class="text-center my-4">
                    <p class="text-xs text-gray-400 line-through mb-1" id="priceYearOld">3.960₺</p>
                    <span class="text-3xl font-bold text-gray-900" id="priceYearTotal">3.168₺</span>
                    <div class="text-xs text-gray-500 mt-1">Toplam Fiyat</div>
                </div>
                <p class="text-center text-xs text-gray-400 mb-6 flex-1">En avantajlı fiyat garantisi.</p>
                <button class="btn-contact-modal w-full py-3 rounded-xl font-bold border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-colors">
                    Yıllık Başla
                </button>
            </div>

        </div>
    `;

    // --- HESAPLAMA MANTIĞI ---
    const input = document.getElementById('inputStudentCount');
    const unitPrice = 33;

    const calculate = () => {
        let count = parseInt(input.value);
        if (isNaN(count) || count < 2) count = 2; // Min 2

        // 1. Aylık Fiyat
        const monthlyTotal = count * unitPrice;

        // 2. 6 Aylık Fiyat (%5 İndirim)
        const sixMonthBase = monthlyTotal * 6;
        const sixMonthDiscounted = sixMonthBase * 0.95;

        // 3. Yıllık Fiyat (%20 İndirim)
        const yearBase = monthlyTotal * 12;
        const yearDiscounted = yearBase * 0.80;

        // UI Güncelle
        document.getElementById('priceMonthly').textContent = `${formatCurrency(monthlyTotal)}`;
        
        document.getElementById('priceSixOld').textContent = `${formatCurrency(sixMonthBase)}`;
        document.getElementById('priceSixTotal').textContent = `${formatCurrency(sixMonthDiscounted)}`;
        
        document.getElementById('priceYearOld').textContent = `${formatCurrency(yearBase)}`;
        document.getElementById('priceYearTotal').textContent = `${formatCurrency(yearDiscounted)}`;
    };

    input.addEventListener('input', calculate);
    input.addEventListener('change', () => {
        if(parseInt(input.value) < 2) input.value = 2;
        calculate();
    });

    // --- MODAL AÇMA (GÜNCELLENMİŞ) ---
    document.querySelectorAll('.btn-contact-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = 'upgradeContactModal';
            openModalWithBackHistory(modalId);
            
            // Kapatma butonunu history ile uyumlu hale getir
            const closeBtn = document.querySelector(`#${modalId} button[onclick*="none"]`);
            if (closeBtn) {
                closeBtn.removeAttribute('onclick');
                closeBtn.onclick = () => window.history.back();
            }
        });
    });

    // İlk hesaplama
    calculate();
}