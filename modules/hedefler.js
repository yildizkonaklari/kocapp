<div id="addHedefModal" class="hidden fixed inset-0 bg-gray-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up">
        
        <div class="flex justify-between items-center p-5 border-b border-gray-100">
            <h3 class="text-xl font-bold text-gray-800">Yeni Hedef Ata</h3>
            <button class="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>
        </div>
        
        <div class="p-6 overflow-y-auto space-y-4">
            <input type="hidden" id="currentStudentIdForHedef">
            
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Hedef Başlığı</label>
                <input type="text" id="hedefTitle" placeholder="Örn: 50 Paragraf Çöz" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
            </div>

            <div>
    <p> Hedef bitiş tarihini giriniz.</p>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Bitiş Tarihi</label>
                <input type="date" id="hedefBitisTarihi" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none">
            </div>

            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Açıklama / Not</label>
                <textarea id="hedefAciklama" rows="3" placeholder="Detaylar..." class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none"></textarea>
            </div>
        </div>

        <div class="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
            <button class="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100">İptal</button>
            <button id="saveHedefButton" class="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 active:scale-95 transition-transform">Kaydet</button>
        </div>
    </div>
</div>
