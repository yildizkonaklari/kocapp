// === MODULES/PAKET.JS ===
import { formatCurrency } from './helpers.js';

export function renderPaketSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Paket Yükselt";
    const area = document.getElementById("mainContentArea");

    area.innerHTML = `
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg mb-8 relative overflow-hidden">
            <div class="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div class="relative z-10">
                <h2 class="text-3xl font-bold mb-4">Koçluk Sisteminizi Bir Üst Seviyeye Taşıyın! 🚀</h2>
                <p class="text-indigo-100 mb-6 text-lg">Sınırsız öğrenci yönetimi, detaylı analizler ve yapay zeka destekli asistan ile işinizi büyütün.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Sınırsız Öğrenci Ekleme</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Detaylı Deneme Analizleri</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Otomatik Ödev Takibi</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Gelir/Gider Muhasebe Modülü</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> 7/24 Teknik Destek</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Mobil Uyumlu Öğrenci Paneli</div>
                </div>
            </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
            <h3 class="text-xl font-bold text-gray-800 mb-4 text-center">Fiyat Hesapla</h3>
            
            <div class="max-w-md mx-auto">
                <label class="block text-sm font-medium text-gray-700 mb-2">Kaç Öğrenciniz Var?</label>
                <div class="relative flex items-center">
                    <input type="number" id="inputStudentCount" min="2" value="2" class="w-full p-4 text-center text-2xl font-bold border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none text-indigo-600">
                    <span class="absolute right-4 text-gray-400 font-medium">Öğrenci</span>
                </div>
                <p class="text-xs text-gray-500 mt-2 text-center">* En az 2 öğrenci seçilebilir. Birim fiyat: 33₺ / Ay</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-300 transition-all flex flex-col">
                <div class="text-center mb-4">
                    <span class="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase">Esnek Plan</span>
                    <h4 class="text-lg font-bold text-gray-800 mt-3">Aylık Ödeme</h4>
                </div>
                <div class="text-center my-4">
                    <span class="text-4xl font-bold text-gray-900" id="priceMonthly">66₺</span>
                    <span class="text-gray-500">/ay</span>
                </div>
                <p class="text-center text-sm text-gray-500 mb-6">Her ay yenilenir, istediğin zaman iptal et.</p>
                <button class="btn-contact-modal w-full py-3 rounded-xl font-bold border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-colors mt-auto">
                    Aylık Başla
                </button>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-md border-2 border-indigo-500 relative flex flex-col transform md:-translate-y-2">
                <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    POPÜLER
                </div>
                <div class="text-center mb-4 mt-2">
                    <span class="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase">%5 İndirim</span>
                    <h4 class="text-lg font-bold text-gray-800 mt-3">6 Aylık Ödeme</h4>
                </div>
                <div class="text-center my-4">
                    <p class="text-xs text-gray-400 line-through mb-1" id="priceSixOld">396₺</p>
                    <span class="text-4xl font-bold text-indigo-600" id="priceSixTotal">376₺</span>
                    <div class="text-xs text-gray-500 mt-1">Toplam Fiyat</div>
                </div>
                <button class="btn-contact-modal w-full py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all mt-auto">
                    6 Aylık Başla
                </button>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-300 transition-all flex flex-col">
                <div class="text-center mb-4">
                    <span class="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase">%20 İndirim</span>
                    <h4 class="text-lg font-bold text-gray-800 mt-3">Yıllık Ödeme</h4>
                </div>
                <div class="text-center my-4">
                    <p class="text-xs text-gray-400 line-through mb-1" id="priceYearOld">792₺</p>
                    <span class="text-4xl font-bold text-gray-900" id="priceYearTotal">633₺</span>
                    <div class="text-xs text-gray-500 mt-1">Toplam Fiyat</div>
                </div>
                <button class="btn-contact-modal w-full py-3 rounded-xl font-bold border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-colors mt-auto">
                    Yıllık Başla
                </button>
            </div>

        </div>
        
        <div class="h-20"></div>
    `;

    // --- HESAPLAMA MANTIĞI ---
    const input = document.getElementById('inputStudentCount');
    const unitPrice = 33;

    const calculate = () => {
        let count = parseInt(input.value);
        if (isNaN(count) || count < 2) {
            count = 2;
            // Kullanıcı yazarken müdahale etmemek için value'yu değiştirmiyoruz, hesaplamayı 2 üzerinden yapıyoruz.
        }

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
        if(parseInt(input.value) < 2) input.value = 2; // Focus out olunca 2'ye çek
        calculate();
    });

    // --- MODAL AÇMA ---
    document.querySelectorAll('.btn-contact-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('upgradeContactModal').style.display = 'flex';
        });
    });

    // İlk hesaplama
    calculate();
}
