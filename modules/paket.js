// === MODULES/PAKET.JS ===
import { 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { formatCurrency, openModalWithBackHistory, formatDateTR } from './helpers.js';

export async function renderPaketSayfasi(db, currentUserId, appId) {
    document.getElementById("mainContentTitle").textContent = "Paket Yükselt";
    const area = document.getElementById("mainContentArea");

    // Yükleniyor efekti
    area.innerHTML = '<div class="flex justify-center items-center h-64"><i class="fa-solid fa-spinner fa-spin text-purple-600 text-3xl"></i></div>';

    // 1. Mevcut Profil Bilgilerini Çek
    let currentPackageInfo = {
        name: 'Standart',
        expiry: '-', // Varsayılanı "Süresiz" yerine "-" yaptık
        limit: 5
    };

    try {
        const profileRef = doc(db, "artifacts", appId, "users", currentUserId, "settings", "profile");
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
            const data = profileSnap.data();
            currentPackageInfo.name = data.paketAdi || 'Standart';
            currentPackageInfo.limit = data.maxOgrenci || 3;
            
            // Bitiş Tarihi Kontrolü
            if (data.uyelikBitis) {
                try {
                    // Timestamp veya Date string kontrolü
                    const dateObj = data.uyelikBitis.toDate ? data.uyelikBitis.toDate() : new Date(data.uyelikBitis);
                    
                    // Geçerli bir tarih mi?
                    if (!isNaN(dateObj.getTime())) {
                        currentPackageInfo.expiry = typeof formatDateTR === 'function' 
                            ? formatDateTR(dateObj.toISOString().split('T')[0]) 
                            : dateObj.toLocaleDateString('tr-TR');
                    }
                } catch (e) {
                    console.error("Tarih formatlama hatası", e);
                }
            } else {
                // Eğer paket Standart değilse ve tarih yoksa uyarı verilebilir veya boş bırakılır
                if (currentPackageInfo.name.toLowerCase() !== 'standart') {
                    currentPackageInfo.expiry = 'Belirtilmedi';
                }
            }
        }
    } catch (error) {
        console.error("Profil bilgileri alınamadı:", error);
    }

    // 2. Sayfa İçeriği HTML
    area.innerHTML = `
        <div class="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 mb-8 shadow-sm flex flex-col md:flex-row justify-between items-center animate-fade-in-up">
            <div class="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
                <div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl shrink-0">
                    <i class="fa-solid fa-crown"></i>
                </div>
                <div>
                    <h3 class="font-bold text-gray-800 text-lg flex items-center gap-2">
                        Paket Durumu
                        <span class="bg-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">${currentPackageInfo.name}</span>
                    </h3>
                    <p class="text-indigo-400 text-xs">Aktif Abonelik</p>
                </div>
            </div>
            
            <div class="flex gap-8 w-full md:w-auto justify-around md:justify-end bg-white md:bg-transparent p-4 md:p-0 rounded-xl border md:border-0 border-indigo-100">
                <div class="text-center md:text-right">
                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Bitiş Tarihi</p>
                    <p class="text-indigo-900 font-bold text-lg leading-tight">${currentPackageInfo.expiry}</p>
                </div>
                <div class="w-px bg-indigo-200 h-10 hidden md:block"></div>
                <div class="text-center md:text-right">
                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Öğrenci Limiti</p>
                    <p class="text-indigo-900 font-bold text-lg leading-tight">${currentPackageInfo.limit} Öğrenci</p>
                </div>
            </div>
        </div>

        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg mb-8 relative overflow-hidden animate-fade-in-up" style="animation-delay: 0.1s;">
            <div class="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div class="relative z-10">
                <h2 class="text-2xl md:text-3xl font-bold mb-4">İşinizi Büyütün! 🚀</h2>
                <p class="text-indigo-100 mb-6 text-sm md:text-lg">Sınırsız öğrenci yönetimi ve yapay zeka destekli analizler ile koçluk kalitenizi artırın.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Ekstra Öğrenci Kontenjanı</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Yapay Zeka Performans Asistanı</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Seans Takibi</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Ödev ve Hedef Takibi</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Soru ve Günlük Rutin Takibi</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Deneme Takibi</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Deneme Analizi ve Grafikleri</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Muhasebe Modülü</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Mesaj Modülü</div>
                    <div class="flex items-center"><i class="fa-solid fa-circle-check text-green-400 mr-2"></i> Teknik Destek</div>
                </div>
            </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 animate-fade-in-up" style="animation-delay: 0.2s;">
            <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">Fiyat Hesapla</h3>
            
            <div class="max-w-md mx-auto">
                <label class="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider text-center">Hedeflenen Öğrenci Sayısı</label>
                <div class="relative flex items-center justify-center">
                    <button id="btnDecStudent" class="w-12 h-12 bg-gray-100 rounded-l-xl text-gray-600 hover:bg-gray-200 transition-colors text-lg"><i class="fa-solid fa-minus"></i></button>
                    <input type="number" id="inputStudentCount" min="5" step="5" value="10" class="w-24 p-2 text-center text-3xl font-bold border-y border-gray-200 focus:ring-0 outline-none text-indigo-600 appearance-none m-0 bg-white" readonly>
                    <button id="btnIncStudent" class="w-12 h-12 bg-gray-100 rounded-r-xl text-gray-600 hover:bg-gray-200 transition-colors text-lg"><i class="fa-solid fa-plus"></i></button>
                </div>
                <p class="text-xs text-gray-400 mt-3 text-center flex items-center justify-center gap-1">
                    <i class="fa-solid fa-info-circle"></i> Paketler 5 ve katları şeklinde artmaktadır.
                </p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
            
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col animate-fade-in-up" style="animation-delay: 0.3s;">
                <div class="text-center mb-4">
                    <span class="bg-gray-100 text-gray-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase">Esnek Plan</span>
                    <h4 class="text-lg font-bold text-gray-800 mt-3">Aylık Ödeme</h4>
                </div>
                <div class="text-center my-4">
                    <span class="text-3xl font-bold text-gray-900" id="priceMonthly">--</span>
                    <span class="text-gray-500 text-sm">/ay</span>
                </div>
                <p class="text-center text-xs text-gray-400 mb-6 flex-1">Her ay yenilenir, istediğin zaman iptal et.</p>
                <button class="btn-contact-modal w-full py-3 rounded-xl font-bold border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-colors" data-plan="Aylık">
                    Aylık Başla
                </button>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-lg border-2 border-indigo-500 relative flex flex-col transform md:-translate-y-4 animate-fade-in-up" style="animation-delay: 0.4s;">
                <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                    EN ÇOK TERCİH EDİLEN
                </div>
                <div class="text-center mb-4 mt-2">
                    <span class="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase">%5 İndirim</span>
                    <h4 class="text-lg font-bold text-gray-800 mt-3">6 Aylık Ödeme</h4>
                </div>
                <div class="text-center my-4">
                    <p class="text-xs text-gray-400 line-through mb-1" id="priceSixOld">--</p>
                    <span class="text-3xl font-bold text-indigo-600" id="priceSixTotal">--</span>
                    <div class="text-xs text-gray-500 mt-1">Toplam Fiyat</div>
                </div>
                <p class="text-center text-xs text-gray-400 mb-6 flex-1">Uzun vadeli planlama yapanlar için ideal.</p>
                <button class="btn-contact-modal w-full py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95" data-plan="6 Aylık">
                    6 Aylık Başla
                </button>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col animate-fade-in-up" style="animation-delay: 0.5s;">
                <div class="text-center mb-4">
                    <span class="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase">%20 İndirim</span>
                    <h4 class="text-lg font-bold text-gray-800 mt-3">Yıllık Ödeme</h4>
                </div>
                <div class="text-center my-4">
                    <p class="text-xs text-gray-400 line-through mb-1" id="priceYearOld">--</p>
                    <span class="text-3xl font-bold text-gray-900" id="priceYearTotal">--</span>
                    <div class="text-xs text-gray-500 mt-1">Toplam Fiyat</div>
                </div>
                <p class="text-center text-xs text-gray-400 mb-6 flex-1">En avantajlı fiyat garantisi.</p>
                <button class="btn-contact-modal w-full py-3 rounded-xl font-bold border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-colors" data-plan="Yıllık">
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
        if (isNaN(count) || count < 5) count = 5;
        if (count % 5 !== 0) count = Math.ceil(count / 5) * 5;

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

    document.getElementById('btnDecStudent').onclick = () => { 
        let val = parseInt(input.value);
        if(val > 5) {
            input.value = val - 5;
            calculate();
        }
    };
    
    document.getElementById('btnIncStudent').onclick = () => { 
        let val = parseInt(input.value);
        input.value = val + 5;
        calculate();
    };

    calculate();

    // --- MODAL İŞLEMLERİ ---
    createContactModal();

    document.querySelectorAll('.btn-contact-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const plan = e.target.dataset.plan;
            const count = input.value;
            
            const modalTitle = document.getElementById('modalContactPlanTitle');
            if(modalTitle) modalTitle.textContent = `${plan} Plan - ${count} Öğrenci Limiti`;
            
            const waLink = document.getElementById('btnWhatsappLink');
            if(waLink) {
                const msg = `Merhaba, ${count} öğrenci limiti için ${plan} paket hakkında bilgi almak ve satın alma işlemini gerçekleştirmek istiyorum.`;
                waLink.href = `https://wa.me/905064083637?text=${encodeURIComponent(msg)}`;
            }

            openModalWithBackHistory('upgradeContactModal');
        });
    });
}

function createContactModal() {
    if(document.getElementById('upgradeContactModal')) return;

    const modalHtml = `
    <div id="upgradeContactModal" class="fixed inset-0 bg-gray-900/80 z-[200] hidden items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button id="btnCloseContactModalX" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"><i class="fa-solid fa-xmark text-xl"></i></button>
            
            <div class="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm"><i class="fa-solid fa-headset"></i></div>
            
            <h3 class="text-xl font-bold text-gray-800 mb-1 text-center">Paket Yükseltme</h3>
            <p id="modalContactPlanTitle" class="text-indigo-600 font-bold text-center text-sm mb-4">Plan Seçimi</p>
            <p class="text-sm text-gray-500 mb-6 text-center leading-relaxed">Paket yükseltme işlemleri ve özel teklifler için müşteri temsilcimizle iletişime geçin.</p>
            
            <a id="btnWhatsappLink" href="#" target="_blank" class="w-full bg-green-500 text-white py-3 rounded-xl font-bold mb-2 hover:bg-green-600 transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2">
                <i class="fa-brands fa-whatsapp text-lg"></i> WhatsApp ile Yaz
            </a>

            <a id="btnInstagramLink" href="https://www.instagram.com/net.koc" target="_blank" class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold mb-3 hover:opacity-90 transition-opacity shadow-lg shadow-purple-200 flex items-center justify-center gap-2">
                <i class="fa-brands fa-instagram text-lg"></i> Instagram ile Yaz
            </a>
            
            <button id="btnCloseContactModal" class="w-full text-gray-500 hover:text-gray-800 text-sm font-medium py-2 rounded-xl hover:bg-gray-50 transition-colors">Kapat</button>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const closeModal = () => {
        if(typeof openModalWithBackHistory === 'function') {
            window.history.back();
        } else {
            const m = document.getElementById('upgradeContactModal');
            m.classList.add('hidden');
            m.style.display = 'none';
        }
    };

    document.getElementById('btnCloseContactModal').onclick = closeModal;
    document.getElementById('btnCloseContactModalX').onclick = closeModal;
}

